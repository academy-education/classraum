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
import { ArticleToc } from '../ArticleToc'
import { ArticleFeedback } from '../ArticleFeedback'
import { HelpMockup } from '@/components/help/mockups'
import { ArrowLeft, ArrowRight } from 'lucide-react'

/**
 * Slugify a heading the same way GitHub does — lowercase, strip
 * non-word chars (but keep hyphens and Korean letters), spaces to
 * hyphens. The ReactMarkdown `h2` renderer derives ids the same way so
 * the TOC anchor links land on the right element.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, '-')
    // strip ASCII punctuation but keep word chars, hyphens, Korean
    .replace(/[^\p{L}\p{N}\-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Walk a ReactMarkdown children tree to recover its plain text. */
function nodeText(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: unknown } }).props
    return nodeText(props?.children)
  }
  return ''
}

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
    ? { all: '전체 목록', previous: '이전', next: '다음', onThisPage: '이 페이지 내용' }
    : { all: 'All articles', previous: 'Previous', next: 'Next', onThisPage: 'On this page' }

  const feedbackLabels = lang === 'ko'
    ? {
        question: '이 글이 도움이 되었나요?',
        yes: '도움됨',
        no: '아니요',
        followupUp: '가장 유용했던 부분이 무엇이었나요? (선택사항)',
        followupDown: '무엇이 빠졌거나 혼란스러웠나요?',
        placeholder: '의견 남기기...',
        send: '보내기',
        sending: '보내는 중...',
        thanks: '감사합니다 — 의견이 전달되었습니다.',
        error: '전송 실패. 다시 시도해주세요.',
      }
    : {
        question: 'Was this article helpful?',
        yes: 'Yes',
        no: 'No',
        followupUp: 'What worked well? (optional)',
        followupDown: 'What was missing or confusing?',
        placeholder: 'Leave a comment...',
        send: 'Send',
        sending: 'Sending...',
        thanks: 'Thanks — feedback received.',
        error: 'Could not send. Try again.',
      }

  // Extract `## Heading` lines for the right-rail TOC. Done server-side
  // so the order matches the rendered article exactly and the client
  // bundle stays free of markdown-parse logic.
  const headings = body
    .split('\n')
    .filter(line => line.startsWith('## ') && !line.startsWith('### '))
    .map(line => {
      const text = line.replace(/^##\s+/, '').trim()
      return { id: slugify(text), text }
    })

  return (
    <div className="p-4 lg:flex lg:gap-10">
      <main className="lg:flex-1 min-w-0">
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
                <h2 id={slugify(nodeText(children))} className="text-lg font-semibold text-gray-900 mt-4 mb-1.5 scroll-mt-8">{children}</h2>
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

        <ArticleFeedback slug={slug} lang={lang} labels={feedbackLabels} />

        <HelpChatButton />
      </main>

      <ArticleToc headings={headings} label={labels.onThisPage} />
    </div>
  )
}
