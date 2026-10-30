#!/usr/bin/env node
/**
 * snapshot-live.mjs (MAP Science batch 4): READ-ONLY snapshot of every map-science% row (live AND staged, every cohort:
 * pilot, v1, v3) into scratchpad/map-science-b4/live-map-science.json, paged by pageExact (refuses unless the row total
 * equals the exact count). No write to the database.
 *
 *   node scripts/study-bank/map-v2-work/science-b4/snapshot-live.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { client, pageExact } from '../../autonomy-io.mjs'
const db = client()
const rows = await pageExact(db, 'study_item_bank', 'id, cohort, domain, subskill, difficulty, verified, archived, item, verify_meta', q => q.like('cohort', 'map-science%'), 'map-science rows')
mkdirSync('scratchpad/map-science-b4', { recursive: true })
writeFileSync('scratchpad/map-science-b4/live-map-science.json', JSON.stringify(rows))
const c = {}; for (const r of rows) { const k = `${r.cohort} ${r.verified ? 'live' : 'staged'}${r.archived ? ' archived' : ''}`; c[k] = (c[k] ?? 0) + 1 }
console.log(`snapshot: ${rows.length} rows`); for (const [k, v] of Object.entries(c).sort()) console.log(`  ${k}: ${v}`)
