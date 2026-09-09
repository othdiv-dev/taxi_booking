import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drivers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getSignedDocumentUrl } from "@/lib/cloudinary";

// Champs autorisés → colonne DB correspondante
const FIELD_MAP = {
  insurance:      "insuranceFileId",
  driversLicense: "driversLicenseFileId",
  taxiCard:       "taxiCardFileId",
} as const;

type DocField = keyof typeof FIELD_MAP;

/**
 * GET /api/admin/document?driverId=X&field=insurance
 *
 * Retourne une URL signée valide 15 minutes pour accéder à un document
 * privé d'un chauffeur.
 *
 * Protégé par requireAdmin() — aucun document n'est accessible sans session admin.
 */
export async function GET(req: NextRequest) {
  // 1. Authentification obligatoire
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  // 2. Paramètres
  const { searchParams } = req.nextUrl;
  const driverIdRaw = searchParams.get("driverId");
  const field       = searchParams.get("field") as DocField | null;

  const driverId = Number(driverIdRaw);
  if (!driverIdRaw || isNaN(driverId) || driverId <= 0) {
    return NextResponse.json({ error: "driverId invalide." }, { status: 400 });
  }
  if (!field || !(field in FIELD_MAP)) {
    return NextResponse.json({ error: "field invalide. Valeurs acceptées : insurance, driversLicense, taxiCard." }, { status: 400 });
  }

  // 3. Récupérer le chauffeur
  const [driver] = await db
    .select({
      insuranceFileId:      drivers.insuranceFileId,
      driversLicenseFileId: drivers.driversLicenseFileId,
      taxiCardFileId:       drivers.taxiCardFileId,
    })
    .from(drivers)
    .where(eq(drivers.id, driverId))
    .limit(1);

  if (!driver) {
    return NextResponse.json({ error: "Chauffeur introuvable." }, { status: 404 });
  }

  // 4. Récupérer la référence stockée
  const column    = FIELD_MAP[field];
  const storedRef = driver[column];

  if (!storedRef) {
    return NextResponse.json({ error: "Aucun document pour ce champ." }, { status: 404 });
  }

  // 5. Générer l'URL signée (expiration 15 min)
  const signedUrl = getSignedDocumentUrl(storedRef);

  return NextResponse.json({
    url:       signedUrl,
    expiresIn: 15 * 60, // secondes
  });
}
