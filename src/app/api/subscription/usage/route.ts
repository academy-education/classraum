import { NextRequest, NextResponse } from 'next/server';
import { getAcademyUsage, checkSubscriptionLimits } from '@/lib/subscription';
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

    const usage = await getAcademyUsage(academyId);
    const limitsCheck = await checkSubscriptionLimits(academyId);

    if (!usage) {
      return NextResponse.json(
        {
          success: false,
          message: '사용량 정보를 찾을 수 없습니다.'
        },
        { status: 404 }
      );
    }

    // Calculate usage percentages
    const limits = limitsCheck.limits;
    const totalUsers = usage.currentStudentCount + usage.currentTeacherCount;
    const usagePercentages = {
      totalUsers: limits.totalUserLimit === -1 ? 0 : Math.round((totalUsers / limits.totalUserLimit) * 100),
      storage: limits.storageGb === -1 ? 0 : Math.round((usage.currentStorageGb / limits.storageGb) * 100),
      classrooms: limits.classroomLimit === -1 ? 0 : Math.round((usage.currentClassroomCount / limits.classroomLimit) * 100),
      apiCalls: limits.apiCallsPerMonth === -1 ? 0 : Math.round((usage.apiCallsMonth / limits.apiCallsPerMonth) * 100),
      sms: limits.smsPerMonth === -1 ? 0 : Math.round((usage.smsSentMonth / limits.smsPerMonth) * 100),
      emails: limits.emailsPerMonth === -1 ? 0 : Math.round((usage.emailsSentMonth / limits.emailsPerMonth) * 100),
    };

    return NextResponse.json({
      success: true,
      data: {
        usage: {
          currentStudentCount: usage.currentStudentCount,
          currentTeacherCount: usage.currentTeacherCount,
          currentStorageGb: usage.currentStorageGb,
          currentClassroomCount: usage.currentClassroomCount,
          apiCallsMonth: usage.apiCallsMonth,
          smsSentMonth: usage.smsSentMonth,
          emailsSentMonth: usage.emailsSentMonth,
          peakStudentCount: usage.peakStudentCount,
          peakTeacherCount: usage.peakTeacherCount,
          calculatedAt: usage.calculatedAt,
        },
        limits: limits,
        percentages: usagePercentages,
        exceededLimits: limitsCheck.exceededLimits,
        isValid: limitsCheck.isValid
      }
    });

  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '사용량 정보를 가져오는 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}