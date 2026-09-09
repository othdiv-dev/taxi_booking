import { db } from "@/db";
import { zones } from "@/db/schema";
import { desc } from "drizzle-orm";
import { createZoneAction, deleteZoneAction, updateZoneAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function AdminZonesPage() {
  const allZones = await db.select().from(zones).orderBy(desc(zones.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Zones</h1>
        <p className="text-sm text-slate-500">Gérez les pages SEO par zone (aéroports, villes...).</p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Ajouter une zone</h2>
        <form action={createZoneAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input name="name" placeholder="Nom (ex: Aéroport Schiphol)" required className="input" />
          <input name="slug" placeholder="Slug (ex: schiphol)" required className="input" />
          <input name="headline" placeholder="Titre accrocheur" className="input md:col-span-2" />
          <input name="metaTitle" placeholder="Meta title SEO" className="input md:col-span-2" />
          <textarea name="metaDescription" placeholder="Meta description SEO" className="input md:col-span-2" rows={2} />
          <textarea name="description" placeholder="Description affichée sur la page" className="input md:col-span-2" rows={3} />
          <button type="submit" className="btn-primary md:col-span-2">
            Ajouter la zone
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Lien public</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allZones.map((zone) => (
              <tr key={zone.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{zone.name}</td>
                <td className="px-4 py-3 text-slate-500">{zone.slug}</td>
                <td className="px-4 py-3">
                  <form action={updateZoneAction}>
                    <input type="hidden" name="id" value={zone.id} />
                    <input type="hidden" name="name" value={zone.name} />
                    <input type="hidden" name="slug" value={zone.slug} />
                    <input type="hidden" name="metaTitle" value={zone.metaTitle ?? ""} />
                    <input type="hidden" name="metaDescription" value={zone.metaDescription ?? ""} />
                    <input type="hidden" name="headline" value={zone.headline ?? ""} />
                    <input type="hidden" name="description" value={zone.description ?? ""} />
                    <button
                      type="submit"
                      name="isActive"
                      value={zone.isActive ? "" : "on"}
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        zone.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {zone.isActive ? "Active" : "Inactive"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <a href={`/${zone.slug}`} target="_blank" className="text-blue-600 hover:underline">
                    /{zone.slug}
                  </a>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteZoneAction} className="inline">
                    <input type="hidden" name="id" value={zone.id} />
                    <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                      Supprimer
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {allZones.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Aucune zone pour le moment.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
