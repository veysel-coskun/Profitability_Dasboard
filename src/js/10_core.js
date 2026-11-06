const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
function money(v){const n=Math.abs(v);let s;if(n>=1e9)s=(n/1e9).toFixed(2)+'B';else if(n>=1e6)s=(n/1e6).toFixed(1)+'M';else if(n>=1e3)s=(n/1e3).toFixed(0)+'K';else s=n.toFixed(0);return (v<0&&s!=='0'&&s!=='0K'?'−':'')+'$'+s;}
function money0(v){return (v<0?'−':'')+'$'+Math.abs(Math.round(v)).toLocaleString('en-US');}
function pct(v,d=1){return (v*100).toFixed(d)+'%';}
function signed(v,f){return (v>0?'+':v<0?'−':'')+f(Math.abs(v));}
function units(v){const n=Math.abs(v);if(n>=1e6)return (v/1e6).toFixed(1)+'M';if(n>=1e3)return (v/1e3).toFixed(0)+'K';return Math.round(v).toString();}
const CH={'10':'Domestic','20':'DI / FOB','DOM':'Domestic','FOB':'DI / FOB'};
// FX (local currency → USD) and market names come from the data pack's settings (META)
const RATE={USD:1,...(META.fx||{})},SYM={EUR:'€',GBP:'£',TRY:'₺',USD:'$',CHF:'CHF ',SEK:'kr ',NOK:'kr ',DKK:'kr ',PLN:'zł '};
const FX_TXT=Object.entries(RATE).filter(([c])=>c!=='USD').map(([c,v])=>v>=1?`${c} ×${+v.toFixed(4)}`:`${c} ÷${+(1/v).toFixed(2)}`).join(', ');
const YEAR=String(META.year||'').replace(/^FY/i,'');   // "2026" from "FY2026"
function localNS(T){if(S.m.size!==1)return '';const m=[...S.m][0],ccy=(DATA.cur||{})[m];if(!ccy||ccy==='USD')return '';const r=RATE[ccy]||1,loc=T.ns/r;const s=loc>=1e6?(loc/1e6).toFixed(1)+'M':(loc/1e3).toFixed(0)+'K';return (SYM[ccy]||'')+s+' '+ccy;}
function drillMarket(m){if(!m||!ALL_M.includes(m))return;S.m=new Set([m]);setActiveTab('brand');render();}
// The central-cost market (no sales; central charges by brand) is named in the data pack settings.
const CENTRAL=META.central||'CENTRAL',CLOSE='Closeouts';
const EU_MAP={};
// P&L line detail from data/sub_lines.js, attached before brand renaming (same key). Costs are positive amounts.
const SUB_LN=['pc','roy','dt','ap','ss','sw','ol','ms','ia','ad'];
DATA.groups.forEach(g=>{const a=SUBL[g.m+'|'+g.ch+'|'+g.b];g.L=a?{pc:a[3]+a[5],roy:a[4],dt:a[7],ap:a[8],ss:a[9],sw:a[11],ol:a[12],ms:a[13],ia:a[14],ad:a[15]}:Object.fromEntries(SUB_LN.map(k=>[k,0]));});
DATA.groups.forEach(g=>{if(g.m===CENTRAL){g.b=EU_MAP[g.b]||g.b.toUpperCase();g.u=0;}g.b=g.b.trim().replace(/\s+/g,' ');if(g.b===CLOSE)g.u=0;});
const BASE=DATA.groups.filter(g=>g.m!==CENTRAL),CEN=DATA.groups.filter(g=>g.m===CENTRAL);
// Allocated view: each central brand charge spread over that brand's market×channel rows by net-sales share; brands with no market sales spread over all non-closeout sales.
const ALLOC=(()=>{const out=BASE.map(g=>({...g})),cb={};
  CEN.forEach(c=>{const x=cb[c.b]??={gm:0,co:0,op:0,L:Object.fromEntries(SUB_LN.map(k=>[k,0]))};x.gm+=c.gm;x.co+=c.co;x.op+=c.op;SUB_LN.forEach(k=>x.L[k]+=c.L[k]);});
  Object.entries(cb).forEach(([b,x])=>{let tgt=BASE.filter(g=>g.b===b&&g.ns>0);if(!tgt.length)tgt=BASE.filter(g=>g.ns>0&&g.b!==CLOSE);const tn=sum(tgt,g=>g.ns);
    tgt.forEach(g=>{const s=g.ns/tn;out.push({m:g.m,ch:g.ch,b,u:0,gs:0,al:0,ns:0,gm:x.gm*s,co:x.co*s,op:x.op*s,L:Object.fromEntries(SUB_LN.map(k=>[k,x.L[k]*s])),alloc:1});});});
  return out;})();
