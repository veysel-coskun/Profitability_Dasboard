// ---------- Data packs: run the cockpit on your own numbers ----------
// The app reads the var globals below. A data pack is the same set of objects; it comes from an Excel template that the page
// writes (pre-filled with whatever is showing) and reads back, all in the browser: nothing is uploaded anywhere. A loaded pack
// is kept in this browser (IndexedDB) and used on the next visit until "Back to demo data".
const PACK_KEYS=['META','DATA','SUBL','OHL','SKU','LOGO','CFC','MON','MON_NOV','PY','FCS','SRP'];
const DEMO_PACK=Object.fromEntries(PACK_KEYS.map(k=>[k,window[k]]));
let PACK_INFO={demo:true};
function packApply(p){PACK_KEYS.forEach(k=>{if(p[k]!==undefined)window[k]=p[k];});}
// IndexedDB, guarded: private windows and previews may refuse it, and the page must work without it
function idb(mode,fn){return new Promise((res)=>{try{const q=indexedDB.open('cockpit-pack',1);q.onupgradeneeded=()=>q.result.createObjectStore('p');
  q.onsuccess=()=>{try{const t=q.result.transaction('p',mode),st=t.objectStore('p'),r=fn(st);t.oncomplete=()=>res(r&&r.result);t.onerror=()=>res(null);}catch(e){res(null);}};q.onerror=()=>res(null);}catch(e){res(null);}});}
const packLoad=()=>idb('readonly',st=>st.get('pack')),packSave=p=>idb('readwrite',st=>st.put(p,'pack')),packClear=()=>idb('readwrite',st=>st.delete('pack'));
// SheetJS (cdnjs) reads and writes the template
let XLSX_P=null;
function loadXlsx(){return XLSX_P??=new Promise((res,rej)=>{if(window.XLSX)return res(window.XLSX);const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  s.onload=()=>window.XLSX?res(window.XLSX):rej(new Error('Spreadsheet library did not load.'));s.onerror=()=>{XLSX_P=null;rej(new Error('Could not load the spreadsheet library (needs internet access to cdnjs.cloudflare.com).'));};document.head.appendChild(s);});}
async function saveBlob(blob,name){const dl=window.claude&&window.claude.use?await window.claude.use('downloads').catch(()=>null):null;
  if(dl){await dl.save({filename:name,data:blob});return;}
  const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);}

