// ---------- Base scenario views (Overview, Market Health, Brand Health) ----------
// Base = the Current forecast chosen in the header. Market submissions carry the full P&L down to Operating Profit; the central
// forecast datasets stop at Variable Margin, so their rows are mapped onto the same shape: gm = Gross Profit, co = GMR, op = VM.
// Every row carries L = cost lines (positive amounts): submissions pc, roy, dt, ap, ss, sw, ol, ms, ia, ad; central pc, roy, wh, fr.
const isSub=()=>S.slot.cur==='sub';
function LBL(){return isSub()
  ?{gm:'Gross Margin',gmS:'GM',co:'Contribution',coS:'Contr.',op:'Operating Profit',opS:'Op',opl:'operating profit',src:'Market submissions',
    steps:['Cost of Goods','Gross Margin','Variable OH','Contribution','Fixed OH','Operating Profit'],
    bridge:'Gross sales less allowances = net sales; less inventory cost and variance = gross margin; less royalties, development & tooling, A&P and special shipping = contribution; less shipping & warehousing and local and central overheads = operating profit.'}
  :{gm:'Gross Profit',gmS:'GP',co:'GMR',coS:'GMR',op:'Variable Margin',opS:'VM',opl:'variable margin',src:DS[S.slot.cur].full,
    steps:['Product Cost','Gross Profit','Royalties','GMR','Logistics','Variable Margin'],
    bridge:'Central forecast: gross sales less allowances = net revenue; less product cost = gross profit; less royalties = GMR; less warehousing and freight = variable margin. A&P and overheads are not in the central forecast (see What stands out, section 3).'};}
const _cm=new Map();
function centralRows(k){let r=_cm.get(k);if(!r){r=DS[k].rows.map(x=>({m:x.m,ch:x.ch,b:x.b,u:x.u,gs:x.gs,al:x.al,ns:x.ns,gm:x.gp,co:x.gmr,op:x.vm,L:{pc:-x.cogs,roy:-x.roy,wh:-x.wh,fr:-x.fr}}));_cm.set(k,r);}return r;}
// Rows of any dataset on the base-view shape, with the rail filters (and the closeouts / central-cost toggles for submissions);
// mk = optional market set (like-for-like).
function pRows(k,mk){const aB=allBrands(),f=g=>S.m.has(g.m)&&S.ch.has(g.ch)&&(aB||S.b.has(g.b))&&(!mk||mk.has(g.m));
  if(k==='sub')return src().filter(g=>f(g)&&(S.co||g.b!==CLOSE));return DS[k]&&!DS[k].pending?centralRows(k).filter(f):[];}
function rows(){return pRows(S.slot.cur);}
// Full P&L lines per dataset kind: [key, label, value(T), type]; type sub = subtotal, cost lines are shown negative.
const PL_SUB=[['gs','Gross sales',T=>T.gs],['al','Allowances',T=>-T.al],['ns','Net sales',T=>T.ns,'sub'],['pc','Inventory cost',T=>-T.L.pc],['gm','Gross margin',T=>T.gm,'sub'],
  ['roy','Royalties',T=>-T.L.roy],['dt','Development & tooling',T=>-T.L.dt],['ap','A&P',T=>-T.L.ap],['ss','Special shipping',T=>-T.L.ss],['co','Contribution',T=>T.co,'sub'],
  ['sw','Shipping & warehousing',T=>-T.L.sw],['ol','Other local overhead',T=>-T.L.ol],['ms','Marketing & sales',T=>-T.L.ms],['ia','Amortisation',T=>-T.L.ia],['ad','Administration',T=>-T.L.ad],['op','Operating profit',T=>T.op,'sub']];
const PL_CEN=[['gs','Gross sales',T=>T.gs],['al','Allowances',T=>-T.al],['ns','Net revenue',T=>T.ns,'sub'],['pc','Product cost',T=>-T.L.pc],['gm','Gross profit',T=>T.gm,'sub'],
  ['roy','Royalties',T=>-T.L.roy],['gmr','GMR',T=>T.co,'sub'],['wh','Warehousing',T=>-T.L.wh],['fr','Freight',T=>-T.L.fr],['vm','Variable margin',T=>T.op,'sub']];
