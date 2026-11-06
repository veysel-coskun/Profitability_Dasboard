const CFR={};Object.keys(CFC).forEach(k=>CFR[k]=CFC[k].rows.map(a=>({m:a[0],ch:a[1],b:a[2],u:a[3],gs:a[4],al:a[5],ns:a[6],cogs:a[7],gp:a[8],roy:a[9],gmr:a[10],wh:a[11],fr:a[12],vm:a[13]})));

S.cfc='cmp3';
const CF_M=[...new Set(Object.values(CFR).flat().map(r=>r.m))].sort();
function cAgg(rs){const T={u:0,gs:0,al:0,ns:0,cogs:0,gp:0,roy:0,gmr:0,wh:0,fr:0,vm:0};rs.forEach(r=>{for(const k in T)T[k]+=r[k];});
  const n=T.ns;T.alp=T.gs?T.al/T.gs:0;T.gpp=n?T.gp/n:0;T.gmrp=n?T.gmr/n:0;T.vmp=n?T.vm/n:0;T.lgp=n?-(T.wh+T.fr)/n:0;return T;}
function cRows(k){return dsRows(k);}
function cBy(rs,key){const o={};rs.forEach(r=>{(o[r[key]]??=[]).push(r);});const out={};for(const k in o)out[k]=cAgg(o[k]);return out;}
const cName=m=>mName(m).replace(/_/g,' / ');
const pchg=d=>(d>=0?'+':'−')+Math.abs(d*100).toFixed(1)+'%';
const dPts=(d,good=1)=>`<span class="dv ${Math.abs(d)<0.0005?'z':(d*good>0?'p':'n')}">${(d>=0?'+':'−')+Math.abs(d*100).toFixed(1)} pts</span>`;
const dUsd=(d,good=1)=>Math.abs(d)<1000?`<span class="dv z">≈ $0</span>`:`<span class="dv ${d*good>0?"p":"n"}">${signed(d,money)}</span>`;
const dPct=(a,b)=>a?`<span class="dv ${Math.abs(b/a-1)<0.0005?'z':(b>a?'p':'n')}">${pchg(b/a-1)}</span>`:'<span class="dv z">new</span>';
function renderCFC(){const md=S.cfc,cmp=md.startsWith('cmp'),[KA,KB]=({cmp2:['sep','ocp'],cmp3:['ocp','nvp']})[md]||['jul','sep'],LA=CFC[KA].lab,LB=CFC[KB].lab,shL=l=>l.replace(/ (FC|Fcst)/,''),SA=shL(LA),SB=shL(LB),k1=cmp?KB:md,L=CFC[k1].lab;
  $$('#cfcSeg button').forEach(b=>b.classList.toggle('on',b.dataset.v===md));
  const RJ=cRows(KA),RS=cRows(KB),RA=cmp?RS:cRows(k1),J=cAgg(RJ),P=cAgg(RS),A=cAgg(RA),Z=cAgg([]);
  const miss=[...S.m].filter(m=>m!==CENTRAL&&!CF_M.includes(m));
  $('#cfcScope').textContent=scope();
  // narrative
  let n;
  if(!RJ.length&&!RS.length)n=`None of the selected markets is in the central forecast. The central forecasts cover ${CF_M.length} business units: ${CF_M.map(cName).join(', ')}.`;
  else if(cmp)n=`${LB} net sales are <b class="mono">${money(P.ns)}</b> vs <b class="mono">${money(J.ns)}</b> in ${LA} (${J.ns?pchg(P.ns/J.ns-1):'new'}). Variable Margin is <b class="mono">${money(P.vm)}</b> (${pct(P.vmp)}) vs <b class="mono">${money(J.vm)}</b> (${pct(J.vmp)}): <b style="color:${P.vm>=J.vm?'var(--pos)':'var(--neg)'}">${signed(P.vm-J.vm,money)}</b>, ${pts(P.vmp-J.vmp)}. Allowances take <b>${pct(P.alp)}</b> of gross sales (${SA} ${pct(J.alp)}); warehousing and freight take <b>${pct(P.lgp)}</b> of net sales (${SA} ${pct(J.lgp)}).`;
  else n=`${CFC[k1].full}${k1==='sep'?'':' central forecast'}: <b class="mono">${money(A.ns)}</b> net sales, Gross Profit ${pct(A.gpp)}, GMR ${pct(A.gmrp)}, Variable Margin <b class="mono">${money(A.vm)}</b> (${pct(A.vmp)}).`;
  if(miss.length&&(RJ.length||RS.length))n+=` <span style="color:var(--muted)">Not in the central forecast: ${miss.map(cName).join(', ')}.</span>`;
  $('#cfcNarr').innerHTML=n;
  // KPIs
  $('#kpiCfc').innerHTML=cmp
    ?kpi(`Net Sales · ${LB}`,money(P.ns),`${dPct(J.ns,P.ns)} vs ${LA} ${money(J.ns)}`)+kpi('Allowances',pct(P.alp),`of gross sales · ${dPts(P.alp-J.alp,-1)}`)
      +kpi('Gross Profit',money(P.gp),`${pct(P.gpp)} of NS · ${dPts(P.gpp-J.gpp)}`)+kpi('GMR',money(P.gmr),`${pct(P.gmrp)} of NS · ${dPts(P.gmrp-J.gmrp)}`)
      +kpi('Variable Margin',money(P.vm),`${pct(P.vmp)} of NS · ${dUsd(P.vm-J.vm)}`)
    :kpi(`Net Sales · ${L}`,money(A.ns),`${pct(A.alp)} allowances of gross`)+kpi('Gross Profit',money(A.gp),pct(A.gpp)+' of NS')+kpi('GMR',money(A.gmr),pct(A.gmrp)+' of NS')
      +kpi('Variable Margin',money(A.vm),pct(A.vmp)+' of NS')+kpi('Units',units(A.u),'');
  // P&L bridge
  const LINES=[['Gross Sales','gs'],['Allowances','al',1],['Net Sales','ns',0,1],['COGS (standard cost)','cogs'],['Gross Profit','gp',0,1],['Royalties','roy'],['GMR','gmr',0,1],['Warehousing','wh'],['Freight Out','fr'],['Variable Margin','vm',0,1]];
  const v=(T,l)=>l[2]?-T[l[1]]:T[l[1]],pn=(T,x)=>T.ns?pct(x/T.ns):'–';
  let t=cmp?`<thead><tr><th>USD</th><th>${LA}</th><th>% NS</th><th>${LB}</th><th>% NS</th><th>Change</th><th>% NS change</th></tr></thead><tbody>`:`<thead><tr><th>USD</th><th>${L}</th><th>% of NS</th></tr></thead><tbody>`;
  LINES.forEach(l=>{const st=l[3]?' style="font-weight:700"':'',a=v(J,l),b=v(P,l),x=v(A,l);
    t+=cmp?`<tr${st}><td>${l[0]}</td><td class="mono">${money(a)}</td><td class="mono">${pn(J,a)}</td><td class="mono">${money(b)}</td><td class="mono">${pn(P,b)}</td><td class="mono">${dUsd(b-a)}</td><td class="mono">${J.ns&&P.ns&&l[1]!=='ns'&&l[1]!=='gs'?dPts(b/P.ns-a/J.ns):'–'}</td></tr>`
      :`<tr${st}><td>${l[0]}</td><td class="mono">${money(x)}</td><td class="mono">${pn(A,x)}</td></tr>`;});
  $('#cfcPL').innerHTML=t+'</tbody>';
  // VM by market bars
  const mj=cBy(RJ,'m'),mp=cBy(RS,'m'),ma=cmp?mp:cBy(RA,'m'),ms=Object.keys(cmp?{...mj,...mp}:ma);
  if(cmp){$('#cfcBarsT').textContent=`VM change by market (${LB} − ${LA})`;
    const d=ms.map(m=>({m,a:mj[m]||Z,b:mp[m]||Z})).sort((x,y)=>(y.b.vm-y.a.vm)-(x.b.vm-x.a.vm));
    genBars($('#cfcBars'),d,x=>x.b.vm-x.a.vm,x=>signed(x,money),(x,val)=>val>=0?'var(--pos)':'var(--neg)',
      x=>`<div class="tt-t">${cName(x.m)}</div><div class="tt-r"><span>VM ${LA}</span><b class="mono">${money(x.a.vm)}</b></div><div class="tt-r"><span>VM ${LB}</span><b class="mono">${money(x.b.vm)}</b></div><div class="tt-r"><span>VM %</span><b class="mono">${pct(x.a.vmp)} → ${pct(x.b.vmp)}</b></div>`,x=>cName(x.m),x=>x.m);}
  else{$('#cfcBarsT').textContent=`VM % by market · ${L}`;
    const d=ms.map(m=>({m,o:ma[m]})).filter(x=>x.o.ns>0).sort((x,y)=>y.o.vmp-x.o.vmp);
    genBars($('#cfcBars'),d,x=>x.o.vmp,x=>pct(x),(x,val)=>val>=0?'var(--pos)':'var(--neg)',
      x=>`<div class="tt-t">${cName(x.m)}</div><div class="tt-r"><span>Net Sales</span><b class="mono">${money(x.o.ns)}</b></div><div class="tt-r"><span>VM</span><b class="mono">${money(x.o.vm)}</b></div>`,x=>cName(x.m),x=>x.m);}
  $$('#cfcBars .br').forEach(el=>el.addEventListener('click',()=>{S.m=new Set([el.dataset.key]);render();}));
  // market & brand tables
  const tbl=(key,el,nameF)=>{const bj=cBy(RJ,key),bs=cBy(RS,key),ba=cmp?bs:cBy(RA,key),sortB=cmp?bs:ba;
    const keys=Object.keys(cmp?{...bj,...bs}:ba).sort((x,y)=>((sortB[y]||Z).ns-(sortB[x]||Z).ns)||((bj[y]||Z).ns-(bj[x]||Z).ns));let h;
    if(cmp){h=`<thead><tr><th></th><th>NS ${SA}</th><th>NS ${SB}</th><th>Δ NS</th><th>Allow% ${SB}</th><th>GP% ${SB}</th><th>VM ${SA}</th><th>VM ${SB}</th><th>Δ VM</th><th>VM% ${SA}</th><th>VM% ${SB}</th></tr></thead><tbody>`;
      const row=(nm,a,b,c)=>`<tr${c||''}><td>${nm}</td><td class="mono">${money(a.ns)}</td><td class="mono">${money(b.ns)}</td><td class="mono">${dPct(a.ns,b.ns)}</td><td class="mono">${b.gs?pct(b.alp):'–'}${a.gs&&b.gs?dPts(b.alp-a.alp,-1):''}</td><td class="mono">${b.ns?pct(b.gpp):'–'}${a.ns&&b.ns?dPts(b.gpp-a.gpp):''}</td><td class="mono">${money(a.vm)}</td><td class="mono">${money(b.vm)}</td><td class="mono">${dUsd(b.vm-a.vm)}</td><td class="mono">${a.ns?pct(a.vmp):'–'}</td><td class="mono" style="color:${b.vm<0?'var(--neg)':'var(--ink)'}">${b.ns?pct(b.vmp):'–'}${a.ns&&b.ns?dPts(b.vmp-a.vmp):''}</td></tr>`;
      keys.forEach(k=>h+=row(nameF(k),bj[k]||Z,bs[k]||Z));h+=row('Total',J,P,' class="totrow"');}
    else{h='<thead><tr><th></th><th>Units</th><th>Gross Sales</th><th>Net Sales</th><th>Allow%</th><th>GP%</th><th>GMR%</th><th>VM</th><th>VM%</th></tr></thead><tbody>';
      const row=(nm,o,c)=>`<tr${c||''}><td>${nm}</td><td class="mono">${units(o.u)}</td><td class="mono">${money(o.gs)}</td><td class="mono">${money(o.ns)}</td><td class="mono">${o.gs?pct(o.alp):'–'}</td><td class="mono">${o.ns?pct(o.gpp):'–'}</td><td class="mono">${o.ns?pct(o.gmrp):'–'}</td><td class="mono" style="color:${o.vm<0?'var(--neg)':'var(--ink)'}">${money(o.vm)}</td><td class="mono">${o.ns?pct(o.vmp):'–'}</td></tr>`;
      keys.forEach(k=>h+=row(nameF(k),ba[k]));h+=row('Total',A,' class="totrow"');}
    $(el).innerHTML=h+'</tbody>';};
  tbl('m','#cfcMkt',cName);tbl('b','#cfcBr',k=>k);
  $('#cfcMktT').textContent=cmp?`Markets: ${LA} vs ${LB}`:`Markets · ${L}`;$('#cfcBrT').textContent=cmp?`Brands: ${LA} vs ${LB}`:`Brands · ${L}`;
}
$$('#cfcSeg button').forEach(b=>b.addEventListener('click',()=>{S.cfc=b.dataset.v;renderCFC();}));

