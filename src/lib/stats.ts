import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function getDashboardStats() {

  // ── Totaux généraux ────────────────────────────────────────
  const totalsRes = await db.execute(sql`
    SELECT
      CAST(COUNT(*) AS CHAR) as total_bookings,
      CAST(COALESCE(SUM(
        CASE WHEN status NOT IN ('pending','cancelled') THEN total_price ELSE 0 END
      ), 0) AS CHAR) as total_revenue,
      CAST(SUM(CASE WHEN status = 'completed'  THEN 1 ELSE 0 END) AS CHAR) as completed_bookings,
      CAST(SUM(CASE WHEN status = 'cancelled'  THEN 1 ELSE 0 END) AS CHAR) as cancelled_bookings,
      CAST(SUM(CASE WHEN status IN ('paid','sent_to_drivers') AND driver_id IS NULL
                    THEN 1 ELSE 0 END) AS CHAR) as blocked_bookings
    FROM bookings
  `);
  const totals = (totalsRes as any)[0][0];

  // ── Répartition des statuts ────────────────────────────────
  const statusBreakdownRes = await db.execute(sql`
    SELECT status, CAST(COUNT(*) AS CHAR) as count
    FROM bookings
    GROUP BY status
  `);

  // ── CA par zone ────────────────────────────────────────────
  const revenueByZoneRes = await db.execute(sql`
    SELECT z.name as name,
      CAST(COALESCE(SUM(
        CASE WHEN b.status NOT IN ('pending','cancelled') THEN b.total_price ELSE 0 END
      ), 0) AS CHAR) as revenue,
      CAST(COUNT(b.id) AS CHAR) as trips
    FROM zones z
    LEFT JOIN bookings b ON b.zone_id = z.id
    GROUP BY z.id, z.name
    ORDER BY revenue DESC
  `);

  // ── CA journalier 14 derniers jours ───────────────────────
  const dailyRevenueRes = await db.execute(sql`
    SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as day,
      CAST(COALESCE(SUM(
        CASE WHEN status NOT IN ('pending','cancelled') THEN total_price ELSE 0 END
      ), 0) AS CHAR) as revenue
    FROM bookings
    WHERE created_at >= NOW() - INTERVAL 14 DAY
    GROUP BY day
    ORDER BY day ASC
  `);

  // ── Chauffeurs ─────────────────────────────────────────────
  const driverCountsRes = await db.execute(sql`
    SELECT
      CAST(COUNT(*) AS CHAR) as total,
      CAST(SUM(CASE WHEN is_active  = 1 THEN 1 ELSE 0 END) AS CHAR) as active,
      CAST(SUM(CASE WHEN is_verified = 0 THEN 1 ELSE 0 END) AS CHAR) as pending
    FROM drivers
  `);
  const driverCounts = (driverCountsRes as any)[0][0];

  // ── Mois en cours vs mois précédent ───────────────────────
  const monthlyRes = await db.execute(sql`
    SELECT
      CAST(COALESCE(SUM(
        CASE WHEN MONTH(created_at) = MONTH(NOW())
              AND YEAR(created_at) = YEAR(NOW())
              AND status NOT IN ('pending','cancelled')
        THEN total_price ELSE 0 END
      ), 0) AS CHAR) as current_month,
      CAST(COALESCE(SUM(
        CASE WHEN MONTH(created_at) = MONTH(NOW() - INTERVAL 1 MONTH)
              AND YEAR(created_at)  = YEAR(NOW()  - INTERVAL 1 MONTH)
              AND status NOT IN ('pending','cancelled')
        THEN total_price ELSE 0 END
      ), 0) AS CHAR) as last_month,
      CAST(SUM(
        CASE WHEN MONTH(created_at) = MONTH(NOW())
              AND YEAR(created_at) = YEAR(NOW())
        THEN 1 ELSE 0 END
      ) AS CHAR) as current_month_bookings,
      CAST(SUM(
        CASE WHEN MONTH(created_at) = MONTH(NOW() - INTERVAL 1 MONTH)
              AND YEAR(created_at)  = YEAR(NOW()  - INTERVAL 1 MONTH)
        THEN 1 ELSE 0 END
      ) AS CHAR) as last_month_bookings
    FROM bookings
  `);
  const monthly = (monthlyRes as any)[0][0];

  // ── Temps moyen d'acceptation (en minutes) ────────────────
  const avgAcceptRes = await db.execute(sql`
    SELECT CAST(
      COALESCE(AVG(
        TIMESTAMPDIFF(MINUTE, created_at, driver_accepted_at)
      ), 0) AS CHAR
    ) as avg_minutes
    FROM bookings
    WHERE status IN ('accepted','driver_on_way','passenger_picked','completed')
      AND driver_accepted_at IS NOT NULL
  `);
  const avgAccept = (avgAcceptRes as any)[0][0];

  // ── Documents expirant dans 30 jours ou déjà expirés ─────
  const expiringDocsRes = await db.execute(sql`
    SELECT
      id, first_name, last_name,
      insurance_expiry,
      drivers_license_expiry,
      taxi_card_expiry
    FROM drivers
    WHERE is_active = 1
      AND (
        insurance_expiry       < DATE_ADD(NOW(), INTERVAL 30 DAY) OR
        drivers_license_expiry < DATE_ADD(NOW(), INTERVAL 30 DAY) OR
        taxi_card_expiry       < DATE_ADD(NOW(), INTERVAL 30 DAY)
      )
    ORDER BY LEAST(
      COALESCE(insurance_expiry,       '9999-12-31'),
      COALESCE(drivers_license_expiry, '9999-12-31'),
      COALESCE(taxi_card_expiry,       '9999-12-31')
    ) ASC
    LIMIT 10
  `);
  const expiringDocs = ((expiringDocsRes as any)[0] as any[]).map((r: any) => ({
    id:            Number(r.id),
    name:          `${r.first_name} ${r.last_name}`,
    insuranceExpiry:       r.insurance_expiry       ? new Date(r.insurance_expiry)       : null,
    driversLicenseExpiry:  r.drivers_license_expiry ? new Date(r.drivers_license_expiry) : null,
    taxiCardExpiry:        r.taxi_card_expiry        ? new Date(r.taxi_card_expiry)        : null,
  }));

  // ── Calculs ────────────────────────────────────────────────
  const totalBookings     = Number(totals?.total_bookings    ?? 0);
  const cancelledBookings = Number(totals?.cancelled_bookings ?? 0);
  const currentMonth      = Number(monthly?.current_month    ?? 0);
  const lastMonth         = Number(monthly?.last_month       ?? 0);
  const monthDiff         = lastMonth > 0
    ? Math.round(((currentMonth - lastMonth) / lastMonth) * 100)
    : null;
  const currentMonthBookings = Number(monthly?.current_month_bookings ?? 0);
  const lastMonthBookings    = Number(monthly?.last_month_bookings    ?? 0);
  const bookingsDiff         = lastMonthBookings > 0
    ? Math.round(((currentMonthBookings - lastMonthBookings) / lastMonthBookings) * 100)
    : null;

  return {
    // Existants
    totalBookings,
    totalRevenue:       Number(totals?.total_revenue ?? 0),
    completedBookings:  Number(totals?.completed_bookings ?? 0),
    statusBreakdown: ((statusBreakdownRes as any)[0] as any[]).map((r: any) => ({
      status: r.status,
      count:  Number(r.count),
    })),
    revenueByZone: ((revenueByZoneRes as any)[0] as any[]).map((r: any) => ({
      name:    r.name ?? "Sans zone",
      revenue: Number(r.revenue ?? 0),
      trips:   Number(r.trips),
    })),
    dailyRevenue: ((dailyRevenueRes as any)[0] as any[]).map((r: any) => ({
      day:     r.day,
      revenue: Number(r.revenue),
    })),
    driverTotal:   Number(driverCounts?.total   ?? 0),
    driverActive:  Number(driverCounts?.active  ?? 0),
    driverPending: Number(driverCounts?.pending ?? 0),

    // Nouveaux
    cancelledBookings,
    cancellationRate: totalBookings > 0
      ? Math.round((cancelledBookings / totalBookings) * 100)
      : 0,
    blockedBookings: Number(totals?.blocked_bookings ?? 0),
    currentMonthRevenue:   currentMonth,
    lastMonthRevenue:      lastMonth,
    monthRevenueChange:    monthDiff,
    currentMonthBookings,
    lastMonthBookings,
    monthBookingsChange:   bookingsDiff,
    avgAcceptanceMinutes:  Math.round(Number(avgAccept?.avg_minutes ?? 0)),
    expiringDocuments:     expiringDocs,
  };
}