const vmLfl=(T,k)=>k==='sub'?T.gm-T.L.roy-T.L.sw:T.op;   // like-for-like VM: submissions GM − royalty − S&W
function plAgg(rs){const T={gs:0,al:0,ns:0,gm:0,co:0,op:0,L:{}};rs.forEach(r=>{T.gs+=r.gs;T.al+=r.al;T.ns+=r.ns;T.gm+=r.gm;T.co+=r.co;T.op+=r.op;for(const k in r.L)T.L[k]=(T.L[k]||0)+r.L[k];});
  ['pc','roy','dt','ap','ss','sw','ol','ms','ia','ad','wh','fr'].forEach(k=>T.L[k]=T.L[k]||0);return T;}
function renderPL(){const ck=S.slot.cur,pk=S.slot.pri,A=DS[ck],B=DS[pk],hasP=!B.pending&&pk!==ck;$('#ovLfl').classList.toggle('on',!!S.plLfl);
  const lfl=hasP&&S.plLfl?new Set([...A.mk].filter(m=>B.mk.has(m))):null,C=plAgg(pRows(ck,lfl)),P=hasP?plAgg(pRows(pk,lfl)):null;
  const spec=ck==='sub'?PL_SUB:PL_CEN,pspec=pk==='sub'?PL_SUB:PL_CEN,pv=Object.fromEntries(pspec.map(s=>[s[0],s[2]]));
  const sh=D=>D.k==='sub'?'Submissions':D.lab,nM=(D,mk)=>[...D.mk].filter(m=>S.m.has(m)&&(!mk||mk.has(m))).length;
  // vertical %: lines on net sales with their sign (costs negative); allowances as a positive share of gross sales
  const vr=(v,T,k)=>k==='al'?(T.gs?-v/T.gs:null):(T.ns?v/T.ns:null),pc1=v=>v==null?'–':pct(v),
    head=`<thead><tr><th rowspan="2">${ck==='sub'?'Market submissions P&amp;L':'Central forecast P&amp;L'}</th><th class="grp" colspan="2">${sh(A)} · ${nM(A,lfl)} mkts</th>${P?`<th class="grp" colspan="2">${sh(B)} · ${nM(B,lfl)} mkts</th><th class="grp" colspan="3">Change${lfl?' · like-for-like':''}</th>`:''}</tr>
      <tr><th>$</th><th>% NR</th>${P?'<th>$</th><th>% NR</th><th>Δ $</th><th>Δ %</th><th>Δ pts</th>':''}</tr></thead>`;
  const line=(key,lab,c,p,typ,memo)=>{const cr=vr(c,C,key),has=P&&p!=null,pr=has?vr(p,P,key):null,d=has?c-p:null,dp=has&&cr!=null&&pr!=null?cr-pr:null,gd=key==='al'?-1:1;
    return `<tr class="${typ==='sub'?'subt':''}${memo?' memo':''}"><td class="${typ==='sub'||key==='gs'?'':'ind'}">${lab}${key==='al'?' <span class="eyebrow" style="letter-spacing:.04em">% of gross</span>':''}</td><td class="mono">${money(c)}</td><td class="mono vp">${pc1(cr)}</td>
      ${P?`<td class="mono">${has?money(p):'–'}</td><td class="mono vp">${has?pc1(pr):'–'}</td><td class="mono ${has?cls3(d):''}">${has?signed(d,money):'–'}</td><td class="mono ${has?cls3(d):''}">${has&&p?pchg(c/p-1):'–'}</td><td class="mono ${dp==null?'':cls3(dp,gd,0.0005)}">${dp==null?'–':dpts(dp)}</td>`:''}</tr>`;};
  let h=head+'<tbody>';spec.forEach(([k,lab,f,typ])=>{const c=f(C);if(Math.abs(c)<1&&!typ&&!(P&&pv[k]&&Math.abs(pv[k](P))>=1))return;h+=line(k,lab,c,P&&pv[k]?pv[k](P):null,typ);});
  if(P&&(ck==='sub')!==(pk==='sub'))h+=line('vmx','VM, like-for-like',vmLfl(C,ck),vmLfl(P,pk),'sub',1);
  $('#ovPL').innerHTML=h+'</tbody>';
  $('#ovPLT').textContent=`EMEA P&L · ${A.lab}${P?` vs ${B.lab}`:''}`;
  $('#ovPLSub').textContent=`${scope()} · ${lfl?`like-for-like: ${lfl.size} markets in both`:P?`all markets in each (${A.mk.size} vs ${B.mk.size})`:'no prior forecast selected'}`;
  $('#ovPLNote').innerHTML=`Vertical analysis: each line as % of ${ck==='sub'?'net sales':'net revenue'}; allowances as % of gross sales. Product cost = ${ck==='sub'?'inventory cost and inventory variance':'standard cost'}. Costs shown negative; green / red = better / worse vs prior (Δ pts on costs: a smaller cost share is better).${(ck==='sub')!==(pk==='sub')&&P?' The two datasets have different line structures: lines missing in one show “–”; “VM, like-for-like” compares them on one definition (gross margin − royalties − logistics). Submission gross margin is after inventory cost only; central gross profit is after standard cost.':''}${!lfl&&P&&A.mk.size!==B.mk.size?' Market coverage differs; switch on Like-for-like for a same-market comparison.':''}${ck==='sub'?` Closeouts ${S.co?'included':'excluded'}; central costs ${S.view==='alloc'?'allocated':'separate'}.`:''}`;}
