import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, drivers, payments, zones } from "@/db/schema";
import { updateOfferedPriceAction, sendToGroupAction, assignDriverAction, updateBookingStatusAction } from "../../../actions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  "pending",
  "paid",
  "sent_to_drivers",
  "accepted",
  "driver_on_way",
  "passenger_picked",
  "completed",
  "cancelled",
];

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId)) notFound();

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) notFound();

  const [zone] = booking.zoneId ? await db.select().from(zones).where(eq(zones.id, booking.zoneId)) : [null];
  const bookingPayments = await db.select().from(payments).where(eq(payments.bookingId, bookingId));
  const allDrivers = await db.select().from(drivers).where(eq(drivers.isActive, true));
  const assignedDriver = booking.driverId
    ? (await db.select().from(drivers).where(eq(drivers.id, booking.driverId)))[0]
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/bookings" className="text-sm text-blue-600 hover:underline">
            ← Retour aux réservations
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{booking.reference}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Trajet</h2>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">Départ</dt>
                <dd className="font-medium text-slate-900">{booking.pickupAddress}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Arrivée</dt>
                <dd className="font-medium text-slate-900">{booking.dropoffAddress}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Date/heure</dt>
                <dd className="font-medium text-slate-900">
                  {new Date(booking.pickupDatetime).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Zone</dt>
                <dd className="font-medium text-slate-900">{zone?.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Distance</dt>
                <dd className="font-medium text-slate-900">{booking.distanceKm} km</dd>
              </div>
              <div>
                <dt className="text-slate-400">Véhicule</dt>
                <dd className="font-medium text-slate-900">{booking.vehicleType}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Passagers / Bagages</dt>
                <dd className="font-medium text-slate-900">
                  {booking.passengers} / {booking.luggage}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Vol</dt>
                <dd className="font-medium text-slate-900">{booking.flightNumber || "—"}</dd>
              </div>
              {booking.customerNotes ? (
                <div className="sm:col-span-2">
                  <dt className="text-slate-400">Notes</dt>
                  <dd className="font-medium text-slate-900">{booking.customerNotes}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Client</h2>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-slate-400">Nom</dt>
                <dd className="font-medium text-slate-900">{booking.customerName}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Email</dt>
                <dd className="font-medium text-slate-900">{booking.customerEmail}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Téléphone</dt>
                <dd className="font-medium text-slate-900">{booking.customerPhone}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Paiements</h2>
            <div className="space-y-2 text-sm">
              {bookingPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-slate-500">{p.method} · {p.transactionId}</span>
                  <span className="font-medium text-slate-900">
                    {Number(p.amount).toFixed(2)}€ — {p.status}
                  </span>
                </div>
              ))}
              {bookingPayments.length === 0 ? <p className="text-slate-400">Aucun paiement enregistré.</p> : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Prix</h2>
            <p className="text-3xl font-bold text-slate-900">{Number(booking.totalPrice).toFixed(2)}€</p>
            <p className="mt-1 text-xs text-slate-400">
              {Number(booking.basePrice).toFixed(2)}€ + {Number(booking.pricePerKm).toFixed(2)}€/km × {booking.distanceKm}km
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Statut</h2>
            <form action={updateBookingStatusAction} className="space-y-3">
              <input type="hidden" name="id" value={booking.id} />
              <select name="status" defaultValue={booking.status} className="input">
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-primary w-full">
                Mettre à jour
              </button>
            </form>
          </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Prix</h2>

              {/* Prix original */}
              <p className="text-xs text-slate-400 line-through">
                Prix calculé : {Number(booking.totalPrice).toFixed(2)}€
              </p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {booking.offeredPrice
                  ? `${Number(booking.offeredPrice).toFixed(2)}€`
                  : `${Number(booking.totalPrice).toFixed(2)}€`}
                {booking.offeredPrice && (
                  <span className="ml-2 text-sm font-normal text-green-600">
                    (prix proposé)
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {Number(booking.basePrice).toFixed(2)}€ + {Number(booking.pricePerKm).toFixed(2)}€/km × {booking.distanceKm}km
              </p>

              {/* Modifier le prix */}
              <form action={updateOfferedPriceAction} className="mt-4 flex gap-2">
                <input type="hidden" name="bookingId" value={booking.id} />
                <input
                  type="number"
                  name="offeredPrice"
                  step="0.01"
                  min="0"
                  defaultValue={booking.offeredPrice
                    ? Number(booking.offeredPrice).toFixed(2)
                    : Number(booking.totalPrice).toFixed(2)}
                  className="input flex-1"
                  placeholder="Prix proposé (€)"
                />
                <button type="submit" className="btn-secondary whitespace-nowrap">
                  💾 Sauver
                </button>
              </form>

              {/* Envoyer au groupe Telegram */}
              <form action={sendToGroupAction} className="mt-3">
                <input type="hidden" name="bookingId" value={booking.id} />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition"
                >
                  {booking.telegramGroupMsgId
                    ? "🔄 Renvoyer au groupe Telegram"
                    : "📤 Envoyer au groupe Telegram"}
                </button>
              </form>

              {booking.telegramGroupMsgId && (
                <p className="mt-2 text-center text-xs text-slate-400">
                  ✅ Message actif dans le groupe — sera supprimé au renvoi
                </p>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}
