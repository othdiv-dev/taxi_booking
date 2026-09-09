import { NextResponse } from "next/server";
import { db } from "@/db";
import { drivers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { telegramSend } from "@/lib/telegram";
import {
  validateDocument,
  uploadPrivateDocument,
  VALIDATION_MESSAGES,
} from "@/lib/cloudinary";

/**
 * Timeout étendu pour cette route : compression sharp + 3 uploads Cloudinary
 * peuvent prendre 15–30 secondes selon la connexion.
 * (Vercel : max 300s sur Pro, 60s sur Hobby)
 */
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // ─── Champs texte ─────────────────────────────────────────────────────────
    const firstName        = String(formData.get("firstName")        || "").trim();
    const lastName         = String(formData.get("lastName")         || "").trim();
    const email            = String(formData.get("email")            || "").trim().toLowerCase();
    const phone            = String(formData.get("phone")            || "").trim();
    const pNumber          = String(formData.get("pNumber")          || "").trim() || null;
    const licensePlate     = String(formData.get("licensePlate")     || "").trim().toUpperCase() || null;
    const companyName      = String(formData.get("companyName")      || "").trim() || null;
    const kvkNumber        = String(formData.get("kvkNumber")        || "").trim() || null;
    const btwNumber        = String(formData.get("btwNumber")        || "").trim() || null;
    const address          = String(formData.get("address")          || "").trim() || null;
    const postcode         = String(formData.get("postcode")         || "").trim() || null;
    const city             = String(formData.get("city")             || "").trim() || null;
    const iban             = String(formData.get("iban")             || "").trim().replace(/\s/g, "") || null;
    const accountHolder    = String(formData.get("accountHolder")    || "").trim() || null;
    const paymentCycle     = String(formData.get("paymentCycle")     || "daily") as "daily" | "weekly" | "monthly";
    const carBrand         = String(formData.get("carBrand")         || "").trim() || null;
    const carModel         = String(formData.get("carModel")         || "").trim() || null;
    const carYear          = String(formData.get("carYear")          || "").trim() || null;
    const vehicleType      = String(formData.get("vehicleType")      || "sedan") as "sedan" | "van" | "luxury";
    const telegramChatId   = Number(formData.get("telegramChatId")   || "0") || null;
    const telegramUsername = String(formData.get("telegramUsername")  || "").trim() || null;
    const termsAccepted    = formData.get("termsAccepted") === "true";

    const insuranceExpiry      = String(formData.get("insuranceExpiry")      || "").trim() || null;
    const driversLicenseExpiry = String(formData.get("driversLicenseExpiry") || "").trim() || null;
    const taxiCardExpiry       = String(formData.get("taxiCardExpiry")       || "").trim() || null;

    // ─── Validation champs obligatoires ──────────────────────────────────────
    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json({ error: "Verplichte velden ontbreken." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Ongeldig e-mailadres." }, { status: 400 });
    }
    if (!termsAccepted) {
      return NextResponse.json({ error: "Accepteer de voorwaarden." }, { status: 400 });
    }

    // ─── Email unique ─────────────────────────────────────────────────────────
    const [existing] = await db
      .select({ id: drivers.id })
      .from(drivers)
      .where(eq(drivers.email, email));
    if (existing) {
      return NextResponse.json({ error: "Dit e-mailadres is al geregistreerd." }, { status: 409 });
    }

    // ─── Validation + compression + upload des documents ─────────────────────

    /**
     * Valide, compresse (si image) et uploade un document.
     * - Compression sharp : 4K → 1920px, JPEG 82% → ÷8 à ÷10 sur le poids
     * - Retourne null si aucun fichier fourni (champ optionnel)
     */
    async function processDocument(
      field: string,
      folder: string
    ): Promise<string | null> {
      const rawValue = formData.get(field);
      if (!rawValue || typeof rawValue === "string") return null;

      const file       = rawValue as File;
      const validation = await validateDocument(file);

      if (!validation.ok) {
        throw Object.assign(
          new Error(VALIDATION_MESSAGES[validation.error]),
          { status: 400 }
        );
      }

      const { buffer, detectedMime } = validation;
      const slug     = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
      const filename = `${Date.now()}-${field}`;

      return uploadPrivateDocument(
        buffer,
        filename,
        `taxi-booking/drivers/${slug}/${folder}`,
        detectedMime
      );
    }

    // Les 3 uploads tournent en parallèle après compression individuelle
    let insuranceRef:      string | null = null;
    let driversLicenseRef: string | null = null;
    let taxiCardRef:       string | null = null;

    try {
      [insuranceRef, driversLicenseRef, taxiCardRef] = await Promise.all([
        processDocument("insurance",      "insurance"),
        processDocument("driversLicense", "drivers_license"),
        processDocument("taxiCard",       "taxi_card"),
      ]);
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || "Fout bij uploaden van documenten." },
        { status: err.status || 500 }
      );
    }

    // ─── Insertion en base ────────────────────────────────────────────────────
    await db.insert(drivers).values({
      firstName,
      lastName,
      email,
      phone,
      pNumber,
      licensePlate,
      companyName,
      kvkNumber,
      btwNumber,
      address,
      postcode,
      city,
      iban,
      accountHolder,
      paymentCycle,
      carBrand,
      carModel,
      carYear,
      vehicleType,
      insuranceFileId:      insuranceRef,
      insuranceExpiry:      insuranceExpiry      ? new Date(insuranceExpiry)      as any : null,
      driversLicenseFileId: driversLicenseRef,
      driversLicenseExpiry: driversLicenseExpiry ? new Date(driversLicenseExpiry) as any : null,
      taxiCardFileId:       taxiCardRef,
      taxiCardExpiry:       taxiCardExpiry       ? new Date(taxiCardExpiry)       as any : null,
      telegramChatId,
      telegramUsername,
      termsAccepted:   true,
      termsAcceptedAt: new Date(),
      isVerified:      false,
      isActive:        false,
    });

    // ─── Notification Telegram au chauffeur ───────────────────────────────────
    if (telegramChatId) {
      await telegramSend(
        telegramChatId,
        `🎉 *Aanmelding ontvangen!*\n\n` +
        `👤 ${firstName} ${lastName}\n` +
        `📧 ${email}\n` +
        `📞 ${phone}\n\n` +
        `📄 Documenten ontvangen ✅\n\n` +
        `⏳ Uw aanmelding wordt binnen *48 uur* beoordeeld.\n` +
        `U ontvangt hier een bericht zodra uw account is geactiveerd.\n\n` +
        `Stuur /status om uw aanmelding te controleren.`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Driver register error:", err);
    return NextResponse.json({ error: "Er is een interne fout opgetreden." }, { status: 500 });
  }
}
