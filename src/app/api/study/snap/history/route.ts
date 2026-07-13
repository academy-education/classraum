import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * GET /api/study/snap/history — recent snap captures for the caller.
 *
 * Returns up to 8 most-recent captures with a short-lived signed URL
 * for the thumbnail so the snap landing page can show "Recent
 * captures" instead of a blank surface below the picker.
 */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(`snap-history:user:${user.id}`, { windowMs: 60 * 1000, max: 60 })
  if (blocked) return blocked

  const { data: rows } = await supabaseAdmin
    .from('study_snap_captures')
    .select('id, image_path, ocr_text, subject_guess, final_answer, solution_steps, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
    .limit(8)

  if (!rows || rows.length === 0) return NextResponse.json({ captures: [] })

  // Batch signed URLs. 1-hour expiry — long enough for a session
  // without leaking the path beyond it.
  const paths = rows.map(r => r.image_path as string)
  const { data: signed } = await supabaseAdmin.storage
    .from('study-snap-images')
    .createSignedUrls(paths, 3600)

  const urlByPath = new Map<string, string>()
  for (const s of (signed ?? [])) {
    if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl)
  }

  const captures = rows.map(r => ({
    id: r.id as string,
    image_path: r.image_path as string,
    image_url: urlByPath.get(r.image_path as string) ?? null,
    ocr_text: (r.ocr_text as string | null) ?? '',
    subject_guess: (r.subject_guess as string | null) ?? 'other',
    final_answer: (r.final_answer as string | null) ?? '',
    solution_steps: (r.solution_steps as unknown[] | null) ?? [],
    created_at: r.created_at as string,
  }))

  return NextResponse.json({ captures })
}