// ---- template layout: sheet → columns; the same lists drive writing and reading ----
const T_SUB=['Market','Channel','Brand','Units','Gross sales','Allowances','Net sales','Inventory cost','Royalty','Inventory variance','Dev & tooling','A&P','Special shipping','Shipping & warehousing','Other local overhead','Marketing & sales','Amortisation','Administration'];
const T_FC=['Scenario','Market','Channel','Brand','Units','Gross sales','Allowances','Product cost','Royalties','Warehousing','Freight'];
const T_MON=['Scenario','Market','Channel','Brand','Month','Units','Gross sales','Allowances','Product cost','Royalties','Warehousing','Freight'];
const T_PLAN=['Scenario','Market','Channel','Month','Net sales before phasing','Net sales target'];
const T_OH=['Cycle','Market','Channel','Brand','Dev & tooling','A&P','Special shipping','Other local overhead','Marketing & sales','Amortisation','Administration','Central charges'];
const T_SKU=['SKU','Name','Brand','Retail price (EUR)'];
const T_SKUS=['SKU','Market','Channel','Units','Gross sales','Allowances','Net sales','Gross margin','Contribution','Operating profit','Shipping & warehousing'];
const T_SKUF=['Scenario','SKU','Market','Channel','Units','Gross sales','Net sales','Variable margin'];
const SCEN_KEYS=['jul','sep','oct','ocp','nov','nvp','py'],PHASED={ocp:'MON',nvp:'MON_NOV'};
const README=[['Profitability Cockpit · data template'],[''],
  ['How to use: replace the demo numbers on each sheet with your own, keep the sheet names and column headers, then use "Load data pack" in the cockpit.'],
  ['All amounts in USD. Costs are positive amounts (they are deducted). Channel: 10 = Domestic, 20 = Direct import / FOB. Month: 1–12.'],
  ['Net sales, gross profit, GMR, variable margin, gross margin, contribution and operating profit are calculated by the cockpit; on Submissions, Net sales is checked against Gross sales − Allowances.'],
  ['Settings: company, title and FX rates (local currency → USD). Markets: market codes used on every other sheet, display name and local currency; one market can be the central-cost market (Settings → central).'],
  ['Scenarios: the fixed slots jul, sep, oct, ocp, nov, nvp (forecast cycles, ocp and nvp are the monthly-phased ones) and py (prior year); give each your own label. Leave a slot without rows and it shows as pending.'],
  ['Submissions: market P&L by market × channel × brand with overhead lines (the Market and Brand Health views, SKU drill-down and What-If closeout economics). Brand "Closeouts" = closeout sales.'],
  ['Forecasts: one row per scenario × market × channel × brand. For ocp and nvp the full year is taken from Monthly when it has rows.'],
  ['Monthly / Monthly plan: phased forecasts by month and the plan they were fitted to (Monthly view; What-If splits the year by this profile).'],
  ['Overheads: below-margin cost pools for the What-If operating-profit view (cycle jul for jul/sub bases, sep for the others).'],
  ['SKUs, SKU submissions, SKU forecasts: SKU list with retail price, and SKU detail for the SKU, Pricing and Top 20 views.'],
  [''],['Your file is read in your browser only and is never uploaded. It is remembered in this browser until you choose "Back to demo data".']];

function packToBook(X){const P=window,wb=X.utils.book_new(),add=(n,rows)=>X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(rows),n);
  const M=P.META,neg=v=>-(v||0);
  add('README',README);
  add('Settings',[['Key','Value'],['company',M.company],['title',M.title],['subtitle',M.sub],['region',M.region],['year',M.year],['central',M.central||''],...Object.entries(M.fx||{}).map(([c,v])=>['fx_'+c,v])]);
  add('Markets',[['Code','Name','Currency'],...Object.entries(M.markets).map(([c,o])=>[c,o.name,o.ccy])]);
  add('Scenarios',[['Key','Label','Description'],...SCEN_KEYS.map(k=>{const o=k==='py'?P.PY:P.CFC[k]||{};return [k,o.lab||k,o.full||''];})]);
  add('Submissions',[T_SUB,...P.DATA.groups.map(g=>{const a=P.SUBL[g.m+'|'+g.ch+'|'+g.b]||[];return [g.m,g.ch,g.b,g.u,g.gs,g.al,g.ns,a[3]||0,a[4]||0,a[5]||0,a[7]||0,a[8]||0,a[9]||0,a[11]||0,a[12]||0,a[13]||0,a[14]||0,a[15]||0];})]);
  const fc=r=>[r[0],r[1],r[2],r[3],r[4],r[5],neg(r[7]),neg(r[9]),neg(r[11]),neg(r[12])];
  add('Forecasts',[T_FC,...Object.keys(P.CFC).filter(k=>!PHASED[k]||!P[PHASED[k]].rows.length).flatMap(k=>P.CFC[k].rows.map(r=>[k,...fc(r)])),...P.PY.rows.map(r=>['py',...fc(r)])]);
  add('Monthly',[T_MON,...Object.entries(PHASED).flatMap(([k,v])=>(P[v].rows||[]).map(r=>[k,r[0],r[1],r[2],r[3],r[4],r[5],r[6],neg(r[8]),neg(r[10]),neg(r[12]),neg(r[13])]))]);
  const tg={};(P.MON.tgt||[]).forEach(r=>tg[r[0]+'|'+r[1]+'|'+r[2]]=r[3]);
  add('Monthly plan',[T_PLAN,...(P.MON.pre||[]).map(r=>['ocp',r[0],r[1],r[2],r[3],tg[r[0]+'|'+r[1]+'|'+r[2]]??'']),...(P.MON_NOV.pre||[]).map(r=>['nvp',r[0],r[1],r[2],r[3],''])]);
  add('Overheads',[T_OH,...Object.entries(P.OHL).flatMap(([cy,o])=>Object.entries(o).map(([k,v])=>[cy,...k.split('|'),...v]))]);
  add('SKUs',[T_SKU,...P.SKU.s.map(s=>[s[0],s[1],s[2],P.SRP[s[0]]??''])]);
  add('SKU submissions',[T_SKUS,...P.SKU.r.map(a=>[P.SKU.s[a[0]][0],P.SKU.m[a[1]],a[2],...a.slice(3,11)])]);
  add('SKU forecasts',[T_SKUF,...['jul','sep'].flatMap(k=>(P.FCS[k]||[]).map(a=>[k,P.FCS.s[a[0]][0],P.FCS.m[a[1]],String(a[2]),...a.slice(3,7)]))]);
  return wb;}

