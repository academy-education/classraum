/**
 * itep-stage-check.ts — the PURE refusal rules of scripts/study-bank/itep-bank-helper.ts (stage), split out so
 * jest can pin them (src/lib/study/__tests__/itep-stage-check.test.ts). No DB, no file reads.
 *
 * Per row: family 'itep'; a section and domain ITEP_PART_QUOTAS names; verified === false; a cohort; a
 * verify_meta.method_id; four distinct choices including the key; Grammar Part 2 rows carry [A:]..[D:] segments
 * matching their choices in order and no other row carries labels; the content_hash stage-map-language-v4.mjs
 * would compute.
 *
 * Passage sets (added 2026-10-31 for Reading, ITEP-SLATE-READING-V1.prereg.md §6). The draw takes a part with
 * itemsPerGroup > 1 by WHOLE group and keeps a group's questions in (created_at, id) order, so for those parts:
 *   - every row has a passage_group_id, and the batch holds exactly itemsPerGroup rows of each group;
 *   - every row of a group has the same passage, and a group never spans two parts;
 *   - every row has created_at, strictly increasing in batch order inside the group (bulk inserts share now(),
 *     which would leave the in-passage order to random uuids).
 * And for a standalone part of a passage section (Reading/Listening Part 1): a non-empty passage and NO group
 * (a group id would let the one-per-group draw treat two texts as one unit, or a text as part of a set).
 *
 * Listening (added 2026-10-31 for iTEP Listening v1, ITEP-SLATE-LISTENING-V1.prereg.md §6). The audio is
 * synthesised from the passage by ListeningAudioPlayer, so every listening row must be audio the player can make:
 *   - the passage starts "Transcript:" (TestSession routes only such passages to the player);
 *   - Parts 1-2 (conversations): the player splits it into 2+ turns, and the speakers are exactly W and M (pinned
 *     to a female and a male voice, listening-voice.ts), because the questions say "the woman" / "the man";
 *   - Part 3 (lecture): a monologue, with NO "<capital>: " anywhere (the raw turn regex finds nothing), so the
 *     player reads it as one voice;
 *   - every TTS segment is non-empty and within the TTS route's 4,000-character cap (a lecture is one segment).
 */
import { createHash } from 'node:crypto'
import { ITEP_PART_QUOTAS } from './admission-tests'
import { hasLabelledSegments } from './labelled-segments'
import { parseTurns as rawTurns } from './conversation-gate'
import { listeningSegments, playerTurns, TTS_MAX_CHARS } from './listening-voice'

export type ItepStageRow = {
  family: string; section: string; domain: string; cohort: string | null; verified: unknown
  passage_group_id?: string | null; created_at?: string
  content_hash: string; item: { prompt: string; passage: string | null; choices: string[]; correct_answer: string }
  verify_meta?: { method_id?: string; draft?: { qid?: string } }
}

const norm = (s: string | null | undefined) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
/** Same definition as stage-map-language-v4.mjs: passage + prompt + choices in stored order. */
export const itepContentHash = (it: ItepStageRow['item']) => createHash('md5')
  .update([norm(it.passage), norm(it.prompt), (it.choices || []).map(norm).join('|')].join('~~')).digest('hex')

const ERROR_ID = 'Part 2: Error Identification'
const PASSAGE_SECTIONS = new Set(['reading', 'listening'])

