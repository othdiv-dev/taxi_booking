"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface Props {
  items: NavItem[];
  email: string;
  logoutAction: () => Promise<void>;
}

export default function AdminNav({ items, email, logoutAction }: Props) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    // Exact match pour le dashboard, startsWith pour les autres
    if (href.endsWith("/admin")) {
      return pathname.endsWith("/admin");
    }
    return pathname.includes(href.split("/admin/")[1] ?? "");
  }

  return (
    <>
      {/* ── Sidebar desktop ── */}
      <aside className="hidden w-64 shrink-0 flex-col gradient-navy text-navy-foreground md:flex">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-navy-foreground/10">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-foreground/10 text-xl">
            🚖
          </span>
          <span className="font-display text-base font-bold text-navy-foreground">
            City<span className="text-aqua">Taxi</span> Admin
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 pt-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-white/15 text-white font-semibold"
                  : "text-navy-muted hover:bg-navy-foreground/10 hover:text-navy-foreground"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
              {/* Point actif à droite */}
              {isActive(item.href) && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-aqua" />
              )}
            </Link>
          ))}
        </nav>

        <div className="border-t border-navy-foreground/10 px-3 py-4">
          <p className="px-3 pb-2 text-xs text-navy-muted truncate">{email}</p>
          <form action={logoutAction}>
            <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-300 transition hover:bg-navy-foreground/10">
              <span>⏻</span> Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* ── Header mobile ── */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="font-display text-base font-bold text-slate-900">
          City<span className="text-primary">Taxi</span> Admin
        </span>
        <nav className="flex gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center rounded-lg px-2 py-1.5 transition ${
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[9px] font-semibold leading-none mt-0.5">
                {item.label.split(" ")[0]}
              </span>
              {/* Point actif en bas */}
              {isActive(item.href) && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}