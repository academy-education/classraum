/**
 * verify-act-draw.ts — draw one ACT English, Math and Reading section from
 * the live bank exactly as /api/study/test/assemble does, and print what a
 * student would get. Run after any ACT insert/archive and before trusting
 * the shipped gate:  npx tsx scripts/study-bank/verify-act-draw.ts
 */
import { assembleActSection } from '@/lib/study/assemble'
import { ACT_BLUEPRINT } from '@/lib/study/act-test'

async function main() {
let short = 0
for (const key of ['english', 'math', 'reading', 'science'] as const) {
  const want = ACT_BLUEPRINT.find(b => b.key === key)!.questions
  const t = await assembleActSection({ sectionKey: key }, 'verify-' + Date.now())
  const q = t.questions as Array<{ choices: Array<string | { text: string }>; correct_answer: string }>
  const bySlot: Record<string, number> = {}
  for (const it of q) {
    const i = it.choices.findIndex(c => (typeof c === 'string' ? c : c.text) === it.correct_answer)
    bySlot['ABCD'[i] ?? '?'] = (bySlot['ABCD'[i] ?? '?'] ?? 0) + 1
  }
  const ok = q.length === want
  if (!ok) short++
  console.log(`${ok ? 'ok   ' : 'SHORT'} act/${key}: drew ${q.length} of ${want}, ${t.timeLimitMinutes} min, key slots ${JSON.stringify(bySlot)}`)
}
process.exit(short ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
