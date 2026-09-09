import { db } from "@/db";
import { drivers } from "@/db/schema";
import { desc } from "drizzle-orm";
import { createDriverAction, updateDriverAction } from "../../actions";
import Link from "next/link";
import DeleteDriverButton from "@/components/admin/DeleteDriverButton";

export const dynamic = "force-dynamic";

const VEHICLE_LABELS: Record<string, string> = { sedan: "Berline", van: "Van", luxury: "Luxe" };
const CYCLE_LABELS: Record<string, string> = { daily: "Dagelijks", weekly: "Wekelijks", monthly: "Maandelijks" };

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${ok ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
      {ok ? "✅" : "⏳"} {label}
    </span>
  );
}

function DocRow({ icon, label, fileId, expiry }: { icon: string; label: string; fileId: string | null; expiry: Date | string | null }) {
  const expiryStr = expiry ? new Date(expiry).toLocaleDateString("nl-NL") : null;
  return (
    <div className="flex justify-between items-center">
      <span>{icon} {label}</span>
      <span>
        {fileId ? (
          <a href={fileId} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">
            ✅ {expiryStr ? `tot ${expiryStr}` : "Bekijken"}
          </a>
        ) : (
          <span className="text-red-400">❌ Ontbreekt</span>
        )}
      </span>
    </div>
  );
}

