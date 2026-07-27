import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { raiseAlert } from '@/lib/ops/alert'
import { JOB_REGISTRY } from '@/lib/ops/jobs'

/**
 * Watches the watchers.
 *
 * Every other cron reports its own success via a heartbeat. This one
 * alerts on SILENCE — the failure mode none of them can report, because
 * a job that 401s, is unregistered in vercel.json, or never boots
 * executes no code at all. That is exactly what happened here: the crons
 * guarded on CRON_SECRET_KEY while Vercel only sends its header when a
 * var named CRON_SECRET exists, so potentially all 18 were dead for
 * months with no signal whatsoever.
 *
 * Deliberately NOT self-monitoring: if this job itself stops, nothing
 * here notices. That gap is covered by it being the only job with a
 * tight cadence — and by the admin dashboard showing heartbeat ages, so
 * a stale watchdog is visible on screen. A true external dead-man switch
 * (Better Uptime / Healthchecks.io pinging this route) is the next step
 * if you want that hole closed too.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: beats, error } = await dbAdmin
    .from('job_heartbeats')
    .select('job, last_ok_at, ok, fail_streak')
  if (error) {
    console.error('[ops-watchdog] could not read heartbeats', error)
    return NextResponse.json({ error: 'heartbeat read failed' }, { status: 500 })
  }

  const byJob = new Map((beats ?? []).map(b => [b.job, b]))
  const now = Date.now()
  const stale: string[] = []
  const neverRan: string[] = []
  const healthy: string[] = []

  for (const spec of JOB_REGISTRY) {
    const beat = byJob.get(spec.job)
    const lastOk = beat?.last_ok_at ? new Date(beat.last_ok_at).getTime() : null

    if (lastOk == null) {
      // No successful run has EVER been recorded. Until the first run of
      // each job lands this is expected, so it is reported but only
      // alerted at warning — a brand-new deploy shouldn't page anyone.
      neverRan.push(spec.job)
      await raiseAlert({
        severity: 'warning',
        title: `${spec.label} has never reported a successful run`,
        message:
          `No heartbeat has ever been recorded for \`${spec.job}\`. If this persists past its ` +
          `first scheduled run (${spec.schedule}), the job is not executing — check that ` +
          `CRON_SECRET is set in Vercel and that the path is listed in vercel.json.`,
        dedupeKey: `cron-never-ran:${spec.job}`,
        context: { job: spec.job, schedule: spec.schedule },
      })
      continue
    }

    const silentMin = Math.floor((now - lastOk) / 60_000)
    if (silentMin > spec.maxSilenceMinutes) {
      stale.push(spec.job)
      await raiseAlert({
        severity: spec.severity,
        title: `${spec.label} has stopped running`,
        message:
          `Last successful run was ${formatAge(silentMin)} ago, which exceeds its ` +
          `${formatAge(spec.maxSilenceMinutes)} threshold (schedule: ${spec.schedule}). ` +
          `Work this job is responsible for is not being done.`,
        dedupeKey: `cron-stale:${spec.job}`,
        context: {
          job: spec.job,
          schedule: spec.schedule,
          silentMinutes: silentMin,
          thresholdMinutes: spec.maxSilenceMinutes,
          lastOkAt: beat?.last_ok_at ?? null,
        },
      })
    } else {
      healthy.push(spec.job)
      // Recovered: close any open staleness alert so the dashboard
      // reflects reality without a human clicking resolve.
      await resolveOpen(`cron-stale:${spec.job}`)
      await resolveOpen(`cron-never-ran:${spec.job}`)
    }
  }

  return NextResponse.json({
    ok: true,
    checked: JOB_REGISTRY.length,
    healthy: healthy.length,
    stale,
    neverRan,
  })
}

/** Auto-resolve an alert whose condition has cleared. */
async function resolveOpen(dedupeKey: string): Promise<void> {
  try {
    // Checked explicitly — the update resolves with { error } and never
    // throws, so the catch below is only for transport faults. A dropped
    // auto-resolve leaves a recovered job showing red on the dashboard
    // forever, which is how an alert channel gets tuned out.
    const { error } = await dbAdmin
      .from('alerts')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('resolved', false)
      .contains('context', { dedupeKey })
    if (error) {
      console.error('[ops-watchdog] auto-resolve rejected', dedupeKey, error)
    }
  } catch (e) {
    console.error('[ops-watchdog] auto-resolve failed', dedupeKey, e)
  }
}

function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / (24 * 60))}d`
}
