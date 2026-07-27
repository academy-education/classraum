/**
 * PortOne Platform API Sync Endpoint
 *
 * Triggers manual sync of settlements and payouts from PortOne Platform API
 * Can be called manually or by a cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAll } from '@/lib/portone-sync-service';
import { loggers } from '@/lib/error-monitoring';
import { verifyCronAuth } from '@/lib/cron-auth';
import { withHeartbeat } from '@/lib/ops/heartbeat';

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
async function runSync(request: NextRequest, trigger: 'cron' | 'manual') {
  const startTime = Date.now();

  try {
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    loggers.settlement.info('Sync triggered', { trigger });

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const sinceParam = searchParams.get('since');
    const limitParam = searchParams.get('limit');

    const options = {
      since: sinceParam ? new Date(sinceParam) : undefined,
      limit: limitParam ? parseInt(limitParam, 10) : undefined,
    };

    // Run sync. The heartbeat sits inside the auth guard — a 401'd
    // request never ran the job, so letting it report would mask a
    // dead cron. Job key is the cron path's last segment: `sync`.
    const result = await withHeartbeat('sync', () => syncAll(options));

    const duration = Date.now() - startTime;

    loggers.settlement.info('Sync completed', {
      trigger,
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
      'Sync failed',
      error as Error,
      { duration, trigger }
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
 * GET /api/portone/sync — the cron entry point.
 *
 * Vercel Cron issues GET and only GET. This route is scheduled every six
 * hours in vercel.json, but all of its work used to live on POST while
 * GET returned a block of documentation about the endpoint. So the
 * schedule fired on time, every time, and reconciled nothing: no
 * heartbeat was ever recorded for this job and not a single settlement
 * or payout row was ever written.
 *
 * It read as healthy from every angle — the route existed, it was
 * listed in vercel.json, it returned 200, and a check for "does this
 * cron export a GET handler" passed. Only the absence of output gave it
 * away.
 */
export async function GET(request: NextRequest) {
  return runSync(request, 'cron');
}

/**
 * POST /api/portone/sync — manual/backfill trigger.
 *
 * Kept because it accepts `since` and `limit`, which the cron never
 * needs but a backfill does.
 */
export async function POST(request: NextRequest) {
  return runSync(request, 'manual');
}
