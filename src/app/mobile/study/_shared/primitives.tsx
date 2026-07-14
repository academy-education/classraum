"use client"

import { ReactNode, useEffect, useState, type ComponentType } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Loader2, type LucideProps } from 'lucide-react'

/**
 * Shared study-mode primitives. Every new study surface should use
 * these instead of rolling its own header/hero/section/empty-state/
 * metric. Phase 6q.A1 consolidation.
 *
 * Design tokens (motion + color) live in globals.css under
 * --motion-* and --study-*. The primitives reference those tokens so
 * a single change updates every page.
 */

type LucideIcon = ComponentType<LucideProps>

// ─────────────────────────────────────────────────────────────────────
// StudyPageHeader — back link + icon tile + eyebrow + title + right slot.
// Used on every secondary page (snap / review / league / etc.). Always
// the same shape and spacing so navigation feels predictable.
// ─────────────────────────────────────────────────────────────────────
export interface StudyPageHeaderProps {
  /** Omit on bottom-nav tab pages (snap / review / league) — they're
   *  already reachable from the bottom nav, so a back chevron is
   *  redundant. Sub-pages (stats, history, preferences, etc.) should
   *  still pass it. */
  backHref?: string
  backLabel?: string
  icon: LucideIcon
  iconColorClass?: string      // e.g. "text-amber-600 bg-amber-50"
  eyebrow: string
  title: string
  /** Optional one-line subtitle under the title. Hidden when the header
   *  collapses on scroll (keeps the thin bar to back + title only). */
  subtitle?: string
  rightSlot?: ReactNode
  /** Full-bleed header: back button pinned to the left edge and the row
   *  spanning the whole width (used by the session shell, which fills the
   *  screen). Default stays centered at max-w-3xl for the standalone
   *  sub-pages. */
  wide?: boolean
}


/** History-aware back: return to the actual previous page when there
 *  is one, else fall back to the header's declared parent route. */
function useSmartBack(fallback: string) {
  const router = useRouter()
  return () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push(fallback)
  }
}

