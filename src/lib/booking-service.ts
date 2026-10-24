import { and, eq, ne, desc } from "drizzle-orm";
import { db } from "@/db";
import { bookings, drivers, telegramNotifications } from "@/db/schema";
import { markBookingAccepted, sendBookingToGroup, deleteMessage, type TelegramBooking } from "@/lib/telegram";

function toTelegramBooking(booking: typeof bookings.$inferSelect): TelegramBooking {
  return {
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
}

export async function dispatchBookingToTelegram(bookingId: number) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) return;

  const result = await sendBookingToGroup(bookingId, toTelegramBooking(booking));
  if (!result) return;

  await db.insert(telegramNotifications).values({
    bookingId,
    messageId: result.message_id,
    chatId: result.chat.id,
    status: "sent",
  });

  await db
    .update(bookings)
    .set({ status: "sent_to_drivers", updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));
}

export async function markBookingPaid(bookingId: number) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) return;
  if (booking.status !== "pending") return;

  await db.update(bookings)
    .set({ status: "paid", updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));
}

type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

export async function acceptBookingByDriver(bookingId: number, user: TelegramUser) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) return { ok: false, message: "❌ Course introuvable." };

  if (!["paid", "sent_to_drivers"].includes(booking.status)) {
    return { ok: false, message: "❌ Deze rit is al ingenomen of niet meer beschikbaar." };
  }

  const [driver] = await db.select().from(drivers).where(eq(drivers.telegramChatId, user.id));

  if (!driver) {
    return {
      ok: false,
      message: "❌ U bent nog niet geregistreerd.\n\nStuur /aanmelden om u te registreren.",
    };
  }

  if (!driver.isVerified || !driver.isActive) {
    return {
      ok: false,
      message: "⏳ Uw account wacht op validatie door de beheerder.\n\nU ontvangt hier bericht zodra uw account is geactiveerd.",
    };
  }

  // Mise à jour atomique — premier arrivé, premier servi
  await db
    .update(bookings)
    .set({
      driverId: driver.id,
      driverAcceptedAt: new Date(),
      status: "accepted",
      updatedAt: new Date(),
    })
    .where(and(eq(bookings.id, bookingId), ne(bookings.status, "accepted")));

  const [updatedBooking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));

  if (!updatedBooking || updatedBooking.driverId !== driver.id) {
    return { ok: false, message: "❌ Een andere chauffeur heeft deze rit al geaccepteerd." };
  }

  // Supprimer le message groupe
  const [notification] = await db
    .select()
    .from(telegramNotifications)
    .where(eq(telegramNotifications.bookingId, bookingId));

  const driverName = `${driver.firstName} ${driver.lastName}`.trim();

  if (notification) {
    await db
      .update(telegramNotifications)
      .set({ status: "accepted", respondedAt: new Date(), driverId: driver.id })
      .where(eq(telegramNotifications.id, notification.id));

    await markBookingAccepted(
      notification.chatId,
      notification.messageId,
      toTelegramBooking(updatedBooking),
      driverName,
    );
  }

  // Incrémenter le compteur de courses du chauffeur
  await db
    .update(drivers)
    .set({ totalTrips: driver.totalTrips + 1, updatedAt: new Date() })
    .where(eq(drivers.id, driver.id));

  // Le message privé est envoyé depuis route.ts après cette fonction
  return { ok: true, message: `✅ Rit ${booking.reference} geaccepteerd! Goede reis ${driverName} 🚖`, booking: toTelegramBooking(updatedBooking) };
}

/** Annule la course par le chauffeur : remet en sent_to_drivers et republish sur le groupe */
export async function cancelBookingByDriver(bookingId: number) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) return { ok: false, reference: "" };

  // Récupérer l'ancienne notification pour supprimer le message "Toegewezen" du groupe
  const [oldNotification] = await db
    .select()
    .from(telegramNotifications)
    .where(eq(telegramNotifications.bookingId, bookingId))
    .orderBy(desc(telegramNotifications.id))
    .limit(1);

  // Supprimer le message "Toegewezen" du groupe
  if (oldNotification) {
    try {
      await deleteMessage(oldNotification.chatId, oldNotification.messageId);
    } catch (e) {
      console.warn("deleteMessage (Toegewezen) failed:", e);
    }
    // Supprimer l'ancienne notification pour éviter les conflits
    await db.delete(telegramNotifications).where(eq(telegramNotifications.bookingId, bookingId));
  }

  // Remettre la course disponible
  await db.update(bookings).set({
    status: "sent_to_drivers",
    driverId: null,
    driverAcceptedAt: null,
    telegramGroupMsgId: null,
    updatedAt: new Date(),
  }).where(eq(bookings.id, bookingId));

  // Republier la course sur le groupe
  const result = await sendBookingToGroup(bookingId, toTelegramBooking(booking));
  if (result) {
    await db.insert(telegramNotifications).values({
      bookingId,
      messageId: result.message_id,
      chatId: result.chat.id,
      status: "sent",
    });
  }

  return { ok: true, reference: booking.reference };
}

export async function setDriverOnWay(bookingId: number) {
  await db.update(bookings).set({ status: "driver_on_way", updatedAt: new Date() }).where(eq(bookings.id, bookingId));
}

export async function setPassengerPicked(bookingId: number) {
  await db.update(bookings).set({ status: "passenger_picked", updatedAt: new Date() }).where(eq(bookings.id, bookingId));
}

export async function completeBooking(bookingId: number) {
  await db.update(bookings).set({ status: "completed", updatedAt: new Date() }).where(eq(bookings.id, bookingId));
}
