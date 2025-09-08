import { createClient } from '@supabase/supabase-js';
import { 
  SubscriptionTier, 
  SubscriptionStatus, 
  AcademySubscription,
  SubscriptionUsage,
  SubscriptionLimits,
  SUBSCRIPTION_PLANS 
} from '@/types/subscription';

// Create admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Get current subscription for an academy
 */
export async function getAcademySubscription(academyId: string): Promise<AcademySubscription | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('academy_subscriptions')
      .select('*')
      .eq('academy_id', academyId)
      .single();

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data ? {
      id: data.id,
      academyId: data.academy_id,
      planTier: data.plan_tier,
      status: data.status,
      currentPeriodStart: new Date(data.current_period_start),
      currentPeriodEnd: new Date(data.current_period_end),
      trialEndsAt: data.trial_ends_at ? new Date(data.trial_ends_at) : undefined,
      kgSubscriptionId: data.kg_subscription_id,
      kgCustomerId: data.kg_customer_id,
      lastPaymentDate: data.last_payment_date ? new Date(data.last_payment_date) : undefined,
      nextBillingDate: data.next_billing_date ? new Date(data.next_billing_date) : undefined,
      studentLimit: data.student_limit,
      teacherLimit: data.teacher_limit,
      storageLimitGb: data.storage_limit_gb,
      featuresEnabled: data.features_enabled,
      monthlyAmount: data.monthly_amount,
      billingCycle: data.billing_cycle,
      autoRenew: data.auto_renew,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    } : null;
  } catch (error) {
    console.error('Error in getAcademySubscription:', error);
    return null;
  }
}

/**
 * Get current usage for an academy
 */
export async function getAcademyUsage(academyId: string): Promise<SubscriptionUsage | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('subscription_usage')
      .select('*')
      .eq('academy_id', academyId)
      .single();

    if (error) {
      console.error('Error fetching usage:', error);
      return null;
    }

    return data ? {
      id: data.id,
      academyId: data.academy_id,
      currentStudentCount: data.current_student_count,
      currentTeacherCount: data.current_teacher_count,
      currentStorageGb: data.current_storage_gb,
      currentClassroomCount: data.current_classroom_count,
      apiCallsMonth: data.api_calls_month,
      smsSentMonth: data.sms_sent_month,
      emailsSentMonth: data.emails_sent_month,
      peakStudentCount: data.peak_student_count,
      peakTeacherCount: data.peak_teacher_count,
      calculatedAt: new Date(data.calculated_at),
    } : null;
  } catch (error) {
    console.error('Error in getAcademyUsage:', error);
    return null;
  }
}

/**
 * Check if an academy has exceeded any subscription limits
 */
export async function checkSubscriptionLimits(academyId: string): Promise<{
  isValid: boolean;
  exceededLimits: string[];
  usage: Partial<SubscriptionUsage>;
  limits: SubscriptionLimits;
}> {
  const subscription = await getAcademySubscription(academyId);
  const usage = await getAcademyUsage(academyId);

  // Default to free tier if no subscription
  const tier = subscription?.planTier || 'free';
  const limits = SUBSCRIPTION_PLANS[tier].limits;

  const exceededLimits: string[] = [];
  
  if (!usage) {
    return {
      isValid: true,
      exceededLimits: [],
      usage: {},
      limits
    };
  }

  // Check each limit (-1 means unlimited)
  if (limits.studentLimit !== -1 && usage.currentStudentCount > limits.studentLimit) {
    exceededLimits.push(`Students: ${usage.currentStudentCount}/${limits.studentLimit}`);
  }
  
  if (limits.teacherLimit !== -1 && usage.currentTeacherCount > limits.teacherLimit) {
    exceededLimits.push(`Teachers: ${usage.currentTeacherCount}/${limits.teacherLimit}`);
  }
  
  if (limits.classroomLimit !== -1 && usage.currentClassroomCount > limits.classroomLimit) {
    exceededLimits.push(`Classrooms: ${usage.currentClassroomCount}/${limits.classroomLimit}`);
  }
  
  if (limits.storageGb !== -1 && usage.currentStorageGb > limits.storageGb) {
    exceededLimits.push(`Storage: ${usage.currentStorageGb.toFixed(2)}GB/${limits.storageGb}GB`);
  }
  
  if (limits.apiCallsPerMonth !== -1 && usage.apiCallsMonth > limits.apiCallsPerMonth) {
    exceededLimits.push(`API Calls: ${usage.apiCallsMonth}/${limits.apiCallsPerMonth}`);
  }
  
  if (limits.smsPerMonth !== -1 && usage.smsSentMonth > limits.smsPerMonth) {
    exceededLimits.push(`SMS: ${usage.smsSentMonth}/${limits.smsPerMonth}`);
  }
  
  if (limits.emailsPerMonth !== -1 && usage.emailsSentMonth > limits.emailsPerMonth) {
    exceededLimits.push(`Emails: ${usage.emailsSentMonth}/${limits.emailsPerMonth}`);
  }

  return {
    isValid: exceededLimits.length === 0,
    exceededLimits,
    usage,
    limits
  };
}

/**
 * Check if an academy has access to a specific feature
 */
export async function hasFeatureAccess(academyId: string, feature: keyof SubscriptionLimits): Promise<boolean> {
  const subscription = await getAcademySubscription(academyId);
  const tier = subscription?.planTier || 'free';
  const features = SUBSCRIPTION_PLANS[tier].features;
  
  return features[feature as keyof typeof features] === true;
}

