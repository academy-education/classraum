import { AlertTriangle, CheckCircle2, Loader2, Play, Trophy } from './icons'

/**
 * How a mock test presents itself in a list.
 *
 * Shared because two lists show the same sessions — /mobile/study/tests
 * and the topic page's "My mock tests" — and they had drifted into
 * different visual languages for the same row: the tests page used flat
 * 50-weight icon tints while the topic page used a coloured percentage
 * pill in the icon slot. Neither matched the landing page's Today band,
 * which is where a student sees this kind of card most often.
 *
 * The gradient + coloured drop shadow here is the Today band's treatment,
 * so all three now read as one product. Anything that needs a per-state
 * icon imports from here rather than restating the class string.
 */
export type TestState = 'ready' | 'generating' | 'in_progress' | 'completed' | 'failed'

export const TEST_STATE_META: Record<TestState, {
  icon: typeof CheckCircle2
  /** Icon tile background + glyph colour, matching StudyTodayCard's prop. */
  iconColorClass: string
  label: (ko: boolean) => string
}> = {
  ready: {
    icon: Play,
    iconColorClass: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_4px_10px_-2px_rgba(16,185,129,0.35)]',
    label: ko => ko ? '시작' : 'Ready',
  },
  generating: {
    icon: Loader2,
    iconColorClass: 'bg-gradient-to-br from-primary to-indigo-600 text-white shadow-[0_4px_10px_-2px_rgba(40,133,232,0.35)]',
    label: ko => ko ? '생성 중' : 'Generating',
  },
  in_progress: {
    icon: Play,
    iconColorClass: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_4px_10px_-2px_rgba(251,146,60,0.35)]',
    label: ko => ko ? '진행 중' : 'In progress',
  },
  completed: {
    icon: Trophy,
    iconColorClass: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-[0_4px_10px_-2px_rgba(139,92,246,0.35)]',
    label: ko => ko ? '완료' : 'Completed',
  },
  failed: {
    icon: AlertTriangle,
    iconColorClass: 'bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-[0_4px_10px_-2px_rgba(244,63,94,0.35)]',
    label: ko => ko ? '실패' : 'Failed',
  },
}
