import { Clock3, MapPin, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import BookingForm from "@/components/BookingForm";
import { BASE_PRICE, PRICE_PER_KM } from "@/lib/pricing";

const ICONS = [MapPin, Clock3, Sparkles];

export default async function Hero() {
  const t = await getTranslations("hero");

  const POINTS = [
    { icon: ICONS[0], label: t("points.pickup") },
    { icon: ICONS[1], label: t("points.confirm") },
    { icon: ICONS[2], label: t("points.vehicle") },
  ];

  const STATS = [
    { v: t("stats.ratingValue"), l: t("stats.ratingLabel") },
    { v: t("stats.hoursValue"), l: t("stats.hoursLabel") },
    { v: t("stats.ridesValue"), l: t("stats.ridesLabel") },
  ];

  return (
    <section id="top" className="relative overflow-hidden gradient-navy">
      <img
        src="/assets/hero-taxi.jpg"
        alt={t("imgAlt")}
        width={1408}
        height={1600}
        className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-luminosity"
      />
      <div className="absolute inset-0 bg-navy/70" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_minmax(0,22rem)] md:gap-10 md:py-16 lg:grid-cols-[1.05fr_minmax(0,26rem)] lg:gap-16 lg:py-24">
        <div className="reveal">
          <span className="inline-flex items-center gap-2 rounded-full border border-navy-foreground/15 bg-navy-foreground/5 px-3.5 py-1.5 text-eyebrow text-aqua">
            {t("badge")}
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] text-navy-foreground sm:text-5xl md:text-4xl lg:text-6xl">
            {t("title")}
            <br />
            <span className="text-aqua">{t("titleAccent")}</span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-navy-muted">
            {t("subtitle", {
              base: BASE_PRICE.toFixed(2),
              perKm: PRICE_PER_KM.toFixed(2),
            })}
          </p>

          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p.label} className="flex items-center gap-3 text-sm text-navy-foreground">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-navy-foreground/10 text-aqua">
                  <p.icon className="h-4 w-4" strokeWidth={2.2} />
                </span>
                {p.label}
              </li>
            ))}
          </ul>

          <dl className="mt-8 flex flex-wrap gap-x-6 gap-y-4 border-t border-navy-foreground/10 pt-5 md:mt-6 lg:mt-10 lg:gap-x-10 lg:gap-y-5 lg:pt-6">
            {STATS.map((s) => (
              <div key={s.l}>
                <dt className="font-display text-2xl font-extrabold text-navy-foreground">{s.v}</dt>
                <dd className="text-xs text-navy-muted">{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div id="reserver" className="reveal scroll-mt-24">
          <BookingForm />
        </div>
      </div>
    </section>
  );
}