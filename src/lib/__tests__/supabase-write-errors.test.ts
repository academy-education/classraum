/** @jest-environment node */
/**
 * supabase-js writes RESOLVE with `{ error }`. They never throw.
 *
 * So this swallows a constraint violation, an RLS denial, or a typo'd
 * column name, in total silence:
 *
 *     await supabase.from('t').insert({ ... })
 *
 * and so does wrapping it in try/catch, which is worse because it looks
 * deliberate. This class of bug is why an audit-log insert never once
 * succeeded (it wrote a column that does not exist), why four
 * notification kinds were dropped for months (CHECK constraint), and why
 * paid credit packs could vanish (an RPC that UPDATEs zero rows and
 * returns success).
 *
 * This test is deliberately narrow. It flags ONLY the unambiguous case:
 * a supabase write used as an expression statement, with the result
 * entirely discarded — no assignment, no destructure, no `.then`. In
 * that shape the error is not merely unhandled, it is unobservable.
 *
 * Narrow is the point. A broader heuristic — "did you check `error`
 * somewhere nearby" — produced roughly twenty false positives when this
 * sweep was done by hand, and a CI gate that cries wolf trains people to
 * silence it.
 *
 * Discarding the result is allowed, but it must be a decision someone
 * wrote down. Say so in a comment within a few lines above the call
 * ("error intentionally ignored" / "fire-and-forget") and explain what
 * is lost when it fails.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const MARKER = /intentionally ignor|deliberately (un)?check|fire-and-forget|best-effort/i

interface Hit { file: string; line: number; code: string }

function findDiscardedWrites(): Hit[] {
  const hits: Hit[] = []

  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.next') continue
      const p = join(dir, e.name)
      if (e.isDirectory()) { walk(p); continue }
      if (!/\.(ts|tsx)$/.test(e.name)) continue
      if (/__tests__|\.test\./.test(p)) continue

      const lines = readFileSync(p, 'utf8').split('\n')
      for (let i = 0; i < lines.length; i++) {
        // A statement beginning with a bare `await` discards its result.
        // `const x = await …`, `return await …` and `void (await …)` all
        // keep it, and are therefore not this bug.
        if (!/^\s*await\s/.test(lines[i]!)) continue

        // Accumulate until the call's parens balance.
        let stmt = ''
        let j = i
        for (; j < lines.length && j < i + 25; j++) {
          stmt += lines[j] + '\n'
          const open = (stmt.match(/\(/g) ?? []).length
          const close = (stmt.match(/\)/g) ?? []).length
          if (open > 0 && open === close && /\)\s*;?\s*$/.test(lines[j]!)) break
        }

        if (!/\.(insert|update|upsert|delete)\s*\(/.test(stmt)) continue
        if (!/\.from\s*\(/.test(stmt)) continue   // a supabase table write
        if (/\.then\s*\(/.test(stmt)) continue    // error handled in a callback

        // Documented as deliberate within the preceding few lines?
        const preamble = lines.slice(Math.max(0, i - 6), i).join('\n')
        if (MARKER.test(preamble)) { i = j; continue }

        hits.push({ file: p.replace(ROOT + '/', ''), line: i + 1, code: lines[i]!.trim() })
        i = j
      }
    }
  }

  walk(join(ROOT, 'src'))
  return hits
}

describe('supabase writes', () => {
  it('never discards the result without saying why', () => {
    const undocumented = findDiscardedWrites().map(h => `${h.file}:${h.line}  ${h.code}`)
    expect(undocumented).toEqual([])
  })
})
