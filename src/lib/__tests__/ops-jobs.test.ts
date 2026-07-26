/** @jest-environment node */
/**
 * The registry must match vercel.json.
 *
 * 18 crons ran completely unmonitored, and the one thing that would have
 * caught it — noticing a job had gone quiet — was impossible because
 * nothing enumerated what "should be running" in the first place. This
 * test makes that enumeration load-bearing: add a cron without
 * registering it and CI fails, rather than shipping an unwatched job.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { JOB_REGISTRY, jobSpec } from '@/lib/ops/jobs'

interface VercelCron { path: string; schedule: string }

const vercel = JSON.parse(
  readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'),
) as { crons: VercelCron[] }

/** Heartbeat key = last path segment (e.g. /api/portone/sync -> 'sync'). */
const keyOf = (path: string) => path.split('/').filter(Boolean).pop()!

// The watchdog monitors the others; it cannot meaningfully monitor itself.
const SELF = 'ops-watchdog'

describe('JOB_REGISTRY vs vercel.json', () => {
  const scheduled = vercel.crons.map(c => keyOf(c.path)).filter(k => k !== SELF)

  it('every scheduled cron is registered for monitoring', () => {
    const missing = scheduled.filter(k => !jobSpec(k))
    expect(missing).toEqual([])
  })

  it('every registered job is actually scheduled', () => {
    const orphans = JOB_REGISTRY.map(j => j.job).filter(j => !scheduled.includes(j))
    expect(orphans).toEqual([])
  })

  it('registered schedules match the ones vercel.json actually uses', () => {
    const actual = new Map(vercel.crons.map(c => [keyOf(c.path), c.schedule]))
    const drift = JOB_REGISTRY
      .filter(j => actual.get(j.job) !== j.schedule)
      .map(j => ({ job: j.job, registry: j.schedule, vercel: actual.get(j.job) }))
    expect(drift).toEqual([])
  })

  it('the watchdog itself is scheduled', () => {
    expect(vercel.crons.some(c => keyOf(c.path) === SELF)).toBe(true)
  })

  it('job keys are unique', () => {
    const keys = JOB_REGISTRY.map(j => j.job)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('silence thresholds leave room for at least one missed run', () => {
    // A threshold tighter than the cadence would alert on every normal
    // gap. Only checks fixed-interval schedules, which are the ones with
    // a cadence simple enough to assert.
    for (const j of JOB_REGISTRY) {
      const everyNMin = /^\*\/(\d+) \* \* \* \*$/.exec(j.schedule)
      const hourly = /^\d+ \* \* \* \*$/.test(j.schedule)
      const everyNHour = /^\d+ \*\/(\d+) \* \* \*$/.exec(j.schedule)
      const cadence = everyNMin
        ? Number(everyNMin[1])
        : hourly
          ? 60
          : everyNHour
            ? Number(everyNHour[1]) * 60
            : null
      if (cadence != null) {
        expect(j.maxSilenceMinutes).toBeGreaterThanOrEqual(cadence * 2)
      }
    }
  })
})
