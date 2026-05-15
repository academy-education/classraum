/**
 * Absolute-positioned `/` keyboard hint for search inputs.
 *
 * Drop this inside the same `relative` wrapper that holds the Search icon
 * + Input (the standard pattern across manager pages). Hidden on phones
 * where keyboards aren't physical, visible from `sm:` upward.
 *
 * Usage:
 *   <div className="relative ...">
 *     <Search className="absolute left-3 ..." />
 *     <Input className="... pl-12 pr-12 ..." />
 *     <SearchKbdHint />
 *   </div>
 *
 * Important: bump the input's right padding (e.g. `pr-12`) so typed text
 * doesn't slide under the chip.
 */
export function SearchKbdHint() {
  return (
    <kbd
      aria-hidden
      className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded border border-gray-200 bg-gray-50 text-[11px] font-medium text-gray-500 pointer-events-none select-none font-mono"
    >
      /
    </kbd>
  )
}
