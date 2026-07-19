import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getPaymentInfo } from '@/lib/portone-charge'

/**
 * TEMPORARY read-only diagnostic for the production PORTONE_API_SECRET
 * outage (payments verify → 401). Token-gated; reveals NO secret values —
 * only presence, length, whitespace, and a short hash (so prod's value can
 * be compared to a known-good one without exposing either). Remove after.
 */
export const dynamic = 'force-dynamic'

const TOKEN = 'kx92-portone-probe-7f3a'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('t') !== TOKEN) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  const raw = process.env.PORTONE_API_SECRET ?? ''
  const trimmed = raw.trim()
  const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12)

  const info = await getPaymentInfo('spk-5a5a64b9-mrqme9jt')

  return NextResponse.json({
    apiSecret: {
      present: Boolean(raw),
      length: raw.length,
      trimmedLength: trimmed.length,
      hasSurroundingWhitespace: raw.length !== trimmed.length,
      sha256_12: raw ? hash(trimmed) : null,
    },
    storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? null,
    apiKeyPresent: Boolean(process.env.PORTONE_API_KEY),
    getPaymentInfo: { ok: info.ok, status: info.status, message: info.message },
  })
}
