// ---------- Compare tab: Current forecast vs Prior forecast / Prior year ----------
// Any two datasets from the registry; like-for-like keeps only markets present in both. VM bridge on GROSS-sales rates
// (same method as the deck): volume and price/mix at prior VM rate, then allowance, product cost, royalty and logistics
// rate changes on current gross sales. The steps add up exactly to the VM change.
const fP1=v=>pct(v),dpts=d=>(d>=0?'+':'−')+Math.abs(d*100).toFixed(1)+' pts';
function cls3(d,good=1,eps=1e-9){return Math.abs(d)<eps?'z':(d*good>0?'p':'n');}
function vTile(lab,c,p,f,mode,good=1){const d=c-p,rel=p?c/p-1:null;
  const txt=mode==='pts'?dpts(d):signed(d,f)+(rel!=null&&isFinite(rel)?` · ${pchg(rel)}`:'');
  const k=mode==='pts'?cls3(d*100,good,0.05):cls3(rel==null?d:rel*100,good,0.05);
  return `<div class="kpi vt"><div class="k-lab">${lab}</div><div class="k-val mono">${f(c)}</div><div class="k-cmp"><span class="dchip ${k}">${d>0?'▲':d<0?'▼':'■'} ${txt}</span></div><div class="k-prev">vs ${f(p)}</div></div>`;}
function vmBridge(P,C){if(!P.gs||!C.gs)return null;const r=T=>({a:T.al/T.gs,c:T.cogs/T.gs,y:T.roy/T.gs,l:(T.wh+T.fr)/T.gs,m:T.vm/T.gs});const p=r(P),c=r(C),G=C.gs;
  const gsVol=P.u>0&&C.u>0?P.gs*C.u/P.u:C.gs;
  return [{k:'Prior VM',v:P.vm,tot:1},{k:'Volume',v:(gsVol-P.gs)*p.m},{k:'Price & mix',v:(G-gsVol)*p.m},{k:'Allowances',v:-(c.a-p.a)*G},
    {k:'Product cost',v:(c.c-p.c)*G},{k:'Royalties',v:(c.y-p.y)*G},{k:'Logistics',v:(c.l-p.l)*G},{k:'Current VM',v:C.vm,tot:1}];}
function wfChart(el,steps,labA,labB){const W=760,H=300,pT=26,pB=48,n=steps.length;let run=0;const bars=steps.map((s,i)=>{if(s.tot){run=s.v;return {...s,y0:0,y1:s.v};}const b={...s,y0:run,y1:run+s.v};run+=s.v;return b;});
  const mx=Math.max(0,...bars.map(b=>Math.max(b.y0,b.y1))),mn=Math.min(0,...bars.map(b=>Math.min(b.y0,b.y1))),sp=(mx-mn)||1,y=v=>pT+(mx-v)/sp*(H-pT-pB),st=(W-20)/n,bw=Math.min(62,st-22);
  let g=`<line class="axis" x1="10" x2="${W-10}" y1="${y(0)}" y2="${y(0)}"/>`;
  bars.forEach((b,i)=>{const cx=10+i*st+st/2,x=cx-bw/2,t=Math.min(y(b.y0),y(b.y1)),h=Math.max(1.5,Math.abs(y(b.y0)-y(b.y1)));
    const col=b.tot?(i===0?'var(--c-prior)':'var(--c-total)'):(b.v>=0?'var(--pos)':'var(--neg)');
    if(i<n-1){const nx=10+(i+1)*st+st/2-bw/2;g+=`<line class="conn" x1="${x+bw}" x2="${nx}" y1="${y(b.tot?b.y1:b.y1)}" y2="${y(b.tot?b.y1:b.y1)}"/>`;}
    g+=`<rect x="${x.toFixed(1)}" y="${t.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${col}" class="wfb" data-tip="<b>${b.k}</b><br>${b.tot?money0(b.v):signed(b.v,money0)}"/>`;
    g+=`<text class="blab" x="${cx}" y="${(t-7).toFixed(1)}" text-anchor="middle">${b.tot?money(b.v):signed(b.v,money)}</text>`;
    const w=b.k.split(' ');g+=`<text class="gtxt" x="${cx}" y="${H-pB+17}" text-anchor="middle">${w[0]}</text>${w[1]?`<text class="gtxt" x="${cx}" y="${H-pB+30}" text-anchor="middle">${w.slice(1).join(' ')}</text>`:''}`;});
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="VM bridge from ${labB} to ${labA}">${g}</svg>`;
  $$('.wfb',el).forEach(r=>{r.addEventListener('mousemove',e=>ttShow(r.dataset.tip,e));r.addEventListener('mouseleave',ttHide);});}
function divBars(el,data,f){if(!data.length){el.innerHTML='<div class="empty-s">No markets to compare.</div>';return;}
  const mx=Math.max(...data.map(d=>Math.abs(d.v)),1e-9);
  el.innerHTML=data.map(d=>{const w=Math.abs(d.v)/mx*50;return `<div class="dbar" data-tip="${d.tip.replace(/"/g,'&quot;')}"><div class="dl" title="${d.lab}">${d.lab}</div><div class="dt"><span class="mid"></span><span class="bar ${d.v>=0?'p':'n'}" style="${d.v>=0?`left:50%`:`right:50%`};width:${w.toFixed(2)}%"></span></div><div class="dv2 mono ${d.v>=0?'p':'n'}">${f(d.v)}</div></div>`;}).join('');
  $$('.dbar',el).forEach(r=>{r.addEventListener('mousemove',e=>ttShow(r.dataset.tip,e));r.addEventListener('mouseleave',ttHide);});}
