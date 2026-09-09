"use server";

import { db } from "@/db";
import { drivers, bookings, telegramNotifications, admins } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { logAudit } from "@/lib/audit";
import {
  requireAdmin,
  hashPassword,
  verifyPassword,
  createSessionToken,
  ADMIN_COOKIE_NAME,
} from "@/lib/auth";
import { sendBookingToGroup, deleteMessage } from "@/lib/telegram";

// ─────────────────────────────────────────────────────────
// Connexion — authentification via la table `admins`
// ─────────────────────────────────────────────────────────

export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const email    = String(formData.get("email")    ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email et mot de passe requis." };
  }

  // Rechercher l'admin par email
  const [admin] = await db
    .select({ id: admins.id, email: admins.email, passwordHash: admins.passwordHash })
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  // Toujours vérifier un hash (constant-time) même si l'email n'existe pas,
  // pour ne pas révéler via timing si un email est enregistré.
  const dummyHash = "$2a$12$invalidhashfortimingnobodycanuse00000000000000000000000000";
  const valid = await verifyPassword(password, admin?.passwordHash ?? dummyHash);

  if (!admin || !valid) {
    return { error: "Email ou mot de passe incorrect." };
  }

  const token = createSessionToken(admin.email);
  const store  = await cookies();
  store.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   60 * 60 * 12,
  });

  redirect("/admin");
}

// ─────────────────────────────────────────────────────────
// Déconnexion
// ─────────────────────────────────────────────────────────

export async function logoutAction() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}

// ─────────────────────────────────────────────────────────
// Chauffeurs
// ─────────────────────────────────────────────────────────

