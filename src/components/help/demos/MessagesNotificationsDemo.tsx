"use client"

import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Card } from '@/components/ui/card'
import { getClassrooms } from './sample-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Bell, Plus, Search, MoreHorizontal, Megaphone, CreditCard, Users, AlertCircle } from 'lucide-react'
import { NonFunctional } from './NonFunctional'

export function MessagesNotificationsDemo() {
  const { t, language } = useTranslation()

  const SAMPLE_MESSAGES = useMemo(() => {
    const c = getClassrooms(language)
    const ko = language === 'korean'
    return ko ? [
      { id: 'm1', from: '김선생님', preview: '내일 퀴즈 — 3~5장 복습해주세요', when: '5분', unread: true },
      { id: 'm2', from: '학부모 (박앨리스)', preview: '오늘 6:30에 늦게 픽업합니다', when: '2시간', unread: true },
      { id: 'm3', from: '조브라이언', preview: '숙제 7번 문제 질문이 있어요', when: '어제', unread: false },
      { id: 'm4', from: '이선생님', preview: `수요일 ${c[2].name} 대강 가능하신가요?`, when: '2일', unread: false },
    ] : [
      { id: 'm1', from: 'Ms. Kim', preview: 'Quiz tomorrow — please review chapters 3-5', when: '5m', unread: true },
      { id: 'm2', from: 'Parent (Alice Park)', preview: 'Late pickup at 6:30 today', when: '2h', unread: true },
      { id: 'm3', from: 'Brian Cho', preview: 'Question about HW question #7', when: 'Yesterday', unread: false },
      { id: 'm4', from: 'Ms. Lee', preview: `Sub for Wednesday ${c[2].name}?`, when: '2 days', unread: false },
    ]
  }, [language])

  const SAMPLE_NOTIFS = useMemo(() => {
    const c = getClassrooms(language)
    const ko = language === 'korean'
    return [
      {
        id: 'n1', icon: CreditCard, color: 'text-emerald-600 bg-emerald-50',
        title: ko ? '결제 수신' : 'Payment received',
        desc: ko ? '박앨리스 · ₩320,000 (3월 수강료)' : 'Alice Park · ₩320,000 (March tuition)',
        when: ko ? '12분' : '12m', unread: true,
      },
      {
        id: 'n2', icon: Users, color: 'text-amber-600 bg-amber-50',
        title: ko ? '출석 미확인' : 'Pending attendance',
        desc: `${c[0].name} — ${ko ? '3명 상태 미확인' : '3 students need a status'}`,
        when: ko ? '1시간' : '1h', unread: true,
      },
      {
        id: 'n3', icon: Megaphone, color: 'text-primary bg-primary/10',
        title: ko ? '새 공지사항' : 'New announcement posted',
        desc: ko ? '3월 1일 휴원 안내' : 'Holiday closure — Mar 1',
        when: ko ? '어제' : 'Yesterday', unread: false,
      },
      {
        id: 'n4', icon: AlertCircle, color: 'text-rose-600 bg-rose-50',
        title: ko ? '청구서 연체' : 'Invoice overdue',
        desc: ko ? '임클로이 · ₩350,000 — 4일 연체' : 'Chloe Lim · ₩350,000 — 4 days overdue',
        when: ko ? '2일' : '2 days', unread: false,
      },
    ]
  }, [language])
  return (
    <NonFunctional>
      <div className="my-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Messages */}
        <div className="p-4 bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1">{t('eyebrows.messages')}</p>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-1.5">
                <Mail className="w-4 h-4" /> {t('messages.title')}
              </h2>
            </div>
            <Button size="sm" className="h-8">
              <Plus className="w-3.5 h-3.5" /> {t('messages.newMessage')}
            </Button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5 pointer-events-none" />
            <Input placeholder={String(t('common.search'))} className="h-9 pl-8 text-sm" />
          </div>
          <Card className="!gap-0 !py-0 overflow-hidden">
            {SAMPLE_MESSAGES.map((m, i) => (
              <div
                key={m.id}
                className={`px-3 py-2.5 flex items-start gap-2.5 ${
                  i < SAMPLE_MESSAGES.length - 1 ? 'border-b border-gray-100' : ''
                } hover:bg-gray-50 ${m.unread ? 'bg-primary/[0.02]' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${m.unread ? 'bg-primary' : 'bg-transparent'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className={`text-sm truncate ${m.unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {m.from}
                    </div>
                    <div className="text-[11px] text-gray-400 flex-shrink-0">{m.when}</div>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{m.preview}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Notifications */}
        <div className="p-4 bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1">{t('eyebrows.notifications')}</p>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-1.5">
                <Bell className="w-4 h-4" /> {t('notifications.title')}
              </h2>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              {t('notifications.markAsRead')}
            </Button>
          </div>
          <Card className="!gap-0 !py-0 overflow-hidden">
            {SAMPLE_NOTIFS.map((n, i) => {
              const Icon = n.icon
              return (
                <div
                  key={n.id}
                  className={`px-3 py-2.5 flex items-start gap-3 ${
                    i < SAMPLE_NOTIFS.length - 1 ? 'border-b border-gray-100' : ''
                  } hover:bg-gray-50 ${n.unread ? 'bg-primary/[0.02]' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${n.color}`}>
                    <Icon className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className={`text-sm truncate ${n.unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {n.title}
                      </div>
                      <div className="text-[11px] text-gray-400 flex-shrink-0">{n.when}</div>
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2">{n.desc}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )
            })}
          </Card>
        </div>
      </div>
    </NonFunctional>
  )
}
