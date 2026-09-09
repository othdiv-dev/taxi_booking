import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments } from "@/db/schema";
import { markBookingPaid } from "@/lib/booking-service";

// MultiSafepay notifies this endpoint as: {webhook}?transactionid=<order_id>&timestamp=...
// We re-fetch the order from the MultiSafepay API to verify its real status
// before trusting the notification (recommended by MultiSafepay docs).
export async function POST(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("transactionid");

  if (!orderId) {
    return NextResponse.json({ error: "transactionid manquant." }, { status: 400 });
  }

  const apiKey = process.env.MULTISAFEPAY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "MultiSafepay non configuré." }, { status: 400 });
  }

  const testMode = process.env.MULTISAFEPAY_TEST_MODE !== "false";
  const baseUrl = testMode ? "https://testapi.multisafepay.com" : "https://api.multisafepay.com";

  try {
    const res = await fetch(`${baseUrl}/v1/json/orders/${encodeURIComponent(orderId)}?api_key=${encodeURIComponent(apiKey)}`);
    const data = await res.json();

    if (!data.success) {
      return NextResponse.json({ error: "Impossible de vérifier la commande." }, { status: 400 });
    }

    const status: string = data.data.status;
    const [booking] = await db.select().from(bookings).where(eq(bookings.reference, orderId.toUpperCase()));

    if (!booking) {
      return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
    }

    if (status === "completed") {
      await db
        .update(payments)
        .set({ status: "completed", gatewayResponse: data.data })
        .where(eq(payments.bookingId, booking.id));
      await markBookingPaid(booking.id);
    } else if (["cancelled", "expired", "declined"].includes(status)) {
      await db
        .update(payments)
        .set({ status: "failed", gatewayResponse: data.data })
        .where(eq(payments.bookingId, booking.id));
      await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, booking.id));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("MultiSafepay webhook error:", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