// ---- reading a filled template back into a pack (with checks) ----
function bookToPack(X,wb){const err=[],need=['Settings','Markets','Scenarios','Submissions','Forecasts'];
  const sh=n=>{const ws=wb.Sheets[n];if(!ws)return null;return X.utils.sheet_to_json(ws,{header:1,raw:true,defval:null}).filter(r=>r.some(v=>v!==null&&v!==''));};
  need.forEach(n=>{if(!sh(n))err.push(`Sheet "${n}" is missing.`);});if(err.length)throw new Error(err.join(' '));
  const tab=(n,cols,req=true)=>{const r=sh(n);if(!r){if(req)err.push(`Sheet "${n}" is missing.`);return [];}const h=r[0].map(x=>String(x??'').trim()),ix=cols.map(c=>h.indexOf(c));
    const miss=cols.filter((c,i)=>ix[i]<0);if(miss.length){err.push(`Sheet "${n}": missing column(s) ${miss.join(', ')}.`);return [];}return r.slice(1).map(row=>ix.map(i=>row[i]));};
  const num=(v,where)=>{if(v===null||v===''||v===undefined)return 0;const n=typeof v==='number'?v:+String(v).replace(/[, $]/g,'');if(!isFinite(n)){err.push(`${where}: "${v}" is not a number.`);return 0;}return n;};
  const txt=v=>String(v??'').trim(),ch=v=>{const s=txt(v);return /^dom/i.test(s)?'10':/^(fob|di)/i.test(s)?'20':s.replace(/\.0+$/,'');};
  // settings, markets, scenarios
  const S0=Object.fromEntries(tab('Settings',['Key','Value']).map(r=>[txt(r[0]),r[1]]));
  const mk=tab('Markets',['Code','Name','Currency']).filter(r=>txt(r[0]));if(!mk.length)err.push('Markets: no markets listed.');
  const markets=Object.fromEntries(mk.map(r=>[txt(r[0]),{name:txt(r[1])||txt(r[0]),ccy:(txt(r[2])||'USD').toUpperCase()}])),MK=new Set(Object.keys(markets));
  const central=txt(S0.central);if(central&&!MK.has(central))markets[central]={name:central+' (central)',ccy:'USD'};
  const fx={USD:1};Object.entries(S0).forEach(([k,v])=>{if(/^fx_/i.test(k))fx[k.slice(3).toUpperCase()]=num(v,'Settings '+k)||1;});
  const META={company:txt(S0.company)||'My company',title:txt(S0.title)||'Profitability Cockpit',sub:txt(S0.subtitle)||'',region:txt(S0.region)||'',year:txt(S0.year)||'',markets,central:central||'CENTRAL',fx,demo:false};
  const sc=Object.fromEntries(tab('Scenarios',['Key','Label','Description']).map(r=>[txt(r[0]),{lab:txt(r[1]),full:txt(r[2])}]));
  const chkM=(m,where)=>{if(!MK.has(m)&&m!==central)err.push(`${where}: market "${m}" is not on the Markets sheet.`);};
  // submissions → DATA.groups + SUBL (gross margin, contribution and operating profit derived)
  const groups=[],SUBL={};tab('Submissions',T_SUB).forEach((r,i)=>{const w=`Submissions row ${i+2}`,m=txt(r[0]),c=ch(r[1]),b=txt(r[2]);if(!m&&!b)return;chkM(m,w);
    const v=r.slice(3).map((x,j)=>num(x,w));const [u,gs,al,ns0,ic,ry,iv,dt,ap,ss,sw,ol,ms,ia,ad]=v,ns=ns0||gs-al;
    if(ns0&&Math.abs(ns0-(gs-al))>Math.max(1,Math.abs(gs)*0.001))err.push(`${w}: net sales ${ns0} ≠ gross − allowances ${gs-al}.`);
    const gm=ns-ic-iv,co=gm-ry-dt-ap-ss,op=co-sw-ol-ms-ia-ad;groups.push({m,ch:c,b,u,gs,al,ns,gm,co,op});
    SUBL[m+'|'+c+'|'+b]=[gs,al,ns,ic,ry,iv,gm,dt,ap,ss,co,sw,ol,ms,ia,ad,op];});
  if(!groups.length)err.push('Submissions: no rows.');
  // forecasts → CFC + PY (cockpit shape, costs negative, subtotals derived)
  const row=(m,c,b,u,gs,al,pc,ry,wh,fr)=>{const ns=gs-al,gp=ns-pc,gmr=gp-ry,vm=gmr-wh-fr;return [m,c,b,u,gs,al,ns,-pc,gp,-ry,gmr,-wh,-fr,vm];};
  const F={};tab('Forecasts',T_FC).forEach((r,i)=>{const w=`Forecasts row ${i+2}`,k=txt(r[0]);if(!k)return;if(!SCEN_KEYS.includes(k)){err.push(`${w}: scenario "${k}" is not one of ${SCEN_KEYS.join(', ')}.`);return;}
    const m=txt(r[1]);chkM(m,w);(F[k]??=[]).push(row(m,ch(r[2]),txt(r[3]),...r.slice(4).map(x=>num(x,w))));});
  const MR={ocp:[],nvp:[]};tab('Monthly',T_MON,false).forEach((r,i)=>{const w=`Monthly row ${i+2}`,k=txt(r[0]);if(!k)return;if(!MR[k]){err.push(`${w}: scenario must be ocp or nvp.`);return;}
    const mo=num(r[4],w);if(!(mo>=1&&mo<=12))err.push(`${w}: month must be 1–12.`);const m=txt(r[1]);chkM(m,w);const a=row(m,ch(r[2]),txt(r[3]),...r.slice(5).map(x=>num(x,w)));MR[k].push([a[0],a[1],a[2],mo,...a.slice(3)]);});
  const fy=rows=>{const o={};rows.forEach(a=>{const k=a[0]+'|'+a[1]+'|'+a[2];const t=o[k]??=[a[0],a[1],a[2],...new Array(11).fill(0)];for(let j=4;j<15;j++)t[j-1]+=a[j];});return Object.values(o);};
  Object.keys(MR).forEach(k=>{if(MR[k].length)F[k]=fy(MR[k]);});
  const plan={ocp:{pre:[],tgt:[]},nvp:{pre:[],tgt:[]}};tab('Monthly plan',T_PLAN,false).forEach((r,i)=>{const w=`Monthly plan row ${i+2}`,k=txt(r[0]);if(!plan[k])return;const key=[txt(r[1]),ch(r[2]),num(r[3],w)];
    if(r[4]!==null&&r[4]!=='')plan[k].pre.push([...key,num(r[4],w)]);if(r[5]!==null&&r[5]!=='')plan[k].tgt.push([...key,num(r[5],w)]);});
  const CFC={};SCEN_KEYS.filter(k=>k!=='py').forEach(k=>{CFC[k]={lab:(sc[k]&&sc[k].lab)||k,full:(sc[k]&&sc[k].full)||(sc[k]&&sc[k].lab)||k,rows:F[k]||[]};});
  const PY={lab:(sc.py&&sc.py.lab)||'Prior year',full:(sc.py&&sc.py.full)||'Prior year',source:'data pack',rows:F.py||[]};
  // monthly: when a phased slot has no months, spread its forecast evenly so the Monthly view and What-If still work
  const even=rows=>rows.flatMap(a=>Array.from({length:12},(_,j)=>[a[0],a[1],a[2],j+1,...a.slice(3).map(x=>x/12)]));
  const MON={rows:MR.ocp.length?MR.ocp:even(CFC.ocp.rows),pre:plan.ocp.pre,tgt:plan.ocp.tgt,unm:[]},MON_NOV={rows:MR.nvp.length?MR.nvp:even(CFC.nvp.rows),pre:plan.nvp.pre};
  // overhead pools
  const OHL={jul:{},sep:{}};tab('Overheads',T_OH,false).forEach((r,i)=>{const w=`Overheads row ${i+2}`,cy=txt(r[0]);if(!OHL[cy])return;OHL[cy][txt(r[1])+'|'+ch(r[2])+'|'+txt(r[3])]=r.slice(4).map(x=>num(x,w));});
  if(!Object.keys(OHL.sep).length)OHL.sep=OHL.jul;
  // SKUs
  const s=[],SRP={},idx={};tab('SKUs',T_SKU,false).forEach((r,i)=>{const id=txt(r[0]);if(!id||idx[id]!=null)return;idx[id]=s.length;s.push([id,txt(r[1])||id,txt(r[2])]);if(r[3]!==null&&r[3]!=='')SRP[id]=num(r[3],`SKUs row ${i+2}`);});
  const ML=[...MK].sort(),mi=m=>{let j=ML.indexOf(m);if(j<0){ML.push(m);j=ML.length-1;}return j;},si=(id,w)=>{if(idx[id]==null){err.push(`${w}: SKU "${id}" is not on the SKUs sheet.`);return -1;}return idx[id];};
  const SKUr=[];tab('SKU submissions',T_SKUS,false).forEach((r,i)=>{const w=`SKU submissions row ${i+2}`,j=si(txt(r[0]),w);if(j<0)return;SKUr.push([j,mi(txt(r[1])),ch(r[2]),...r.slice(3).map(x=>num(x,w))]);});
  const FCS={s,m:ML,jul:[],sep:[]};tab('SKU forecasts',T_SKUF,false).forEach((r,i)=>{const w=`SKU forecasts row ${i+2}`,k=txt(r[0]);if(!FCS[k]||k==='s'||k==='m')return;const j=si(txt(r[1]),w);if(j<0)return;FCS[k].push([j,mi(txt(r[2])),+ch(r[3]),...r.slice(4).map(x=>num(x,w))]);});
  if(err.length)throw new Error(err.slice(0,12).join('\n')+(err.length>12?`\n…and ${err.length-12} more.`:''));
  const cur=Object.fromEntries(Object.entries(markets).map(([k,o])=>[k,o.ccy]));
  return {META,DATA:{cur,groups},SUBL,OHL,SKU:{s,m:ML,r:SKUr},LOGO:DEMO_PACK.LOGO,CFC,MON,MON_NOV,PY,FCS,SRP};}

// ---- restart the app on a pack: restore the original page body, then run the app again ----
let BODY0=null;
function packStart(p,info){if(p)packApply(p);PACK_INFO=info||{demo:true};
  if(BODY0===null){const c=document.body.cloneNode(true);c.querySelectorAll('script').forEach(x=>x.remove());BODY0=c.innerHTML;}
  else{[...document.body.children].forEach(n=>{if(n.tagName!=='SCRIPT')n.remove();});document.body.insertAdjacentHTML('afterbegin',BODY0);}
  __app();packUI();}
