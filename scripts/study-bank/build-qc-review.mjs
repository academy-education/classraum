/**
 * build-qc-review.mjs — generates the human QC review page for the SSAT and
 * ISEE banks (published as an Artifact for cofounder review).
 *
 *   node scripts/study-bank/build-qc-review.mjs [out.html]
 *
 * Pulls every live (verified, unarchived) ssat/isee row and renders one page
 * with passage, question, options with the key marked, the explanation, and a
 * Keep/Flag/Reject control per item. Verdicts persist in the reviewer's
 * browser and export as JSON.
 *
 * verify-qc-review.mjs is the check, and it BREAKS the check: it corrupts one
 * key to match no choice and asserts the page then marks zero keys on that
 * item. Run it after any edit here.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(readFileSync(join(HERE,'../../.env.local'),'utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})
const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from('study_item_bank')
    .select('id,family,section,domain,subskill,difficulty,cohort,item,passage_group_id')
    .in('family',['ssat','isee']).eq('archived',false).eq('verified',true)
    .order('family').order('section').order('id').range(from, from + 999)
  if (error) throw error
  rows.push(...data)
  if (data.length < 1000) break   // PostgREST caps pages; never trust one read
}

// Margins are shown ONLY where the written record states them unambiguously.
// Every shipped cohort passed its gate by construction (nothing ships otherwise);
// where the specific number was not recorded per-cohort we say so rather than
// reconstruct one from prose.
const MARGIN = {
  'ssat-reading-worlds-s2': '−15.7',
  'isee-reading-worlds-s2': '−5.2',
  'isee-reading-worlds-v1': '−14.5',
  'ssat-verbal-s3': '−2.8',
  'isee-verbal-s3': '−6.7',
  'ssat-math-s3': '−3.3',
  'isee-math-s3': '−20.8',
}

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

const items = rows.map(r => ({
  id: r.id,
  fam: r.family, sec: r.section,
  sk: r.subskill || r.domain,
  df: r.difficulty,
  co: r.cohort,
  pg: r.passage_group_id,
  ps: r.item.passage || null,
  q: r.item.prompt,
  ch: r.item.choices || [],
  k: r.item.correct_answer,
  ex: r.item.explanation || '',
  dr: r.item.distractor_rationales || [],
}))

const DATA = JSON.stringify({ items, margin: MARGIN })

const html = `<title>SSAT &amp; ISEE Item Review</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{
  --paper:#F7F8FA; --card:#FFFFFF; --ink:#1A1D24; --ink-2:#4A5160; --ink-3:#767E8E;
  --rule:#DFE3EA; --rule-2:#EDF0F4; --accent:#2B4570; --accent-soft:#E8EDF6;
  --good:#1F7A4D; --good-soft:#E4F1EA; --warn:#9A6B12; --warn-soft:#F7EFDC;
  --bad:#A8322D; --bad-soft:#F7E5E4; --shadow:0 1px 2px rgba(26,29,36,.06),0 4px 14px rgba(26,29,36,.05);
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --paper:#14161B; --card:#1C1F26; --ink:#E8EAEF; --ink-2:#A8AEBC; --ink-3:#7A8192;
  --rule:#2C313B; --rule-2:#23272F; --accent:#8FAAD8; --accent-soft:#222B3B;
  --good:#6FCB9B; --good-soft:#18291F; --warn:#DCB463; --warn-soft:#2A2313;
  --bad:#E58E88; --bad-soft:#2B1917; --shadow:0 1px 2px rgba(0,0,0,.4),0 4px 14px rgba(0,0,0,.3);
}}
:root[data-theme="dark"]{
  --paper:#14161B; --card:#1C1F26; --ink:#E8EAEF; --ink-2:#A8AEBC; --ink-3:#7A8192;
  --rule:#2C313B; --rule-2:#23272F; --accent:#8FAAD8; --accent-soft:#222B3B;
  --good:#6FCB9B; --good-soft:#18291F; --warn:#DCB463; --warn-soft:#2A2313;
  --bad:#E58E88; --bad-soft:#2B1917; --shadow:0 1px 2px rgba(0,0,0,.4),0 4px 14px rgba(0,0,0,.3);
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);
  font-family:"IBM Plex Sans",system-ui,-apple-system,Segoe UI,sans-serif;
  font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased}
h1,h2,h3{text-wrap:balance;margin:0}
.mono{font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}

/* ── masthead ─────────────────────────────────────────────── */
.mast{border-bottom:1px solid var(--rule);background:var(--card)}
.mast .wrap{display:flex;flex-wrap:wrap;gap:20px;align-items:baseline;
  justify-content:space-between;padding-top:26px;padding-bottom:22px}