// Bridge: each bar labelled inside with its % of net revenue (allowances: % of gross sales); thin bars get the label above.
function waterfall(el,T){const Lb=LBL(),st=Lb.steps,NS=isSub()?"Net Sales":"Net Revenue";
  const steps=[{l:"Gross Sales",v:T.gs,t:"start"},{l:"Allowances",v:-T.al,t:"dec"},{l:NS,t:"sub"},
    {l:st[0],v:-(T.ns-T.gm),t:"dec"},{l:st[1],t:"sub"},{l:st[2],v:-(T.gm-T.co),t:"dec"},{l:st[3],t:"sub"},{l:st[4],v:-(T.co-T.op),t:"dec"},{l:st[5],t:"end"}];
  let run=0;const bars=[];steps.forEach(s=>{if(s.t==="start"){bars.push({...s,y0:0,y1:s.v,val:s.v});run=s.v;}
    else if(s.t==="sub"||s.t==="end"){bars.push({...s,y0:0,y1:run,val:run,total:true});}else{bars.push({...s,y0:run,y1:run+s.v,val:s.v});run+=s.v;}});
  const W=560,H=330,padT=34,padB=46,maxV=Math.max(...bars.map(b=>Math.max(b.y0,b.y1)),0),minV=Math.min(...bars.map(b=>Math.min(b.y0,b.y1)),0);
  const span=(maxV-minV)||1,y=v=>padT+(maxV-v)/span*(H-padT-padB),step=(W-12)/bars.length,bw=Math.min(46,step-12);
  let svg=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="P&L bridge"><line class="axis" x1="4" x2="${W-4}" y1="${y(0)}" y2="${y(0)}"/>`;
  bars.forEach((b,i)=>{const cx=6+i*step+step/2,x=cx-bw/2,top=Math.min(y(b.y0),y(b.y1)),h=Math.max(2,Math.abs(y(b.y0)-y(b.y1)));
    const fill=b.total?"var(--c-total)":(b.val>=0?"var(--pos)":"var(--neg)");
    const p=b.l==="Allowances"?(T.gs?Math.abs(b.val)/T.gs:0):(T.ns?Math.abs(b.val)/T.ns:0),ptxt=b.l==="Gross Sales"?`${T.ns?(T.gs/T.ns*100).toFixed(0):"–"}%`:(p*100).toFixed(1)+"%";
    if(i<bars.length-1){const nx=6+(i+1)*step+step/2-bw/2,yy=y(b.y1);svg+=`<line class="conn" x1="${x+bw}" x2="${nx}" y1="${yy}" y2="${yy}"/>`;}
    svg+=`<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" class="wf" data-l="${b.l}" data-v="${b.val}" data-p="${ptxt}" data-b="${b.l==="Allowances"?"gross sales":NS.toLowerCase()}"/>`;
    svg+=`<text class="blab" x="${cx}" y="${(top-(h>=18?7:19)).toFixed(1)}" text-anchor="middle">${b.total?money(b.val):signed(b.val,money)}</text>`;
    svg+=h>=18?`<text class="inlab" x="${cx}" y="${(top+Math.min(h/2,22)+4).toFixed(1)}" text-anchor="middle">${ptxt}</text>`:`<text class="outlab" x="${cx}" y="${(top-6).toFixed(1)}" text-anchor="middle">${ptxt}</text>`;
    const w=b.l.split(" ");svg+=`<text class="gtxt" x="${cx}" y="${H-padB+16}" text-anchor="middle">${w[0]}</text>`;if(w[1])svg+=`<text class="gtxt" x="${cx}" y="${H-padB+29}" text-anchor="middle">${w.slice(1).join(" ")}</text>`;});
  el.innerHTML=svg+"</svg>";
  $$(".wf",el).forEach(r=>{r.addEventListener("mousemove",e=>ttShow(`<div class="tt-t">${r.dataset.l}</div><div class="tt-r"><span>USD</span><b class="mono">${money0(+r.dataset.v)}</b></div><div class="tt-r"><span>% of ${r.dataset.b}</span><b class="mono">${r.dataset.p}</b></div>`,e));r.addEventListener("mouseleave",ttHide);});}
