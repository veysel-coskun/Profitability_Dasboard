// ---------- SKU profitability ----------
// SKU rows = Market × Channel × Global SKU from the consolidated USD sheet; central-cost charges spread to SKUs on the same basis as the Allocated view.
const SK=(()=>{if(!SKU)return {list:[],rows:[]};
  const list=SKU.s.map(([id,n,b],i)=>({i,id,n,b}));
  const rows=SKU.r.map(a=>({s:a[0],m:SKU.m[a[1]],ch:a[2],u:a[3],gs:a[4],al:a[5],ns:a[6],gm:a[7],co:a[8],op:a[9],sw:a[10]||0,b:list[a[0]].b})).filter(r=>r.b!==CLOSE);
  const cb={};CEN.forEach(c=>{if(c.b===CLOSE)return;const x=cb[c.b]??={gm:0,co:0,op:0};x.gm+=c.gm;x.co+=c.co;x.op+=c.op;});
  const bNS={};rows.forEach(r=>{if(r.ns>0)bNS[r.b]=(bNS[r.b]||0)+r.ns;});const allNS=sum(rows.filter(r=>r.ns>0),r=>r.ns)||1;
  const orphan={gm:0,co:0,op:0};Object.entries(cb).forEach(([b,x])=>{if(!bNS[b]){orphan.gm+=x.gm;orphan.co+=x.co;orphan.op+=x.op;}});
  rows.forEach(r=>{r.xgm=r.xco=r.xop=0;if(r.ns<=0)return;const x=cb[r.b];if(x&&bNS[r.b]){const s=r.ns/bNS[r.b];r.xgm+=x.gm*s;r.xco+=x.co*s;r.xop+=x.op*s;}
    const s2=r.ns/allNS;r.xgm+=orphan.gm*s2;r.xco+=orphan.co*s2;r.xop+=orphan.op*s2;});
  const tot={};rows.forEach(r=>{tot[r.s]=(tot[r.s]||0)+r.ns;});list.forEach(o=>o.ns=tot[o.i]||0);
  return {list:list.filter(o=>o.b!==CLOSE),byI:list,rows};})();
S.skus=new Set();
function skuRows(){const a=S.view==='alloc';return SK.rows.filter(r=>S.m.has(r.m)&&S.ch.has(r.ch)).map(r=>a?{...r,gm:r.gm+r.xgm,co:r.co+r.xco,op:r.op+r.xop}:r);}
function sAgg(rs){const T=agg(rs);T.nsu=T.u>0?T.ns/T.u:null;T.voh=T.ns?(T.gm-T.co)/T.ns:0;T.foh=T.ns?(T.co-T.op)/T.ns:0;return T;}
const fpp=v=>(v>=0?'+':'−')+Math.abs(v).toFixed(1)+'pp';
const usd2=v=>v==null?'–':'$'+v.toFixed(2);
// good = +1 when higher is better, −1 when lower is better
const SMET=[{k:'alp',l:'Allowance %',good:-1},{k:'gmp',l:'GM %',good:1},{k:'voh',l:'Variable OH %',good:-1},{k:'foh',l:'Fixed OH %',good:-1},{k:'opp',l:'Op profit %',good:1}];
const DEV=3; // pp threshold for a flagged deviation
function dvSpan(sk,bm,k,good){if(!sk.ns||!bm.ns)return '';const d=(sk[k]-bm[k])*100;const c=Math.abs(d)<DEV?'z':(d*good>0?'p':'n');return `<span class="dv ${c}">${fpp(d)}</span>`;}
function fcCall(sk,br,em){if(sk.ns<=0)return {c:'hold',t:'Hold FC',why:'No net sales in the current filters'};
  const dB=(sk.opp-br.opp)*100,dE=(sk.opp-em.opp)*100,dG=(sk.gmp-br.gmp)*100;
  if(sk.op<0)return {c:'down',t:'Reduce FC',why:`Loss-making: ${pct(sk.opp)} operating margin`};
  if(dB>=DEV&&dE>=0&&dG>=-2)return {c:'up',t:'Increase FC',why:`Op margin ${fpp(dB)} vs brand, ${fpp(dE)} vs EMEA`};
  if(dB<=-5&&dE<0)return {c:'down',t:'Reduce FC',why:`Op margin ${fpp(dB)} vs brand, ${fpp(dE)} vs EMEA`};
  return {c:'hold',t:'Hold FC',why:`Op margin ${fpp(dB)} vs brand, ${fpp(dE)} vs EMEA: within range`};}