const ALL_M=[...new Set(DATA.groups.map(g=>g.m))].sort();
const ALL_CH=[...new Set(DATA.groups.map(g=>g.ch))].sort();
// Brand list = every brand in any dataset, so the Brands filter works whichever forecast is in the header.
const ALL_B=[...new Set([...DATA.groups.map(g=>g.b),...Object.values(CFC).flatMap(c=>c.rows.map(a=>a[2])),...PY.rows.map(a=>a[2])])].sort();
const S={m:new Set(ALL_M),ch:new Set(ALL_CH),b:new Set(ALL_B),mMetric:'opp',hMetric:'opp',view:'alloc',co:true};
function src(){return S.view==='alloc'?ALLOC:DATA.groups;}
const allBrands=()=>S.b.size===ALL_B.length;
// Display names for business units (data keys stay as in the source files).
const MKT_NAME=Object.fromEntries(Object.entries(META.markets||{}).map(([k,o])=>[k,o.name]));
function mName(m){return m===CENTRAL?'Central costs':(MKT_NAME[m]||m);}
function agg(rs){const T={u:0,gs:0,al:0,ns:0,gm:0,co:0,op:0,gsX:0,alX:0};rs.forEach(r=>{for(const k of ['u','gs','al','ns','gm','co','op'])T[k]+=r[k];if(r.b!==CLOSE){T.gsX+=r.gs;T.alX+=r.al;}});
  T.gmp=T.ns?T.gm/T.ns:0;T.cop=T.ns?T.co/T.ns:0;T.opp=T.ns?T.op/T.ns:0;T.alp=T.gs?T.al/T.gs:0;T.alpX=T.gsX?T.alX/T.gsX:0;return T;}
function pctNS(o,k){return o.ns?pct(o[k]):'–';}
function by(rs,key){const m={};rs.forEach(r=>{(m[r[key]]??=[]).push(r);});return Object.entries(m).map(([k,v])=>({key:k,...agg(v)})).sort((a,b)=>b.ns-a.ns);}
const TT=$('#tt');function ttShow(h,e){TT.innerHTML=h;TT.style.opacity='1';ttMove(e);}
function ttMove(e){let x=e.clientX+14,y=e.clientY+14;const r=TT.getBoundingClientRect();if(x+r.width>innerWidth-10)x=e.clientX-r.width-14;if(y+r.height>innerHeight-10)y=e.clientY-r.height-14;TT.style.left=x+'px';TT.style.top=y+'px';}
function ttHide(){TT.style.opacity='0';}
function kpi(lab,val,sub){return `<div class="kpi"><div class="k-accent"></div><div class="k-lab">${lab}</div><div class="k-val mono">${val}</div><div class="k-sub">${sub||''}</div></div>`;}
function healthChip(o){if(o.op<0)return '<span class="flag risk"><span class="fdot"></span>Risk</span>';if(!o.ns)return '<span class="flag watch"><span class="fdot"></span>No sales</span>';if(o.opp<0.02||o.alpX>0.4)return '<span class="flag watch"><span class="fdot"></span>Watch</span>';return '<span class="flag good"><span class="fdot"></span>Healthy</span>';}

function genBars(el,data,valf,fmtf,colorf,tipf,labf,keyf){
  const maxAbs=Math.max(...data.map(d=>Math.abs(valf(d))),1e-9);let h='';
  data.forEach(d=>{const v=valf(d),w=Math.abs(v)/maxAbs*100,col=colorf(d,v);
    h+=`<div class="br" data-key="${(((keyf||labf)(d))+'').replace(/"/g,'&quot;')}" data-tip='${tipf(d).replace(/'/g,"&#39;")}' style="display:grid;grid-template-columns:130px 1fr 84px;align-items:center;gap:10px;padding:5px 0;cursor:pointer">
      <div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${labf(d)}">${labf(d)}</div>
      <div style="position:relative;height:15px;background:var(--surface-2);border-radius:4px"><div style="position:absolute;left:0;top:0;bottom:0;width:${w}%;background:${col};border-radius:4px"></div></div>
      <div class="mono" style="text-align:right;font-size:12.5px;font-weight:600;color:${col}">${fmtf(v)}</div></div>`;});
  el.innerHTML=h;$$('.br',el).forEach(r=>{r.addEventListener('mousemove',e=>ttShow(r.dataset.tip,e));r.addEventListener('mouseleave',ttHide);});
}
function mix(a,b,t){return `rgb(${a.map((x,i)=>Math.round(x+(b[i]-x)*t)).join(',')})`;}
function heatColor(v,metric){if(metric==='opp'||metric==='gmp'){const mid=metric==='gmp'?0.5:0.05,sc=metric==='gmp'?0.5:0.15;const t=Math.max(-1,Math.min(1,(v-mid)/sc));if(t>=0)return mix([240,243,246],[52,168,128],t);return mix([240,243,246],[232,96,110],-t);}const t=Math.max(0,Math.min(1,v/0.25));return mix([232,238,255],[96,132,255],t);}

