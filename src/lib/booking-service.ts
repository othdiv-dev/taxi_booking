import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { bookings, drivers, telegramNotifications } from "@/db/schema";
import { markBookingAccepted, sendBookingToGroup, type TelegramBooking } from "@/lib/telegram";

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

  // Plus d'envoi automatique — l'admin valide le prix et envoie manuellement
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
    return { ok: false, message: "❌ Cette course a déjà été prise ou n'est plus disponible." };
  }

  // ✅ FIX — Vérifier que le chauffeur est inscrit ET validé
  const [driver] = await db.select().from(drivers).where(eq(drivers.telegramChatId, user.id));

  if (!driver) {
    return {
      ok: false,
      message: "❌ Vous n'êtes pas encore inscrit.\n\nEnvoyez /aanmelden pour vous inscrire.",
    };
  }

  if (!driver.isVerified || !driver.isActive) {
    return {
      ok: false,
      message: "⏳ Votre compte est en attente de validation par l'administrateur.\n\nVous recevrez un message dès que votre compte sera activé.",
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

  // Vérifier si c'est bien CE chauffeur qui a obtenu la course
  const [updatedBooking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));

  if (!updatedBooking || updatedBooking.driverId !== driver.id) {
    return { ok: false, message: "❌ Un autre chauffeur a déjà accepté cette course." };
  }

  // Mettre à jour la notification Telegram et éditer le message
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
      driverName
    );
  }

  // ✅ Incrémenter le compteur de courses du chauffeur
  await db
    .update(drivers)
    .set({ totalTrips: driver.totalTrips + 1, updatedAt: new Date() })
    .where(eq(drivers.id, driver.id));

  return { ok: true, message: `✅ Course ${booking.reference} acceptée ! Bonne route ${driverName} 🚖` };
}
