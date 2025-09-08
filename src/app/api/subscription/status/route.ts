import { NextRequest, NextResponse } from 'next/server';
import { 
  getAcademySubscription, 
  getAcademyUsage, 
  checkSubscriptionLimits,
  getDaysRemaining,
  getSubscriptionStatusMessage
} from '@/lib/subscription';
import { getAcademyIdFromRequest } from '@/lib/subscription-middleware';

export async function GET(request: NextRequest) {
  try {
    const academyId = await getAcademyIdFromRequest(request);
    
    if (!academyId) {
      return NextResponse.json(
        { 
          success: false, 
          message: '학원 정보를 찾을 수 없습니다.' 
        },
        { status: 400 }
      );
    }

    // Get subscription, usage, and limits data in parallel
    const [subscription, usage, limitsCheck] = await Promise.all([
      getAcademySubscription(academyId),
      getAcademyUsage(academyId),
      checkSubscriptionLimits(academyId)
    ]);

    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: {
          subscription: null,
          usage: usage || {},
          limits: {
            isValid: true,
            exceededLimits: [],
            usage: {},
            limits: {}
          },
          daysRemaining: 0,
          statusMessage: {
            message: '구독이 없습니다',
            type: 'warning'
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
          monthlyAmount: subscription.monthlyAmount,
          billingCycle: subscription.billingCycle,
          autoRenew: subscription.autoRenew,
          studentLimit: subscription.studentLimit,
          teacherLimit: subscription.teacherLimit,
          storageLimitGb: subscription.storageLimitGb,
          featuresEnabled: subscription.featuresEnabled,
        },
        usage: usage || {
          currentStudentCount: 0,
          currentTeacherCount: 0,
          currentStorageGb: 0,
          currentClassroomCount: 0,
          apiCallsMonth: 0,
          smsSentMonth: 0,
          emailsSentMonth: 0,
        },
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