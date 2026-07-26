import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '../../_lib/admin-auth'

/**
 * GET /api/admin/dashboard/activity
 *
 * Raw material for the "Recent activity" panel: new academies, new
 * subscriptions, failed invoices, new support conversations and newly added
 * students over the last 7 days.
 *
 * Server-side + service role because the browser anon client was silently
 * filtered by RLS — the panel rendered "No recent activity" whether the
 * platform was quiet or the reads were simply denied.
 *
 * Only data is returned; all user-facing copy is localized on the client.
 */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const since = sevenDaysAgo.toISOString()

    const unwrap = <T>(label: string, res: { data: T[] | null; error: { message: string } | null }): T[] => {
      if (res.error) throw new Error(`${label}: ${res.error.message}`)
      return res.data || []
    }

    const [academiesRes, subscriptionsRes, failedRes, conversationsRes, studentsRes] =
      await Promise.all([
        supabaseAdmin
          .from('academies')
          .select('id, name, created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(3),
        supabaseAdmin
          .from('academy_subscriptions')
          .select('id, plan_name, created_at, academies(name)')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(3),
        supabaseAdmin
          .from('invoices')
          .select('id, final_amount, created_at, academies(name)')
          .eq('status', 'failed')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(2),
        supabaseAdmin
          .from('chat_conversations')
          .select('id, created_at, academies(name)')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(2),
        supabaseAdmin
          .from('students')
          .select('academy_id, created_at, academies(name)')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

    type NamedRel = { academies?: { name?: string } | { name?: string }[] | null }
    const academyName = (row: NamedRel): string | null => {
      const rel = row.academies
      if (!rel) return null
      const one = Array.isArray(rel) ? rel[0] : rel
      return one?.name ?? null
    }

    return NextResponse.json({
      academies: unwrap('academies', academiesRes).map(a => ({
        id: a.id,
        name: a.name,
        createdAt: a.created_at,
      })),
      subscriptions: unwrap('subscriptions', subscriptionsRes).map(s => ({
        id: s.id,
        planName: s.plan_name,
        academyName: academyName(s as NamedRel),
        createdAt: s.created_at,
      })),
      failedPayments: unwrap('failed_invoices', failedRes).map(p => ({
        id: p.id,
        amount: p.final_amount,
        academyName: academyName(p as NamedRel),
        createdAt: p.created_at,
      })),
      conversations: unwrap('conversations', conversationsRes).map(c => ({
        id: c.id,
        academyName: academyName(c as NamedRel),
        createdAt: c.created_at,
      })),
      students: unwrap('students', studentsRes).map(s => ({
        academyId: s.academy_id,
        academyName: academyName(s as NamedRel),
        createdAt: s.created_at,
      })),
    })
  } catch (e) {
    console.error('[Admin dashboard activity API] Error:', e)
    return NextResponse.json(
      { error: 'Failed to load recent activity', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
