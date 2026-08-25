"use client"

import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tent, Lock, AlertTriangle } from 'lucide-react'
import { isProgramOpen } from '@/lib/camp/cap'
import type { CampProgramOption } from '@/hooks/useCampPrograms'

/**
 * "This is a camp class" — the one control that lets a school wire its
 * own classroom to a camp program instead of us doing it by hand.
 *
 * ONE component, rendered by both the create and the edit modal. The
 * two modals already carry near-identical copies of every other field
 * and that is precisely how they drift; this one does not get a second
 * implementation.
 *
 * It renders NOTHING when the academy has no camp programs. A school
 * that has never bought a camp should not see camp vocabulary at all.
 */

export interface CampClassroomFieldProps {
  programs: CampProgramOption[]
  /** '' means "not a camp classroom". */
  value: string
  onChange: (programId: string) => void
  /** Set when existing camp work pins this classroom to its program. */
  locked?: boolean
  t: (key: string, params?: Record<string, string | number | undefined>) => string | string[]
}

export function CampClassroomField({ programs, value, onChange, locked = false, t }: CampClassroomFieldProps) {
  if (programs.length === 0) return null

  const enabled = value !== ''
  const selected = programs.find(p => p.id === value)

  // An ended camp stays visible so a classroom already pointed at one
  // still reads correctly — but it cannot be newly chosen, because the
  // API refuses to build assignments outside the window and the
  // classroom would be inert from the moment it was created.
  const options = programs.filter(p => isProgramOpen(p) || p.id === value)

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id="camp-classroom-toggle"
          checked={enabled}
          disabled={locked}
          onCheckedChange={(checked) => {
            if (locked) return
            if (checked) {
              const firstOpen = programs.find(p => isProgramOpen(p))
              onChange(firstOpen?.id ?? '')
            } else {
              onChange('')
            }
          }}
          className="mt-0.5"
        />
        <div className="space-y-1 min-w-0">
          <Label
            htmlFor="camp-classroom-toggle"
            className={`text-sm font-medium flex items-center gap-1.5 ${locked ? 'text-foreground/50' : 'text-foreground/80 cursor-pointer'}`}
          >
            <Tent className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
            {t('classrooms.camp.toggle')}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t('classrooms.camp.toggleHint')}
          </p>
        </div>
      </div>

      {enabled && (
        <div className="space-y-2 pl-7">
          <Label className="text-sm font-medium text-foreground/80">
            {t('classrooms.camp.whichProgram')}
          </Label>
          <Select value={value} onValueChange={onChange} disabled={locked}>
            <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
              <SelectValue placeholder={String(t('classrooms.camp.selectProgram'))} />
            </SelectTrigger>
            <SelectContent className="z-[210]">
              {options.map(p => {
                const closed = !isProgramOpen(p)
                return (
                  <SelectItem key={p.id} value={p.id} disabled={closed}>
                    <span className="flex items-center gap-2">
                      <span>{p.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {p.test_family}
                      </span>
                      {closed && (
                        <span className="text-[10px] text-amber-600">
                          {t('classrooms.camp.ended')}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          {selected && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {t('classrooms.camp.capNote', { cap: selected.student_cap })}
            </p>
          )}

          {/* Shown BEFORE the choice is irreversible, not after. Once
              work exists the lock message below replaces it — by then
              the warning is useless, so it has to land while the user
              can still pick a different camp. */}
          {!locked && (
            <p className="text-xs text-amber-700 dark:text-amber-500 flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <span>{t('classrooms.camp.fixedWarning')}</span>
            </p>
          )}

          {locked && (
            <p className="text-xs text-amber-600 flex items-start gap-1.5">
              <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <span>{t('classrooms.camp.lockedHasWork')}</span>
            </p>
          )}
        </div>
      )}

      {!enabled && locked && (
        <p className="text-xs text-amber-600 flex items-start gap-1.5 pl-7">
          <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" strokeWidth={2} />
          <span>{t('classrooms.camp.lockedHasWork')}</span>
        </p>
      )}
    </div>
  )
}
