import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  HELP_ARTICLES,
  getArticleMeta,
  localizeArticle,
} from '@/../content/help/articles'
import { readArticleBody } from '@/../content/help/server'
import { HelpChatButton } from '../HelpChatButton'
import { HelpMockup } from '@/components/help/mockups'
import { ArrowLeft, ArrowRight } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string }>
}

/**
 * Pre-render every article at build time. Help content is static so this
 * is a clean win for performance and avoids reading from disk on each
 * request. Languages other than 'en' are read at render time via
 * readArticleBody, which falls back to English when a translation is
 * missing.
 */
export function generateStaticParams() {
  return HELP_ARTICLES.map(article => ({ slug: article.slug }))
}

export default async function HelpArticlePage({ params }: PageProps) {
  const { slug } = await params
  const meta = getArticleMeta(slug)
  if (!meta) notFound()

  // Read the user's language preference from the cookie that
  // LanguageProvider sets (see src/lib/cookies.ts LANGUAGE_COOKIE_NAME).
  // The cookie holds 'korean' or 'english'; readArticleBody falls back
  // to English when a Korean file is missing, so this is safe even for
  // articles added before their translation lands.
  //
  // Side-note: marking the article page dynamic via cookies() opts it
  // out of the generateStaticParams pre-render. For ~14 articles × 2
  // languages that's fine — they're tiny markdown reads. Switch to
  // route segments if we ever scale to dozens of languages.
  const cookieStore = await cookies()
  const langCookie = cookieStore.get('classraum_language')?.value
  const lang: 'en' | 'ko' = langCookie === 'korean' ? 'ko' : 'en'
  const body = readArticleBody(slug, lang)
  if (!body) notFound()

  // Sequential prev/next within the catalog order so users can read
  // through the help center end-to-end without bouncing back to the index.
  const idx = HELP_ARTICLES.findIndex(a => a.slug === slug)
  const prevMeta = idx > 0 ? HELP_ARTICLES[idx - 1] : null
  const nextMeta = idx >= 0 && idx < HELP_ARTICLES.length - 1
    ? HELP_ARTICLES[idx + 1]
    : null
  // localizeArticle returns only { title, blurb }, so keep the raw meta
  // around for the slug — using the localized title alone dropped slug
  // and routed Next to /help/undefined.
  const prev = prevMeta ? { slug: prevMeta.slug, ...localizeArticle(prevMeta, lang) } : null
  const next = nextMeta ? { slug: nextMeta.slug, ...localizeArticle(nextMeta, lang) } : null
  const labels = lang === 'ko'
    ? { all: '전체 목록', previous: '이전', next: '다음' }
    : { all: 'All articles', previous: 'Previous', next: 'Next' }

  return (
    <div className="p-4">
      <main>
        <Link
          href="/dashboard/help"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {labels.all}
        </Link>

        {/* Hand-styled markdown — this app doesn't use the Tailwind
            Typography plugin. Custom component renderers below give each
            element its own class so we stay on-brand with the rest of
            the app and don't bloat the bundle with a plugin we'd only
            use here. */}
        {/* Tightened rhythm for density — h2 sits closer to preceding
            text, paragraphs use mb-2, and mockups are width-capped so a
            single screen shows both the instructions and the matching
            screen rather than burying the instructions under a giant
            mockup card. */}
        <article className="text-gray-800 max-w-none [&_a]:text-primary [&_a:hover]:underline">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-1.5">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold text-gray-900 mt-4 mb-1.5">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-gray-900 mt-3 mb-1">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="leading-relaxed text-gray-700 mb-2 text-sm">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-5 mb-2 space-y-0.5 text-gray-700 text-sm">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-5 mb-2 space-y-0.5 text-gray-700 text-sm">{children}</ol>
              ),
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-900">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children, className }) => {
                // Fenced ```mockup blocks render an inline UI mockup. Wrapped in a
                // width-capped container so the mockup never dominates the screen —
                // a full-bleed card pushes the instructions far below the fold,
                // which the user flagged as the main visibility problem.
                if (className === 'language-mockup') {
                  return (
                    <div className="my-4">
                      <HelpMockup id={String(children).trim()} />
                    </div>
                  )
                }
                return (
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">{children}</code>
                )
              },
              // Strip the <pre> wrapper around fenced mockup blocks so the
              // mockup renders directly, not inside a scroll box.
              pre: ({ children }) => {
                const child = Array.isArray(children) ? children[0] : children
                if (child && typeof child === 'object' && 'props' in child) {
                  const cls = (child as { props?: { className?: string } }).props?.className
                  if (cls === 'language-mockup') return <>{children}</>
                }
                return <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 overflow-x-auto text-sm font-mono mb-3">{children}</pre>
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-amber-300 bg-amber-50 px-4 py-2 my-3 text-gray-700 text-sm">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-5 border-gray-200" />,
            }}
          >
            {body}
          </ReactMarkdown>
        </article>

        {/* Sequential nav — prev on the left, next on the right. Either
            slot is empty when the user is at an end of the catalog. */}
        {(prev || next) && (
          <div className="mt-10 flex items-center justify-between gap-4">
            {prev ? (
              <Link
                href={`/dashboard/help/${prev.slug}`}
                className="group inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-primary/40 hover:bg-primary/[0.02] transition-colors max-w-xs"
              >
                <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-primary flex-shrink-0 transition-colors" />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                    {labels.previous}
                  </div>
                  <div className="text-sm font-medium text-gray-900 truncate group-hover:text-primary transition-colors">
                    {prev.title}
                  </div>
                </div>
              </Link>
            ) : <span />}
            {next ? (
              <Link
                href={`/dashboard/help/${next.slug}`}
                className="group inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-primary/40 hover:bg-primary/[0.02] transition-colors max-w-xs ml-auto text-right"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                    {labels.next}
                  </div>
                  <div className="text-sm font-medium text-gray-900 truncate group-hover:text-primary transition-colors">
                    {next.title}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary flex-shrink-0 transition-colors" />
              </Link>
            ) : <span />}
          </div>
        )}

        <HelpChatButton />
      </main>
    </div>
  )
}
