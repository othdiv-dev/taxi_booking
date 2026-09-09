import { NextResponse } from "next/server";

// Proxy côté serveur pour Nominatim — évite les problèmes CORS du navigateur
// et garde l'User-Agent correct pour respecter les conditions d'utilisation OSM.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const countryCodes = searchParams.get("countryCodes") ?? "";
  const featureType = searchParams.get("featureType") ?? ""; // "city" | "street" | ""

  if (!q || q.length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const params = new URLSearchParams({
      q,
      format: "json",
      addressdetails: "1",
      limit: "6",
      "accept-language": "fr,nl,en",
    });

    if (countryCodes) params.set("countrycodes", countryCodes);

    // Nominatim supporte featuretype nativement : settlement, street, …
    if (featureType === "city") params.set("featuretype", "settlement");
    if (featureType === "street") params.set("featuretype", "street");

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          "User-Agent": "taxi-booking-app/1.0 (citytaxi.nl)",
          "Accept": "application/json",
        },
        // Next.js : pas de cache pour avoir des résultats frais
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
