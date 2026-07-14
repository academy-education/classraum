/**
 * Weekly study-plan generator (P3 of the score-plan engine).
 *
 * Pure + deterministic. Turns the score gap + weak areas + the student's
 * daily-minutes goal into a concrete "this week" plan: a weekly workload
 * (sessions / questions / minutes), the pace needed to close the gap by
 * test day, and the 2–3 weak topics to attack first. The gap fields are
 * nullable so the plan still renders before a diagnostic exists (focus +
 * workload without the points framing).
 */

export interface WeakTopic {
  slug: string
  name_en: string
  name_ko: string
  masteryScore: number // 0–100
}

export interface PlanInput {
  gap: number | null          // goal - predicted (positive = points to gain)
  weeksToTest: number | null
  dailyGoalMinutes: number
  weakTopics: WeakTopic[]      // ranked weakest-first by the caller
}

export interface FocusItem {
  slug: string
  name_en: string
  name_ko: string
  masteryScore: number
}

export interface WeekPlan {
  gap: number | null
  weeksToTest: number | null
  weeklyMinutes: number
  weeklySessions: number
  weeklyQuestions: number
  /** Points/week needed to reach the goal by test day (null without a gap+date). */
  perWeekPoints: number | null
  focus: FocusItem[]
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const ACTIVE_DAYS_PER_WEEK = 5
const MINUTES_PER_SESSION = 25
const QUESTIONS_PER_SESSION = 8

export function buildWeekPlan(input: PlanInput): WeekPlan {
  const daily = clamp(Math.round(input.dailyGoalMinutes || 30), 5, 240)
  const weeklyMinutes = daily * ACTIVE_DAYS_PER_WEEK
  const weeklySessions = clamp(Math.round(weeklyMinutes / MINUTES_PER_SESSION), 3, 12)
  const weeklyQuestions = weeklySessions * QUESTIONS_PER_SESSION

  const perWeekPoints =
    input.gap != null && input.gap > 0 && input.weeksToTest != null && input.weeksToTest > 0
      ? Math.max(0, Math.round(input.gap / input.weeksToTest))
      : null

  const focus: FocusItem[] = input.weakTopics.slice(0, 3).map(w => ({
    slug: w.slug,
    name_en: w.name_en,
    name_ko: w.name_ko,
    masteryScore: Math.round(w.masteryScore),
  }))

  return { gap: input.gap, weeksToTest: input.weeksToTest, weeklyMinutes, weeklySessions, weeklyQuestions, perWeekPoints, focus }
}
