#!/usr/bin/env node
/**
 * isee-verbal-s22-merge.mjs <author-letter>     e.g. a
 *
 * Authors write ONE small JSON file per item into
 * scripts/study-bank/isee-verbal-s22-work/<letter>/<ID>.json (so a run that dies
 * loses at most the item it was writing, and a relaunch resumes from the files on
 * disk). This merges them, sorted by id, into scripts/study-bank/isee-verbal-s22<letter>.batch.json,
 * which is the file every checker reads. Refuses (exit 2) on an unreadable item
 * file, a file whose id does not match its name, or an empty folder.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
const l = process.argv[2]
if (!/^[a-e]$/.test(l ?? '')) { console.error('usage: <a|b|c|d|e>'); process.exit(2) }
const dir = `scripts/study-bank/isee-verbal-s22-work/${l}`
if (!existsSync(dir)) { console.error(`REFUSING: ${dir} missing`); process.exit(2) }
const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort()
if (!files.length) { console.error(`REFUSING: ${dir} holds no item files`); process.exit(2) }
const items = []
for (const f of files) {
  let it
  try { it = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) } catch (e) { console.error(`REFUSING: ${dir}/${f} is not JSON (${e.message})`); process.exit(2) }
  if (!it || it.id !== f.replace(/\.json$/, '')) { console.error(`REFUSING: ${dir}/${f} id ${it?.id} does not match its file name`); process.exit(2) }
  items.push(it)
}
items.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
const out = `scripts/study-bank/isee-verbal-s22${l}.batch.json`
writeFileSync(out, JSON.stringify(items, null, 1) + '\n')
console.log(`${out}: ${items.length} items (${items.map(i => i.id).join(', ')})`)
