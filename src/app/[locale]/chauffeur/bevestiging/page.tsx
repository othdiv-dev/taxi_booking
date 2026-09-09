import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function BevestigingPage() {
  const t = await getTranslations("chauffeurConfirmation");

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="rounded-3xl bg-white p-10 shadow-sm ring-1 ring-slate-200">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">{t("title")}</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            {t("thanksLine1")}
            <br />
            {t("reviewLine")}
            <br />
            {t("notifyLine")}
          </p>
          <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            {t("checkEmail")}
          </div>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            {t("backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}