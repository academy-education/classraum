// Manager/teacher MOBILE regression suite — 29 checks over a 390x844 phone
// and a 1440x900 desktop, against a local dev server on :3000.
//
//   npm run dev            # in another terminal, Turbopack
//   node scripts/qc/mobile-manager.mjs
//
// It mints its own Supabase session (service role, magic link for
// manager@demo.classraum.com) because a hand-pasted token expires in an hour
// and a stale one reports "0 requests / 0 rows" as a PASS. Needs .env.local.
//
// Every check states what it asserts, and a check that cannot read its input
// reports ERROR rather than passing — twice in this suite's history a green
// line meant "the page never loaded", once because a `npm run build` had
// wiped .next under the running dev server.
//
// The desktop checks are not decoration: three of the mobile fixes could have
// been implemented by breaking the desktop table, and these are what say they
// were not.
import puppeteer from 'puppeteer'
import { readFileSync } from 'node:fs'
const env=Object.fromEntries(readFileSync(new URL('../../.env.local', import.meta.url),'utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const ref=env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1]
import { createClient } from '@supabase/supabase-js'
const admin=createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const { data: link, error: linkErr } = await admin.auth.admin.generateLink({type:'magiclink',email:'manager@demo.classraum.com'})
if (linkErr) { console.error('could not mint a session:', linkErr.message); process.exit(2) }
const anon=createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const { data: sess, error: otpErr } = await anon.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token})
if (otpErr) { console.error('could not verify the link:', otpErr.message); process.exit(2) }
const session=JSON.stringify(sess.session)
console.log('session minted, valid', Math.round((sess.session.expires_at - Date.now()/1000)/60), 'min')
const results=[]
const check=(name,pass,detail)=>{ results.push({name,pass,detail}); console.log((pass===true?'  PASS  ':pass==='ERR'?'  ERROR ':'  FAIL  ')+name+(detail?'   ['+detail+']':'')) }
const b=await puppeteer.launch({headless:'new', protocolTimeout:180000})
const mk=async(w,h,m)=>{const p=await b.newPage();await p.setViewport({width:w,height:h,isMobile:m,hasTouch:m});
  await p.evaluateOnNewDocument((k,v)=>{localStorage.setItem(k,v);localStorage.setItem('classraum:welcome_seen:813954a2-7405-478a-9c93-62bdc42c08ec','1')},`sb-${ref}-auth-token`,session);return p}
const go=async(p,path,ms=9000)=>{ await p.goto('http://localhost:3000'+path,{waitUntil:'load',timeout:180000}).catch(()=>{}); await new Promise(r=>setTimeout(r,ms)) }
const ph=await mk(390,844,true), dk=await mk(1440,900,false)

console.log('\n== navigation ==')
await go(ph,'/students')
const navClicked=await ph.evaluate(()=>{ const b=document.querySelector('nav button, [class*=fixed][class*=bottom] button'); if(!b) return false; b.click(); return true })
if(!navClicked) check('Home tab navigates to /dashboard','ERR','no bottom nav found')
else { // dev compiles /dashboard on the first visit; poll rather than assume a fixed wait
  for(let i=0;i<40 && !ph.url().endsWith('/dashboard');i++) await new Promise(r=>setTimeout(r,500))
  check('Home tab navigates to /dashboard', ph.url().endsWith('/dashboard'), ph.url().replace('http://localhost:3000','')) }
await go(ph,'/students')
const bellClicked=await ph.evaluate(()=>{ const bs=[...document.querySelectorAll('header button')]; if(bs.length<2) return false; bs[bs.length-1].click(); return true })
if(!bellClicked) check('bell opens /notifications on phone','ERR','too few header buttons')
else { await new Promise(r=>setTimeout(r,3500)); check('bell opens /notifications on phone', ph.url().endsWith('/notifications'), ph.url().replace('http://localhost:3000','')) }

console.log('\n== the two broken views ==')
await go(ph,'/students',11000)
let s=await ph.evaluate(()=>({tables:[...document.querySelectorAll('table')].filter(t=>t.getBoundingClientRect().height>0).length, rows:document.querySelectorAll('[data-compact-card]').length,
  // ONLY the view-mode toggle: exact titles. "클래스룸 보기" is a per-row action
  // and must not count, which is what an earlier looser selector got wrong.
  toggle:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().height>0&&/^(카드|테이블|목록|캘린더) 보기$/.test((e.title||'').trim())).length,
  statusTabs:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().height>0&&/^전체 \(|^활성 \(|^비활성 \(/.test(e.textContent.trim())).length,
  pag:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().height>0&&/이전|다음/.test(e.textContent)).length}))