export async function createDriverAction(formData: FormData) {
  const { adminId, adminName } = await requireAdmin();

  const isVerified = formData.get("isVerified") === "on";
  const isActive   = formData.get("isActive")   === "on";

  await db.insert(drivers).values({
    firstName:        String(formData.get("firstName")        ?? ""),
    lastName:         String(formData.get("lastName")         ?? ""),
    phone:            String(formData.get("phone")            ?? ""),
    telegramUsername: String(formData.get("telegramUsername") ?? "") || null,
    vehicleType:      (formData.get("vehicleType") as any)    ?? "sedan",
    isVerified,
    isActive,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await logAudit({
    adminId,
    adminName,
    action:      "driver.created",
    entityType:  "driver",
    entityId:    null,
    entityLabel: `${formData.get("firstName")} ${formData.get("lastName")}`,
    meta:        null,
  });

  revalidatePath("/admin/drivers");
}

export async function updateDriverAction(formData: FormData) {
  const { adminId, adminName } = await requireAdmin();

  const id         = Number(formData.get("id"));
  const isVerified = formData.get("isVerified") === "on";
  const isActive   = formData.get("isActive")   === "on";

  const [before] = await db.select().from(drivers).where(eq(drivers.id, id));
  if (!before) return;

  await db.update(drivers).set({
    firstName:        String(formData.get("firstName")        ?? ""),
    lastName:         String(formData.get("lastName")         ?? ""),
    phone:            String(formData.get("phone")            ?? ""),
    telegramUsername: String(formData.get("telegramUsername") ?? ""),
    vehicleType:      (formData.get("vehicleType") as any)    ?? "sedan",
    isVerified,
    isActive,
    updatedAt: new Date(),
  }).where(eq(drivers.id, id));

  const changes: Record<string, { before: unknown; after: unknown }> = {};
  if (before.isVerified !== isVerified) changes.isVerified = { before: before.isVerified, after: isVerified };
  if (before.isActive   !== isActive)   changes.isActive   = { before: before.isActive,   after: isActive };

  await logAudit({
    adminId,
    adminName,
    action:      isVerified && !before.isVerified ? "driver.verified" : "driver.updated",
    entityType:  "driver",
    entityId:    id,
    entityLabel: `${before.firstName} ${before.lastName}`,
    meta:        { changes },
  });

  revalidatePath(`/admin/drivers/${id}`);
  revalidatePath("/admin/drivers");
}

export async function deleteDriverAction(formData: FormData) {
  const { adminId, adminName } = await requireAdmin();

  const id = Number(formData.get("id"));
  const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
  if (!driver) return;

  // Délier les bookings et notifications liés avant suppression
  await db.update(bookings)
    .set({ driverId: null })
    .where(eq(bookings.driverId, id));

  await db.update(telegramNotifications)
    .set({ driverId: null })
    .where(eq(telegramNotifications.driverId, id));

  await db.delete(drivers).where(eq(drivers.id, id));

  await logAudit({
    adminId,
    adminName,
    action:      "driver.deleted",
    entityType:  "driver",
    entityId:    id,
    entityLabel: `${driver.firstName} ${driver.lastName}`,
    meta: {
      snapshot: {
        email:    driver.email,
        phone:    driver.phone,
        company:  driver.companyName,
        verified: driver.isVerified,
        active:   driver.isActive,
      },
    },
  });

  revalidatePath("/admin/drivers");
  redirect("/admin/drivers");
}

// ─────────────────────────────────────────────────────────
// Réservations
// ─────────────────────────────────────────────────────────

export async function updateBookingStatusAction(formData: FormData) {
  const { adminId, adminName } = await requireAdmin();

  const bookingId = Number(formData.get("id"));
  const newStatus = String(formData.get("status") ?? "");
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) return;

  await db.update(bookings).set({
    status:    newStatus as any,
    updatedAt: new Date(),
  }).where(eq(bookings.id, bookingId));

  await logAudit({
    adminId,
    adminName,
    action:      "booking.status_changed",
    entityType:  "booking",
    entityId:    bookingId,
    entityLabel: booking.reference,
    meta: {
      before: { status: booking.status },
      after:  { status: newStatus },
    },
  });

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function assignDriverAction(formData: FormData) {
  const { adminId, adminName } = await requireAdmin();

  const bookingId = Number(formData.get("bookingId"));
  const driverId  = Number(formData.get("driverId"));

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) return;

  await db.update(bookings).set({
    driverId:         driverId || null,
    driverAcceptedAt: driverId ? new Date() : null,
    status:           driverId ? "accepted" : "sent_to_drivers",
    updatedAt:        new Date(),
  }).where(eq(bookings.id, bookingId));

  await logAudit({
    adminId,
    adminName,
    action:      "booking.driver_assigned",
    entityType:  "booking",
    entityId:    bookingId,
    entityLabel: booking.reference,
    meta: {
      before: { driverId: booking.driverId },
      after:  { driverId: driverId || null },
    },
  });

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
}

export async function updateOfferedPriceAction(formData: FormData) {
  await requireAdmin();

  const bookingId    = Number(formData.get("bookingId"));
  const offeredPrice = formData.get("offeredPrice")?.toString().replace(",", ".") ?? "";

  if (!offeredPrice || isNaN(Number(offeredPrice))) return;

  await db.update(bookings).set({
    offeredPrice: offeredPrice,
    updatedAt:    new Date(),
  }).where(eq(bookings.id, bookingId));

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
}

export async function sendToGroupAction(formData: FormData) {
  const { adminId, adminName } = await requireAdmin();

  const bookingId = Number(formData.get("bookingId"));
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) return;

  const price  = booking.offeredPrice ?? booking.totalPrice;
  const chatId = Number(process.env.TELEGRAM_CHAT_ID!);

  if (booking.telegramGroupMsgId) {
    await deleteMessage(chatId, booking.telegramGroupMsgId);
  }

  const result = await sendBookingToGroup(bookingId, {
    reference:      booking.reference,
    pickupAddress:  booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    pickupDatetime: new Date(booking.pickupDatetime),
    passengers:     booking.passengers,
    luggage:        booking.luggage,
    vehicleType:    booking.vehicleType,
    distanceKm:     booking.distanceKm,
    totalPrice:     price,
    customerName:   booking.customerName,
    customerPhone:  booking.customerPhone,
    flightNumber:   booking.flightNumber,
    customerNotes:  booking.customerNotes,
  });

  if (result?.message_id) {
    await db.delete(telegramNotifications)
      .where(eq(telegramNotifications.bookingId, bookingId));

    await db.insert(telegramNotifications).values({
      bookingId,
      messageId: result.message_id,
      chatId:    result.chat.id,
      status:    "sent",
    });

    await db.update(bookings).set({
      telegramGroupMsgId: result.message_id,
      status:             "sent_to_drivers",
      updatedAt:          new Date(),
    }).where(eq(bookings.id, bookingId));
  }

  await logAudit({
    adminId,
    adminName,
    action:      "booking.sent_to_group",
    entityType:  "booking",
    entityId:    bookingId,
    entityLabel: booking.reference,
    meta:        { price: Number(price).toFixed(2) },
  });

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
}