.mast h1{font-size:25px;font-weight:600;letter-spacing:-.015em}
.mast p{margin:6px 0 0;color:var(--ink-2);max-width:62ch;font-size:14px}
.tally{display:flex;gap:22px;font-size:13px;color:var(--ink-2)}
.tally b{display:block;font-size:21px;font-weight:600;color:var(--ink);
  font-variant-numeric:tabular-nums;line-height:1.2}

/* ── guide ────────────────────────────────────────────────── */
.guide{background:var(--accent-soft);border-bottom:1px solid var(--rule)}
.guide .wrap{padding:22px 24px}
.guide summary{cursor:pointer;font-weight:600;font-size:14px;color:var(--accent)}
.guide summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:3px}
.guide .body{display:grid;grid-template-columns:repeat(auto-fit,minmax(268px,1fr));
  gap:20px;margin-top:16px}
.guide h3{font-size:11px;letter-spacing:.09em;text-transform:uppercase;
  color:var(--accent);margin-bottom:7px}
.guide ul{margin:0;padding-left:17px;color:var(--ink-2);font-size:13.5px}
.guide li{margin-bottom:5px}

/* ── controls ─────────────────────────────────────────────── */
.bar{position:sticky;top:0;z-index:20;background:var(--card);
  border-bottom:1px solid var(--rule);box-shadow:var(--shadow)}
.bar .wrap{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:11px 24px}
.seg{display:flex;border:1px solid var(--rule);border-radius:7px;overflow:hidden}
.seg button{border:0;background:var(--card);color:var(--ink-2);cursor:pointer;
  padding:7px 13px;font:inherit;font-size:13px;border-right:1px solid var(--rule)}
