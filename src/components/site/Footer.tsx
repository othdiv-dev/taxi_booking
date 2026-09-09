import { Clock3, Mail, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Wordmark } from "./Logo";

type Zone = { slug: string; name: string };

export default async function Footer({ zones = [] }: { zones?: Zone[] }) {
  const t = await getTranslations("footer");

  const defaultZones = t.raw("defaultZones") as Zone[];

  const displayZones = zones.length > 0
    ? zones.slice(0, 5)
    : defaultZones;

  return (
    <footer className="gradient-navy text-navy-foreground">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">

          {/* Col 1 — Brand */}
          <div>
            <Wordmark inverted />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-muted">
              {t("description")}
            </p>
            <div className="mt-6 flex gap-3">
              <span className="rounded-full border border-navy-foreground/15 bg-navy-foreground/5 px-3 py-1 text-xs font-medium text-navy-muted">
                {t("rating")}
              </span>
              <span className="rounded-full border border-navy-foreground/15 bg-navy-foreground/5 px-3 py-1 text-xs font-medium text-navy-muted">
                {t("securePayment")}
              </span>
            </div>
          </div>

          {/* Col 2 — Zones */}
          <div>
            <p className="mb-4 text-eyebrow text-aqua">{t("zonesTitle")}</p>
            <ul className="space-y-2 text-sm text-navy-muted">
              {displayZones.map((z) => (
                <li key={z.slug}>
                  <a href="#reserver" className="transition-colors hover:text-navy-foreground">
                    {t("taxiPrefix")} {z.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Contact */}
          <div>
            <p className="mb-4 text-eyebrow text-aqua">{t("contactTitle")}</p>
            <ul className="space-y-3 text-sm text-navy-muted">
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-aqua" strokeWidth={2.1} />
                <a href="tel:+31200000000" className="hover:text-navy-foreground">
                  +31 20 000 00 00
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-aqua" strokeWidth={2.1} />
                <a href="mailto:contact@citytaxi.nl" className="hover:text-navy-foreground">
                  contact@citytaxi.nl
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock3 className="h-4 w-4 text-aqua" strokeWidth={2.1} />
                {t("availability")}
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-navy-foreground/10 pt-6 sm:flex-row">
          <p className="text-xs text-navy-muted">
            © {new Date().getFullYear()} CityTaxi. {t("rights")}
          </p>
          <div className="flex gap-4 text-xs text-navy-muted">
            <a href="#" className="hover:text-navy-foreground">{t("legal")}</a>
            <a href="#" className="hover:text-navy-foreground">{t("terms")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}