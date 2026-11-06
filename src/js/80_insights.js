// ---------- Insights: Pricing, Top 20 SKUs, Insights Engine ----------
// SRP = retail price (EUR) from the data pack's SKU list, shown in USD at the pack's FX rate.
// FCS = SKU × market × channel rows: [sku, market, channel, units, gross sales, net revenue, VM], USD. FC1 = Jul Fcst (central forecast), FC2 = Sept FC (market submissions, closeouts and central charges excluded).
const EURUSD=RATE.EUR;
const INS_SRC={sub:{lab:'Market submissions',short:'Submissions'},jul:{lab:'FC1 · Jul Fcst',short:'FC1 Jul Fcst'},sep:{lab:'FC2 · Sept FC',short:'FC2 Sept FC'}};
const INSR=(()=>{const o={};
  o.sub=SK.rows.map(r=>{const s=SK.byI[r.s];return {id:s.id,n:s.n,b:r.b,m:r.m,ch:r.ch,u:r.u,gs:r.gs,al:r.al,ns:r.ns,gm:r.gm,vm:r.gm-r.sw};});
  ['jul','sep'].forEach(k=>o[k]=FCS[k].map(a=>{const s=FCS.s[a[0]];return {id:s[0],n:s[1],b:s[2],m:FCS.m[a[1]],ch:String(a[2]),u:a[3],gs:a[4],al:a[4]-a[5],ns:a[5],vm:a[6]};}));
  return o;})();
const SRP_N=Object.keys(SRP).length;
Object.assign(S,{insSub:'price',prSrc:'sub',prCcy:'USD',prBand:null,topSrc:'sub'});
const grp=(rs,f)=>{const o={};rs.forEach(r=>{(o[f(r)]??=[]).push(r);});return o;};
function iRows(k,o={}){const aB=allBrands(),M=o.m||S.m,B=o.b||null;return INSR[k].filter(r=>M.has(r.m)&&S.ch.has(r.ch)&&(B?B.has(r.b):(aB||S.b.has(r.b))));}
// price aggregate: units-weighted SRP over units that have an SRP
function pAgg(rs){const T={u:0,uP:0,v:0,ns:0,nsP:0,gs:0,al:0};rs.forEach(r=>{if(r.u<=0)return;T.u+=r.u;T.ns+=r.ns;T.gs+=r.gs;T.al+=r.al;const p=SRP[r.id];if(p>0){T.uP+=r.u;T.v+=r.u*p;T.nsP+=r.ns;}});
  T.avgE=T.uP?T.v/T.uP:null;T.avg=T.avgE!=null?T.avgE*EURUSD:null;T.npu=T.uP?T.nsP/T.uP:null;T.real=T.v?T.nsP/(T.v*EURUSD):null;T.cov=T.u?T.uP/T.u:0;T.alp=T.gs?T.al/T.gs:0;return T;}
