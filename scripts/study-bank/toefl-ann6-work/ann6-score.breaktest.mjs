// Break-test for ann6-score.mjs G2 on copies of announcement-v5's frozen solver files.
// node toefl-ann6-work/ann6-score.breaktest.mjs   (run from scripts/study-bank)
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
const SRC = '.', TAGS = ['ann5-f1', 'ann5-f2']
const fresh = () => { const d = mkdtempSync(join(tmpdir(), 'ann6bt-')); for (const t of TAGS) for (const s of ['key', 'solver-a', 'solver-b', 'solver-c']) copyFileSync(join(SRC, `${t}.${s}.json`), join(d, `${t}.${s}.json`)); return d }
const run = d => spawnSync('node', ['toefl-ann6-work/ann6-score.mjs', d, ...TAGS], { encoding: 'utf8' })
const drops = out => [...out.matchAll(/DROP (AN5-\d+)/g)].map(m => m[1]).sort()
const edit = (d, file, fn) => { const p = join(d, file); const j = JSON.parse(readFileSync(p, 'utf8')); fn(j); writeFileSync(p, JSON.stringify(j)) }
const key = JSON.parse(readFileSync('ann5-f1.key.json', 'utf8'))
// a clean item of a set that does not already drop: AN5-12 (no rejects on it in v5)
const [pid, pk] = Object.entries(key).find(([, v]) => v.localId === 'AN5-12-1')
const distractor = 'ABCD'.split('').find(L => L !== pk.letter)
let bad = 0
const check = (name, cond, out) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) { bad++; console.log(out) } }
{ const d = fresh(); const r = run(d); check('v5 files reproduce exactly AN5-09, AN5-10', JSON.stringify(drops(r.stdout)) === '["AN5-09","AN5-10"]' && r.status === 0, r.stdout); rmSync(d, { recursive: true }) }
{ const d = fresh(); for (const s of ['a', 'b']) edit(d, `ann5-f1.solver-${s}.json`, j => { j[pid].certain_reject = [distractor] }); const r = run(d); check(`planted distractor ${distractor} on AN5-12-1 rejected by 2 samples drops AN5-12`, drops(r.stdout).includes('AN5-12') && drops(r.stdout).length === 3, r.stdout); rmSync(d, { recursive: true }) }
{ const d = fresh(); edit(d, 'ann5-f1.solver-a.json', j => { j[pid].certain_reject = [distractor] }); const r = run(d); check('planted distractor rejected by 1 sample does not drop', !drops(r.stdout).includes('AN5-12'), r.stdout); rmSync(d, { recursive: true }) }
{ const d = fresh(); for (const s of ['a', 'b', 'c']) edit(d, `ann5-f1.solver-${s}.json`, j => { j[pid].certain_reject = [pk.letter] }); const r = run(d); check('planted KEY reject by all 3 samples does not drop (reported)', !drops(r.stdout).includes('AN5-12') && /AN5-12-1 \(key . by 3\)/.test(r.stdout), r.stdout); rmSync(d, { recursive: true }) }
{ const d = fresh(); edit(d, 'ann5-f2.solver-b.json', j => { delete j[Object.keys(j).find(k => k !== '_heuristics')] }); const r = run(d); check('solver file missing an item exits 2', r.status === 2 && !r.stdout, r.stdout + r.stderr); rmSync(d, { recursive: true }) }
{ const d = fresh(); writeFileSync(join(d, 'ann5-f1.solver-c.json'), '{not json'); const r = run(d); check('unreadable solver file exits 2', r.status === 2 && !r.stdout, r.stdout + r.stderr); rmSync(d, { recursive: true }) }
{ const d = fresh(); writeFileSync(join(d, 'ann5-f1.key.json'), '{}'); const r = run(d); check('empty key file exits 2', r.status === 2 && !r.stdout, r.stdout + r.stderr); rmSync(d, { recursive: true }) }
console.log(bad ? `${bad} break-test FAILURE(S)` : 'break-test clean (7/7)')
process.exit(bad ? 1 : 0)
