"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { HELP_ARTICLES, localizeArticle } from '@/../content/help/articles'
import { ArrowLeft, Eye, ThumbsUp, ThumbsDown, MessageSquare, Loader2 } from 'lucide-react'

interface ViewRow { slug: string; lang: string; user_id: string | null; viewed_at: string }
interface FeedbackRow { slug: string; lang: string; vote: 'up'|'down'; comment: string|null; user_id: string|null; created_at: string }

interface Row {
  slug: string
  title: string
  blurb: string
  views: number
  uniqueViewers: number
  last7Views: number
  up: number
  down: number
  comments: { vote: 'up'|'down'; comment: string; created_at: string }[]
}

/**
 * /dashboard/help/admin — aggregated analytics for the help center.
 *
 * Client component because server-side cookie-based auth wasn't
 * resolving the session in this route (a Next.js + Supabase SSR quirk
 * we hit elsewhere too). We instead read the bearer token from the
 * already-mounted session and hit /api/help/analytics, which gates the
 * service-role read by re-verifying the token. Same security envelope,
 * cleaner mount path.
 */
export default function HelpAdminPage() {
  const router = useRouter()
  const { language } = useTranslation()
  const lang: 'en' | 'ko' = language === 'korean' ? 'ko' : 'en'

  const [data, setData] = useState<{ views: ViewRow[]; feedback: FeedbackRow[] } | null>(null)
  const [error, setError] = useState<'forbidden' | 'unauthorized' | 'failed' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        if (!cancelled) {
          setError('unauthorized')
          setLoading(false)
        }
        return
      }
      try {
        const res = await fetch('/api/help/analytics', {
          headers: { authorization: `Bearer ${session.access_token}` },
        })
        if (res.status === 403) {
          if (!cancelled) { setError('forbidden'); setLoading(false) }
          return
        }
        if (!res.ok) {
          if (!cancelled) { setError('failed'); setLoading(false) }
          return
        }
        const json = await res.json()
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      } catch {
        if (!cancelled) { setError('failed'); setLoading(false) }
      }
    })()
    return () => { cancelled = true }
  }, [])

  const labels = useMemo(() => lang === 'ko'
    ? {
        eyebrow: '도움말 센터 분석',
        title: '문서 활용 통계',
        subtitle: '학원 사용자가 어떤 문서를 자주 보고 어떻게 평가했는지 확인하세요.',
        back: '도움말 센터로 돌아가기',
        totals: { views: '총 조회수', feedback: '피드백', comments: '코멘트' },
        cols: { article: '문서', views: '조회', unique: '고유 사용자', recent: '최근 7일', votes: '투표' },
        noActivity: '아직 활동이 없습니다.',
        commentsHeading: '최근 코멘트',
        loading: '불러오는 중...',
        forbidden: '이 페이지는 매니저와 원장만 사용할 수 있습니다.',
        failed: '데이터를 불러오지 못했습니다.',
      }
    : {
        eyebrow: 'Help center analytics',
        title: 'Article activity',
        subtitle: 'See which docs your academy reads and how they rated them.',
        back: 'Back to Help center',
        totals: { views: 'Total views', feedback: 'Feedback', comments: 'Comments' },
        cols: { article: 'Article', views: 'Views', unique: 'Unique users', recent: 'Last 7 days', votes: 'Votes' },
        noActivity: 'No activity yet.',
        commentsHeading: 'Recent comments',
        loading: 'Loading...',
        forbidden: 'This page is for managers and owners only.',
        failed: 'Could not load analytics.',
      }
  , [lang])

  // Forbidden visitors get bounced back so we don't expose the page
  // existence — same intent as the original server-side notFound().
  useEffect(() => {
    if (error === 'forbidden' || error === 'unauthorized') {
      router.replace('/dashboard/help')
    }
  }, [error, router])

  const rows = useMemo<Row[]>(() => {
    if (!data) return []
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    return HELP_ARTICLES.map(meta => {
      const slugViews = data.views.filter(v => v.slug === meta.slug)
      const slugFeedback = data.feedback.filter(f => f.slug === meta.slug)
      const uniqueViewers = new Set(slugViews.map(v => v.user_id).filter(Boolean)).size
      const last7Views = slugViews.filter(v => v.viewed_at > sevenDaysAgo).length
      const up = slugFeedback.filter(f => f.vote === 'up').length
      const down = slugFeedback.filter(f => f.vote === 'down').length
      const comments = slugFeedback
        .filter(f => f.comment)
        .slice(0, 5)
        .map(f => ({
          vote: f.vote,
          comment: f.comment!,
          created_at: f.created_at,
        }))
      const localized = localizeArticle(meta, lang)
      return {
        slug: meta.slug,
        title: localized.title,
        blurb: localized.blurb,
        views: slugViews.length,
        uniqueViewers,
        last7Views,
        up,
        down,
        comments,
      }
    }).sort((a, b) => b.views - a.views)
  }, [data, lang])

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          {labels.loading}
        </div>
      </div>
    )
  }

  if (error === 'failed') {
    return (
      <div className="p-4">
        <Link href="/dashboard/help" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4" />
          {labels.back}
        </Link>
        <div className="text-sm text-rose-600">{labels.failed}</div>
      </div>
    )
  }

  // Forbidden is handled by the redirect effect above, but we still
  // need to return something while the redirect is in-flight.
  if (error || !data) return null

  const totalViews = rows.reduce((a, r) => a + r.views, 0)
  const totalFeedback = rows.reduce((a, r) => a + r.up + r.down, 0)
  const totalComments = rows.reduce((a, r) => a + r.comments.length, 0)

  return (
    <div className="p-4">
      <Link href="/dashboard/help" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary mb-4">
        <ArrowLeft className="w-4 h-4" />
        {labels.back}
      </Link>

      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{labels.eyebrow}</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{labels.title}</h1>
        <p className="text-gray-500 mt-1">{labels.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatTile icon={Eye} label={labels.totals.views} value={totalViews} accent="text-primary bg-primary/10" />
        <StatTile icon={ThumbsUp} label={labels.totals.feedback} value={totalFeedback} accent="text-emerald-600 bg-emerald-50" />
        <StatTile icon={MessageSquare} label={labels.totals.comments} value={totalComments} accent="text-violet-600 bg-violet-50" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100 bg-gray-50/50">
              <th className="px-4 py-2 font-medium">{labels.cols.article}</th>
              <th className="px-4 py-2 font-medium text-right">{labels.cols.views}</th>
              <th className="px-4 py-2 font-medium text-right">{labels.cols.unique}</th>
              <th className="px-4 py-2 font-medium text-right">{labels.cols.recent}</th>
              <th className="px-4 py-2 font-medium text-right">{labels.cols.votes}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.slug} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/help/${row.slug}`} className="font-medium text-gray-900 hover:text-primary">
                    {row.title}
                  </Link>
                  <div className="text-xs text-gray-500 line-clamp-1">{row.blurb}</div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900">{row.views}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{row.uniqueViewers}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{row.last7Views}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <ThumbsUp className="w-3 h-3" /> {row.up}
                    </span>
                    <span className="inline-flex items-center gap-1 text-rose-700">
                      <ThumbsDown className="w-3 h-3" /> {row.down}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalComments > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{labels.commentsHeading}</h2>
          <div className="space-y-2">
            {rows.flatMap(row =>
              row.comments.map(c => ({ ...c, articleTitle: row.title, slug: row.slug }))
            )
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .slice(0, 20)
              .map((c, i) => (
                <div key={i} className={`rounded-lg border px-4 py-3 ${
                  c.vote === 'down'
                    ? 'border-rose-100 bg-rose-50/40'
                    : 'border-emerald-100 bg-emerald-50/40'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {c.vote === 'down' ? (
                      <ThumbsDown className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <Link href={`/dashboard/help/${c.slug}`} className="text-sm font-medium text-gray-900 hover:text-primary">
                      {c.articleTitle}
                    </Link>
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{c.comment}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {totalViews === 0 && totalFeedback === 0 && (
        <div className="mt-12 text-center text-sm text-gray-500">{labels.noActivity}</div>
      )}
    </div>
  )
}

function StatTile({ icon: Icon, label, value, accent }: { icon: typeof Eye; label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-gray-900 tabular-nums">{value}</p>
    </div>
  )
}