const pv=v=>v==null?'–':(S.prCcy==='EUR'?'€'+(v/EURUSD).toFixed(2):'$'+v.toFixed(2));
const MS=Object.fromEntries(Object.entries(META.markets||{}).map(([c,v])=>[c,(v&&v.name)||c]));
const mS=m=>MS[m]||m;
const NON_EUR=new Set(Object.entries(META.markets||{}).filter(([c,v])=>v&&v.ccy&&v.ccy!=='EUR').map(([c])=>c));
const BANDS=[[0,10,'< €10'],[10,20,'€10–20'],[20,30,'€20–30'],[30,50,'€30–50'],[50,1e9,'€50+']],BCOL=['#cfe0f7','#9cc0ee','#5f97df','#2a6fc4','#17457f'];
function bandMix(rs){const u=[0,0,0,0,0];let t=0;rs.forEach(r=>{const p=SRP[r.id];if(!(p>0)||r.u<=0)return;const i=BANDS.findIndex(b=>p>=b[0]&&p<b[1]);u[i]+=r.u;t+=r.u;});return {sh:u.map(x=>t?x/t:0),t};}
function priceCol(r){const t=Math.min(1,Math.abs(r)/0.3);return r>=0?mix([241,243,246],[233,178,78],t):mix([241,243,246],[110,165,230],t);}
function segSync(id,v){$$('#'+id+' button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));}

function renderPricing(){const k=S.prSrc,rs=iRows(k),E=pAgg(rs);segSync('prSrc',k);segSync('prCcy',S.prCcy);
  $('#prScope').textContent=INS_SRC[k].lab+' · '+scope();
  if(!E.uP){$('#prNarr').innerHTML=`No priced units in this selection for ${INS_SRC[k].lab}.${k!=='sub'?' FC1 and FC2 may not cover every market.':''}`;['#kpiPr','#prHeat','#prBars','#prIns','#prBandTbl','#prLeg'].forEach(s=>$(s).innerHTML='');return;}
  const byB=grp(rs,r=>r.b),byM=grp(rs,r=>r.m),byBM=grp(rs,r=>r.b+'|'+r.m);
  const bs=Object.keys(byB).map(b=>({b,a:pAgg(byB[b])})).filter(x=>x.a.uP>0).sort((x,y)=>y.a.nsP-x.a.nsP);
  const ms=Object.keys(byM).map(m=>({m,a:pAgg(byM[m])})).filter(x=>x.a.uP>0).sort((x,y)=>y.a.nsP-x.a.nsP);
  const bm={};Object.keys(byBM).forEach(key=>{bm[key]=pAgg(byBM[key]);});
  const big=bs.filter(x=>x.a.uP>=E.uP*0.01),hiB=[...big].sort((x,y)=>y.a.avg-x.a.avg)[0],loB=[...big].sort((x,y)=>x.a.avg-y.a.avg)[0];
  const msE=ms.filter(x=>x.a.uP>=E.uP*0.01),hiM=[...msE].sort((x,y)=>y.a.avg-x.a.avg)[0],loM=[...msE].sort((x,y)=>x.a.avg-y.a.avg)[0];
  $('#kpiPr').innerHTML=kpi('Average SRP',pv(E.avg),`${units(E.uP)} priced units`)+kpi('Net sales per unit',pv(E.npu),`${pct(E.real,0)} of SRP`)
    +kpi('Highest-priced brand',hiB?hiB.b:'–',hiB?pv(hiB.a.avg)+' avg SRP':'')+kpi('Richest market mix',hiM?mS(hiM.m):'–',hiM?pv(hiM.a.avg)+' avg SRP':'')+kpi('SRP coverage',pct(E.cov,0),'of units have an SRP');
  // narrative
  let n=`In the <b>${INS_SRC[k].lab}</b> plan, this selection sells <b class="mono">${units(E.uP)}</b> priced units at an average SRP of <b class="mono">${pv(E.avg)}</b>. ${META.company} nets <b class="mono">${pv(E.npu)}</b> per unit, <b>${pct(E.real,0)}</b> of the shelf price; the gap covers retailer margin, trade allowances (${pct(E.alp)} of gross sales here) and any VAT included in the SRP.`;
  if(hiM&&loM&&hiM!==loM)n+=` <span class="hl">${mS(hiM.m)}</span> sells the richest mix (${pv(hiM.a.avg)}) and <span class="hl">${mS(loM.m)}</span> the leanest (${pv(loM.a.avg)}), a ${pct(hiM.a.avg/loM.a.avg-1,0)} gap. Every SKU has one EU SRP, so this gap comes from <i>which</i> SKUs each market sells, not from different list prices.`;
  if(bs.length===1){const b=bs[0].b,cs=ms.map(x=>({m:x.m,a:bm[b+'|'+x.m]})).filter(x=>x.a&&x.a.uP>0).sort((x,y)=>y.a.avg-x.a.avg);if(cs.length>1)n+=` For ${b}: ${cs.slice(0,6).map(x=>`${mS(x.m)} ${pv(x.a.avg)}`).join(', ')}${cs.length>6?'…':''}.`;}
  if(E.cov<0.9)n+=` <span style="color:var(--warn)">Only ${pct(E.cov,0)} of units have an SRP in the SKU list, so averages cover the priced part only.</span>`;
  $('#prNarr').innerHTML=n;
  // heat
  const HB=bs.slice(0,18),HM=ms;
  let h='<table class="heat pheat"><thead><tr><th></th>'+HM.map(x=>`<th title="${cName(x.m)}">${mC(x.m)}</th>`).join('')+'<th>All</th></tr></thead><tbody>';
  HB.forEach(({b,a:ba})=>{h+=`<tr><td class="rowhead">${b}</td>`;HM.forEach(({m})=>{const c=bm[b+'|'+m];if(!c||!c.uP){h+='<td class="cell" style="background:var(--surface-2);color:var(--muted)">–</td>';return;}const r=c.avg/ba.avg-1;
      h+=`<td class="cell" style="background:${priceCol(r)}" data-tip="<b>${b} · ${cName(m)}</b><br>Avg SRP ${pv(c.avg)} (${r>=0?'+':'−'}${Math.abs(r*100).toFixed(0)}% vs brand)<br>Net/unit ${pv(c.npu)} · ${pct(c.real,0)} of SRP<br>${units(c.uP)} priced units · coverage ${pct(c.cov,0)}">${pv(c.avg)}</td>`;});
    h+=`<td class="cell emea">${pv(ba.avg)}</td></tr>`;});
  h+=`<tr><td class="rowhead"><b>All brands</b></td>${HM.map(({a})=>`<td class="cell emea">${pv(a.avg)}</td>`).join('')}<td class="cell emea">${pv(E.avg)}</td></tr>`;
  $('#prHeat').innerHTML=h+'</tbody></table>';
  $$('#prHeat .cell[data-tip]').forEach(c=>{c.addEventListener('mousemove',e=>ttShow(c.dataset.tip,e));c.addEventListener('mouseleave',ttHide);});
  $('#prLeg').innerHTML=`<span><span class="swatch" style="background:${priceCol(-0.3)}"></span>Cheaper mix than brand average</span><span><span class="swatch" style="background:${priceCol(0)}"></span>In line</span><span><span class="swatch" style="background:${priceCol(0.3)}"></span>Pricier mix</span>${bs.length>18?`<span>Top 18 of ${bs.length} brands by net sales</span>`:''}`+HM.map(x=>`<span><b>${mC(x.m)}</b> ${cName(x.m)}</span>`).join('');
  // bars
  genBars($('#prBars'),bs.slice(0,16),d=>d.a.avg,pv,()=>'var(--accent)',d=>`<div class="tt-t">${d.b}</div><div class="tt-r"><span>Avg SRP</span><b class="mono">${pv(d.a.avg)}</b></div><div class="tt-r"><span>Net / unit</span><b class="mono">${pv(d.a.npu)}</b></div><div class="tt-r"><span>Net ÷ SRP</span><b class="mono">${pct(d.a.real,0)}</b></div><div class="tt-r"><span>Priced units</span><b class="mono">${units(d.a.uP)}</b></div>`,d=>d.b,d=>d.b);
  // insights
  const it=[];
  const spreads=bs.filter(x=>x.a.uP>=Math.max(5000,E.uP*0.02)).map(x=>{const c=msE.map(y=>({m:y.m,a:bm[x.b+'|'+y.m]})).filter(y=>y.a&&y.a.uP>=Math.max(500,x.a.uP*0.02));if(c.length<2)return null;c.sort((p,q)=>q.a.avg-p.a.avg);return {b:x.b,hi:c[0],lo:c[c.length-1],r:c[0].a.avg/c[c.length-1].a.avg-1};}).filter(Boolean).sort((a,b)=>b.r-a.r);
  if(spreads[0]){const s=spreads[0],mh=bandMix(byBM[s.b+'|'+s.hi.m]),ml=bandMix(byBM[s.b+'|'+s.lo.m]);const top=mh.sh.map((v,i)=>v-ml.sh[i]);const bi=top.indexOf(Math.max(...top));
    it.push({t:'neu',i:'↔',h:`Widest price spread: ${s.b}`,p:`${pv(s.hi.a.avg)} in ${mS(s.hi.m)} vs ${pv(s.lo.a.avg)} in ${mS(s.lo.m)} (+${pct(s.r,0)}). ${mS(s.hi.m)} sells ${pct(mh.sh[bi],0)} of its ${s.b} units in the ${BANDS[bi][2]} band vs ${pct(ml.sh[bi],0)} in ${mS(s.lo.m)}: a range-mix difference worth reviewing for listing and promo plans.`});}
  const rm=msE.filter(x=>x.a.real!=null).sort((a,b)=>a.a.real-b.a.real);
  if(rm.length>1){const lo=rm[0],hi=rm[rm.length-1];
    it.push({t:'neg',i:'▼',h:`Lowest share of SRP kept: ${mS(lo.m)}`,p:`${mS(lo.m)} nets ${pv(lo.a.npu)} per unit, ${pct(lo.a.real,0)} of SRP, with allowances at ${pct(lo.a.alp)} of gross sales. Check trade terms and channel mix (Direct Import sells at FOB prices, well below domestic list).`});
    it.push({t:'pos',i:'▲',h:`Highest share of SRP kept: ${mS(hi.m)}`,p:`${mS(hi.m)} nets ${pv(hi.a.npu)} per unit, ${pct(hi.a.real,0)} of SRP (allowances ${pct(hi.a.alp)}).`});}
  if(hiB&&loB&&hiB!==loB)it.push({t:'neu',i:'◎',h:'Premium vs entry brands',p:`${hiB.b} averages ${pv(hiB.a.avg)} per unit and ${loB.b} ${pv(loB.a.avg)}. A mix shift of 1% of units from ${loB.b} to ${hiB.b} would lift the selection average by about ${pv((hiB.a.avg-loB.a.avg)*0.01)}.`});
  const ne=ms.filter(x=>NON_EUR.has(x.m));if(ne.length)it.push({t:'neu',i:'!',h:'Non-euro markets',p:`${ne.map(x=>mS(x.m)).join(', ')} are priced here on the euro retail price list for comparison. Their local shelf prices are set separately in local currency, so read them as mix indicators.`});
  const lc=ms.filter(x=>x.a.cov<0.85).sort((a,b)=>a.a.cov-b.a.cov);if(lc.length)it.push({t:'neu',i:'◔',h:'SRP coverage gaps',p:`Lowest share of units with an SRP: ${lc.slice(0,3).map(x=>`${mS(x.m)} ${pct(x.a.cov,0)}`).join(', ')}. These SKUs are missing from the SKU list or have no numeric SRP.`});
  $('#prIns').innerHTML=it.map(x=>`<div class="insight ${x.t}"><div class="ico">${x.i}</div><div><h4>${x.h}</h4><p>${x.p}</p></div></div>`).join('');
  // band mix
  const sel=$('#prBand');const opts=bs.map(x=>x.b);if(!S.prBand||!opts.includes(S.prBand))S.prBand=bs.length===1?bs[0].b:(opts[0]||null);
  sel.innerHTML=`<option value="__all">All brands in selection</option>`+opts.map(b=>`<option${b===S.prBand?' selected':''}>${b}</option>`).join('');if(S.prBand==='__all')sel.value='__all';
  const bb=S.prBand,bRows=bb==='__all'?rs:(byB[bb]||[]);const bByM=grp(bRows,r=>r.m);
  const bl=[...ms.map(x=>({m:x.m,rows:bByM[x.m]||[]})).filter(x=>x.rows.length),{m:'__all',rows:bRows}];
  let t=`<table><thead><tr><th>Market</th><th style="width:30%">Unit mix by SRP band</th>${BANDS.map(b=>`<th>${b[2]}</th>`).join('')}<th>Avg SRP</th><th>Priced units</th></tr></thead><tbody>`;
  bl.forEach(x=>{const mx=bandMix(x.rows),a=pAgg(x.rows);if(!mx.t)return;t+=`<tr${x.m==='__all'?' class="totrow"':''}><td>${x.m==='__all'?'Selection':cName(x.m)}</td><td><div class="bandbar">${mx.sh.map((s,i)=>`<span style="width:${(s*100).toFixed(2)}%;background:${BCOL[i]}" title="${BANDS[i][2]}: ${pct(s,0)}"></span>`).join('')}</div></td>${mx.sh.map(s=>`<td class="mono">${s>=0.005?pct(s,0):'–'}</td>`).join('')}<td class="mono">${pv(a.avg)}</td><td class="mono">${units(mx.t)}</td></tr>`;});
  $('#prBandTbl').innerHTML=t+'</tbody></table>';
  $('#prFoot').innerHTML=`SRP = retail price (EUR) from the data pack's SKU list (${SRP_N.toLocaleString('en-US')} SKUs with a numeric SRP); USD at the pack's FX rate (${FX_TXT}). It is not stated whether the SRP includes VAT. Units: market submissions = submitted units; FC1 = Jul Fcst quantity; FC2 = Sept FC submitted units. Closeouts and zero or negative units are excluded. Net per unit = net sales ÷ priced units.`;
}

// ---------- Top 20 SKUs ----------
function topList(k){const rs=iRows(k),by={};rs.forEach(r=>{const o=by[r.id]??={id:r.id,n:r.n,b:r.b,ns:0,u:0,vm:0,gs:0,mk:{}};o.ns+=r.ns;o.u+=r.u;o.vm+=r.vm;o.gs+=r.gs;o.mk[r.m]=(o.mk[r.m]||0)+r.ns;});
  const all=Object.values(by).filter(o=>o.ns>0).sort((a,b)=>b.ns-a.ns);all.forEach((o,i)=>o.rk=i+1);
  const ms=[...new Set(rs.map(r=>r.m))].sort((a,b)=>sum(all,o=>o.mk[b]||0)-sum(all,o=>o.mk[a]||0)),mr={};
  ms.forEach(m=>{const l=all.filter(o=>(o.mk[m]||0)>0).sort((a,b)=>b.mk[m]-a.mk[m]);mr[m]={n:l.length,r:{}};l.forEach((o,i)=>mr[m].r[o.id]=i+1);});
  return {all,mr,ms,tot:sum(all,o=>o.ns),idx:Object.fromEntries(all.map(o=>[o.id,o]))};}
const rkCls=r=>!r?'r0':r<=5?'r1':r<=20?'r2':r<=50?'r3':'r4';
const MC=Object.fromEntries(Object.keys(META.markets||{}).map(c=>[c,c.replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase()]));
const mC=m=>MC[m]||String(m).slice(0,4);
function renderTop(){const k=S.topSrc,sub=k==='sub',o=k==='sep'?'jul':'sep',A=topList(k),B=sub?null:topList(o);segSync('topSrc',k);
  $('#topScope').textContent=scope();
  // every selected market gets a column, sorted by net revenue in this source; markets outside the central forecast show "n/c"
  const selM=liveM().filter(m=>m!==CENTRAL),cols=[...A.ms,...selM.filter(m=>!A.ms.includes(m)).sort()],nc=cols.filter(m=>!A.mr[m]);
  if(!A.all.length){$('#topNarr').innerHTML=sub?'No SKU sales in this selection.':'None of the selected markets is in the central forecast (FC1 / FC2 cover: '+CF_M.map(cName).join(', ')+'). Switch to <b>Market submissions</b> to rank SKUs in every market.';['#kpiTop','#topTbl','#topBars','#topIns'].forEach(s=>$(s).innerHTML='');return;}
  const T=A.all.slice(0,20),tN=sum(T,x=>x.ns),tV=sum(T,x=>x.vm),brs=grp(T,x=>x.b),topBr=Object.entries(brs).sort((a,b)=>b[1].length-a[1].length)[0];
  const inB=B?T.filter(x=>B.idx[x.id]&&B.idx[x.id].rk<=20).length:0,newIn=B?T.filter(x=>!B.idx[x.id]||B.idx[x.id].rk>20):[],out=B?B.all.slice(0,20).filter(x=>!A.idx[x.id]||A.idx[x.id].rk>20):[];
  $('#kpiTop').innerHTML=kpi('Top-20 net revenue',money(tN),`${pct(tN/(A.tot||1),0)} of ${money(A.tot)}`)+kpi('Top-20 VM %',pct(tN?tV/tN:0),`selection ${pct(A.tot?sum(A.all,x=>x.vm)/A.tot:0)}`)
    +kpi('#1 SKU',T[0].id,`${T[0].n.slice(0,26)} · ${money(T[0].ns)}`)+kpi('Brands in top 20',Object.keys(brs).length,topBr?`${topBr[0]} ×${topBr[1].length}`:'')
    +(B?kpi(`Same as ${INS_SRC[o].short}`,`${inB}/20`,`${newIn.length} new in top 20`):kpi('Markets ranked',A.ms.length,'all selected markets'));
  let n=`In <b>${INS_SRC[k].lab}</b>, the 20 largest SKUs deliver <b class="mono">${money(tN)}</b> of net ${sub?'sales':'revenue'}, <b>${pct(tN/(A.tot||1),0)}</b> of the ${money(A.tot)} total across ${A.all.length.toLocaleString('en-US')} SKUs and ${A.ms.length} markets, at ${pct(tN?tV/tN:0)} variable margin. <span class="hl">${T[0].id} ${T[0].n}</span> (${T[0].b}) leads with ${money(T[0].ns)}${T[1]?`, ahead of ${T[1].id} ${T[1].n} (${money(T[1].ns)})`:''}. ${topBr?`${topBr[0]} places ${topBr[1].length} SKUs in the list.`:''}`;
  if(B)n+=` Against ${INS_SRC[o].lab}, ${inB} of the 20 are unchanged${newIn.length?`; new entrants: ${newIn.slice(0,4).map(x=>x.id).join(', ')}`:''}${out.length?`; dropped out: ${out.slice(0,4).map(x=>x.id).join(', ')}`:''}.`;
  if(nc.length)n+=` <span style="color:var(--muted)">${nc.map(mS).join(', ')} ${nc.length>1?'are':'is'} not in the central forecast (shown as n/c); switch to Market submissions to rank ${nc.length>1?'them':'it'}.</span>`;
  $('#topNarr').innerHTML=n;$('#topTblT').textContent=`Ranking within each market · ${INS_SRC[k].lab}`;
  let h=`<thead><tr><th>#</th><th>SKU · brand</th><th>Net ${sub?'sales':'rev'}</th><th>Share</th><th>VM %</th>${B?`<th>vs ${INS_SRC[o].short.split(' ')[0]}</th>`:''}${cols.map(m=>`<th class="mk${A.mr[m]?'':' nc'}" title="${cName(m)}">${mC(m)}</th>`).join('')}</tr></thead><tbody>`;
  T.forEach(x=>{const y=B&&B.idx[x.id],mv=y?y.rk-x.rk:null;
    h+=`<tr><td class="mono"><b>${x.rk}</b></td><td class="sku" title="${x.id} ${x.n} · ${x.b}"><b>${x.id}</b> ${x.n}<small>${x.b}</small></td><td class="mono">${money(x.ns)}</td><td class="mono">${pct(x.ns/(A.tot||1))}</td><td class="mono">${x.ns?pct(x.vm/x.ns,0):'–'}</td>
      ${B?`<td class="mono">${y?`#${y.rk}<span class="mv ${mv>0?'p':mv<0?'n':'z'}">${mv>0?'▲'+mv:mv<0?'▼'+(-mv):'='}</span>`:'<span class="mv p">new</span>'}</td>`:''}
      ${cols.map(m=>{if(!A.mr[m])return `<td class="mk"><span class="rk r0" title="${cName(m)}: not in the central forecast">n/c</span></td>`;const r=A.mr[m].r[x.id];return `<td class="mk"><span class="rk ${rkCls(r)}" title="${cName(m)}: ${r?`#${r} of ${A.mr[m].n} · ${money(x.mk[m])}`:'not sold'}">${r||'–'}</span></td>`;}).join('')}</tr>`;});
  $('#topTbl').innerHTML=h+'</tbody>';
  $('#topKey').innerHTML=cols.map(m=>`<span><b>${mC(m)}</b> ${cName(m)}</span>`).join('');
  genBars($('#topBars'),T,d=>d.ns,money,d=>B&&B.idx[d.id]&&B.idx[d.id].ns>d.ns?'var(--warn)':'var(--accent)',d=>{const y=B&&B.idx[d.id];return `<div class="tt-t">${d.id} ${d.n}</div><div class="tt-r"><span>${INS_SRC[k].short}</span><b class="mono">${money(d.ns)}</b></div>${B?`<div class="tt-r"><span>${INS_SRC[o].short}</span><b class="mono">${y?money(y.ns):'–'}</b></div>`:''}<div class="tt-r"><span>VM %</span><b class="mono">${d.ns?pct(d.vm/d.ns):'–'}</b></div>`;},d=>`${d.rk}. ${d.id} ${d.n}`,d=>d.id);
  $('#topBarsNote').textContent=B?`Amber = SKU had more net revenue in ${INS_SRC[o].lab} than in ${INS_SRC[k].lab}. Hover for both values.`:'Market submissions: net sales from the market submissions, all markets. Hover for VM %.';
  // insights
  const it=[];const ms=A.ms;
  const uni=T.filter(x=>ms.every(m=>{const r=A.mr[m].r[x.id];return r&&r<=20;}));
  if(ms.length>1)it.push({t:'pos',i:'★',h:uni.length?`${uni.length} SKU${uni.length>1?'s':''} top-20 in every market`:'No SKU is top-20 in every market',p:uni.length?`${uni.slice(0,5).map(x=>`${x.id} ${x.n}`).join(', ')}: ${uni.length>1?'pan-EMEA winners':'a pan-EMEA winner'} to protect in stock, pricing and promo plans.`:`Leadership is local: each market leans on a different set of hero SKUs.`});
  const gaps=[];T.forEach(x=>ms.forEach(m=>{const r=A.mr[m].r[x.id];if(!r||r>40)gaps.push({x,m,r});}));
  if(gaps.length){const gg=Object.values(grp(gaps,z=>z.x.id)).sort((a,b)=>a[0].x.rk-b[0].x.rk).slice(0,4);it.push({t:'neu',i:'◔',h:'Distribution gaps among EMEA leaders',p:gg.map(v=>`EMEA #${v[0].x.rk} ${v[0].x.id} ${v[0].x.n} ranks ${v.map(z=>`${z.r?`#${z.r}`:'not sold'} in ${mS(z.m)}`).join(', ')}`).join('; ')+'. Check listings and the range plan with those markets before assuming low demand.'});}
  const heroes=[];ms.forEach(m=>{A.all.filter(x=>x.rk>20).forEach(x=>{const r=A.mr[m].r[x.id];if(r&&r<=5)heroes.push({x,m,r});});});
  if(heroes.length){const hh=Object.values(grp(heroes,z=>z.x.id)).sort((a,b)=>Math.min(...a.map(z=>z.r))-Math.min(...b.map(z=>z.r))||a[0].x.rk-b[0].x.rk).slice(0,5);it.push({t:'neu',i:'⌂',h:'Local heroes outside the EMEA top 20',p:hh.map(v=>`${v[0].x.id} ${v[0].x.n} (${v.map(z=>`#${z.r} in ${mS(z.m)}`).join(', ')}; EMEA #${v[0].x.rk})`).join('; ')+'. Candidates to test in similar markets.'});}
  const avgV=tN?tV/tN:0,thin=T.filter(x=>x.ns&&x.vm/x.ns<avgV-0.1).sort((a,b)=>a.vm/a.ns-b.vm/b.ns);
  if(thin.length)it.push({t:'neg',i:'▼',h:'Volume without margin',p:`${thin.slice(0,4).map(x=>`${x.id} (${pct(x.vm/x.ns,0)} VM)`).join(', ')} are more than 10 pts below the top-20 average VM of ${pct(avgV,0)}: review cost, allowance and price before adding volume.`});
  if(B){const movers=T.filter(x=>B.idx[x.id]).map(x=>({x,d:x.ns-B.idx[x.id].ns})).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d)).slice(0,3);
    if(movers.length)it.push({t:'neu',i:'↕',h:`Biggest moves vs ${INS_SRC[o].short}`,p:movers.map(z=>`${z.x.id} ${signed(z.d,money)}`).join(', ')+`. Sept FC is the Sept market submissions, Jul FC the central forecast, so part of the move is method (see the Central FC tab).`});}
  $('#topIns').innerHTML=it.map(x=>`<div class="insight ${x.t}"><div class="ico">${x.i}</div><div><h4>${x.h}</h4><p>${x.p}</p></div></div>`).join('');
}

