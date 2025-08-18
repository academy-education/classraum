"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to auth - let AuthWrapper handle authenticated redirects
    router.push('/auth')
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-lg">Loading...</div>
    </div>
  )
}