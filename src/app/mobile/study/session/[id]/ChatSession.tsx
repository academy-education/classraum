"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'

interface DbMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

interface UiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

/**
 * Streaming chat tutor UI for chat-mode sessions.
 *
 * On mount we load any existing transcript so resume works. Composer
 * submits to /api/study/chat which streams raw text deltas; we append
 * each delta to the active assistant bubble. The route persists both
 * the user and assistant messages itself, so the client never writes
 * to study_messages directly — guarantees a single source of truth
 * for what the model saw vs what the student saw.
 *
 * Auto-scroll-to-bottom on new content, with a check so we only force
 * scroll when the user was already near the bottom. Lets them scroll
 * up to re-read without the page yanking them back.
 */
export function ChatSession({ sessionId, language }: { sessionId: string; language: 'en' | 'ko' }) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streamingContent, setStreamingContent] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const scrollerRef = useRef<HTMLDivElement>(null)

  // Load existing transcript on mount.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('study_messages')
        .select('id, role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
      if (cancelled) return
      const rows = (data ?? []) as DbMessage[]
      setMessages(
        rows
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content }))
      )
      setLoadingHistory(false)
    })()
    return () => { cancelled = true }
  }, [sessionId])

  // Auto-scroll only when the user is already near the bottom — lets
  // them scroll up to re-read without the page yanking back.
  const scrollToBottomIfNear = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 120) {
      el.scrollTop = el.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottomIfNear()
  }, [messages, streamingContent, scrollToBottomIfNear])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')

    // Optimistic: append the user message immediately so the thread
    // feels live. The server also persists it; reconciling on next
    // history reload would be a future enhancement.
    setMessages(prev => [...prev, { id: `local-${Date.now()}`, role: 'user', content: text }])
    setStreamingContent('')

    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId, userMessage: text }),
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}))
        setStreamingContent(null)
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: (err.error as string) || (language === 'ko' ? '오류가 발생했습니다.' : 'Something went wrong.'),
          },
        ])
        return
      }

      // Stream raw text from the SSE response into the streamingContent
      // bubble. When the stream ends, finalize the bubble into the
      // history list.
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setStreamingContent(accumulated)
      }

      setStreamingContent(null)
      setMessages(prev => [
        ...prev,
        { id: `local-asst-${Date.now()}`, role: 'assistant', content: accumulated },
      ])
    } catch {
      setStreamingContent(null)
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: language === 'ko' ? '네트워크 오류입니다. 다시 시도해보세요.' : 'Network error. Try again.',
        },
      ])
    } finally {
      setSending(false)
    }
  }, [input, sending, sessionId, language])

  if (loadingHistory) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-500 px-5 py-10">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t('study.session.loadingHistory')}
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ overscrollBehavior: 'contain' }}
      >
        {messages.length === 0 && !streamingContent && (
          <div className="text-center text-sm text-gray-500 px-6 py-8">
            {language === 'ko'
              ? '튜터에게 무엇이든 물어보세요. 단계별로 함께 풀어드립니다.'
              : 'Ask the tutor anything — we’ll work through it step by step.'}
          </div>
        )}
        {messages.map(m => (
          <Bubble key={m.id} role={m.role} content={m.content} />
        ))}
        {streamingContent !== null && (
          <Bubble role="assistant" content={streamingContent} streaming />
        )}
      </div>

      {/* Composer pinned at the bottom, above the bottom nav. */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-3 py-2">
        <form
          onSubmit={(e) => { e.preventDefault(); void send() }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            placeholder={String(t('study.session.composerPlaceholder'))}
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-primary max-h-32"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={String(t('study.session.send'))}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

function Bubble({
  role,
  content,
  streaming,
}: {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-white border border-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        {content}
        {streaming && (
          <span className="inline-block w-1.5 h-3 ml-0.5 bg-primary/70 align-middle animate-pulse" />
        )}
      </div>
    </div>
  )
}
