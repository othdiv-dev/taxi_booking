"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, Check, Loader2, Lock, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

const sedanImg = "/assets/vehicle-sedan.jpg";
const vanImg = "/assets/vehicle-van.jpg";
const luxuryImg = "/assets/vehicle-luxury.jpg";

import {
  VEHICLE_MAX_PASSENGERS,
  type TripEstimate,
  type VehicleType,
} from "@/lib/pricing";
import { useVehicleLabels, useVehicleDescriptions } from "@/lib/vehicle-i18n";
import { CitySelect } from "@/components/ui/CitySelect";

type Zone = { id: number; name: string; slug: string };

/** Charge les villes actives depuis /api/zones au montage */
function useZones(): Zone[] {
  const [zones, setZones] = useState<Zone[]>([]);
  useEffect(() => {
    fetch("/api/zones")
      .then((r) => r.json())
      .then((data: Zone[]) => setZones(data))
      .catch(() => setZones([]));
  }, []);
  return zones;
}


type AddressMode = "adres" | "postcode" | "internationaal" | "vliegveld";

type AddressValue = {
  mode: AddressMode;
  city: string; street: string; number: string;
  postcode: string; postcodeNumber: string;
  international: string;
  airport: string; terminal: string;
};

const AIRPORTS = [
  "Amsterdam Schiphol (AMS)",
  "Rotterdam The Hague (RTM)",
  "Eindhoven (EIN)",
  "Brussel Zaventem (BRU)",
  "Dusseldorf (DUS)",
  "Frankfurt (FRA)",
];

const VEHICLE_IMAGES: Record<VehicleType, string> = {
  sedan: sedanImg, van: vanImg, luxury: luxuryImg,
};

const inputCls = "w-full rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:bg-card focus:ring-2 focus:ring-ring/25";
const selectCls = "w-full rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:bg-card focus:ring-2 focus:ring-ring/25 appearance-none cursor-pointer";

function emptyAddress(mode: AddressMode = "adres"): AddressValue {
  return { mode, city: "", street: "", number: "", postcode: "", postcodeNumber: "", international: "", airport: "", terminal: "" };
}

function buildFullAddress(addr: AddressValue): string {
  switch (addr.mode) {
    case "adres": return [addr.street && addr.number ? `${addr.street} ${addr.number}` : addr.street, addr.city].filter(Boolean).join(", ");
    case "postcode": return [addr.postcode && addr.postcodeNumber ? `${addr.postcode} ${addr.postcodeNumber}` : addr.postcode].filter(Boolean).join(", ");
    case "internationaal": return addr.international;
    case "vliegveld": return [addr.airport, addr.terminal ? `Terminal ${addr.terminal}` : ""].filter(Boolean).join(", ");
  }
}

function isValidPhone(phone: string) { return /^[+\d][\d\s\-().]{6,19}$/.test(phone.trim()); }
function isValidEmail(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()); }

