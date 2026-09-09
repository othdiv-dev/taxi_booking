import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments } from "@/db/schema";
import { markBookingPaid } from "@/lib/booking-service";

// Demo-mode payment completion endpoint. Used only when MULTISAFEPAY_API_KEY
// is not configured, to simulate an instant successful payment redirect.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("order");

  if (!reference) {
    return NextResponse.json({ error: "Référence manquante." }, { status: 400 });
  }

  const [booking] = await db.select().from(bookings).where(eq(bookings.reference, reference.toUpperCase()));
  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  await db
    .update(payments)
    .set({ status: "completed" })
    .where(eq(payments.bookingId, booking.id));

  await markBookingPaid(booking.id);

  return NextResponse.redirect(new URL(`/confirmation/${booking.reference}`, request.url));
}
