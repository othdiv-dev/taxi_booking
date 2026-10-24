import { NextResponse } from "next/server";

// Google Geocoding API — remplace Nominatim/OSM
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  const key = process.env.GOOGLE_MAPS_BACKEND_KEY;
  if (!key) {
    console.error("[geocode] GOOGLE_MAPS_BACKEND_KEY manquant");
    return NextResponse.json([], { status: 200 });
  }

  try {
    const params = new URLSearchParams({
      address:  q,
      region:       "nl",
      language:     "nl",
      components:   "country:nl",
      key,
    });

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      { cache: "no-store" }
    );

    if (!res.ok) return NextResponse.json([], { status: 200 });

    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("[geocode] Google API error:", data.status, data.error_message);
      return NextResponse.json([], { status: 200 });
    }

    // Normaliser au même format qu'avant (compatible avec le reste du code)
    const results = (data.results ?? []).map((r: {
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    }) => ({
      display_name: r.formatted_address,
      lat:          String(r.geometry.location.lat),
      lon:          String(r.geometry.location.lng),
    }));

    return NextResponse.json(results);
  } catch (err) {
    console.error("[geocode] Erreur:", err);
    return NextResponse.json([], { status: 200 });
  }
}
