/**
 * Render a REAL bank conversation two ways so the turn-join can be judged
 * BY EAR, which is the only way this particular fix can be judged:
 *   before.mp3 — clips exactly as the player used to join them (350 ms gap,
 *                clip padding intact)
 *   after.mp3  — leading/trailing silence trimmed per measurement, 120 ms beat
 * Neither re-synthesises anything: both are built from the SAME cached mp3s
 * a student is served, so the only variable is the join. It also picks a
 * conversation whose every turn is already cached, so running this costs
 * nothing and generates no TTS.
 *
 * Usage: node scripts/study-bank/render-join-ab.mjs <output-dir>
 *
 * Two traps this script has already hit, left documented because both
 * produce confident wrong numbers rather than errors:
 *  - `ffmpeg -v error` SUPPRESSES silencedetect, which logs at info level
 *    on stderr. Parsing that yields "" and therefore "0 ms of padding".
 *  - libmp3lame on this build fails re-encoding these clips directly
 *    ("inadequate AVFrame plane padding"), so all intermediates are WAV
 *    and mp3 encoding happens once, at the end.
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'

const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#'))
  .map(l=>[l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const BASE = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/study-listening-audio`
const ROT = ['nova','onyx','shimmer','echo']
const OUT = process.argv[2]
// Print ffmpeg's own words on failure. A Buffer dump of stderr is not a
// diagnostic.
const run=(args)=>{const r=spawnSync('ffmpeg',args,{encoding:'utf8'})
  if(r.status!==0){console.error('ffmpeg failed:',args.join(' '),'\n',(r.stderr||'').split('\n').slice(-8).join('\n'));process.exit(1)}
  return r.stderr||''}

function parseTurns(c){const re=/(?:^|\s)([A-Z]):\s+([\s\S]*?)(?=(?:\s[A-Z]:\s+)|$)/g;const t=[];let m
  while((m=re.exec(c))!=null)t.push({speaker:m[1],text:m[2].trim().replace(/^"|"$/g,'')})
  return new Set(t.map(x=>x.speaker)).size>=2&&t.length>=2?t:[]}
function segs(tr){const c=tr.replace(/^\s*transcript:\s*/i,'').trim();const t=parseTurns(c)
  if(!t.length)return[{text:c,voice:'nova'}];const sv=new Map()
  return t.map(({speaker,text})=>{if(!sv.has(speaker))sv.set(speaker,ROT[sv.size%ROT.length]);return{text,voice:sv.get(speaker)}})}
const urlFor=(t,v)=>`${BASE}/${createHash('sha256').update(`${v}\ntts-1\n${t}`).digest('hex').slice(0,40)}.mp3`

// Find the longest fully-cached conversation, so nothing is synthesised
// (and no cost is incurred) just to make a demo.
const rows = []
for (let from=0;;from+=1000){
  const {data,error}=await db.from('study_item_bank').select('item')
    .eq('family','toefl').eq('domain','Conversation').eq('archived',false).range(from,from+999)
  if(error) throw new Error(error.message)
  rows.push(...(data??[])); if(!data||data.length<1000) break
}
const uniq=[...new Set(rows.map(r=>r.item?.passage).filter(Boolean))]
  .map(p=>({p,s:segs(p)})).filter(x=>x.s.length>=8).sort((a,b)=>b.s.length-a.s.length)

let chosen=null
for (const c of uniq.slice(0,25)) {
  const oks = await Promise.all(c.s.map(x=>fetch(urlFor(x.text,x.voice),{method:'HEAD'}).then(r=>r.ok).catch(()=>false)))
  if (oks.every(Boolean)) { chosen=c; break }
}
if(!chosen){ console.log('no fully-cached conversation found'); process.exit(1) }

