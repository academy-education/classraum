"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { AtSign, Check, Loader2 } from 'lucide-react'
import { authHeaders } from '@/lib/auth-headers'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/eyebrow'

/**
 * Study nickname editor for the profile page — the public handle shown on
 * study leaderboards and used to add friends. Self-contained: loads the
 * current nickname from /api/study/prefs, checks availability as you type
 * (debounced), and saves via /api/study/nickname (uniqueness enforced
 * server-side). Styled with the profile page's Card system.
 */
export function StudyNicknameCard({ ko }: { ko: boolean }) {
  const [initial, setInitial] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [ready, setReady] = useState(false)
  // Locked once the student has used their one post-pick change.
  const [locked, setLocked] = useState(false)
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/prefs', { headers })
        if (!res.ok) return
        const json = await res.json()
        const nick = (json?.prefs?.nickname as string | null) ?? null
        if (cancelled) return
        setInitial(nick)
        setValue(nick ?? '')
        setLocked(json?.prefs?.nickname_changed === true)
      } catch { /* leave empty */ } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const trimmed = value.trim()
  const dirty = trimmed !== (initial ?? '')

  useEffect(() => {
    if (!dirty || trimmed.length === 0) { setStatus('idle'); return }
    setStatus('checking')
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch(`/api/study/nickname?check=${encodeURIComponent(trimmed)}`, { headers })
        const json = await res.json()
        setStatus(json.available ? 'available' : (json.reason === 'taken' ? 'taken' : 'invalid'))
      } catch { setStatus('idle') }
    }, 400)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [trimmed, dirty])

  const save = useCallback(async () => {
    if (!dirty || saving || status === 'taken' || status === 'invalid' || trimmed.length === 0) return
    setSaving(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/nickname', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmed }),
      })
      if (res.status === 409) { setStatus('taken'); return }
      if (res.status === 423) { setLocked(true); return } // change already used
      if (!res.ok) { setStatus('invalid'); return }
      const json = await res.json()
      setInitial(json.nickname as string)
      if (json.locked === true) setLocked(true)
      setSaved(true)
      setStatus('idle')
      setTimeout(() => setSaved(false), 1800)
    } finally {
      setSaving(false)
    }
  }, [dirty, saving, status, trimmed])

  const hint =
    locked ? (ko ? '닉네임은 더 이상 변경할 수 없어요.' : "Your nickname can't be changed again.")
    : status === 'checking' ? (ko ? '확인 중…' : 'Checking…')
    : status === 'available' ? (ko ? '사용 가능해요' : 'Available')
    : status === 'taken' ? (ko ? '이미 사용 중이에요' : 'Already taken')
    : status === 'invalid' ? (ko ? '2–16자, 문자·숫자·밑줄만' : '2–16 chars, letters/numbers/_')
    // A picked-but-not-yet-changed nickname gets one warning about the limit.
    : initial ? (ko ? '닉네임은 한 번만 변경할 수 있어요.' : 'You can change your nickname once.')
    : (ko ? '리더보드와 친구에게 보여요 · 한 번만 변경 가능' : 'Shown on the leaderboard · changeable once')
  const hintColor =
    locked ? 'text-gray-400'
    : status === 'available' ? 'text-emerald-600'
    : status === 'taken' || status === 'invalid' ? 'text-rose-600'
    : 'text-gray-500'

  return (
    <div className="mb-6">
      <Eyebrow as="h3" className="mb-2 px-1 text-[12px] tracking-[0.10em] text-gray-600">
        {ko ? '닉네임' : 'Nickname'}
      </Eyebrow>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <AtSign className="w-4 h-4 text-primary" strokeWidth={1.75} />
          </div>
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void save() }}
            disabled={!ready || locked}
            maxLength={16}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={ko ? '닉네임을 정하세요' : 'Choose a nickname'}
            className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            type="button"
            onClick={() => void save()}
            disabled={locked || !dirty || saving || status === 'taken' || status === 'invalid' || status === 'checking' || trimmed.length === 0}
            className="flex-shrink-0 inline-flex items-center justify-center h-10 px-4 rounded-full bg-gradient-to-b from-primary to-primary/90 text-white text-[13px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : (ko ? '저장' : 'Save')}
          </button>
        </div>
        <p className={`text-xs mt-2 px-0.5 ${hintColor}`}>{hint}</p>
      </Card>
    </div>
  )
}
