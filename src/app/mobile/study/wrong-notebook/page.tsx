"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * The wrong-answer notebook (오답노트) now lives on the Review tab. This
 * route is kept alive for old links (and the print entry point's parent
 * path) by redirecting to /mobile/study/review. The print view itself
 * lives at ./print and is unaffected.
 */
export default function WrongNotebookPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/mobile/study/review') }, [router])
  return <div className="h-full" aria-hidden />
}