function renderOv(){const rs=rows(),T=agg(rs),Lb=LBL(),lns=isSub()?localNS(T):'',D=DS[S.slot.cur];
  $('#ovEyebrow').textContent=`Executive read · ${D.lab} (current forecast)`;
  $('#kpiOv').innerHTML=kpi(isSub()?'Net Sales':'Net Revenue',money(T.ns),pct(T.alpX)+' allowances'+(isSub()?' ex-closeouts':'')+(lns?` · <b style="color:var(--accent-ink)">${lns}</b>`:''))+kpi(Lb.gm,money(T.gm),pct(T.gmp)+' of net sales')
    +kpi(Lb.co,money(T.co),pct(T.cop)+' of net sales')+kpi(Lb.op,money(T.op),pct(T.opp)+' of net sales')+kpi('Units',units(T.u),'');
  renderPL();$('#ovBridgeT').textContent=`P&L bridge · ${D.lab}`;$('#ovScope').textContent=scope();waterfall($('#waterfall'),T);$('#ovBridgeNote').textContent=Lb.bridge;
  $('#narr').innerHTML=narr(rs,T);if(typeof renderStandout==='function')renderStandout(rs,T);}
function narr(rs,T){const Lb=LBL(),mk=by(rs,'m'),br=by(rs,'b');const topM=[...mk].sort((a,b)=>b.op-a.op)[0],topB=[...br].filter(b=>b.ns>0).sort((a,b)=>b.op-a.op)[0];
  const negM=mk.filter(m=>m.op<0),negB=br.filter(b=>b.op<0),P=DS[S.slot.pri];
  let p=[`<b>${DS[S.slot.cur].lab}</b> covers <b class="mono">${money(T.ns)}</b> of net sales across <b>${mk.filter(m=>m.ns>0).length}</b> markets and <b>${br.filter(b=>b.ns>0).length}</b> brands, at <b>${pct(T.gmp)}</b> ${Lb.gm.toLowerCase()} and <b>${pct(T.opp)}</b> ${Lb.opl} (<b class="mono">${money(T.op)}</b>)${isSub()&&S.view==='alloc'?' after allocated central costs':''}.`];
  if(!P.pending&&S.slot.pri!==S.slot.cur){const lfl=new Set([...DS[S.slot.cur].mk].filter(m=>P.mk.has(m))),C=cAgg(dsRows(S.slot.cur,lfl)),Q=cAgg(dsRows(S.slot.pri,lfl));
    if(Q.ns)p.push(`Against ${P.lab} (like-for-like, ${lfl.size} markets), net revenue is <b>${pchg(C.ns/Q.ns-1)}</b> and VM <b>${signed(C.vm-Q.vm,money)}</b> (${dpts(C.vmp-Q.vmp)}).`);}
  if(topM)p.push(`<span class="hl">${mName(topM.key)}</span> contributes most ${Lb.opl} (<b class="mono">${money(topM.op)}</b>);`);
  if(topB)p.push(`<span class="hl">${topB.key}</span> leads brands at <b class="mono">${money(topB.op)}</b>.`);
  if(negM.length||negB.length)p.push(`<b style="color:var(--neg)">${negM.length} market${negM.length!==1?'s':''}</b> and <b style="color:var(--neg)">${negB.length} brand${negB.length!==1?'s':''}</b> are below zero ${Lb.opl}.`);
  return p.join(' ');}
