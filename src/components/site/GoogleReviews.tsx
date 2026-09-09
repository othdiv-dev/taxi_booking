import { useTranslations } from "next-intl";

function Stars({ count, className = "h-4 w-4", label }: { count: number; className?: string; label: string }) {
  return (
    <div className="flex gap-0.5" aria-label={label}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className={`${className} text-primary`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function GoogleLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function GoogleReviews() {
  const t = useTranslations("googleReviews");
  const reviews = t.raw("reviews") as {
    name: string;
    count: string;
    text: string;
  }[];

  return (
    <section id="avis" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-eyebrow text-primary">{t("eyebrow")}</p>
          <h2 className="mt-3 max-w-md text-3xl font-bold text-foreground sm:text-4xl">
            {t("title")}
          </h2>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-card">
          <GoogleLogo className="h-7 w-7" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-extrabold text-foreground">4,9</span>
              <Stars count={5} className="h-4 w-4" label={t("starsLabel", { count: 5 })} />
            </div>
            <p className="text-xs text-muted-foreground">{t("googleVerified")}</p>
          </div>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <figure
            key={r.name}
            className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-lift"
          >
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy font-display text-sm font-bold text-navy-foreground">
                  {r.name.charAt(0)}
                </span>
                <div>
                  <figcaption className="text-sm font-semibold text-foreground">{r.name}</figcaption>
                  <p className="text-xs text-muted-foreground">{r.count}</p>
                </div>
              </div>
              <Stars count={5} label={t("starsLabel", { count: 5 })} />
              <blockquote className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {r.text}
              </blockquote>
            </div>
            <div className="mt-5 flex justify-end">
              <GoogleLogo />
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}