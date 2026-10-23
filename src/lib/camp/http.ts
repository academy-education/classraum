import { NextResponse } from 'next/server'
import type { CampErrorCode } from '@/lib/camp/error-codes'

/**
 * `{ error, code, ...extra }` with a status — the one shape every camp
 * route error takes (see error-codes.ts). Lives in lib because a route
 * file may export only handlers.
 */
export function campError(
  code: CampErrorCode,
  status: number,
  message: string,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json({ error: message, code, ...extra }, { status })
}
