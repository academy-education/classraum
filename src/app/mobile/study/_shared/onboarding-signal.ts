/**
 * "An onboarding flow already ran on this page load."
 *
 * Two independent first-run flows live on /mobile/study — the 5-step
 * OnboardingWizard (mounted by the landing, gated on prefs.onboarded_at)
 * and the 4-step NavTour (mounted by the mobile layout, gated on
 * prefs.nav_tour_seen_at). Neither knew about the other, so a brand-new
 * student finished a 5-step wizard and a 4-step tour opened on top of
 * it: nine screens before any work.
 *
 * They are sequenced, not merged: the wizard asks "who are you", the
 * tour answers "where is everything". Both are worth showing — just not
 * in the same breath. The rule is one flow per page load; the second
 * one comes back on the next visit, because its own prefs flag is still
 * unset.
 *
 * A module-level boolean rather than localStorage/sessionStorage on
 * purpose: the unit of sequencing is a page load, and a stored key would
 * either persist too long (sessionStorage survives reloads in the tab)
 * or need an expiry nobody would maintain.
 */
let handledThisLoad = false

/** Called when the wizard is shown, or auto-answered for a camp student. */
export function markOnboardingHandled(): void {
  handledThisLoad = true
}

export function onboardingHandledThisLoad(): boolean {
  return handledThisLoad
}

/** Test-only: the module flag outlives a single test otherwise. */
export function __resetOnboardingSignal(): void {
  handledThisLoad = false
}
