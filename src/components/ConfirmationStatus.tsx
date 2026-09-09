"use client";

import { useEffect, useRef, useState } from "react";

type BookingData = {
  reference: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;
  distanceKm: string;
  totalPrice: string;
  vehicleType: string;
  passengers: number;
  luggage: number;
  flightNumber: string | null;
  customerName: string;
  driver: {
    firstName: string;
    lastName: string;
    phone: string;
    vehicleType: string;
    rating: string;
  } | null;
};

const STATUS_STEPS = [
  { key: "paid", label: "Paiement confirmé", icon: "💳" },
  { key: "sent_to_drivers", label: "Recherche d'un chauffeur", icon: "📡" },
  { key: "accepted", label: "Chauffeur trouvé", icon: "🧑‍✈️" },
  { key: "driver_on_way", label: "Chauffeur en route", icon: "🚗" },
  { key: "passenger_picked", label: "Course en cours", icon: "🛣️" },
  { key: "completed", label: "Course terminée", icon: "✅" },
];

const VEHICLE_LABELS: Record<string, string> = {
  sedan: "Berline",
  van: "Van (7 places)",
  luxury: "Luxe",
};

function stepIndex(status: string) {
  if (status === "pending") return -1;
  if (status === "cancelled") return -2;
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

const MAX_POLLS = 24; // 24 × 5s = 2 minutes maximum
const POLL_INTERVAL = 5000;
const FINAL_STATUSES = ["completed", "cancelled"];

export default function ConfirmationStatus({ initial }: { initial: BookingData }) {
  const [booking, setBooking] = useState<BookingData>(initial);
  const [pollCount, setPollCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Arrêter si statut final ou trop de tentatives
    if (FINAL_STATUSES.includes(booking.status) || pollCount >= MAX_POLLS) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/bookings/${booking.reference}`);
        if (res.ok) {
          const data = await res.json();
          setBooking(data);
        }
      } catch {
        // ignore transient errors
      }
      setPollCount((c) => c + 1);
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [booking.reference, booking.status, pollCount]);

  const currentStep = stepIndex(booking.status);
  const cancelled = booking.status === "cancelled";
  const pollingStopped = pollCount >= MAX_POLLS && !FINAL_STATUSES.includes(booking.status);

  return (
    <div className="mx-auto max-w-2xl space-y-6">

      {/* Status card */}
      <div className="rounded-3xl bg-white p-8 text-center shadow-[0_24px_60px_rgba(16,24,40,0.12)]">
        <p className="text-5xl">{cancelled ? "❌" : "🎉"}</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          {cancelled ? "Réservation annulée" : "Réservation confirmée !"}
        </h1>
        <p className="mt-1 font-mono text-sm text-slate-500">{booking.reference}</p>

        {!cancelled && (
          <div className="mt-8">
            {/* Steps */}
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((step, idx) => (
                <div key={step.key} className="flex flex-1 flex-col items-center">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                    idx <= currentStep ? "bg-yellow-400 text-slate-900" : "bg-slate-100 text-slate-400"
                  }`}>
                    {step.icon}
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={`mt-4 h-0.5 w-full ${idx < currentStep ? "bg-yellow-400" : "bg-slate-100"}`} />
                  )}
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm font-medium text-slate-700">
              {currentStep >= 0 ? STATUS_STEPS[currentStep].label : "En attente d'attribution d'un chauffeur..."}
            </p>

            {/* Polling status */}
            {!FINAL_STATUSES.includes(booking.status) && !pollingStopped && (
              <p className="mt-2 text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Mise à jour automatique en cours...
              </p>
            )}
            {pollingStopped && (
              <p className="mt-2 text-xs text-slate-400">
                Rafraîchissez la page pour voir le statut mis à jour.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Trip details */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Détails du trajet</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Départ</dt>
            <dd className="font-medium text-slate-900">{booking.pickupAddress}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Arrivée</dt>
            <dd className="font-medium text-slate-900">{booking.dropoffAddress}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Date & heure</dt>
            <dd className="font-medium text-slate-900">
              {new Date(booking.pickupDatetime).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Distance</dt>
            <dd className="font-medium text-slate-900">{booking.distanceKm} km</dd>
          </div>
          <div>
            <dt className="text-slate-400">Prix total</dt>
            <dd className="font-medium text-slate-900 text-lg font-bold">{Number(booking.totalPrice).toFixed(2)} €</dd>
          </div>
          <div>
            <dt className="text-slate-400">Véhicule</dt>
            <dd className="font-medium text-slate-900">{VEHICLE_LABELS[booking.vehicleType] ?? booking.vehicleType}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Passagers</dt>
            <dd className="font-medium text-slate-900">{booking.passengers}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Bagages</dt>
            <dd className="font-medium text-slate-900">{booking.luggage}</dd>
          </div>
          {booking.flightNumber && (
            <div className="sm:col-span-2">
              <dt className="text-slate-400">N° de vol</dt>
              <dd className="font-medium text-slate-900">{booking.flightNumber}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Driver info */}
      {booking.driver && (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Votre chauffeur</h2>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">🧑‍✈️</div>
            <div>
              <p className="font-medium text-slate-900">
                {booking.driver.firstName} {booking.driver.lastName}
              </p>
              <p className="text-sm text-slate-500">
                ⭐ {booking.driver.rating} · {booking.driver.phone}
              </p>
            </div>
          </div>
        </div>
      )}

      <a href="/" className="block text-center text-sm font-medium text-blue-600 hover:underline">
        ← Retour à l&apos;accueil
      </a>
    </div>
  );
}
