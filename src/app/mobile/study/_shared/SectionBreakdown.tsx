"use client"

import { TrendingUp, TrendingDown, Target, Lightbulb, ArrowRight, CheckCircle2 } from './icons'
import { samplesUntilDirection, type CriterionTrend } from '@/lib/study/criterion-trend'
import { glossFor } from '@/lib/study/criterionGlossary'
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
  // nothing here is red. A weak section is the next thing to practice,
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
 * Strengths and weaknesses from the AI mastery assessment.
 *
 * ONE card with two labelled groups, not two floating tinted boxes. The
 * boxes gave both halves equal visual weight and left the attribution
 * line orphaned underneath belonging to neither, so the whole thing read
 * as three unrelated blocks.
 *
 * Kept separate from the section bars above because they answer
 * different questions: the bars are measured points from real tests,
 * these are a model's prose about the work. Merging them would let an
 * opinion sit in a row that looks measured.
 *
 * NOT numbered. The assessment returns these in no documented order, so
 * "1, 2, 3" would invent a priority the data does not carry — the same
 * reason the section rows show item counts rather than ranks.
 */

export function SkillCards({
  strengths, weaknesses, assessedAt, ko, onPractice, practiceLabel,
}: {
  strengths: string[]
  weaknesses: string[]
  assessedAt: string | null
  ko: boolean
  /** Starts practice on this topic. Omitted on the result screen, where
   *  the "try this test again" button is already the action. */
  onPractice?: () => void
  practiceLabel?: string
}) {
  if (strengths.length === 0 && weaknesses.length === 0) return null

  return (
    <div className="rounded-2xl bg-white ring-1 ring-gray-200 overflow-hidden">
      {weaknesses.length > 0 && (
        <SkillGroup
          tone="amber"
          icon={<Lightbulb className="w-4.5 h-4.5" />}
          title={ko ? '다음에 연습할 것' : 'What to practice next'}
          subtitle={ko
            ? `${weaknesses.length}가지 집중 영역`
            : `${weaknesses.length} focus ${weaknesses.length === 1 ? 'area' : 'areas'}`}
          items={weaknesses}
          marker={<ArrowRight className="w-3.5 h-3.5" />}
        />
      )}
      {strengths.length > 0 && (
        <SkillGroup
          tone="emerald"
          icon={<TrendingUp className="w-4.5 h-4.5" />}
          title={ko ? '잘하고 있는 것' : 'What you are doing well'}
          subtitle={ko
            ? `${strengths.length}가지 강점`
            : `${strengths.length} ${strengths.length === 1 ? 'strength' : 'strengths'}`}
          items={strengths}
          marker={<CheckCircle2 className="w-3.5 h-3.5" />}
          divided={weaknesses.length > 0}
        />
      )}

      {(onPractice || assessedAt) && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/60">
          <span className="text-[10.5px] text-gray-400 leading-snug min-w-0">
            {assessedAt
              ? (ko ? `${formatDay(assessedAt, ko)} AI 분석 기준`
                    : `From your AI assessment on ${formatDay(assessedAt, ko)}`)
              : ''}
          </span>
          {onPractice && (
            /* One action for the card, not one per line. Practice takes
               no per-weakness focus parameter, so a button on each row
               would promise targeting the generator cannot deliver. */
            <button
              type="button"
              onClick={onPractice}
              className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              {practiceLabel ?? (ko ? '연습하기' : 'Practice')}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const GROUP_TONE = {
  emerald: {
    band: 'bg-emerald-50/70 border-emerald-100',
    icon: 'bg-emerald-500 text-white shadow-[0_2px_6px_-1px_rgba(16,185,129,0.5)]',
    head: 'text-emerald-900', sub: 'text-emerald-700/80',
    row: 'bg-emerald-50/40 ring-emerald-100', marker: 'text-emerald-600',
    pill: 'bg-white text-emerald-700 ring-emerald-200',
  },
  amber: {
    band: 'bg-amber-50/70 border-amber-100',
    icon: 'bg-amber-500 text-white shadow-[0_2px_6px_-1px_rgba(245,158,11,0.5)]',
    head: 'text-amber-900', sub: 'text-amber-700/80',
    row: 'bg-amber-50/40 ring-amber-100', marker: 'text-amber-600',
    pill: 'bg-white text-amber-700 ring-amber-200',
  },
} as const

/**
 * One group: a tinted header band, then each item as its own row.
 *
 * Rows rather than a bulleted list because each of these is a separate
 * thing to act on, and a bullet list renders them as one paragraph of
 * prose with dots. The marker glyph differs per tone — a check for what
 * is working, an arrow for what to do next — so the two groups are
 * distinguishable without reading the header.
 */
function SkillGroup({
  tone, icon, title, subtitle, items, marker, divided = false,
}: {
  tone: keyof typeof GROUP_TONE
  icon: React.ReactNode
  title: string
  subtitle: string
  items: string[]
  marker: React.ReactNode
  divided?: boolean
}) {
  const c = GROUP_TONE[tone]
  return (
    <div className={divided ? 'border-t border-gray-100' : ''}>
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${c.band}`}>
        <span className={`w-9 h-9 rounded-xl ${c.icon} inline-flex items-center justify-center flex-shrink-0`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className={`text-[13px] font-bold leading-tight ${c.head}`}>{title}</div>
          <div className={`text-[11px] ${c.sub} leading-tight mt-0.5`}>{subtitle}</div>
        </div>
        <span className={`flex-shrink-0 text-[13px] font-bold tabular-nums rounded-lg ring-1 px-2 py-1 ${c.pill}`}>
          {items.length}
        </span>
      </div>
      <div className="px-3 py-2.5 space-y-1.5">
        {items.map(label => (
          <div
            key={label}
            className={`flex items-start gap-2.5 rounded-xl ring-1 ${c.row} px-3 py-2.5`}
          >
            <span className={`flex-shrink-0 mt-[1px] ${c.marker}`}>{marker}</span>
            <span className="text-[13px] text-gray-800 leading-snug min-w-0">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatDay(iso: string, ko: boolean): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })
}

/**
 * Per-criterion movement for Speaking / Writing.
 *
 * Every row shows the scores. Only rows with enough history show a
 * DIRECTION — see lib/study/criterion-trend.ts for why that gate has to
 * exist (the grader gave the same essay a 4 and a 3 seconds apart, so a
 * two-point "improving" would be reporting our own noise as the
 * student's progress).
 *
 * The rows without a direction get a countdown instead of silence:
 * "2 more responses" is a reason to write another one.
 */
export function CriterionTrendCard({
  trends, ko,
}: {
  trends: CriterionTrend[]
  ko: boolean
}) {
  if (trends.length === 0) return null
  const anyDirection = trends.some(t => t.direction !== null)

  return (
    <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.10em] text-gray-400">
        {ko ? '채점 기준별 변화' : 'Your writing and speaking, by criterion'}
      </div>
      <p className="text-[12px] text-gray-600 mt-1 leading-relaxed">
        {anyDirection
          ? (ko ? '루브릭 기준별 점수 흐름이에요.'
                : 'How each rubric criterion has moved across your graded responses.')
          : (ko ? '응답이 더 쌓이면 방향을 알려드릴게요.'
                : 'Scores so far. A direction needs more responses than this.')}
      </p>

      {/* How to read it. Every response is scored on three criteria out
          of five, and without this the bars are three unlabelled
          quantities — the card said what moved but never what the thing
          that moved actually is. */}
      <div className="mt-2.5 rounded-lg bg-gray-50 ring-1 ring-gray-200/70 px-2.5 py-2 flex items-center gap-3">
        <div className="flex items-end gap-[3px] h-4 flex-shrink-0" aria-hidden>
          {[1, 3, 4].map((v, i) => (
            <span key={i} className={`w-1.5 rounded-sm ${TONE_CLASS[scoreTone(v, 5)].bar}`}
              style={{ height: `${(v / 5) * 100}%` }} />
          ))}
        </div>
        <p className="text-[10.5px] text-gray-500 leading-snug min-w-0">
          {ko
            ? '막대 하나가 응답 하나예요. 왼쪽이 오래된 것, 오른쪽이 최신. 높이는 0–5점.'
            : 'One bar per response, oldest on the left. Height is the 0–5 score that response got.'}
        </p>
      </div>

      <div className="mt-3 space-y-3.5">
        {trends.map((t, i) => (
          <CriterionRow key={t.key} trend={t} ko={ko} weakest={i === 0} />
        ))}
      </div>

      {/* Says out loud that the level is not trustworthy even though the
          movement is. Without this the card reads as a score report. */}
      <p className="mt-3 pt-2.5 border-t border-gray-100 text-[10.5px] text-gray-400 leading-relaxed">
        {ko
          ? 'AI 채점 기준이라 실제 시험 점수와 다를 수 있어요. 변화의 방향을 보는 용도예요.'
          : 'Our AI grader marks harder than the real exam, so treat the level as rough — the movement is the useful part.'}
      </p>
    </div>
  )
}

const DIRECTION_STYLE = {
  up: { chip: 'bg-emerald-50 text-emerald-700', en: 'Improving', ko: '향상' },
  down: { chip: 'bg-amber-50 text-amber-700', en: 'Slipping', ko: '하락' },
  flat: { chip: 'bg-gray-100 text-gray-600', en: 'Holding steady', ko: '유지' },
} as const

function CriterionRow({
  trend, ko, weakest,
}: {
  trend: CriterionTrend
  ko: boolean
  /** Lowest-scoring criterion in the card — the only one that shows
   *  advice, so the card stays scannable. */
  weakest: boolean
}) {
  const need = samplesUntilDirection(trend)
  const tone = scoreTone(trend.average, 5)
  const dir = trend.direction ? DIRECTION_STYLE[trend.direction] : null
  const gloss = glossFor(trend.key)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-gray-800 truncate">
          {gloss?.short ?? trend.label}
        </span>
        <span className="flex-shrink-0 flex items-center gap-1.5">
          {dir ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${dir.chip}`}>
              {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
              {ko ? dir.ko : dir.en}
            </span>
          ) : (
            <span className="text-[10.5px] text-gray-400">
              {ko ? `${need}개 더 필요` : `${need} more to call it`}
            </span>
          )}
          <span className={`text-[11.5px] font-semibold tabular-nums ${TONE_CLASS[tone].text}`}>
            {trend.average.toFixed(1)}<span className="text-gray-400 font-medium">/5</span>
          </span>
        </span>
      </div>
      {/* What the criterion measures. The rubric's own label is written
          for the grader prompt ("Delivery (pace, pausing,
          intelligibility)"); this is the same thing said to a student. */}
      {gloss && (
        <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{gloss.what}</p>
      )}
      <div className="mt-1.5 flex items-center gap-2">
        <ScoreDots scores={trend.scores} />
        <span className="flex-shrink-0 text-[10px] text-gray-400 tabular-nums">
          {ko ? `${trend.samples}개 응답` : `${trend.samples} ${trend.samples === 1 ? 'response' : 'responses'}`}
        </span>
      </div>
      {/* The actionable half, on the weakest criterion only. On every row
          it is four paragraphs of advice and nobody reads any of it. */}
      {gloss && weakest && (
        <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-50/60 ring-1 ring-amber-100 px-2.5 py-1.5">
          <Lightbulb className="w-3 h-3 text-amber-600 flex-shrink-0 mt-[2px]" />
          <p className="text-[11px] text-amber-900 leading-snug min-w-0">{gloss.raise}</p>
        </div>
      )}
    </div>
  )
}

/**
 * The series as graded dots, oldest to newest — not a line.
 *
 * A line implies a continuous quantity sampled over time; these are a
 * handful of discrete 0-5 judgements, often only two or three, and
 * drawing a slope through them would make a trend look established that
 * the row's own chip is explicitly declining to claim.
 */
function ScoreDots({ scores }: { scores: number[] }) {
  const shown = scores.slice(-12)
  return (
    <div className="flex-1 flex items-end gap-1 h-6">
      {shown.map((score, i) => {
        const tone = scoreTone(score, 5)
        return (
          <div
            key={i}
            className={`flex-1 min-w-[3px] max-w-[14px] rounded-sm ${TONE_CLASS[tone].bar}`}
            style={{ height: `${Math.max(12, (score / 5) * 100)}%` }}
            title={`${score} / 5`}
          />
        )
      })}
    </div>
  )
}