mkdirSync(`${OUT}/clips`,{recursive:true})
const files=[]
for (const [i,x] of chosen.s.entries()){
  const f=`${OUT}/clips/${String(i).padStart(2,'0')}.mp3`
  writeFileSync(f, Buffer.from(await (await fetch(urlFor(x.text,x.voice))).arrayBuffer()))
  files.push(f)
}
const dur=f=>parseFloat(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',f]).toString())
// Measure edges with ffmpeg (info-level output — see the -v error trap).
function edges(f){
  // silencedetect logs to STDERR at info level. Reading stdout (or
  // running with -v error) yields an empty string and a confident 0 —
  // the exact trap that produced a false "no padding" result earlier.
  const r=spawnSync('ffmpeg',['-hide_banner','-nostats','-i',f,'-af','silencedetect=n=-50dB:d=0.05','-f','null','-'],{encoding:'utf8'})
  const out=r.stderr||''
  const st=[...out.matchAll(/silence_start: ([0-9.]+)/g)].map(m=>+m[1])
  const en=[...out.matchAll(/silence_end: ([0-9.]+)/g)].map(m=>+m[1])
  const d=dur(f)
  const lead = st[0]===0 && en[0]!=null ? Math.max(0,en[0]-0.02) : 0
  const lastS=st.at(-1), lastE=en.at(-1)
  const trail = lastS!=null && (lastE==null || lastS>=lastE || d-lastE<0.02) ? Math.max(0,(d-lastS)-0.02) : 0
  return {d, lead, trail}
}
const meta=files.map(edges)
const sil=s=>{const f=`${OUT}/sil-${s}.wav`
  run(['-v','error','-f','lavfi','-i','anullsrc=r=24000:cl=mono','-t',String(s),'-c:a','pcm_s16le','-ar','24000','-ac','1',f,'-y']);return f}

// BEFORE: whole clips + 350 ms
const g350=sil(0.350), listA=[]
files.forEach((f,i)=>{
  const w=`${OUT}/clips/w${String(i).padStart(2,'0')}.wav`
  run(['-v','error','-i',f,'-c:a','pcm_s16le','-ar','24000','-ac','1',w,'-y'])
  listA.push(w); if(i<files.length-1) listA.push(g350)})
writeFileSync(`${OUT}/a.txt`, listA.map(f=>`file '${f}'`).join('\n'))
run(['-v','error','-f','concat','-safe','0','-i',`${OUT}/a.txt`,'-c:a','libmp3lame','-q:a','4','-ar','24000','-ac','1',`${OUT}/before.mp3`,'-y'])

// AFTER: trimmed clips + 120 ms
const g120=sil(0.120), listB=[]
files.forEach((f,i)=>{
  const {d,lead,trail}=meta[i]
  const t=`${OUT}/clips/t${String(i).padStart(2,'0')}.wav`
  run(['-v','error','-i',f,'-ss',String(lead),'-to',String(Math.max(lead+0.15,d-trail)),
    '-c:a','pcm_s16le','-ar','24000','-ac','1',t,'-y'])
  listB.push(t); if(i<files.length-1) listB.push(g120)
})
writeFileSync(`${OUT}/b.txt`, listB.map(f=>`file '${f}'`).join('\n'))
run(['-v','error','-f','concat','-safe','0','-i',`${OUT}/b.txt`,'-c:a','libmp3lame','-q:a','4','-ar','24000','-ac','1',`${OUT}/after.mp3`,'-y'])

const joins=files.length-1
const padTotal=meta.reduce((a,m,i)=>a+(i>0?m.lead:0)+(i<files.length-1?m.trail:0),0)
console.log(JSON.stringify({
  turns: files.length, words: chosen.p.trim().split(/\s+/).length,
  beforeSec:+dur(`${OUT}/before.mp3`).toFixed(2), afterSec:+dur(`${OUT}/after.mp3`).toFixed(2),
  joins, injectedBefore:+(joins*0.35).toFixed(2), injectedAfter:+(joins*0.12).toFixed(2),
  clipPaddingAtJoins:+padTotal.toFixed(2),
  deadAirBefore:+(joins*0.35+padTotal).toFixed(2), deadAirAfter:+(joins*0.12).toFixed(2),
  perJoinBefore:+((joins*0.35+padTotal)/joins).toFixed(3), perJoinAfter:0.12,
}, null, 1))
