import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, drivers } from "@/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  const [booking] = await db.select().from(bookings).where(eq(bookings.reference, reference.toUpperCase()));

  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  let driver = null;
  if (booking.driverId) {
    const [d] = await db.select().from(drivers).where(eq(drivers.id, booking.driverId));
    if (d) {
      driver = {
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone,
        vehicleType: d.vehicleType,
        rating: d.rating,
      };
    }
  }

  return NextResponse.json({
    reference: booking.reference,
    status: booking.status,
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    pickupDatetime: booking.pickupDatetime,
    distanceKm: booking.distanceKm,
    totalPrice: booking.totalPrice,
    vehicleType: booking.vehicleType,
    passengers: booking.passengers,
    luggage: booking.luggage,
    flightNumber: booking.flightNumber,
    customerName: booking.customerName,
    driver,
  });
}
