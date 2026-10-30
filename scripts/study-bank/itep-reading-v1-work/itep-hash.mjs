// itep-hash.mjs — the stage-map-language-v4.mjs content hash (passage + prompt + choices in stored order), the same
// definition as src/lib/study/itep-stage-check.ts itepContentHash; the stager refuses any row where they differ.
import { createHash } from 'node:crypto'
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
export const itepHash = it => createHash('md5').update([norm(it.passage), norm(it.prompt), (it.choices || []).map(norm).join('|')].join('~~')).digest('hex')
