/**
 * Locale-aware Korean-won formatting.
 *
 * Korean counts money in 만 (10,000) and 억 (100,000,000) units — a compact
 * axis label must read "₩120만" / "₩1.2억", never "₩1.2M". English keeps the
 * K/M convention. Full form is comma-grouped won in both languages.
 */

const KO = (language: string | undefined | null) => language === 'korean'

/** Trim to at most one decimal, dropping a trailing ".0". */
function oneDecimal(n: number): string {
  const rounded = Math.round(n * 10) / 10
  // Grouping matters for things like 1235만; keep it via toLocaleString.
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

/** Compact form for axis ticks and headline figures: ₩120만 / ₩1.2억 / ₩1.2M. */
export function formatWonCompact(value: number, language: string | undefined | null): string {
  if (!Number.isFinite(value)) return '₩0'
  const sign = value < 0 ? '-' : ''
  const v = Math.abs(value)

  if (KO(language)) {
    if (v >= 100_000_000) return `${sign}₩${oneDecimal(v / 100_000_000)}억`
    if (v >= 10_000) return `${sign}₩${oneDecimal(v / 10_000)}만`
    return `${sign}₩${v.toLocaleString('ko-KR')}`
  }

  if (v >= 1_000_000) return `${sign}₩${oneDecimal(v / 1_000_000)}M`
  if (v >= 1_000) return `${sign}₩${oneDecimal(v / 1_000)}K`
  return `${sign}₩${v.toLocaleString('en-US')}`
}

/** Full form for tooltips and tables: ₩1,234,567. */
export function formatWonFull(value: number, language: string | undefined | null): string {
  if (!Number.isFinite(value)) return '₩0'
  const sign = value < 0 ? '-' : ''
  const v = Math.abs(value)
  return `${sign}₩${v.toLocaleString(KO(language) ? 'ko-KR' : 'en-US')}`
}
