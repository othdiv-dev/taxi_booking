import { Star, LockKeyhole, Clock3, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

export default function TrustBar() {
  const t = useTranslations("trustBar");

  const ITEMS = [
    { icon: Star, label: t("rating") },
    { icon: LockKeyhole, label: t("payment") },
    { icon: Clock3, label: t("availability") },
    { icon: ShieldCheck, label: t("verified") },
  ];

  return (
    <div className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-5 px-4 py-7 sm:grid-cols-4 sm:px-6">
        {ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-3 text-sm font-medium text-foreground">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
              <item.icon className="h-4.5 w-4.5" strokeWidth={2.1} />
            </span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}