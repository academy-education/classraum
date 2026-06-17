import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  HELP_ARTICLES,
  getArticleMeta,
} from '@/../content/help/articles'
import { readArticleBody } from '@/../content/help/server'
import { HelpSidebar } from '../HelpSidebar'
import { HelpChatButton } from '../HelpChatButton'
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

  // V1: English only. The fallback to English inside readArticleBody
  // makes adding Korean a drop-in — just write the .md files under
  // content/help/ko/ and the page picks them up.
  const body = readArticleBody(slug, 'en')
  if (!body) notFound()

  return (
    <div className="flex gap-8 max-w-7xl mx-auto px-6 py-8">
      <aside className="w-64 flex-shrink-0 hidden lg:block">
        <div className="sticky top-8">
          <HelpSidebar />
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Link
          href="/dashboard/help"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          All articles
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
                <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-3">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="leading-relaxed text-gray-700 mb-4">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-4 space-y-1.5 text-gray-700">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-gray-700">{children}</ol>
              ),
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-900">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children }) => (
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">{children}</code>
              ),
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
