export type DistanceResult = {
  distanceKm: number;
  durationMinutes: number;
  source: "osrm";
};

// Cache en mémoire pour éviter les appels répétés à Nominatim
const geocodeCache = new Map<string, { lat: number; lon: number } | null>();

async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
  const key = address.toLowerCase().trim();
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;
  if (key.length < 3) { geocodeCache.set(key, null); return null; }

  // Nettoyer l'adresse aéroport
  const cleanAddress = address
    .replace(/,?\s*Terminal\s*\w*/gi, "")
    .replace(/\(AMS\)|\(RTM\)|\(EIN\)|\(BRU\)|\(DUS\)|\(FRA\)/gi, "")
    .trim();

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanAddress)}&format=json&limit=1&countrycodes=nl,be,de,fr,gb`;
    const res = await fetch(url, {
      headers: { "User-Agent": "taxi-booking-app/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) { geocodeCache.set(key, null); return null; }
    const data = await res.json();
    if (!data.length) { geocodeCache.set(key, null); return null; }
    const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    geocodeCache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

async function osrmDistance(pickup: string, dropoff: string): Promise<DistanceResult | null> {
  try {
    const from = await geocode(pickup);
    if (!from) return null;

    await new Promise(r => setTimeout(r, 1100));

    const to = await geocode(dropoff);
    if (!to) return null;

    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    if (data.code !== "Ok" || !data.routes?.length) return null;

    const route = data.routes[0];
    const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
    const durationMinutes = Math.round(route.duration / 60);

    return { distanceKm, durationMinutes, source: "osrm" };
  } catch {
    return null;
  }
}

export async function calculateDistance(pickup: string, dropoff: string): Promise<DistanceResult | null> {
  return await osrmDistance(pickup, dropoff);
}