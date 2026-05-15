'use client'

import { useEffect, useState } from 'react'

/**
 * useDebouncedValue — returns a debounced copy of a value that only updates
 * after `delay` ms of stillness.
 *
 *   const [search, setSearch] = useUrlState('q', '')
 *   const debouncedSearch = useDebouncedValue(search, 200)
 *   // use `search` for the input value, `debouncedSearch` for the filter
 *
 * Used on the admin search inputs so typing in a 1000-row table doesn't
 * re-filter on every keystroke. 200ms feels instant to the user but cuts
 * filter work by ~5x for typical typing speeds.
 */
export function useDebouncedValue<T>(value: T, delay: number = 200): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