function cmpTable(el,keys,A,B,name,onlyA,onlyB){const T=(x,y)=>{const dn=x.ns-y.ns;return `<td class="mono">${money(y.ns)}</td><td class="mono">${money(x.ns)}</td><td class="mono ${cls3(dn)}">${signed(dn,money)}</td><td class="mono ${cls3(dn)}">${y.ns?pchg(x.ns/y.ns-1):'new'}</td>
    <td class="mono">${y.ns?fP1(y.vmp):'–'}</td><td class="mono">${x.ns?fP1(x.vmp):'–'}</td><td class="mono ${cls3(x.vmp-y.vmp)}">${x.ns&&y.ns?dpts(x.vmp-y.vmp):'–'}</td>
    <td class="mono ${cls3(x.alp-y.alp,-1)}">${x.gs&&y.gs?dpts(x.alp-y.alp):'–'}</td><td class="mono ${cls3(x.vm-y.vm)}"><b>${signed(x.vm-y.vm,money)}</b></td>`;};
  const Z=cAgg([]);let h=`<thead><tr><th>${name}</th><th>Prior NR</th><th>Current NR</th><th>Δ NR</th><th>Δ %</th><th>Prior VM %</th><th>Current VM %</th><th>Δ VM %</th><th>Δ Allow %</th><th>Δ VM $</th></tr></thead><tbody>`;
  keys.forEach(k=>{const x=A[k]||Z,y=B[k]||Z,tag=onlyA.has(k)?' <span class="tag">current only</span>':onlyB.has(k)?' <span class="tag">prior only</span>':'';h+=`<tr><td>${name==='Market'?cName(k):k}${tag}</td>${T(x,y)}</tr>`;});
  return h;}
function plRows(C,P){const L=[['Gross sales','gs',1],['Allowances','al',-1],['Net revenue','ns',1,1],['Product cost (COGS)','cogs',1],['Gross profit','gp',1,1],['Royalties','roy',1],['GMR','gmr',1,1],['Warehousing','wh',1],['Freight','fr',1],['Variable margin','vm',1,1]];
  return L.map(([l,k,g,sub])=>{const c=k==='al'?-C[k]:C[k],p=k==='al'?-P[k]:P[k],d=c-p;return `<tr class="${sub?'subt':''}"><td>${l}</td><td class="mono">${money(p)}</td><td class="mono">${money(c)}</td><td class="mono ${cls3(d)}">${signed(d,money)}</td><td class="mono ${cls3(d)}">${p?pchg(c/p-1):'–'}</td><td class="mono">${P.ns?fP1(p/P.ns):'–'}</td><td class="mono">${C.ns?fP1(c/C.ns):'–'}</td><td class="mono ${cls3(c/(C.ns||1)-p/(P.ns||1))}">${C.ns&&P.ns?dpts(c/C.ns-p/P.ns):'–'}</td></tr>`;}).join('');}
