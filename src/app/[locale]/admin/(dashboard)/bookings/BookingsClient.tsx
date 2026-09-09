"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────
interface Booking {
  id: number;
  reference: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;
  totalPrice: number;
  status: string;
  zoneName: string | null;
  zoneId: number | null;
  offeredPrice: number | null;
  telegramGroupMsgId: number | null;
}

interface Zone { id: number; name: string; }
interface KPI { total: number; revenue: number; accepted: number; pending: number; }

// ── Config statuts ─────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  label: string; bg: string; text: string; dot: string; border: string;
}> = {
  pending:          { label: "En attente",   bg: "bg-amber-50",  text: "text-amber-800",  dot: "bg-amber-400",  border: "border-amber-200"  },
  paid:             { label: "Payée",         bg: "bg-blue-50",   text: "text-blue-800",   dot: "bg-blue-400",   border: "border-blue-200"   },
  sent_to_drivers:  { label: "Envoyée",       bg: "bg-orange-50", text: "text-orange-800", dot: "bg-orange-400", border: "border-orange-200" },
  accepted:         { label: "Acceptée",      bg: "bg-green-50",  text: "text-green-800",  dot: "bg-green-500",  border: "border-green-200"  },
  driver_on_way:    { label: "En route",      bg: "bg-purple-50", text: "text-purple-800", dot: "bg-purple-500", border: "border-purple-200" },
  passenger_picked: { label: "En course",     bg: "bg-cyan-50",   text: "text-cyan-800",   dot: "bg-cyan-500",   border: "border-cyan-200"   },
  completed:        { label: "Terminée",      bg: "bg-emerald-50",text: "text-emerald-800",dot: "bg-emerald-600",border: "border-emerald-300"},
  cancelled:        { label: "Annulée",       bg: "bg-red-50",    text: "text-red-800",    dot: "bg-red-400",    border: "border-red-200"    },
};

// ── Helpers ────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
];

