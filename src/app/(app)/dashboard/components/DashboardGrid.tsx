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

import React from 'react'
import type { Layout, ResponsiveLayouts as Layouts } from 'react-grid-layout'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Responsive, WidthProvider } = require('react-grid-layout/legacy')
const ResponsiveGridLayout = WidthProvider(Responsive)

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
  return (
    <ResponsiveGridLayout
      className="layout"
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
  )
}
