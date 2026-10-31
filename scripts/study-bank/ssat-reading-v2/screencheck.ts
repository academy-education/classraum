// draft-18 screencheck.ts, fixed to read the batch it is given (the draft-18 copy read draft-8's batch whatever it was run for)
import { readFileSync } from 'node:fs'
import { isDraftRow, draftStatus, ssatContentHash, validateItemEdit, isUniquelyLongest } from '../../../src/lib/study/ssat-draft'
const f = process.argv[2]; if (!f) { console.error('usage: screencheck.ts <batch.json>'); process.exit(2) }
const { rows } = JSON.parse(readFileSync(f, 'utf8'))
if (!rows?.length) { console.error('NOT MEASURED: no rows in ' + f); process.exit(2) }
let ok = 0, hashOk = 0, valid = 0, longest = 0
for (const r of rows) {
  if (isDraftRow(r) && draftStatus(r) === 'awaiting_edit') ok++
  if (ssatContentHash(r.item) === r.content_hash) hashOk++
  const v = validateItemEdit({ prompt: r.item.prompt, choices: r.item.choices, correct_answer: r.item.correct_answer, explanation: r.item.explanation } as any)
  if (!v.errors.length) valid++
  if (isUniquelyLongest(r.item.choices, r.item.correct_answer)) longest++
}
console.log(f, { rows: rows.length, isDraft: ok, hashMatches: hashOk, validates: valid, keyUniquelyLongest: longest })
process.exit(ok === rows.length && hashOk === rows.length && valid === rows.length ? 0 : 1)
