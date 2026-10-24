// Google Routes API — remplace OSRM + Nominatim
export type DistanceResult = {
  distanceKm:      number;
  durationMinutes: number;
  source:          "google";
};

export async function calculateDistance(
  pickup:  string,
  dropoff: string
): Promise<DistanceResult | null> {
  const key = process.env.GOOGLE_MAPS_BACKEND_KEY;
  if (!key) {
    console.error("[distance] GOOGLE_MAPS_BACKEND_KEY manquant");
    return null;
  }

  // Nettoyer les labels aéroport (Terminal X, code IATA)
  const clean = (addr: string) =>
    addr
      .replace(/,?\s*Terminal\s*\w*/gi, "")
      .replace(/\(AMS\)|\(RTM\)|\(EIN\)|\(BRU\)|\(DUS\)|\(FRA\)/gi, "")
      .trim();

  try {
    const res = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type":      "application/json",
          "X-Goog-Api-Key":    key,
          // Demander uniquement les champs nécessaires (réduit la facturation)
          "X-Goog-FieldMask":  "routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin:      { address: clean(pickup)  },
          destination: { address: clean(dropoff) },
          travelMode:  "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      console.error("[distance] Routes API HTTP error:", res.status);
      return null;
    }

    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    // duration est une string "123s" — enlever le "s" et convertir
    const durationSec = parseInt(String(route.duration).replace("s", ""), 10);

    return {
      distanceKm:      Math.round((route.distanceMeters / 1000) * 10) / 10,
      durationMinutes: Math.ceil(durationSec / 60),
      source:          "google",
    };
  } catch (err) {
    console.error("[distance] Erreur:", err);
    return null;
  }
}