check('/students renders no desktop table on a phone', s.tables===0, 'visible tables: '+s.tables)
check('/students renders compact rows', s.rows>0, 'rows: '+s.rows)
check('/students view toggle hidden on phone', s.toggle===0, 'toggle buttons: '+s.toggle)
check('/students status tabs still present (regression I caused)', s.statusTabs>=3, 'tabs: '+s.statusTabs)
check('/students pagination present on phone', s.pag>=2, 'buttons: '+s.pag)
if(s.pag>=2){ const first=await ph.evaluate(()=>document.querySelector('[data-compact-card] h3')?.textContent)
  await ph.evaluate(()=>{const n=[...document.querySelectorAll('button')].find(e=>/다음/.test(e.textContent)&&e.getBoundingClientRect().height>0);n&&n.click()})
  await new Promise(r=>setTimeout(r,4000)); const second=await ph.evaluate(()=>document.querySelector('[data-compact-card] h3')?.textContent)
  check('/students pagination actually pages', !!first&&!!second&&first!==second, `${first} -> ${second}`) }
await go(ph,'/sessions',11000)
const ses=await ph.evaluate(()=>({rows:document.querySelectorAll('[data-compact-card]').length, filterBtn:!!document.querySelector('button[aria-expanded]')}))
check('/sessions renders a non-empty list on a phone', ses.rows>0, 'rows: '+ses.rows)
check('/sessions FilterBar button present', ses.filterBtn===true)
if(ses.filterBtn){ const before=await ph.evaluate(()=>document.querySelectorAll('button[role=combobox]').length)
  await ph.evaluate(()=>document.querySelector('button[aria-expanded]').click()); await new Promise(r=>setTimeout(r,1200))
  const after=await ph.evaluate(()=>[...document.querySelectorAll('button[role=combobox]')].filter(e=>e.getBoundingClientRect().height>0).length)
  check('FilterBar expands to reveal filters', after>before, `${before} -> ${after}`) }

console.log('\n== payments ==')
let rest=0, tbl=0
ph.on('request',r=>{const u=r.url(); if(u.includes('supabase.co/rest')){rest++; if(u.includes('recurring_payment_template_students')) tbl++}})
await go(ph,'/payments',13000)
const pay=await ph.evaluate(()=>({tabs:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().height>0&&/^일회성$|^정기$|^비용관리$/.test(e.textContent.trim())).length,
  rows:document.querySelectorAll('[data-compact-card]').length, tables:[...document.querySelectorAll('table')].filter(t=>t.getBoundingClientRect().height>0).length}))
check('/payments tabs present (regression I caused)', pay.tabs>=3, 'tabs: '+pay.tabs)
check('/payments compact rows, no desktop table', pay.rows>0&&pay.tables===0, `rows ${pay.rows}, tables ${pay.tables}`)
check('/payments N+1 removed (<=12 calls to that table, was 38)', tbl<=12, `calls: ${tbl}, total REST: ${rest}`)

console.log('\n== other pages ==')
await go(ph,'/classrooms',11000)
const cls=await ph.evaluate(()=>({rows:document.querySelectorAll('[data-compact-card]').length, err:/문제가 발생|Something went wrong/.test(document.body.innerText),
  rawKey:/classrooms\.(unpause|pause|resume)/.test(document.body.innerHTML)}))
check('/classrooms loads without the error screen', cls.err===false)
check('/classrooms renders compact rows', cls.rows>0, 'rows: '+cls.rows)
check('/classrooms no raw translation key leaked', cls.rawKey===false)
await go(ph,'/families',11000)
check('/families renders compact rows', (await ph.evaluate(()=>document.querySelectorAll('[data-compact-card]').length))>0)
await go(ph,'/notifications',11000)
const nt=await ph.evaluate(()=>{const ps=[...document.querySelectorAll('p')].filter(e=>e.className.includes('line-clamp-3')); return {clamped:ps.length, tallest:Math.max(0,...ps.map(e=>Math.round(e.getBoundingClientRect().height)))}})
check('/notifications bodies are clamped', nt.clamped>0&&nt.tallest<90, `clamped ${nt.clamped}, tallest ${nt.tallest}px`)

