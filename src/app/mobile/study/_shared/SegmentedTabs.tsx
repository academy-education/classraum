"use client"

/**
 * SegmentedTabs — the single segmented / pill-tab control for the whole
 * study experience. Replaces the two copy-pasted `Segmented` /
 * `SegmentedControl` implementations (preferences + test customization).
 *
 * Two visual variants:
 *  - 'tray'  (default) — iOS-style: a white pill slides inside a gray
 *    tray. Best for settings / mutually-exclusive options.
 *  - 'pill'  — filled primary pill for the active option on a
 *    transparent ground. The friendlier "category filter" look from the
 *    app's design refresh; best for top-level filters (subject, kind).
 *
 * `recommendedValue` marks one option with a small ★ badge.
 */
export interface SegmentedOption<T> {
  value: T
  label: string
}

export function SegmentedTabs<T>({
  options,
  value,
  onChange,
  recommendedValue,
  variant = 'tray',
  'aria-label': ariaLabel,
}: {
  options: Array<SegmentedOption<T>>
  value: T
  onChange: (v: T) => void
  recommendedValue?: T
  variant?: 'tray' | 'pill'
  'aria-label'?: string
}) {
  if (variant === 'pill') {
    return (
      <div role="tablist" aria-label={ariaLabel} className="inline-flex items-center gap-1.5 flex-wrap">
        {options.map(opt => {
          const selected = opt.value === value
          const isRecommended = recommendedValue !== undefined && opt.value === recommendedValue
          return (
            <button
              key={String(opt.value)}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(opt.value)}
              className={`relative h-8 px-3.5 rounded-full text-[13px] font-semibold tracking-tight transition-all active:scale-[0.96] ${
                selected
                  ? 'bg-primary text-white shadow-[0_6px_14px_-6px_rgba(40,133,232,0.6)]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {opt.label}
              {isRecommended && <RecommendedBadge />}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex items-center w-full p-0.5 rounded-xl bg-gray-100 ring-1 ring-gray-200/70">
      {options.map(opt => {
        const selected = opt.value === value
        const isRecommended = recommendedValue !== undefined && opt.value === recommendedValue
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            className={`relative flex-1 h-9 rounded-[10px] text-[13px] font-semibold tracking-tight transition-all ${
              selected
                ? 'bg-white text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_6px_-2px_rgba(0,0,0,0.10)] ring-1 ring-black/[0.04]'
                : 'text-gray-500 hover:text-gray-700 active:scale-[0.97]'
            }`}
          >
            {opt.label}
            {isRecommended && <RecommendedBadge />}
          </button>
        )
      })}
    </div>
  )
}

function RecommendedBadge() {
  return (
    <span
      aria-hidden
      className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold shadow ring-2 ring-white"
      title="Recommended"
    >
      ★
    </span>
  )
}