export function checkItepStageRows(rows: ItepStageRow[]): { problems: string[]; perPart: Record<string, number> } {
  const problems: string[] = []
  const perPart: Record<string, number> = {}
  const groups = new Map<string, { rows: Array<{ r: ItepStageRow; id: string }>; want: number; domain: string }>()
  rows.forEach((r, i) => {
    const id = r.verify_meta?.draft?.qid ?? `row ${i}`
    const parts = ITEP_PART_QUOTAS[r.section as keyof typeof ITEP_PART_QUOTAS]
    const part = parts?.find(p => p.area === r.domain)
    if (r.family !== 'itep') problems.push(`${id}: family '${r.family}', want 'itep'`)
    if (!parts) problems.push(`${id}: section '${r.section}' is not an iTEP part table`)
    else if (!part) problems.push(`${id}: domain '${r.domain}' names no ${r.section} part`)
    if (r.verified !== false) problems.push(`${id}: verified=${JSON.stringify(r.verified)}; this path stages verified=false only`)
    if (!r.cohort) problems.push(`${id}: no cohort`)
    if (!r.verify_meta?.method_id) problems.push(`${id}: no verify_meta.method_id`)
    const it = r.item
    const ok = Array.isArray(it?.choices) && it.choices.length === 4
      && new Set(it.choices.map(c => String(c).trim())).size === 4 && it.choices.includes(it.correct_answer)
    if (!ok) problems.push(`${id}: needs four distinct choices including the key`)
    if (r.domain === ERROR_ID && !hasLabelledSegments(it)) problems.push(`${id}: Part 2 passage segments do not match the choices in order`)
    if (r.domain !== ERROR_ID && it?.passage && /\[[A-F]:/.test(it.passage)) problems.push(`${id}: labelled segments outside Part 2`)
    if (it && itepContentHash(it) !== r.content_hash) problems.push(`${id}: content_hash does not match passage+prompt+choices`)
    if (part && part.itemsPerGroup > 1) {
      const g = r.passage_group_id
      if (!g) problems.push(`${id}: ${r.domain} is drawn by whole passage, but the row has no passage_group_id`)
      else {
        if (!groups.has(g)) groups.set(g, { rows: [], want: part.itemsPerGroup, domain: r.domain })
        groups.get(g)!.rows.push({ r, id })
      }
      if (!r.created_at || Number.isNaN(Date.parse(r.created_at))) problems.push(`${id}: passage-set row needs created_at (in-passage order)`)
    } else if (part && PASSAGE_SECTIONS.has(r.section)) {
      if (!it?.passage || !it.passage.trim()) problems.push(`${id}: ${r.domain} needs its own text in passage`)
      if (r.passage_group_id) problems.push(`${id}: ${r.domain} is standalone; passage_group_id must be null`)
    }
    if (r.section === 'listening' && part && it) problems.push(...listeningProblems(id, r.domain, it.passage))
    perPart[`${r.section} / ${r.domain}`] = (perPart[`${r.section} / ${r.domain}`] ?? 0) + 1
  })
  for (const [g, { rows: rs, want, domain }] of groups) {
    if (rs.length !== want) problems.push(`group ${g}: ${rs.length} rows, ${domain} draws ${want} per passage`)
    if (rs.some(x => x.r.domain !== domain)) problems.push(`group ${g}: spans more than one part`)
    if (new Set(rs.map(x => x.r.item?.passage ?? '')).size > 1) problems.push(`group ${g}: rows carry different passages`)
    for (let k = 1; k < rs.length; k++) {
      const a = Date.parse(rs[k - 1].r.created_at ?? ''), b = Date.parse(rs[k].r.created_at ?? '')
      if (!(b > a)) problems.push(`group ${g}: created_at not strictly increasing at ${rs[k].id}`)
    }
  }
  return { problems, perPart }
}

const LECTURE = 'Part 3: Lecture'
/** The listening rules above, for one row. Exported for the test. */
export function listeningProblems(id: string, domain: string, passage: string | null): string[] {
  const out: string[] = []
  const p = passage ?? ''
  if (!/^\s*transcript:/i.test(p)) out.push(`${id}: listening passage must start "Transcript:" (the runner plays only those)`)
  const cleaned = p.replace(/^\s*transcript:\s*/i, '').trim()
  if (domain === LECTURE) {
    const raw = rawTurns(p)
    if (raw.length) out.push(`${id}: lecture contains "${raw[0].speaker}: ", which the player would read as a speaker change`)
  } else {
    const turns = playerTurns(cleaned)
    const who = [...new Set(turns.map(t => t.speaker))].sort().join('')
    if (turns.length < 2) out.push(`${id}: ${domain} must split into 2+ speaker turns`)
    else if (who !== 'MW') out.push(`${id}: speakers ${who}, want exactly W and M (the woman / the man voices)`)
  }
  for (const seg of listeningSegments(p)) {
    if (!seg.text.trim()) out.push(`${id}: empty TTS segment`)
    if (seg.text.length > TTS_MAX_CHARS) out.push(`${id}: a TTS segment is ${seg.text.length} chars, over the route's ${TTS_MAX_CHARS}`)
  }
  return out
}
