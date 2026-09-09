import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { eq } from "drizzle-orm";

export const ADMIN_COOKIE_NAME = "taxi_admin_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12; // 12h

// ─── Signature HMAC du cookie ────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET manquant — définis cette variable d'environnement en production !");
  }
  return secret || "taxi-app-dev-secret-change-me";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionToken(email: string): string {
  const expires = Date.now() + SESSION_DURATION_MS;
  const payload = `${email}.${expires}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifySessionToken(token: string | undefined | null): { email: string } | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");

    // Utilise lastIndexOf pour gérer les emails contenant des points (ex: admin@exemple.com)
    const lastDot = decoded.lastIndexOf(".");
    const signature = decoded.slice(lastDot + 1);
    const rest = decoded.slice(0, lastDot);

    const secondLastDot = rest.lastIndexOf(".");
    const expiresStr = rest.slice(secondLastDot + 1);
    const email = rest.slice(0, secondLastDot);

    if (!email || !expiresStr || !signature) return null;

    const expected = sign(`${email}.${expiresStr}`);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

    if (Date.now() > Number(expiresStr)) return null;

    return { email };
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

// ─── Hachage bcrypt ───────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;

/**
 * Hache un mot de passe avec bcrypt (12 rounds).
 * À utiliser dans createAdminAction et changePasswordAction.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare un mot de passe en clair avec son hash bcrypt.
 * Timing-safe par conception — ne révèle pas si l'email existe.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Garde d'autorisation ────────────────────────────────────────────────────

export type AdminSession = {
  adminId:   number;
  adminName: string;
  email:     string;
};

/**
 * À appeler en première ligne de chaque Server Action admin.
 *
 * 1. Vérifie que le cookie de session est valide et non expiré.
 * 2. Vérifie que l'admin existe toujours en base
 *    (un compte supprimé ne peut plus agir, même avec un cookie valide).
 * 3. Retourne { adminId, adminName, email } pour l'audit.
 *
 * Lance "UNAUTHORIZED" à la moindre anomalie → l'action s'annule.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new Error("UNAUTHORIZED");

  const [admin] = await db
    .select({ id: admins.id, name: admins.name, email: admins.email })
    .from(admins)
    .where(eq(admins.email, session.email))
    .limit(1);

  if (!admin) throw new Error("UNAUTHORIZED");

  return { adminId: admin.id, adminName: admin.name, email: admin.email };
}

// ─── Renouvellement de session ───────────────────────────────────────────────

export async function renewSessionIfNeeded(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return;

  const session = verifySessionToken(token);
  if (!session) return;

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    const rest = decoded.slice(0, lastDot);
    const secondLastDot = rest.lastIndexOf(".");
    const expiresStr = rest.slice(secondLastDot + 1);
    const expires = Number(expiresStr);

    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const remaining = expires - Date.now();

    if (remaining < TWO_HOURS_MS) {
      const newToken = createSessionToken(session.email);
      store.set(ADMIN_COOKIE_NAME, newToken, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === "production",
        sameSite: "lax",
        path:     "/",
        maxAge:   60 * 60 * 12,
      });
    }
  } catch {
    // Erreur de parsing → session expirera normalement, pas bloquant
  }
}
