import { NextResponse } from "next/server";
import { acceptBookingByDriver } from "@/lib/booking-service";
import { answerCallbackQuery, telegramSend, notifyDriverValidated } from "@/lib/telegram";
import { db } from "@/db";
import { drivers } from "@/db/schema";
import { eq } from "drizzle-orm";

type TelegramUpdate = {
  callback_query?: {
    id: string; data?: string;
    from: { id: number; first_name: string; last_name?: string; username?: string };
    message?: { message_id: number; chat: { id: number } };
  };
  message?: {
    from: { id: number; first_name: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
  };
};

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try { update = await request.json(); }
  catch { return NextResponse.json({ ok: true }); }

  // ── Callback (accepter une course) ──
  const callback = update.callback_query;
  if (callback?.data) {
    const [action, bookingIdStr] = callback.data.split(":");
    const bookingId = Number(bookingIdStr);
    if (action === "accept" && Number.isInteger(bookingId)) {
      const result = await acceptBookingByDriver(bookingId, callback.from);
      await answerCallbackQuery(callback.id, result.message, !result.ok);
    }
    return NextResponse.json({ ok: true });
  }

  // ── Messages privés uniquement ──
  const msg = update.message;
  if (!msg || msg.chat.type !== "private") return NextResponse.json({ ok: true });

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username ?? null;
  const text = msg.text?.trim() ?? "";

  const appUrl = process.env.APP_URL || "https://citytaxi.nl";
  // On passe le telegramChatId ET le username dans l'URL pour que le formulaire web les pré-remplisse
  const registerUrl = `${appUrl}/chauffeur/aanmelden?tgid=${userId}${username ? `&tguser=${username}` : ""}`;

  // ── /start ──
  if (text === "/start") {
    await telegramSend(chatId,
      `👋 Welkom bij *CityTaxi*!\n\n` +
      `Gebruik de commando's hieronder:\n\n` +
      `📝 /aanmelden — Als chauffeur registreren\n` +
      `📋 /status — Mijn account bekijken`
    );
    return NextResponse.json({ ok: true });
  }

  // ── /aanmelden → envoie le lien du formulaire web ──
  if (text === "/aanmelden") {
    // Vérifier si déjà inscrit
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

    // Sauvegarder le username Telegram dès maintenant si on le connaît
    if (username) {
      // On vérifie si un driver avec ce chatId existe déjà (double check)
      const [byId] = await db.select().from(drivers).where(eq(drivers.telegramChatId, userId));
      if (!byId) {
        // Rien à faire ici — le driver sera créé via le formulaire web
        // On pourrait pré-créer un enregistrement minimal, mais on laisse le formulaire le faire
      }
    }

    await telegramSend(chatId,
      `📝 *Chauffeur registratie*\n\n` +
      `Klik op de onderstaande link om het registratieformulier in te vullen:\n\n` +
      `🔗 ${registerUrl}\n\n` +
      `Het formulier bevat:\n` +
      `• Persoonlijke gegevens\n` +
      `• Bedrijfsgegevens\n` +
      `• Voertuiggegevens\n` +
      `• Betaalgegevens\n` +
      `• Documenten uploaden\n` +
      `• Voorwaarden\n\n` +
      `⏳ Na indiening ontvangt u hier bericht zodra uw account is geactiveerd.`
    );
    return NextResponse.json({ ok: true });
  }

  // ── /status ──
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
      await telegramSend(chatId,
        `❌ *Geen account gevonden.*\n\n` +
        `Registreer via:\n🔗 ${registerUrl}`
      );
    }
    return NextResponse.json({ ok: true });
  }

  // ── Message non reconnu ──
  await telegramSend(chatId,
    `Ik begrijp dit commando niet. Gebruik:\n\n` +
    `/start — Welkomstbericht\n` +
    `/aanmelden — Als chauffeur registreren\n` +
    `/status — Mijn account bekijken`
  );

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Telegram webhook actief" });
}
