"use client"

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Fire-and-forget view ping for help articles. Mounted on the article
 * page; logs (slug, lang, user_id) to public.help_article_views on
 * first mount per (slug, lang) pair in this tab. The ref guard
 * prevents React strict-mode double-mount from double-counting in
 * dev — production single-mount still pings once normally.
 *
 * No UI, no error surfacing — analytics shouldn't ever make the page
 * feel broken if the network is flaky.
 */
export function ArticleViewTracker({ slug, lang }: { slug: string; lang: 'en' | 'ko' }) {
  const sent = useRef(false)
  useEffect(() => {
    if (sent.current) return
    sent.current = true
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('help_article_views').insert({
        slug,
        lang,
        user_id: user.id,
      })
    })()
  }, [slug, lang])
  return null
}
