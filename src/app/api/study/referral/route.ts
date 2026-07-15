import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { REFERRAL_REWARD_CREDITS, generateReferralCode } from '@/lib/study/referral'

/**
 * GET /api/study/referral — the caller's referral code + stats.
 *
 * Lazily mints a code on first call (one per student, enforced by the
 * study_referral_codes PK on student_id). A generated code can collide
 * with another student's on the UNIQUE(code) constraint — vanishingly
 * unlikely with a 6-char / 31-symbol alphabet, but we retry a few times
 * rather than 500 on the astronomically rare hit.
 *
 * Stats: friends invited = redemptions where referrer_id = me; credits
 * earned = rewarded redemptions × REFERRAL_REWARD_CREDITS (unrewarded
 * rows — e.g. a referee who had no subscription row yet — don't count).
 */

export const dynamic = 'force-dynamic'

const MAX_CODE_ATTEMPTS = 5

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // Existing code wins — a student's code is stable for sharing.
  const { data: existing } = await supabaseAdmin
    .from('study_referral_codes')
    .select('code')
    .eq('student_id', user.id)
    .maybeSingle()

  let code = existing?.code ?? null

  if (!code) {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && !code; attempt++) {
      const candidate = generateReferralCode()
      const { data: inserted, error } = await supabaseAdmin
        .from('study_referral_codes')
        .insert({ student_id: user.id, code: candidate })
        .select('code')
        .single()
      if (!error && inserted) {
        code = inserted.code
        break
      }
      // 23505 = unique_violation. On the PK (student_id) a concurrent
      // request already minted this student's code — re-read it. On the
      // UNIQUE(code) index it's a code collision — try a fresh code.
      if (isUniqueViolation(error)) {
        const { data: raced } = await supabaseAdmin
          .from('study_referral_codes')
          .select('code')
          .eq('student_id', user.id)
          .maybeSingle()
        if (raced?.code) { code = raced.code; break }
        continue // code collision → next candidate
      }
      // Any other error is unexpected — stop retrying.
      break
    }
  }

  if (!code) {
    return NextResponse.json({ error: 'could not create referral code' }, { status: 500 })
  }

  const { data: redemptions } = await supabaseAdmin
    .from('study_referral_redemptions')
    .select('rewarded')
    .eq('referrer_id', user.id)

  const rows = redemptions ?? []
  const referrals = rows.length
  const rewardedCount = rows.filter(r => r.rewarded === true).length

  return NextResponse.json({
    code,
    rewardPerReferral: REFERRAL_REWARD_CREDITS,
    stats: {
      referrals,
      creditsEarned: rewardedCount * REFERRAL_REWARD_CREDITS,
    },
  })
}

function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'code' in error &&
    (error as { code?: string }).code === '23505'
}
