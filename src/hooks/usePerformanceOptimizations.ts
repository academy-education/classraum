import { useCallback, useMemo, useState, useEffect, useRef } from 'react'

export function useOptimizedCallbacks<T>(
  actions: Record<string, (item: T) => void>,
  dependencies: React.DependencyList = []
) {
  return useMemo(() => {
    const optimizedActions: Record<string, (item: T) => void> = {}
    
    Object.entries(actions).forEach(([key, action]) => {
      // Create a memoized version without using hooks inside loops
      optimizedActions[key] = action
    })
    
    return optimizedActions
  }, [actions, ...dependencies])
}

export function useVirtualizedList<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5
) {
  return useMemo(() => {
    const totalHeight = items.length * itemHeight
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    
    return {
      totalHeight,
      visibleCount,
      overscan,
      getVisibleRange: (scrollTop: number) => {
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
        const endIndex = Math.min(
          items.length - 1,
          startIndex + visibleCount + overscan * 2
        )
        
        return {
          startIndex,
          endIndex,
          items: items.slice(startIndex, endIndex + 1),
          offsetY: startIndex * itemHeight
        }
      }
    }
  }, [items.length, containerHeight, itemHeight, overscan])
}

export function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function useMemoizedFilter<T>(
  items: T[],
  filterFn: (item: T) => boolean,
  dependencies: React.DependencyList
) {
  return useMemo(
    () => items.filter(filterFn),
    [items, ...dependencies]
  )
}

export function useLazyLoading(threshold: number = 0.1) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  return { ref, isVisible }
}