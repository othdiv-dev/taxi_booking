import { MapPin, CreditCard, CarTaxiFront, CircleCheckBig } from "lucide-react";
import { useTranslations } from "next-intl";

export default function HowItWorks() {
  const t = useTranslations("howItWorks");

  const STEPS = [
    { icon: MapPin, title: t("steps.route.title"), text: t("steps.route.text") },
    { icon: CreditCard, title: t("steps.pay.title"), text: t("steps.pay.text") },
    { icon: CarTaxiFront, title: t("steps.accept.title"), text: t("steps.accept.text") },
    { icon: CircleCheckBig, title: t("steps.enjoy.title"), text: t("steps.enjoy.text") },
  ];

  return (
    <section id="comment-ca-marche" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <p className="text-eyebrow text-primary">{t("eyebrow")}</p>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="max-w-md text-3xl font-bold text-foreground sm:text-4xl">
          {t("title")}
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <ol className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="bg-card p-7">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-primary">
                <step.icon className="h-5 w-5" strokeWidth={2.1} />
              </span>
              <span className="font-display text-3xl font-extrabold text-border">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="mt-5 text-base font-semibold text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}