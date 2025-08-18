import { useEffect, useCallback, useRef } from 'react'

interface KeyboardNavigationConfig {
  containerRef: React.RefObject<HTMLElement>
  itemSelector: string
  onSelect?: (index: number, element: HTMLElement) => void
  onEscape?: () => void
  circular?: boolean
  disabled?: boolean
}

export function useKeyboardNavigation({
  containerRef,
  itemSelector,
  onSelect,
  onEscape,
  circular = true,
  disabled = false
}: KeyboardNavigationConfig) {
  const currentIndexRef = useRef(-1)

  const getItems = useCallback(() => {
    if (!containerRef.current) return []
    return Array.from(containerRef.current.querySelectorAll(itemSelector)) as HTMLElement[]
  }, [containerRef, itemSelector])

  const focusItem = useCallback((index: number) => {
    const items = getItems()
    if (items.length === 0) return

    // Remove previous focus indicators
    items.forEach(item => {
      item.classList.remove('keyboard-focused')
      item.setAttribute('tabindex', '-1')
    })

    // Set new focus
    if (index >= 0 && index < items.length) {
      const item = items[index]
      item.classList.add('keyboard-focused')
      item.setAttribute('tabindex', '0')
      item.focus()
      currentIndexRef.current = index
    }
  }, [getItems])

  const moveUp = useCallback(() => {
    const items = getItems()
    if (items.length === 0) return

    let newIndex = currentIndexRef.current - 1
    if (newIndex < 0) {
      newIndex = circular ? items.length - 1 : 0
    }
    focusItem(newIndex)
  }, [getItems, focusItem, circular])

  const moveDown = useCallback(() => {
    const items = getItems()
    if (items.length === 0) return

    let newIndex = currentIndexRef.current + 1
    if (newIndex >= items.length) {
      newIndex = circular ? 0 : items.length - 1
    }
    focusItem(newIndex)
  }, [getItems, focusItem, circular])

  const selectCurrent = useCallback(() => {
    const items = getItems()
    const currentIndex = currentIndexRef.current
    
    if (currentIndex >= 0 && currentIndex < items.length) {
      const currentItem = items[currentIndex]
      onSelect?.(currentIndex, currentItem)
    }
  }, [getItems, onSelect])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        moveUp()
        break
      case 'ArrowDown':
        event.preventDefault()
        moveDown()
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        selectCurrent()
        break
      case 'Escape':
        event.preventDefault()
        onEscape?.()
        break
      case 'Home':
        event.preventDefault()
        focusItem(0)
        break
      case 'End':
        event.preventDefault()
        const items = getItems()
        focusItem(items.length - 1)
        break
    }
  }, [disabled, moveUp, moveDown, selectCurrent, onEscape, focusItem, getItems])

  useEffect(() => {
    const container = containerRef.current
    if (!container || disabled) return

    container.addEventListener('keydown', handleKeyDown)
    
    // Set initial tabindex for all items
    const items = getItems()
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1')
    })

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [containerRef, handleKeyDown, disabled, getItems])

  const reset = useCallback(() => {
    currentIndexRef.current = -1
    const items = getItems()
    items.forEach((item, index) => {
      item.classList.remove('keyboard-focused')
      item.setAttribute('tabindex', index === 0 ? '0' : '-1')
    })
  }, [getItems])

  return {
    focusItem,
    reset,
    currentIndex: currentIndexRef.current
  }
}

// Hook for managing focus trap (useful for modals)
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean = true
) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input[type="text"]:not([disabled])',
      'input[type="radio"]:not([disabled])',
      'input[type="checkbox"]:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',')

    const getFocusableElements = () => {
      return Array.from(container.querySelectorAll(focusableSelector)) as HTMLElement[]
    }

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey) {
        // Shift + Tab (backward)
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab (forward)
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    // Focus first element when trap activates
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    container.addEventListener('keydown', handleTabKey)

    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }, [containerRef, isActive])
}