"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import LanguageSwitcher from "@/components/site/LanguageSwitcher";
import { Wordmark } from "@/components/site/Logo";
import { Check, ChevronRight, ChevronLeft, Upload } from "lucide-react";
import { BrandSelect } from "@/components/ui/BrandSelect";

type Lang = "nl" | "en" | "fr";

const T = {
  nl: {
  title: "Chauffeur worden",
  badge: "CityTaxi Chauffeur",
  subtitle: "Registreer u als chauffeur bij CityTaxi",
  step: (n: number, t: number) => `Stap ${n} van ${t}`,
  next: "Volgende", prev: "Terug", submit: "Aanmelding versturen", submitting: "Bezig...",
  uploadStages: { preparing: "Documenten voorbereiden…", uploading: "Documenten uploaden…", processing: "Aanmelding verwerken…", done: "Gelukt! U wordt doorgestuurd…" },
  uploadWarning: "Sluit deze pagina niet — de upload is bezig.",
  uploadDocs: ["Verzekeringsbewijs", "Rijbewijs", "Taxipas"],
  sections: { personal: "Persoonlijke gegevens", company: "Bedrijfsgegevens", vehicle: "Voertuiggegevens", payment: "Betaalgegevens", documents: "Documenten", terms: "Voorwaarden" },
  invalidEmail: "Ongeldig e-mailadres",
  invalidPostcode: "Ongeldige postcode (bijv. 1234AA)",
  validYear: "Geldig bouwjaar (bijv. 2020)",
  genericError: "Er is een fout opgetreden.",
  networkError: "Kan geen verbinding maken met de server.",
  secureFooter: "🔒 Uw gegevens zijn beveiligd en worden niet gedeeld met derden.",
  fields: {
    firstName: "Voornaam", lastName: "Achternaam", email: "E-mailadres",
    phone: "Telefoonnummer", pNumber: "P-nummer (chauffeurskaart)",
    licensePlate: "Kenteken", companyName: "Bedrijfsnaam",
    kvkNumber: "KVK-nummer", btwNumber: "BTW-nummer",
    address: "Adres", postcode: "Postcode", city: "Stad",
    iban: "IBAN", accountHolder: "Rekeninghouder",
    paymentCycle: "Betaalcyclus", carBrand: "Automerk",
    carModel: "Model", carYear: "Bouwjaar", vehicleType: "Type voertuig",
    insurance: "Verzekeringsbewijs", insuranceExpiry: "Vervaldatum verzekering",
    driversLicense: "Rijbewijs", driversLicenseExpiry: "Vervaldatum rijbewijs",
    taxiCard: "Taxipas / Chauffeurskaart", taxiCardExpiry: "Vervaldatum taxipas",
  },
  vehicleTypes: { sedan: "Berline (1-4 passagiers)", van: "Van (1-7 passagiers)", luxury: "Luxe (1-3 passagiers)" },
  paymentCycles: { daily: "Dagelijks", weekly: "Wekelijks", monthly: "Maandelijks" },
  termsText: "Door u aan te melden gaat u akkoord met onze chauffeurvoorwaarden:\n• Controleer dagelijks geclaimde ritten\n• Wees altijd op tijd bij de pick-up locatie\n• Bel de passagier 10 min voor aankomst\n• Gedraag u professioneel en beleefd\n• De prijs op de website is uw chauffeursprijs (incl. 9% btw)\n• Betaling binnen 24 uur na ritbevestiging",
  termsAccept: "Ik ga akkoord met de voorwaarden",
  uploadHint: "Klik of sleep een bestand hiernaartoe (PDF, JPG, PNG)",
  required: "Verplicht veld",
  telegramLinked: "Gekoppeld via Telegram",
},
  en: {
  title: "Become a driver",
  badge: "CityTaxi Driver",
  subtitle: "Register as a driver at CityTaxi",
  step: (n: number, t: number) => `Step ${n} of ${t}`,
  next: "Next", prev: "Back", submit: "Submit application", submitting: "Submitting...",
  uploadStages: { preparing: "Preparing documents…", uploading: "Uploading documents…", processing: "Processing application…", done: "Done! Redirecting you…" },
  uploadWarning: "Do not close this page — upload in progress.",
  uploadDocs: ["Insurance certificate", "Driver's license", "Taxi card"],
  sections: { personal: "Personal details", company: "Company details", vehicle: "Vehicle details", payment: "Payment details", documents: "Documents", terms: "Terms & Conditions" },
  invalidEmail: "Invalid email address",
  invalidPostcode: "Invalid postal code (e.g. 1234AA)",
  validYear: "Valid year (e.g. 2020)",
  genericError: "An error occurred.",
  networkError: "Unable to connect to the server.",
  secureFooter: "🔒 Your data is secure and never shared with third parties.",
  fields: {
    firstName: "First name", lastName: "Last name", email: "Email address",
    phone: "Phone number", pNumber: "P-number (driver card)",
    licensePlate: "License plate", companyName: "Company name",
    kvkNumber: "Chamber of Commerce number", btwNumber: "VAT number",
    address: "Address", postcode: "Postal code", city: "City",
    iban: "IBAN", accountHolder: "Account holder",
    paymentCycle: "Payment cycle", carBrand: "Car brand",
    carModel: "Model", carYear: "Year of manufacture", vehicleType: "Vehicle type",
    insurance: "Insurance certificate", insuranceExpiry: "Insurance expiry date",
    driversLicense: "Driver license", driversLicenseExpiry: "License expiry date",
    taxiCard: "Taxi card", taxiCardExpiry: "Taxi card expiry date",
  },
  vehicleTypes: { sedan: "Sedan (1-4 passengers)", van: "Van (1-7 passengers)", luxury: "Luxury (1-3 passengers)" },
  paymentCycles: { daily: "Daily", weekly: "Weekly", monthly: "Monthly" },
  termsText: "By registering you agree to our driver terms:\n• Check claimed rides daily\n• Always be on time at the pick-up location\n• Call the passenger 10 min before arrival\n• Behave professionally and courteously\n• The price on the website is your driver price (incl. 9% VAT)\n• Payment within 24 hours after ride confirmation",
  termsAccept: "I agree to the terms and conditions",
  uploadHint: "Click or drag a file here (PDF, JPG, PNG)",
  required: "Required field",
  telegramLinked: "Linked via Telegram",
},

  fr: {
  title: "Devenir chauffeur",
  badge: "Chauffeur CityTaxi",
  subtitle: "Inscrivez-vous comme chauffeur chez CityTaxi",
  step: (n: number, t: number) => `Étape ${n} sur ${t}`,
  next: "Suivant", prev: "Retour", submit: "Envoyer ma candidature", submitting: "Envoi en cours...",
  uploadStages: { preparing: "Préparation des fichiers…", uploading: "Envoi des documents…", processing: "Traitement en cours…", done: "Terminé ! Redirection en cours…" },
  uploadWarning: "Ne fermez pas cette page — l'envoi est en cours.",
  uploadDocs: ["Assurance", "Permis de conduire", "Carte taxi"],
  sections: { personal: "Informations personnelles", company: "Informations entreprise", vehicle: "Informations véhicule", payment: "Informations paiement", documents: "Documents", terms: "Conditions générales" },
  invalidEmail: "Adresse e-mail invalide",
  invalidPostcode: "Code postal invalide (ex. 1234AA)",
  validYear: "Année valide (ex. 2020)",
  genericError: "Une erreur est survenue.",
  networkError: "Impossible de se connecter au serveur.",
  secureFooter: "🔒 Vos données sont sécurisées et ne sont pas partagées avec des tiers.",
  fields: {
    firstName: "Prénom", lastName: "Nom", email: "Adresse e-mail",
    phone: "Numéro de téléphone", pNumber: "Numéro P (carte chauffeur)",
    licensePlate: "Plaque d'immatriculation", companyName: "Nom de l'entreprise",
    kvkNumber: "Numéro KVK", btwNumber: "Numéro TVA",
    address: "Adresse", postcode: "Code postal", city: "Ville",
    iban: "IBAN", accountHolder: "Titulaire du compte",
    paymentCycle: "Cycle de paiement", carBrand: "Marque du véhicule",
    carModel: "Modèle", carYear: "Année de fabrication", vehicleType: "Type de véhicule",
    insurance: "Attestation d'assurance", insuranceExpiry: "Date d'expiration assurance",
    driversLicense: "Permis de conduire", driversLicenseExpiry: "Date d'expiration permis",
    taxiCard: "Carte taxi", taxiCardExpiry: "Date d'expiration carte taxi",
  },
  vehicleTypes: { sedan: "Berline (1-4 passagers)", van: "Van (1-7 passagers)", luxury: "Luxe (1-3 passagers)" },
  paymentCycles: { daily: "Quotidien", weekly: "Hebdomadaire", monthly: "Mensuel" },
  termsText: "En vous inscrivant, vous acceptez nos conditions chauffeur :\n• Vérifiez quotidiennement les courses réclamées\n• Soyez toujours à l'heure au point de prise en charge\n• Appelez le passager 10 min avant l'arrivée\n• Comportez-vous de manière professionnelle\n• Le prix sur le site est votre prix chauffeur (TVA 9% incluse)\n• Paiement dans les 24h après confirmation de course",
  termsAccept: "J'accepte les conditions générales",
  uploadHint: "Cliquez ou déposez un fichier ici (PDF, JPG, PNG)",
  required: "Champ obligatoire",
  telegramLinked: "Lié via Telegram",
},
};

