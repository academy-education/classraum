/**
 * One first-run overlay at a time.
 *
 * On a brand-new academy account the WelcomeModal (a centred, three-slide
 * dialog mounted by the app layout) and the NamePrompt banner (a fixed
 * bottom bar mounted by AuthWrapper) both decide to show on the very
 * first load. They are in different trees with different stores —
 * localStorage vs a users column — so neither could see the other, and
 * the first thing a new manager saw was two overlays at once.
 *
 * The welcome wins the tie: it is modal, it explains the product, and it
 * is dismissed in a few seconds. The name banner is a persistent,
 * snoozeable nudge, so deferring it costs nothing — it renders the
 * moment the welcome closes, in the same page load, because this is live
 * state and not a stored flag.
 *
 * Deliberately NOT a context provider: the two components sit on
 * opposite sides of the layout tree and wrapping both would mean
 * threading a provider through AuthWrapper for one boolean.
 */

let welcomeOpen = false
const listeners = new Set<() => void>()

/** Called by the WelcomeModal whenever its open state changes. */
export function setWelcomeModalOpen(open: boolean): void {
  if (welcomeOpen === open) return
  welcomeOpen = open
  for (const l of listeners) l()
}

export function isWelcomeModalOpen(): boolean {
  return welcomeOpen
}

export function subscribeWelcomeModal(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Server snapshot for useSyncExternalStore — nothing is open during SSR. */
export function getWelcomeModalServerSnapshot(): boolean {
  return false
}
