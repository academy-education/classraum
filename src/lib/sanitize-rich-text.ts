/**
 * Standalone HTML sanitization for rich-text content.
 *
 * Pulled out of `src/components/ui/RichTextEditor.tsx` so importing the
 * sanitizer from a page (e.g. reports-page on save) doesn't drag the
 * editor's heavy dependencies (`@tiptap/react`, `@tiptap/starter-kit`)
 * into that page's bundle. The editor itself still uses this helper for
 * its own onChange path; nothing about its behavior changes.
 *
 * `dompurify` is the only runtime dependency here, and it's small.
 */

import DOMPurify from 'dompurify'

export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: [],
  })
}
