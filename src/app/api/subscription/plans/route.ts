import { NextRequest, NextResponse } from 'next/server';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@/types/subscription';
import { getAcademySubscription, calculateProratedAmount, getDaysRemaining } from '@/lib/subscription';
import { getAcademyIdFromRequest } from '@/lib/subscription-middleware';

export async function GET(request: NextRequest) {
  try {
    const academyId = await getAcademyIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const includeProration = searchParams.get('proration') === 'true';
    
    // Get current subscription if academy ID is available
    let currentSubscription = null;
    let proratedPrices = null;
    
    if (academyId) {
      currentSubscription = await getAcademySubscription(academyId);
      
      if (includeProration && currentSubscription && currentSubscription.status === 'active') {
        const daysRemaining = await getDaysRemaining(academyId);
        
        proratedPrices = {
          daysRemaining,
          upgrades: Object.entries(SUBSCRIPTION_PLANS).reduce((acc, [tier, plan]) => {
            if (tier !== 'free' && tier !== currentSubscription!.planTier) {
              const monthlyProrated = calculateProratedAmount(
                currentSubscription!.planTier,
                tier as SubscriptionTier,
                daysRemaining,
                'monthly'
              );
              const yearlyProrated = calculateProratedAmount(
                currentSubscription!.planTier,
                tier as SubscriptionTier,
                daysRemaining,
                'yearly'
              );
              
              acc[tier] = {
                monthlyProrated,
                yearlyProrated,
                monthlyTotal: plan.monthlyPrice,
                yearlyTotal: plan.yearlyPrice,
              };
            }
            return acc;
          }, {} as Record<string, {
            monthlyProrated: number;
            yearlyProrated: number;
            monthlyTotal: number;
            yearlyTotal: number;
          }>)
        };
      }
    }

    // Transform plans for frontend
    const plansArray = Object.values(SUBSCRIPTION_PLANS).map(plan => ({
      ...plan,
      isCurrentPlan: currentSubscription?.planTier === plan.tier,
      recommended: plan.tier === 'pro', // Mark pro as recommended
    }));

    return NextResponse.json({
      success: true,
      data: {
        plans: plansArray,
        currentPlan: currentSubscription?.planTier || 'free',
        prorationInfo: proratedPrices
      }
    });

  } catch (error) {
    console.error('Plans API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '구독 플랜 정보를 가져오는 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}