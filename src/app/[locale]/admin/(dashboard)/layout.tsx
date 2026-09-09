import type { ReactNode } from "react";
import { getAdminSession, renewSessionIfNeeded } from "@/lib/auth";
import { logoutAction } from "../actions";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  const locale = await getLocale();
  if (!session) redirect(`/${locale}/admin/login`);

  await renewSessionIfNeeded();

  const NAV_ITEMS = [
    { href: `/${locale}/admin`,          label: "Tableau de bord", icon: "📊" },
    { href: `/${locale}/admin/bookings`, label: "Réservations",    icon: "🚕" },
    { href: `/${locale}/admin/drivers`,  label: "Chauffeurs",      icon: "🧑‍✈️" },
    { href: `/${locale}/admin/zones`,    label: "Zones",           icon: "📍" },
    { href: `/${locale}/admin/settings`,   label: "Paramètres",      icon: "⚙️" },
    { href: `/${locale}/admin/audit-logs`, label: "Journal",         icon: "📋" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">

        <AdminNav
          items={NAV_ITEMS}
          email={session.email}
          logoutAction={logoutAction}
        />

        {/* Contenu principal */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>

      </div>
    </div>
  );
}