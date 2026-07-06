/**
 * Bus d'événements minimal permettant à `api.ts` (hors arbre React) de notifier
 * `AuthProvider` qu'une session doit être considérée comme expirée (401 non récupérable
 * même après tentative de rafraîchissement du token).
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function emitSessionExpired() {
  listeners.forEach((listener) => listener());
}

export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
