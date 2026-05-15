'use client'

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  /** Color accent applied to the icon chip. Defaults to brand blue. */
  accent?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

// Accent palette — keep all surfaces tinted lightly so the cards still scan
// as "white" but get a hint of categorization. Stronger color reserved for
// the icon itself.
const accentMap: Record<NonNullable<DashboardCardProps['accent']>, { chip: string; ring: string; icon: string; bar: string }> = {
  blue:    { chip: 'bg-[#2885e8]/10', ring: 'ring-[#2885e8]/15', icon: 'text-[#2885e8]', bar: 'from-[#2885e8] to-[#5ba3ff]' },
  emerald: { chip: 'bg-emerald-50',   ring: 'ring-emerald-200/60', icon: 'text-emerald-600', bar: 'from-emerald-500 to-emerald-400' },
  amber:   { chip: 'bg-amber-50',     ring: 'ring-amber-200/60',   icon: 'text-amber-600',   bar: 'from-amber-500 to-amber-400' },
  rose:    { chip: 'bg-rose-50',      ring: 'ring-rose-200/60',    icon: 'text-rose-600',    bar: 'from-rose-500 to-rose-400' },
  violet:  { chip: 'bg-violet-50',    ring: 'ring-violet-200/60',  icon: 'text-violet-600',  bar: 'from-violet-500 to-violet-400' },
  slate:   { chip: 'bg-slate-100',    ring: 'ring-slate-200/80',   icon: 'text-slate-600',   bar: 'from-slate-500 to-slate-400' },
}

export function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  accent = 'blue',
  trend,
  className,
}: DashboardCardProps) {
  const a = accentMap[accent];
  return (
    <div
      className={cn(
        // Refined surface: thinner ring + soft shadow that escalates on hover
        'group relative bg-white rounded-xl ring-1 ring-gray-200/70 p-5 transition-all duration-300',
        'hover:ring-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-px',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Small caps title sits above the big stat — Linear / Stripe pattern */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-[28px] leading-none font-semibold text-gray-900 tracking-tight tabular-nums">
              {value}
            </p>
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums',
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" strokeWidth={2.5} />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1.5 truncate">{subtitle}</p>
          )}
        </div>

        {/* Icon chip — color-coded, sits in a rounded square with ring */}
        <div
          className={cn(
            'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg ring-1',
            a.chip,
            a.ring,
            a.icon,
          )}
        >
          {icon}
        </div>
      </div>

      {/* Trend bar — tinted to match accent for a subtle quality cue */}
      {trend && (
        <div className="mt-4 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r', a.bar)}
            style={{ width: `${Math.min(Math.abs(trend.value), 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
