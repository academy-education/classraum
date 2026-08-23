'use client'

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * The sort and filter controls for a list page's CARD view.
 *
 * ── Why this exists ──────────────────────────────────────────────────
 * Eight manager pages switch to cards below `md` (see
 * `useResponsiveViewMode`), which fixed a real horizontal-overflow
 * problem and introduced a quieter one: on /payments, /reports and
 * /announcements every sort button and every filter funnel lives inside
 * a `<thead>` cell. In card view there IS no thead, so those controls do
 * not render at all — a manager on a phone could search, but could not
 * sort by due date or filter to unpaid. Nothing was broken; the controls
 * simply had nowhere to be.
 *
 * ── Why a Select and not a row of chips ──────────────────────────────
 * The app has two established toolbar idioms and this is deliberately a
 * synthesis of both rather than a third one imported from elsewhere:
 *
 *   · Idiom 1 — a Radix `Select` with the h-12 trigger, used for the
 *     classroom/pause filters on /classrooms, /assignments and
 *     /sessions. Every FILTER here is one of these, with the same
 *     copy-pasted trigger className those pages use, so a filter looks
 *     identical whichever page you meet it on.
 *
 *   · Idiom 2 — the sort chip on /assignments, which cycles
 *     desc → asc → off and swaps `ArrowUpDown` for `ArrowDown`/`ArrowUp`
 *     to show its state. That vocabulary is kept for the DIRECTION
 *     button here.
 *
 * A chip per sort field was the obvious move and does not fit: /payments
 * offers five sortable columns and /reports five, and five h-12 chips at
 * ~110px each wrap to three rows at 375px — taller than the first card
 * they are supposed to sit above. One Select scales to any number of
 * fields at constant height, which is why the field picker is a Select
 * and only the direction stayed a button.
 *
 * ── Why it is gated on the VIEW MODE, not the breakpoint ─────────────
 * The caller renders this when `viewMode === 'card'`. That is not the
 * same test as "is the viewport narrow": a user on a desktop who clicks
 * the card-view toggle loses the thead for exactly the same reason, and
 * would lose sorting with a `md:hidden` gate. Conversely it must NOT
 * render in table view, where it would be a second, competing copy of
 * controls the header already has.
 *
 * ── Direction is disabled, not hidden, with no sort field ────────────
 * Hiding it would reflow the row every time the field changes away from
 * "default order". Disabled keeps the layout still and still reads as
 * "pick a field first".
 */

/** One choice in the sort-field picker, or in a filter's option list. */
export interface CardListOption {
  /** The value written to state. Must be non-empty — Radix reserves ''. */
  value: string
  /** Already localised. This component does not translate captions it
   *  is handed, because the callers' labels come from per-page
   *  namespaces (`payments.dueDate`, `reports.school`) that only the
   *  caller knows. */
  label: string
}

/** One filter dropdown — a status filter, a classroom filter, etc. */
export interface CardListFilter {
  /** Stable key for React, and the test hook (`data-filter`). */
  id: string
  /** Accessible name, e.g. the localised "Status". */
  label: string
  value: string
  onChange: (value: string) => void
  /** Includes its own "all" entry; this component adds nothing. */
  options: CardListOption[]
}

/** The house trigger, verbatim from /classrooms and /assignments so the
 *  card-mode filter is visually the same control as the toolbar one. */
const TRIGGER_CLASS =
  "[&[data-size=default]]:h-12 h-12 min-h-[3rem] rounded-lg border border-border bg-white focus:border-primary focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"

/** Radix treats '' as "no value" and throws on an empty SelectItem, so
 *  "no sort" needs a real sentinel rather than the natural `null`. */
const NO_SORT = '__none__'

export function CardListControls({
  sortOptions,
  sortField,
  sortDirection,
  onSortFieldChange,
  onSortDirectionChange,
  filters = [],
  className = '',
}: {
  /** Empty ⇒ the sort half is omitted entirely (a page with filters but
   *  no sortable columns still gets its filters). */
  sortOptions?: CardListOption[]
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  onSortFieldChange: (field: string | null) => void
  onSortDirectionChange: (direction: 'asc' | 'desc') => void
  filters?: CardListFilter[]
  className?: string
}) {
  const { t } = useTranslation()
  const hasSort = !!sortOptions && sortOptions.length > 0
  if (!hasSort && filters.length === 0) return null

  const directionLabel = String(
    t(sortDirection === 'asc' ? 'common.sortAscending' : 'common.sortDescending'),
  )

  return (
    // `flex-wrap` + `min-w-0` on each control is what keeps 375px safe:
    // the controls wrap onto a second line rather than forcing the page
    // wider, which is the exact failure the card view was introduced to
    // fix. Nothing here is `whitespace-nowrap` at the row level, and the
    // Select's own value is `line-clamp-1`, so a long Korean label
    // truncates inside its trigger instead of pushing the row out.
    <div
      className={`flex flex-wrap items-center gap-2 mb-4 ${className}`}
      data-testid="card-list-controls"
    >
      {hasSort && (
        <>
          <Select
            value={sortField ?? NO_SORT}
            onValueChange={value =>
              onSortFieldChange(value === NO_SORT ? null : value)
            }
          >
            <SelectTrigger
              aria-label={String(t('common.sortBy'))}
              data-testid="card-sort-field"
              className={`${TRIGGER_CLASS} flex-1 min-w-0 basis-[9.5rem]`}
            >
              <SelectValue placeholder={String(t('common.sortBy'))} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SORT}>{t('common.sortDefault')}</SelectItem>
              {sortOptions!.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            data-testid="card-sort-direction"
            aria-label={directionLabel}
            title={directionLabel}
            disabled={!sortField}
            onClick={() =>
              onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')
            }
            className={`h-12 w-12 shrink-0 rounded-lg border flex items-center justify-center transition-colors shadow-sm bg-white ${
              sortField
                ? 'border-primary text-primary'
                : 'border-border text-gray-400 cursor-not-allowed opacity-60'
            }`}
          >
            {sortField ? (
              sortDirection === 'asc' ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )
            ) : (
              <ArrowUpDown className="w-4 h-4" />
            )}
          </button>
        </>
      )}

      {filters.map(filter => (
        <Select key={filter.id} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger
            aria-label={filter.label}
            data-testid={`card-filter-${filter.id}`}
            className={`${TRIGGER_CLASS} flex-1 min-w-0 basis-[9.5rem]`}
          >
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  )
}
