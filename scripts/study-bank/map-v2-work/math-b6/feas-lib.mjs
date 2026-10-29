// feasibility: for each b5 mechanism, search numbers whose NATURAL error set yields 3 distractors passing FORM (N),
// LONE, HUB (math-check rules), no arithmetic/geometric RUN through the key, no PAIR (key vs option by a printed number),
// key not printed, and a K4 proxy; report which key ranks (1-4) are reachable.
const fr=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a; const s=Math.sign(n*d)||1; n=Math.abs(n); d=Math.abs(d); const k=g(n,d); return [s*n/k,d/k]}
export const fmt=v=>{ // decimal if terminating within 3 dp, else fraction / mixed
  for(const p of [0,1,2,3]){ const m=Math.round(v*10**p); if(Math.abs(m/10**p-v)<1e-9) return String(+(m/10**p).toFixed(p)) }
  for(let d=2;d<=200;d++){ const n=Math.round(v*d); if(Math.abs(n/d-v)<1e-9){ const [a,b]=fr(n,d); const w=Math.trunc(Math.abs(a)/b), r=Math.abs(a)%b, s=a<0?'-':''; return w?`${s}${w} ${r}/${b}`:`${s}${r}/${b}` } } return null }
const val=s=>{let m=s.match(/^(-?)(\d+) (\d+)\/(\d+)$/); if(m) return (m[1]?-1:1)*(+m[2]+m[3]/m[4]); m=s.match(/^(-?\d+)\/(\d+)$/); if(m) return m[1]/m[2]; return Number(s)}
const lastClass=d=>d==='0'?'zero':d==='5'?'five':'2468'.includes(d)?'even':'odd'
const formOf=t=>{const f=t.match(/^-?(?:(\d+) )?(\d+)\/(\d+)$/); if(f){const n=+f[2],d=+f[3],g=(a,b)=>b?g(b,a%b):a; return {kind:'frac',den:d/g(n,d)}} const m=t.match(/^-?(\d+)(?:\.(\d+))?$/); return m?{kind:'dec',places:(m[2]??'').length,last:lastClass(t.slice(-1)),digits:t.replace(/[^0-9]/g,'').length}:{kind:'other'}}
const FORM=(ch,key)=>{const k=formOf(key); for(const c of ch){ if(c===key) continue; const f=formOf(c); if(f.kind!==k.kind) return false; if(k.kind==='frac'&&f.den!==k.den) return false; if(k.kind==='dec'){ if(f.places!==k.places||f.last!==k.last) return false; if(k.digits>=2&&c.slice(-1)!==key.slice(-1)) return false } } return true}
const LONE=vs=>{const sg=v=>v>0?1:v<0?-1:0, lg=v=>Math.log10(Math.abs(v)); for(let i=0;i<4;i++){const v=vs[i],o=vs.filter((_,j)=>j!==i); if(sg(v)&&o.every(w=>sg(w)===-sg(v))) return false; if(v===0||o.includes(0)) continue; const ol=o.map(lg),sp=Math.max(...ol)-Math.min(...ol),gap=Math.min(...ol.map(x=>Math.abs(x-lg(v)))); if(gap>=Math.log10(2)&&gap>2*sp) return false} return true}
export const near=(a,b)=>Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b))
const HUB=(vs,k)=>{const L=(a,b)=>a&&b&&[2,3,4,1.5,10].some(q=>near(b/a,q)||near(a/b,q)); for(let i=0;i<4;i++){const d=vs.filter((w,j)=>j!==i&&L(vs[i],w)).length; if(d>=2) return false; if(i===k&&d>=1) return false} for(let i=0;i<4;i++)for(let j=i+1;j<4;j++) if(i!==k&&j!==k&&near((vs[i]+vs[j])/2,vs[k])) return false; return true}
const RUN=(vs,k)=>{for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)for(let c=b+1;c<4;c++){ if(![a,b,c].includes(k)) continue; const t=[vs[a],vs[b],vs[c]].sort((x,y)=>x-y); if(near(t[1]-t[0],t[2]-t[1])) return false; if(t[0]&&t[1]&&Math.sign(t[0])===Math.sign(t[2])&&near(t[1]/t[0],t[2]/t[1])&&!near(t[1]/t[0],1)) return false} return true}
const PAIR=(vs,k,printed)=>{for(let i=0;i<4;i++){ if(i===k) continue; for(const r of [Math.abs(vs[k]-vs[i]),Math.abs(vs[k]+vs[i]),vs[i]?Math.abs(vs[k]/vs[i]):NaN,vs[k]?Math.abs(vs[i]/vs[k]):NaN]) for(const x of printed) if(x!==1&&near(r,x)) return false } return true}
const K4=(vs,k,E,step)=>{ if(E==null) return true; const dk=Math.abs(vs[k]-E); return vs.filter((v,i)=>i!==k&&Math.abs(v-E)>2*dk+step).length<=1 }
export function check(key,errs,printed,E,step){ // errs: [{name,v}] -> best option sets
  const res=[], kS=fmt(key); if(kS==null||printed.some(p=>near(p,key))) return res
  const E2=errs.filter(e=>Number.isFinite(e.v)&&!near(e.v,key)).filter((e,i,a)=>a.findIndex(x=>near(x.v,e.v))===i)
  for(let a=0;a<E2.length;a++)for(let b=a+1;b<E2.length;b++)for(let c=b+1;c<E2.length;c++){ const ds=[E2[a],E2[b],E2[c]]; const ss=ds.map(d=>fmt(d.v)); if(ss.some(s=>s==null)) continue
    const ch=[kS,...ss], vs=ch.map(val); if(!FORM(ch,kS)||!LONE(vs)||!HUB(vs,0)||!RUN(vs,0)||!PAIR(vs,0,printed)||!K4(vs,0,E,step)) continue
    const rank=1+vs.filter(v=>v<vs[0]).length; res.push({rank,ch,names:ds.map(d=>d.name)}) }
  return res }
export const out={}; export const rec=(m,r,ex)=>{out[m]??={}; for(const x of r){ out[m][x.rank]??={n:0,ex:null}; out[m][x.rank].n++; out[m][x.rank].ex??={...ex,options:x.ch,errors:x.names} } }

export const R=(a,b,s)=>{const o=[];for(let x=a;x<=b+1e-9;x+=s)o.push(+x.toFixed(4));return o}
