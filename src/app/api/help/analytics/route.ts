import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Help-center analytics aggregator. Gated server-side by verifying
 * the caller's bearer token through supabaseAdmin.auth.getUser(token)
 * — matches the pattern used by the messages routes that already
 * exist in this repo.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = me?.role
  // Classraum platform admins only. Academy managers/teachers don't
  // see this — they have access to their own academy's help center,
  // not the platform-wide analytics.
  if (role !== 'admin' && role !== 'super_admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const [{ data: views }, { data: feedback }] = await Promise.all([
    supabaseAdmin
      .from('help_article_views')
      .select('slug, lang, user_id, viewed_at'),
    supabaseAdmin
      .from('help_article_feedback')
      .select('slug, lang, vote, comment, user_id, created_at')
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    views: views ?? [],
    feedback: feedback ?? [],
  })
}
