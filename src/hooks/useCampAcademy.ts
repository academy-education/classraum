"use client"

import { useEffect, useState } from 'react'
import { db } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface CampAcademyFlags {
  /** The academy holds an active camp program (camp_programs, migration
   *  081/082) — the Camp nav entry exists. */
  hasCampProgram: boolean
  /** Camp-only school (academies.camp_only, migration 087): navigation
   *  collapses to Camp + Families + the bottom section. */
  campOnly: boolean
}

/**
 * "Is this a camp academy?" — ONE query, read by every navigation
 * surface.
 *
 * The desktop sidebar owned this read privately; the phone bottom nav
 * had no equivalent and so kept offering Classrooms / Sessions /
 * Payments / Contacts to a camp-only school that the sidebar hides —
 * the same account got two different answers depending on viewport
 * width. A second copy of the derivation is how the two drifted apart,
 * so both now call this hook.
 *
 * Camp is a paid, manually-granted program: RLS lets the academy's
 * managers and teachers read both camp_programs and their own academies
 * row (the app layout reads logo_url the same way), so a plain client
 * query answers it directly.
 */
export function useCampAcademy(): CampAcademyFlags {
  const { academyId } = useAuth()
  const [hasCampProgram, setHasCampProgram] = useState(false)
  const [campOnly, setCampOnly] = useState(false)

  useEffect(() => {
    let cancelled = false
    const checkCampProgram = async () => {
      if (!academyId) {
        setHasCampProgram(false)
        setCampOnly(false)
        return
      }
      const [{ data, error }, { data: academyRow }] = await Promise.all([
        db
          .from('camp_programs')
          .select('id')
          .eq('academy_id', academyId)
          .is('deleted_at', null)
          .limit(1),
        db
          .from('academies')
          .select('camp_only')
          .eq('id', academyId)
          .maybeSingle(),
      ])
      if (!cancelled) {
        setHasCampProgram(!error && (data?.length ?? 0) > 0)
        setCampOnly(academyRow?.camp_only === true)
      }
    }
    checkCampProgram()
    return () => { cancelled = true }
  }, [academyId])

  return { hasCampProgram, campOnly }
}
