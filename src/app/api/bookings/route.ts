import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments, zones } from "@/db/schema";
import { calculateDistance } from "@/lib/distance";
import { calculatePrice } from "@/lib/pricing";
import { createPaymentOrder } from "@/lib/multisafepay";
import { generateReference } from "@/lib/reference";
import { bookingRequestSchema } from "@/lib/validation";
import { sendBookingConfirmation } from "@/lib/mailer";

function getBaseUrl(request: Request) {
  const envUrl = process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Formulaire invalide.", issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;

  const pickupDatetime = new Date(data.pickupDatetime);
  if (Number.isNaN(pickupDatetime.getTime())) {
    return NextResponse.json({ error: "Date de prise en charge invalide." }, { status: 400 });
  }

  let zoneId: number | null = null;
  if (data.zoneSlug) {
    const [zone] = await db.select().from(zones).where(eq(zones.slug, data.zoneSlug));
    if (zone) zoneId = zone.id;
  }

  const distance = await calculateDistance(data.pickupAddress, data.dropoffAddress);
  const totalPrice = calculatePrice(distance.distanceKm, data.vehicleType);
  const reference = generateReference();

  // MySQL : $returningId() au lieu de .returning()
  const result = await db
    .insert(bookings)
    .values({
      reference,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      passengers: data.passengers,
      luggage: data.luggage,
      zoneId,
      pickupAddress: data.pickupAddress,
      dropoffAddress: data.dropoffAddress,
      distanceKm: distance.distanceKm.toString(),
      durationMinutes: distance.durationMinutes,
      pickupDatetime,
      flightNumber: data.flightNumber || null,
      vehicleType: data.vehicleType,
      totalPrice: totalPrice.toString(),
      customerNotes: data.customerNotes || null,
      status: "pending",
    })
    .$returningId();

  const insertedId = result[0].id;

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, insertedId));

  if (!booking) {
    return NextResponse.json({ error: "Erreur lors de la création de la réservation." }, { status: 500 });
  }

  const baseUrl = getBaseUrl(request);

  const order = await createPaymentOrder({
    orderId: booking.reference,
    amountEuros: totalPrice,
    description: `Course taxi ${booking.reference} (${data.pickupAddress} -> ${data.dropoffAddress})`,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    redirectBaseUrl: baseUrl,
    notificationUrl: `${baseUrl}/api/webhooks/multisafepay`,
  });

  await db.insert(payments).values({
    bookingId: booking.id,
    transactionId: order.transactionId,
    amount: totalPrice.toString(),
    currency: "EUR",
    method: order.demo ? "demo" : "multisafepay",
    status: "pending",
  });

  // ✉️ Envoi de l'email de confirmation
  try {
    await sendBookingConfirmation({
      to: data.customerEmail,
      customerName: data.customerName,
      reference: booking.reference,
      pickupAddress: data.pickupAddress,
      dropoffAddress: data.dropoffAddress,
      pickupDatetime: data.pickupDatetime,
      vehicleType: data.vehicleType,
      passengers: data.passengers,
      luggage: data.luggage,
      totalPrice,
      distanceKm: distance.distanceKm,
      durationMinutes: distance.durationMinutes,
      flightNumber: data.flightNumber || null,
    });
  } catch (emailError) {
    // L'email échoue silencieusement — la réservation reste valide
    console.error("Erreur envoi email:", emailError);
  }

  return NextResponse.json({
    reference: booking.reference,
    totalPrice,
    distanceKm: distance.distanceKm,
    durationMinutes: distance.durationMinutes,
    paymentUrl: order.paymentUrl,
    demo: order.demo,
  });
}
