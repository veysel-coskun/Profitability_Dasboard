// ---- Monthly tab: a phased forecast (Nov FC Phased or Oct FC Phased) by fiscal month (Jan-Dec), respects Market / Channel / Brand filters
const MRow=a=>({m:a[0],ch:a[1],b:a[2],mo:a[3],u:a[4],gs:a[5],al:a[6],ns:a[7],cogs:a[8],gp:a[9],roy:a[10],gmr:a[11],wh:a[12],fr:a[13],vm:a[14]});
// base = the same forecast before phasing (FY dataset); both are fitted to the one monthly phasing targets (MON.tgt)
const MONS={nvp:{lab:'Nov FC Phased',base:'nov',R:MON_NOV.rows.map(MRow),pre:MON_NOV.pre,tgt:MON.tgt},ocp:{lab:'Oct FC Phased',base:'oct',R:MON.rows.map(MRow),pre:MON.pre,tgt:MON.tgt}};
const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
S.monMetric='ns';S.monHeat='share';S.monK=null;
// shown dataset: picked on the tab, else the header Current / Prior forecast when it is phased, else the latest (Nov FC Phased)
const monK=()=>S.monK||(MONS[S.slot.cur]?S.slot.cur:MONS[S.slot.pri]?S.slot.pri:'nvp');
function mRows(){const aB=allBrands();return MONS[monK()].R.filter(r=>S.m.has(r.m)&&S.ch.has(r.ch)&&(aB||S.b.has(r.b)));}
function mSeries(rs){const o=MO.map(()=>[]);rs.forEach(r=>o[r.mo-1].push(r));return o.map(cAgg);}
function mLine(arr){const v=MO.map(()=>0);arr.filter(a=>S.m.has(a[0])&&S.ch.has(a[1])).forEach(a=>v[a[2]-1]+=a[3]);return v;}
const MMET={ns:{l:'Net Revenue',f:money,v:o=>o.ns},vm:{l:'Variable Margin',f:money,v:o=>o.vm},vmp:{l:'VM %',f:x=>pct(x),v:o=>o.vmp},u:{l:'Units',f:units,v:o=>o.u}};
function monChart(el,ser,pre,tgt,met){
  const M=MMET[met],vals=ser.map(M.v),showT=met==='ns'&&tgt,W=760,H=300,pL=56,pR=12,pT=22,pB=40;
  const all=vals.concat(showT?tgt:[],showT?pre:[]);let mx=Math.max(...all,0),mn=Math.min(...all,0);if(mx===mn)mx=mn+1;
  const ph=H-pT-pB,y=v=>pT+(mx-v)/(mx-mn)*ph,step=(W-pL-pR)/12,bw=Math.min(36,step*0.55);
  const ticks=4,tv=[...Array(ticks+1)].map((_,i)=>mn+(mx-mn)*i/ticks);
  let s=`<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMinYMin meet">`;
  tv.forEach(t=>{s+=`<line class="axis" x1="${pL}" x2="${W-pR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" stroke-dasharray="${Math.abs(t)<1e-9?'':'2 4'}"/><text class="gtxt" x="${pL-8}" y="${(y(t)+4).toFixed(1)}" text-anchor="end">${met==='vmp'?pct(t,0):M.f(t)}</text>`;});
  if(showT){let d='';pre.forEach((v,i)=>{const cx=pL+i*step+step/2;d+=(i?'L':'M')+cx.toFixed(1)+' '+y(v).toFixed(1);});
    s+=`<path d="${d}" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="4 4"/>`;}
  vals.forEach((v,i)=>{const cx=pL+i*step+step/2,top=Math.min(y(v),y(0)),h=Math.max(1.5,Math.abs(y(v)-y(0)));
    const col=v<0?'var(--neg)':'var(--accent)';
    s+=`<rect class="mbar" data-i="${i}" x="${(cx-bw/2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${col}" style="cursor:default"/>`;
    if(showT){const ty=y(tgt[i]);s+=`<line x1="${(cx-bw/2-5).toFixed(1)}" x2="${(cx+bw/2+5).toFixed(1)}" y1="${ty.toFixed(1)}" y2="${ty.toFixed(1)}" stroke="var(--ink)" stroke-width="2.2"/>`;
      s+=`<circle cx="${cx.toFixed(1)}" cy="${y(pre[i]).toFixed(1)}" r="3" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.6"/>`;}
    s+=`<text class="gtxt" x="${cx.toFixed(1)}" y="${H-pB+18}" text-anchor="middle">${MO[i]}</text>`;});
  s+='</svg>';el.innerHTML=`<div style="overflow-x:auto">${s}</div>`;
  $$('.mbar',el).forEach(r=>{const i=+r.dataset.i,o=ser[i];
    let h=`<div class="tt-t">${MO[i]} ${YEAR}</div><div class="tt-r"><span>${M.l}</span><b class="mono">${M.f(vals[i])}</b></div>`;
    if(showT)h+=`<div class="tt-r"><span>Phasing target</span><b class="mono">${money(tgt[i])}</b></div><div class="tt-r"><span>Before phasing</span><b class="mono">${money(pre[i])}</b></div>`;
    h+=`<div class="tt-r"><span>VM %</span><b class="mono">${o.ns?pct(o.vmp):'–'}</b></div>`;
    r.addEventListener('mousemove',e=>ttShow(h,e));r.addEventListener('mouseleave',ttHide);});
}
function renderMON(){
  const K=monK(),MD=MONS[K],ML=MD.lab,BL=DS[MD.base].lab,MON_M=[...new Set(MD.R.map(r=>r.m))].sort();
  $$('#monDs button').forEach(b=>b.classList.toggle('on',b.dataset.k===K));$('#monTitle').textContent=`${ML} · month by month`;
  const rs=mRows(),ser=mSeries(rs),T=cAgg(rs),aB=allBrands(),met=S.monMetric;
  $$('#monMetric button').forEach(b=>b.classList.toggle('on',b.dataset.m===met));
  $$('#monHeatSeg button').forEach(b=>b.classList.toggle('on',b.dataset.m===S.monHeat));
  const pre=aB?mLine(MD.pre):null,tgt=aB?mLine(MD.tgt):null,preT=pre?pre.reduce((a,b)=>a+b,0):0,tgtT=tgt?tgt.reduce((a,b)=>a+b,0):0;
  const O=cAgg(cRows(MD.base)),miss=[...S.m].filter(m=>m!==CENTRAL&&!MON_M.includes(m));
  const nsv=ser.map(o=>o.ns),pk=nsv.indexOf(Math.max(...nsv)),h2=T.ns?nsv.slice(6).reduce((a,b)=>a+b,0)/T.ns:0;
  const q=[0,3,6,9].map(i=>nsv.slice(i,i+3).reduce((a,b)=>a+b,0));
  const varMax=tgt?Math.max(...nsv.map((v,i)=>Math.abs(v-tgt[i]))):null;
  $('#monScope').textContent=scope();
  // narrative
  let n;
  if(!rs.length)n=`None of the selected markets is in the ${BL}. The phased data covers ${MON_M.length} markets: ${MON_M.map(cName).join(', ')}.`;
  else{n=`${ML} net revenue is <b class="mono">${money(T.ns)}</b> for the year, against <b class="mono">${money(O.ns)}</b> in the ${BL} before phasing (${O.ns?pchg(T.ns/O.ns-1):'new'}). `
    +`The peak month is <b>${MO[pk]}</b> at <b class="mono">${money(nsv[pk])}</b>; the second half carries <b>${pct(h2)}</b> of the year and Q4 alone <b>${T.ns?pct(q[3]/T.ns):'–'}</b>. `
    +`Variable Margin is <b class="mono">${money(T.vm)}</b> (${pct(T.vmp)}).`;
    n+=aB?` Each month ties to the monthly phasing target to within <b class="mono">${money0(varMax)}</b>.`:` <span style="color:var(--muted)">Phasing targets are set per market and channel, so the target comparison is hidden while a brand filter is on.</span>`;
    if(miss.length)n+=` <span style="color:var(--muted)">Not in the ${BL}: ${miss.map(cName).join(', ')}.</span>`;}
  $('#monNarr').innerHTML=n;
  // KPIs
  $('#kpiMon').innerHTML=kpi('Net Revenue · FY',money(T.ns),`${dPct(O.ns,T.ns)} vs ${BL} ${money(O.ns)}`)
    +kpi('Variable Margin',money(T.vm),`${pct(T.vmp)} of NS · ${O.ns?dPts(T.vmp-O.vmp):''}`)
    +kpi('Peak month',rs.length?MO[pk]:'–',rs.length?`${money(nsv[pk])} · ${T.ns?pct(nsv[pk]/T.ns):'–'} of FY`:'')
    +kpi('Second half',pct(h2),`Q3 ${T.ns?pct(q[2]/T.ns):'–'} · Q4 ${T.ns?pct(q[3]/T.ns):'–'}`)
    +kpi('Phasing tie',aB?money0(varMax):'n/a',aB?`max monthly gap · target FY ${money(tgtT)}`:'brand filter on');
  // chart
  $('#monChartT').textContent=`${MMET[met].l} by month`;
  monChart($('#monChart'),ser,pre,tgt,met);
  $('#monLeg').innerHTML=`<span><span class="swatch" style="background:var(--accent)"></span>${ML}</span>`
    +(met==='ns'&&aB?`<span><span class="swatch" style="background:var(--ink);height:3px"></span>Monthly phasing target</span><span><span class="swatch" style="background:none;border:1.6px dashed var(--muted)"></span>${BL} before phasing</span>`:'');
  // monthly P&L
  const LINES=[['Units','u'],['Gross Sales','gs'],['Allowances','al',1],['Net Sales','ns',0,1],['COGS','cogs'],['Gross Profit','gp',0,1],['Royalties','roy'],['GMR','gmr',0,1],['Warehousing','wh'],['Freight Out','fr'],['Variable Margin','vm',0,1],['VM %','vmp',0,0,1]];
  let t=`<thead><tr><th>USD</th>${MO.map(m=>`<th>${m}</th>`).join('')}<th>FY</th></tr></thead><tbody>`;
  LINES.forEach(l=>{const st=l[3]?' style="font-weight:700"':'',f=l[4]?(o=>o.ns?pct(o.vmp):'–'):(l[1]==='u'?(o=>units(o.u)):(o=>money(l[2]?-o[l[1]]:o[l[1]])));
    t+=`<tr${st}><td>${l[0]}</td>${ser.map(o=>`<td class="mono">${f(o)}</td>`).join('')}<td class="mono" style="font-weight:700">${f(T)}</td></tr>`;});
  if(aB){t+=`<tr class="bench"><td>Phasing target (NR)</td>${tgt.map(v=>`<td class="mono">${money(v)}</td>`).join('')}<td class="mono">${money(tgtT)}</td></tr>`;
    t+=`<tr class="bench"><td>Before phasing (NR)</td>${pre.map(v=>`<td class="mono">${money(v)}</td>`).join('')}<td class="mono">${money(preT)}</td></tr>`;}
  $('#monPL').innerHTML=t+'</tbody>';
  // market x month heat
  const hm=S.monHeat,mk={};rs.forEach(r=>{const x=mk[r.m]??={mo:MO.map(()=>[])};x.mo[r.mo-1].push(r);});
  const mrows=Object.entries(mk).map(([m,x])=>{const s=x.mo.map(cAgg);return {m,s,fy:cAgg(s.flatMap((_,i)=>x.mo[i]))};}).sort((a,b)=>b.fy.ns-a.fy.ns);
  let hh=`<table class="heat pheat"><thead><tr><th></th>${MO.map(m=>`<th>${m}</th>`).join('')}<th>FY</th></tr></thead><tbody>`;
  mrows.forEach(r=>{hh+=`<tr><td class="rowhead">${cName(r.m)}</td>`;
    r.s.forEach((o,i)=>{const v=hm==='share'?(r.fy.ns?o.ns/r.fy.ns:0):o.vmp,bg=hm==='share'?heatColor(v,'ns'):(o.ns?heatColor(v,'gmp'):'var(--surface-2)');
      hh+=`<td class="cell mhc" style="background:${bg}" data-t="${cName(r.m)} · ${MO[i]}" data-ns="${o.ns}" data-vm="${o.vm}" data-sh="${r.fy.ns?o.ns/r.fy.ns:0}">${hm==='share'?(o.ns?pct(v,0):'–'):(o.ns?pct(v,0):'–')}</td>`;});
    hh+=`<td class="cell emea">${hm==='share'?money(r.fy.ns):pct(r.fy.vmp,0)}</td></tr>`;});
  $('#monHeat').innerHTML=hh+'</tbody></table>';
  $$('#monHeat .mhc').forEach(c=>{const h=`<div class="tt-t">${c.dataset.t}</div><div class="tt-r"><span>Net Revenue</span><b class="mono">${money(+c.dataset.ns)}</b></div><div class="tt-r"><span>Share of market FY</span><b class="mono">${pct(+c.dataset.sh)}</b></div><div class="tt-r"><span>VM</span><b class="mono">${money(+c.dataset.vm)}</b></div>`;
    c.addEventListener('mousemove',e=>ttShow(h,e));c.addEventListener('mouseleave',ttHide);});
  $('#monHeatNote').textContent=hm==='share'?'Each cell = that month’s share of the market’s full-year net revenue (darker blue = bigger month). FY column = full-year net revenue.':'Each cell = Variable Margin as % of net sales in that month (green above 50%, red below). Logistics, Display and MPV are full-year rates applied to each month.';
  // phasing check
  let ck='<thead><tr><th>Month</th><th>Before phasing</th><th>Target</th><th>Phased</th><th>Uplift</th><th>Gap</th></tr></thead><tbody>';
  if(aB){MO.forEach((m,i)=>{const up=pre[i]?nsv[i]/pre[i]:0,g=nsv[i]-tgt[i];
      ck+=`<tr><td>${m}</td><td class="mono">${money(pre[i])}</td><td class="mono">${money(tgt[i])}</td><td class="mono">${money(nsv[i])}</td><td class="mono"><span class="mv ${up>1.0005?'p':up<0.9995?'n':'z'}" style="margin:0">${pre[i]?'×'+up.toFixed(2):'–'}</span></td><td class="mono">${Math.abs(g)<1?'$0':signed(g,money0)}</td></tr>`;});
    ck+=`<tr class="totrow"><td>FY</td><td class="mono">${money(preT)}</td><td class="mono">${money(tgtT)}</td><td class="mono">${money(T.ns)}</td><td class="mono">${preT?'×'+(T.ns/preT).toFixed(2):'–'}</td><td class="mono">${signed(T.ns-tgtT,money0)}</td></tr>`;}
  else ck+='<tr><td colspan="6" style="text-align:left;color:var(--muted)">Clear the brand filter to compare with the phasing targets (they are set per market and channel).</td></tr>';
  $('#monChk').innerHTML=ck+'</tbody>';
  // brand x month
  const bk={};rs.forEach(r=>{(bk[r.b]??=MO.map(()=>[]))[r.mo-1].push(r);});
  const brs=Object.entries(bk).map(([b,x])=>({b,s:x.map(cAgg),fy:cAgg(x.flat())})).sort((a,b)=>b.fy.ns-a.fy.ns);
  let bt=`<thead><tr><th>Brand · Net Revenue</th>${MO.map(m=>`<th>${m}</th>`).join('')}<th>FY</th><th>VM%</th></tr></thead><tbody>`;
  brs.forEach(r=>{const mxv=Math.max(...r.s.map(o=>o.ns));bt+=`<tr><td>${r.b}</td>${r.s.map(o=>`<td class="mono"${o.ns===mxv&&mxv>0?' style="color:var(--accent-ink);font-weight:700"':''}>${money(o.ns)}</td>`).join('')}<td class="mono" style="font-weight:700">${money(r.fy.ns)}</td><td class="mono">${r.fy.ns?pct(r.fy.vmp):'–'}</td></tr>`;});
  bt+=`<tr class="totrow"><td>Total</td>${ser.map(o=>`<td class="mono">${money(o.ns)}</td>`).join('')}<td class="mono">${money(T.ns)}</td><td class="mono">${T.ns?pct(T.vmp):'–'}</td></tr>`;
  $('#monBr').innerHTML=bt+'</tbody>';
}

$$('#monMetric button').forEach(b=>b.addEventListener('click',()=>{S.monMetric=b.dataset.m;renderMON();}));
$$('#monDs button').forEach(b=>b.addEventListener('click',()=>{S.monK=b.dataset.k;renderMON();}));
$$('#monHeatSeg button').forEach(b=>b.addEventListener('click',()=>{S.monHeat=b.dataset.m;renderMON();}));

