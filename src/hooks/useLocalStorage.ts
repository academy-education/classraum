import { useState, useEffect, useCallback } from 'react'

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: {
    serialize?: (value: T) => string
    deserialize?: (value: string) => T
  } = {}
) {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse
  } = options

  // Get value from localStorage or use initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? deserialize(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Update localStorage when value changes
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, serialize(valueToStore))
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, serialize, storedValue])

  // Remove item from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  // Listen for changes in other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(deserialize(e.newValue))
        } catch (error) {
          console.error(`Error deserializing localStorage key "${key}":`, error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, deserialize])

  return [storedValue, setValue, removeValue] as const
}

// Specialized hook for storing objects
export function useLocalStorageObject<T extends Record<string, any>>(
  key: string,
  initialValue: T
) {
  return useLocalStorage(key, initialValue, {
    serialize: (value) => JSON.stringify(value),
    deserialize: (value) => {
      try {
        return JSON.parse(value)
      } catch {
        return initialValue
      }
    }
  })
}

// Hook for storing arrays
export function useLocalStorageArray<T>(
  key: string,
  initialValue: T[] = []
) {
  return useLocalStorage(key, initialValue, {
    serialize: (value) => JSON.stringify(value),
    deserialize: (value) => {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : initialValue
      } catch {
        return initialValue
      }
    }
  })
}