export default async function AdminDriversPage() {
  const allDrivers = await db.select().from(drivers).orderBy(desc(drivers.createdAt));
  const pending = allDrivers.filter(d => !d.isVerified);
  const verified = allDrivers.filter(d => d.isVerified);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chauffeurs</h1>
          <p className="text-sm text-slate-500">Registraties beheren</p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-700">{pending.length} in afwachting</span>
          <span className="rounded-full bg-green-100 px-3 py-1 font-semibold text-green-700">{verified.length} geverifieerd</span>
        </div>
      </div>

      {/* ── CHAUFFEURS EN ATTENTE ── */}
      {pending.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-orange-700 uppercase tracking-widest flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">{pending.length}</span>
            Wacht op verificatie
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {pending.map((d) => (
              <div key={d.id} className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-900 text-lg">{d.firstName} {d.lastName}</p>
                    <p className="text-xs text-slate-500">{d.email || "—"} · {d.phone || "—"}</p>
                    {d.telegramUsername && <p className="text-xs text-blue-600">@{d.telegramUsername}</p>}
                    {d.telegramChatId && <p className="text-xs text-slate-400">Telegram ID: {d.telegramChatId}</p>}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge ok={false} label="EN ATTENTE" />
                    <Link href={`/admin/drivers/${d.id}`} className="text-xs text-blue-600 hover:underline">
                      📋 Détails →
                    </Link>
                  </div>
                </div>

                {/* Infos en grille */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white p-2">
                    <p className="text-slate-400 uppercase tracking-wide mb-0.5">P-nummer</p>
                    <p className="font-semibold text-slate-800">{d.pNumber || "—"}</p>
                  </div>
                  <div className="rounded-lg bg-white p-2">
                    <p className="text-slate-400 uppercase tracking-wide mb-0.5">Kenteken</p>
                    <p className="font-semibold text-slate-800 font-mono">{d.licensePlate || "—"}</p>
                  </div>
                  <div className="rounded-lg bg-white p-2">
                    <p className="text-slate-400 uppercase tracking-wide mb-0.5">Voertuig</p>
                    <p className="font-semibold text-slate-800">{d.carBrand} {d.carModel} · {VEHICLE_LABELS[d.vehicleType]} {d.carYear ? `(${d.carYear})` : ""}</p>
                  </div>
                  <div className="rounded-lg bg-white p-2">
                    <p className="text-slate-400 uppercase tracking-wide mb-0.5">KVK</p>
                    <p className="font-semibold text-slate-800">{d.kvkNumber || "—"}</p>
                  </div>
                  <div className="rounded-lg bg-white p-2">
                    <p className="text-slate-400 uppercase tracking-wide mb-0.5">IBAN</p>
                    <p className="font-semibold text-slate-800 font-mono text-[11px]">{d.iban || "—"}</p>
                  </div>
                  <div className="rounded-lg bg-white p-2">
                    <p className="text-slate-400 uppercase tracking-wide mb-0.5">Betaalcyclus</p>
                    <p className="font-semibold text-slate-800">{d.paymentCycle ? CYCLE_LABELS[d.paymentCycle] : "—"}</p>
                  </div>
                </div>

                {/* Documents — sans doublons */}
                <div className="rounded-lg bg-white p-3 text-xs space-y-2">
                  <p className="text-slate-400 uppercase tracking-wide font-semibold mb-2">Documenten</p>
                  <DocRow icon="🛡️" label="Verzekering" fileId={d.insuranceFileId ?? null} expiry={d.insuranceExpiry ?? null} />
                  <DocRow icon="🪪" label="Rijbewijs" fileId={d.driversLicenseFileId ?? null} expiry={d.driversLicenseExpiry ?? null} />
                  <DocRow icon="🚖" label="Taxipas" fileId={d.taxiCardFileId ?? null} expiry={d.taxiCardExpiry ?? null} />
                  <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-1">
                    <span>📋 Voorwaarden</span>
                    <span className={d.termsAccepted ? "text-green-600 font-semibold" : "text-red-400"}>
                      {d.termsAccepted
                        ? `✅ Akkoord ${d.termsAcceptedAt ? new Date(d.termsAcceptedAt).toLocaleDateString("nl-NL") : ""}`
                        : "❌ Niet akkoord"}
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  <form action={updateDriverAction} className="flex-1">
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="firstName" value={d.firstName} />
                    <input type="hidden" name="lastName" value={d.lastName ?? ""} />
                    <input type="hidden" name="phone" value={d.phone} />
                    <input type="hidden" name="telegramUsername" value={d.telegramUsername ?? ""} />
                    <input type="hidden" name="vehicleType" value={d.vehicleType} />
                    <input type="hidden" name="isActive" value="on" />
                    <button type="submit" className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition">
                      ✅ Valideren & Activeren
                    </button>
                  </form>
                <DeleteDriverButton id={d.id} name={`${d.firstName} ${d.lastName}`} variant="card" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AJOUTER MANUELLEMENT ── */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Handmatig toevoegen</h2>
        <form action={createDriverAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input name="firstName" placeholder="Voornaam *" required className="input" />
          <input name="lastName" placeholder="Achternaam" className="input" />
          <input name="phone" placeholder="Telefoon *" required className="input" />
          <input name="telegramUsername" placeholder="Telegram (@...)" className="input" />
          <select name="vehicleType" className="input">
            <option value="sedan">Berline</option>
            <option value="van">Van</option>
            <option value="luxury">Luxe</option>
          </select>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <label className="flex items-center gap-2"><input type="checkbox" name="isVerified" /> Geverifieerd</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked /> Actief</label>
          </div>
          <button type="submit" className="btn-primary md:col-span-2">Toevoegen</button>
        </form>
      </div>

      {/* ── TABLE CHAUFFEURS VALIDÉS ── */}
      <div>
        <h2 className="mb-3 text-sm font-bold text-slate-700 uppercase tracking-widest">
          Geverifieerde chauffeurs ({verified.length})
        </h2>
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Voertuig</th>
                <th className="px-4 py-3">Kenteken</th>
                <th className="px-4 py-3">IBAN</th>
                <th className="px-4 py-3">Docs</th>
                <th className="px-4 py-3">Ritten</th>
                <th className="px-4 py-3 text-right">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {verified.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/drivers/${d.id}`} className="font-semibold text-slate-900 hover:text-blue-600">
                      {d.firstName} {d.lastName}
                    </Link>
                    {d.companyName && <p className="text-xs text-slate-400">{d.companyName}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <p>{d.phone || "—"}</p>
                    <p>{d.email || "—"}</p>
                    {d.telegramUsername && <p className="text-blue-500">@{d.telegramUsername}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <p>{d.carBrand} {d.carModel} · {VEHICLE_LABELS[d.vehicleType]}</p>
                    {d.carYear && <p>{d.carYear}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.licensePlate || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.iban ? `${d.iban.slice(0, 8)}...` : "—"}</td>
                  <td className="px-4 py-3 text-xs space-y-0.5">
                    <p>
                      {d.insuranceFileId
                        ? <a href={d.insuranceFileId} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">🛡️✅</a>
                        : "🛡️❌"
                      } {d.insuranceExpiry ? new Date(d.insuranceExpiry).toLocaleDateString("nl-NL") : ""}
                    </p>
                    <p>
                      {d.driversLicenseFileId
                        ? <a href={d.driversLicenseFileId} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">🪪✅</a>
                        : "🪪❌"
                      } {d.driversLicenseExpiry ? new Date(d.driversLicenseExpiry).toLocaleDateString("nl-NL") : ""}
                    </p>
                    <p>
                      {d.taxiCardFileId
                        ? <a href={d.taxiCardFileId} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">🚖✅</a>
                        : "🚖❌"
                      } {d.taxiCardExpiry ? new Date(d.taxiCardExpiry).toLocaleDateString("nl-NL") : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{d.totalTrips}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link href={`/admin/drivers/${d.id}`} className="text-xs text-blue-600 hover:underline">
                      Détails
                    </Link>
                    <form action={updateDriverAction} className="inline">
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="firstName" value={d.firstName} />
                      <input type="hidden" name="lastName" value={d.lastName ?? ""} />
                      <input type="hidden" name="phone" value={d.phone} />
                      <input type="hidden" name="telegramUsername" value={d.telegramUsername ?? ""} />
                      <input type="hidden" name="vehicleType" value={d.vehicleType} />
                      <input type="hidden" name="isVerified" value="on" />
                      <button type="submit" name="isActive" value={d.isActive ? "" : "on"}
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${d.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {d.isActive ? "Actief" : "Inactief"}
                      </button>
                    </form>
                        <DeleteDriverButton id={d.id} name={`${d.firstName} ${d.lastName}`} variant="table" />
                  </td>
                </tr>
              ))}
              {verified.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">Geen geverifieerde chauffeurs.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
