"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { createAdminAction } from "../../actions";

export default function CreateAdminForm() {
  const [state, action, pending] = useActionState(createAdminAction, null);
  const [success, setSuccess] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) wasPending.current = true;
    if (wasPending.current && !pending && state === null) {
      setSuccess(true);
      wasPending.current = false;
    }
  }, [state, pending]);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">
        ➕ Ajouter un administrateur
      </h2>

      {success && (
        <p className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          ✅ Administrateur créé avec succès.
        </p>
      )}

      <form action={action} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Nom</label>
          <input type="text" name="name" required className="input w-full" placeholder="Prénom Nom" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Email</label>
          <input type="email" name="email" required className="input w-full" placeholder="admin@exemple.com" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Mot de passe</label>
          <input type="password" name="password" required minLength={8} className="input w-full" placeholder="8 caractères minimum" />
        </div>

        {state?.error && (
          <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Création..." : "Créer l'administrateur"}
        </button>
      </form>
    </div>
  );
}