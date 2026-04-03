import { NextRequest } from 'next/server'

/**
 * Verify that a request is from a legitimate cron job.
 * Checks CRON_SECRET_KEY via Authorization header first,
 * then falls back to Vercel cron User-Agent check.
 *
 * Returns true if authorized, false otherwise.
 */
export function verifyCronAuth(req: NextRequest): boolean {
  // In development, allow all cron requests
  if (process.env.NODE_ENV !== 'production') {
    return true
  }

  // Check Authorization header with CRON_SECRET_KEY
  const cronSecret = process.env.CRON_SECRET_KEY
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader === `Bearer ${cronSecret}`) {
      return true
    }
  }

  // Fallback: check Vercel cron User-Agent
  const userAgent = req.headers.get('user-agent')
  if (userAgent === 'vercel-cron/1.0') {
    return true
  }

  return false
}
