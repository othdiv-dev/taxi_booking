// Fichier : src/app/[locale]/admin/(dashboard)/audit-logs/page.tsx

import { db } from "@/db";
import { auditLogs, admins } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  "driver.verified":        { label: "Chauffeur validé",        icon: "✅", color: "bg-green-100 text-green-700" },
  "driver.updated":         { label: "Chauffeur modifié",       icon: "✏️", color: "bg-blue-100 text-blue-700" },
  "driver.deleted":         { label: "Chauffeur supprimé",      icon: "🗑️", color: "bg-red-100 text-red-700" },
  "booking.status_changed": { label: "Statut réservation",      icon: "🔄", color: "bg-orange-100 text-orange-700" },
  "booking.cancelled":      { label: "Réservation annulée",     icon: "❌", color: "bg-red-100 text-red-700" },
  "zone.created":           { label: "Zone créée",              icon: "🗺️", color: "bg-purple-100 text-purple-700" },
  "zone.updated":           { label: "Zone modifiée",           icon: "✏️", color: "bg-purple-100 text-purple-700" },
  "zone.deleted":           { label: "Zone supprimée",          icon: "🗑️", color: "bg-red-100 text-red-700" },
};

function formatMeta(meta: unknown): string | null {
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;

  // Changement de statut
  if (m.before && m.after) {
    const before = m.before as Record<string, unknown>;
    const after  = m.after  as Record<string, unknown>;
    if (before.status && after.status) {
      return `${before.status} → ${after.status}`;
    }
  }

  // Changements de champs
  if (m.changes && typeof m.changes === "object") {
    const changes = m.changes as Record<string, { before: unknown; after: unknown }>;
    return Object.entries(changes)
      .map(([k, v]) => `${k}: ${v.before} → ${v.after}`)
      .join(", ");
  }

  return null;
}

export default async function AuditLogsPage() {
  const logs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">📋 Journal d&apos;activité</h1>
        <p className="text-sm text-slate-500 mt-1">Toutes les actions effectuées par les administrateurs</p>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium">Aucune action enregistrée</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & heure</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entité</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => {
                const actionInfo = ACTION_LABELS[log.action] ?? {
                  label: log.action,
                  icon: "⚙️",
                  color: "bg-slate-100 text-slate-600",
                };
                const detail = formatMeta(log.meta);
                const date   = new Date(log.createdAt);

                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    {/* Date */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {date.toLocaleDateString("fr-FR")}
                      </div>
                      <div className="text-xs text-slate-400">
                        {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </div>
                    </td>

                    {/* Admin */}
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-700">
                        {log.adminName ?? "—"}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${actionInfo.color}`}>
                        {actionInfo.icon} {actionInfo.label}
                      </span>
                    </td>

                    {/* Entité */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{log.entityLabel ?? "—"}</div>
                      <div className="text-xs text-slate-400 capitalize">
                        {log.entityType} #{log.entityId}
                      </div>
                    </td>

                    {/* Détail */}
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                      {detail ?? <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center">
        Affichage des 200 dernières actions
      </p>
    </div>
  );
}
