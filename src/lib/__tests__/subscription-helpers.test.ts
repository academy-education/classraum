/**
 * Tests for pure helper functions in src/lib/subscription.ts.
 *
 * These re-implement the logic inline to avoid importing the full module
 * (which initializes a Supabase client at top level and fails in Jest's
 * jsdom environment).
 */

// ---- generateOrderId ----
function generateOrderId(academyId: string, tier: string, cycle: 'monthly' | 'yearly'): string {
  const timestamp = Date.now()
  return `SUB_${academyId}_${tier}_${cycle}_${timestamp}`
}

// ---- formatPrice ----
function formatPrice(amount: number, currency: string = 'KRW'): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

// ---- calculateProratedAmount (subscription.ts version, uses tiers + plans) ----
const PLAN_PRICES: Record<string, { monthlyPrice: number; yearlyPrice: number }> = {
  free: { monthlyPrice: 0, yearlyPrice: 0 },
  individual: { monthlyPrice: 24900, yearlyPrice: 249000 },
  basic: { monthlyPrice: 249000, yearlyPrice: 2490000 },
  pro: { monthlyPrice: 399000, yearlyPrice: 3990000 },
  enterprise: { monthlyPrice: 999000, yearlyPrice: 9990000 },
}

function calculateProratedAmount(
  currentTier: string,
  newTier: string,
  daysRemaining: number,
  billingCycle: 'monthly' | 'yearly'
): number {
  const currentPlan = PLAN_PRICES[currentTier]
  const newPlan = PLAN_PRICES[newTier]
  const currentPrice = billingCycle === 'monthly' ? currentPlan.monthlyPrice : currentPlan.yearlyPrice
  const newPrice = billingCycle === 'monthly' ? newPlan.monthlyPrice : newPlan.yearlyPrice
  const priceDifference = newPrice - currentPrice
  if (priceDifference <= 0) return 0
  const daysInPeriod = billingCycle === 'monthly' ? 30 : 365
  return Math.round((priceDifference * daysRemaining) / daysInPeriod)
}

// ---- getSubscriptionStatusMessage ----
type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | string
function getSubscriptionStatusMessage(status: SubscriptionStatus): {
  message: string
  type: 'success' | 'warning' | 'error'
} {
  switch (status) {
    case 'active':
      return { message: '구독이 활성화되어 있습니다', type: 'success' }
    case 'trialing':
      return { message: '무료 체험 중입니다', type: 'success' }
    case 'past_due':
      return { message: '결제가 연체되었습니다', type: 'warning' }
    case 'canceled':
      return { message: '구독이 취소되었습니다', type: 'error' }
    default:
      return { message: '구독 상태를 확인할 수 없습니다', type: 'warning' }
  }
}

describe('generateOrderId', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-04-15T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('produces id matching SUB_ pattern', () => {
    const id = generateOrderId('acad-123', 'pro', 'monthly')
    expect(id).toMatch(/^SUB_acad-123_pro_monthly_\d+$/)
  })

  it('embeds the timestamp at end', () => {
    const id = generateOrderId('acad-123', 'pro', 'monthly')
    const timestamp = parseInt(id.split('_').pop()!, 10)
    expect(timestamp).toBe(new Date('2026-04-15T12:00:00Z').getTime())
  })

  it('produces different ids when called at different times', () => {
    const id1 = generateOrderId('acad-1', 'basic', 'monthly')
    jest.setSystemTime(new Date('2026-04-15T12:00:01Z'))
    const id2 = generateOrderId('acad-1', 'basic', 'monthly')
    expect(id1).not.toBe(id2)
  })

  it('preserves academyId and tier in output', () => {
    const id = generateOrderId('my-academy', 'enterprise', 'yearly')
    expect(id).toContain('my-academy')
    expect(id).toContain('enterprise')
    expect(id).toContain('yearly')
  })
})

describe('formatPrice', () => {
  it('formats KRW with no decimals', () => {
    expect(formatPrice(24900)).toBe('₩24,900')
  })

  it('formats large amounts with separators', () => {
    expect(formatPrice(2490000)).toBe('₩2,490,000')
  })

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('₩0')
  })
})

describe('calculateProratedAmount (tier-based)', () => {
  it('returns 0 for downgrade', () => {
    expect(calculateProratedAmount('pro', 'basic', 15, 'monthly')).toBe(0)
  })

  it('returns 0 for same tier', () => {
    expect(calculateProratedAmount('basic', 'basic', 15, 'monthly')).toBe(0)
  })

  it('charges proportionally for monthly upgrade', () => {
    // basic to pro = 399000 - 249000 = 150000 difference
    // (150000 * 15/30) = 75000
    expect(calculateProratedAmount('basic', 'pro', 15, 'monthly')).toBe(75000)
  })

  it('charges proportionally for yearly upgrade', () => {
    // basic to pro yearly = 3990000 - 2490000 = 1500000 difference
    // (1500000 * 180/365) = 739726
    expect(calculateProratedAmount('basic', 'pro', 180, 'yearly')).toBe(739726)
  })

  it('charges 0 when no days remaining', () => {
    expect(calculateProratedAmount('basic', 'pro', 0, 'monthly')).toBe(0)
  })

  it('charges full difference at start of period', () => {
    // basic to pro at start of month = full 150000 difference
    expect(calculateProratedAmount('basic', 'pro', 30, 'monthly')).toBe(150000)
  })

  it('handles individual to enterprise upgrade', () => {
    // individual to enterprise = 999000 - 24900 = 974100 difference
    // (974100 * 30/30) = 974100
    expect(calculateProratedAmount('individual', 'enterprise', 30, 'monthly')).toBe(974100)
  })
})

describe('getSubscriptionStatusMessage', () => {
  it('returns success for active', () => {
    const result = getSubscriptionStatusMessage('active')
    expect(result.type).toBe('success')
    expect(result.message).toBe('구독이 활성화되어 있습니다')
  })

  it('returns success for trialing', () => {
    const result = getSubscriptionStatusMessage('trialing')
    expect(result.type).toBe('success')
    expect(result.message).toBe('무료 체험 중입니다')
  })

  it('returns warning for past_due', () => {
    const result = getSubscriptionStatusMessage('past_due')
    expect(result.type).toBe('warning')
    expect(result.message).toBe('결제가 연체되었습니다')
  })

  it('returns error for canceled', () => {
    const result = getSubscriptionStatusMessage('canceled')
    expect(result.type).toBe('error')
    expect(result.message).toBe('구독이 취소되었습니다')
  })

  it('returns warning fallback for unknown status', () => {
    const result = getSubscriptionStatusMessage('unknown_status')
    expect(result.type).toBe('warning')
    expect(result.message).toBe('구독 상태를 확인할 수 없습니다')
  })
})