/**
 * Check if academy can add more students
 */
export async function canAddStudents(academyId: string, count: number = 1): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
  message?: string;
}> {
  const subscription = await getAcademySubscription(academyId);
  const usage = await getAcademyUsage(academyId);
  
  const tier = subscription?.planTier || 'free';
  const limit = SUBSCRIPTION_PLANS[tier].limits.studentLimit;
  const currentCount = usage?.currentStudentCount || 0;
  
  if (limit === -1) {
    return { allowed: true, currentCount, limit, message: 'Unlimited students' };
  }
  
  const allowed = currentCount + count <= limit;
  
  return {
    allowed,
    currentCount,
    limit,
    message: allowed ? undefined : `Student limit reached (${currentCount}/${limit}). Please upgrade your subscription.`
  };
}

/**
 * Check if academy can add more teachers
 */
export async function canAddTeachers(academyId: string, count: number = 1): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
  message?: string;
}> {
  const subscription = await getAcademySubscription(academyId);
  const usage = await getAcademyUsage(academyId);
  
  const tier = subscription?.planTier || 'free';
  const limit = SUBSCRIPTION_PLANS[tier].limits.teacherLimit;
  const currentCount = usage?.currentTeacherCount || 0;
  
  if (limit === -1) {
    return { allowed: true, currentCount, limit, message: 'Unlimited teachers' };
  }
  
  const allowed = currentCount + count <= limit;
  
  return {
    allowed,
    currentCount,
    limit,
    message: allowed ? undefined : `Teacher limit reached (${currentCount}/${limit}). Please upgrade your subscription.`
  };
}

/**
 * Check if subscription is active and not expired
 */
export async function isSubscriptionActive(academyId: string): Promise<boolean> {
  const subscription = await getAcademySubscription(academyId);
  
  if (!subscription) return false;
  
  // Check subscription status
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return false;
  }
  
  // Check if period has expired
  if (subscription.currentPeriodEnd < new Date()) {
    return false;
  }
  
  return true;
}

/**
 * Get days remaining in current billing period
 */
export async function getDaysRemaining(academyId: string): Promise<number> {
  const subscription = await getAcademySubscription(academyId);
  
  if (!subscription) return 0;
  
  const now = new Date();
  const end = subscription.currentPeriodEnd;
  
  if (end < now) return 0;
  
  const diffTime = Math.abs(end.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Generate subscription order ID for KG payment
 */
export function generateOrderId(academyId: string, tier: SubscriptionTier, cycle: 'monthly' | 'yearly'): string {
  const timestamp = Date.now();
  return `SUB_${academyId}_${tier}_${cycle}_${timestamp}`;
}

/**
 * Format subscription price for display
 */
export function formatPrice(amount: number, currency: string = 'KRW'): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate prorated amount for subscription upgrade
 */
export function calculateProratedAmount(
  currentTier: SubscriptionTier,
  newTier: SubscriptionTier,
  daysRemaining: number,
  billingCycle: 'monthly' | 'yearly'
): number {
  const currentPlan = SUBSCRIPTION_PLANS[currentTier];
  const newPlan = SUBSCRIPTION_PLANS[newTier];
  
  const currentPrice = billingCycle === 'monthly' 
    ? currentPlan.monthlyPrice 
    : currentPlan.yearlyPrice;
  
  const newPrice = billingCycle === 'monthly' 
    ? newPlan.monthlyPrice 
    : newPlan.yearlyPrice;
  
  const priceDifference = newPrice - currentPrice;
  
  if (priceDifference <= 0) return 0;
  
  const daysInPeriod = billingCycle === 'monthly' ? 30 : 365;
  const proratedAmount = (priceDifference * daysRemaining) / daysInPeriod;
  
  return Math.round(proratedAmount);
}

/**
 * Get subscription status message
 */
export function getSubscriptionStatusMessage(status: SubscriptionStatus): {
  message: string;
  type: 'success' | 'warning' | 'error';
} {
  switch (status) {
    case 'active':
      return { message: '구독이 활성화되어 있습니다', type: 'success' };
    case 'trialing':
      return { message: '무료 체험 중입니다', type: 'success' };
    case 'past_due':
      return { message: '결제가 연체되었습니다', type: 'warning' };
    case 'canceled':
      return { message: '구독이 취소되었습니다', type: 'error' };
    default:
      return { message: '구독 상태를 확인할 수 없습니다', type: 'warning' };
  }
}

/**
 * Increment API call usage
 */
export async function incrementApiUsage(academyId: string, calls: number = 1): Promise<void> {
  try {
    await supabaseAdmin.rpc('increment_api_usage', {
      p_academy_id: academyId,
      p_calls: calls
    });
  } catch (error) {
    console.error('Error incrementing API usage:', error);
  }
}

/**
 * Increment SMS usage
 */
export async function incrementSmsUsage(academyId: string, count: number = 1): Promise<void> {
  try {
    await supabaseAdmin.rpc('increment_sms_usage', {
      p_academy_id: academyId,
      p_count: count
    });
  } catch (error) {
    console.error('Error incrementing SMS usage:', error);
  }
}

/**
 * Increment email usage
 */
export async function incrementEmailUsage(academyId: string, count: number = 1): Promise<void> {
  try {
    await supabaseAdmin.rpc('increment_email_usage', {
      p_academy_id: academyId,
      p_count: count
    });
  } catch (error) {
    console.error('Error incrementing email usage:', error);
  }
}