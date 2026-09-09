import { getDashboardStats } from "@/lib/stats";
import { DailyRevenueChart, RevenueByZoneChart } from "@/components/admin/DashboardCharts";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  pending:          "En attente",
  paid:             "Payée",
  sent_to_drivers:  "Envoyée aux chauffeurs",
  accepted:         "Acceptée",
  driver_on_way:    "Chauffeur en route",
  passenger_picked: "Passager pris en charge",
  completed:        "Terminée",
  cancelled:        "Annulée",
};

function Trend({ value, suffix = "%" }: { value: number | null; suffix?: string }) {
  if (value === null) return <span className="text-xs text-slate-400">— nouveau</span>;
  const positive = value >= 0;
  return (
    <span className={`text-xs font-semibold ${positive ? "text-green-600" : "text-red-500"}`}>
      {positive ? "↑" : "↓"} {Math.abs(value)}{suffix} vs mois dernier
    </span>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();
  const today = new Date();

  return (
    <div className="space-y-6">

      {/* ── En-tête ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-sm text-slate-500">Vue d&apos;ensemble de l&apos;activité de la plateforme.</p>
      </div>

      {/* ── Alertes ── */}
      {(stats.expiringDocuments.length > 0 || stats.blockedBookings > 0 || stats.driverPending > 0) && (
        <div className="space-y-2">

          {/* Documents expirants */}
          {stats.expiringDocuments.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
              <span className="mt-0.5 text-lg">🔴</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">
                  {stats.expiringDocuments.length} chauffeur(s) avec documents expirés ou expirant dans 30 jours
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {stats.expiringDocuments.map(d => {
                    const docs: string[] = [];
                    if (d.insuranceExpiry      && d.insuranceExpiry      <= new Date(today.getTime() + 30*86400000)) docs.push("Assurance");
                    if (d.driversLicenseExpiry && d.driversLicenseExpiry <= new Date(today.getTime() + 30*86400000)) docs.push("Permis");
                    if (d.taxiCardExpiry       && d.taxiCardExpiry       <= new Date(today.getTime() + 30*86400000)) docs.push("Carte taxi");
                    const isExpired =
                      (d.insuranceExpiry      && d.insuranceExpiry      < today) ||
                      (d.driversLicenseExpiry && d.driversLicenseExpiry < today) ||
                      (d.taxiCardExpiry       && d.taxiCardExpiry       < today);
                    return (
                      <Link
                        key={d.id}
                        href={`/admin/drivers/${d.id}`}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition hover:opacity-80 ${
                          isExpired
                            ? "border-red-300 bg-red-100 text-red-700"
                            : "border-orange-300 bg-orange-100 text-orange-700"
                        }`}
                      >
                        {d.name} — {docs.join(", ")}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Réservations bloquées */}
          {stats.blockedBookings > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <span className="text-lg">⚠️</span>
              <p className="flex-1 text-sm font-semibold text-amber-800">
                {stats.blockedBookings} réservation(s) payée(s) sans chauffeur assigné
              </p>
              <Link
                href="/admin/bookings"
                className="rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-200"
              >
                Voir →
              </Link>
            </div>
          )}

          {/* Chauffeurs en attente */}
          {stats.driverPending > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
              <span className="text-lg">⏳</span>
              <p className="flex-1 text-sm font-semibold text-blue-800">
                {stats.driverPending} chauffeur(s) en attente de validation
              </p>
              <Link
                href="/admin/drivers"
                className="rounded-xl bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-800 transition hover:bg-blue-200"
              >
                Valider →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        {/* Courses totales */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Courses</p>
            <span className="text-xl">🚕</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalBookings}</p>
          <div className="mt-1">
            <Trend value={stats.monthBookingsChange} />
          </div>
        </div>

        {/* CA total */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">CA Total</p>
            <span className="text-xl">💶</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {stats.totalRevenue >= 1000
              ? `${(stats.totalRevenue / 1000).toFixed(1)}k€`
              : `${stats.totalRevenue.toFixed(0)}€`}
          </p>
          <div className="mt-1">
            <Trend value={stats.monthRevenueChange} />
          </div>
        </div>

        {/* CA ce mois */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ce mois</p>
            <span className="text-xl">📅</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {stats.currentMonthRevenue >= 1000
              ? `${(stats.currentMonthRevenue / 1000).toFixed(1)}k€`
              : `${stats.currentMonthRevenue.toFixed(0)}€`}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Mois dernier : {stats.lastMonthRevenue >= 1000
              ? `${(stats.lastMonthRevenue / 1000).toFixed(1)}k€`
              : `${stats.lastMonthRevenue.toFixed(0)}€`}
          </p>
        </div>

        {/* Chauffeurs actifs */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Chauffeurs</p>
            <span className="text-xl">🧑‍✈️</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {stats.driverActive}
            <span className="ml-1 text-sm font-normal text-slate-400">/ {stats.driverTotal}</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">actifs sur le total</p>
        </div>
      </div>

      {/* ── Stats secondaires ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Terminées</p>
          <p className="mt-1 text-xl font-bold text-green-600">{stats.completedBookings}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Annulées</p>
          <p className="mt-1 text-xl font-bold text-red-500">{stats.cancelledBookings}</p>
          <p className="text-xs text-slate-400">Taux : {stats.cancellationRate}%</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Bloquées</p>
          <p className={`mt-1 text-xl font-bold ${stats.blockedBookings > 0 ? "text-amber-500" : "text-slate-900"}`}>
            {stats.blockedBookings}
          </p>
          <p className="text-xs text-slate-400">Sans chauffeur</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Délai moyen</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {stats.avgAcceptanceMinutes > 0 ? formatMinutes(stats.avgAcceptanceMinutes) : "—"}
          </p>
          <p className="text-xs text-slate-400">Acceptation chauffeur</p>
        </div>
      </div>

      {/* ── Graphiques ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">CA par zone</h2>
          {stats.revenueByZone.length > 0 ? (
            <RevenueByZoneChart data={stats.revenueByZone} />
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">Aucune donnée disponible.</p>
          )}
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">CA — 14 derniers jours</h2>
          {stats.dailyRevenue.length > 0 ? (
            <DailyRevenueChart data={stats.dailyRevenue} />
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">Aucune donnée disponible.</p>
          )}
        </div>
      </div>

      {/* ── Répartition des statuts ── */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Répartition des statuts</h2>
        <div className="flex flex-wrap gap-3">
          {stats.statusBreakdown.map((s) => (
            <span
              key={s.status}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              {STATUS_LABELS[s.status] || s.status} : <strong>{s.count}</strong>
            </span>
          ))}
          {stats.statusBreakdown.length === 0 && (
            <p className="text-sm text-slate-400">Aucune réservation pour le moment.</p>
          )}
        </div>
      </div>

    </div>
  );
}