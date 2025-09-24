import { useCallback, useRef } from 'react'

/**
 * Creates a stable callback that doesn't change between renders
 * This helps prevent unnecessary re-renders and useEffect dependency issues
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback)

  // Update the ref with the latest callback
  callbackRef.current = callback

  // Return a stable function that calls the latest callback
  return useCallback(((...args: any[]) => {
    return callbackRef.current(...args)
  }) as T, [])
}