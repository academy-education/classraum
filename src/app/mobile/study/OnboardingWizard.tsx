"use client"

import { useEffect, useRef, useState } from 'react'
import { Sparkles, Target, GraduationCap, Clock, ArrowRight, Check, Loader2, Globe, AtSign, X } from '@/app/mobile/study/_shared/icons'
import { authHeaders } from '@/lib/auth-headers'
import { track } from '@/lib/study/track-client'
import { useTranslation } from '@/hooks/useTranslation'
import { ModalPortal } from '@/components/ui/modal-portal'
import { validateNickname, normalizeNickname } from '@/lib/study/nickname'
import { StudyButton } from '@/app/mobile/study/_shared/StudyButton'
import { PersonAvatar, STUDY_AVATARS } from '@/app/mobile/study/_shared/avatars'
import { STUDY_AVATAR_IDS } from '@/lib/study/avatars'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'
import { GOAL_SCALES, goalTestsFor } from '@/lib/study/goal-scales'
import { isAvailableTargetTest } from '@/lib/study/target-tests'

type Difficulty = 'warmup' | 'balanced' | 'challenge'
/**
 * Step 1 mirrors the target-test section of study preferences, which is
 * multi-select: a student can prep for SAT *and* TOEFL.
 *
 * `targetTests` is the set; `targetTest` is the FOCUS pointer within it
 * — the one that drives the StudyPath and the predicted score. Both are
 * kept because the prefs route keeps the two columns in lockstep and
 * every downstream reader expects a single focus.
 *
 * `goalScores` replaces the old single `goalScore`, which was SAT-only:
 * a student who picked TOEFL during onboarding was never asked for a
 * goal at all, even though preferences has offered a TOEFL goal for
 * weeks. Keyed by lowercase test id, same shape the route stores.
 */
interface Step1 { targetTests: string[]; targetTest: string | null; goalScores: Record<string, number> }
interface Step2 { gradeLevel: string | null }
interface Step3 { dailyGoalMinutes: number }
interface Step4 { defaultLanguage: 'en' | 'ko'; defaultDifficulty: Difficulty }

const TOTAL_STEPS = 5

// Goal-score presets come from the SHARED table so onboarding and
// preferences cannot drift — they did, and the drift was silent: this
// file had a SAT-only array while preferences offered SAT and TOEFL.
// Captured up front so the predicted-score card shows the motivating
// "X to go" gap from day one instead of "Set a goal score".

// `available` mirrors the landing-grid lock: only the SAT is open for
// now; the rest render dimmed with a "Soon" chip so new students can't
// onboard onto a test that has no content yet.
// `available` mirrors AVAILABLE_TARGET_TESTS rather than repeating it:
// the camp auto-answer in useOnboardingGate reads the same list, and a
// private copy here is how GOAL_SCALES drifted before it was shared.
const TESTS = [
  { value: 'sat',   label_en: 'SAT',         label_ko: 'SAT'    },
  { value: 'toefl', label_en: 'TOEFL',       label_ko: 'TOEFL'  },
  { value: 'ksat',  label_en: 'KSAT (수능)', label_ko: '수능'   },
  { value: 'toeic', label_en: 'TOEIC',       label_ko: 'TOEIC'  },
  { value: 'ielts', label_en: 'IELTS',       label_ko: 'IELTS'  },
  { value: 'act',   label_en: 'ACT',         label_ko: 'ACT'    },
  { value: 'ap',    label_en: 'AP Exams',    label_ko: 'AP 시험' },
  { value: 'gre',   label_en: 'GRE',         label_ko: 'GRE'    },
].map(x => ({ ...x, available: isAvailableTargetTest(x.value) }))

const GRADES = [
  { value: 'middle',     label_en: 'Middle School', label_ko: '중학생' },
  { value: 'high',       label_en: 'High School',   label_ko: '고등학생' },
  { value: 'college',    label_en: 'College',       label_ko: '대학생' },
  { value: 'adult',      label_en: 'Adult learner', label_ko: '성인 학습자' },
]

const GOAL_PRESETS = [15, 30, 60, 90]

