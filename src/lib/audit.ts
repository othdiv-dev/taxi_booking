import { db } from "@/db";
import { auditLogs } from "@/db/schema";

type EntityType = "driver" | "booking" | "zone" | "admin";

interface LogAuditParams {
  adminId?:     number | null;
  adminName?:   string | null;
  action:       string;          // ex: "driver.verified", "driver.deleted"
  entityType:   EntityType;
  entityId?:    number | null;
  entityLabel?: string | null;   // ex: "Jean Dupont", "REF-12345"
  meta?:        Record<string, unknown> | null; // { before: {}, after: {} }
}

/**
 * Enregistre une action admin dans la table audit_logs.
 * Ne lève jamais d'exception — un échec de log ne doit pas bloquer l'action.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      adminId:     params.adminId    ?? null,
      adminName:   params.adminName  ?? null,
      action:      params.action,
      entityType:  params.entityType,
      entityId:    params.entityId   ?? null,
      entityLabel: params.entityLabel ?? null,
      meta:        params.meta       ?? null,
    });
  } catch (err) {
    // Log silencieux — ne jamais bloquer l'action principale
    console.error("[audit] Failed to write audit log:", err);
  }
}