function AddressBlock({ type, value, onChange, zones }: {
  type: "pickup" | "dropoff";
  value: AddressValue;
  onChange: (v: AddressValue) => void;
  zones: Zone[];
}) {
  const t = useTranslations("bookingForm");
  const isPickup = type === "pickup";
  // "other" = ville hors liste, saisie libre
  const [cityMode, setCityMode] = useState<"list" | "other">("list");

  const ADDRESS_MODES = [
    { value: "adres" as AddressMode, label: t("addressModes.adres") },
    { value: "postcode" as AddressMode, label: t("addressModes.postcode") },
    { value: "internationaal" as AddressMode, label: t("addressModes.internationaal") },
    { value: "vliegveld" as AddressMode, label: t("addressModes.vliegveld") },
  ];

  const activeCls = isPickup ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground";

  return (
    <div className="relative">
      <div className={`absolute top-1 bottom-1 left-0 w-0.5 rounded-full ${isPickup ? "bg-primary" : "bg-accent"}`} />
      <div className="pl-4">

        {/* Header : label + onglets de mode */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-y-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ring-4 ${isPickup ? "bg-primary ring-primary/15" : "bg-accent ring-accent/20"}`} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isPickup ? t("departure") : t("arrival")}
            </span>
          </div>
          {/* Onglets scrollables horizontalement sur mobile */}
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {ADDRESS_MODES.map((m) => (
              <button key={m.value} type="button"
                onClick={() => onChange({ ...emptyAddress(m.value) })}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                  value.mode === m.value ? activeCls : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mode Adres : dropdown ville searchable + saisie rue */}
        {value.mode === "adres" && (
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3">
              {cityMode === "list" ? (
                <CitySelect
                  value={value.city}
                  onChange={(city) => {
                    if (city === "__other__") {
                      setCityMode("other");
                      onChange({ ...value, city: "" });
                    } else {
                      onChange({ ...value, city });
                    }
                  }}
                  zones={zones}
                  placeholder={t("placeholders.city")}
                />
              ) : (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={value.city}
                    onChange={(e) => onChange({ ...value, city: e.target.value })}
                    placeholder="Voer uw stad in"
                    className={`flex-1 ${inputCls}`}
                  />
                  <button
                    type="button"
                    onClick={() => { setCityMode("list"); onChange({ ...value, city: "" }); }}
                    className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition"
                  >
                    ← Lijst
                  </button>
                </div>
              )}
            </div>
            <input
              value={value.street}
              onChange={(e) => onChange({ ...value, street: e.target.value })}
              placeholder={t("placeholders.street")}
              className={`col-span-2 ${inputCls}`}
            />
            <input
              value={value.number}
              onChange={(e) => onChange({ ...value, number: e.target.value })}
              placeholder="#"
              className={inputCls}
            />
          </div>
        )}

        {value.mode === "postcode" && (
          <div className="grid grid-cols-3 gap-2">
            <input value={value.postcode} onChange={(e) => onChange({ ...value, postcode: e.target.value })} placeholder={t("addressModes.postcode")} className={`col-span-2 ${inputCls}`} />
            <input value={value.postcodeNumber} onChange={(e) => onChange({ ...value, postcodeNumber: e.target.value })} placeholder="#" className={inputCls} />
          </div>
        )}

        {value.mode === "internationaal" && (
          <input value={value.international} onChange={(e) => onChange({ ...value, international: e.target.value })} placeholder={t("placeholders.international")} className={inputCls} />
        )}

        {value.mode === "vliegveld" && (
          <div className="grid grid-cols-3 gap-2">
            <div className="relative col-span-2">
              <select value={value.airport} onChange={(e) => onChange({ ...value, airport: e.target.value })} className={`${selectCls} pr-10`}>
                <option value="">{t("placeholders.chooseAirport")}</option>
                {AIRPORTS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <input value={value.terminal} onChange={(e) => onChange({ ...value, terminal: e.target.value })} placeholder={t("placeholders.terminal")} className={inputCls} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingForm() {
  const t = useTranslations("bookingForm");
  const VEHICLE_LABELS = useVehicleLabels();
  const VEHICLE_DESCRIPTIONS = useVehicleDescriptions();
  const [step, setStep] = useState<1 | 2>(1);
  const [pickup, setPickup] = useState<AddressValue>(emptyAddress("adres"));
  const [dropoff, setDropoff] = useState<AddressValue>(emptyAddress("adres"));
  const [vehicleType, setVehicleType] = useState<VehicleType>("sedan");
  const [price, setPrice] = useState<TripEstimate | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(1);
  const [pickupDatetime, setPickupDatetime] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const zones = useZones();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickupAddress = buildFullAddress(pickup);
  const dropoffAddress = buildFullAddress(dropoff);

  function swapAddresses() { setPickup(dropoff); setDropoff(pickup); }

  useEffect(() => {
    const max = VEHICLE_MAX_PASSENGERS[vehicleType];
    setPassengers((p) => Math.min(p, max));
  }, [vehicleType]);

  useEffect(() => {
    if (pickupAddress.trim().length < 3 || dropoffAddress.trim().length < 3) { setPrice(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPriceLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/pricing", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pickupAddress, dropoffAddress, vehicleType }),
        });
        if (res.ok) { const data = await res.json(); setPrice({ distanceKm: data.distanceKm, durationMinutes: data.durationMinutes, price: data.price }); }
        else { setPrice(null); }
      } catch { setPrice(null); }
      setPriceLoading(false);
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [pickupAddress, dropoffAddress, vehicleType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) { if (price) setStep(2); return; }
    setError(null);
    if (!pickupDatetime) { setError(t("errors.noDate")); return; }
    if (new Date(pickupDatetime).getTime() < Date.now() + 2 * 60 * 60 * 1000) { setError(t("errors.tooSoon")); return; }
    if (!isValidPhone(customerPhone)) { setError(t("errors.invalidPhone")); return; }
    if (!isValidEmail(customerEmail)) { setError(t("errors.invalidEmail")); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, customerEmail, customerPhone, passengers, luggage, pickupAddress, dropoffAddress, pickupDatetime, flightNumber: flightNumber || null, vehicleType, customerNotes: customerNotes || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t("errors.serverError")); setSubmitting(false); return; }
      if (data.paymentUrl) { window.location.href = data.paymentUrl; }
      else { setReference(data.reference || "CONF-" + Math.random().toString(36).slice(2, 8).toUpperCase()); }
    } catch { setError(t("errors.networkError")); setSubmitting(false); }
  }

  const minDateTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);

  if (reference) {
    return (
      <div className="w-full overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
        <div className="gradient-navy px-6 py-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Check className="h-6 w-6" strokeWidth={2.6} />
          </span>
          <h2 className="mt-4 text-xl font-bold text-navy-foreground">{t("confirmation.title")}</h2>
          <p className="mt-1.5 text-sm text-navy-muted">
            {t("confirmation.emailSent")} {customerEmail || t("confirmation.defaultEmail")}.
          </p>
        </div>
        <div className="space-y-4 p-6">
          <div className="rounded-2xl bg-muted/60 p-4 text-center">
            <p className="text-eyebrow text-muted-foreground">{t("confirmation.reference")}</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-foreground">{reference}</p>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("confirmation.departure")}</dt><dd className="text-right font-medium text-foreground">{pickupAddress}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("confirmation.arrival")}</dt><dd className="text-right font-medium text-foreground">{dropoffAddress}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("confirmation.vehicle")}</dt><dd className="font-medium text-foreground">{VEHICLE_LABELS[vehicleType]}</dd></div>
            <div className="flex justify-between gap-4 border-t border-border pt-2"><dt className="text-muted-foreground">{t("confirmation.total")}</dt><dd className="font-display font-extrabold text-foreground">{price?.price.toFixed(2)} €</dd></div>
          </dl>
          <button type="button" onClick={() => { setReference(null); setStep(1); }}
            className="w-full rounded-2xl border border-border py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
            {t("confirmation.newBooking")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
      <div className="gradient-navy px-6 pt-5 pb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-eyebrow text-aqua">{t("badge")}</p>
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-6 rounded-full ${step === 1 ? "bg-aqua" : "bg-navy-muted/40"}`} />
            <span className={`h-1.5 w-6 rounded-full ${step === 2 ? "bg-aqua" : "bg-navy-muted/40"}`} />
          </div>
        </div>
        <h2 className="text-lg font-bold text-navy-foreground">
          {step === 1 ? t("step1Title") : t("step2Title")}
        </h2>
      </div>

      <div className="space-y-4 p-5">
        {step === 1 && (
          <>
            <div className="space-y-3">
              <AddressBlock type="pickup" value={pickup} onChange={setPickup} zones={zones} />
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-dashed border-border" />
                <button type="button" onClick={swapAddresses} title={t("swapTitle")}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-primary">
                  <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={2.4} />
                </button>
                <div className="flex-1 border-t border-dashed border-border" />
              </div>
              <AddressBlock type="dropoff" value={dropoff} onChange={setDropoff} zones={zones} />
            </div>

            <div>
              <p className="mb-2 text-eyebrow text-muted-foreground">{t("chooseVehicle")}</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(VEHICLE_LABELS) as VehicleType[]).map((v) => (
                  <button type="button" key={v} onClick={() => setVehicleType(v)} aria-pressed={vehicleType === v}
                    className={`relative overflow-hidden rounded-2xl border-2 text-left transition-all ${vehicleType === v ? "border-primary ring-2 ring-ring/25" : "border-border hover:border-primary/40"}`}>
                    <div className="relative h-16 w-full bg-muted">
                      <img src={VEHICLE_IMAGES[v]} alt={VEHICLE_LABELS[v]} loading="lazy" className="h-full w-full object-cover" />
                      {vehicleType === v && (
                        <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <div className={`px-2 py-2 text-center ${vehicleType === v ? "bg-muted" : "bg-card"}`}>
                      <p className="text-xs font-bold text-foreground">{VEHICLE_LABELS[v]}</p>
                      <p className="text-[10px] text-muted-foreground">{VEHICLE_DESCRIPTIONS[v]}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className={`rounded-2xl transition-all ${price ? "gradient-navy p-4" : "border border-dashed border-border bg-muted/50 p-4"}`}>
              {priceLoading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{t("calculating")}</p>
                </div>
              ) : price ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-eyebrow text-aqua">{t("estimatedPrice")}</p>
                    <p className="mt-0.5 font-display text-3xl font-extrabold text-navy-foreground">
                      {price.price.toFixed(2)}<span className="text-xl text-aqua">€</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-navy-foreground">{price.distanceKm} km</p>
                    <p className="text-xs text-navy-muted">~{price.durationMinutes} min</p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground">{t("enterAddresses")}</p>
              )}
            </div>

            <button type="submit" disabled={!price}
              className="w-full rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40">
              {price ? `${t("continue")} — ${price.price.toFixed(2)} €` : t("seePriceFirst")}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="overflow-hidden rounded-2xl border border-border bg-muted/50">
              <div className="flex gap-3 p-3">
                <img src={VEHICLE_IMAGES[vehicleType]} alt={VEHICLE_LABELS[vehicleType]} loading="lazy" className="h-16 w-24 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-start gap-1.5"><span className="mt-0.5 font-bold text-primary">↑</span><span className="truncate">{pickupAddress}</span></div>
                  <div className="flex items-start gap-1.5"><span className="mt-0.5 font-bold text-accent">↓</span><span className="truncate">{dropoffAddress}</span></div>
                  <div className="flex justify-between border-t border-border pt-1">
                    <span>{VEHICLE_LABELS[vehicleType]}</span>
                    <span className="font-bold text-foreground">{price ? `${price.distanceKm} km · ${price.price.toFixed(2)}€` : "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">{t("datetime")} *</label>
                <input required type="datetime-local" min={minDateTime} value={pickupDatetime} onChange={(e) => setPickupDatetime(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">{t("flightNumber")}</label>
                <input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="KL1234" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  {t("passengers")} <span className="text-muted-foreground">({t("maxPassengers")} {VEHICLE_MAX_PASSENGERS[vehicleType]})</span>
                </label>
                <input type="number" min={1} max={VEHICLE_MAX_PASSENGERS[vehicleType]} value={passengers}
                  onChange={(e) => setPassengers(Math.min(Number(e.target.value), VEHICLE_MAX_PASSENGERS[vehicleType]))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">{t("luggage")}</label>
                <input type="number" min={0} max={8} value={luggage} onChange={(e) => setLuggage(Number(e.target.value))} className={inputCls} />
              </div>
            </div>

            <div className="space-y-2.5 border-t border-border pt-4">
              <p className="text-eyebrow text-muted-foreground">{t("yourDetails")}</p>
              <input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={t("fullName")} className={inputCls} />
              <div className="grid grid-cols-2 gap-2.5">
                <input required type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder={t("phone")} className={inputCls} />
                <input required type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder={t("email")} className={inputCls} />
              </div>
              <textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} rows={2} placeholder={t("notes")} className={`${inputCls} resize-none`} />
            </div>

            {error && <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 rounded-2xl border border-border py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                {t("back")}
              </button>
              <button type="submit" disabled={submitting}
                className="flex-[2] rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-60">
                {submitting ? t("processing") : `${t("confirm")} — ${price?.price.toFixed(2) ?? "—"} €`}
              </button>
            </div>
          </>
        )}

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" strokeWidth={2.2} />
          {t("securePayment")}
        </p>
      </div>
    </form>
  );
}