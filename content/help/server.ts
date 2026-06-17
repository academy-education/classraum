// Server-only helpers for the help center. Marking this with the
// 'server-only' import prevents it from accidentally being pulled into
// a client bundle (the build would fail loudly instead of silently
// erroring at runtime).
import 'server-only'
import fs from 'fs'
import path from 'path'
import { getArticleMeta } from './articles'

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
