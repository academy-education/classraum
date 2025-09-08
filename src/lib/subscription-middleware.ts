import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  checkSubscriptionLimits,
  canAddStudents, 
  canAddTeachers,
  isSubscriptionActive,
  hasFeatureAccess 
} from '@/lib/subscription';

// Create admin client for middleware
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
 * Middleware to check subscription status and limits
 */
export async function enforceSubscriptionLimits(
  request: NextRequest,
  academyId: string,
  checkType: 'student_add' | 'teacher_add' | 'feature' | 'general',
  options?: {
    feature?: string;
    count?: number;
  }
): Promise<NextResponse | null> {
  try {
    // Check if subscription is active
    const isActive = await isSubscriptionActive(academyId);
    
    if (!isActive) {
      return NextResponse.json(
        { 
          success: false, 
          message: '구독이 만료되었습니다. 구독을 갱신해주세요.',
          code: 'SUBSCRIPTION_INACTIVE'
        },
        { status: 402 } // Payment Required
      );
    }

    // Check specific limits based on type
    switch (checkType) {
      case 'student_add':
        const studentCheck = await canAddStudents(academyId, options?.count || 1);
        if (!studentCheck.allowed) {
          return NextResponse.json(
            {
              success: false,
              message: studentCheck.message,
              code: 'STUDENT_LIMIT_EXCEEDED',
              data: {
                current: studentCheck.currentCount,
                limit: studentCheck.limit
              }
            },
            { status: 402 }
          );
        }
        break;

      case 'teacher_add':
        const teacherCheck = await canAddTeachers(academyId, options?.count || 1);
        if (!teacherCheck.allowed) {
          return NextResponse.json(
            {
              success: false,
              message: teacherCheck.message,
              code: 'TEACHER_LIMIT_EXCEEDED',
              data: {
                current: teacherCheck.currentCount,
                limit: teacherCheck.limit
              }
            },
            { status: 402 }
          );
        }
        break;

      case 'feature':
        if (!options?.feature) {
          throw new Error('Feature name is required for feature check');
        }
        
        const hasAccess = await hasFeatureAccess(academyId, options.feature as any);
        if (!hasAccess) {
          return NextResponse.json(
            {
              success: false,
              message: '이 기능은 현재 구독 플랜에서 사용할 수 없습니다.',
              code: 'FEATURE_NOT_AVAILABLE',
              data: {
                feature: options.feature
              }
            },
            { status: 402 }
          );
        }
        break;

      case 'general':
        const limitsCheck = await checkSubscriptionLimits(academyId);
        if (!limitsCheck.isValid) {
          return NextResponse.json(
            {
              success: false,
              message: '구독 한도를 초과했습니다: ' + limitsCheck.exceededLimits.join(', '),
              code: 'SUBSCRIPTION_LIMITS_EXCEEDED',
              data: {
                exceededLimits: limitsCheck.exceededLimits,
                usage: limitsCheck.usage,
                limits: limitsCheck.limits
              }
            },
            { status: 402 }
          );
        }
        break;
    }

    return null; // No blocking needed
  } catch (error) {
    console.error('Subscription middleware error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '구독 상태를 확인할 수 없습니다.',
        code: 'SUBSCRIPTION_CHECK_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Extract academy ID from request (assuming it's in headers or can be derived from user)
 */
export async function getAcademyIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // First check if academy_id is provided in headers
    const academyIdHeader = request.headers.get('x-academy-id');
    if (academyIdHeader) {
      return academyIdHeader;
    }

    // Try to extract from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Verify the token and get user info
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return null;
    }

    // Get user's academy ID from database
    const { data: userInfo, error: userError } = await supabaseAdmin
      .from('users')
      .select('academy_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userInfo) {
      return null;
    }

    // If no academy_id in users table, check managers table
    if (!userInfo.academy_id && userInfo.role === 'manager') {
      const { data: managerInfo } = await supabaseAdmin
        .from('managers')
        .select('academy_id')
        .eq('user_id', user.id)
        .single();
      
      return managerInfo?.academy_id || null;
    }

    return userInfo.academy_id;
  } catch (error) {
    console.error('Error getting academy ID from request:', error);
    return null;
  }
}

/**
 * Higher-order function to wrap API routes with subscription checks
 */
export function withSubscriptionCheck(
  handler: (req: NextRequest, academyId: string) => Promise<NextResponse>,
  checkType: 'student_add' | 'teacher_add' | 'feature' | 'general' = 'general',
  options?: {
    feature?: string;
    count?: number;
  }
) {
  return async (req: NextRequest) => {
    try {
      const academyId = await getAcademyIdFromRequest(req);
      
      if (!academyId) {
        return NextResponse.json(
          { 
            success: false, 
            message: '학원 정보를 찾을 수 없습니다.',
            code: 'ACADEMY_NOT_FOUND'
          },
          { status: 400 }
        );
      }

      // Check subscription limits
      const subscriptionBlock = await enforceSubscriptionLimits(req, academyId, checkType, options);
      if (subscriptionBlock) {
        return subscriptionBlock;
      }

      // Call the original handler
      return await handler(req, academyId);
    } catch (error) {
      console.error('Subscription wrapper error:', error);
      return NextResponse.json(
        {
          success: false,
          message: '서버 오류가 발생했습니다.',
          code: 'INTERNAL_ERROR'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Get subscription upgrade URL for the frontend
 */
export function getUpgradeUrl(academyId: string): string {
  return `/dashboard/settings/subscription?upgrade=true&academy=${academyId}`;
}

/**
 * Create response with upgrade suggestion
 */
export function createUpgradeResponse(
  message: string,
  academyId: string,
  data?: any
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message,
      code: 'UPGRADE_REQUIRED',
      upgradeUrl: getUpgradeUrl(academyId),
      data
    },
    { status: 402 }
  );
}

/**
 * Middleware specifically for student creation endpoints
 */
export function withStudentLimitCheck(count: number = 1) {
  return withSubscriptionCheck(
    async (req: NextRequest, academyId: string) => {
      // This will be replaced by the actual handler
      return NextResponse.json({ success: true });
    },
    'student_add',
    { count }
  );
}

/**
 * Middleware specifically for teacher creation endpoints
 */
export function withTeacherLimitCheck(count: number = 1) {
  return withSubscriptionCheck(
    async (req: NextRequest, academyId: string) => {
      // This will be replaced by the actual handler
      return NextResponse.json({ success: true });
    },
    'teacher_add',
    { count }
  );
}

/**
 * Middleware specifically for feature access checks
 */
export function withFeatureAccess(feature: string) {
  return withSubscriptionCheck(
    async (req: NextRequest, academyId: string) => {
      // This will be replaced by the actual handler
      return NextResponse.json({ success: true });
    },
    'feature',
    { feature }
  );
}