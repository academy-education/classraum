import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth } from '@/lib/admin-auth';
import { JOB_REGISTRY } from '@/lib/ops/jobs';

/**
 * Scheduled-job health for the admin System page.
 *
 * GET /api/admin/system/jobs → { success, data: { jobs, summary, checkedAt } }
 *
 * The ops watchdog (src/app/api/cron/ops-watchdog) already emails/alerts on
 * silence, but a dead job was otherwise invisible on screen. This joins every
 * entry in JOB_REGISTRY against its `job_heartbeats` row so the UI can show
 * the whole fleet — including jobs that have never reported at all, which is
 * precisely the case a heartbeats-only query would omit.
 *
 * Admin-only, read-only (no admin_activity_logs entry — this is a page load).
 */

export const dynamic = 'force-dynamic';

export type JobHealthStatus = 'healthy' | 'stale' | 'never' | 'failing';

export interface JobHealth {
  job: string;
  label: string;
  schedule: string;
  severity: 'warning' | 'critical';
  maxSilenceMinutes: number;
  status: JobHealthStatus;
  lastRunAt: string | null;
  lastOkAt: string | null;
  /** Whole minutes since last_ok_at; null when it has never succeeded. */
  minutesSinceOk: number | null;
  failStreak: number;
  durationMs: number | null;
}

interface HeartbeatRow {
  job: string;
  last_run_at: string | null;
  last_ok_at: string | null;
  ok: boolean | null;
  duration_ms: number | null;
  fail_streak: number | null;
}

// Problems first, so a dead job is the first thing on screen.
const STATUS_RANK: Record<JobHealthStatus, number> = {
  failing: 0,
  never: 1,
  stale: 2,
  healthy: 3,
};

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const { data, error } = await dbAdmin
    .from('job_heartbeats')
    .select('job, last_run_at, last_ok_at, ok, duration_ms, fail_streak');

  if (error) {
    console.error('[admin/system/jobs] list', error);
    return NextResponse.json({ error: 'list failed' }, { status: 500 });
  }

  const beats = new Map<string, HeartbeatRow>();
  for (const row of (data ?? []) as HeartbeatRow[]) beats.set(row.job, row);

  const now = Date.now();

  const jobs: JobHealth[] = JOB_REGISTRY.map(spec => {
    const beat = beats.get(spec.job);
    const lastOkAt = beat?.last_ok_at ?? null;
    const failStreak = beat?.fail_streak ?? 0;
    const minutesSinceOk = lastOkAt
      ? Math.max(0, Math.floor((now - new Date(lastOkAt).getTime()) / 60_000))
      : null;

    let status: JobHealthStatus;
    if (!beat) {
      status = 'never';
    } else if (failStreak > 0 || beat.ok === false) {
      // The most recent run errored — louder than "quiet", because the job is
      // running yet not doing its work.
      status = 'failing';
    } else if (minutesSinceOk === null) {
      status = 'never';
    } else if (minutesSinceOk > spec.maxSilenceMinutes) {
      status = 'stale';
    } else {
      status = 'healthy';
    }

    return {
      job: spec.job,
      label: spec.label,
      schedule: spec.schedule,
      severity: spec.severity,
      maxSilenceMinutes: spec.maxSilenceMinutes,
      status,
      lastRunAt: beat?.last_run_at ?? null,
      lastOkAt,
      minutesSinceOk,
      failStreak,
      durationMs: beat?.duration_ms ?? null,
    };
  }).sort((a, b) => {
    if (STATUS_RANK[a.status] !== STATUS_RANK[b.status]) {
      return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    }
    // Within a status band, money/delivery-critical jobs float up.
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  const summary = {
    total: jobs.length,
    healthy: jobs.filter(j => j.status === 'healthy').length,
    stale: jobs.filter(j => j.status === 'stale').length,
    never: jobs.filter(j => j.status === 'never').length,
    failing: jobs.filter(j => j.status === 'failing').length,
  };

  return NextResponse.json({
    success: true,
    data: { jobs, summary, checkedAt: new Date(now).toISOString() },
  });
}
