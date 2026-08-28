import { JSDOM } from 'jsdom'
import { readFileSync } from 'node:fs'
// The check must be able to FAIL: below, one key is corrupted so it matches no
// choice, and the page must then mark zero keys on that item. A run that only
// prints the happy numbers proves nothing.
const html = readFileSync(process.argv[2] || 'scripts/study-bank/qc-review.html','utf8')
const dom = new JSDOM('<!doctype html><html><head></head><body>'+html+'</body></html>',
  { runScripts:'dangerously', url:'https://example.com', pretendToBeVisual:true })
const { document: d, window: w } = { document: dom.window.document, window: dom.window }
const q = s => d.querySelectorAll(s).length
const bank = JSON.parse(d.getElementById('bank').textContent)
console.log('bank items          :', bank.items.length)
console.log('rendered articles   :', q('article.item'))
console.log('groups              :', q('section.grp'))
console.log('passage blocks      :', q('.psg'))
console.log('items w/ key marked :', q('ol.ch li.key'))
console.log('tally in-view       :', d.getElementById('t-all').textContent)

// every rendered item must show exactly one key
let bad = 0
for (const a of d.querySelectorAll('article.item')) if (a.querySelectorAll('ol.ch li.key').length !== 1) bad++
console.log('items without exactly one key marked:', bad)

// BREAK THE CHECK: corrupt one key so it matches no choice, confirm the page shows zero keys for it
const it = bank.items.find(i=>i.sec==='math')
const broken = JSON.parse(JSON.stringify(bank))
broken.items.find(i=>i.id===it.id).k = '@@nonexistent@@'
const dom2 = new JSDOM('<!doctype html><html><head></head><body>'+
  html.replace(d.getElementById('bank').textContent, JSON.stringify(broken).replace(/</g,'\\u003c'))+
  '</body></html>', { runScripts:'dangerously', url:'https://example.com', pretendToBeVisual:true })
const a2 = dom2.window.document.getElementById('it-'+it.id)
console.log('break-test (key set to a non-choice) -> keys marked on that item:',
  a2 ? a2.querySelectorAll('ol.ch li.key').length : 'ITEM MISSING', '(must be 0)')

// filter exercise
const click = (id,val) => { const b=[...d.getElementById(id).querySelectorAll('button')].find(x=>x.dataset.v===val); b.dispatchEvent(new w.MouseEvent('click',{bubbles:true})) }
click('f-sec','reading'); console.log('filter reading      :', q('article.item'), 'articles,', q('.psg'), 'passages')
click('f-fam','ssat');    console.log('filter ssat+reading :', q('article.item'))
click('f-sec','math'); click('f-fam','all'); console.log('filter math (both)  :', q('article.item'))

// verdict round-trip
click('f-sec','all')
const first = d.querySelector('article.item')
const id = first.id.slice(3)
first.querySelector('button[data-set="rej"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}))
const store = JSON.parse(w.localStorage.getItem('classraum-qc-ssat-isee-v1'))
console.log('verdict persisted   :', JSON.stringify(store[id]), '| stripe:', d.getElementById('it-'+id).dataset.v)
console.log('rejected tally      :', d.getElementById('t-rej').textContent)
const note = d.querySelector('input[data-note]')
note.value = 'two defensible answers'; note.dispatchEvent(new w.Event('input',{bubbles:true}))
console.log('note persisted      :', JSON.parse(w.localStorage.getItem('classraum-qc-ssat-isee-v1'))[note.dataset.note].n)
console.log('theme tokens defined outside media blocks:',
  /:root\{[^}]*--paper:/.test(html) && /:root\{[^}]*--ink:/.test(html))
