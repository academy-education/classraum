import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  calculateAddonCost,
  validateAddonQuantities,
} from '@/lib/addon-config';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';

export async function POST(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
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

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

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

    // Get manager's academy
    const { data: manager, error: managerError } = await supabase
      .from('managers')
      .select('academy_id')
      .eq('user_id', user.id)
      .single();

    if (managerError || !manager) {
      return NextResponse.json(
        { error: 'Manager not found' },
        { status: 403 }
      );
    }

    const academyId = manager.academy_id;

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

    // Get base plan to calculate add-ons above base limit
    const basePlan = SUBSCRIPTION_PLANS[planTier];
    const baseTotalUserLimit = basePlan.limits.totalUserLimit;
    const baseStorageLimit = basePlan.limits.storageGb;

    // Calculate new limits (can be increased or decreased)
    const newTotalUserLimit = subscription.total_user_limit + additionalStudents + additionalTeachers;
    const newStorageLimit = subscription.storage_limit_gb + additionalStorageGb;

    // Get current usage to validate we don't go below it
    const { data: usage, error: usageError } = await supabase
      .from('subscription_usage')
      .select('current_student_count, current_teacher_count, current_storage_gb')
      .eq('academy_id', academyId)
      .maybeSingle();

    if (usageError) {
      console.error('[AddOns API] Error fetching usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to fetch usage data' },
        { status: 500 }
      );
    }

    const currentUserCount = (usage?.current_student_count || 0) + (usage?.current_teacher_count || 0);
    const currentStorageGb = usage?.current_storage_gb || 0;

    // Validate new limits don't go below current usage
    if (newTotalUserLimit < currentUserCount) {
      return NextResponse.json(
        { error: `Cannot reduce user limit below current usage (${currentUserCount} users)` },
        { status: 400 }
      );
    }

    if (newStorageLimit < currentStorageGb) {
      return NextResponse.json(
        { error: `Cannot reduce storage below current usage (${currentStorageGb.toFixed(2)} GB)` },
        { status: 400 }
      );
    }

    // Validate new limits don't go below base plan limits
    if (newTotalUserLimit < baseTotalUserLimit) {
      return NextResponse.json(
        { error: `User limit cannot go below base plan limit (${baseTotalUserLimit} users)` },
        { status: 400 }
      );
    }

    if (newStorageLimit < baseStorageLimit) {
      return NextResponse.json(
        { error: `Storage cannot go below base plan limit (${baseStorageLimit} GB)` },
        { status: 400 }
      );
    }

    // Calculate add-on amounts above base plan
    const addonUsers = Math.max(0, newTotalUserLimit - baseTotalUserLimit);
    const addonStorage = Math.max(0, newStorageLimit - baseStorageLimit);

    // Calculate add-on cost for the amounts above base plan
    const addonCost = calculateAddonCost(
      planTier,
      addonUsers,
      0, // We're using total users, not splitting students/teachers for cost
      addonStorage
    );

    // Calculate new total monthly amount
    const basePlanPrice = basePlan.monthlyPrice;
    const newMonthlyAmount = basePlanPrice + addonCost;

    // Update subscription - apply add-ons immediately
    const { error: updateError } = await supabase
      .from('academy_subscriptions')
      .update({
        // Apply add-ons immediately to limits
        total_user_limit: newTotalUserLimit,
        storage_limit_gb: newStorageLimit,
        // Update monthly amount for next billing cycle
        monthly_amount: newMonthlyAmount,
        // Clear any pending add-ons since we're applying immediately
        pending_additional_students: null,
        pending_additional_teachers: null,
        pending_additional_storage_gb: null,
        pending_addons_effective_date: null,
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
      message: 'Add-ons applied successfully',
      data: {
        currentMonthlyAmount: subscription.monthly_amount,
        newMonthlyAmount,
        addonCost,
        effectiveDate: new Date().toISOString(), // Effective immediately
        newLimits: {
          totalUsers: newTotalUserLimit,
          storageGb: newStorageLimit,
        },
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
    // Get the authorization header
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
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

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get manager's academy
    const { data: manager, error: managerError } = await supabase
      .from('managers')
      .select('academy_id')
      .eq('user_id', user.id)
      .single();

    if (managerError || !manager) {
      return NextResponse.json(
        { error: 'Manager not found' },
        { status: 403 }
      );
    }

    const academyId = manager.academy_id;

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

/**
 * DELETE endpoint to cancel pending add-ons
 */
export async function DELETE(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
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

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get manager's academy
    const { data: manager, error: managerError} = await supabase
      .from('managers')
      .select('academy_id')
      .eq('user_id', user.id)
      .single();

    if (managerError || !manager) {
      return NextResponse.json(
        { error: 'Manager not found' },
        { status: 403 }
      );
    }

    const academyId = manager.academy_id;

    // Clear pending add-ons
    const { error: updateError } = await supabase
      .from('academy_subscriptions')
      .update({
        pending_additional_students: null,
        pending_additional_teachers: null,
        pending_additional_storage_gb: null,
        pending_addons_effective_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq('academy_id', academyId);

    if (updateError) {
      console.error('[AddOns API] Error canceling add-ons:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel add-ons' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pending add-ons canceled successfully',
    });
  } catch (error) {
    console.error('[AddOns API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
