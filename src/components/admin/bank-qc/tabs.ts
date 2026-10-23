/**
 * The views of the bank-QC page, grouped by job (2026-10-23 reorganisation):
 *
 *   overview  supply and use per section, the headline counts
 *   review    the co-founder's blind review tool (ReviewPanel)
 *   drafts    staged AI-drafted passages for a person to fix
 *   live      what is in the bank now: finish bar, readiness, provenance, runs
 *   quality   the open sweep and hardening
 *   register  the plan: open work, settled, found while fixing
 *   history   the checked-in ledger: batches, audited cohorts, baselines,
 *             how questions are made
 *
 * 'all' renders everything (tests, printing).
 */
export type QcTab = 'overview' | 'review' | 'drafts' | 'live' | 'quality' | 'register' | 'history' | 'all'
export type QcView = Exclude<QcTab, 'all'>
export const QC_TABS: QcView[] = ['overview', 'review', 'drafts', 'live', 'quality', 'register', 'history']

/** Links written before the reorganisation (docs, sitting briefs) keep working. */
const LEGACY: Record<string, QcView> = {
  hardening: 'quality',
  sweep: 'quality',
  runs: 'history',
  reference: 'history',
}

export function normaliseTab(v: string | null | undefined): QcView | null {
  if (!v) return null
  if ((QC_TABS as string[]).includes(v)) return v as QcView
  return LEGACY[v] ?? null
}

export function tabFromSearch(search: string): QcView {
  return normaliseTab(new URLSearchParams(search).get('tab')) ?? 'overview'
}

export const TAB_STORAGE_KEY = 'admin.bankQc.tab'

/**
 * The tab to open: the URL's ?tab= wins (a shared link must land where it
 * points), then the #hash, then the last tab this browser used.
 */
export function initialTab(loc: { search: string; hash: string }, stored: string | null): QcView {
  return normaliseTab(new URLSearchParams(loc.search).get('tab'))
    ?? normaliseTab(loc.hash.replace(/^#/, ''))
    ?? normaliseTab(stored)
    ?? 'overview'
}
