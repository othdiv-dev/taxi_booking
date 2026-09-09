import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";

// ─── Configuration ───────────────────────────────────────────────────────────

function getCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  });
  return cloudinary;
}

// ─── Validation serveur ───────────────────────────────────────────────────────

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "application/pdf",
]);

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

function detectMimeFromMagicBytes(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.slice(0,4).toString("ascii") === "RIFF" && buf.slice(8,12).toString("ascii") === "WEBP") return "image/webp";
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  return null;
}

export type ValidationError =
  | "FILE_TOO_LARGE" | "FILE_EMPTY"
  | "INVALID_EXTENSION" | "INVALID_MIME_TYPE" | "MIME_MISMATCH";

export type ValidationResult =
  | { ok: true; buffer: Buffer; detectedMime: string }
  | { ok: false; error: ValidationError };

export async function validateDocument(file: File): Promise<ValidationResult> {
  if (file.size > MAX_FILE_SIZE) return { ok: false, error: "FILE_TOO_LARGE" };
  if (file.size === 0)           return { ok: false, error: "FILE_EMPTY" };
  if (file.name) {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) return { ok: false, error: "INVALID_EXTENSION" };
  }
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type))
    return { ok: false, error: "INVALID_MIME_TYPE" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedMime = detectMimeFromMagicBytes(buffer);
  if (!detectedMime) return { ok: false, error: "INVALID_MIME_TYPE" };
  if (file.type && file.type !== detectedMime) return { ok: false, error: "MIME_MISMATCH" };

  return { ok: true, buffer, detectedMime };
}

export const VALIDATION_MESSAGES: Record<ValidationError, string> = {
  FILE_TOO_LARGE:    "Le fichier dépasse 15 Mo.",
  FILE_EMPTY:        "Le fichier est vide.",
  INVALID_EXTENSION: "Format non autorisé. Formats acceptés : JPG, PNG, WEBP, PDF.",
  INVALID_MIME_TYPE: "Type de fichier non autorisé.",
  MIME_MISMATCH:     "Le type de fichier ne correspond pas à son contenu.",
};

// ─── Compression images avant upload ─────────────────────────────────────────

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function compressImage(
  buffer: Buffer,
  mime: string
): Promise<{ buffer: Buffer; mime: string }> {
  if (!IMAGE_MIMES.has(mime)) return { buffer, mime };
  const compressed = await sharp(buffer)
    .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, progressive: true })
    .toBuffer();
  return { buffer: compressed, mime: "image/jpeg" };
}

// ─── Extension par MIME ───────────────────────────────────────────────────────

/**
 * Pourquoi resource_type "raw" pour tout ?
 *
 * Cloudinary distingue resource_type "image" et "raw" :
 * - "image" : le format (.jpg) est géré SÉPARÉMENT du public_id.
 *   Si on stocke "file.jpg" comme public_id, l'URL signée cherche
 *   public_id="file" + format="jpg" → mismatch → HTTP 404.
 *
 * - "raw" : le public_id inclut l'extension complète ("file.jpg").
 *   Cloudinary sert le fichier avec Content-Type inféré de l'extension :
 *   .jpg → image/jpeg (affiché inline) ✅
 *   .pdf → application/pdf (affiché inline ou téléchargé) ✅
 *   Aucune ambiguïté → zéro 404.
 */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg":      "jpg",
  "image/png":       "png",
  "image/webp":      "webp",
  "application/pdf": "pdf",
};

// ─── Upload privé ─────────────────────────────────────────────────────────────

export type DocumentRef = string;

/**
 * Compresse (images) et uploade vers Cloudinary en mode authentifié (privé).
 *
 * Format stocké en DB : "raw:taxi-booking/drivers/.../file.jpg"
 *                    ou "raw:taxi-booking/drivers/.../file.pdf"
 *
 * Toujours resource_type "raw" + extension dans le public_id →
 * Content-Type correct à la livraison, URL signée toujours valide.
 */
export async function uploadPrivateDocument(
  buffer: Buffer,
  filename: string,
  folder: string,
  detectedMime: string
): Promise<DocumentRef> {
  const cld = getCloudinary();

  // 1. Compression (images uniquement — PDF non modifié)
  const { buffer: finalBuffer, mime: finalMime } = await compressImage(buffer, detectedMime);

  const ext = MIME_TO_EXT[finalMime];
  if (!ext) throw new Error(`MIME non supporté : ${finalMime}`);

  const safeBase = filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80);

  // Extension incluse dans le public_id → indispensable pour resource_type "raw"
  const publicIdWithExt = `${safeBase}.${ext}`;

  return new Promise((resolve, reject) => {
    cld.uploader
      .upload_stream(
        {
          folder,
          public_id:       publicIdWithExt,
          resource_type:   "raw",           // ← unique resource_type pour tous les formats
          type:            "authenticated", // ← privé, inaccessible sans signature
          overwrite:       false,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(new Error(`Cloudinary upload failed: ${error?.message}`));
          } else {
            // Stocker le préfixe "raw:" pour cohérence avec getSignedDocumentUrl
            resolve(`raw:${result.public_id}`);
          }
        }
      )
      .end(finalBuffer);
  });
}

// ─── URL signée (temporaire, 15 min) ─────────────────────────────────────────

const SIGNED_URL_TTL = 15 * 60;

/**
 * Génère une URL signée temporaire (15 min).
 *
 * Gère tous les formats stockés en DB :
 *  - "raw:public_id"    → nouvelle architecture (resource_type raw)
 *  - "image:public_id"  → ancienne (resource_type image, peut donner 404)
 *  - "https://..."      → très ancienne (URL publique directe)
 */
export function getSignedDocumentUrl(storedRef: DocumentRef): string {
  // Très ancienne architecture : URL publique directe
  if (storedRef.startsWith("https://") || storedRef.startsWith("http://")) {
    return storedRef;
  }

  const colonIdx    = storedRef.indexOf(":");
  const resourceType = storedRef.slice(0, colonIdx) as "image" | "raw";
  const publicId    = storedRef.slice(colonIdx + 1);

  const cld = getCloudinary();

  return cld.url(publicId, {
    resource_type: resourceType,
    type:          "authenticated",
    sign_url:      true,
    expires_at:    Math.floor(Date.now() / 1000) + SIGNED_URL_TTL,
    secure:        true,
  });
}

// ─── Upload Telegram (photos bot — non sensibles) ────────────────────────────

export async function uploadTelegramFileToCloudinary(
  fileId: string,
  folder: string
): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const cld = getCloudinary();
  try {
    const res  = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const json = await res.json();
    if (!json.ok) return null;
    const fileUrl = `https://api.telegram.org/file/bot${token}/${json.result.file_path}`;
    const result  = await cld.uploader.upload(fileUrl, {
      folder:        `taxi-booking/${folder}`,
      resource_type: "auto",
    });
    return result.secure_url;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return null;
  }
}