const STEPS = ["personal", "company", "vehicle", "payment", "documents", "terms"] as const;

const STEP_ICONS = ["👤", "🏢", "🚗", "💶", "📄", "✅"];

function inputCls(error?: boolean) {
  return `w-full rounded-xl border ${error
    ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100"
    : "border-border bg-background focus:border-primary focus:ring-primary/10"
  } px-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none transition focus:ring-2`;
}

function FileUpload({ label, hint, onChange, value, accept = "image/*,application/pdf" }: {
  label: string; hint: string; onChange: (f: File | null) => void; value: File | null; accept?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {label} <span className="text-destructive">*</span>
      </label>
      <label className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 transition ${
        value
          ? "border-primary/40 bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-muted/50"
      }`}>
        <input type="file" accept={accept} className="hidden" onChange={e => onChange(e.target.files?.[0] ?? null)} />
        {value ? (
          <>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-primary">{value.name}</span>
            <span className="text-xs text-muted-foreground">{(value.size / 1024).toFixed(0)} KB</span>
          </>
        ) : (
          <>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Upload className="h-5 w-5" />
            </span>
            <span className="text-xs text-muted-foreground text-center">{hint}</span>
          </>
        )}
      </label>
    </div>
  );
}

export default function ChauffeurAanmeldenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale() as Lang;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<"preparing" | "uploading" | "processing" | "done">("preparing");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [telegramChatId, setTelegramChatId] = useState<string>(
  searchParams.get("tgid") || ""
);
const [telegramUsername, setTelegramUsername] = useState<string>(
  searchParams.get("tguser") || ""
);

  const t = T[locale];

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", pNumber: "",
    licensePlate: "", companyName: "", kvkNumber: "", btwNumber: "",
    address: "", postcode: "", city: "",
    iban: "", accountHolder: "", paymentCycle: "daily",
    carBrand: "", carModel: "", carYear: "", vehicleType: "sedan",
    insuranceExpiry: "", driversLicenseExpiry: "", taxiCardExpiry: "",
    termsAccepted: false,
  });
  const [files, setFiles] = useState<{ insurance: File | null; driversLicense: File | null; taxiCard: File | null }>({
    insurance: null, driversLicense: null, taxiCard: null,
  });

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  }

  function validateStep(): boolean {
    const e: Record<string, string> = {};
    const req = t.required;
    if (step === 0) {
      if (!form.firstName) e.firstName = req;
      if (!form.lastName) e.lastName = req;
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t.invalidEmail;
      if (!form.phone) e.phone = req;
      if (!form.pNumber) e.pNumber = req;
    }
    if (step === 1) {
      if (!form.companyName) e.companyName = req;
      if (!form.kvkNumber) e.kvkNumber = req;
      if (!form.address) e.address = req;
      if (!form.postcode || !/^\d{4}[A-Za-z]{2}$/.test(form.postcode)) e.postcode = (t as any).invalidPostcode;
      if (!form.city) e.city = req;
    }
    if (step === 2) {
      if (!form.carBrand) e.carBrand = req;
      if (!form.carModel) e.carModel = req;
      if (!form.carYear || isNaN(Number(form.carYear)) || Number(form.carYear) < 2000) e.carYear = t.validYear;
      if (!form.licensePlate) e.licensePlate = req;
    }
    if (step === 3) {
      if (!form.iban) e.iban = req;
      if (!form.accountHolder) e.accountHolder = req;
    }
    if (step === 4) {
      if (!files.insurance) e.insurance = req;
      if (!form.insuranceExpiry) e.insuranceExpiry = req;
      if (!files.driversLicense) e.driversLicense = req;
      if (!form.driversLicenseExpiry) e.driversLicenseExpiry = req;
      if (!files.taxiCard) e.taxiCard = req;
      if (!form.taxiCardExpiry) e.taxiCardExpiry = req;
    }
    if (step === 5) {
      if (!form.termsAccepted) e.termsAccepted = req;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function nextStep() {
    if (validateStep()) setStep(s => Math.min(s + 1, STEPS.length - 1));
  }

  function handleSubmit() {
    if (!validateStep()) return;

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    if (telegramChatId) fd.append("telegramChatId", telegramChatId);
    if (telegramUsername) fd.append("telegramUsername", telegramUsername);
    if (files.insurance)      fd.append("insurance",      files.insurance);
    if (files.driversLicense) fd.append("driversLicense", files.driversLicense);
    if (files.taxiCard)       fd.append("taxiCard",       files.taxiCard);

    setSubmitting(true);
    setUploadProgress(0);
    setUploadStage("preparing");

    const xhr = new XMLHttpRequest();

    // Progression réelle de l'upload (bytes envoyés / total)
    xhr.upload.addEventListener("loadstart", () => {
      setUploadStage("uploading");
      setUploadProgress(5);
    });

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        // 5 → 85% pendant l'upload réseau
        const pct = 5 + Math.round((event.loaded / event.total) * 80);
        setUploadProgress(pct);
      }
    });

    xhr.upload.addEventListener("load", () => {
      // Upload réseau terminé — le serveur compresse + sauvegarde
      setUploadStage("processing");
      setUploadProgress(90);
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        setUploadProgress(100);
        setUploadStage("done");
        setTimeout(() => router.push("/chauffeur/bevestiging"), 800);
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          setErrors({ submit: data.error || t.genericError });
        } catch {
          setErrors({ submit: t.genericError });
        }
        setSubmitting(false);
      }
    });

    xhr.addEventListener("error", () => {
      setErrors({ submit: t.networkError });
      setSubmitting(false);
    });

    xhr.open("POST", "/api/drivers/register");
    xhr.send(fd);
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-surface">

      {/* ── Overlay de progression upload ───────────────────────────────────── */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-2xl">

            {/* Icône animée */}
            <div className="mb-5 flex justify-center">
              {uploadStage === "done" ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl animate-bounce">✅</div>
              ) : (
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
                  <span className="text-xl">📤</span>
                </div>
              )}
            </div>

            {/* Message d'étape */}
            <p className="mb-4 text-center text-sm font-semibold text-foreground">
              {t.uploadStages[uploadStage]}
            </p>

            {/* Barre de progression */}
            <div className="mb-1.5 h-3 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full gradient-primary transition-all duration-500 ease-out shadow-glow"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mb-5 text-right text-xs font-semibold text-primary">{uploadProgress}%</p>

            {/* Fichiers */}
            <div className="space-y-2">
              {([
                { file: files.insurance,      icon: "🛡️", label: t.uploadDocs[0], threshold: 30 },
                { file: files.driversLicense, icon: "🪪", label: t.uploadDocs[1], threshold: 60 },
                { file: files.taxiCard,       icon: "🚖", label: t.uploadDocs[2], threshold: 85 },
              ] as const).map(({ file, icon, label, threshold }) =>
                file ? (
                  <div
                    key={label}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-500 ${
                      uploadProgress >= threshold
                        ? "bg-green-50 border border-green-200"
                        : "bg-muted border border-border"
                    }`}
                  >
                    <span className="text-base">{icon}</span>
                    <span className="flex-1 truncate text-xs font-medium text-foreground">{file.name}</span>
                    {uploadProgress >= threshold ? (
                      <Check className="h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    )}
                  </div>
                ) : null
              )}
            </div>

            {/* Avertissement */}
            <p className="mt-5 text-center text-xs text-muted-foreground">
              ⚠️ {t.uploadWarning}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <Link href="/">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-3">
            {telegramChatId && (
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {t.telegramLinked}
              </span>
            )}
            <LanguageSwitcher />

          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        {/* Hero */}
        <div className="mb-8 text-center">
          <p className="text-eyebrow text-primary mb-2">{t.badge}</p>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{t.title}</h1>
          <p className="mt-2 text-muted-foreground">{t.subtitle}</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>{t.step(step + 1, STEPS.length)}</span>
            <span className="font-semibold text-foreground">{t.sections[STEPS[step]]}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full gradient-primary transition-all duration-500 shadow-glow" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 flex justify-between">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all ${
                  i < step ? "gradient-primary text-primary-foreground shadow-glow" :
                  i === step ? "bg-navy text-navy-foreground shadow-card" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i < step ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{STEP_ICONS[i]}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-3xl border border-border bg-card shadow-card p-6 space-y-5">
          <h2 className="text-base font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
            <span>{STEP_ICONS[step]}</span>
            {t.sections[STEPS[step]]}
          </h2>

          {/* STEP 0 — Persoonlijk */}
          {step === 0 && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { field: "firstName", label: t.fields.firstName, col: 1 },
                { field: "lastName", label: t.fields.lastName, col: 1 },
                { field: "email", label: t.fields.email, col: 2, type: "email" },
                { field: "phone", label: t.fields.phone, col: 1, type: "tel" },
                { field: "pNumber", label: t.fields.pNumber, col: 1 },
              ].map(({ field, label, col, type }) => (
                <div key={field} className={col === 2 ? "col-span-2" : ""}>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">{label} <span className="text-destructive">*</span></label>
                  <input type={type || "text"} value={(form as any)[field]} onChange={e => set(field, e.target.value)}
                    className={inputCls(!!errors[field])} placeholder={label} />
                  {errors[field] && <p className="mt-1 text-xs text-destructive">{errors[field]}</p>}
                </div>
              ))}
            </div>
          )}

          {/* STEP 1 — Bedrijf */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { field: "companyName", label: t.fields.companyName, col: 2, required: true },
                { field: "kvkNumber", label: t.fields.kvkNumber, col: 1, required: true },
                { field: "btwNumber", label: t.fields.btwNumber, col: 1, required: false },
                { field: "address", label: t.fields.address, col: 2, required: true },
                { field: "postcode", label: t.fields.postcode, col: 1, required: true },
                { field: "city", label: t.fields.city, col: 1, required: true },
              ].map(({ field, label, col, required }) => (
                <div key={field} className={col === 2 ? "col-span-2" : ""}>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    {label} {required && <span className="text-destructive">*</span>}
                  </label>
                  <input
                    value={(form as any)[field]}
                    onChange={e => set(field, field === "postcode" ? e.target.value.toUpperCase() : e.target.value)}
                    className={inputCls(!!errors[field])}
                    placeholder={field === "postcode" ? "1234AA" : label}
                    maxLength={field === "postcode" ? 6 : undefined}
                  />
                  {errors[field] && <p className="mt-1 text-xs text-destructive">{errors[field]}</p>}
                </div>
              ))}
            </div>
          )}

          {/* STEP 2 — Voertuig */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-4">

              {/* Marque — BrandSelect + option saisie libre */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t.fields.carBrand} <span className="text-destructive">*</span></label>
                <BrandSelect
                  value={form.carBrand}
                  onChange={(brand) => {
                    if (brand === "__custom__") {
                      set("carBrand", "");
                    } else {
                      set("carBrand", brand);
                    }
                  }}
                  placeholder={t.fields.carBrand}
                  error={!!errors.carBrand}
                  allowCustom
                  customLabel={locale === "fr" ? "Autre marque…" : locale === "en" ? "Other brand…" : "Andere merk…"}
                  customValue={form.carBrand}
                  onCustomChange={(v) => set("carBrand", v)}
                />
                {errors.carBrand && <p className="mt-1 text-xs text-destructive">{errors.carBrand}</p>}
              </div>

              {/* Modèle */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t.fields.carModel} <span className="text-destructive">*</span></label>
                <input
                  value={form.carModel}
                  onChange={e => set("carModel", e.target.value)}
                  className={inputCls(!!errors.carModel)}
                  placeholder={locale === "fr" ? "ex. E220, Yaris, Golf…" : "e.g. E220, Yaris, Golf…"}
                />
                {errors.carModel && <p className="mt-1 text-xs text-destructive">{errors.carModel}</p>}
              </div>

              {/* Année */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t.fields.carYear} <span className="text-destructive">*</span></label>
                <input value={form.carYear} onChange={e => set("carYear", e.target.value)}
                  className={inputCls(!!errors.carYear)} placeholder="2020" type="number" min="2000" max="2030" />
                {errors.carYear && <p className="mt-1 text-xs text-destructive">{errors.carYear}</p>}
              </div>

              {/* Plaque d'immatriculation */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t.fields.licensePlate} <span className="text-destructive">*</span></label>
                <input
                  value={form.licensePlate}
                  onChange={e => set("licensePlate", e.target.value.toUpperCase())}
                  className={inputCls(!!errors.licensePlate)}
                  placeholder="XX-000-X"
                />
                {errors.licensePlate && <p className="mt-1 text-xs text-destructive">{errors.licensePlate}</p>}
              </div>

              {/* Type de véhicule */}
              <div className="col-span-2">
                <label className="mb-2 block text-sm font-medium text-foreground">{t.fields.vehicleType} <span className="text-destructive">*</span></label>
                <div className="grid grid-cols-3 gap-3">
                  {(["sedan", "van", "luxury"] as const).map(v => (
                    <button key={v} type="button" onClick={() => set("vehicleType", v)}
                      className={`rounded-2xl border-2 p-4 text-center transition ${form.vehicleType === v ? "border-primary bg-primary/5 shadow-card" : "border-border hover:border-primary/40"}`}>
                      <div className="text-2xl mb-1.5">{v === "sedan" ? "🚗" : v === "van" ? "🚐" : "🏎️"}</div>
                      <div className="text-xs font-semibold text-foreground">{t.vehicleTypes[v].split(" ")[0]}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{t.vehicleTypes[v].split("(")[1]?.replace(")", "")}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Betaling */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t.fields.iban} <span className="text-destructive">*</span></label>
                <input value={form.iban} onChange={e => set("iban", e.target.value.replace(/\s/g, ""))}
                  className={inputCls(!!errors.iban)} placeholder="NL91ABNA0417164300" />
                {errors.iban && <p className="mt-1 text-xs text-destructive">{errors.iban}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t.fields.accountHolder} <span className="text-destructive">*</span></label>
                <input value={form.accountHolder} onChange={e => set("accountHolder", e.target.value)}
                  className={inputCls(!!errors.accountHolder)} placeholder={t.fields.accountHolder} />
                {errors.accountHolder && <p className="mt-1 text-xs text-destructive">{errors.accountHolder}</p>}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">{t.fields.paymentCycle}</label>
                <div className="grid grid-cols-3 gap-3">
                  {(["daily", "weekly", "monthly"] as const).map(c => (
                    <button key={c} type="button" onClick={() => set("paymentCycle", c)}
                      className={`rounded-2xl border-2 p-3 text-center text-sm font-semibold transition ${form.paymentCycle === c ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      {t.paymentCycles[c]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 — Documenten */}
          {step === 4 && (
            <div className="space-y-5">
              <FileUpload label={"🛡️ " + t.fields.insurance} hint={t.uploadHint}
                value={files.insurance} onChange={f => setFiles(v => ({ ...v, insurance: f }))} />
              {errors.insurance && <p className="text-xs text-destructive">{errors.insurance}</p>}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t.fields.insuranceExpiry} <span className="text-destructive">*</span></label>
                <input type="date" value={form.insuranceExpiry} onChange={e => set("insuranceExpiry", e.target.value)}
                  min={new Date().toISOString().split("T")[0]} className={inputCls(!!errors.insuranceExpiry)} />
                {errors.insuranceExpiry && <p className="mt-1 text-xs text-destructive">{errors.insuranceExpiry}</p>}
              </div>
              <div className="border-t border-border pt-5">
                <FileUpload label={"🪪 " + t.fields.driversLicense} hint={t.uploadHint}
                  value={files.driversLicense} onChange={f => setFiles(v => ({ ...v, driversLicense: f }))} />
                {errors.driversLicense && <p className="text-xs text-destructive">{errors.driversLicense}</p>}
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">{t.fields.driversLicenseExpiry} <span className="text-destructive">*</span></label>
                  <input type="date" value={form.driversLicenseExpiry} onChange={e => set("driversLicenseExpiry", e.target.value)}
                    min={new Date().toISOString().split("T")[0]} className={inputCls(!!errors.driversLicenseExpiry)} />
                  {errors.driversLicenseExpiry && <p className="mt-1 text-xs text-destructive">{errors.driversLicenseExpiry}</p>}
                </div>
              </div>
              <div className="border-t border-border pt-5">
                <FileUpload label={"🚖 " + t.fields.taxiCard} hint={t.uploadHint}
                  value={files.taxiCard} onChange={f => setFiles(v => ({ ...v, taxiCard: f }))} />
                {errors.taxiCard && <p className="text-xs text-destructive">{errors.taxiCard}</p>}
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">{t.fields.taxiCardExpiry} <span className="text-destructive">*</span></label>
                  <input type="date" value={form.taxiCardExpiry} onChange={e => set("taxiCardExpiry", e.target.value)}
                    min={new Date().toISOString().split("T")[0]} className={inputCls(!!errors.taxiCardExpiry)} />
                  {errors.taxiCardExpiry && <p className="mt-1 text-xs text-destructive">{errors.taxiCardExpiry}</p>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5 — Voorwaarden */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-surface p-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line border border-border">
                {t.termsText}
              </div>
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${form.termsAccepted ? "border-primary bg-primary/5" : errors.termsAccepted ? "border-destructive bg-destructive/5" : "border-border hover:border-primary/40"}`}>
                <input type="checkbox" checked={form.termsAccepted} onChange={e => set("termsAccepted", e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary" />
                <span className="text-sm font-medium text-foreground">{t.termsAccept}</span>
              </label>
              {errors.termsAccepted && <p className="text-xs text-destructive">{errors.termsAccepted}</p>}
              {errors.submit && (
                <div className="rounded-2xl bg-destructive/5 border border-destructive/20 px-4 py-3 text-sm text-destructive">{errors.submit}</div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-5 flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 flex-1 justify-center rounded-2xl border-2 border-border py-3.5 text-sm font-semibold text-foreground hover:bg-muted transition">
              <ChevronLeft className="h-4 w-4" />
              {t.prev}
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={nextStep}
              className="flex items-center gap-2 flex-[2] justify-center rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition hover:-translate-y-0.5">
              {t.next}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-[2] rounded-2xl bg-navy py-3.5 text-sm font-bold text-navy-foreground shadow-lift transition hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0">
              {submitting ? t.submitting : t.submit}
            </button>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t.secureFooter}
        </p>
      </main>
    </div>
  );
}