console.log('\n== dashboard ==')
await go(ph,'/dashboard',13000)
const d=await ph.evaluate(()=>{const t=[...document.querySelectorAll('.react-grid-item')]; const tops=[...new Set(t.slice(0,4).map(e=>Math.round(e.getBoundingClientRect().top)))]
  const v=document.querySelector('[title^="₩"]'); return {widgets:t.length, distinctTops:tops.length, val:v?v.textContent:null, role:v?v.getAttribute('role'):null}})
check('dashboard stat widgets are two-up on a phone', d.widgets>=4&&d.distinctTops<=2, `first 4 widgets on ${d.distinctTops} row(s)`)
check('revenue shows a compact figure', !!d.val&&d.val.length<12, 'value: '+d.val)
if(d.role==='button'){ await ph.evaluate(()=>document.querySelector('[title^="₩"]').click()); await new Promise(r=>setTimeout(r,900))
  const ex=await ph.evaluate(()=>document.querySelector('[title^="₩"]').textContent)
  check('revenue taps to the exact amount', ex!==d.val&&ex.length>d.val.length, `${d.val} -> ${ex}`) }
else check('revenue taps to the exact amount','ERR','not tappable')

console.log('\n== form controls, all pages ==')
const ctl=async(p,label)=>{ const out=[]
  for(const path of ['/students','/classrooms','/sessions','/payments','/settings']){ await go(p,path,8000)
    out.push(await p.evaluate(()=>{const vis=e=>{const r=e.getBoundingClientRect();return r.width>20&&r.height>10}
      const f=[...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]),textarea,button[role=combobox]')].filter(vis)
      return f.map(e=>{const cs=getComputedStyle(e);return cs.fontSize+'/'+Math.round(e.getBoundingClientRect().height)})})) }
  const all=[...new Set(out.flat())]; return all }
const phCtl=await ctl(ph,'phone'), dkCtl=await ctl(dk,'desktop')
check('phone controls are 16px text at 44px tall', phCtl.every(x=>x.startsWith('16px/')&&Math.abs(Number(x.split('/')[1])-44)<=4), phCtl.join(' '))
check('desktop controls are 16px text at 40px tall', dkCtl.every(x=>x.startsWith('16px/')&&Math.abs(Number(x.split('/')[1])-40)<=4), dkCtl.join(' '))

console.log('\n== desktop unaffected ==')
await go(dk,'/students',10000)
const dS=await dk.evaluate(()=>({tables:[...document.querySelectorAll('table')].filter(t=>t.getBoundingClientRect().height>0).length,
  toggle:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().height>0&&/^(카드|테이블|목록|캘린더) 보기$/.test((e.title||'').trim())).length,
  compact:document.querySelectorAll('[data-compact-card]').length}))
check('desktop /students still shows its table', dS.tables>=1, 'tables: '+dS.tables)
check('desktop /students still shows the view toggle', dS.toggle>=2, 'toggle buttons: '+dS.toggle)
check('desktop /students shows no phone rows', dS.compact===0)

console.log('\n== layout integrity, twelve pages ==')
let ov=0, tiny=0, bad=[]
for(const path of ['/students','/classrooms','/sessions','/attendance','/assignments','/payments','/reports','/teachers','/families','/parents','/announcements','/exams-and-scores']){
  await go(ph,path,8000)
  const r=await ph.evaluate(()=>({o:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    t:[...document.querySelectorAll('button,[role=button],a[href]')].filter(e=>{const q=e.getBoundingClientRect();const cs=getComputedStyle(e);return q.width>4&&q.height>4&&cs.visibility!=='hidden'&&(q.height<32||q.width<32)}).length}))
  if(r.o>0){ov++;bad.push(path+' overflow '+r.o)} if(r.t>0){tiny+=r.t;bad.push(path+' tiny '+r.t)} }
check('no horizontal overflow on any of the twelve pages', ov===0, bad.filter(x=>x.includes('overflow')).join(', ')||'clean')
check('no tap target under 32px on any page', tiny===0, bad.filter(x=>x.includes('tiny')).join(', ')||'clean')

const pass=results.filter(r=>r.pass===true).length, fail=results.filter(r=>r.pass===false).length, err=results.filter(r=>r.pass==='ERR').length
console.log(`\n===== ${pass} passed, ${fail} failed, ${err} could not run (of ${results.length})`)
await b.close()
process.exitCode = (fail+err)>0?1:0
