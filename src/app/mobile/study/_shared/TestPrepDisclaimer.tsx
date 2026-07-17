"use client"

import { useEffect, useRef, useState } from 'react'
import { Info } from '@/app/mobile/study/_shared/icons'

/**
 * Legal disclaimer for AI-generated test-prep content.
 *
 * Two layers:
 *  1. Always-visible note: the practice content is independently
 *     AI-generated, educational-purpose-only, and not affiliated with or
 *     reproduced from official exam providers.
 *  2. An ⓘ popover (tap on mobile, hover on desktop) with the trademark
 *     attribution notice for SAT®/AP®/GRE®/TOEFL®/etc.
 *
 * Mount under any surface that lists or launches mock tests.
 */
export function TestPrepDisclaimer({ ko }: { ko: boolean }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // Close the popover on an outside tap.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative mt-4 px-1">
      <p className="text-[10.5px] leading-relaxed text-gray-400">
        {ko
          ? '본 연습 콘텐츠는 AI를 활용해 독자적으로 제작되었으며, 교육 목적으로만 제공됩니다. 공식 시험 주관사와 제휴하거나 승인을 받지 않았으며, 실제 시험 문제를 복제한 것이 아닙니다.'
          : 'This practice content is independently generated using AI and is intended solely for educational purposes. It is not affiliated with, endorsed by, or reproduced from the official examination providers.'}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          onMouseEnter={() => setOpen(true)}
          aria-label={ko ? '상표 고지 보기' : 'View trademark notice'}
          aria-expanded={open}
          className="inline-flex items-center justify-center align-middle w-4 h-4 ml-1 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </p>

      {open && (
        <div
          role="note"
          className="absolute bottom-full left-1 right-1 mb-2 z-30 rounded-xl bg-gray-900 text-gray-200 px-3.5 py-3 text-[10.5px] leading-relaxed shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-bottom-1 duration-150"
          onMouseLeave={() => setOpen(false)}
        >
          {ko
            ? 'SAT®, AP®, GRE®, TOEFL®, TOEIC®, IELTS®, IB®, IGCSE® 및 기타 시험명은 각 소유자의 상표입니다. 해당 상표는 본 플랫폼이 독자적인 연습 자료를 제공하는 시험을 식별하기 위한 용도로만 사용되며, 상표권자와의 제휴·후원·보증을 의미하지 않습니다.'
            : 'SAT®, AP®, GRE®, TOEFL®, TOEIC®, IELTS®, IB®, IGCSE®, and other examination names are trademarks of their respective owners. Their use is solely to identify the examinations for which this platform provides independent practice materials. No affiliation, sponsorship, or endorsement by the respective trademark owners is implied.'}
        </div>
      )}
    </div>
  )
}
