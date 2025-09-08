import { NextRequest, NextResponse } from 'next/server';
import { 
  canAddStudents,
  canAddTeachers,
  hasFeatureAccess,
  checkSubscriptionLimits,
  isSubscriptionActive
} from '@/lib/subscription';
import { getAcademyIdFromRequest } from '@/lib/subscription-middleware';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { checkType, count, feature } = body;

    // Check if subscription is active first
    const isActive = await isSubscriptionActive(academyId);
    if (!isActive) {
      return NextResponse.json({
        success: false,
        message: '구독이 비활성 상태입니다.',
        code: 'SUBSCRIPTION_INACTIVE',
        allowed: false
      });
    }

    switch (checkType) {
      case 'student_add':
        const studentCheck = await canAddStudents(academyId, count || 1);
        return NextResponse.json({
          success: true,
          allowed: studentCheck.allowed,
          message: studentCheck.message,
          data: {
            current: studentCheck.currentCount,
            limit: studentCheck.limit,
            adding: count || 1,
            wouldExceed: !studentCheck.allowed
          }
        });

      case 'teacher_add':
        const teacherCheck = await canAddTeachers(academyId, count || 1);
        return NextResponse.json({
          success: true,
          allowed: teacherCheck.allowed,
          message: teacherCheck.message,
          data: {
            current: teacherCheck.currentCount,
            limit: teacherCheck.limit,
            adding: count || 1,
            wouldExceed: !teacherCheck.allowed
          }
        });

      case 'feature':
        if (!feature) {
          return NextResponse.json(
            {
              success: false,
              message: '기능 이름이 필요합니다.'
            },
            { status: 400 }
          );
        }
        
        const hasAccess = await hasFeatureAccess(academyId, feature);
        return NextResponse.json({
          success: true,
          allowed: hasAccess,
          message: hasAccess ? '기능을 사용할 수 있습니다.' : '현재 구독 플랜에서는 이 기능을 사용할 수 없습니다.',
          data: {
            feature,
            hasAccess
          }
        });

      case 'general':
        const limitsCheck = await checkSubscriptionLimits(academyId);
        return NextResponse.json({
          success: true,
          allowed: limitsCheck.isValid,
          message: limitsCheck.isValid ? '모든 한도 내에 있습니다.' : '일부 한도를 초과했습니다.',
          data: {
            isValid: limitsCheck.isValid,
            exceededLimits: limitsCheck.exceededLimits,
            usage: limitsCheck.usage,
            limits: limitsCheck.limits
          }
        });

      default:
        return NextResponse.json(
          {
            success: false,
            message: '지원하지 않는 확인 유형입니다.'
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Check limits API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '한도 확인 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}