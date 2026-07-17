"use client"

import Link from 'next/link'
import { Shuffle } from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { PathMascot } from '../_shared/PathMascot'
import { studyButtonClass } from '../_shared/StudyButton'
import { StudyPageHeader } from '../_shared/primitives'

/**
 * /mobile/study/review — Daily SRS Review.
 *
 * Gated as COMING SOON: the flip-card SRS session is not launched yet,
 * so this page renders a static placeholder and fires no API calls.
 * Students are pointed at the wrong-answer notebook in the meantime.
 */
export default function ReviewPage() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <StudyPageHeader
        icon={Shuffle}
        iconColorClass="text-violet-600 bg-violet-50"
        eyebrow={String(t('study.review.eyebrow'))}
        title={String(t('study.review.title'))}
      />
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <PathMascot state="locked" size={96} />
        <h2 className="mt-4 text-[17px] font-bold text-gray-900">
          {ko ? '복습 기능은 준비 중이에요' : 'Daily review is coming soon'}
        </h2>
        <p className="mt-2 text-[13px] text-gray-500 leading-relaxed max-w-[280px]">
          {ko
            ? '곧 만나요! 그동안 오답노트에서 틀린 문제를 복습할 수 있어요.'
            : 'Coming soon! Meanwhile you can revisit your misses in the wrong-answer notebook.'}
        </p>
        <Link
          href="/mobile/study/wrong-notebook"
          className={studyButtonClass({ className: 'mt-6' })}
        >
          {ko ? '오답노트 보기' : 'Open wrong-answer notebook'}
        </Link>
      </div>
    </div>
  )
}