.seg button:last-child{border-right:0}
.seg button[aria-pressed="true"]{background:var(--accent);color:#fff}
.seg button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.bar input[type="search"]{flex:1;min-width:150px;padding:7px 11px;font:inherit;font-size:13px;
  border:1px solid var(--rule);border-radius:7px;background:var(--paper);color:var(--ink)}
.bar input:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.ghost{border:1px solid var(--rule);background:var(--card);color:var(--ink-2);
  border-radius:7px;padding:7px 13px;font:inherit;font-size:13px;cursor:pointer}
.ghost:hover{border-color:var(--accent);color:var(--accent)}
.ghost:focus-visible{outline:2px solid var(--accent);outline-offset:1px}

/* ── item ─────────────────────────────────────────────────── */
main{padding:26px 0 90px}
.grp{margin-bottom:34px}
.grp-h{display:flex;align-items:baseline;gap:11px;margin-bottom:11px;
  padding-bottom:8px;border-bottom:2px solid var(--ink)}
.grp-h h2{font-size:16px;font-weight:600;letter-spacing:-.01em}
.grp-h .n{color:var(--ink-3);font-size:12.5px}
.psg{background:var(--card);border:1px solid var(--rule);border-radius:10px;
  padding:20px 24px;margin-bottom:13px;box-shadow:var(--shadow)}
.psg .lbl{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;
  color:var(--ink-3);margin-bottom:9px}
.psg p{font-family:Newsreader,Georgia,serif;font-size:17px;line-height:1.62;
  margin:0 0 .85em;max-width:66ch;color:var(--ink)}
.psg p:last-child{margin-bottom:0}

.item{background:var(--card);border:1px solid var(--rule);border-radius:10px;
  padding:18px 22px;margin-bottom:11px;box-shadow:var(--shadow);
  border-left:3px solid var(--rule)}
.item[data-v="ok"]{border-left-color:var(--good)}
.item[data-v="flag"]{border-left-color:var(--warn)}
.item[data-v="rej"]{border-left-color:var(--bad)}
.meta{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-bottom:11px}
.chip{font-family:"IBM Plex Mono",monospace;font-size:11px;padding:2.5px 7px;
  border-radius:5px;background:var(--rule-2);color:var(--ink-2);white-space:nowrap}
.chip.df-hard{background:var(--bad-soft);color:var(--bad)}
.chip.df-medium{background:var(--warn-soft);color:var(--warn)}
.chip.df-easy{background:var(--good-soft);color:var(--good)}
.q{font-size:15.5px;margin:0 0 12px;max-width:70ch}
ol.ch{list-style:none;margin:0 0 13px;padding:0;display:flex;flex-direction:column;gap:5px}
ol.ch li{display:flex;gap:10px;padding:8px 11px;border-radius:7px;
  border:1px solid var(--rule-2);font-size:14.5px}
ol.ch li.key{background:var(--good-soft);border-color:var(--good)}
ol.ch .ltr{font-family:"IBM Plex Mono",monospace;font-size:12.5px;color:var(--ink-3);
  padding-top:2px;flex-shrink:0}
ol.ch li.key .ltr{color:var(--good);font-weight:500}
.why{font-size:13.5px;color:var(--ink-2);background:var(--rule-2);
  border-radius:7px;padding:11px 13px;margin-bottom:13px}
.why b{color:var(--ink);font-weight:600}
.why ul{margin:7px 0 0;padding-left:17px}

.vb{display:flex;flex-wrap:wrap;gap:7px;align-items:center;
  border-top:1px solid var(--rule-2);padding-top:12px}
.vb button{border:1px solid var(--rule);background:var(--card);color:var(--ink-2);
  border-radius:7px;padding:6px 13px;font:inherit;font-size:13px;cursor:pointer}
.vb button:hover{border-color:var(--ink-3)}
.vb button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.vb button[aria-pressed="true"][data-set="ok"]{background:var(--good);border-color:var(--good);color:#fff}
.vb button[aria-pressed="true"][data-set="flag"]{background:var(--warn);border-color:var(--warn);color:#fff}
.vb button[aria-pressed="true"][data-set="rej"]{background:var(--bad);border-color:var(--bad);color:#fff}
.vb input{flex:1;min-width:170px;padding:6px 11px;font:inherit;font-size:13px;
  border:1px solid var(--rule);border-radius:7px;background:var(--paper);color:var(--ink)}
.vb input:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.empty{color:var(--ink-3);padding:40px 0;text-align:center}
.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:26px;z-index:60;
  background:var(--ink);color:var(--paper);padding:10px 18px;border-radius:8px;
  font-size:13.5px;box-shadow:var(--shadow);opacity:0;pointer-events:none;
  transition:opacity .18s}
.toast.on{opacity:1}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
@media (max-width:640px){.wrap{padding:0 15px}.bar .wrap{padding:10px 15px}
  .psg{padding:16px 17px}.item{padding:15px 16px}}
</style>

<header class="mast"><div class="wrap">
  <div>
    <h1>SSAT &amp; ISEE Item Review</h1>
    <p>Every live item in both banks, with its key and rationale. Mark each one
       Keep, Flag or Reject, then export your verdicts and send the file back.</p>
  </div>
  <div class="tally">
    <div><b id="t-done">0</b>reviewed</div>
    <div><b id="t-flag">0</b>flagged</div>
    <div><b id="t-rej">0</b>rejected</div>
    <div><b id="t-all">0</b>in view</div>
  </div>
</div></header>

<section class="guide"><div class="wrap"><details open>
  <summary>What to look for — and what the machines already checked</summary>
  <div class="body">
    <div>
      <h3>Already checked — don't spend time here</h3>
      <ul>
        <li>Whether the key is guessable from the options alone. Every cohort
            passed a blind attack where solvers saw only the choices.</li>
        <li>Answer-letter spread, key length, duplicate option sets, and stems
            reused from elsewhere in the bank.</li>
        <li>Arithmetic in the math items — each was re-solved in a sandbox.</li>
      </ul>
    </div>
    <div>
      <h3>What only a person can catch</h3>
      <ul>
        <li><b>Two defensible answers.</b> The most common real defect. Can you
            argue a distractor from the passage or stem?</li>
        <li><b>Wrong key.</b> Rare, but it happens. Solve it yourself first,
            then look at the marked answer.</li>
        <li><b>Grade fit.</b> SSAT and ISEE are middle-school exams. Flag
            vocabulary, contexts or reasoning aimed above the band.</li>
        <li><b>Tone and content.</b> Anything a parent would object to, or that
            assumes background a Korean student wouldn't have.</li>
        <li><b>Difficulty label.</b> Does easy/medium/hard match how it feels?</li>
      </ul>
    </div>
    <div>
      <h3>How to mark</h3>
      <ul>
        <li><b>Keep</b> — you'd put it on a real form.</li>
        <li><b>Flag</b> — usable but needs an edit. Say what in the note.</li>
        <li><b>Reject</b> — broken. Say why; that note is what gets acted on.</li>
        <li>Work one section at a time. Your marks save in this browser as you
            go, so you can stop and come back.</li>
        <li>When you're done, hit <b>Export verdicts</b> and send the file back.</li>
      </ul>
    </div>
    <div>
      <h3>Reading items work differently</h3>
      <ul>
        <li>Each passage exists in four or five parallel versions that differ on
            a few facts; the one shown was picked at random after the questions
            were frozen. That's why the answer can't be guessed.</li>
        <li>The side effect is that a wrong option is another version's correct
            answer — so if one looks nearly right, that's exactly the defect to
            flag. Check it against <em>this</em> passage only.</li>
      </ul>
    </div>
  </div>
</details></div></section>

<div class="bar"><div class="wrap">
  <div class="seg" id="f-fam" role="group" aria-label="Test">
    <button data-v="all" aria-pressed="true">Both</button>
    <button data-v="ssat" aria-pressed="false">SSAT</button>
    <button data-v="isee" aria-pressed="false">ISEE</button>
  </div>
  <div class="seg" id="f-sec" role="group" aria-label="Section">
    <button data-v="all" aria-pressed="true">All</button>
    <button data-v="verbal" aria-pressed="false">Verbal</button>
    <button data-v="math" aria-pressed="false">Math</button>
    <button data-v="reading" aria-pressed="false">Reading</button>
  </div>
  <div class="seg" id="f-st" role="group" aria-label="Status">
    <button data-v="all" aria-pressed="true">Any</button>
    <button data-v="todo" aria-pressed="false">Unreviewed</button>
    <button data-v="flag" aria-pressed="false">Flagged</button>
    <button data-v="rej" aria-pressed="false">Rejected</button>
  </div>
  <input type="search" id="f-q" placeholder="Search question, options, skill…" aria-label="Search items">
  <button class="ghost" id="btn-export">Export verdicts</button>
</div></div>

<main class="wrap" id="out"></main>
<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script id="bank" type="application/json">${DATA.replace(/</g,'\\u003c')}</script>
<script>
(function(){
"use strict";
var BANK = JSON.parse(document.getElementById('bank').textContent);
var ITEMS = BANK.items, MARGIN = BANK.margin;
var KEY = 'classraum-qc-ssat-isee-v1';
var V = {};
try { V = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e){ V = {}; }
var F = { fam:'all', sec:'all', st:'all', q:'' };
var out = document.getElementById('out');
var LT = 'ABCDEFGH';

function save(){ try{ localStorage.setItem(KEY, JSON.stringify(V)); }catch(e){} }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function toast(m){ var t=document.getElementById('toast'); t.textContent=m; t.classList.add('on');
  clearTimeout(t._h); t._h=setTimeout(function(){t.classList.remove('on');},2200); }

function visible(){
  var q = F.q.trim().toLowerCase();
  return ITEMS.filter(function(it){
    if (F.fam!=='all' && it.fam!==F.fam) return false;
    if (F.sec!=='all' && it.sec!==F.sec) return false;
    var v = V[it.id] && V[it.id].v;
    if (F.st==='todo' && v) return false;
    if (F.st==='flag' && v!=='flag') return false;
    if (F.st==='rej' && v!=='rej') return false;
    if (q){
      var hay = (it.q+' '+it.ch.join(' ')+' '+it.sk+' '+it.id).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}

function tally(list){
  var done=0, fl=0, rj=0;
  for (var id in V){ if(!V[id].v) continue; done++;
    if(V[id].v==='flag') fl++; if(V[id].v==='rej') rj++; }
  document.getElementById('t-done').textContent = done;
  document.getElementById('t-flag').textContent = fl;
  document.getElementById('t-rej').textContent  = rj;
  document.getElementById('t-all').textContent  = list.length;
}

function itemHTML(it){
  var rec = V[it.id] || {};
  var m = MARGIN[it.co];
  var chips = '<span class="chip">'+esc(it.fam.toUpperCase())+' · '+esc(it.sec)+'</span>'
    + '<span class="chip df-'+esc(it.df)+'">'+esc(it.df)+'</span>'
    + '<span class="chip">'+esc(it.sk)+'</span>'
    + '<span class="chip">'+esc(it.co)+(m?' · attack '+m:' · gate passed')+'</span>';
  var ch = it.ch.map(function(c,i){
    var isKey = String(c).trim() === String(it.k).trim();
    return '<li class="'+(isKey?'key':'')+'"><span class="ltr">'+LT[i]+(isKey?' ✓':'')+'</span><span>'+esc(c)+'</span></li>';
  }).join('');
  var why = '';
  if (it.ex || (it.dr && it.dr.length)){
    why = '<div class="why"><b>Why the key is the key.</b> '+esc(it.ex);
    if (it.dr && it.dr.length){
      why += '<ul>'+it.dr.map(function(d){
        return '<li>'+esc(typeof d==='string'? d : (d.text||d.rationale||d.why||JSON.stringify(d)))+'</li>';
      }).join('')+'</ul>';
    }
    why += '</div>';
  }
  var btn = function(k,label){
    return '<button data-set="'+k+'" data-id="'+esc(it.id)+'" aria-pressed="'+(rec.v===k?'true':'false')+'">'+label+'</button>';
  };
  return '<article class="item" data-v="'+esc(rec.v||'')+'" id="it-'+esc(it.id)+'">'
    + '<div class="meta">'+chips+'</div>'
    + '<p class="q">'+esc(it.q)+'</p>'
    + '<ol class="ch">'+ch+'</ol>'
    + why
    + '<div class="vb">'+btn('ok','Keep')+btn('flag','Flag')+btn('rej','Reject')
    + '<input type="text" data-note="'+esc(it.id)+'" placeholder="Note — what is wrong, or what to change" value="'+esc(rec.n||'')+'"></div>'
    + '</article>';
}

function render(){
  var list = visible();
  tally(list);
  if (!list.length){ out.innerHTML = '<p class="empty">No items match these filters.</p>'; return; }
  // group: reading items by shared passage, everything else by family+section
  var html = '', i = 0;
  while (i < list.length){
    var it = list[i];
    if (it.sec === 'reading' && it.pg){
      var grp = [];
      while (i < list.length && list[i].pg === it.pg){ grp.push(list[i]); i++; }
      var paras = String(grp[0].ps||'').split(/\\n\\s*\\n/).filter(Boolean)
        .map(function(p){ return '<p>'+esc(p)+'</p>'; }).join('');
      html += '<section class="grp"><div class="grp-h"><h2>'+esc(grp[0].fam.toUpperCase())
        +' Reading</h2><span class="n">'+grp.length+' question'+(grp.length>1?'s':'')
        +' on this passage</span></div>'
        + '<div class="psg"><div class="lbl">Passage</div>'+paras+'</div>'
        + grp.map(itemHTML).join('') + '</section>';
    } else {
      var key = it.fam+'/'+it.sec, g2 = [];
      while (i < list.length && (list[i].fam+'/'+list[i].sec) === key && !(list[i].sec==='reading'&&list[i].pg)){
        g2.push(list[i]); i++;
      }
      html += '<section class="grp"><div class="grp-h"><h2>'+esc(it.fam.toUpperCase())+' '
        + esc(it.sec.charAt(0).toUpperCase()+it.sec.slice(1))+'</h2><span class="n">'
        + g2.length+' items</span></div>' + g2.map(itemHTML).join('') + '</section>';
    }
  }
  out.innerHTML = html;
}

// verdicts
out.addEventListener('click', function(e){
  var b = e.target.closest('button[data-set]'); if (!b) return;
  var id = b.dataset.id, k = b.dataset.set;
  var rec = V[id] || (V[id] = {});
  rec.v = (rec.v === k) ? '' : k;
  save();
  var card = document.getElementById('it-'+id);
  card.dataset.v = rec.v || '';
  card.querySelectorAll('button[data-set]').forEach(function(x){
    x.setAttribute('aria-pressed', x.dataset.set === rec.v ? 'true' : 'false');
  });
  tally(visible());
});
out.addEventListener('input', function(e){
  var f = e.target.closest('input[data-note]'); if (!f) return;
  var id = f.dataset.note;
  (V[id] || (V[id] = {})).n = f.value;
  save();
});

// filters
[['f-fam','fam'],['f-sec','sec'],['f-st','st']].forEach(function(p){
  document.getElementById(p[0]).addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    F[p[1]] = b.dataset.v;
    this.querySelectorAll('button').forEach(function(x){
      x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    });
    render(); window.scrollTo({top:0});
  });
});
var qh;
document.getElementById('f-q').addEventListener('input', function(e){
  clearTimeout(qh); var v = e.target.value;
  qh = setTimeout(function(){ F.q = v; render(); }, 180);
});

// export
document.getElementById('btn-export').addEventListener('click', async function(){
  var rowsOut = ITEMS.filter(function(it){ var r=V[it.id]; return r && (r.v || r.n); })
    .map(function(it){ var r=V[it.id];
      return { id:it.id, family:it.fam, section:it.sec, cohort:it.co,
               verdict:r.v||'', note:r.n||'', question:it.q, key:it.k }; });
  if (!rowsOut.length){ toast('Nothing marked yet.'); return; }
  var payload = JSON.stringify({ reviewed:rowsOut.length, of:ITEMS.length, verdicts:rowsOut }, null, 1);
  var name = 'ssat-isee-qc-verdicts.json';
  var dl = null;
  try { dl = await window.claude.use('downloads'); } catch(e){ dl = null; }
  if (dl){
    try { await dl.save({ filename:name, data:payload });
          toast('Saved '+rowsOut.length+' verdicts.'); return; }
    catch(e){ /* declined or unavailable — fall through to clipboard */ }
  }
  try { await navigator.clipboard.writeText(payload);
        toast('Copied '+rowsOut.length+' verdicts — paste them into the chat.'); }
  catch(e){ toast('Could not export. Select the page and copy manually.'); }
});

render();
})();
</script>`

const OUT = process.argv[2] || join(HERE, 'qc-review.html')
writeFileSync(OUT, html)
console.log('wrote', (html.length/1024).toFixed(0)+'KB', '|', items.length, 'items')
