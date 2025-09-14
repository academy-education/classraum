import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAcademyIdFromRequest } from '@/lib/subscription-middleware';

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseAdmin
      .from('subscription_invoices')
      .select('*')
      .eq('academy_id', academyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add status filter if provided
    if (status && ['pending', 'paid', 'failed', 'refunded'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json(
        {
          success: false,
          message: '청구서 목록을 가져오는 중 오류가 발생했습니다.',
        },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('subscription_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('academy_id', academyId);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count } = await countQuery;
    
    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      data: {
        invoices: invoices || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Invoices API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '청구서 목록을 가져오는 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}