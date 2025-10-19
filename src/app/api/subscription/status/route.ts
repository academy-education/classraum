import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getAcademySubscription,
  getAcademyUsage,
  checkSubscriptionLimits,
  getDaysRemaining,
  getSubscriptionStatusMessage
} from '@/lib/subscription';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';

// Mark this route as dynamic to ensure it's not cached
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Missing authorization header' },
        { status: 401 }
      );
    }

    // Extract the JWT token
    const token = authHeader.substring(7);

    // Create Supabase client with the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[Subscription Status] Auth error:', authError);
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get manager's academy
    const { data: manager, error: managerError } = await supabase
      .from('managers')
      .select('academy_id')
      .eq('user_id', user.id)
      .single();

    if (managerError || !manager) {
      return NextResponse.json(
        { success: false, message: 'Manager not found' },
        { status: 403 }
      );
    }

    const academyId = manager.academy_id;

    // Get subscription
    const subscription = await getAcademySubscription(academyId);

    // Calculate real-time usage from actual tables
    const [studentsResult, parentsResult, teachersResult, managersResult, classroomsResult, storageResult] = await Promise.all([
      supabase.from('students').select('user_id', { count: 'exact', head: true }).eq('academy_id', academyId).eq('active', true),
      supabase.from('parents').select('user_id', { count: 'exact', head: true }).eq('academy_id', academyId).eq('active', true),
      supabase.from('teachers').select('user_id', { count: 'exact', head: true }).eq('academy_id', academyId).eq('active', true),
      supabase.from('managers').select('user_id', { count: 'exact', head: true }).eq('academy_id', academyId).eq('active', true),
      supabase.from('classrooms').select('id', { count: 'exact', head: true }).eq('academy_id', academyId).is('deleted_at', null),
      // Calculate total storage by summing file sizes from assignment_attachments
      // Join through assignments -> classroom_sessions -> classrooms to filter by academy
      supabase.rpc('get_academy_storage_usage', { p_academy_id: academyId })
    ]);

    // If RPC function doesn't exist, fall back to 0
    const totalStorageBytes = storageResult.data || 0;
    const totalStorageGb = totalStorageBytes / (1024 * 1024 * 1024); // Convert bytes to GB

    const usage = {
      currentStudentCount: (studentsResult.count || 0) + (parentsResult.count || 0),
      currentTeacherCount: (teachersResult.count || 0) + (managersResult.count || 0),
      currentStorageGb: totalStorageGb,
      currentClassroomCount: classroomsResult.count || 0,
      apiCallsMonth: 0,
      smsSentMonth: 0,
      emailsSentMonth: 0,
    };

    // Check limits based on real-time usage
    const limitsCheck = await checkSubscriptionLimits(academyId);

    // If no subscription, user is on free plan
    if (!subscription) {
      const freePlan = SUBSCRIPTION_PLANS.free;

      return NextResponse.json({
        success: true,
        data: {
          subscription: {
            id: 'free',
            academyId: academyId,
            planTier: 'free',
            status: 'active',
            currentPeriodEnd: new Date('2099-12-31').toISOString(),
            nextBillingDate: null,
            monthlyAmount: 0,
            billingCycle: 'monthly',
            autoRenew: false,
            studentLimit: freePlan.limits.studentLimit,
            teacherLimit: freePlan.limits.teacherLimit,
            storageLimitGb: freePlan.limits.storageGb,
            featuresEnabled: freePlan.features,
          },
          usage,
          limits: limitsCheck || {
            isValid: true,
            exceededLimits: [],
            usage,
            limits: freePlan.limits
          },
          daysRemaining: 999,
          statusMessage: {
            message: '무료 플랜',
            type: 'info'
          }
        }
      });
    }

    const daysRemaining = await getDaysRemaining(academyId);
    const statusMessage = getSubscriptionStatusMessage(subscription.status);

    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          academyId: subscription.academyId,
          planTier: subscription.planTier,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          nextBillingDate: subscription.nextBillingDate,
          monthlyAmount: subscription.monthlyAmount,
          billingCycle: subscription.billingCycle,
          autoRenew: subscription.autoRenew,
          studentLimit: subscription.studentLimit,
          teacherLimit: subscription.teacherLimit,
          storageLimitGb: subscription.storageLimitGb,
          featuresEnabled: subscription.featuresEnabled,
          pendingTier: subscription.pendingTier,
          pendingMonthlyAmount: subscription.pendingMonthlyAmount,
          pendingChangeEffectiveDate: subscription.pendingChangeEffectiveDate,
        },
        usage,
        limits: limitsCheck,
        daysRemaining,
        statusMessage
      }
    });

  } catch (error) {
    console.error('Subscription status API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '구독 상태를 가져오는 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}