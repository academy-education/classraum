'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * AdminSkeleton — shared loading-state primitives for admin pages.
 *
 * All admin pages render their loading view through one of these so the
 * shimmer pattern, surface treatment and spacing match the real UI 1:1.
 * Backed by the main app's <Skeleton> primitive so admin / app loading
 * states use the same shimmer sweep instead of a basic pulse.
 *
 * Composition:
 *   <AdminSkeleton.PageHeader />
 *   <AdminSkeleton.StatsGrid count={4} />
 *   <AdminSkeleton.Filters />
 *   <AdminSkeleton.Table rows={6} cols={5} />
 */
function Bar({ className }: { className?: string }) {
  return <Skeleton className={cn(className)} />
}

function PageHeader() {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-2.5">
        <Bar className="h-3 w-20" />
        <Bar className="h-7 w-56" />
        <Bar className="h-3 w-72" />
      </div>
      <Bar className="h-9 w-28" />
    </div>
  )
}

function StatCard() {
  return (
    <div className="bg-white rounded-xl ring-1 ring-gray-200/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2.5 flex-1">
          <Bar className="h-2.5 w-16" />
          <Bar className="h-7 w-20" />
          <Bar className="h-3 w-24" />
        </div>
        <Bar className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  )
}

function StatsGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCard key={i} />
      ))}
    </div>
  )
}

function Filters() {
  return (
    <div className="bg-white p-4 rounded-xl ring-1 ring-gray-200/70 flex flex-col md:flex-row gap-3">
      <Bar className="h-9 flex-1" />
      <div className="flex gap-2">
        <Bar className="h-9 w-32" />
        <Bar className="h-9 w-32" />
        <Bar className="h-9 w-24" />
      </div>
    </div>
  )
}

function Table({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-gray-200/70 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50/60 border-b border-gray-200/70 px-6 py-3 grid gap-4"
           style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Bar key={i} className="h-2.5 w-16" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="px-6 py-4 grid gap-4 items-center"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Bar key={c} className={cn('h-3.5', c === 0 ? 'w-32' : 'w-20')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function List({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-gray-200/70 divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-3">
          <Bar className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Bar className="h-3 w-44" />
            <Bar className="h-2.5 w-64" />
          </div>
          <Bar className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}

/**
 * TableRows — `<tr>` skeleton rows that drop straight into an existing
 * `<tbody>`. Use when the parent already renders the `<table>` + `<thead>`
 * structure and only the data rows need to be a skeleton during load.
 */
function TableRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-6 py-4">
              <Bar className={cn('h-3.5', c === 0 ? 'w-32' : 'w-20')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/**
 * LogRows — divide-y rows that fit inside any pre-existing container.
 * Used by ErrorLogs / ActivityLogs / WebhookEvents / CommentReports etc.
 * where the parent already provides the rounded surface + ring.
 *
 * Each row is shaped like the real log row: status pill + a header line
 * (service name, timestamp) + a message line.
 */
function LogRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Bar className="h-5 w-16 rounded-full" />
            <Bar className="h-3 w-24" />
            <Bar className="h-3 w-32" />
          </div>
          <Bar className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}

/** Body-only skeleton: stats + filters + table. Use this in pages where
 * the real <AdminPageHeader> stays mounted during loading (matches the
 * teacher / manager pages — header & action buttons remain visible while
 * the data area shows a skeleton). */
function Body({
  stats = 4,
  rows = 6,
  cols = 5,
}: {
  stats?: number
  rows?: number
  cols?: number
}) {
  return (
    <>
      <StatsGrid count={stats} />
      <Filters />
      <Table rows={rows} cols={cols} />
    </>
  )
}

/** Legacy "Page" composer that also renders a skeleton header. New pages
 * should use <Body> + a real <AdminPageHeader> instead so the title/action
 * buttons don't flicker. Kept for any consumer not yet migrated. */
function Page({
  stats = 4,
  rows = 6,
  cols = 5,
}: {
  stats?: number
  rows?: number
  cols?: number
}) {
  return (
    <div className="space-y-6">
      <PageHeader />
      <Body stats={stats} rows={rows} cols={cols} />
    </div>
  )
}

export const AdminSkeleton = {
  Bar,
  PageHeader,
  StatCard,
  StatsGrid,
  Filters,
  Table,
  TableRows,
  List,
  LogRows,
  Body,
  Page,
}