const ARROW={up:'▲',down:'▼',hold:'■'};
function sCmt(sk,bm,label,worstAl){const out=[];if(!sk.ns||!bm.ns)return out;
  SMET.forEach(({k,l,good})=>{const d=(sk[k]-bm[k])*100;if(Math.abs(d)<DEV)return;const bad=d*good<0;let s='';
    if(k==='alp')s=bad?`Review trade terms and promo depth${worstAl?`, starting in ${worstAl}`:''}.`:`Leaner terms than ${label}: room to fund activation if volume is needed.`;
    if(k==='gmp')s=bad?`Check unit cost against sell price; test a price increase or cost-down, or rationalise the range.`:`Margin premium: protect price and prioritise in listings.`;
    if(k==='voh')s=bad?`A&amp;P, royalty or special-shipping load is heavier than ${label}; review A&amp;P efficiency.`:`Lighter variable cost load than ${label}.`;
    if(k==='foh')s=bad?`Carries more fixed overhead per $ of sales; scale (or exit) to absorb it.`:`Absorbs fixed overhead efficiently.`;
    if(k==='opp')s=bad?`Dilutes ${label} profitability.`:`A profit driver relative to ${label}.`;
    out.push({t:bad?'neg':'pos',h:`${l} ${fpp(d)} vs ${label}`,p:`SKU ${pct(sk[k])} vs ${pct(bm[k])}. ${s}`});});
  return out;}
function donut(share,label){const r=62,c=2*Math.PI*r,v=Math.max(0,Math.min(1,share));
  return `<svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label="${label}"><circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--hair)" stroke-width="22"/>
  <circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--accent)" stroke-width="22" stroke-dasharray="${(c*v).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 80 80)"/>
  <text x="80" y="82" text-anchor="middle" class="donutlab" font-size="22">${pct(v,v<0.1?1:0)}</text><text x="80" y="100" text-anchor="middle" class="donutsub">of brand NS</text></svg>`;}
