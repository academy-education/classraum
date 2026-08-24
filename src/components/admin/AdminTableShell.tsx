'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { isInteractiveTarget } from './rowActivation';

/**
 * Responsive table chrome for the admin panel.
 *
 * Mirrors how the manager dashboard handles wide tables (see
 * src/components/ui/dashboard/DataTable.tsx): below `md` the table is
 * replaced outright by a stack of cards, and from `md` up the real table
 * renders inside a horizontal scroller. Horizontal scrolling alone is not
 * enough here — the admin tables run 6–8 columns, so on a phone the user
 * would be dragging a 900px table sideways with no anchor column, which is
 * effectively unusable.
 *
 * Usage mirrors DataTable's `mobileRender`: pass the card stack as `mobile`
 * and the <table> as children. Omit `mobile` and you get the old
 * scroll-only behavior, which is still right for genuinely narrow tables.
 */
export function AdminTableShell({
  mobile,
  className,
  children,
}: {
  mobile?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden',
        className,
      )}
    >
      {mobile ? <div className="md:hidden divide-y divide-gray-100">{mobile}</div> : null}
      <div className={cn('overflow-x-auto', mobile && 'hidden md:block')}>{children}</div>
    </div>
  );
}

/**
 * One row of the mobile card stack.
 *
 * `title` is the row's identity (name, academy, payment id), `meta` the
 * label/value pairs that were columns, and `actions` whatever the row's
 * action column held. Everything is min-w-0 + truncate by default because
 * emails and academy names are the usual overflow culprits.
 */
export function AdminMobileRow({
  title,
  subtitle,
  badge,
  meta,
  actions,
  onClick,
  selected,
  lead,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  meta?: Array<{ label: string; value: React.ReactNode }>;
  actions?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  /** Slot before the title — a bulk-select checkbox or avatar. */
  lead?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'p-4 transition-colors',
        selected ? 'bg-primary/5' : onClick && 'active:bg-gray-50',
        onClick && 'cursor-pointer',
      )}
      /* The card contains the row's bulk-select checkbox and its kebab.
         Without this guard, ticking the checkbox or opening the menu would
         also fire the card's onClick — i.e. adding row activation would
         break the two controls that already worked. Same guard the desktop
         <tr> uses. */
      onClick={onClick && ((e) => { if (!isInteractiveTarget(e.target)) onClick() })}
    >
      <div className="flex items-start gap-3">
        {lead ? <div className="flex-shrink-0 pt-0.5">{lead}</div> : null}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900 truncate">{title}</div>
          {subtitle ? (
            <div className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</div>
          ) : null}
        </div>
        {badge ? <div className="flex-shrink-0">{badge}</div> : null}
        {actions ? <div className="flex-shrink-0 -mt-1">{actions}</div> : null}
      </div>

      {meta && meta.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 pt-3 border-t border-gray-100">
          {meta.map((m, i) => (
            <div key={i} className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                {m.label}
              </dt>
              <dd className="text-sm text-gray-900 truncate mt-0.5">{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