function syncMetricLabels(){const Lb=LBL();
  const mm={opp:`${Lb.opS} %`,gmp:`${Lb.gmS} %`,ns:'Net Sales',op:`${Lb.opS} $`};$$('#mMetric button').forEach(b=>b.textContent=mm[b.dataset.m]);
  const hm={opp:`${Lb.opS} %`,gmp:`${Lb.gmS} %`,ns:'Net Sales share'};$$('#hMetric button').forEach(b=>b.textContent=hm[b.dataset.m]);}
function renderMkt(){const rs=rows(),T=agg(rs),Lb=LBL();syncMetricLabels();
  const mk=by(rs,'m'),mkS=mk.filter(m=>m.ns>0),bestM=[...mkS].sort((a,b)=>b.opp-a.opp)[0];
  $('#kpiMkt').innerHTML=kpi('Markets',mkS.length,`${DS[S.slot.cur].lab}${isSub()?(S.view==='alloc'?' · central costs allocated':' · central costs separate'):''}`)+kpi(`Best ${Lb.opS} margin`,bestM?mName(bestM.key):'–',bestM?pct(bestM.opp):'')
    +kpi(`Negative ${Lb.opS}`,mk.filter(m=>m.op<0).length,'markets')+kpi(`Average ${Lb.opS} %`,pct(T.opp),'of net sales');
  const mm=S.mMetric,mval=d=>mm==='ns'?d.ns:mm==='op'?d.op:mm==='gmp'?d.gmp:d.opp;
  const mfmt=(mm==='ns'||mm==='op')?money:(v=>pct(v));
  const mcol=(mm==='ns')?(()=>'var(--accent)'):(mm==='gmp')?(()=>'var(--blue)'):((d,v)=>v>=0?'var(--pos)':'var(--neg)');
  genBars($('#mktBars'),(mm==='op'?[...mk]:[...mkS]).sort((a,b)=>mval(b)-mval(a)),mval,mfmt,mcol,
    d=>`<div class="tt-t">${mName(d.key)}</div><div class="tt-r"><span>Net Sales</span><b class="mono">${money(d.ns)}</b></div><div class="tt-r"><span>${Lb.gmS} %</span><b class="mono">${pctNS(d,'gmp')}</b></div><div class="tt-r"><span>${Lb.op}</span><b class="mono">${money(d.op)}</b></div><div class="tt-r"><span>${Lb.opS} %</span><b class="mono">${pctNS(d,'opp')}</b></div>`,d=>mName(d.key),d=>d.key);
  $$('#mktBars .br').forEach(el=>el.addEventListener('click',()=>drillMarket(el.dataset.key)));
  mktChan($('#mktChan'),rs);
  $('#mChanNote').textContent=`${Lb.opS} margin by market and channel. Direct Import (FOB) carries no local logistics${isSub()?' and less local overhead':''}.`;
  let h=`<thead><tr><th>Market</th><th>Units</th><th>Net Sales</th><th>Allow %</th><th>${Lb.gmS} %</th><th>${Lb.coS} %</th><th>${Lb.op}</th><th>${Lb.opS} %</th><th>Health</th></tr></thead><tbody>`;
  mk.forEach(o=>{h+=`<tr data-mkt="${o.key}" style="cursor:pointer" title="Drill into ${mName(o.key)} brands"><td>${mName(o.key)}</td><td class="mono">${units(o.u)}</td><td class="mono">${money(o.ns)}</td><td class="mono">${o.gsX?pct(o.alpX):'–'}</td><td class="mono">${pctNS(o,'gmp')}</td><td class="mono">${pctNS(o,'cop')}</td><td class="mono">${money(o.op)}</td><td class="mono" style="color:${o.op<0?'var(--neg)':o.opp<0.02?'var(--warn)':'var(--ink)'}">${pctNS(o,'opp')}</td><td>${healthChip(o)}</td></tr>`;});
  h+=`<tr class="totrow"><td>Total</td><td class="mono">${units(T.u)}</td><td class="mono">${money(T.ns)}</td><td class="mono">${pct(T.alpX)}</td><td class="mono">${pct(T.gmp)}</td><td class="mono">${pct(T.cop)}</td><td class="mono">${money(T.op)}</td><td class="mono">${pct(T.opp)}</td><td></td></tr>`;
  $('#mktTbl').innerHTML=h+`</tbody>`;
  $$('#mktTbl tbody tr[data-mkt]').forEach(el=>el.addEventListener('click',()=>drillMarket(el.dataset.mkt)));
  $('#mktNote').innerHTML=`<b>Risk</b> = negative ${Lb.opl}; <b>Watch</b> = thin ${Lb.opS} margin (&lt;2%) or heavy allowances (&gt;40% of gross sales${isSub()?', excl. closeouts':''}). Source: ${Lb.src}.`;}
