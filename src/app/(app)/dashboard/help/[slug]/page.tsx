import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  HELP_ARTICLES,
  getArticleMeta,
} from '@/../content/help/articles'
import { readArticleBody } from '@/../content/help/server'
import { HelpSidebar } from '../HelpSidebar'
import { HelpChatButton } from '../HelpChatButton'
import { HelpMockup } from '@/components/help/mockups'
import { ArrowLeft } from 'lucide-react'

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

  return (
    <div className="flex gap-6 max-w-7xl mx-auto px-4 py-4">
      <aside className="w-64 flex-shrink-0 hidden lg:block">
        <div className="sticky top-8">
          <HelpSidebar />
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Link
          href="/dashboard/help"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'ko' ? '전체 목록' : 'All articles'}
        </Link>

        {/* Hand-styled markdown — this app doesn't use the Tailwind
            Typography plugin. Custom component renderers below give each
            element its own class so we stay on-brand with the rest of
            the app and don't bloat the bundle with a plugin we'd only
            use here. */}
        <article className="text-gray-800 max-w-none [&_a]:text-primary [&_a:hover]:underline">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-2">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold text-gray-900 mt-5 mb-2">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-gray-900 mt-4 mb-1.5">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="leading-relaxed text-gray-700 mb-2.5 text-sm">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-5 mb-2.5 space-y-1 text-gray-700 text-sm">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-5 mb-2.5 space-y-1 text-gray-700 text-sm">{children}</ol>
              ),
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-900">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children, className }) => {
                // Fenced ```mockup blocks render an inline UI mockup. The
                // body of the block is the mockup id (e.g. "create-classroom-form").
                // Unknown ids fall back to a visible warning so a typo is
                // caught in dev rather than silently rendered as code.
                if (className === 'language-mockup') {
                  return <HelpMockup id={String(children).trim()} />
                }
                return (
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">{children}</code>
                )
              },
              // Strip the <pre> wrapper around fenced mockup blocks so the
              // mockup renders as a full-width card, not inside a scroll box.
              pre: ({ children }) => {
                const child = Array.isArray(children) ? children[0] : children
                if (child && typeof child === 'object' && 'props' in child) {
                  const cls = (child as { props?: { className?: string } }).props?.className
                  if (cls === 'language-mockup') return <>{children}</>
                }
                return <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 overflow-x-auto text-sm font-mono mb-4">{children}</pre>
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-amber-300 bg-amber-50 px-4 py-2 my-4 text-gray-700">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-8 border-gray-200" />,
            }}
          >
            {body}
          </ReactMarkdown>
        </article>

        <HelpChatButton />
      </main>
    </div>
  )
}
