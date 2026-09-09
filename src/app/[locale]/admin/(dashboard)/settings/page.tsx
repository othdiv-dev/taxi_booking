import { db } from "@/db";
import DeleteAdminButton from "./DeleteAdminButton";
import { admins } from "@/db/schema";
import { getAdminSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import ChangePasswordForm from "./ChangePasswordForm";
import CreateAdminForm from "./CreateAdminForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await getAdminSession();
  if (!session) notFound();

  const allAdmins = await db.select({
    id: admins.id,
    name: admins.name,
    email: admins.email,
    createdAt: admins.createdAt,
  }).from(admins);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-sm text-slate-500">Gestion des administrateurs et sécurité.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChangePasswordForm />
        <CreateAdminForm />
      </div>

      {/* Liste des admins */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">
          👥 Administrateurs ({allAdmins.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Créé le</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allAdmins.map((admin) => {
                const isSelf = admin.email === session.email;
                const isLast = allAdmins.length === 1;
                return (
                  <tr key={admin.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {admin.name}
                      {isSelf && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                          MOI
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{admin.email}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(admin.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && !isLast ? (
                          <DeleteAdminButton id={admin.id} name={admin.name} />
                      ) : (
                        <span className="text-xs text-slate-300">
                          {isSelf ? "— compte actif" : "— dernier admin"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}