export function StudyPageHeader({
  backHref, backLabel, icon: _Icon, iconColorClass: _iconColorClass,
  eyebrow, title, subtitle, rightSlot, wide,
}: StudyPageHeaderProps) {
  const hasBack = !!backHref && !!backLabel
  const goBack = useSmartBack(backHref ?? '/mobile/study')
  // Sticky collapse: past 80px scroll, the header shrinks to a thin
  // bar (back link + title only). We walk up the DOM to find the
  // closest ancestor that actually scrolls — in the mobile layout it
  // sits at <main> > <div overflow-y-auto>, not window.
  const [collapsed, setCollapsed] = useState(false)
  const [el, setEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!el) return
    let scroller: HTMLElement | null = el.parentElement
    while (scroller) {
      const overflowY = getComputedStyle(scroller).overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') break
      scroller = scroller.parentElement
    }
    const target: HTMLElement | Window = scroller ?? window
    // Hysteresis: collapsing shrinks the header ~50px, which shrinks
    // the scrollable height — if the user sits right at a single
    // threshold the browser can clamp scrollTop back below it and the
    // header oscillates (collapse → clamp → expand → …). Collapse past
    // 80px but only re-expand under 16px, which is below the worst-
    // case clamped position (80 − headerDelta), so both states are
    // stable at every scroll position.
    let isCollapsed = false
    const onScroll = () => {
      const top = scroller ? scroller.scrollTop : window.scrollY
      const next = isCollapsed ? top > 16 : top > 80
      if (next !== isCollapsed) {
        isCollapsed = next
        setCollapsed(next)
      }
    }
    target.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => target.removeEventListener('scroll', onScroll)
  }, [el])

  return (
    <header
      ref={setEl}
      className={`sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm transition-all duration-200 ${
        collapsed ? 'border-b border-gray-200 py-2' : 'border-b border-gray-100 pt-5 pb-3.5'
      }`}
    >
      {/* Inner wrapper — bg + border go edge-to-edge for the sticky
          effect. Standalone sub-pages keep the content centered at
          max-w-3xl; the session shell passes `wide` so the back button
          sits at the far left and the row fills the screen. */}
      <div className={wide ? 'w-full px-5 lg:px-8' : 'max-w-3xl lg:max-w-6xl 2xl:max-w-[1600px] mx-auto px-5 lg:px-8'}>
        <div className="flex items-center gap-3">
          {hasBack && (
            <button type="button" onClick={goBack}
              aria-label={backLabel}
              className={`flex-shrink-0 inline-flex items-center justify-center rounded-full bg-white ring-1 ring-gray-200/70 text-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:ring-primary/40 hover:text-primary active:scale-95 transition-all ${
                collapsed ? 'w-8 h-8' : 'w-9 h-9'
              }`}>
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            {!collapsed && (
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-500 leading-none mb-1.5">
                {eyebrow}
              </p>
            )}
            {/* Non-collapsed title matches StudySubPageHeader (24/26px) so
                sticky-header pages (review, league, snap, session) read
                identically to the in-flow ones (profile, stats, prefs). */}
            <h1 className={`font-bold tracking-tight text-gray-900 truncate transition-all ${
              collapsed ? 'text-[14px]' : 'text-[24px] sm:text-[26px] leading-tight'
            }`}>{title}</h1>
            {subtitle && !collapsed && (
              <p className="text-[13px] text-gray-500 mt-1 leading-snug truncate">{subtitle}</p>
            )}
          </div>
          {rightSlot}
        </div>
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────────────
// StudyScrollShell — the page shell that gives every sub-page the same
// sticky, collapse-on-scroll header as the StudyPath page. Establishes
// its own scroll context (flex-col h-full > flex-1 overflow-y-auto) so a
// `sticky top-0` StudyPageHeader pins to it. Pass the <StudyPageHeader>
// as `header`; content goes in `children` (already wrapped in the
// standard centered, padded container). Optional `decoration` renders a
// full-bleed background flourish behind the content.
// ─────────────────────────────────────────────────────────────────────
export function StudyScrollShell({
  header, children, bg = 'bg-gray-50', decoration, contentClassName,
}: {
  header: ReactNode
  children: ReactNode
  bg?: string
  decoration?: ReactNode
  contentClassName?: string
}) {
  return (
    <div className={`flex flex-col h-full ${bg}`}>
      <div className="flex-1 overflow-y-auto relative">
        {decoration}
        {header}
        <div className={contentClassName ?? 'max-w-3xl lg:max-w-6xl 2xl:max-w-[1600px] mx-auto px-5 lg:px-8 pt-6 pb-14 space-y-6'}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// StudyPager — prev / "Page X of Y · N total" / next. One shape for
// every paginated list (sessions, tests, wrong-notebook, library). Pass
// 0-based `page`. Self-hides on a single page.
// ─────────────────────────────────────────────────────────────────────
export function StudyPager({ page, totalPages, total, ko, onPrev, onNext }: {
  page: number; totalPages: number; total: number; ko: boolean; onPrev: () => void; onNext: () => void
}) {
  if (totalPages <= 1) return null
  const btn = 'inline-flex items-center gap-1 h-9 px-3 rounded-full bg-white ring-1 ring-gray-200/70 text-[13px] font-medium text-gray-700 hover:ring-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition'
  return (
    <div className="flex items-center justify-between pt-1">
      <button type="button" onClick={onPrev} disabled={page <= 0} className={btn}>
        <ChevronLeft className="w-4 h-4" />{ko ? '이전' : 'Prev'}
      </button>
      <div className="text-[12.5px] text-gray-500 tabular-nums">
        {ko ? `${page + 1} / ${totalPages} 페이지 · 총 ${total}개` : `Page ${page + 1} of ${totalPages} · ${total} total`}
      </div>
      <button type="button" onClick={onNext} disabled={page >= totalPages - 1} className={btn}>
        {ko ? '다음' : 'Next'}<ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// StudyFilterChip — one pill for filter/tab chip rows (sessions mode
// filter, tests state filter, library tabs, wrong-notebook difficulty).
// Same height/size/weight/active color everywhere. Render inside a
// horizontally-scrolling `-mx-5 overflow-x-auto` row.
// ─────────────────────────────────────────────────────────────────────
export function StudyFilterChip({ label, active, count, icon: Icon, onClick }: {
  label: string; active: boolean; count?: number; icon?: LucideIcon; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12.5px] font-medium transition ${
        active
          ? 'bg-primary/10 text-primary ring-1 ring-primary/25'
          : 'bg-white ring-1 ring-gray-200/70 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
      {count !== undefined && <span className="opacity-60 tabular-nums">{count}</span>}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────
// StudySubPageHeader — non-sticky variant of StudyPageHeader for
// pages that live inside the global mobile scroll container (stats,
// history, preferences, subscription, topic). Identical typography +
// shape to StudyPageHeader so users perceive every secondary page as
// one consistent surface, but skips the sticky collapse behavior
// (which needs its own scroll context and would no-op here anyway).
// Renders the back link only when backHref is provided.
// ─────────────────────────────────────────────────────────────────────
export interface StudySubPageHeaderProps {
  backHref?: string
  backLabel?: string
  icon: LucideIcon
  iconColorClass?: string
  eyebrow: string
  title: string
  subtitle?: string
  rightSlot?: ReactNode
}

export function StudySubPageHeader({
  backHref, backLabel, icon: _Icon, iconColorClass: _iconColorClass,
  eyebrow, title, subtitle, rightSlot,
}: StudySubPageHeaderProps) {
  const goBack = useSmartBack(backHref ?? '/mobile/study')
  const hasBackRow = !!backHref
  return (
    // -mt-1 trims 4px so the eyebrow lands at the same top offset as the
    // sticky StudyPageHeader (pt-5). Its pages sit in pt-6 containers, so
    // without this the sub-pages (stats, profile, prefs…) read 4px lower
    // than review/league/snap and the top spacing looks uneven.
    <header className="-mt-1">
      {hasBackRow && (
        <div className="flex items-center justify-between mb-5">
          <button type="button" onClick={goBack}
            aria-label={backLabel ?? 'Back'}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white ring-1 ring-gray-200/70 text-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:ring-primary/40 hover:text-primary active:scale-95 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          {rightSlot}
        </div>
      )}
      {/* Typography-led header — no icon tile. The eyebrow + large
          bold title reads cleaner and scales with the viewport. */}
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-500 leading-none mb-1.5">
            {eyebrow}
          </p>
          <h1 className="text-[24px] sm:text-[26px] font-bold tracking-tight text-gray-900 truncate leading-tight">
            {title}
          </h1>
        </div>
        {!hasBackRow && rightSlot}
      </div>
      {subtitle && (
        <p className="text-[13.5px] sm:text-[14px] text-gray-500 mt-1.5 leading-relaxed">{subtitle}</p>
      )}
    </header>
  )
}

// ─────────────────────────────────────────────────────────────────────
// StudyHeroCard — full-width gradient hero. Use for the loudest action
// on a page (snap CTA, review CTA, week-card, league tier banner).
// `href` makes the whole card a link; omit to render as a div.
// ─────────────────────────────────────────────────────────────────────
export type StudyHeroPalette = 'orange' | 'amber' | 'violet' | 'indigo' | 'rose' | 'emerald' | 'tier'

export interface StudyHeroCardProps {
  palette: StudyHeroPalette
  /** Custom gradient classes — use when palette doesn't fit, e.g. tier colors. */
  customGradient?: string
  icon?: LucideIcon
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  /** Right-aligned forward arrow (shown only when href is set). */
  showArrow?: boolean
  href?: string
  onClick?: () => void
  children?: ReactNode
}

const PALETTE_GRADIENTS: Record<StudyHeroPalette, string> = {
  orange:  'from-amber-500 via-orange-500 to-rose-500',
  amber:   'from-amber-500 via-orange-500 to-rose-500',
  violet:  'from-violet-500 via-purple-500 to-indigo-600',
  indigo:  'from-indigo-500 to-blue-700',
  rose:    'from-rose-500 via-pink-500 to-red-600',
  emerald: 'from-emerald-500 via-teal-500 to-cyan-600',
  tier:    'from-amber-700 to-orange-800',  // bronze default; pages override via customGradient
}

const PALETTE_SHADOW: Record<StudyHeroPalette, string> = {
  orange:  'shadow-[0_8px_24px_-8px_rgba(251,146,60,0.40)] hover:shadow-[0_12px_32px_-8px_rgba(251,146,60,0.55)]',
  amber:   'shadow-[0_8px_24px_-8px_rgba(251,146,60,0.40)] hover:shadow-[0_12px_32px_-8px_rgba(251,146,60,0.55)]',
  violet:  'shadow-[0_8px_24px_-8px_rgba(139,92,246,0.40)] hover:shadow-[0_12px_32px_-8px_rgba(139,92,246,0.55)]',
  indigo:  'shadow-[0_8px_24px_-8px_rgba(99,102,241,0.45)] hover:shadow-[0_12px_32px_-8px_rgba(99,102,241,0.55)]',
  rose:    'shadow-[0_8px_24px_-8px_rgba(244,63,94,0.40)] hover:shadow-[0_12px_32px_-8px_rgba(244,63,94,0.55)]',
  emerald: 'shadow-[0_8px_24px_-8px_rgba(16,185,129,0.40)] hover:shadow-[0_12px_32px_-8px_rgba(16,185,129,0.55)]',
  tier:    'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.30)]',
}

export function StudyHeroCard({
  palette, customGradient, icon: Icon, eyebrow, title, subtitle, showArrow, href, onClick, children,
}: StudyHeroCardProps) {
  const gradient = customGradient ?? `bg-gradient-to-br ${PALETTE_GRADIENTS[palette]}`
  const shadow = PALETTE_SHADOW[palette]
  const interactive = !!(href || onClick)
  const cls = `group relative overflow-hidden rounded-2xl ${gradient} text-white p-4 ${shadow} ${
    interactive ? 'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200' : ''
  }`

  const inner = (
    <>
      <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/20 blur-2xl" />
      <div className="relative flex items-center gap-3">
        {Icon && (
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-90">{eyebrow}</div>
          )}
          <div className="text-[15px] font-semibold leading-snug mt-0.5">{title}</div>
          {subtitle && (
            <div className="text-[12px] opacity-90 mt-0.5 leading-relaxed">{subtitle}</div>
          )}
        </div>
        {showArrow && (
          <ArrowRight className="w-4 h-4 opacity-90 group-hover:translate-x-1 transition-transform" />
        )}
      </div>
      {children && <div className="relative mt-3">{children}</div>}
    </>
  )

  if (href) return <Link href={href} className={cls}>{inner}</Link>
  if (onClick) return <button type="button" onClick={onClick} className={`${cls} text-left w-full`}>{inner}</button>
  return <div className={cls}>{inner}</div>
}

// ─────────────────────────────────────────────────────────────────────
// StudySectionHeader — small uppercase eyebrow style heading + optional
// right-side action. Tight unified version for all section dividers.
// ─────────────────────────────────────────────────────────────────────
export function StudySectionHeader({
  title, icon: Icon, iconColorClass = 'text-gray-500',
  rightHref, rightText, rightIcon: RightIcon,
}: {
  title: ReactNode
  icon?: LucideIcon
  iconColorClass?: string
  rightHref?: string
  rightText?: string
  rightIcon?: LucideIcon
}) {
  return (
    <div className="flex items-baseline justify-between mb-3 px-1">
      {/* 17px matches the de-facto section-title size used across the
          landing + stats pages — keep them in lockstep. */}
      <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 inline-flex items-center gap-1.5">
        {Icon && <Icon className={`w-3.5 h-3.5 ${iconColorClass}`} />}
        {title}
      </h2>
      {rightHref && rightText && (
        <Link href={rightHref}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-gray-600 hover:text-primary transition-colors">
          {RightIcon && <RightIcon className="w-3.5 h-3.5" />}
          {rightText}
        </Link>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// StudyTodayCard — the single shape used for every "Today" band card.
// Fixed height, white background, one ring color, one hover behaviour.
// Landing feels calmer + more organised when every card in the band
// reads the same, differentiated only by the coloured icon.
// ─────────────────────────────────────────────────────────────────────
export interface StudyTodayCardProps {
  /** href for Link — or omit + provide onClick to render a button. */
  href?: string
  /** Click handler — pass instead of href when the card needs to
   *  fire an action before navigating (e.g., POST a session then
   *  route). Cannot be combined with href. */
  onClick?: () => void
  /** Loading state — disables the button + swaps the icon for a
   *  spinner. Only meaningful when using onClick. */
  loading?: boolean
  icon: LucideIcon
  /** Icon container background + text colour, e.g. "bg-primary/10 text-primary". */
  iconColorClass?: string
  eyebrow: string
  title: ReactNode
  subtitle?: ReactNode
  /** Optional meta chips — small pills with a tiny icon + label, shown
   *  under the title. Use for real data at a glance (question count,
   *  time, mode). Rendered instead of `subtitle` when both are set is
   *  avoided by callers; if both are provided, meta wins visually. */
  meta?: Array<{ icon?: LucideIcon; label: string }>
  /** Optional right-side slot — a number badge, count, or arrow. */
  rightSlot?: ReactNode
  /** Optional dismiss handler — shows an X button on the right. */
  onDismiss?: () => void
  dismissLabel?: string
}

export function StudyTodayCard({
  href, onClick, loading, icon: Icon, iconColorClass = 'bg-primary/10 text-primary',
  eyebrow, title, subtitle, meta, rightSlot, onDismiss, dismissLabel,
}: StudyTodayCardProps) {
  // When onDismiss is present, the outer X sits at right-2, so the
  // inner content needs extra right padding to keep the arrow /
  // rightSlot from overlapping it. Without dismiss: standard px-4.
  const commonClassName = `group flex items-center gap-3 h-[80px] w-full rounded-2xl bg-white ring-1 ring-gray-200 pl-4 ${onDismiss ? 'pr-11' : 'pr-4'} hover:ring-primary/40 hover:shadow-[0_2px_8px_-4px_rgba(40,133,232,0.15)] active:scale-[0.995] transition-all text-left disabled:opacity-70 disabled:cursor-wait`
  const body = (
    <>
      <div className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ring-1 ring-black/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ${iconColorClass}`}>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" strokeWidth={2.25} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 leading-none mb-1">
          {eyebrow}
        </div>
        <div className="text-[14px] font-semibold text-gray-900 leading-tight truncate">
          {title}
        </div>
        {meta && meta.length > 0 ? (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {meta.map((m, i) => {
              const MetaIcon = m.icon
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-[11px] font-medium text-gray-600 tabular-nums"
                >
                  {MetaIcon && <MetaIcon className="w-3 h-3 opacity-70" />}
                  {m.label}
                </span>
              )
            })}
          </div>
        ) : subtitle ? (
          <div className="text-[12px] text-gray-500 mt-0.5 truncate">
            {subtitle}
          </div>
        ) : null}
      </div>
      {rightSlot ? (
        <div className="flex-shrink-0">{rightSlot}</div>
      ) : (
        // Hide the arrow entirely when a dismiss X is already visible
        // — two right-side affordances make the card feel cluttered.
        !onDismiss && (
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        )
      )}
    </>
  )
  return (
    <div className="relative">
      {href
        ? <Link href={href} className={commonClassName}>{body}</Link>
        : <button type="button" onClick={onClick} disabled={loading} className={commonClassName}>{body}</button>}
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDismiss() }}
          aria-label={dismissLabel ?? 'Dismiss'}
          className="absolute top-1/2 -translate-y-1/2 right-2 w-7 h-7 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:scale-[0.94] transition-all inline-flex items-center justify-center z-10"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// StudyEmptyState — icon + headline + body + optional CTA.
// Use for "no data yet" surfaces on every page.
// ─────────────────────────────────────────────────────────────────────
export function StudyEmptyState({
  icon: Icon, iconColorClass = 'text-gray-400 bg-gray-50',
  headline, body, ctaHref, ctaText,
}: {
  icon: LucideIcon
  iconColorClass?: string
  headline: ReactNode
  body?: ReactNode
  ctaHref?: string
  ctaText?: string
}) {
  return (
    <div className="py-12 text-center">
      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 ${iconColorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-[15px] font-semibold text-gray-900">{headline}</p>
      {body && <p className="text-[12px] text-gray-500 mt-1.5 max-w-xs mx-auto leading-relaxed">{body}</p>}
      {ctaHref && ctaText && (
        <Link href={ctaHref}
          className="mt-4 inline-flex items-center justify-center h-10 px-4 rounded-xl bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] text-[13px] font-medium hover:opacity-95 active:scale-[0.98] transition-all">
          {ctaText}
        </Link>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// StudyMetric — icon tile + animated number + label + optional suffix.
// Number animates from 0 → target with ease-out raf loop.
// ─────────────────────────────────────────────────────────────────────
export type StudyMetricAccent = 'primary' | 'emerald' | 'amber' | 'violet' | 'rose' | 'indigo'

const ACCENT_TILE: Record<StudyMetricAccent, string> = {
  primary: 'from-primary to-indigo-600',
  emerald: 'from-emerald-500 to-teal-600',
  amber:   'from-amber-400 to-orange-500',
  violet:  'from-violet-500 to-purple-700',
  rose:    'from-rose-500 to-red-600',
  indigo:  'from-indigo-400 to-blue-600',
}

const ACCENT_TINT: Record<StudyMetricAccent, string> = {
  primary: 'from-primary/[0.06]',
  emerald: 'from-emerald-50/60',
  amber:   'from-amber-50/60',
  violet:  'from-violet-50/60',
  rose:    'from-rose-50/60',
  indigo:  'from-indigo-50/60',
}

const ACCENT_GLOW: Record<StudyMetricAccent, string> = {
  primary: 'shadow-[0_4px_10px_-2px_rgba(40,133,232,0.30)]',
  emerald: 'shadow-[0_4px_10px_-2px_rgba(16,185,129,0.28)]',
  amber:   'shadow-[0_4px_10px_-2px_rgba(245,158,11,0.28)]',
  violet:  'shadow-[0_4px_10px_-2px_rgba(139,92,246,0.28)]',
  rose:    'shadow-[0_4px_10px_-2px_rgba(244,63,94,0.28)]',
  indigo:  'shadow-[0_4px_10px_-2px_rgba(99,102,241,0.28)]',
}

export function StudyMetric({
  icon: Icon, value, suffix, label, accent = 'primary',
}: {
  icon: LucideIcon
  value: number
  suffix?: string
  label: string
  accent?: StudyMetricAccent
}) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${ACCENT_TINT[accent]} via-white to-white ring-1 ring-gray-200/70 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_4px_16px_-8px_rgba(15,23,42,0.08)]`}>
      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${ACCENT_TILE[accent]} text-white flex items-center justify-center ring-1 ring-black/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] ${ACCENT_GLOW[accent]} mb-2.5`}>
        <Icon className="w-5 h-5" strokeWidth={2.25} />
      </div>
      <div className="text-[26px] font-bold tracking-tight text-gray-900 leading-none tabular-nums">
        <NumberRoll target={value} />{suffix ?? ''}
      </div>
      <div className="text-[11.5px] font-medium uppercase tracking-[0.10em] text-gray-500 mt-1.5">{label}</div>
    </div>
  )
}

/** StudyPageTransition — wrap a study page body to get a 200ms fade-up
 *  enter on navigation. Sits inside the scrollable area so the sticky
 *  header doesn't animate with it. */
export function StudyPageTransition({ children }: { children: ReactNode }) {
  return (
    <div className="animate-card-in opacity-0">
      {children}
    </div>
  )
}

/** Reusable counter — counts from 0 → target with ease-out over ~600ms.
 *  Used by StudyMetric and any other surface that needs a delightful
 *  number reveal. */
export function NumberRoll({ target }: { target: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (target === 0) { setN(0); return }
    const start = performance.now()
    const dur = 600
    const isFloat = !Number.isInteger(target)
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = target * eased
      setN(isFloat ? Math.round(v * 10) / 10 : Math.round(v))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return <>{n}</>
}
