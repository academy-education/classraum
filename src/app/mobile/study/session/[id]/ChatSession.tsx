"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, Loader2, Square, Mic, MicOff } from 'lucide-react'
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
  // Voice input — MediaRecorder → /api/study/response/transcribe →
  // append to input. Reuses the existing transcribe route (which
  // accepts any sessionId for ownership check).
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const startVoice = async () => {
    if (recording || transcribing) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      audioChunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      rec.onstop = async () => {
        setTranscribing(true)
        try {
          const blob = new Blob(audioChunksRef.current, { type: audioChunksRef.current[0]?.type || 'audio/webm' })
          const headers = await authHeaders()
          const form = new FormData()
          form.append('audio', blob, 'voice.webm')
          form.append('sessionId', sessionId)
          form.append('language', language)
          const { Authorization } = headers as { Authorization?: string }
          const res = await fetch('/api/study/response/transcribe', {
            method: 'POST',
            headers: Authorization ? { Authorization } : {},
            body: form,
          })
          const json = await res.json()
          if (res.ok && typeof json.text === 'string' && json.text.trim()) {
            setInput(prev => (prev ? prev.trim() + ' ' : '') + json.text.trim())
          }
        } catch {
          // Silent fail — user can retry.
        } finally {
          setTranscribing(false)
        }
      }
      mediaRecorderRef.current = rec
      rec.start()
      setRecording(true)
    } catch {
      // Permission denied / no mic.
    }
  }

  const stopVoice = () => {
    const rec = mediaRecorderRef.current
    if (!rec || rec.state === 'inactive') return
    rec.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setRecording(false)
  }
  const [streamingContent, setStreamingContent] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const scrollerRef = useRef<HTMLDivElement>(null)
  // AbortController lets the user kill the in-flight stream from the
  // composer (Stop button replaces Send while a response is rolling in).
  const abortRef = useRef<AbortController | null>(null)

  // Load existing transcript on mount.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
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
      } catch { /* show empty thread + composer over an eternal skeleton */ }
      finally {
        if (!cancelled) setLoadingHistory(false)
      }
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

    const controller = new AbortController()
    abortRef.current = controller
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId, userMessage: text }),
        signal: controller.signal,
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
    } catch (err) {
      // Aborts are user-initiated (Stop button) — finalize whatever we
      // got so the partial response stays visible instead of vanishing.
      if (err instanceof Error && err.name === 'AbortError') {
        // streamingContent already holds the partial; flush it into
        // history so the bubble stops looking like it's still streaming.
        setStreamingContent(current => {
          if (current && current.length > 0) {
            setMessages(prev => [
              ...prev,
              { id: `local-asst-${Date.now()}`, role: 'assistant', content: current },
            ])
          }
          return null
        })
      } else {
        setStreamingContent(null)
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: language === 'ko' ? '네트워크 오류입니다. 다시 시도해보세요.' : 'Network error. Try again.',
          },
        ])
      }
    } finally {
      abortRef.current = null
      setSending(false)
    }
  }, [input, sending, sessionId, language])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

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
          {/* Mic — record voice → transcribe → append to input. Reuses
              the existing /api/study/response/transcribe route. Hidden
              while a response is streaming so the composer stays clean. */}
          {!sending && (
            <button
              type="button"
              onClick={recording ? stopVoice : () => void startVoice()}
              disabled={transcribing}
              className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                recording
                  ? 'bg-rose-500 text-white hover:bg-rose-600 active:scale-95 animate-pulse'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95 disabled:opacity-50'
              }`}
              aria-label={recording ? 'Stop recording' : 'Voice input'}
            >
              {transcribing
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : recording
                  ? <MicOff className="w-4 h-4" />
                  : <Mic className="w-4 h-4" />}
            </button>
          )}
          {sending ? (
            <button
              type="button"
              onClick={stop}
              className="flex-shrink-0 w-11 h-11 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 active:scale-95 transition-all"
              aria-label={String(t('study.session.stop'))}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex-shrink-0 w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 active:scale-95 transition-all"
              aria-label={String(t('study.session.send'))}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
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
