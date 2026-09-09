"use client";

import { useState } from "react";

interface DocCardProps {
  icon:     string;
  label:    string;
  driverId: number;
  field:    "insurance" | "driversLicense" | "taxiCard";
  hasDoc:   boolean;
  expiry:   Date | string | null;
}

type State = "idle" | "loading" | "error";

/**
 * Carte document — bouton "Consulter" appelle l'API admin pour
 * obtenir une URL signée temporaire (15 min), puis ouvre le document.
 * L'URL n'est jamais exposée dans le HTML de la page.
 */
export default function DocCard({ icon, label, driverId, field, hasDoc, expiry }: DocCardProps) {
  const [state, setState] = useState<State>("idle");

  const expiryDate = expiry ? new Date(expiry) : null;
  const isExpired  = expiryDate ? expiryDate < new Date() : false;
  const expiryStr  = expiryDate ? expiryDate.toLocaleDateString("fr-FR") : null;

  async function openDocument() {
    setState("loading");
    try {
      const res = await fetch(
        `/api/admin/document?driverId=${driverId}&field=${field}`,
        { credentials: "same-origin" }
      );

      if (!res.ok) {
        console.error("Document API error:", await res.text());
        setState("error");
        return;
      }

      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
      setState("idle");
    } catch (err) {
      console.error("Document fetch error:", err);
      setState("error");
    }
  }

  const borderColor = !hasDoc
    ? "border-slate-200 bg-slate-50"
    : isExpired
    ? "border-red-200 bg-red-50"
    : "border-green-200 bg-green-50";

  return (
    <div className={`rounded-xl border-2 p-4 space-y-2 ${borderColor}`}>
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-700 text-sm">
          {icon} {label}
        </span>
        {hasDoc ? (
          isExpired ? (
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              EXPIRÉ
            </span>
          ) : (
            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              VALIDE
            </span>
          )
        ) : (
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
            MANQUANT
          </span>
        )}
      </div>

      {/* Date d'expiration */}
      {expiryStr && (
        <p className={`text-xs ${isExpired ? "text-red-600 font-semibold" : "text-slate-500"}`}>
          Expiration : {expiryStr}
        </p>
      )}

      {/* Bouton ou message vide */}
      {hasDoc ? (
        <>
          <button
            onClick={openDocument}
            disabled={state === "loading"}
            className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition w-full justify-center disabled:opacity-60"
          >
            {state === "loading" ? (
              <>⏳ Chargement…</>
            ) : (
              <>🔒 Consulter le document</>
            )}
          </button>
          {state === "error" && (
            <p className="text-[11px] text-red-500 text-center">
              Impossible d'obtenir le document. Réessayez.
            </p>
          )}
          <p className="text-[10px] text-slate-400 text-center">
            Lien temporaire · expire dans 15 min
          </p>
        </>
      ) : (
        <div className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs text-slate-400 text-center">
          ❌ Aucun document
        </div>
      )}
    </div>
  );
}