function renderCompare(){const isPY=S.cmpSub==='py',ka=S.slot.cur,kb=isPY?S.slot.py:S.slot.pri,A=DS[ka],B=DS[kb];
  $$('#cmpSub button').forEach(b=>b.classList.toggle('on',b.dataset.s===S.cmpSub));$('#cmpLfl').classList.toggle('on',S.lfl);
  $$('#cmpMet button').forEach(b=>b.classList.toggle('on',b.dataset.m===S.cmpMetric));
  $('#cmpSubPri').innerHTML=`vs Prior forecast <small>${DS[S.slot.pri].lab}</small>`;$('#cmpSubPy').innerHTML=`vs Prior year <small>${DS[S.slot.py].lab}${DS[S.slot.py].pending?' · pending':''}</small>`;
  const empty=$('#cmpEmpty'),body=$('#cmpBody');
  if(B.pending||ka===kb){body.hidden=true;empty.hidden=false;
    empty.innerHTML=ka===kb?`<div class="empty-ic">=</div><h3>Same dataset in both slots</h3><p>Current and ${isPY?'Prior year':'Prior forecast'} are both <b>${A.lab}</b>. Pick a different dataset in the header to compare.</p>`
      :`<div class="empty-ic">◷</div><h3>Prior Year data is not loaded yet</h3><p>The Prior Year slot is available but no prior-year data is loaded in this data pack.</p>
        <ol><li>Add a prior-year actuals dataset with net sales and margin by market and brand to your data pack.</li><li>Rebuild the cockpit so the Prior Year slot is populated.</li></ol>
        <p class="note">Meanwhile you can put any forecast in the Prior year slot (header) to use this view, for example Jul Fcst as an early-year baseline.</p>`;return;}
  body.hidden=false;empty.hidden=true;
  const both=new Set([...A.mk].filter(m=>B.mk.has(m))),mk=S.lfl?both:null,RA=dsRows(ka,mk),RB=dsRows(kb,mk),C=cAgg(RA),P=cAgg(RB);
  const selM=liveM().filter(m=>m!==CENTRAL),onlyA=new Set(selM.filter(m=>A.mk.has(m)&&!B.mk.has(m))),onlyB=new Set(selM.filter(m=>B.mk.has(m)&&!A.mk.has(m)));
  if(!C.ns||!P.ns){body.hidden=true;empty.hidden=false;const miss=!P.ns?B:A,has=!P.ns?A:B,lst=[...(!P.ns?onlyA:onlyB)].map(mName);
    empty.innerHTML=`<div class="empty-ic">∅</div><h3>No ${miss.lab} data for this selection</h3><p>${lst.length?`${lst.join(', ')} ${lst.length>1?'are':'is'} only in ${has.lab}. `:''}${miss.lab} covers ${miss.mk.size} markets: ${[...miss.mk].sort().map(mName).join(', ')}.</p><p>${S.lfl?'Like-for-like is on, so markets missing from either dataset are left out. ':''}Pick other markets on the left, or choose a dataset in the header that covers them.</p>`;return;}
  const br=vmBridge(P,C),steps=br?br.slice(1,-1):[],top=[...steps].sort((a,b)=>Math.abs(b.v)-Math.abs(a.v));
  // action title
  const dV=C.vm-P.vm,dN=C.ns-P.ns;
  $('#cmpTitle').textContent=`${A.lab}: net revenue ${dN>=0?'up':'down'} ${pchg(Math.abs(C.ns/P.ns-1)).replace('+','')} vs ${B.lab}, variable margin ${dV>=0?'up':'down'} ${money(Math.abs(dV))}${top[0]?`, driven mainly by ${top[0].k.toLowerCase()}`:''}`;
  $('#cmpSubT').textContent=`${A.full} vs ${B.full} · ${scope()} · ${S.lfl?`like-for-like: ${both.size} markets in both`:'all markets in each dataset'}`;
  $('#kpiCmp').innerHTML=vTile('Net revenue',C.ns,P.ns,money)+vTile('Variable margin',C.vm,P.vm,money)+vTile('VM % of NR',C.vmp,P.vmp,fP1,'pts')+vTile('Gross sales',C.gs,P.gs,money)
    +vTile('Allowance % of gross',C.alp,P.alp,fP1,'pts',-1)+vTile('Gross profit %',C.gpp,P.gpp,fP1,'pts')+vTile('Units',C.u,P.u,units);
  if(br)wfChart($('#cmpWf'),br,A.lab,B.lab);else $('#cmpWf').innerHTML='<div class="empty-s">Not enough data for a bridge.</div>';
  // key messages
  const byA=cBy(RA,'m'),byB=cBy(RB,'m'),mks=[...new Set([...Object.keys(byA),...Object.keys(byB)])],Z=cAgg([]);
  const mD=mks.map(m=>({m,a:byA[m]||Z,b:byB[m]||Z})).map(o=>({...o,dv:o.a.vm-o.b.vm,dn:o.a.ns-o.b.ns}));
  const bA=cBy(RA,'b'),bB=cBy(RB,'b'),bks=[...new Set([...Object.keys(bA),...Object.keys(bB)])];
  const bD=bks.map(b=>({b,a:bA[b]||Z,p:bB[b]||Z})).map(o=>({...o,dv:o.a.vm-o.p.vm,dn:o.a.ns-o.p.ns}));
  const up=[...mD].filter(o=>o.dv>0).sort((a,b)=>b.dv-a.dv),dn=[...mD].filter(o=>o.dv<0).sort((a,b)=>a.dv-b.dv),bup=[...bD].filter(o=>o.dv>0).sort((a,b)=>b.dv-a.dv),bdn=[...bD].filter(o=>o.dv<0).sort((a,b)=>a.dv-b.dv);
  const msg=[];
  if(br)msg.push(`<b>Variable margin ${signed(dV,money)}</b> (${pct(P.vmp)} → ${pct(C.vmp)} of net revenue). Largest drivers: ${top.slice(0,3).map(s=>`${s.k.toLowerCase()} ${signed(s.v,money)}`).join(', ')}.`);
  if(Math.abs(C.alp-P.alp)>=0.005)msg.push(`<b>Allowances ${dpts(C.alp-P.alp)}</b> to ${pct(C.alp)} of gross sales, worth ${signed(-(C.alp-P.alp)*C.gs,money)} of VM at current volume.`);
  if(up.length||dn.length)msg.push(`<b>Markets:</b> ${up.slice(0,2).map(o=>`${cName(o.m)} ${signed(o.dv,money)}`).join(', ')||'none up'}${dn.length?`; ${dn.slice(0,2).map(o=>`${cName(o.m)} ${signed(o.dv,money)}`).join(', ')}`:''} of VM.`);
  if(bup.length||bdn.length)msg.push(`<b>Brands:</b> ${bup.slice(0,2).map(o=>`${o.b} ${signed(o.dv,money)}`).join(', ')||'none up'}${bdn.length?`; ${bdn.slice(0,2).map(o=>`${o.b} ${signed(o.dv,money)}`).join(', ')}`:''}.`);
  if(onlyA.size||onlyB.size)msg.push(`<b>Coverage:</b> ${onlyA.size?`${[...onlyA].map(mS).join(', ')} only in ${A.lab}`:''}${onlyA.size&&onlyB.size?'; ':''}${onlyB.size?`${[...onlyB].map(mS).join(', ')} only in ${B.lab}`:''}. ${S.lfl?'Excluded from all figures (like-for-like).':'Included, so totals are not like-for-like.'}`);
  if(ka==='sub'||kb==='sub')msg.push('<b>Definitions:</b> market submissions value COGS on local inventory cost and logistics as Shipping &amp; Warehousing; the central forecast uses standard cost plus allocated warehousing and freight. Part of any cost or logistics gap is definitional.');
  $('#cmpMsg').innerHTML=msg.map(x=>`<li>${x}</li>`).join('');
  // market chart + tables
  const met=S.cmpMetric,mv=o=>met==='ns'?o.dn:met==='vmp'?(o.a.ns&&o.b.ns?o.a.vmp-o.b.vmp:0):o.dv,mf=met==='vmp'?dpts:(v=>signed(v,money));
  $('#cmpBarsT').textContent=`Change in ${met==='ns'?'net revenue':met==='vmp'?'VM % of net revenue':'variable margin'} by market`;
  divBars($('#cmpBars'),mD.map(o=>({lab:cName(o.m),v:mv(o),tip:`<div class="tt-t">${cName(o.m)}</div><div class="tt-r"><span>NR</span><b class="mono">${money(o.b.ns)} → ${money(o.a.ns)}</b></div><div class="tt-r"><span>VM</span><b class="mono">${money(o.b.vm)} → ${money(o.a.vm)}</b></div><div class="tt-r"><span>VM %</span><b class="mono">${o.b.ns?pct(o.b.vmp):'–'} → ${o.a.ns?pct(o.a.vmp):'–'}</b></div>`})).sort((a,b)=>b.v-a.v),mf);
  const mt=cmpTable(null,mD.sort((a,b)=>Math.abs(b.dv)-Math.abs(a.dv)).map(o=>o.m),byA,byB,'Market',onlyA,onlyB);
  const tot=`<tr class="totrow"><td>Total</td><td class="mono">${money(P.ns)}</td><td class="mono">${money(C.ns)}</td><td class="mono">${signed(dN,money)}</td><td class="mono">${P.ns?pchg(C.ns/P.ns-1):'–'}</td><td class="mono">${pct(P.vmp)}</td><td class="mono">${pct(C.vmp)}</td><td class="mono">${dpts(C.vmp-P.vmp)}</td><td class="mono">${dpts(C.alp-P.alp)}</td><td class="mono"><b>${signed(dV,money)}</b></td></tr>`;
  $('#cmpMkt').innerHTML=mt+tot+'</tbody>';
  $('#cmpBr').innerHTML=cmpTable(null,bD.sort((a,b)=>Math.abs(b.dv)-Math.abs(a.dv)).map(o=>o.b),bA,bB,'Brand',new Set(),new Set())+tot+'</tbody>';
  $('#cmpPL').innerHTML=`<thead><tr><th>P&amp;L line</th><th>${B.lab}</th><th>${A.lab}</th><th>Δ $</th><th>Δ %</th><th>Prior % NR</th><th>Current % NR</th><th>Δ % NR</th></tr></thead><tbody>${plRows(C,P)}</tbody>`;
  $('#cmpFoot').textContent=`Sources: ${A.lab} = ${A.full}; ${B.lab} = ${B.full}. USD (${FX_TXT}). Bridge: volume and price & mix at the prior VM rate on gross sales; allowance, product cost, royalty and logistics effects = change in each rate (% of gross sales) × current gross sales.${ka==='sub'||kb==='sub'?' Market submissions: closeouts and central costs excluded; royalties sit inside COGS.':''}`;}
function cmpInit(){$$('#cmpSub button').forEach(b=>b.addEventListener('click',()=>{S.cmpSub=b.dataset.s;renderCompare();}));
  $('#cmpLfl').addEventListener('click',()=>{S.lfl=!S.lfl;renderCompare();});
  $$('#cmpMet button').forEach(b=>b.addEventListener('click',()=>{S.cmpMetric=b.dataset.m;renderCompare();}));}
