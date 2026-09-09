export type VehicleType = "sedan" | "van" | "luxury";

export const BASE_PRICE = 4.0;
export const PRICE_PER_KM = 2.5;

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  sedan: "Berline",
  van: "Van (7 places)",
  luxury: "Luxe",
};

export const VEHICLE_DESCRIPTIONS: Record<VehicleType, string> = {
  sedan: "1–4 passagers",
  van: "1–7 passagers",
  luxury: "1–3 passagers",
};

export const VEHICLE_MAX_PASSENGERS: Record<VehicleType, number> = {
  sedan: 4,
  van: 7,
  luxury: 3,
};

export const VEHICLE_MULTIPLIERS: Record<VehicleType, number> = {
  sedan: 1.0,
  van: 1.3,
  luxury: 1.8,
};

export type TripEstimate = {
  distanceKm: number;
  durationMinutes: number;
  price: number;
};

export function calculatePrice(distanceKm: number, vehicleType: VehicleType): number {
  return BASE_PRICE + distanceKm * PRICE_PER_KM * VEHICLE_MULTIPLIERS[vehicleType];
}


export function buildReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "CTX-";
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}
