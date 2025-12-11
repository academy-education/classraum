/**
 * PortOne Platform API Sync Endpoint
 *
 * Triggers manual sync of settlements and payouts from PortOne Platform API
 * Can be called manually or by a cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAll } from '@/lib/portone-sync-service';
import { loggers } from '@/lib/error-monitoring';

/**
 * POST /api/portone/sync
 *
 * Trigger sync of settlements and payouts from PortOne Platform API
 *
 * Optional query parameters:
 * - since: ISO 8601 date string (default: 7 days ago)
 * - limit: number of items per request (default: 100)
 *
 * Example:
 * POST /api/portone/sync?since=2025-11-01T00:00:00Z&limit=50
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    loggers.settlement.info('Manual sync triggered via API');

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const sinceParam = searchParams.get('since');
    const limitParam = searchParams.get('limit');

    const options = {
      since: sinceParam ? new Date(sinceParam) : undefined,
      limit: limitParam ? parseInt(limitParam, 10) : undefined,
    };

    // Run sync
    const result = await syncAll(options);

    const duration = Date.now() - startTime;

    loggers.settlement.info('Manual sync completed', {
      duration,
      settlementsSynced: result.settlements.synced,
      settlementsErrors: result.settlements.errors,
      payoutsSynced: result.payouts.synced,
      payoutsErrors: result.payouts.errors,
    });

    return NextResponse.json({
      success: true,
      duration,
      settlements: result.settlements,
      payouts: result.payouts,
      message: 'Sync completed successfully',
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    loggers.settlement.error(
      'Manual sync failed',
      error as Error,
      { duration }
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/portone/sync
 *
 * Verify that the sync endpoint is accessible
 * Returns basic info about the endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/portone/sync',
    method: 'POST',
    description: 'Sync settlements and payouts from PortOne Platform API',
    parameters: {
      since: 'ISO 8601 date string (optional, default: 7 days ago)',
      limit: 'number of items per request (optional, default: 100)',
    },
    example: 'POST /api/portone/sync?since=2025-11-01T00:00:00Z&limit=50',
  });
}