function renderBrand(){const rs=rows(),T=agg(rs),Lb=LBL();syncMetricLabels();
  const br=by(rs,'b'),top=[...br].sort((a,b)=>b.op-a.op)[0];
  $('#kpiBr').innerHTML=kpi('Brands',br.filter(b=>b.ns>0).length,DS[S.slot.cur].lab)+kpi(`Top by ${Lb.opS}`,top?top.key:'–',top?money(top.op):'')
    +kpi(`Negative ${Lb.opS}`,br.filter(b=>b.op<0).length,'brands')+kpi('Top-5 NS share',pct(sum([...br].slice(0,5),b=>b.ns)/(T.ns||1),0),'concentration');
  heat($('#heat'),rs,S.hMetric);$('#brBarsT').textContent=`${Lb.op} by brand`;
  genBars($('#brBars'),[...br].sort((a,b)=>Math.abs(b.op)-Math.abs(a.op)).slice(0,16).sort((a,b)=>b.op-a.op),d=>d.op,money,(d,v)=>v>=0?'var(--pos)':'var(--neg)',
    d=>`<div class="tt-t">${d.key}</div><div class="tt-r"><span>Net Sales</span><b class="mono">${money(d.ns)}</b></div><div class="tt-r"><span>${Lb.op}</span><b class="mono">${money(d.op)}</b></div><div class="tt-r"><span>${Lb.opS} %</span><b class="mono">${pctNS(d,'opp')}</b></div>`,d=>d.key,d=>d.key);
  $$('#brBars .br').forEach(el=>el.addEventListener('click',()=>{S.b=new Set([el.dataset.key]);render();}));
  let hb=`<thead><tr><th>Brand</th><th>Units</th><th>Net Sales</th><th>${Lb.gmS} %</th><th>${Lb.coS} %</th><th>${Lb.op}</th><th>${Lb.opS} %</th><th>Health</th></tr></thead><tbody>`;
  br.filter(b=>b.ns!==0||Math.abs(b.op)>=1).forEach(o=>{hb+=`<tr><td>${o.key}</td><td class="mono">${units(o.u)}</td><td class="mono">${money(o.ns)}</td><td class="mono">${pctNS(o,'gmp')}</td><td class="mono">${pctNS(o,'cop')}</td><td class="mono">${money(o.op)}</td><td class="mono" style="color:${o.op<0?'var(--neg)':o.opp<0.02?'var(--warn)':'var(--ink)'}">${pctNS(o,'opp')}</td><td>${healthChip(o)}</td></tr>`;});
  hb+=`<tr class="totrow"><td>Total</td><td class="mono">${units(T.u)}</td><td class="mono">${money(T.ns)}</td><td class="mono">${pct(T.gmp)}</td><td class="mono">${pct(T.cop)}</td><td class="mono">${money(T.op)}</td><td class="mono">${pct(T.opp)}</td><td></td></tr>`;
  $('#brTbl').innerHTML=hb+`</tbody>`;}