function renderChrome(){
  if(typeof slotSync==='function')slotSync();
  $('#viewNote').textContent=S.view==='alloc'?'Central charges are spread onto each brand’s market × channel rows by net-sales share (brands with no market sales: over all sales). Market and brand totals reconcile to the consolidated total.':'Central charges shown as their own market with no sales; market margins are before central costs.';
  if(typeof DD_M!=='undefined'){DD_M.sync();DD_B.sync();}
  {const cc=S.m.size===1?(DATA.cur||{})[[...S.m][0]]:null;const b=$('.ccy');if(b)b.textContent=(cc&&cc!=='USD')?('USD · '+cc+' local'):'USD';}
  $('#foot').innerHTML=`<b>Base scenario:</b> ${DS[S.slot.cur].full} · <b>Prior forecast:</b> ${DS[S.slot.pri].full} · <b>Prior year:</b> ${DS[S.slot.py].full}${DS[S.slot.py].pending?' (pending)':''}. Market submissions: ${DATA.groups.length} market × channel × brand segments · all figures USD${FX_TXT?`, converted at ${FX_TXT}`:''} · central costs ${S.view==='alloc'?'allocated to market × channel × brand by net-sales share':'shown separately'} · closeouts ${S.co?'included':'excluded'} (always excluded from allowance % and units)${META.demo?' · <b>Demo data:</b> a fictional company; all names and numbers are made up.':''}`;
}
function scope(){const m=S.m.size===ALL_M.length?'all markets':[...S.m].map(mName).join(', ');const c=S.ch.size===ALL_CH.length?'all channels':[...S.ch].map(x=>CH[x]).join(', ');const b=allBrands()?'all brands':S.b.size===1?[...S.b][0]:S.b.size+' brands';return `${b} · ${m.length>40?liveM().length+' markets':m} · ${c}`;}
// ---------- Render dispatcher: only the visible tab is drawn; the others are marked dirty and drawn when opened ----------
const TAB_R={ov:renderOv,cmp:()=>renderCompare(),wi:()=>renderWI(),mkt:renderMkt,brand:renderBrand,sku:()=>{if(SK)renderSku();},cfc:()=>renderCFC(),mon:()=>renderMON(),ins:()=>renderIns()};
let DIRTY=new Set(Object.keys(TAB_R));
// Navigation: three sections (Forecast Overview, Insights, What-If) with views under each. A view key maps to a panel;
// Pricing / Top 20 / Insights Engine are sub-panels of the Insights panel (S.insSub).
const VIEWS={ov:{g:'fc'},cmp:{g:'fc'},mkt:{g:'fc'},brand:{g:'fc'},mon:{g:'fc'},cfc:{g:'fc'},sku:{g:'ins'},price:{g:'ins',p:'ins',s:'price'},top:{g:'ins',p:'ins',s:'top'},eng:{g:'ins',p:'ins',s:'eng'},wi:{g:'wi'}};
const LAST_V={fc:'ov',ins:'sku',wi:'wi'};
const panelOf=k=>(VIEWS[k]&&VIEWS[k].p)||k;
function activeTab(){const p=$('.panel.active');return p?p.id.replace('tab-',''):'ov';}
function renderTab(k){if(!DIRTY.has(k))return;DIRTY.delete(k);const f=TAB_R[k];if(f)f();}
function render(){renderChrome();DIRTY=new Set(Object.keys(TAB_R));renderTab(activeTab());}
function setActiveTab(k){if(k==='ins')k=S.insSub||'price';if(!VIEWS[k])k='ov';const V=VIEWS[k],g=V.g,p=panelOf(k);LAST_V[g]=k;
  if(V.s){S.insSub=V.s;$$('#insSub button').forEach(x=>x.classList.toggle('on',x.dataset.s===V.s));$$('#tab-ins .ipanel').forEach(x=>x.classList.toggle('on',x.id==='ins-'+V.s));}
  $$('.mtab').forEach(x=>{const on=x.dataset.g===g;x.classList.toggle('on',on);x.setAttribute('aria-selected',on);});
  $$('.tab').forEach(x=>{const on=x.dataset.k===k;x.hidden=x.dataset.g!==g;x.classList.toggle('active',on);x.setAttribute('aria-selected',on);});
  $('.tabs').classList.toggle('solo',g==='wi');$$('.panel').forEach(x=>x.classList.toggle('active',x.id==='tab-'+p));}
function showTab(k){if(k==='ins')k=S.insSub||'price';setActiveTab(k);const p=panelOf(k);if(p==='ins'&&!DIRTY.has('ins'))renderIns();renderTab(p);try{history.replaceState(null,'','#'+k);}catch(e){}}
