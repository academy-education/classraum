"use client"

import { TrendingUp, Target, Lightbulb } from './icons'
import type { Breakdown, SectionGroup } from '@/lib/study/section-breakdown'
import { splitStrengths } from '@/lib/study/section-breakdown'
import { scoreTone, TONE_CLASS } from '@/lib/study/rubricDisplay'

/**
 * "How you did by section" — one row per part of the test, weakest
 * first, shown on the result screen and again on the topic page.
 *
 * ONE HONESTY NOTE, because the numbers here can look like they should
 * add up to the hero percentage and do not. These rows carry RAW points
 * (Email 5/5, Build a Sentence 6/10). The section score weights those
 * parts — Writing is 20/35/45 — so 15 of 20 raw points is 83% weighted,
 * not 75%. Both numbers are already on the result screen and both are
 * right; the copy below therefore says "points", never "% of your
 * score", and no total is printed on this card for the two to disagree
 * about.
 */

export function SectionBreakdownCard({
  breakdown, ko, title, dense = false,
}: {
  breakdown: Breakdown
  ko: boolean
  title?: string
  /** Topic-page variant: no outer card, tighter rows. */
  dense?: boolean
}) {
  // One group is not a breakdown — it is the whole test with a label on
  // it. SAT produces exactly this, every time.
  if (breakdown.groups.length < 2) return null

  const { strengths, weaknesses } = splitStrengths(breakdown.groups)
  const best = breakdown.groups[breakdown.groups.length - 1]
  const worst = breakdown.groups[0]

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.10em] text-gray-400">
            {title ?? (ko ? '영역별 결과' : 'How you did by section')}
          </div>
          {best && worst && best !== worst && (
            <p className="text-[12px] text-gray-600 mt-1 leading-relaxed">
              {ko
                ? `${best.label}이(가) 가장 좋았고, ${worst.label}이(가) 가장 약했어요.`
                : <>Strongest on <b className="text-gray-900 font-semibold">{best.label}</b>,
                   weakest on <b className="text-gray-900 font-semibold">{worst.label}</b>.</>}
            </p>
          )}
        </div>
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold">
            {strengths.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-1">
                <Target className="w-3 h-3" />{strengths.length}
              </span>
            )}
            {weaknesses.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-1">
                <Lightbulb className="w-3 h-3" />{weaknesses.length}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={dense ? 'mt-2.5 space-y-2.5' : 'mt-3 space-y-3'}>
        {breakdown.groups.map(g => <SectionRow key={g.label} group={g} ko={ko} />)}
      </div>

      {/* Never a silent cap. A student who answered 30 questions and
          sees rows covering 25 is owed the difference. */}
      {breakdown.omitted > 0 && (
        <p className="mt-2.5 text-[10.5px] text-gray-400 leading-relaxed">
          {ko
            ? `${breakdown.covered}문항 기준. 나머지 ${breakdown.omitted}문항은 영역을 나누기에 너무 적어 제외했어요.`
            : `Based on ${breakdown.covered} questions. ${breakdown.omitted} more sat in groups too small to report.`}
        </p>
      )}
    </>
  )

  if (dense) return <div>{body}</div>
  return <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4">{body}</div>
}

function SectionRow({ group, ko }: { group: SectionGroup; ko: boolean }) {
  const pct = Math.round(group.proportion * 100)
  // Same four-tone scale as the rubric panel, and for the same reason:
  // nothing here is red. A weak section is the next thing to practise,
  // not a failure — and these are proficiency shares, not wrong answers.
  const tone = scoreTone(group.proportion, 1)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-gray-800 truncate">{group.label}</span>
        <span className="flex-shrink-0 text-[11.5px] tabular-nums">
          <span className={`font-semibold ${TONE_CLASS[tone].text}`}>{pct}%</span>
          <span className="text-gray-400 font-medium"> · {group.earned}/{group.max}</span>
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${TONE_CLASS[tone].bar} transition-[width] duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Item count is part of the claim: 100% off one question is not
            the same finding as 100% off twelve. */}
        <span className="flex-shrink-0 text-[10px] text-gray-400 tabular-nums w-[52px] text-right">
          {ko ? `${group.items}문항` : `${group.items} ${group.items === 1 ? 'item' : 'items'}`}
        </span>
      </div>
    </div>
  )
}

/**
 * Strengths and weaknesses from the AI mastery assessment, as two cards.
 *
 * Kept separate from the section bars above because they answer
 * different questions: the bars are measured points from this test, and
 * these are the grader's prose about the work. Merging them would let a
 * model's opinion sit in a row that looks measured.
 */
export function SkillCards({
  strengths, weaknesses, assessedAt, ko,
}: {
  strengths: string[]
  weaknesses: string[]
  assessedAt: string | null
  ko: boolean
}) {
  if (strengths.length === 0 && weaknesses.length === 0) return null
  return (
    <div className="space-y-2.5">
      {strengths.length > 0 && (
        <SkillCard
          tone="emerald"
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          title={ko ? '잘하고 있는 것' : 'What you are doing well'}
          items={strengths}
        />
      )}
      {weaknesses.length > 0 && (
        <SkillCard
          tone="amber"
          icon={<Lightbulb className="w-3.5 h-3.5" />}
          title={ko ? '다음에 연습할 것' : 'What to practise next'}
          items={weaknesses}
        />
      )}
      {assessedAt && (
        <p className="text-[10.5px] text-gray-400 px-0.5">
          {ko ? `${formatDay(assessedAt, ko)} AI 분석 기준`
              : `From your AI assessment on ${formatDay(assessedAt, ko)}`}
        </p>
      )}
    </div>
  )
}

const CARD_TONE = {
  emerald: {
    ring: 'ring-emerald-200/70', bg: 'bg-emerald-50/60',
    icon: 'bg-emerald-100 text-emerald-700', head: 'text-emerald-900',
    dot: 'bg-emerald-500',
  },
  amber: {
    ring: 'ring-amber-200/70', bg: 'bg-amber-50/60',
    icon: 'bg-amber-100 text-amber-700', head: 'text-amber-900',
    dot: 'bg-amber-500',
  },
} as const

function SkillCard({
  tone, icon, title, items,
}: {
  tone: keyof typeof CARD_TONE
  icon: React.ReactNode
  title: string
  items: string[]
}) {
  const c = CARD_TONE[tone]
  return (
    <div className={`rounded-xl ring-1 ${c.ring} ${c.bg} p-3`}>
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-lg ${c.icon} inline-flex items-center justify-center flex-shrink-0`}>
          {icon}
        </span>
        <span className={`text-[12px] font-semibold ${c.head}`}>{title}</span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map(label => (
          <li key={label} className="flex items-start gap-2 text-[12.5px] text-gray-700 leading-snug">
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot} mt-[6px] flex-shrink-0`} />
            <span className="min-w-0">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatDay(iso: string, ko: boolean): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })
}