function mktChan(el,rs){const Lb=LBL(),ms=[...new Set(rs.map(r=>r.m))].sort();const chs=[...S.ch].sort();
  const cell={};rs.forEach(r=>{(cell[r.m]??={})[r.ch]??={ns:0,op:0};cell[r.m][r.ch].ns+=r.ns;cell[r.m][r.ch].op+=r.op;});
  let h='<table class="heat"><thead><tr><th></th>';chs.forEach(c=>h+=`<th>${CH[c]}</th>`);h+='</tr></thead><tbody>';
  ms.forEach(m=>{h+=`<tr><td class="rowhead">${mName(m)}</td>`;chs.forEach(c=>{const x=cell[m]&&cell[m][c];if(!x||x.ns===0){h+='<td class="cell" style="background:var(--surface-2);color:var(--muted)">–</td>';return;}const v=x.op/x.ns;h+=`<td class="cell" style="background:${heatColor(isSub()?v:v-0.4,'opp')}" data-tip="${mName(m)} · ${CH[c]}&#10;${Lb.opS} ${pct(v)}&#10;NS ${money(x.ns)}">${pct(v,0)}</td>`;});h+='</tr>';});
  el.innerHTML=h+'</tbody></table>';
  $$('.cell[data-tip]',el).forEach(c=>{c.addEventListener('mousemove',e=>ttShow(c.dataset.tip.replace(/\n/g,'<br>'),e));c.addEventListener('mouseleave',ttHide);});
  $('#mChanLeg').innerHTML=`<span><span class="swatch" style="background:${heatColor(-0.05,'opp')}"></span>Weak</span><span><span class="swatch" style="background:${heatColor(0.05,'opp')}"></span>Average</span><span><span class="swatch" style="background:${heatColor(0.2,'opp')}"></span>Strong</span>`;}
function heat(el,rs,metric){const Lb=LBL(),ms=[...new Set(rs.map(r=>r.m))].sort(),off=isSub()?0:(metric==='opp'?0.4:0.1);
  const brs=by(rs,'b').filter(b=>b.ns!==0).slice(0,14).map(b=>b.key);
  const cell={},tot=sum(rs,r=>r.ns)||1;rs.forEach(r=>{(cell[r.b]??={})[r.m]??={ns:0,op:0,gm:0};const c=cell[r.b][r.m];c.ns+=r.ns;c.op+=r.op;c.gm+=r.gm;});
  const fmt=metric==='ns'?(c=>c.ns/tot):metric==='gmp'?(c=>c.ns?c.gm/c.ns:null):(c=>c.ns?c.op/c.ns:null);
  let h='<table class="heat"><thead><tr><th></th>';ms.forEach(m=>h+=`<th title="${mName(m)}">${(typeof MS!=='undefined'&&MS[m])||mName(m)}</th>`);h+='</tr></thead><tbody>';
  brs.forEach(b=>{h+=`<tr><td class="rowhead">${b}</td>`;ms.forEach(m=>{const c=cell[b]&&cell[b][m];const v=c&&c.ns?fmt(c):null;if(v===null){h+='<td class="cell" style="background:var(--surface-2);color:var(--muted)">–</td>';return;}
    h+=`<td class="cell" style="background:${heatColor(metric==='ns'?v:v-off,metric)}" data-tip="${b} · ${mName(m)}&#10;${metric==='ns'?'NS share':metric==='gmp'?Lb.gmS+' %':Lb.opS+' %'} ${pct(v)}&#10;NS ${money(c.ns)}">${pct(v,0)}</td>`;});h+='</tr>';});
  el.innerHTML=h+'</tbody></table>';
  $$('.cell[data-tip]',el).forEach(c=>{c.addEventListener('mousemove',e=>ttShow(c.dataset.tip.replace(/\n/g,'<br>'),e));c.addEventListener('mouseleave',ttHide);});
  $('#hLeg').innerHTML=metric==='ns'?`<span>Share of selection net sales (darker = larger)</span>`:`<span><span class="swatch" style="background:${heatColor(metric==='gmp'?0.2:-0.05,metric)}"></span>Lower</span><span><span class="swatch" style="background:${heatColor(metric==='gmp'?0.7:0.2,metric)}"></span>Higher</span>`;}
