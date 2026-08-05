#!/usr/bin/env node
/**
 * check-svg-viewbox.mjs — find (and optionally fix) rendered SVGs whose
 * content falls outside their own viewBox.
 *
 * Found 2026-08-05 while an agent read the SVGs for the geometry stem
 * repair: one item's x-axis was drawn at y=305.1 with its tick labels at
 * y=318.1, inside a viewBox of "0 0 300 300". The axis and every label
 * were clipped away, so the student saw a y-axis and a floating line.
 *
 * The sweep found 12 of 86 live rawsvg items in that state, all
 * overflowing at the bottom. That is a silent failure: the figure still
 * renders, it is just missing the part that carries the numbers.
 *
 * `--fix` extends the viewBox height to cover the content plus padding.
 * Safe because these SVGs set `width` but no `height`, so the rendered
 * box scales with the viewBox rather than squashing. The old viewBox is
 * printed for every change so the edit is reversible by hand.
 *
 * usage: check-svg-viewbox.mjs [--fix]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env=Object.fromEntries(readFileSync(process.cwd()+'/.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const all=[]
for(let f=0;;f+=1000){
  const {data,error}=await db.from('study_item_bank').select('id,domain,item').neq('archived',true)
    .order('id',{ascending:true}).range(f,f+999)
  if(error) throw new Error(error.message)
  all.push(...data); if(data.length<1000) break
}
const svgs=all.filter(r=>r.item?.graphic?.type==='rawsvg'&&typeof r.item.graphic.svg==='string')
console.log('live rawsvg items:',svgs.length)
const bad=[]
for(const r of svgs){
  const s=r.item.graphic.svg
  const vb=s.match(/viewBox="([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)"/)
  if(!vb){ bad.push({id:r.id,why:'no viewBox'}); continue }
  const [,x0,y0,w,h]=vb.map(Number)
  /*
   * Only TEXT and AXIS geometry count. A polyline or path point outside
   * the box is normal — a parabola legitimately runs off the top of its
   * plot, and SAT figures clip curves at the plot boundary all the time.
   *
   * The first version of this check counted polyline points too. It
   * flagged item 038b0287, whose parabola starts at y=-16.6, and the
   * --fix pass then "corrected" a 300-tall viewBox to 284 — SHRINKING
   * it and cropping real content, because the overflow was at the top
   * and the fix only ever extends the bottom. Caught and reverted.
   *
   * A clipped <text> is information loss: the tick labels carry the
   * numbers. A clipped curve is a drawing convention.
   */
  const textY=[...s.matchAll(/<text\b[^>]*\by="([-\d.]+)"/g)].map(m=>+m[1])
  const textX=[...s.matchAll(/<text\b[^>]*\bx="([-\d.]+)"/g)].map(m=>+m[1])
  /*
   * TEXT ONLY. <line> was in here too and produced a second round of
   * false positives: it cannot distinguish an AXIS from the plotted
   * function, and a steep line legitimately exits the top of its plot
   * (item 1fff8d96 runs from y=341.5 to y=-51.5 by design).
   *
   * Clipping a <text> loses the numbers. Clipping a drawn line or curve
   * is how graphs have always worked. Three iterations of this checker
   * flagged drawings before it settled on labels; the two earlier rules
   * are described above so nobody re-adds them.
   */
  const allX=textX
  const allY=textY
  if(!allX.length&&!allY.length) continue
  const outX=allX.filter(v=>v<x0-1||v>x0+w+1).length
  const outY=allY.filter(v=>v<y0-1||v>y0+h+1).length
  const above=allY.filter(v=>v<y0-1).length
  if(outX+outY>0) bad.push({id:r.id,domain:r.domain,viewBox:`${x0} ${y0} ${w} ${h}`,outX,outY,above,
    maxY:Math.max(...allY).toFixed(1),maxX:Math.max(...allX).toFixed(1)})
}
console.log('items with geometry OUTSIDE the viewBox:',bad.length)
for(const b of bad) console.log(' ',b.id.slice(0,8),b.domain,'vb['+b.viewBox+']','outX:'+b.outX,'outY:'+b.outY,'maxX:'+b.maxX,'maxY:'+b.maxY)

if(process.argv.includes('--fix')){
  const PAD = 8
  let fixed = 0
  for(const b of bad){
    if(b.why) { console.log('SKIP',b.id.slice(0,8),b.why); continue }
    if(b.outX > 0){ console.log('SKIP',b.id.slice(0,8),'overflows horizontally — needs a human'); continue }
    if(b.above > 0){ console.log('SKIP',b.id.slice(0,8),'overflows ABOVE the box — extending the bottom would not help'); continue }
    const row = svgs.find(r=>r.id===b.id)
    const [x0,y0,w] = b.viewBox.split(' ').map(Number)
    // NEVER shrink. A "fix" that reduces the viewBox crops content.
    const need = Math.max(y0 + h, Math.ceil(Number(b.maxY) + PAD))
    if(need === y0 + h){ console.log('SKIP',b.id.slice(0,8),'already tall enough'); continue }
    const before = row.item.graphic.svg.match(/viewBox="[^"]*"/)[0]
    const after = `viewBox="${x0} ${y0} ${w} ${need}"`
    const svg = row.item.graphic.svg.replace(/viewBox="[^"]*"/, after)
    const { error } = await db.from('study_item_bank')
      .update({ item: { ...row.item, graphic: { ...row.item.graphic, svg } }, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if(error){ console.error('FAILED',b.id.slice(0,8),error.message); continue }
    console.log('fixed',b.id.slice(0,8),before,'->',after)
    fixed++
  }
  console.log('\nfixed',fixed,'of',bad.length)
}
