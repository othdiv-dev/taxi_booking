import { NextResponse } from "next/server";
import { acceptBookingByDriver, cancelBookingByDriver, setDriverOnWay, setPassengerPicked, completeBooking } from "@/lib/booking-service";
import { answerCallbackQuery, telegramSend, editDriverMessage, sendDriverPrivateBooking, formatDriverBookingMessage } from "@/lib/telegram";
import { db } from "@/db";
import { bookings, drivers, adminAlerts } from "@/db/schema";
import { eq } from "drizzle-orm";

type TelegramUpdate = {
  callback_query?: {
    id: string; data?: string;
    from: { id: number; first_name: string; last_name?: string; username?: string };
    message?: { message_id: number; chat: { id: number }; text?: string };
  };
  message?: {
    from: { id: number; first_name: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
  };
};

/** Vérifie si le départ est dans plus de 2h30 */
function isMoreThan2h30(pickupDatetime: Date): boolean {
  const now = new Date();
  const diffMs = pickupDatetime.getTime() - now.getTime();
  return diffMs > 2.5 * 60 * 60 * 1000;
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try { update = await request.json(); }
  catch { return NextResponse.json({ ok: true }); }

  const callback = update.callback_query;
  if (callback?.data) {
    const [action, bookingIdStr] = callback.data.split(":");
    const bookingId = Number(bookingIdStr);
    const chatId = callback.message?.chat.id;
    const messageId = callback.message?.message_id;

    // ── Accepter une course ──
    if (action === "accept" && Number.isInteger(bookingId)) {
      const result = await acceptBookingByDriver(bookingId, callback.from);
      await answerCallbackQuery(callback.id, result.message, !result.ok);

      if (result.ok && result.booking) {
        // Envoyer le message privé avec infos complètes + boutons
        try {
          const privateMsg = await sendDriverPrivateBooking(
            callback.from.id,
            bookingId,
            result.booking,
          );
          if (privateMsg) {
            await db.update(bookings).set({
              telegramGroupMsgId: privateMsg.message_id,
              updatedAt: new Date(),
            }).where(eq(bookings.id, bookingId));
          }
        } catch (e) {
          console.warn("sendDriverPrivateBooking failed:", e);
        }
      }
      return NextResponse.json({ ok: true });
    }

    // ── Demande d'annulation : vérifier le délai ──
    if (action === "cancel_confirm" && Number.isInteger(bookingId) && chatId && messageId) {
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
      if (!booking) return NextResponse.json({ ok: true });

      await answerCallbackQuery(callback.id, "");

      const bookingInfo = {
        reference: booking.reference,
        pickupAddress: booking.pickupAddress,
        dropoffAddress: booking.dropoffAddress,
        pickupDatetime: booking.pickupDatetime,
        passengers: booking.passengers,
        luggage: booking.luggage,
        vehicleType: booking.vehicleType,
        distanceKm: booking.distanceKm,
        totalPrice: booking.totalPrice,
        offeredPrice: booking.offeredPrice,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        flightNumber: booking.flightNumber,
        customerNotes: booking.customerNotes,
      };

      if (isMoreThan2h30(booking.pickupDatetime)) {
        // > 2h30 : afficher les infos + boutons de confirmation
        const text = formatDriverBookingMessage(bookingInfo, `❓ *Weet u zeker dat u wilt annuleren?*`);
        await editDriverMessage(chatId, messageId, text, [[
          { text: "🔙 Nee, behoud rit",                        callback_data: `cancel_abort:${bookingId}` },
          { text: `✅ Ja, annuleer rit #${booking.reference}`, callback_data: `cancel_yes:${bookingId}` },
        ]]);
      } else {
        // < 2h30 : bloquer l'annulation
        await editDriverMessage(chatId, messageId,
          `⛔ Het is te laat om rit *#${booking.reference}* te annuleren.\n\nBel direct de centrale op tel: *+31855807113* zodat zij deze rit aan iemand anders kunnen toewijzen.`,
          [],
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ── Annulation abandonnée (Nee, behoud rit) ──
    if (action === "cancel_abort" && Number.isInteger(bookingId) && chatId && messageId) {
      await answerCallbackQuery(callback.id, "");
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
      if (booking) {
        // Remettre les infos complètes + boutons d'origine
        const text = formatDriverBookingMessage({
          reference: booking.reference,
          pickupAddress: booking.pickupAddress,
          dropoffAddress: booking.dropoffAddress,
          pickupDatetime: booking.pickupDatetime,
          passengers: booking.passengers,
          luggage: booking.luggage,
          vehicleType: booking.vehicleType,
          distanceKm: booking.distanceKm,
          totalPrice: booking.totalPrice,
          offeredPrice: booking.offeredPrice,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          flightNumber: booking.flightNumber,
          customerNotes: booking.customerNotes,
        }, `✅ *Status: Toegewezen*`);
        await editDriverMessage(chatId, messageId, text, [[
          { text: "❌ Annuleren",            callback_data: `cancel_confirm:${bookingId}` },
          { text: "🚗 Onderweg naar klant", callback_data: `on_way:${bookingId}` },
        ]]);
      }
      return NextResponse.json({ ok: true });
    }

    // ── Annulation confirmée (Ja, annuleer rit) ──
    if (action === "cancel_yes" && Number.isInteger(bookingId) && chatId && messageId) {
      await answerCallbackQuery(callback.id, "");
      const result = await cancelBookingByDriver(bookingId);
      if (result.ok) {
        await editDriverMessage(chatId, messageId,
          `✅ Rit *#${result.reference}* is geannuleerd.\n\n_Graag opletten bij het claimen van ritten op tijd en type auto om foutieve claims te voorkomen._`,
          [],
        );
        await db.insert(adminAlerts).values({
          type: "booking_cancelled_by_driver",
          bookingId,
          message: `Chauffeur heeft rit #${result.reference} geannuleerd. Rit is opnieuw gepubliceerd.`,
          isRead: false,
        });
      }
      return NextResponse.json({ ok: true });
    }

    // ── Chauffeur en route ──
    if (action === "on_way" && Number.isInteger(bookingId) && chatId && messageId) {
      await answerCallbackQuery(callback.id, "");
      await setDriverOnWay(bookingId);
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
      if (booking) {
        const text = formatDriverBookingMessage({
          reference: booking.reference,
          pickupAddress: booking.pickupAddress,
          dropoffAddress: booking.dropoffAddress,
          pickupDatetime: booking.pickupDatetime,
          passengers: booking.passengers,
          luggage: booking.luggage,
          vehicleType: booking.vehicleType,
          distanceKm: booking.distanceKm,
          totalPrice: booking.totalPrice,
          offeredPrice: booking.offeredPrice,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          flightNumber: booking.flightNumber,
          customerNotes: booking.customerNotes,
        }, `🚗 *Status: Onderweg naar klant*`);
        await editDriverMessage(chatId, messageId, text,
          [[
            { text: "❌ Annuleren",      callback_data: `cancel_onway:${bookingId}` },
            { text: "🧍 Klant in taxi", callback_data: `passenger_in:${bookingId}` },
          ]],
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ── Annulation impossible (chauffeur en route) ──
    if (action === "cancel_onway" && Number.isInteger(bookingId) && chatId && messageId) {
      await answerCallbackQuery(callback.id, "");
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
      if (booking) {
        const text = formatDriverBookingMessage({
          reference: booking.reference,
          pickupAddress: booking.pickupAddress,
          dropoffAddress: booking.dropoffAddress,
          pickupDatetime: booking.pickupDatetime,
          passengers: booking.passengers,
          luggage: booking.luggage,
          vehicleType: booking.vehicleType,
          distanceKm: booking.distanceKm,
          totalPrice: booking.totalPrice,
          offeredPrice: booking.offeredPrice,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          flightNumber: booking.flightNumber,
          customerNotes: booking.customerNotes,
        }, `⛔ Het is te laat om rit *#${booking.reference}* te annuleren, bel direct de centrale op tel: *+31855807113* zodat zij deze rit aan iemand anders kunnen toewijzen.`);
        await editDriverMessage(chatId, messageId, text,
          [[
            { text: "❌ Annuleren",      callback_data: `cancel_onway:${bookingId}` },
            { text: "🧍 Klant in taxi", callback_data: `passenger_in:${bookingId}` },
          ]],
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ── Passager dans le taxi ──
    if (action === "passenger_in" && Number.isInteger(bookingId) && chatId && messageId) {
      await answerCallbackQuery(callback.id, "");
      await setPassengerPicked(bookingId);
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
      if (booking) {
        const text = formatDriverBookingMessage({
          reference: booking.reference,
          pickupAddress: booking.pickupAddress,
          dropoffAddress: booking.dropoffAddress,
          pickupDatetime: booking.pickupDatetime,
          passengers: booking.passengers,
          luggage: booking.luggage,
          vehicleType: booking.vehicleType,
          distanceKm: booking.distanceKm,
          totalPrice: booking.totalPrice,
          offeredPrice: booking.offeredPrice,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          flightNumber: booking.flightNumber,
          customerNotes: booking.customerNotes,
        }, `🧍 *Status: Klant in taxi*`);
        await editDriverMessage(chatId, messageId, text,
          [[{ text: "✅ Afgerond", callback_data: `completed:${bookingId}` }]],
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ── Course terminée ──
    if (action === "completed" && Number.isInteger(bookingId) && chatId && messageId) {
      await answerCallbackQuery(callback.id, "");
      await completeBooking(bookingId);
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
      if (booking) {
        const text = formatDriverBookingMessage({
          reference: booking.reference,
          pickupAddress: booking.pickupAddress,
          dropoffAddress: booking.dropoffAddress,
          pickupDatetime: booking.pickupDatetime,
          passengers: booking.passengers,
          luggage: booking.luggage,
          vehicleType: booking.vehicleType,
          distanceKm: booking.distanceKm,
          totalPrice: booking.totalPrice,
          offeredPrice: booking.offeredPrice,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          flightNumber: booking.flightNumber,
          customerNotes: booking.customerNotes,
        }, `🏁 *Status: Rit afgerond! Bedankt! 🚖*`);
        await editDriverMessage(chatId, messageId, text, []);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  }

  // ── Messages privés ──────────────────────────────────────────────────────
  const msg = update.message;
  if (!msg || msg.chat.type !== "private") return NextResponse.json({ ok: true });

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username ?? null;
  const text = msg.text?.trim() ?? "";

  const appUrl = process.env.APP_URL || "https://cabix.com";
  const registerUrl = `${appUrl}/chauffeur/aanmelden?tgid=${userId}${username ? `&tguser=${username}` : ""}`;

  if (text === "/start") {
    await telegramSend(chatId,
      `👋 Welkom bij *Cabix*!\n\n` +
      `Gebruik de commando's hieronder:\n\n` +
      `📝 /aanmelden — Als chauffeur registreren\n` +
      `📋 /status — Mijn account bekijken`
    );
    return NextResponse.json({ ok: true });
  }

  if (text === "/aanmelden") {
    const [existing] = await db.select().from(drivers).where(eq(drivers.telegramChatId, userId));
    if (existing) {
      if (existing.isVerified) {
        await telegramSend(chatId,
          `✅ *U bent al geregistreerd en geverifieerd!*\n\n` +
          `👤 ${existing.firstName} ${existing.lastName}\n` +
          `🚗 ${existing.vehicleType}\n\n` +
          `Stuur /status om uw account te bekijken.`
        );
      } else {
        await telegramSend(chatId,
          `⏳ *Uw aanmelding is ontvangen.*\n\n` +
          `Uw account wordt binnen *48 uur* beoordeeld.\n` +
          `U ontvangt hier bericht zodra uw account is geactiveerd.\n\n` +
          `Stuur /status om uw aanmelding te bekijken.`
        );
      }
      return NextResponse.json({ ok: true });
    }
    await telegramSend(chatId,
      `📝 *Chauffeur registratie*\n\n` +
      `Klik op de onderstaande link om het registratieformulier in te vullen:\n\n` +
      `🔗 ${registerUrl}\n\n` +
      `Het formulier bevat:\n` +
      `• Persoonlijke gegevens\n• Bedrijfsgegevens\n• Voertuiggegevens\n• Betaalgegevens\n• Documenten uploaden\n• Voorwaarden\n\n` +
      `⏳ Na indiening ontvangt u hier bericht zodra uw account is geactiveerd.`
    );
    return NextResponse.json({ ok: true });
  }

  if (text === "/status") {
    const [driver] = await db.select().from(drivers).where(eq(drivers.telegramChatId, userId));
    if (driver) {
      await telegramSend(chatId,
        `📋 *Uw account*\n\n` +
        `👤 ${driver.firstName} ${driver.lastName}\n` +
        `📧 ${driver.email || "—"}\n` +
        `📞 ${driver.phone || "—"}\n` +
        `🚗 ${driver.carBrand || ""} ${driver.vehicleType} ${driver.carYear ? `(${driver.carYear})` : ""}\n` +
        `🔑 ${driver.licensePlate || "—"}\n` +
        `🏢 ${driver.companyName || "Geen bedrijf"}\n\n` +
        `Status: ${driver.isVerified ? "✅ Geverifieerd & Actief" : "⏳ In afwachting van verificatie"}`
      );
    } else {
      await telegramSend(chatId, `❌ *Geen account gevonden.*\n\nRegistreer via:\n🔗 ${registerUrl}`);
    }
    return NextResponse.json({ ok: true });
  }

  await telegramSend(chatId,
    `Ik begrijp dit commando niet. Gebruik:\n\n/start — Welkomstbericht\n/aanmelden — Als chauffeur registreren\n/status — Mijn account bekijken`
  );
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Telegram webhook actief" });
}
