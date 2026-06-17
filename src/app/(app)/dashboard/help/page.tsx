import Link from 'next/link'
import { cookies } from 'next/headers'
import { HELP_ARTICLES, localizeArticle } from '@/../content/help/articles'
import { HelpSidebar } from './HelpSidebar'
import { HelpChatButton } from './HelpChatButton'
import { ChevronRight } from 'lucide-react'

/**
 * /dashboard/help — landing page for the help center.
 *
 * Server component (no client interactivity at the page level — sidebar
 * and chat button handle their own client concerns). The article list
 * is sourced from the same catalog the sidebar uses.
 *
 * Localisation: this page is server-rendered before the LanguageContext
 * mounts, so it can't use the `t()` hook. Reads the same language cookie
 * the article page reads and uses a small inline strings map. Article
 * titles + blurbs are pulled from the catalog (English-only for v1 —
 * see content/help/articles.ts).
 */
export default async function HelpLandingPage() {
  const cookieStore = await cookies()
  const lang = cookieStore.get('classraum_language')?.value === 'korean' ? 'ko' : 'en'
  const chrome = (lang === 'ko'
    ? { title: '도움말 센터', subtitle: 'Classraum의 모든 기능에 대한 단계별 가이드.' }
    : { title: 'Help center', subtitle: 'Step-by-step guides for every part of Classraum.' })

  return (
    <div className="flex gap-8 max-w-7xl mx-auto px-6 py-8">
      <aside className="w-64 flex-shrink-0 hidden lg:block">
        <div className="sticky top-8">
          <HelpSidebar />
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-2">
            {chrome.title}
          </h1>
          <p className="text-gray-600">{chrome.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HELP_ARTICLES.map(article => {
            const localized = localizeArticle(article, lang)
            return (
              <Link
                key={article.slug}
                href={`/dashboard/help/${article.slug}`}
                className="group rounded-xl border border-gray-200 bg-white p-5 hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors">
                      {localized.title}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {localized.blurb}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
                </div>
              </Link>
            )
          })}
        </div>

        <HelpChatButton />
      </main>
    </div>
  )
}
