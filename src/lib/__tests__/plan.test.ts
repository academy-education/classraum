/** @jest-environment node */
import { buildWeekPlan, type WeakTopic } from '../study/plan'

const weak: WeakTopic[] = [
  { slug: 'algebra', name_en: 'Algebra', name_ko: '대수', masteryScore: 42 },
  { slug: 'craft', name_en: 'Craft & Structure', name_ko: '어법', masteryScore: 55 },
  { slug: 'geometry', name_en: 'Geometry', name_ko: '기하', masteryScore: 61 },
  { slug: 'ideas', name_en: 'Info & Ideas', name_ko: '정보', masteryScore: 70 },
]

describe('buildWeekPlan', () => {
  it('derives a weekly workload from the daily goal', () => {
    const p = buildWeekPlan({ gap: 120, weeksToTest: 6, dailyGoalMinutes: 30, weakTopics: weak })
    expect(p.weeklyMinutes).toBe(150) // 30 * 5 days
    expect(p.weeklySessions).toBe(6)  // 150 / 25
    expect(p.weeklyQuestions).toBe(48)
  })

  it('computes the points/week pace to close the gap', () => {
    const p = buildWeekPlan({ gap: 120, weeksToTest: 6, dailyGoalMinutes: 30, weakTopics: weak })
    expect(p.perWeekPoints).toBe(20)
  })

  it('picks the 3 weakest topics as focus', () => {
    const p = buildWeekPlan({ gap: 120, weeksToTest: 6, dailyGoalMinutes: 30, weakTopics: weak })
    expect(p.focus.map(f => f.slug)).toEqual(['algebra', 'craft', 'geometry'])
  })

  it('renders without a gap/date (pre-diagnostic) — workload only, no pace', () => {
    const p = buildWeekPlan({ gap: null, weeksToTest: null, dailyGoalMinutes: 45, weakTopics: weak })
    expect(p.perWeekPoints).toBeNull()
    expect(p.weeklyMinutes).toBe(225)
    expect(p.focus.length).toBe(3)
  })

  it('no pace when already at/over goal', () => {
    const p = buildWeekPlan({ gap: -20, weeksToTest: 4, dailyGoalMinutes: 30, weakTopics: weak })
    expect(p.perWeekPoints).toBeNull()
  })

  it('clamps sessions into a sane range for a huge daily goal', () => {
    const p = buildWeekPlan({ gap: null, weeksToTest: null, dailyGoalMinutes: 240, weakTopics: weak })
    expect(p.weeklySessions).toBeLessThanOrEqual(12)
  })
})
