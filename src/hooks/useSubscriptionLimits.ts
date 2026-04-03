import { useState, useEffect, useCallback } from 'react'

interface SubscriptionLimits {
  totalUsers: number
  totalUserLimit: number
  canAddUsers: boolean
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useSubscriptionLimits(academyId: string | null): SubscriptionLimits {
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalUserLimit, setTotalUserLimit] = useState(0)
  const [canAddUsers, setCanAddUsers] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLimits = useCallback(async () => {
    if (!academyId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/subscription/check-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkType: 'general' })
      })

      const result = await response.json()

      if (result.success && result.data) {
        const { usage, limits } = result.data
        const currentUsers = (usage?.totalUsers ?? 0)
        const userLimit = (limits?.totalUserLimit ?? 0)
        setTotalUsers(currentUsers)
        setTotalUserLimit(userLimit)
        setCanAddUsers(userLimit === 0 || currentUsers < userLimit)
        setError(null)
      }
    } catch (err) {
      console.warn('Failed to fetch subscription limits:', err)
      setError('Failed to load limits')
      // Default to allowing on error
      setCanAddUsers(true)
    } finally {
      setLoading(false)
    }
  }, [academyId])

  useEffect(() => {
    fetchLimits()
  }, [fetchLimits])

  return {
    totalUsers,
    totalUserLimit,
    canAddUsers,
    loading,
    error,
    refetch: fetchLimits
  }
}
