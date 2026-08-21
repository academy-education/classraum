"use client"

/**
 * DashboardGrid — wraps react-grid-layout's ResponsiveGridLayout so the
 * dashboard page can dynamic-import it. react-grid-layout is the largest
 * dependency on the dashboard route (~100kB minified across the lib +
 * react-resizable + react-draggable). Pulling it out of the page bundle
 * lets first-paint scripts load and parse without it; the grid chunk
 * lands afterwards and hydrates the layout container.
 *
 * The CSS imports stay in the page module (they're side-effect imports
 * with no JS cost) so the visual layout doesn't shift when this chunk
 * arrives.
 */

import React, { useEffect, useRef, useState } from 'react'
import type { Layout, ResponsiveLayouts as Layouts } from 'react-grid-layout'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Responsive } = require('react-grid-layout/legacy')
const ResponsiveGridLayout = Responsive

export interface DashboardGridProps {
  layouts: Layouts
  breakpoints: Record<string, number>
  cols: Record<string, number>
  isEditMode: boolean
  onLayoutChange: (currentLayout: Layout[], allLayouts: Layouts) => void
  onResizeStop: (
    layout: Layout[],
    oldItem: Layout,
    newItem: Layout,
    placeholder: Layout,
    e: MouseEvent,
    element: HTMLElement,
  ) => void
  children: React.ReactNode
}

export default function DashboardGrid({
  layouts,
  breakpoints,
  cols,
  isEditMode,
  onLayoutChange,
  onResizeStop,
  children,
}: DashboardGridProps) {
  /* The library's own `WidthProvider` is NOT used here.
   *
   * WidthProvider seeds its width state at 1280 and corrects it from a
   * ResizeObserver it attaches via a ref passed into the composed
   * component. `Responsive` is not a forwardRef component, so under React
   * 19 that ref never reaches a DOM node, the observer is never attached,
   * and the width stays 1280 for the life of the page — measured: on a
   * 375px phone and on a 1024x640 laptop the grid still picked the `lg`
   * breakpoint and laid 12 desktop columns out over 1280px, so the whole
   * main region scrolled sideways. A real viewport change did not fix it.
   *
   * Measuring the container here and passing `width` explicitly removes
   * the ref entirely. */
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    const node = hostRef.current
    if (!node) return
    const apply = () => setWidth(node.getBoundingClientRect().width)
    apply()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', apply)
      return () => window.removeEventListener('resize', apply)
    }
    const ro = new ResizeObserver(apply)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={hostRef} className="w-full">
      {width !== null && (
        <ResponsiveGridLayout
          className="layout"
          width={width}
          layouts={layouts}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={80}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          onLayoutChange={onLayoutChange}
          onResizeStop={onResizeStop}
          draggableHandle=".drag-handle"
          useCSSTransforms={true}
          compactType="vertical"
          preventCollision={false}
        >
          {children}
        </ResponsiveGridLayout>
      )}
    </div>
  )
}
