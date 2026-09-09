"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";

const FLAGS: Record<string, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  nl: "🇳🇱",
};

const LABELS: Record<string, string> = {
  fr: "Français",
  en: "English",
  nl: "Nederlands",
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <>
      {/* Mobile — drapeau actif + dropdown */}
      <div ref={ref} className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Changer de langue"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-base transition hover:bg-muted"
        >
          {FLAGS[locale]}
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-background shadow-lift">
            {routing.locales.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => { router.replace(pathname, { locale: l }); setOpen(false); }}
                aria-label={LABELS[l]}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition hover:bg-muted ${
                  locale === l ? "bg-primary/10 font-semibold text-primary" : "text-foreground"
                }`}
              >
                <span className="text-base">{FLAGS[l]}</span>
                <span>{LABELS[l]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop — pill complète */}
      <div className="hidden sm:flex items-center gap-1 rounded-full border border-border p-1">
        {routing.locales.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => router.replace(pathname, { locale: l })}
            aria-label={LABELS[l]}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm transition ${
              locale === l
                ? "bg-primary/10 ring-2 ring-primary/40"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            {FLAGS[l]}
          </button>
        ))}
      </div>
    </>
  );
}
