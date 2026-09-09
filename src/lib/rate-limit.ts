/**
 * Rate limiter en mémoire pour la page de login.
 * Max 5 tentatives par IP sur une fenêtre de 15 minutes.
 * Reset automatique après une connexion réussie.
 */

const MAX_ATTEMPTS = 3;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface Entry {
  count: number;
  firstAttempt: number;
}

const store = new Map<string, Entry>();

export function checkRateLimit(key: string): {
  allowed: boolean;
  remaining: number;
  resetInMinutes: number;
} {
  const now = Date.now();
  const entry = store.get(key);

  // Première tentative ou fenêtre expirée → on repart à zéro
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    store.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetInMinutes: 0 };
  }

  // Fenêtre active — trop de tentatives
  if (entry.count >= MAX_ATTEMPTS) {
    const resetInMs = WINDOW_MS - (now - entry.firstAttempt);
    const resetInMinutes = Math.ceil(resetInMs / 1000 / 60);
    return { allowed: false, remaining: 0, resetInMinutes };
  }

  // Fenêtre active — tentative autorisée
  entry.count++;
  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - entry.count,
    resetInMinutes: 0,
  };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}