"use client";

import { useState } from "react";
import { Phone, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Wordmark } from "./Logo";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("header");

  const LINKS = [
    { href: "#comment-ca-marche", label: t("nav.howItWorks") },
    { href: "#tarifs", label: t("nav.pricing") },
    { href: "#avis", label: t("nav.reviews") },
    { href: "#faq", label: t("nav.faq") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <a href="#top" className="shrink-0">
          <Wordmark />
        </a>

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground lg:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative transition-colors hover:text-foreground after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-primary after:transition-all hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <a
            href="tel:+31200000000"
            className="hidden items-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:flex"
          >
            <Phone className="h-4 w-4 text-primary" strokeWidth={2.2} />
            +31 20 000 00 00
          </a>
          <a
            href="#reserver"
            className="rounded-full gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition-all hover:-translate-y-0.5 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            {t("cta")}
          </a>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-foreground lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label={t("menuLabel")}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {link.label}
              </a>
            ))}
            <a
              href="tel:+31200000000"
              className="mt-2 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-foreground"
            >
              <Phone className="h-4 w-4 text-primary" strokeWidth={2.2} />
              +31 20 000 00 00
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}