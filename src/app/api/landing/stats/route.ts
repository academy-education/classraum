import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Cumulative platform counts for the homepage stats strip.
// Cached for an hour — these only ever grow, freshness is not critical.
export const revalidate = 3600

export async function GET() {
  try {
    const [attendance, grades, notifications] = await Promise.all([
      supabaseAdmin.from('attendance').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('assignment_grades').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('notifications').select('*', { count: 'exact', head: true }),
    ])

    const counts = {
      attendance: attendance.count ?? 0,
      grades: grades.count ?? 0,
      notifications: notifications.count ?? 0,
    }

    // If the platform has nothing to show yet, let the client hide the strip
    // rather than render a wall of zeros.
    if (counts.attendance === 0 && counts.grades === 0 && counts.notifications === 0) {
      return NextResponse.json({ ok: false }, { status: 503 })
    }

    return NextResponse.json({ ok: true, counts })
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}
