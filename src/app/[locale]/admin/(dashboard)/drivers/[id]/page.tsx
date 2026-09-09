import { db } from "@/db";
import { drivers, bookings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { updateDriverAction } from "../../../actions";
import DeleteDriverButton from "@/components/admin/DeleteDriverButton";
import DocCard from "./DocCard";

export const dynamic = "force-dynamic";

const VEHICLE_LABELS: Record<string, string> = { sedan: "Berline", van: "Van", luxury: "Luxe" };
const CYCLE_LABELS: Record<string, string> = { daily: "Quotidien", weekly: "Hebdomadaire", monthly: "Mensuel" };

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-slate-100 last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value || <span className="text-slate-300">—</span>}</span>
    </div>
  );
}



export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const driverId = Number(id);
  if (isNaN(driverId)) notFound();

  const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId));
  if (!driver) notFound();

  // Récupérer les courses du chauffeur
  const driverBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.driverId, driverId))
    .orderBy(desc(bookings.createdAt))
    .limit(10);

  const STATUS_LABELS: Record<string, string> = {
    pending: "En attente", paid: "Payée", sent_to_drivers: "Envoyée",
    accepted: "Acceptée", driver_on_way: "En route",
    passenger_picked: "Pris en charge", completed: "Terminée", cancelled: "Annulée",
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/admin/drivers" className="hover:text-slate-900">← Chauffeurs</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{driver.firstName} {driver.lastName}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{driver.firstName} {driver.lastName}</h1>
          <div className="flex items-center gap-2 mt-1">
            {driver.isVerified
              ? <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✅ Vérifié</span>
              : <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">⏳ En attente</span>
            }
            {driver.isActive
              ? <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🟢 Actif</span>
              : <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">⚫ Inactif</span>
            }
            <span className="text-xs text-slate-400">ID #{driver.id}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {!driver.isVerified && (
            <form action={updateDriverAction}>
              <input type="hidden" name="id" value={driver.id} />
              <input type="hidden" name="firstName" value={driver.firstName} />
              <input type="hidden" name="lastName" value={driver.lastName ?? ""} />
              <input type="hidden" name="phone" value={driver.phone} />
              <input type="hidden" name="telegramUsername" value={driver.telegramUsername ?? ""} />
              <input type="hidden" name="vehicleType" value={driver.vehicleType} />
              <input type="hidden" name="isVerified" value="on" />
              <input type="hidden" name="isActive" value="on" />
              <button type="submit" className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 transition">
                ✅ Valider & Activer
              </button>
            </form>
          )}
        <DeleteDriverButton
          id={driver.id}
          name={`${driver.firstName} ${driver.lastName}`}
        />

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Colonne gauche : infos ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Informations personnelles */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">👤 Informations personnelles</h2>
            <div className="grid grid-cols-2 gap-x-6">
              <InfoRow label="Prénom" value={driver.firstName} />
              <InfoRow label="Nom" value={driver.lastName} />
              <InfoRow label="Email" value={driver.email} />
              <InfoRow label="Téléphone" value={driver.phone} />
              <InfoRow label="N° P (carte chauffeur)" value={driver.pNumber} />
              <InfoRow label="Plaque d'immatriculation" value={driver.licensePlate} />
              <InfoRow label="Telegram username" value={driver.telegramUsername ? `@${driver.telegramUsername}` : null} />
              <InfoRow label="Telegram ID" value={driver.telegramChatId} />
            </div>
          </div>

          {/* Informations entreprise */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">🏢 Entreprise</h2>
            <div className="grid grid-cols-2 gap-x-6">
              <InfoRow label="Nom entreprise" value={driver.companyName} />
              <InfoRow label="N° KVK" value={driver.kvkNumber} />
              <InfoRow label="N° TVA" value={driver.btwNumber} />
              <InfoRow label="Adresse" value={driver.address} />
              <InfoRow label="Code postal" value={driver.postcode} />
              <InfoRow label="Ville" value={driver.city} />
            </div>
          </div>

          {/* Véhicule */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">🚗 Véhicule</h2>
            <div className="grid grid-cols-2 gap-x-6">
            <InfoRow label="Marque" value={driver.carBrand} />
            <InfoRow label="Modèle" value={driver.carModel} />
            <InfoRow label="Année" value={driver.carYear} />
              <InfoRow label="Type" value={VEHICLE_LABELS[driver.vehicleType]} />
              <InfoRow label="Plaque" value={driver.licensePlate} />
            </div>
          </div>

          {/* Paiement */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">💶 Paiement</h2>
            <div className="grid grid-cols-2 gap-x-6">
              <InfoRow label="IBAN" value={driver.iban} />
              <InfoRow label="Titulaire" value={driver.accountHolder} />
              <InfoRow label="Cycle de paiement" value={driver.paymentCycle ? CYCLE_LABELS[driver.paymentCycle] : null} />
              <InfoRow label="Commission" value={driver.commissionRate ? `${driver.commissionRate}%` : null} />
            </div>
          </div>

          {/* Dernières courses */}
          {driverBookings.length > 0 && (
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">🚖 Dernières courses ({driver.totalTrips} total)</h2>
              <div className="space-y-2">
                {driverBookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <div>
                      <span className="font-mono font-semibold text-slate-700">{b.reference}</span>
                      <span className="ml-2 text-slate-500">{b.pickupAddress} → {b.dropoffAddress}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{Number(b.totalPrice).toFixed(2)}€</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600">{STATUS_LABELS[b.status] || b.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Colonne droite : documents + stats ── */}
        <div className="space-y-6">

          {/* Stats */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">📊 Statistiques</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-2xl font-black text-slate-900">{driver.totalTrips}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Courses</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-2xl font-black text-slate-900">{Number(driver.rating).toFixed(1)}⭐</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Note</p>
              </div>
            </div>
            <InfoRow label="Inscrit le" value={new Date(driver.createdAt).toLocaleDateString("fr-FR")} />
            <InfoRow label="Conditions acceptées" value={
              driver.termsAccepted
                ? `✅ ${driver.termsAcceptedAt ? new Date(driver.termsAcceptedAt).toLocaleDateString("fr-FR") : ""}`
                : "❌ Non"
            } />
          </div>

          {/* Documents */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">📄 Documents</h2>
            <DocCard
              icon="🛡️"
              label="Assurance"
              driverId={driver.id}
              field="insurance"
              hasDoc={!!driver.insuranceFileId}
              expiry={driver.insuranceExpiry ?? null}
            />
            <DocCard
              icon="🪪"
              label="Permis de conduire"
              driverId={driver.id}
              field="driversLicense"
              hasDoc={!!driver.driversLicenseFileId}
              expiry={driver.driversLicenseExpiry ?? null}
            />
            <DocCard
              icon="🚖"
              label="Carte taxi"
              driverId={driver.id}
              field="taxiCard"
              hasDoc={!!driver.taxiCardFileId}
              expiry={driver.taxiCardExpiry ?? null}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
