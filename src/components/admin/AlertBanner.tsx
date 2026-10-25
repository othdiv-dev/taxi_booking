"use client";

import { useEffect, useState, useCallback } from "react";

type Alert = {
  id: number;
  type: string;
  bookingId: number | null;
  message: string;
  createdAt: string;
};

export default function AlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/alerts");
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch { /* silencieux */ }
  }, []);

  const dismiss = async (id: number) => {
    await fetch("/api/admin/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  useEffect(() => {
    fetchAlerts();
    // Polling toutes les 30 secondes
    const interval = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className="bg-orange-50 border border-orange-300 rounded-lg shadow-lg p-4 flex items-start gap-3"
        >
          <span className="text-2xl">🚨</span>
          <div className="flex-1">
            <p className="font-semibold text-orange-800 text-sm">Annulation chauffeur</p>
            <p className="text-orange-700 text-sm mt-0.5">{alert.message}</p>
            {alert.bookingId && (
              <a
                href={`/nl/admin/bookings/${alert.bookingId}`}
                className="text-xs text-orange-600 underline mt-1 block"
              >
                Voir la réservation →
              </a>
            )}
          </div>
          <button
            onClick={() => dismiss(alert.id)}
            className="text-orange-400 hover:text-orange-600 text-xl leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
