/**
 * PortOne Platform API Sync Service
 *
 * Polls PortOne Platform API and syncs settlement/payout data to database
 */

import { supabaseServer } from './supabase-server';
import {
  portoneClient,
  PlatformPartnerSettlement,
  PlatformPayout,
} from './portone-platform-api';
import { loggers } from './error-monitoring';
import { alerts } from './alerting';

/**
 * Sync settlements from PortOne Platform API to database
 */
export async function syncSettlements(options?: {
  since?: Date;
  limit?: number;
}): Promise<{ synced: number; errors: number }> {
  const startTime = Date.now();
  let synced = 0;
  let errors = 0;

  try {
    loggers.settlement.info('Starting settlement sync from PortOne API');

    // Calculate date range (last 7 days if not specified)
    const since = options?.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const limit = options?.limit || 100;

    // Fetch settlements from PortOne API
    const response = await portoneClient.getSettlements({
      from: since.toISOString(),
      limit,
      // Only fetch recent status changes
      status: ['SETTLED', 'PAYOUT_SCHEDULED', 'PAID_OUT'],
    });

    loggers.settlement.info(`Fetched ${response.items.length} settlements from PortOne API`);

    // Process each settlement
    for (const settlement of response.items) {
      try {
        await storeSettlement(settlement);
        synced++;
      } catch (error) {
        errors++;
        loggers.settlement.error(
          `Failed to store settlement ${settlement.id}`,
          error as Error,
          { settlementId: settlement.id }
        );
      }
    }

    const duration = Date.now() - startTime;
    loggers.settlement.info(`Settlement sync completed in ${duration}ms`, {
      synced,
      errors,
      duration,
    });

    return { synced, errors };
  } catch (error) {
    loggers.settlement.error('Settlement sync failed', error as Error);
    throw error;
  }
}

/**
 * Sync payouts from PortOne Platform API to database
 */
export async function syncPayouts(options?: {
  since?: Date;
  limit?: number;
}): Promise<{ synced: number; errors: number }> {
  const startTime = Date.now();
  let synced = 0;
  let errors = 0;

  try {
    loggers.payout.info('Starting payout sync from PortOne API');

    // Calculate date range (last 7 days if not specified)
    const since = options?.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const limit = options?.limit || 100;

    // Fetch payouts from PortOne API
    const response = await portoneClient.getPayouts({
      from: since.toISOString(),
      limit,
      // Fetch all recent payouts
      status: ['SCHEDULED', 'PROCESSING', 'SUCCEEDED', 'FAILED'],
    });

    loggers.payout.info(`Fetched ${response.items.length} payouts from PortOne API`);

    // Process each payout
    for (const payout of response.items) {
      try {
        await storePayout(payout);
        synced++;

        // Send alert for failed payouts
        if (payout.status === 'FAILED') {
          await alerts.payoutFailed(
            payout.id,
            payout.partnerId,
            payout.amount,
            payout.currency,
            payout.failureReason
          );
        }
      } catch (error) {
        errors++;
        loggers.payout.error(
          `Failed to store payout ${payout.id}`,
          error as Error,
          { payoutId: payout.id }
        );
      }
    }

    const duration = Date.now() - startTime;
    loggers.payout.info(`Payout sync completed in ${duration}ms`, {
      synced,
      errors,
      duration,
    });

    return { synced, errors };
  } catch (error) {
    loggers.payout.error('Payout sync failed', error as Error);
    throw error;
  }
}

/**
 * Store settlement in database (reusing webhook_events table)
 */
async function storeSettlement(settlement: PlatformPartnerSettlement): Promise<void> {
  // Check if settlement already exists
  const { data: existing } = await supabaseServer
    .from('webhook_events')
    .select('id, status')
    .eq('type', 'settlement')
    .eq('entity_id', settlement.id)
    .single();

  // Skip if already exists with same status
  if (existing && existing.status === settlement.status) {
    return;
  }

  // Insert or update settlement event
  const { error } = await supabaseServer.from('webhook_events').upsert(
    {
      type: 'settlement',
      event_type: `Settlement.${settlement.status}`,
      entity_id: settlement.id,
      partner_id: settlement.partnerId,
      status: settlement.status,
      amount: settlement.settlementAmount,
      currency: settlement.settlementCurrency,
      timestamp: settlement.updatedAt,
      processed: true,
      raw_data: settlement,
      webhook_id: null, // This is from API poll, not webhook
      received_at: new Date().toISOString(),
    },
    {
      onConflict: 'entity_id,type',
    }
  );

  if (error) {
    throw error;
  }

  loggers.settlement.info('Settlement stored in database', {
    settlementId: settlement.id,
    status: settlement.status,
  });
}

/**
 * Store payout in database (reusing webhook_events table)
 */
async function storePayout(payout: PlatformPayout): Promise<void> {
  // Check if payout already exists
  const { data: existing } = await supabaseServer
    .from('webhook_events')
    .select('id, status')
    .eq('type', 'payout')
    .eq('entity_id', payout.id)
    .single();

  // Skip if already exists with same status
  if (existing && existing.status === payout.status) {
    return;
  }

  // Insert or update payout event
  const { error } = await supabaseServer.from('webhook_events').upsert(
    {
      type: 'payout',
      event_type: `Payout.${payout.status}`,
      entity_id: payout.id,
      partner_id: payout.partnerId,
      status: payout.status,
      amount: payout.amount,
      currency: payout.currency,
      timestamp: payout.updatedAt,
      processed: true,
      error_message: payout.failureReason || null,
      raw_data: payout,
      webhook_id: null, // This is from API poll, not webhook
      received_at: new Date().toISOString(),
    },
    {
      onConflict: 'entity_id,type',
    }
  );

  if (error) {
    throw error;
  }

  loggers.payout.info('Payout stored in database', {
    payoutId: payout.id,
    status: payout.status,
  });
}

/**
 * Sync both settlements and payouts
 */
export async function syncAll(options?: {
  since?: Date;
  limit?: number;
}): Promise<{
  settlements: { synced: number; errors: number };
  payouts: { synced: number; errors: number };
}> {
  const [settlements, payouts] = await Promise.all([
    syncSettlements(options),
    syncPayouts(options),
  ]);

  return { settlements, payouts };
}
