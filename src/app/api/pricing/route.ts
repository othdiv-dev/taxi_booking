import { NextResponse } from "next/server";
import { calculateDistance } from "@/lib/distance";
import { calculatePrice } from "@/lib/pricing";
import { pricingRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const parsed = pricingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Adresses invalides.", issues: parsed.error.issues }, { status: 400 });
  }

  const { pickupAddress, dropoffAddress, vehicleType } = parsed.data;

  const distance = await calculateDistance(pickupAddress, dropoffAddress);

  if (!distance) {
    return NextResponse.json(
      { error: "Impossible de calculer la distance pour ces adresses. Veuillez vérifier les adresses saisies et réessayer." },
      { status: 503 }
    );
  }

  const price = calculatePrice(distance.distanceKm, vehicleType);

  return NextResponse.json({
    distanceKm: distance.distanceKm,
    durationMinutes: distance.durationMinutes,
    price,
    basePrice: 4.0,
    pricePerKm: 2.5,
    vehicleType,
    source: distance.source,
  });
}
