/**
 * isee-verbal-s21-preflight.ts <file.batch.json>... — the per-item shape part of the
 * isee-verbal-s21 pre-flight that needs the real verbalKind(): every item's
 * verbalKind() must equal its own kind. Exits 1 on a mismatch, 2 on unreadable input.
 * (Collisions, stem duplicates, article scan and key length are separate scripts.)
 */
import { readFileSync, existsSync } from 'node:fs'
import { verbalKind } from '../../src/lib/study/admission-tests'
const files = process.argv.slice(2)
if (!files.length) { console.error('usage: <file.batch.json>...'); process.exit(2) }
let bad = 0, n = 0
for (const f of files) {
  if (!existsSync(f)) { console.error(`REFUSING: ${f} missing`); process.exit(2) }
  const b = JSON.parse(readFileSync(f, 'utf8'))
  if (!Array.isArray(b) || !b.length) { console.error(`REFUSING: ${f} holds no items`); process.exit(2) }
  for (const it of b) { n++; const k = verbalKind(it, null); if (k !== it.kind) { bad++; console.log(`${it.id}: verbalKind ${k} != kind ${it.kind}`) } }
}
console.log(`verbalKind matches kind on ${n - bad}/${n}`)
process.exit(bad ? 1 : 0)
