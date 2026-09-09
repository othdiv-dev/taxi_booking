"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";
import { LogoMark } from "@/components/site/Logo";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <main className="grid min-h-screen place-items-center gradient-navy px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <LogoMark className="h-14 w-14" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-navy-foreground">
            City<span className="text-aqua">Taxi</span>
          </h1>
          <p className="mt-1 text-sm text-navy-muted">Espace Administration</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-navy-foreground/10 bg-navy-soft p-8 shadow-lift">
          <h2 className="mb-6 text-base font-semibold text-navy-foreground">Connexion</h2>

          <form action={formAction} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-muted">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-navy-foreground/15 bg-navy-foreground/5 px-4 py-3 text-sm text-navy-foreground placeholder-navy-muted outline-none transition focus:border-aqua focus:ring-2 focus:ring-aqua/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-muted">
                Mot de passe
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-navy-foreground/15 bg-navy-foreground/5 px-4 py-3 text-sm text-navy-foreground placeholder-navy-muted outline-none transition focus:border-aqua focus:ring-2 focus:ring-aqua/20"
              />
            </div>

            {state?.error && (
              <p className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow transition hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
            >
              {pending ? "Connexion..." : "Se connecter →"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
