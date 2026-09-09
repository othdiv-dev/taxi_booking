import { db } from "@/db";
import { bookings, zones } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import BookingsClient from "./BookingsClient";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  // ── KPIs ──────────────────────────────────────────────────
  const kpiRes = await db.execute(sql`
    SELECT
      CAST(COUNT(*) AS CHAR) as total,
      CAST(COALESCE(SUM(
        CASE WHEN status NOT IN ('pending','cancelled') THEN total_price ELSE 0 END
      ), 0) AS CHAR) as revenue,
      CAST(SUM(CASE WHEN status IN (
        'accepted','driver_on_way','passenger_picked','completed'
      ) THEN 1 ELSE 0 END) AS CHAR) as accepted,
      CAST(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS CHAR) as pending_count
    FROM bookings
  `);
  const kpiRow = (kpiRes as any)[0][0];

  // ── Réservations (500 max) ─────────────────────────────────
  const rows = await db
    .select({
      id: bookings.id,
      reference: bookings.reference,
      customerName: bookings.customerName,
      pickupAddress: bookings.pickupAddress,
      dropoffAddress: bookings.dropoffAddress,
      pickupDatetime: bookings.pickupDatetime,
      totalPrice: bookings.totalPrice,
      status: bookings.status,
      zoneName: zones.name,
      zoneId: bookings.zoneId,
      offeredPrice: bookings.offeredPrice,
      telegramGroupMsgId: bookings.telegramGroupMsgId,
    })
    .from(bookings)
    .leftJoin(zones, eq(bookings.zoneId, zones.id))
    .orderBy(desc(bookings.createdAt))
    .limit(500);

  // ── Zones pour filtre ──────────────────────────────────────
  const zonesList = await db
    .select({ id: zones.id, name: zones.name })
    .from(zones)
    .orderBy(zones.name);

  return (
    <BookingsClient
      bookings={rows.map(r => ({
        id: r.id,
        reference: r.reference,
        customerName: r.customerName,
        pickupAddress: r.pickupAddress,
        dropoffAddress: r.dropoffAddress,
        pickupDatetime: new Date(r.pickupDatetime).toISOString(),
        totalPrice: Number(r.totalPrice),
        status: r.status,
        zoneName: r.zoneName ?? null,
        zoneId: r.zoneId ?? null,
        offeredPrice: r.offeredPrice !== null ? Number(r.offeredPrice) : null,
        telegramGroupMsgId: r.telegramGroupMsgId ?? null,
      }))}
      zones={zonesList}
      kpi={{
        total: Number(kpiRow?.total ?? 0),
        revenue: Number(kpiRow?.revenue ?? 0),
        accepted: Number(kpiRow?.accepted ?? 0),
        pending: Number(kpiRow?.pending_count ?? 0),
      }}
    />
  );
}