function renderSku(){if(!SKU){$('#skuCards').innerHTML='<div class="card pad">SKU data not loaded.</div>';return;}
  const rs=skuRows(),EM=sAgg(rs),byS={},byB={},byBM={},byM={};
  rs.forEach(r=>{(byS[r.s]??=[]).push(r);(byB[r.b]??=[]).push(r);(byBM[r.b+'|'+r.m]??=[]).push(r);(byM[r.m]??=[]).push(r);});
  const bA={},bmA={},mA={};const gB=b=>bA[b]??=sAgg(byB[b]||[]),gBM=(b,m)=>bmA[b+'|'+m]??=sAgg(byBM[b+'|'+m]||[]),gM=m=>mA[m]??=sAgg(byM[m]||[]);
  const sel=[...S.skus].map(i=>SK.byI[i]);
  $('#skuSelChips').innerHTML=sel.map(o=>`<span class="ms-tag">${o.id}<button data-rm="${o.i}" title="Remove">×</button></span>`).join('');
  $$('#skuSelChips [data-rm]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();S.skus.delete(+b.dataset.rm);renderSku();skuListDraw();}));
  if(!sel.length){$('#skuCompare').innerHTML='';$('#skuCards').innerHTML='<div class="card pad" style="text-align:center;color:var(--muted)">Pick one or more SKUs above to benchmark them.</div>';return;}
  const info=sel.map(o=>{const sk=sAgg(byS[o.i]||[]),br=gB(o.b);return {o,sk,br,fc:fcCall(sk,br,EM)};});
  // side-by-side comparison
  if(info.length>1){let h=`<div class="card pad" style="margin-bottom:16px"><div class="sec-title"><h3>Selected SKUs compared</h3><span class="eyebrow">vs own brand</span></div><div class="tblwrap"><table><thead><tr><th>SKU</th><th>Brand</th><th>Units</th><th>Net Sales</th><th>NS/unit</th><th>Allow%</th><th>GM%</th><th>Op%</th><th>Share of brand NS</th><th>FC call</th></tr></thead><tbody>`;
    info.forEach(({o,sk,br,fc})=>{h+=`<tr><td><b>${o.id}</b> <span style="color:var(--muted)">${o.n}</span></td><td>${o.b}</td><td class="mono">${units(sk.u)}</td><td class="mono">${money(sk.ns)}</td><td class="mono">${usd2(sk.nsu)}</td><td class="mono">${sk.gsX?pct(sk.alp):'–'}${dvSpan(sk,br,'alp',-1)}</td><td class="mono">${pctNS(sk,'gmp')}${dvSpan(sk,br,'gmp',1)}</td><td class="mono">${pctNS(sk,'opp')}${dvSpan(sk,br,'opp',1)}</td><td class="mono">${br.ns?pct(sk.ns/br.ns):'–'}</td><td><span class="fcmini ${fc.c}">${ARROW[fc.c]} ${fc.t}</span></td></tr>`;});
    $('#skuCompare').innerHTML=h+'</tbody></table></div><div class="note">Small figures under each metric = deviation vs the SKU’s brand (green = better, red = worse, grey = within ±3pp).</div></div>';} else $('#skuCompare').innerHTML='';
  // one card per SKU
  $('#skuCards').innerHTML=info.map(({o,sk,br,fc})=>{
    const mkts=Object.entries((byS[o.i]||[]).reduce((a,r)=>((a[r.m]??=[]).push(r),a),{})).map(([m,v])=>({m,a:sAgg(v)})).sort((x,y)=>y.a.ns-x.a.ns);
    const mc=mkts.map(x=>({...x,bm:gBM(o.b,x.m),fc:fcCall(x.a,gBM(o.b,x.m),gM(x.m))}));
    const worstAl=[...mc].filter(x=>x.a.gsX>0).sort((x,y)=>y.a.alp-x.a.alp)[0];
    const row=(lab,a,bm,cls,fcx)=>`<tr class="${cls||''}"><td>${lab}</td><td class="mono">${units(a.u)}</td><td class="mono">${money(a.ns)}</td><td class="mono">${usd2(a.nsu)}</td><td class="mono">${a.gsX?pct(a.alp):'–'}${bm?dvSpan(a,bm,'alp',-1):''}</td><td class="mono">${pctNS(a,'gmp')}${bm?dvSpan(a,bm,'gmp',1):''}</td><td class="mono">${pctNS(a,'cop')}${bm?dvSpan(a,bm,'cop',1):''}</td><td class="mono">${pctNS(a,'opp')}${bm?dvSpan(a,bm,'opp',1):''}</td><td class="mono" style="color:${a.op<0?'var(--neg)':'var(--ink)'}">${money(a.op)}</td><td>${fcx?`<span class="fcmini ${fcx.c}" title="${fcx.why}">${ARROW[fcx.c]} ${{up:'Up',down:'Cut',hold:'Hold'}[fcx.c]}</span>`:''}</td></tr>`;
    let t=`<table><thead><tr><th>Region</th><th>Units</th><th>Net Sales</th><th>NS/unit</th><th>Allow%</th><th>GM%</th><th>Contr%</th><th>Op%</th><th>Op Profit</th><th>FC</th></tr></thead><tbody>`;
    mc.forEach(x=>t+=row(mName(x.m),x.a,x.bm,'',x.fc));
    t+=row(`<b>SKU · EMEA</b>`,sk,br,'bench',fc)+row(`Brand · ${o.b}`,br,null,'bench')+row('EMEA overall (all SKUs)',EM,null,'bench')+'</tbody></table><div class="note">Small figures = deviation vs '+o.b+' in the same market (EMEA row: vs '+o.b+' EMEA). Green = better, red = worse, grey = within ±'+DEV+'pp. FC per region compares the SKU with the brand in that market.</div>';
    const cB=sCmt(sk,br,'brand',worstAl&&worstAl.a.alp-br.alp>=DEV/100?mName(worstAl.m):''),cE=sCmt(sk,EM,'EMEA');
    const box=(title,items)=>`<div><div class="eyebrow" style="margin-bottom:8px">${title}</div><div class="insights">${items.length?items.map(x=>`<div class="insight ${x.t}"><div class="ico">${x.t==='neg'?'▼':'▲'}</div><div><h4>${x.h}</h4><p>${x.p}</p></div></div>`).join(''):`<div class="insight neu"><div class="ico">=</div><div><h4>In line</h4><p>All metrics within ±${DEV}pp of the benchmark.</p></div></div>`}</div></div>`;
    const up=mc.filter(x=>x.fc.c==='up').map(x=>mName(x.m)),dn=mc.filter(x=>x.fc.c==='down').map(x=>mName(x.m));
    let adv=fc.c==='up'?`Increase FC${up.length?`, prioritising ${up.join(', ')}`:''}${dn.length?`; hold back in ${dn.join(', ')}`:''}.`
      :fc.c==='down'?`Reduce FC${dn.length?`, starting with ${dn.join(', ')}`:''}${up.length?`; ${up.join(', ')} still beat${up.length===1?'s':''} the brand there and can be kept or grown`:''}.`
      :`Hold FC overall${up.length?`; shift volume toward ${up.join(', ')}`:''}${dn.length?`${up.length?' and':'; shift volume'} away from ${dn.join(', ')}`:''}.`;
    if(br.op<0&&Math.abs((sk.opp-br.opp)*100)<DEV)adv+=` Note: ${o.b} as a whole runs ${pct(br.opp)} operating margin${S.view==='alloc'?' after central costs':''} and this SKU is in line with it, so the fix is mostly at brand level (cost, pricing, central charges), not SKU-specific.`;
    const shU=br.u>0?sk.u/br.u:0,shO=br.op>0?sk.op/br.op:null;
    return `<div class="card pad skucard"><div class="skuhead"><div><div class="eyebrow">${o.b}</div><h3>${o.id} · ${o.n}</h3><div class="meta">${mc.length} region${mc.length!==1?'s':''} · ${money(sk.ns)} net sales · ${units(sk.u)} units</div></div>
      <div style="text-align:right"><span class="fcbadge ${fc.c}">${ARROW[fc.c]} ${fc.t}</span><div class="meta" style="margin-top:6px">${fc.why}</div></div></div>
      <div class="skugrid"><div class="tblwrap">${t}</div>
        <div style="text-align:center"><div class="eyebrow" style="margin-bottom:6px">Weight in ${o.b}</div>${donut(br.ns?sk.ns/br.ns:0,`${o.id} share of ${o.b} net sales`)}
          <div class="legend" style="justify-content:center"><span><span class="swatch" style="background:var(--accent)"></span>${o.id}</span><span><span class="swatch" style="background:var(--hair)"></span>Rest of brand</span></div>
          <div class="note" style="text-align:left">Brand NS ${money(br.ns)} · units share ${pct(shU)}${shO!=null?` · op-profit share ${pct(shO)}`:''}</div></div></div>
      <div class="cmts">${box(`Deviation vs ${o.b}`,cB)}${box('Deviation vs EMEA overall',cE)}</div>
      <div class="insight ${fc.c==='up'?'pos':fc.c==='down'?'neg':'neu'}" style="margin-top:12px"><div class="ico">${ARROW[fc.c]}</div><div><h4>Forecast suggestion: ${fc.t}</h4><p>${adv} Based on profitability benchmarks only; check sell-through, inventory cover and customer commitments before changing the forecast.</p></div></div></div>`;}).join('');
}
function skuListDraw(){const q=$('#skuSearch').value.trim().toLowerCase(),L=$('#skuList');
  let c=SK.list.filter(o=>(allBrands()||S.b.has(o.b))&&(!q||o.id.toLowerCase().includes(q)||o.n.toLowerCase().includes(q)||o.b.toLowerCase().includes(q))).sort((a,b)=>b.ns-a.ns);
  const n=c.length;c=c.slice(0,80);
  L.innerHTML=c.length?c.map(o=>`<div class="ms-opt${S.skus.has(o.i)?' on':''}" data-i="${o.i}"><span class="ck">${S.skus.has(o.i)?'✓':''}</span><span><b>${o.id}</b> ${o.n}<br><span class="sub">${o.b}</span></span><span class="mono sub">${money(o.ns)}</span></div>`).join('')+(n>80?`<div class="ms-empty">Showing top 80 of ${n} by net sales; type to narrow.</div>`:''):'<div class="ms-empty">No SKUs match.</div>';
  $$('.ms-opt',L).forEach(el=>el.addEventListener('mousedown',e=>{e.preventDefault();const i=+el.dataset.i;S.skus.has(i)?S.skus.delete(i):S.skus.add(i);skuListDraw();renderSku();}));}
$('#skuBox').addEventListener('click',()=>$('#skuSearch').focus());
$('#skuSearch').addEventListener('focus',()=>{$('#skuList').hidden=false;skuListDraw();});
$('#skuSearch').addEventListener('blur',()=>setTimeout(()=>$('#skuList').hidden=true,120));
$('#skuSearch').addEventListener('input',skuListDraw);
$('#skuSearch').addEventListener('keydown',e=>{if(e.key==='Escape'){e.target.blur();}if(e.key==='Enter'){const f=$('#skuList .ms-opt');if(f)f.dispatchEvent(new MouseEvent('mousedown'));}if(e.key==='Backspace'&&!e.target.value&&S.skus.size){S.skus.delete([...S.skus].pop());renderSku();skuListDraw();}});
$('#skuClear').addEventListener('click',()=>{S.skus.clear();renderSku();});
if(SK.list.length){const top=[...SK.list].sort((a,b)=>b.ns-a.ns)[0];S.skus.add(top.i);}

