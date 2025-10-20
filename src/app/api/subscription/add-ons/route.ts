import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import {
  calculateAddonCost,
  validateAddonQuantities,
} from '@/lib/addon-config';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';

export async function POST(req: NextRequest) {
  try {

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const {
      additionalStudents,
      additionalTeachers,
      additionalStorageGb,
    } = body;

    // Validate input types
    if (
      typeof additionalStudents !== 'number' ||
      typeof additionalTeachers !== 'number' ||
      typeof additionalStorageGb !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Invalid add-on quantities' },
        { status: 400 }
      );
    }

    // Get the user's academy
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('academy_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.academy_id) {
      return NextResponse.json(
        { error: 'User not associated with an academy' },
        { status: 400 }
      );
    }

    // Only managers can purchase add-ons
    if (userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers can purchase add-ons' },
        { status: 403 }
      );
    }

    const academyId = userData.academy_id;

    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('academy_subscriptions')
      .select('*')
      .eq('academy_id', academyId)
      .maybeSingle();

    if (subError) {
      console.error('[AddOns API] Error fetching subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Validate subscription status
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return NextResponse.json(
        { error: 'Subscription must be active to purchase add-ons' },
        { status: 400 }
      );
    }

    const planTier = subscription.plan_tier;

    // Validate add-on quantities
    const validation = validateAddonQuantities(
      planTier,
      additionalStudents,
      additionalTeachers,
      additionalStorageGb
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Calculate add-on cost
    const addonCost = calculateAddonCost(
      planTier,
      additionalStudents,
      additionalTeachers,
      additionalStorageGb
    );

    // Get base plan price
    const basePlan = SUBSCRIPTION_PLANS[planTier];
    const basePlanPrice = basePlan.monthlyPrice;

    // Calculate new total monthly amount
    const newMonthlyAmount = basePlanPrice + addonCost;

    // Update subscription with pending add-ons
    const { error: updateError } = await supabase
      .from('academy_subscriptions')
      .update({
        pending_additional_students: additionalStudents,
        pending_additional_teachers: additionalTeachers,
        pending_additional_storage_gb: additionalStorageGb,
        pending_addons_effective_date: subscription.next_billing_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('[AddOns API] Error updating subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    // Return confirmation
    return NextResponse.json({
      success: true,
      message: 'Add-ons scheduled successfully',
      data: {
        currentMonthlyAmount: subscription.monthly_amount,
        newMonthlyAmount,
        addonCost,
        effectiveDate: subscription.next_billing_date,
        addons: {
          students: additionalStudents,
          teachers: additionalTeachers,
          storageGb: additionalStorageGb,
        },
      },
    });
  } catch (error) {
    console.error('[AddOns API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to fetch current add-ons
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's academy
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('academy_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.academy_id) {
      return NextResponse.json(
        { error: 'User not associated with an academy' },
        { status: 400 }
      );
    }

    const academyId = userData.academy_id;

    // Get current subscription with add-ons
    const { data: subscription, error: subError } = await supabase
      .from('academy_subscriptions')
      .select(
        `
        *,
        additional_students,
        additional_teachers,
        additional_storage_gb,
        pending_additional_students,
        pending_additional_teachers,
        pending_additional_storage_gb,
        pending_addons_effective_date
      `
      )
      .eq('academy_id', academyId)
      .maybeSingle();

    if (subError) {
      console.error('[AddOns API] Error fetching subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Calculate current add-on cost
    const currentAddonCost = calculateAddonCost(
      subscription.plan_tier,
      subscription.additional_students || 0,
      subscription.additional_teachers || 0,
      subscription.additional_storage_gb || 0
    );

    // Calculate pending add-on cost if exists
    const pendingAddonCost =
      subscription.pending_additional_students !== null
        ? calculateAddonCost(
            subscription.plan_tier,
            subscription.pending_additional_students || 0,
            subscription.pending_additional_teachers || 0,
            subscription.pending_additional_storage_gb || 0
          )
        : null;

    return NextResponse.json({
      success: true,
      data: {
        current: {
          students: subscription.additional_students || 0,
          teachers: subscription.additional_teachers || 0,
          storageGb: subscription.additional_storage_gb || 0,
          cost: currentAddonCost,
        },
        pending: subscription.pending_additional_students !== null
          ? {
              students: subscription.pending_additional_students || 0,
              teachers: subscription.pending_additional_teachers || 0,
              storageGb: subscription.pending_additional_storage_gb || 0,
              cost: pendingAddonCost,
              effectiveDate: subscription.pending_addons_effective_date,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('[AddOns API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
