"use client";
import { Check, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  BASE_PRICE,
  PRICE_PER_KM,
  VEHICLE_MULTIPLIERS,
  type VehicleType,
} from "@/lib/pricing";
import { useVehicleLabels, useVehicleDescriptions } from "@/lib/vehicle-i18n";


const IMAGES: Record<VehicleType, string> = {
  sedan: "/assets/vehicle-sedan.jpg",
  van: "/assets/vehicle-van.jpg",
  luxury: "/assets/vehicle-luxury.jpg",
};

export default function PricingSection() {
  const t = useTranslations("pricingSection");
  const VEHICLE_LABELS = useVehicleLabels();
  const VEHICLE_DESCRIPTIONS = useVehicleDescriptions();
  const PERKS: Record<VehicleType, string[]> = {
    sedan: t.raw("perks.sedan"),
    van: t.raw("perks.van"),
    luxury: t.raw("perks.luxury"),
  };

  return (
    <section id="tarifs" className="scroll-mt-20 bg-surface py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-eyebrow text-primary">{t("eyebrow")}</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-lg text-3xl font-bold text-foreground sm:text-4xl">
            {t("title")}
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {t("subtitle", { base: BASE_PRICE.toFixed(2), perKm: PRICE_PER_KM.toFixed(2) })}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {(Object.keys(VEHICLE_LABELS) as VehicleType[]).map((v) => (
            <article
              key={v}
              className="group overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-shadow hover:shadow-lift"
            >
              <div className="aspect-[3/2] overflow-hidden bg-muted">
                <img
                  src={IMAGES[v]}
                  alt={t("vehicleAlt", { name: VEHICLE_LABELS[v] })}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold text-foreground">{VEHICLE_LABELS[v]}</h3>
                  <span className="text-xs font-medium text-muted-foreground">
                    {VEHICLE_DESCRIPTIONS[v]}
                  </span>
                </div>
                <p className="mt-4 font-display text-2xl font-extrabold text-foreground">
                  {BASE_PRICE.toFixed(2)}€
                  <span className="text-base font-semibold text-muted-foreground">
                    {" "}+ {(PRICE_PER_KM * VEHICLE_MULTIPLIERS[v]).toFixed(2)}€/km
                  </span>
                </p>
                <ul className="mt-5 space-y-2.5 border-t border-border pt-5">
                  {PERKS[v].map((perk) => (
                    <li key={perk} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.4} />
                      {perk}
                    </li>
                  ))}
                </ul>
                <a
                  href="#reserver"
                  className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-navy py-3 text-sm font-semibold text-navy-foreground transition-colors hover:bg-navy-soft"
                >
                  {t("bookButton", { name: VEHICLE_LABELS[v].toLowerCase() })}
                  <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}