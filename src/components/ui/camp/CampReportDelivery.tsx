"use client"

import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { MessageCircle, Lock } from 'lucide-react'

/**
 * "Send to parents over KakaoTalk" — a PLACEHOLDER.
 *
 * It does not send anything and it is not wired to anything. That is
 * deliberate and it is why the control is `disabled` and says so on its
 * face rather than looking live: a checkbox that appears to send a
 * report and quietly does nothing is worse than no checkbox at all,
 * because the teacher believes the parent was told. The delivery seam
 * itself (`queueCampReportDelivery` in src/lib/camp/reports.ts) is
 * still a no-op, and this component must stay inert until it isn't.
 *
 * What it is for: showing the shape of the feature, and stating the
 * three things that have to exist before it can be switched on — a
 * Kakao business channel, an approved Alimtalk template, and a
 * registered sender number. Those are procurement, not code.
 *
 * WHEN THIS GOES LIVE: delete `disabled`, lift the notice, and wire the
 * value into the generate call. Do not do the first without the last.
 */

export interface CampReportDeliveryProps {
  t: (key: string, params?: Record<string, string | number | undefined>) => string | string[]
}

export function CampReportDelivery({ t }: CampReportDeliveryProps) {
  return (
    <div className="mt-5 rounded-lg border border-dashed border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Checkbox
            id="camp-report-kakao"
            checked={false}
            disabled
            aria-describedby="camp-report-kakao-note"
            className="mt-0.5"
          />
          <div className="space-y-1 min-w-0">
            <Label
              htmlFor="camp-report-kakao"
              className="text-sm font-medium text-foreground/50 flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
              {t('camp.reports.delivery.heading')} · {t('camp.reports.delivery.kakao')}
            </Label>
            <p id="camp-report-kakao-note" className="text-xs text-muted-foreground">
              {t('camp.reports.delivery.explain')}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-400 flex-shrink-0">
          <Lock className="w-2.5 h-2.5" strokeWidth={2.5} />
          {t('camp.reports.delivery.notReady')}
        </span>
      </div>

      <div className="pl-7 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t('camp.reports.delivery.whatsNeeded')}
        </p>
        <ul className="space-y-1">
          {(['step1', 'step2', 'step3'] as const).map(step => (
            <li key={step} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
              <span>{t(`camp.reports.delivery.${step}`)}</span>
            </li>
          ))}
        </ul>
        {/* Say what already works, so the disabled control does not read
            as "parents cannot see reports". They can. */}
        <p className="text-xs text-muted-foreground/80 pt-1">
          {t('camp.reports.delivery.parentsCanRead')}
        </p>
      </div>
    </div>
  )
}
