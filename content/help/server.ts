// Server-only helpers for the help center. Marking this with the
// 'server-only' import prevents it from accidentally being pulled into
// a client bundle (the build would fail loudly instead of silently
// erroring at runtime).
import 'server-only'
import fs from 'fs'
import path from 'path'
import { HELP_ARTICLES, getArticleMeta, localizeArticle } from './articles'

/**
 * Read the raw markdown body for an article in a given language. Falls
 * back to English if the requested language is missing (during the
 * Korean translation pass, some articles may not have a ko/ file yet).
 *
 * Called from generateStaticParams + the article page (both server-
 * rendered). Never call from a client component.
 */
export function readArticleBody(slug: string, lang: 'en' | 'ko'): string | null {
  const meta = getArticleMeta(slug)
  if (!meta) return null

  const tryRead = (l: 'en' | 'ko') => {
    const p = path.join(process.cwd(), 'content', 'help', l, meta.file)
    try {
      return fs.readFileSync(p, 'utf8')
    } catch {
      return null
    }
  }

  return tryRead(lang) ?? tryRead('en')
}

export interface HelpSearchEntry {
  slug: string
  title: string
  blurb: string
  /** Markdown body with fences/syntax stripped — used for substring search. */
  body: string
}

/**
 * Build the search index for the help center. Reads every article in
 * the requested language (falling back to English when missing) and
 * strips markdown noise so the client can do simple substring matching
 * without false-positive hits on syntax characters.
 */
export function getSearchIndex(lang: 'en' | 'ko'): HelpSearchEntry[] {
  return HELP_ARTICLES.map(meta => {
    const body = readArticleBody(meta.slug, lang) ?? ''
    const stripped = body
      // Drop fenced code/mockup blocks — they're not user-facing prose.
      .replace(/```[\s\S]*?```/g, ' ')
      // Inline code, bold/italic, headings, list markers, links.
      .replace(/[`*_>#]+/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
    const localized = localizeArticle(meta, lang)
    return {
      slug: meta.slug,
      title: localized.title,
      blurb: localized.blurb,
      body: stripped,
    }
  })
}