// ─────────────────────────────────────────────────────────
// Gestion des administrateurs
// ─────────────────────────────────────────────────────────

export async function createAdminAction(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const { adminId, adminName } = await requireAdmin();

  const name     = String(formData.get("name")     ?? "").trim();
  const email    = String(formData.get("email")    ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { error: "Tous les champs sont obligatoires." };
  }
  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }

  // Vérifier que l'email n'est pas déjà utilisé
  const [existing] = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, email));
  if (existing) {
    return { error: "Cet email est déjà utilisé par un administrateur." };
  }

  // Hacher avec bcrypt (12 rounds) — remplace le SHA-256 précédent
  const passwordHash = await hashPassword(password);

  await db.insert(admins).values({
    name,
    email,
    passwordHash,
    createdAt: new Date(),
  });

  await logAudit({
    adminId,
    adminName,
    action:      "admin.created",
    entityType:  "admin",
    entityId:    null,
    entityLabel: `${name} (${email})`,
    meta:        null,
  });

  revalidatePath("/admin/settings");
  return { success: `Admin ${name} créé avec succès.` };
}

export async function deleteAdminAction(formData: FormData) {
  const { adminId, adminName, email: selfEmail } = await requireAdmin();

  const id = Number(formData.get("id"));
  const [target] = await db.select().from(admins).where(eq(admins.id, id));
  if (!target) return;

  // Empêcher l'auto-suppression
  if (target.email === selfEmail) return;

  // Empêcher la suppression du dernier admin
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(admins);
  if (Number(count) <= 1) return;

  await db.delete(admins).where(eq(admins.id, id));

  await logAudit({
    adminId,
    adminName,
    action:      "admin.deleted",
    entityType:  "admin",
    entityId:    id,
    entityLabel: `${target.name} (${target.email})`,
    meta:        null,
  });

  revalidatePath("/admin/settings");
}

// ─────────────────────────────────────────────────────────
// Changement de mot de passe
// ─────────────────────────────────────────────────────────

export async function changePasswordAction(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const { email } = await requireAdmin();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword     = String(formData.get("newPassword")     ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Tous les champs sont obligatoires." };
  }
  if (newPassword.length < 8) {
    return { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  // Vérifier le mot de passe actuel
  const [admin] = await db
    .select({ passwordHash: admins.passwordHash })
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  if (!admin) return { error: "Compte introuvable." };

  const valid = await verifyPassword(currentPassword, admin.passwordHash);
  if (!valid) {
    return { error: "Mot de passe actuel incorrect." };
  }

  // Hacher et sauvegarder le nouveau mot de passe
  const newHash = await hashPassword(newPassword);
  await db.update(admins)
    .set({ passwordHash: newHash })
    .where(eq(admins.email, email));

  return { success: "Mot de passe mis à jour avec succès." };
}