function getInitials(name: string) {
  return name.split(" ").map(n => n[0] ?? "").join("").toUpperCase().slice(0, 2);
}
function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// ── Composant principal ────────────────────────────────────────
export default function BookingsClient({
  bookings, zones, kpi,
}: {
  bookings: Booking[];
  zones: Zone[];
  kpi: KPI;
}) {
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter]   = useState("all");
  const [dateFilter, setDateFilter]   = useState("all");
  const [pageSize, setPageSize]       = useState(20);
  const [page, setPage]               = useState(1);
  const [selected, setSelected]       = useState<Set<number>>(new Set());

  // ── Filtrage ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !b.reference.toLowerCase().includes(q) &&
          !b.customerName.toLowerCase().includes(q) &&
          !b.pickupAddress.toLowerCase().includes(q) &&
          !b.dropoffAddress.toLowerCase().includes(q)
        ) return false;
      }
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (zoneFilter !== "all" && String(b.zoneId) !== zoneFilter) return false;
      if (dateFilter !== "all") {
        const d = new Date(b.pickupDatetime);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (dateFilter === "today" && d.toDateString() !== now.toDateString()) return false;
        if (dateFilter === "week"  && diff > 7  * 86400000) return false;
        if (dateFilter === "month" && diff > 30 * 86400000) return false;
      }
      return true;
    });
  }, [bookings, search, statusFilter, zoneFilter, dateFilter]);

  // ── Pagination ─────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const start      = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end        = Math.min(safePage * pageSize, filtered.length);

  // ── Compteurs statuts ──────────────────────────────────────
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    bookings.forEach(b => { c[b.status] = (c[b.status] || 0) + 1; });
    return c;
  }, [bookings]);

  // ── Sélection ─────────────────────────────────────────────
  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected(selected.size === paginated.length
      ? new Set()
      : new Set(paginated.map(b => b.id))
    );
  };

  // ── Helpers de reset ──────────────────────────────────────
  const go = (fn: () => void) => { fn(); setPage(1); };

  return (
    <div className="space-y-5">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Réservations</h1>
          <p className="mt-0.5 text-sm text-slate-500">{kpi.total} réservation(s) au total</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-base">🚕</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{kpi.total}</p>
          <p className="mt-1 text-xs text-slate-400">Toutes réservations</p>
        </div>

        {/* CA */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CA Total</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-50 text-base">💶</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {kpi.revenue >= 1000
              ? `${(kpi.revenue / 1000).toFixed(1)}k€`
              : `${kpi.revenue.toFixed(0)}€`}
          </p>
          <p className="mt-1 text-xs font-medium text-green-600">Hors annulations</p>
        </div>

        {/* Acceptées */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Acceptées</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-base">✅</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{kpi.accepted}</p>
          <p className="mt-1 text-xs text-slate-400">En cours + terminées</p>
        </div>

        {/* En attente */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">En attente</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-base">⏳</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{kpi.pending}</p>
          {kpi.pending > 0
            ? <p className="mt-1 text-xs font-semibold text-amber-600">⚠️ Action requise</p>
            : <p className="mt-1 text-xs text-slate-400">Aucune action requise</p>
          }
        </div>
      </div>

      {/* ── Tableau principal ── */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">

        {/* Barre de filtres */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
          {/* Recherche */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => go(() => setSearch(e.target.value))}
              placeholder="Référence, client, trajet..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          {/* Statut */}
          <select
            value={statusFilter}
            onChange={e => go(() => setStatusFilter(e.target.value))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary"
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Date */}
          <select
            value={dateFilter}
            onChange={e => go(() => setDateFilter(e.target.value))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary"
          >
            <option value="all">Toutes les dates</option>
            <option value="today">Aujourd&apos;hui</option>
            <option value="week">7 derniers jours</option>
            <option value="month">30 derniers jours</option>
          </select>

          {/* Zone */}
          {zones.length > 0 && (
            <select
              value={zoneFilter}
              onChange={e => go(() => setZoneFilter(e.target.value))}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary"
            >
              <option value="all">Toutes les zones</option>
              {zones.map(z => (
                <option key={z.id} value={String(z.id)}>{z.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Tags statuts */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 bg-slate-50/50 px-5 py-2.5">
          <button
            onClick={() => go(() => setStatusFilter("all"))}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${
              statusFilter === "all"
                ? "gradient-primary border-primary text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            Tout · {bookings.length}
          </button>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => {
            const cnt = statusCounts[k] || 0;
            if (!cnt) return null;
            return (
              <button
                key={k}
                onClick={() => go(() => setStatusFilter(k))}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  statusFilter === k
                    ? `${v.bg} ${v.text} ${v.border}`
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />
                {v.label} · {cnt}
              </button>
            );
          })}
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 pl-5 pr-3">
                  <input
                    type="checkbox"
                    checked={selected.size > 0 && selected.size === paginated.length}
                    onChange={toggleAll}
                    className="cursor-pointer rounded border-slate-300 accent-primary"
                  />
                </th>
                <th className="px-3 py-3">Référence</th>
                <th className="px-3 py-3">Client</th>
                <th className="px-3 py-3">Trajet</th>
                <th className="px-3 py-3">Zone</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Prix</th>
                <th className="px-3 py-3">Statut</th>
                <th className="py-3 pl-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map(b => {
                const sc = STATUS_CONFIG[b.status] ?? {
                  label: b.status, bg: "bg-slate-100", text: "text-slate-700",
                  dot: "bg-slate-400", border: "border-slate-200",
                };
                const dt       = new Date(b.pickupDatetime);
                const dateStr  = dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
                const timeStr  = dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                const initials = getInitials(b.customerName);
                const avatarCl = getAvatarColor(b.customerName);
                const isSelected = selected.has(b.id);

                return (
                  <tr
                    key={b.id}
                    className={`transition hover:bg-slate-50 ${isSelected ? "bg-primary/5" : ""}`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 pl-5 pr-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(b.id)}
                        className="cursor-pointer rounded border-slate-300 accent-primary"
                      />
                    </td>

                    {/* Référence */}
                    <td className="px-3 py-3">
                      <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                        {b.reference}
                      </span>
                    </td>

                    {/* Client + avatar */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarCl}`}>
                          {initials}
                        </span>
                        <span className="whitespace-nowrap text-sm font-medium text-slate-800">
                          {b.customerName}
                        </span>
                      </div>
                    </td>

                    {/* Trajet */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 text-sm text-slate-700">
                        <span className="max-w-[90px] truncate">{b.pickupAddress}</span>
                        <span className="flex-shrink-0 text-xs text-slate-400">→</span>
                        <span className="max-w-[90px] truncate">{b.dropoffAddress}</span>
                      </div>
                    </td>

                    {/* Zone */}
                    <td className="px-3 py-3">
                      <span className="text-xs text-slate-500">{b.zoneName || "—"}</span>
                    </td>

                    {/* Date sur 2 lignes */}
                    <td className="px-3 py-3">
                      <div className="text-sm">
                        <div className="font-medium text-slate-800">{dateStr}</div>
                        <div className="text-xs text-slate-400">{timeStr}</div>
                      </div>
                    </td>

                    {/* Prix */}
                    <td className="px-3 py-3">
                      <div>
                        <span className="text-sm font-semibold text-slate-900">
                          {b.offeredPrice !== null
                            ? `${b.offeredPrice.toFixed(2)}€`
                            : `${b.totalPrice.toFixed(2)}€`}
                        </span>
                        {b.offeredPrice !== null && (
                          <p className="text-[10px] text-slate-400 line-through">
                            {b.totalPrice.toFixed(2)}€
                          </p>
                        )}
                        {b.telegramGroupMsgId && (
                          <p className="text-[10px] text-green-600 font-semibold">📤 Envoyé</p>
                        )}
                      </div>
                    </td>

                    {/* Badge statut */}
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${sc.bg} ${sc.text} ${sc.border}`}>
                        <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 pl-3 pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/bookings/${b.id}`}
                          title="Voir détail"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                        >
                          👁️
                        </Link>
                        <Link
                          href={`/admin/bookings/${b.id}`}
                          title="Modifier"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                        >
                          ✏️
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginated.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                    Aucune réservation trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pied de tableau */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          <p className="text-xs text-slate-500">
            {filtered.length > 0
              ? `Affichage ${start}–${end} sur ${filtered.length} réservation(s)`
              : "Aucun résultat"}
          </p>

          <div className="flex items-center gap-3">
            {/* Lignes par page */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Lignes</span>
              <select
                value={pageSize}
                onChange={e => go(() => setPageSize(Number(e.target.value)))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ←
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (safePage <= 3) p = i + 1;
                  else if (safePage >= totalPages - 2) p = totalPages - 4 + i;
                  else p = safePage - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-medium transition ${
                        safePage === p
                          ? "gradient-primary border-primary text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}