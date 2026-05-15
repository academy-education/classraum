'use client'

import React from 'react'

interface AdminPageHeaderProps {
  /** Small caps brand-color label above the title (e.g. "Customers", "People"). */
  kicker?: string
  /** The big title — kept short so it sits on one line. */
  title: string
  /** Optional muted subtitle that explains what the page does. */
  description?: string
  /** Right-aligned action slot — primary CTAs, status pills, refresh, etc. */
  actions?: React.ReactNode
}

/**
 * AdminPageHeader — single source of truth for the page-header pattern used
 * across every admin page. Use instead of hand-rolling
 * `<h1 className="text-2xl font-bold ...">` so spacing / type / kicker color
 * all stay in lockstep.
 *
 *   <AdminPageHeader
 *     kicker="Customers"
 *     title="Academies"
 *     description="Manage academy accounts, subscriptions and onboarding invites."
 *     actions={<Button>Add academy</Button>}
 *   />
 */
export function AdminPageHeader({ kicker, title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2885e8]">
            {kicker}
          </p>
        )}
        <h1 className="mt-1 text-3xl font-semibold text-gray-900 tracking-tight leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-gray-500 mt-1.5">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
