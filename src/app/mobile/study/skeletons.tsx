"use client"

/**
 * Shared shimmer skeleton primitives for the study surfaces.
 *
 * Consolidates the four-or-five ad-hoc loading states (mix of
 * Loader2 spinners + landing-only shimmer cards) into reusable
 * building blocks so every loading state across the study app
 * uses the same shimmer animation, color palette, and rhythm.
 *
 * Composition pattern: pages build their loading state from these
 * primitives in a layout that mirrors the post-load content —
 * eliminates layout shift on the load → loaded transition.
 *
 * The shimmer keyframe lives in globals.css (.animate-shimmer-soft).
 */

import React from 'react'

/** Solid gray rounded block — the universal shimmer atom.
 *  Compose with sizing utilities to match any text/icon/card. */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gradient-to-br from-gray-100 to-gray-200 animate-shimmer-soft ${className}`} />
  )
}

/** Text-row skeleton — a short rounded bar sized like a single
 *  line of text. Use `widthClass` (e.g. "w-2/5") to vary line
 *  lengths so the loading state doesn't read as a checkerboard. */
export function SkeletonText({
  widthClass = 'w-2/5',
  height = 'h-3',
  className = '',
}: { widthClass?: string; height?: string; className?: string }) {
  return <SkeletonBlock className={`${height} ${widthClass} rounded-full ${className}`} />
}

/** Card-shaped skeleton — matches the chrome (rounded-2xl + ring +
 *  light shadow) of the real study cards so the loading state
 *  reads as "card is being drawn" not "loading screen". */
export function SkeletonCard({
  className = '',
  children,
}: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${className}`}>
      {children}
    </div>
  )
}

/** Icon-tile skeleton — square shimmer tile matching the
 *  rounded-2xl gradient-icon-tile pattern used across study cards. */
export function SkeletonIconTile({ size = 'w-11 h-11' }: { size?: string }) {
  return <SkeletonBlock className={`${size} rounded-2xl flex-shrink-0`} />
}

/** Section header skeleton — bold-title-sized text bar. */
export function SkeletonHeader({ widthClass = 'w-1/3' }: { widthClass?: string }) {
  return <SkeletonText widthClass={widthClass} height="h-4" className="mb-3" />
}

/** Full-width carousel-card skeleton — same proportions as a
 *  Recommended / Resumable / MistakeBank card so the carousel's
 *  loading state matches its loaded state. */
export function SkeletonCarouselCard() {
  // Width / max-width / min-height / py must mirror the live carousel
  // card sizing in Recommended/Resumable/MistakeBank so load→loaded
  // has no layout shift.
  return (
    <SkeletonCard className="snap-center flex-none w-[300px] max-w-[calc(100vw-72px)] p-4 min-h-[164px]">
      <div className="flex items-start gap-3.5">
        <SkeletonIconTile />
        <div className="flex-1 space-y-2 pt-1">
          <SkeletonText widthClass="w-3/5" />
          <SkeletonText widthClass="w-2/5" height="h-2.5" />
        </div>
      </div>
    </SkeletonCard>
  )
}

/** Carousel-shaped skeleton — N edge-bleed card placeholders
 *  matching the live carousel layout. Stagger-fade for parity
 *  with the entrance animation on the real cards. */
export function SkeletonCarousel({ count = 3 }: { count?: number }) {
  return (
    <div className="-mx-5">
      <div
        style={{ paddingInline: 'max(40px, calc((100vw - 300px) / 2))' }}
        className="flex gap-3 overflow-x-hidden py-6"
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{ animationDelay: `${i * 60}ms` }}
            className="animate-card-in opacity-0"
          >
            <SkeletonCarouselCard />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Single metric-card skeleton (for the stats hero grid). */
export function SkeletonMetricCard() {
  return (
    <SkeletonCard className="p-4 min-h-[104px]">
      <SkeletonIconTile size="w-9 h-9" />
      <div className="mt-2 space-y-1.5">
        <SkeletonBlock className="h-6 w-1/3 rounded" />
        <SkeletonText widthClass="w-2/5" height="h-2.5" />
      </div>
    </SkeletonCard>
  )
}

/** Stats hero grid skeleton — 2x2 metric cards. */
export function SkeletonMetricGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{ animationDelay: `${i * 60}ms` }}
          className="animate-card-in opacity-0"
        >
          <SkeletonMetricCard />
        </div>
      ))}
    </div>
  )
}

/** Row-list skeleton — for stats topic lists, prefs option lists,
 *  etc. N stacked rows with icon + text. */
export function SkeletonRowList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard
          key={i}
          className="p-3.5 flex items-center justify-between"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <SkeletonIconTile size="w-7 h-7" />
            <SkeletonText widthClass="w-2/5" />
          </div>
          <SkeletonText widthClass="w-12" height="h-4" className="rounded-full" />
        </SkeletonCard>
      ))}
    </div>
  )
}

/** Test-prep grid skeleton — 2-col grid of taller gradient cards
 *  matching the test prep grid layout on the landing page. */
export function SkeletonTestGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{ animationDelay: `${i * 60}ms` }}
          className="relative overflow-hidden rounded-2xl min-h-[120px] p-4 bg-gradient-to-br from-gray-100 to-gray-200 ring-1 ring-gray-200/60 animate-card-in opacity-0"
        >
          <div className="absolute inset-0 animate-shimmer-soft" />
        </div>
      ))}
    </div>
  )
}

/** Subject-square grid skeleton — 2-col grid matching SubjectSquareCard
 *  with icon tile + title + subtitle. Used on the landing subjects section. */
export function SkeletonSquareGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{ animationDelay: `${i * 60}ms` }}
          className="relative overflow-hidden rounded-2xl min-h-[140px] p-4 bg-white ring-1 ring-gray-200/60 animate-card-in opacity-0 flex flex-col justify-between"
        >
          <SkeletonIconTile size="w-12 h-12" />
          <div className="space-y-1.5">
            <SkeletonText widthClass="w-3/5" />
            <SkeletonText widthClass="w-1/3" height="h-2.5" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Settings-group skeleton — for prefs page. Mimics the layout of
 *  a SettingGroup (label row + option grid/segmented). */
export function SkeletonSettingsGroup({ rows = 1 }: { rows?: number }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <SkeletonBlock className="w-4 h-4 rounded" />
        <SkeletonText widthClass="w-1/4" height="h-2.5" />
      </div>
      <SkeletonBlock className={`${rows === 1 ? 'h-10' : 'h-24'} rounded-xl`} />
    </div>
  )
}
