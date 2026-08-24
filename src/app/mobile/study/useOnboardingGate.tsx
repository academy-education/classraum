"use client"

import { useEffect, useRef, useState } from 'react'
import { authHeaders } from '@/lib/auth-headers'
import { useLandingData } from './LandingDataProvider'
import { markOnboardingHandled } from './_shared/onboarding-signal'
import { isAvailableTargetTest } from '@/lib/study/target-tests'

/** Returns true when the student needs the onboarding wizard
 *  (first visit + no onboarded_at set yet). Null while loading so
 *  the landing doesn't flash the wizard on a returning user.
 *
 *  Prefers the shared LandingDataProvider payload when mounted so we
 *  don't double-fetch /api/study/prefs. Falls back to the standalone
 *  endpoint when the provider isn't in the tree (e.g., if this hook
 *  is used on a non-landing surface in the future).
 *
 *  CAMP STUDENTS ARE NEVER ASKED.
 *  Step 1 of the wizard is "What are you preparing for?" — but a camp
 *  student's teacher already enrolled them in a program that carries a
 *  `test_family`. Asking re-opens a question the camp has answered, and
 *  a wrong tap reshapes the study path away from the camp they are
 *  sitting in.
 *
 *  We SKIP the wizard rather than pre-filling step 1 and showing the
 *  other four. The remaining steps (grade level, daily minutes, default
 *  language + difficulty, nickname/avatar) are all optional and all
 *  already have defaults on the prefs row — the wizard itself persists
 *  `onboarded_at` and nothing else when every step is skipped. So the
 *  only load-bearing answer is the one the camp already gives, and four
 *  skippable screens between a student and their teacher's assignment
 *  buy nothing. Everything asked here stays editable in study
 *  preferences.
 *
 *  The auto-answer writes the same columns the wizard would: the camp's
 *  test families as `target_tests`, the current camp's family as the
 *  `target_test` focus pointer, and `onboarded_at` so it happens once.
 *  Families outside AVAILABLE_TARGET_TESTS are dropped — the wizard
 *  renders those locked, and writing one would point the student at a
 *  test with no content. */
export function useOnboardingGate(): { needsOnboarding: boolean | null; markComplete: () => void } {
  const landingData = useLandingData()
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)
  /* The provider hands back a fresh context object on every render (and
     DailyGoalCelebration refetches it every 30s), so this effect re-runs
     freely. That was harmless while it only called setState; the camp
     auto-answer is a WRITE, and without this latch it would PUT prefs on
     every one of those renders until the refetch happened to land. */
  const campAnswered = useRef(false)

  useEffect(() => {
    // Provider path: read from the shared context.
    if (landingData) {
      if (landingData.loading) return
      // prefs === null after loading means the landing fetch FAILED
      // (the API auto-creates a prefs row, so a real first visit still
      // returns one). Never full-screen the wizard over a returning
      // user because of a transient error.
      if (!landingData.prefs) {
        setNeedsOnboarding(false)
        return
      }
      if (landingData.prefs.onboarded_at) {
        setNeedsOnboarding(false)
        return
      }

      // First visit. Camp students get the answer written for them.
      if (landingData.camp?.isCamp) {
        setNeedsOnboarding(false)
        markOnboardingHandled()
        if (!campAnswered.current) {
          campAnswered.current = true
          void autoAnswerForCamp(landingData.camp.testFamilies, landingData.camp.primaryTestFamily)
        }
        return
      }

      setNeedsOnboarding(true)
      // Tell the NavTour a flow is already using this page load.
      markOnboardingHandled()
      return
    }
    // Fallback path: no provider, fetch directly. No camp signal here —
    // the wizard only mounts on the landing, which always has the
    // provider; this path exists for non-landing consumers.
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/prefs', { headers })
        if (!res.ok) {
          if (!cancelled) setNeedsOnboarding(false)
          return
        }
        const json = await res.json()
        if (!cancelled) {
          const needs = !json.prefs?.onboarded_at
          setNeedsOnboarding(needs)
          if (needs) markOnboardingHandled()
        }
      } catch {
        if (!cancelled) setNeedsOnboarding(false)
      }
    })()
    return () => { cancelled = true }
  }, [landingData])

  return {
    needsOnboarding,
    markComplete: () => setNeedsOnboarding(false),
  }
}

/** Persist the camp's answer to step 1 + close onboarding. Best-effort:
 *  a failed write just means the student is asked on a later visit,
 *  which is the pre-existing behaviour, not a new failure. */
async function autoAnswerForCamp(families: string[], primary: string | null): Promise<void> {
  try {
    const all = families.map(f => f.toLowerCase()).filter(isAvailableTargetTest)
    const focus = isAvailableTargetTest(primary) ? String(primary).toLowerCase() : (all[0] ?? null)
    /* FOCUS FIRST, AND SEND ONLY THE LIST.
     *
     * PUT /api/study/prefs keeps target_test and target_tests in lockstep,
     * but the two branches are `if / else if`: when BOTH keys are present
     * the target_test branch wins and REPLACES target_tests with
     * `[...existingInDb, target_test]`. Sending {tests:['sat','toefl'],
     * test:'sat'} stored `['sat']` — measured, not inferred: the camp
     * student sits in both an SAT and a TOEFL program and came back with
     * target_tests = ["sat"].
     *
     * So send the list alone; the else-branch then sets the focus pointer
     * to list[0] when none is set, which is why the focus is sorted to the
     * front. (The wizard sends both keys and loses the same way — that is
     * a pre-existing defect in the route, not something this fixes.) */
    const tests = focus ? [focus, ...all.filter(t => t !== focus)] : all
    const headers = await authHeaders()
    await fetch('/api/study/prefs', {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // A camp on a test we do not carry yet (AVAILABLE_TARGET_TESTS)
        // still closes onboarding — the wizard could not have taken that
        // answer either — it just leaves the target columns alone rather
        // than writing a test with no content.
        ...(tests.length > 0 ? { target_tests: tests } : {}),
        onboarded_at: new Date().toISOString(),
      }),
    })
  } catch {
    /* see doc comment */
  }
}
