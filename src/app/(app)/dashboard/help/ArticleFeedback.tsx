"use client"

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Vote = 'up' | 'down'

interface Labels {
  question: string
  yes: string
  no: string
  followupUp: string
  followupDown: string
  placeholder: string
  send: string
  sending: string
  thanks: string
  error: string
}

interface ArticleFeedbackProps {
  slug: string
  lang: 'en' | 'ko'
  labels: Labels
}

/**
 * Per-article "Was this helpful?" widget. After the user picks a vote,
 * an optional comment box appears (focused down-votes especially —
 * that's where actionable feedback hides). Submissions land in
 * public.help_article_feedback with RLS auth.uid() = user_id.
 *
 * State is purely local: no localStorage gate, so a returning reader
 * can vote again if the article changed. The Supabase write swallows
 * errors silently in the UI — a failed feedback ping shouldn't make
 * the docs feel broken.
 */
export function ArticleFeedback({ slug, lang, labels }: ArticleFeedbackProps) {
  const [vote, setVote] = useState<Vote | null>(null)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(false)

  const submit = async (finalVote: Vote, finalComment: string) => {
    setSending(true)
    setError(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Not logged in (rare on the help center, but possible during
        // SSR-handoff) — just acknowledge so the UI doesn't get stuck.
        setDone(true)
        return
      }
      const { error: insertError } = await supabase
        .from('help_article_feedback')
        .insert({
          slug,
          lang,
          vote: finalVote,
          comment: finalComment.trim() || null,
          user_id: user.id,
        })
      if (insertError) {
        setError(true)
        return
      }
      setDone(true)
    } finally {
      setSending(false)
    }
  }

  const pickVote = (v: Vote) => {
    setVote(v)
    // Submit the vote immediately. The comment box stays open for
    // optional extra context — sending the comment fires a second row
    // (cheap, lets us correlate downvote-with-reason vs silent-downvote).
    void submit(v, '')
  }

  if (done) {
    return (
      <div className="mt-12 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 flex items-center gap-2 text-sm text-emerald-800">
        <Check className="w-4 h-4" />
        {labels.thanks}
      </div>
    )
  }

  return (
    <div className="mt-12 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-gray-900">{labels.question}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => pickVote('up')}
            disabled={sending}
            aria-pressed={vote === 'up'}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border text-sm transition-colors ${
              vote === 'up'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            {labels.yes}
          </button>
          <button
            type="button"
            onClick={() => pickVote('down')}
            disabled={sending}
            aria-pressed={vote === 'down'}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border text-sm transition-colors ${
              vote === 'down'
                ? 'border-rose-300 bg-rose-50 text-rose-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            {labels.no}
          </button>
        </div>
      </div>

      {vote && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <label className="block text-xs text-gray-600">
            {vote === 'up' ? labels.followupUp : labels.followupDown}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder={labels.placeholder}
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 resize-y focus:outline-none focus:border-primary focus-visible:ring-0"
          />
          <div className="flex items-center justify-end gap-2">
            {error && <span className="text-xs text-rose-600">{labels.error}</span>}
            <button
              type="button"
              disabled={sending || !comment.trim()}
              onClick={() => submit(vote, comment)}
              className="px-3 h-8 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? labels.sending : labels.send}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