/**
 * 5-step onboarding wizard shown on first visit to the study landing.
 * Asks for target test + goal, grade level, daily goal, default
 * language/difficulty, and an optional nickname. Saves to prefs (and the
 * nickname to its own route) and sets onboarded_at so it never re-shows.
 *
 * Each step can be skipped; a fully-skipped onboarding still
 * persists onboarded_at so the user isn't re-prompted. Defaults
 * apply to the unset fields.
 */
export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  // Step 5's nickname field is the only text input in the wizard, and
  // the sheet is bottom-anchored, so without this it opens straight
  // under the keyboard.
  const keyboardInset = useKeyboardInset()

  /*
   * Bring the focused field into view inside the sheet.
   *
   * The sheet already lifts above the keyboard (`bottom: keyboardInset`)
   * and scrolls internally (`overflow-y-auto`) — but nothing ever
   * scrolled it, so on step 5 the nickname input stayed below the fold
   * with the keys over it. Reported from a real device; neither audit
   * could reproduce it because Chrome cannot emulate an iOS keyboard.
   *
   * Scoped to this sheet rather than the document: the wizard is modal,
   * and a document-level listener would fight the auth page's own.
   * 'center' rather than 'nearest' for the same reason as there — a
   * field whose top edge is just visible counts as in-view to 'nearest'
   * and would not move.
   */
  const sheetRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return
      // iOS fires focus before the visual viewport reflows for the
      // keyboard; scrolling on the same tick scrolls stale geometry.
      window.setTimeout(() => {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 250)
    }
    sheet.addEventListener('focusin', onFocusIn)
    return () => sheet.removeEventListener('focusin', onFocusIn)
  }, [])
  const { t, language } = useTranslation()
  const ko = language === 'korean'

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [s1, setS1] = useState<Step1>({ targetTests: [], targetTest: null, goalScores: {} })
  const [s2, setS2] = useState<Step2>({ gradeLevel: null })
  const [s3, setS3] = useState<Step3>({ dailyGoalMinutes: 30 })
  const [s4, setS4] = useState<Step4>({ defaultLanguage: ko ? 'ko' : 'en', defaultDifficulty: 'balanced' })
  // Avatar rides on step 5 with the nickname rather than becoming a
  // sixth step: it is the same question ("who are you here"), and every
  // extra step in a first-run wizard costs completions.
  //
  // PRESET ONLY. The full builder writes `avatar_config`, whose column
  // needs migration 072 — not applied — so offering it here would let a
  // student build a face during onboarding and lose it on the next load.
  // `avatar_id` is 071 and writes today. Profile carries the builder.
  const [avatarId, setAvatarId] = useState<string | null>(null)
  const [nickname, setNickname] = useState('')
  const [nickStatus, setNickStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [saving, setSaving] = useState(false)
  const nickDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Live nickname availability check (debounced) on step 5.
  useEffect(() => {
    const n = nickname.trim()
    if (n.length === 0) { setNickStatus('idle'); return }
    if (validateNickname(n)) { setNickStatus('invalid'); return }
    setNickStatus('checking')
    if (nickDebounce.current) clearTimeout(nickDebounce.current)
    nickDebounce.current = setTimeout(async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch(`/api/study/nickname?check=${encodeURIComponent(n)}`, { headers })
        const json = await res.json()
        setNickStatus(json.available ? 'available' : (json.reason === 'taken' ? 'taken' : 'invalid'))
      } catch { setNickStatus('idle') }
    }, 400)
    return () => { if (nickDebounce.current) clearTimeout(nickDebounce.current) }
  }, [nickname])

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const finish = async (skipped: boolean) => {
    setSaving(true)
    try {
      const headers = await authHeaders()
      await fetch('/api/study/prefs', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(skipped ? {} : {
            target_tests: s1.targetTests,
            // The focus pointer. The route keeps the two columns in
            // lockstep, but sending it explicitly means the student's
            // chosen focus survives rather than defaulting to list[0].
            target_test: s1.targetTest,
            goal_scores: s1.goalScores,
            grade_level: s2.gradeLevel,
            daily_goal_minutes: s3.dailyGoalMinutes,
            default_language: s4.defaultLanguage,
            default_difficulty: s4.defaultDifficulty,
            // Only when chosen. Sending `avatar_id: null` would be an
            // explicit "clear it" to the route, which is a different
            // thing from "didn't pick one" and would stomp a value if
            // onboarding is ever re-run.
            ...(avatarId ? { avatar_id: avatarId } : {}),
          }),
          onboarded_at: new Date().toISOString(),
        }),
      })
      // Nickname is its own route + uniqueness rules. Best-effort: only
      // save a valid, un-taken handle; a collision just leaves it unset
      // (the student can pick one later in Profile). Never blocks onboarding.
      if (!skipped) {
        const n = normalizeNickname(nickname)
        if (n && !validateNickname(n) && nickStatus !== 'taken') {
          await fetch('/api/study/nickname', {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: n }),
          }).catch(() => {})
        }
      }
    } catch {
      // Still close the wizard — student can adjust prefs later from the profile.
    }
    track('onboarding_completed', { skipped, targetTest: skipped ? null : s1.targetTest })
    onComplete()
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm animate-fade-in" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        // z-[121] to sit above the safe-area bars (z-100) so the scrim
        // covers the full screen edge-to-edge, and above BottomNavigation
        // (z-50) — otherwise the
        // tab bar covers the wizard's Skip/Next action bar and users
        // can't advance past step 1. Safe-area padding keeps the
        // action bar clear of the iOS home indicator too.
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 z-[121] overflow-y-auto rounded-t-3xl bg-white shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.18)] animate-slide-up"
        style={{
          // Lift the whole sheet off the keyboard, and shrink it by the
          // same amount so the sticky action bar at the bottom stays
          // reachable instead of being pushed off the top.
          //
          // `bottom-0` alone resolves against the LAYOUT viewport, which
          // does not shrink for the keyboard — so the sheet stayed
          // welded to the physical bottom of the screen and the nickname
          // field on step 5 sat behind the keys. env(safe-area-inset-*)
          // does not help: it tracks the home indicator, not the
          // keyboard.
          bottom: keyboardInset,
          maxHeight: `calc(92dvh - ${keyboardInset}px)`,
          // The home indicator is only there when the keyboard is not.
          paddingBottom: keyboardInset ? 0 : 'env(safe-area-inset-bottom)',
          transition: 'bottom 180ms ease-out, max-height 180ms ease-out',
        }}
      >
        <div className="pt-2.5 pb-1.5 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 pb-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
            <span
              key={n}
              className={`h-1 rounded-full transition-all ${
                n === step ? 'w-8 bg-primary' : n < step ? 'w-1.5 bg-emerald-400' : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="px-5 pt-2 pb-4">
          {step === 1 && (
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                  {String(t('study.onboarding.step1Eyebrow'))}
                </span>
              </div>
              <h2 className="text-[22px] font-semibold tracking-tight text-gray-900 leading-tight">
                {String(t('study.onboarding.step1Title'))}
              </h2>
              <p className="text-[13.5px] text-gray-500 mt-1.5 leading-relaxed">
                {String(t('study.onboarding.step1Subtitle'))}
              </p>
              {/* Target test — MULTI-SELECT, identical in behaviour to the
                  target-test group in study preferences. Tapping an
                  unselected chip adds it and makes it the focus; tapping
                  a selected-but-unfocused chip promotes it to focus;
                  tapping the focused chip does nothing. Removal is a
                  deliberate ✕, never a second tap — a tap that silently
                  deselects reads as an accidental cancel, which is why
                  preferences settled on this shape. */}
              <div className="grid grid-cols-2 gap-2 mt-5">
                {TESTS.map(test => {
                  const selected = s1.targetTests.includes(test.value)
                  const focused = s1.targetTest === test.value
                  // A locked test stays tappable if it is somehow already
                  // selected, so a student can always remove one.
                  const locked = !test.available && !selected
                  return (
                    <div key={test.value} className="relative">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => setS1(prev => {
                          if (selected) {
                            return focused ? prev : { ...prev, targetTest: test.value }
                          }
                          return {
                            ...prev,
                            targetTests: [...prev.targetTests, test.value],
                            targetTest: test.value,
                          }
                        })}
                        className={`relative w-full h-12 rounded-2xl text-[14px] font-semibold transition-all ${
                          selected
                            ? focused
                              ? 'bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-4px_rgba(40,133,232,0.4)] ring-1 ring-primary/30'
                              : 'bg-primary/10 text-primary ring-1 ring-primary/25 active:scale-[0.98]'
                            : locked
                              ? 'bg-gray-50 text-gray-400 ring-1 ring-gray-200/60 cursor-not-allowed'
                              : 'bg-white text-gray-700 ring-1 ring-gray-200/70 hover:ring-primary/30 active:scale-[0.98]'
                        }`}
                      >
                        {ko ? test.label_ko : test.label_en}
                        {focused && (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-[0.1em] text-white/80">
                            {ko ? '주력' : 'Focus'}
                          </span>
                        )}
                        {locked && (
                          <span className="absolute top-1.5 right-1.5 rounded-full bg-gray-200/80 px-1.5 py-0.5 text-[8.5px] font-bold tracking-[0.08em] uppercase text-gray-500">
                            {ko ? '준비 중' : 'Soon'}
                          </span>
                        )}
                      </button>
                      {selected && (
                        <button
                          type="button"
                          aria-label={ko ? `${test.label_ko} 제거` : `Remove ${test.label_en}`}
                          onClick={() => setS1(prev => {
                            const next = prev.targetTests.filter(v => v !== test.value)
                            // Dropping the focused test hands focus to
                            // whatever is left, so the wizard can never
                            // finish with targets but no focus — which
                            // would leave the StudyPath with nothing to
                            // build against.
                            const nextFocus = prev.targetTest === test.value
                              ? (next[0] ?? null)
                              : prev.targetTest
                            // Drop the goal too; a goal for a test you
                            // are not preparing for is a stale number
                            // nobody would think to clear.
                            const goals = { ...prev.goalScores }
                            delete goals[test.value.toLowerCase()]
                            return { targetTests: next, targetTest: nextFocus, goalScores: goals }
                          })}
                          className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm ring-1 transition-transform active:scale-90 ${
                            focused ? 'bg-white text-primary ring-primary/20' : 'bg-white text-gray-500 ring-gray-200'
                          }`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Goal score — one row per selected test that has a known
                  scale, exactly as preferences renders it. Labelled with
                  the test name only when there are two, so the common
                  single-target case stays uncluttered. */}
              {goalTestsFor(s1.targetTests, s1.targetTest).map((test, _i, all) => (
                <div key={test} className="mt-5">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.10em] text-gray-400 mb-2">
                    {all.length > 1
                      ? `${test.toUpperCase()} ${ko ? '목표 점수' : 'goal'}`
                      : (ko ? '목표 점수' : 'Goal score')}
                  </p>
                  <div className={`grid gap-2 ${GOAL_SCALES[test].length >= 6 ? 'grid-cols-6' : 'grid-cols-5'}`}>
                    {GOAL_SCALES[test].map(score => {
                      const selected = s1.goalScores[test] === score
                      return (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setS1(prev => {
                            const goals = { ...prev.goalScores }
                            if (selected) delete goals[test]
                            else goals[test] = score
                            return { ...prev, goalScores: goals }
                          })}
                          className={`h-11 rounded-xl text-[13px] font-semibold tabular-nums transition-all ${
                            selected
                              ? 'bg-gradient-to-b from-primary to-primary/90 text-white ring-1 ring-primary/30'
                              : 'bg-white text-gray-700 ring-1 ring-gray-200/70 hover:ring-primary/30 active:scale-[0.98]'
                          }`}
                        >
                          {score}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                  {String(t('study.onboarding.step2Eyebrow'))}
                </span>
              </div>
              <h2 className="text-[22px] font-semibold tracking-tight text-gray-900 leading-tight">
                {String(t('study.onboarding.step2Title'))}
              </h2>
              <p className="text-[13.5px] text-gray-500 mt-1.5 leading-relaxed">
                {String(t('study.onboarding.step2Subtitle'))}
              </p>
              <div className="grid grid-cols-1 gap-2 mt-5">
                {GRADES.map(grade => {
                  const selected = s2.gradeLevel === grade.value
                  return (
                    <button
                      key={grade.value}
                      type="button"
                      onClick={() => setS2({ gradeLevel: selected ? null : grade.value })}
                      className={`flex items-center justify-between h-12 px-4 rounded-2xl text-[14.5px] font-semibold transition-all ${
                        selected
                          ? 'bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-4px_rgba(40,133,232,0.4)] ring-1 ring-primary/30'
                          : 'bg-white text-gray-700 ring-1 ring-gray-200/70 hover:ring-primary/30 active:scale-[0.99]'
                      }`}
                    >
                      <span>{ko ? grade.label_ko : grade.label_en}</span>
                      {selected && <Check className="w-4 h-4" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                  {String(t('study.onboarding.step3Eyebrow'))}
                </span>
              </div>
              <h2 className="text-[22px] font-semibold tracking-tight text-gray-900 leading-tight">
                {String(t('study.onboarding.step3Title'))}
              </h2>
              <p className="text-[13.5px] text-gray-500 mt-1.5 leading-relaxed">
                {String(t('study.onboarding.step3Subtitle'))}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-5">
                {GOAL_PRESETS.map(m => {
                  const selected = s3.dailyGoalMinutes === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setS3({ dailyGoalMinutes: m })}
                      className={`h-14 rounded-2xl text-[15px] font-bold transition-all ${
                        selected
                          ? 'bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-4px_rgba(40,133,232,0.4)] ring-1 ring-primary/30'
                          : 'bg-white text-gray-700 ring-1 ring-gray-200/70 hover:ring-primary/30 active:scale-[0.98]'
                      }`}
                    >
                      {ko ? `${m}분` : `${m} min`}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-sky-600" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                  {ko ? '4 / 5 단계' : 'Step 4 of 5'}
                </span>
              </div>
              <h2 className="text-[22px] font-semibold tracking-tight text-gray-900 leading-tight">
                {ko ? '기본값을 정해요' : 'Set your defaults'}
              </h2>
              <p className="text-[13.5px] text-gray-500 mt-1.5 leading-relaxed">
                {ko ? '연습에 기본으로 쓸 언어와 난이도예요. 언제든 바꿀 수 있어요.' : 'The default language and difficulty for your practice. Change these anytime.'}
              </p>

              <p className="text-[12px] font-semibold uppercase tracking-[0.10em] text-gray-400 mt-5 mb-2">
                {ko ? '언어' : 'Language'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'en' as const, label: 'English' },
                  { value: 'ko' as const, label: '한국어' },
                ]).map(o => {
                  const selected = s4.defaultLanguage === o.value
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setS4(prev => ({ ...prev, defaultLanguage: o.value }))}
                      className={`h-12 rounded-2xl text-[14px] font-semibold transition-all ${
                        selected
                          ? 'bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-4px_rgba(40,133,232,0.4)] ring-1 ring-primary/30'
                          : 'bg-white text-gray-700 ring-1 ring-gray-200/70 hover:ring-primary/30 active:scale-[0.98]'
                      }`}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>

              <p className="text-[12px] font-semibold uppercase tracking-[0.10em] text-gray-400 mt-5 mb-2">
                {ko ? '난이도' : 'Difficulty'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'warmup' as const,    label: String(t('study.testConfig.difficultyWarmup')) },
                  { value: 'balanced' as const,  label: String(t('study.testConfig.difficultyBalanced')) },
                  { value: 'challenge' as const, label: String(t('study.testConfig.difficultyChallenge')) },
                ]).map(o => {
                  const selected = s4.defaultDifficulty === o.value
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setS4(prev => ({ ...prev, defaultDifficulty: o.value }))}
                      className={`h-12 rounded-2xl text-[13.5px] font-semibold transition-all ${
                        selected
                          ? 'bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-4px_rgba(40,133,232,0.4)] ring-1 ring-primary/30'
                          : 'bg-white text-gray-700 ring-1 ring-gray-200/70 hover:ring-primary/30 active:scale-[0.98]'
                      }`}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <AtSign className="w-4 h-4 text-violet-600" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
                  {ko ? '5 / 5 단계' : 'Step 5 of 5'}
                </span>
              </div>
              <h2 className="text-[22px] font-semibold tracking-tight text-gray-900 leading-tight">
                {ko ? '프로필을 만들어요' : 'Make it yours'}
              </h2>
              <p className="text-[13.5px] text-gray-500 mt-1.5 leading-relaxed">
                {ko ? '리더보드와 친구에게 보여요. 둘 다 나중에 바꿀 수 있어요. (선택)' : 'Shown on the leaderboard and to friends. Both can be changed later. (optional)'}
              </p>

              {/* Same scroll-row convention as the profile picker and the
                  topic shelves: bleed to the screen edge so the row reads
                  as scrollable instead of stopping at the card padding. */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x -mx-5 px-5 scroll-px-5 py-3 mt-3">
                {STUDY_AVATAR_IDS.map(id => {
                  const on = avatarId === id
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={on}
                      // Tapping the chosen one clears it — otherwise the
                      // first tap is irreversible without finishing and
                      // going to Profile, and there is no "none" tile.
                      onClick={() => setAvatarId(on ? null : id)}
                      className={`shrink-0 snap-start rounded-2xl p-1 transition ${
                        on ? 'ring-2 ring-primary bg-primary/5' : 'ring-1 ring-gray-200/70 bg-white'
                      }`}
                    >
                      <PersonAvatar config={STUDY_AVATARS[id]} size={54} />
                    </button>
                  )
                })}
              </div>

              <div className="relative">
                <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  maxLength={16}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={ko ? '닉네임을 정하세요' : 'Choose a nickname'}
                  className="w-full h-12 pl-10 pr-3 rounded-2xl bg-gray-50 ring-1 ring-gray-200/70 text-[15px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-2 px-1 min-h-[18px]">
                {nickStatus === 'checking' && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
                {nickStatus === 'available' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                {(nickStatus === 'taken' || nickStatus === 'invalid') && <X className="w-3.5 h-3.5 text-rose-600" />}
                <span className={`text-[12px] ${
                  nickStatus === 'available' ? 'text-emerald-600'
                  : nickStatus === 'taken' || nickStatus === 'invalid' ? 'text-rose-600'
                  : 'text-gray-400'
                }`}>
                  {nickStatus === 'checking' ? (ko ? '확인 중…' : 'Checking…')
                  : nickStatus === 'available' ? (ko ? '사용 가능해요' : 'Available')
                  : nickStatus === 'taken' ? (ko ? '이미 사용 중이에요' : 'Already taken')
                  : nickStatus === 'invalid' ? (ko ? '2–16자, 문자·숫자·밑줄만' : '2–16 chars, letters/numbers/_')
                  : (ko ? '비워두면 나중에 정할 수 있어요' : 'Leave blank to set it later')}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 px-5 py-4 flex items-center justify-between gap-3 bg-gradient-to-t from-white via-white to-white/80 border-t border-gray-100">
          <button
            type="button"
            onClick={() => void finish(true)}
            disabled={saving}
            className="text-[13px] font-semibold text-gray-500 px-3 h-10 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            {String(t('study.onboarding.skip'))}
          </button>
          {step < TOTAL_STEPS ? (
            <StudyButton
              type="button"
              size="lg"
              onClick={() => setStep((step + 1) as 1 | 2 | 3 | 4 | 5)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="flex-1"
            >
              {String(t('study.onboarding.next'))}
            </StudyButton>
          ) : (
            <StudyButton
              type="button"
              size="lg"
              onClick={() => void finish(false)}
              loading={saving}
              leftIcon={<Sparkles className="w-4 h-4" />}
              className="flex-1"
            >
              {String(t('study.onboarding.finish'))}
            </StudyButton>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}
