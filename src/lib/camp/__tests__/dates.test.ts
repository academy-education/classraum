import { readFileSync } from 'fs'
import { join } from 'path'
import { kstDate } from '../dates'

describe('kstDate', () => {
  it('is already the next day in Korea while UTC is still on the previous date', () => {
    // 2026-10-22 23:30 UTC = 2026-10-23 08:30 KST: the first camp morning the UTC check blocked
    expect(kstDate(new Date('2026-10-22T23:30:00Z'))).toBe('2026-10-23')
    expect(new Date('2026-10-22T23:30:00Z').toISOString().slice(0, 10)).toBe('2026-10-22')
  })
  it('agrees with UTC once both are on the same date', () => {
    expect(kstDate(new Date('2026-10-23T03:00:00Z'))).toBe('2026-10-23')
  })
  it('accepts an ISO string', () => {
    expect(kstDate('2026-08-31T16:00:00Z')).toBe('2026-09-01')
  })
})

describe('camp date windows use the Korean date, not the UTC date', () => {
  const root = join(__dirname, '../../../..')
  const files = [
    'src/app/api/study/camp/start/route.ts',
    'src/app/api/camp/assignments/route.ts',
    'src/lib/camp/student.ts',
    'src/app/api/camp/overview/route.ts',
  ]
  it.each(files)('%s has no UTC "today" or UTC day bucket', (f) => {
    const src = readFileSync(join(root, f), 'utf8')
    expect(src).not.toMatch(/new Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)/)
    expect(src).not.toMatch(/completed_at\.slice\(0,\s*10\)/)
  })
})
