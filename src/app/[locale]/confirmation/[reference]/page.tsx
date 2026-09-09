import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { bookings, drivers } from "@/db/schema";
import ConfirmationStatus from "@/components/ConfirmationStatus";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  const [booking] = await db.select().from(bookings).where(eq(bookings.reference, reference.toUpperCase()));
  if (!booking) notFound();

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

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 sm:px-6">
      <ConfirmationStatus
        initial={{
          reference: booking.reference,
          status: booking.status,
          pickupAddress: booking.pickupAddress,
          dropoffAddress: booking.dropoffAddress,
          pickupDatetime: booking.pickupDatetime.toISOString(),
          distanceKm: booking.distanceKm,
          totalPrice: booking.totalPrice,
          vehicleType: booking.vehicleType,
          passengers: booking.passengers,
          luggage: booking.luggage,
          flightNumber: booking.flightNumber,
          customerName: booking.customerName,
          driver,
        }}
      />
    </main>
  );
}
