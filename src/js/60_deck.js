// Deck rows from the dataset registry: gm = GMR (after royalties), sw = logistics (GMR − VM), so VM = gm − sw for every source.
const deckRows=k=>(DS[k]?DS[k].rows:[]).map(r=>({m:r.m,ch:r.ch,b:r.b,u:r.u,gs:r.gs,al:r.al,ns:r.ns,gm:r.gmr,sw:r.gmr-r.vm,vm:r.vm}));
const prevLab=()=>DS[PREV_K].lab,curLab=()=>DS[CUR_K].lab;
const srcName=k=>k==='sub'?'market submissions':k==='sep'?'Sept FC market submissions':DS[k].grp==='Actuals'?DS[k].lab:`${DS[k].lab} central forecast`;
const srcDesc=k=>k==='sep'?`Sept FC market submissions in the data pack (closeouts and central costs excluded), converted to USD (${FX_TXT}); VM = Gross Margin − royalty expense − Shipping & Warehousing.`
  :k==='sub'?`Market submissions in the data pack, converted to USD (${FX_TXT}); VM = Gross Margin − royalty expense − Shipping & Warehousing.`
  :`${DS[k].full}${DS[k].grp==='Forecast'?' SKU Profitability Matrix':''} (${DS[k].mk.size} markets); VM = GMR − warehousing − freight.`;
function deckSync(){CUR_K=S.slot.cur;PREV_K=S.slot.pri;CUR=deckRows(CUR_K);PREV=deckRows(PREV_K);PREV_M=new Set(PREV.map(p=>p.m));
  const n=$('#deckNote');if(!n||n.classList.contains('busy'))return;
  deckMsg(CUR_K===PREV_K||DS[PREV_K].pending?'err':'',CUR_K===PREV_K?`Current and Prior forecast are both ${curLab()}: pick a different Prior forecast in the header.`
    :DS[PREV_K].pending?`${prevLab()} has no data yet: pick another Prior forecast in the header.`
    :`Builds a PowerPoint from the Markets, Brands and Channel selected here: ${curLab()} (current) vs ${prevLab()} (prior), as chosen in the header.`);}
function dA(rs){const T={u:0,gs:0,al:0,ns:0,gm:0,sw:0,vm:0};rs.forEach(r=>{for(const k in T)T[k]+=r[k]||0;});
  T.alp=T.gs?T.al/T.gs:0;T.gmp=T.ns?T.gm/T.ns:0;T.swp=T.ns?T.sw/T.ns:0;T.vmp=T.ns?T.vm/T.ns:0;
  T.cp=T.gs?(T.ns-T.gm)/T.gs:0;T.wp=T.gs?T.sw/T.gs:0;T.rows=rs.length;return T;}
function deckScope(){const mk=[...S.m].filter(m=>m!==CENTRAL),aB=allBrands();
  const cur=CUR.filter(r=>mk.includes(r.m)&&S.ch.has(r.ch)&&(aB||S.b.has(r.b)));
  const prev=PREV.filter(r=>mk.includes(r.m)&&S.ch.has(r.ch)&&(aB||S.b.has(r.b)));
  return {mk,aB,cur,prev,lfl:cur.filter(r=>PREV_M.has(r.m)),lflM:mk.filter(m=>PREV_M.has(m)),noBase:mk.filter(m=>!PREV_M.has(m))};}
// Sequential VM bridge (previous → current, like-for-like markets). VM = GS × (1 − allowance% − product cost & royalty% − warehousing & shipping%), all rates on gross sales,
// so a higher allowance costs VM dollar for dollar. Steps: volume, allowance rate, product cost rate, logistics rate. Sums exactly.
function bridge(P,C){if(!P||!C||!P.gs||!C.gs)return null;const r=(a,c,w)=>C.gs*(1-a-c-w);
  const V1=r(P.alp,P.cp,P.wp),V2=r(C.alp,P.cp,P.wp),V3=r(C.alp,C.cp,P.wp),V4=r(C.alp,C.cp,C.wp);
  return {start:P.vm,end:V4,steps:[{k:'vol',l:'Sales volume & mix',v:V1-P.vm},{k:'alw',l:'Allowance level',v:V2-V1},{k:'gm',l:'Product cost & royalties',v:V3-V2},{k:'sw',l:'Warehousing & shipping',v:V4-V3}]};}
const sgn$=v=>(v>=0?'+':'')+money(v);
const pts=d=>(d>=0?'+':'−')+Math.abs(d*100).toFixed(1)+' pts';
const PHR={vol:v=>v>=0?`more sales volume (${sgn$(v)})`:`lower sales volume (${sgn$(v)})`,alw:v=>v<0?`higher allowances (${sgn$(v)})`:`lower allowances (${sgn$(v)})`,
  gm:v=>v>=0?`lower product cost & royalties vs price (${sgn$(v)})`:`higher product cost & royalties vs price (${sgn$(v)})`,sw:v=>v>=0?`lower warehousing & shipping cost (${sgn$(v)})`:`higher warehousing & shipping cost (${sgn$(v)})`};
// VM% moves only with the rate steps (allowance, product cost, logistics); volume changes VM $ — so it is reported separately.
function whyText(br,P,C){if(!br)return 'No previous scenario to compare with.';const d=C.vmp-P.vmp;
  const rate=br.steps.filter(s=>s.k!=='vol'&&Math.abs(s.v)>=1e4).sort((a,b)=>Math.abs(b.v)-Math.abs(a.v)).slice(0,2),vol=br.steps[0];
  let t=Math.abs(d)<0.005?'VM% broadly stable':`VM% ${d>0?'up':'down'} ${pts(d).replace(/^[+−]/,'')}`;
  if(rate.length)t+=`: ${rate.map(s=>PHR[s.k](s.v)).join(', ')}`;
  if(Math.abs(vol.v)>=Math.max(1e4,Math.abs(br.end-br.start)*0.1))t+=`; ${vol.v>=0?'more':'lower'} sales volume ${vol.v>=0?'added':'took'} ${money(Math.abs(vol.v))}`;
  return t+'.';}
let PPTX_P=null;
// PptxGenJS is not on cdnjs; jsDelivr first, unpkg as fallback.
const PPTX_SRC=['https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js','https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'];
function loadPptx(){return PPTX_P??=new Promise((res,rej)=>{if(window.PptxGenJS)return res();const tryAt=i=>{if(i>=PPTX_SRC.length){PPTX_P=null;return rej(new Error('Could not load the PowerPoint library.'));}
  const s=document.createElement('script');s.src=PPTX_SRC[i];s.onload=()=>window.PptxGenJS?res():tryAt(i+1);s.onerror=()=>{s.remove();tryAt(i+1);};document.head.appendChild(s);};tryAt(0);});}
const DC={navy:'003C77',blue:'005EB8',sky:'00AEEF',ink:'333333',lime:'8DC63F',mag:'C71882',tint:'EBF5FB',gray:'767676',prev:'A9BCD6',hair:'D9DEE5',soft:'F4F6F9'};
async function buildDeck(mode){
  const pm=k=>mName(k).replace(/_/g,' / '),E=mode==='brand'?'b':'m',O=E==='b'?'m':'b',nm=k=>E==='m'?pm(k):k,onm=k=>O==='m'?pm(k):k;
  const Wd=13.333,sc=deckScope();if(!sc.cur.length)throw new Error('Nothing in the current selection to present.');
  const C0=dA(sc.cur),CL=dA(sc.lfl),P0=dA(sc.prev),BR=bridge(P0,CL),hasPrev=P0.gs>0&&CL.gs>0;
  const grpBy=(rs,k)=>rs.reduce((a,r)=>((a[r[k]]??=[]).push(r),a),{});
  const curE=grpBy(sc.cur,E),lflE=grpBy(sc.lfl,E),prvE=grpBy(sc.prev,E);
  let ents=Object.keys(curE).map(k=>{const C=dA(curE[k]),L=dA(lflE[k]||[]),P=dA(prvE[k]||[]);return {k,C,L,P,br:P.gs&&L.gs?bridge(P,L):null};}).sort((a,b)=>b.C.ns-a.C.ns);
  const selAll=E==='b'?sc.aB:sc.mk.length===ALL_M.filter(m=>m!==CENTRAL).length;
  const focus=(selAll&&E==='b'?ents.slice(0,6):ents.slice(0,8));
  // benchmarks: brand focus → all brands in the selected markets; market focus → all markets for the selected brands
  const benchRows=E==='b'?CUR.filter(r=>sc.mk.includes(r.m)&&S.ch.has(r.ch)):CUR.filter(r=>S.ch.has(r.ch)&&(allBrands()||S.b.has(r.b)));
  const BM=dA(benchRows),benchLab=E==='b'?'all-brand average in these markets':`${META.region} average for these brands`;
  const scopeM=sc.mk.length===ALL_M.filter(m=>m!==CENTRAL).length?'All markets':sc.mk.map(pm).join(', ');
  const scopeB=sc.aB?'All brands':[...S.b].join(', '),scopeC=S.ch.size===ALL_CH.length?'Domestic + DI/FOB':[...S.ch].map(c=>CH[c]).join(', ');
  const focusName=focus.length===1?nm(focus[0].k):(E==='b'?(sc.aB?'Brand portfolio':`${focus.length} brands`):(selAll?`${META.region} markets`:`${focus.length} markets`));
  const today=new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const pptx=new window.PptxGenJS();pptx.layout='LAYOUT_WIDE';pptx.author=META.company;pptx.title=`${focusName} – ${mode==='brand'?'Brand':'Market'} focus`;
  const logo='image/png;base64,'+LOGO,foot=`© ${YEAR} ${META.company}.  |  ${mode==='brand'?'Brand':'Market'} Focus – ${focusName}`;
  pptx.defineSlideMaster({title:'CONTENT',background:{color:'FFFFFF'},objects:[{rect:{x:0,y:0,w:Wd,h:0.92,fill:{color:DC.blue}}},{rect:{x:0,y:0.92,w:Wd,h:0.055,fill:{color:DC.sky}}},
    {image:{x:0.25,y:0.17,w:0.58,h:0.58,data:logo}},{text:{text:foot,options:{x:0.25,y:7.22,w:8,h:0.2,fontFace:'Arial',fontSize:8,color:DC.gray}}}],slideNumber:{x:12.55,y:7.22,w:0.6,h:0.2,fontFace:'Arial',fontSize:8,color:DC.gray,align:'right'}});
  const F={fontFace:'Arial',color:DC.ink};
  const newSlide=(title,chapter)=>{const s=pptx.addSlide({masterName:'CONTENT'});s.addText(title,{...F,x:1.05,y:0.08,w:9.6,h:0.76,fontSize:22,bold:true,color:'FFFFFF',valign:'middle',fit:'shrink'});
    if(chapter)s.addText(chapter,{...F,x:10.75,y:0.28,w:2.3,h:0.36,fontSize:9.5,bold:true,color:DC.navy,fill:{color:'FFFFFF'},align:'center',valign:'middle',rectRadius:0.08,shape:pptx.ShapeType.roundRect});return s;};
  const callout=(s,t,y=1.15,h=0.62)=>{s.addShape(pptx.ShapeType.rect,{x:0.55,y,w:12.25,h,fill:{color:DC.tint},line:{color:DC.tint}});s.addShape(pptx.ShapeType.rect,{x:0.55,y,w:0.08,h,fill:{color:DC.blue},line:{color:DC.blue}});
    s.addText(t,{...F,x:0.75,y,w:11.95,h,fontSize:13,bold:true,valign:'middle',fit:'shrink'});};
  const bullets=(s,items,o)=>s.addText(items.map(t=>({text:t,options:{bullet:{code:'25A0'},paraSpaceAfter:6,breakLine:true}})),{...F,fontSize:12,valign:'top',...o});
  const note=(s,t)=>s.addText(t,{...F,x:0.55,y:6.88,w:12.25,h:0.3,fontSize:8.5,color:DC.gray,italic:true,fit:'shrink'});
  const nbL=sc.noBase.map(pm).join(', ');
  const lflNote=!sc.lflM.length?`No market in this selection is in the ${srcName(PREV_K)} (${nbL}), so it is compared with benchmarks only.`
    :sc.noBase.length?`Previous-scenario comparisons are like-for-like on ${sc.lflM.length} market${sc.lflM.length!==1?'s':''}; ${nbL} ${sc.noBase.length>1?'have':'has'} no ${srcName(PREV_K)} and ${sc.noBase.length>1?'are':'is'} benchmarked only.`:`Previous-scenario comparisons are like-for-like on ${sc.lflM.length} market${sc.lflM.length!==1?'s':''}.`;
  const good=(d,inv)=>Math.abs(d)<0.0005?DC.gray:((inv?-d:d)>0?DC.lime:DC.mag);
  const cell=(t,o={})=>({text:String(t),options:o});
  const hdr=t=>cell(t,{bold:true,color:'FFFFFF',fill:{color:DC.blue},fontSize:9.5,align:'center',valign:'middle'});
  const bar=(s,labels,series,o)=>s.addChart(pptx.ChartType.bar,series.map(x=>({name:x.name,labels,values:x.values})),{barDir:'bar',barGrouping:'clustered',catAxisOrientation:'maxMin',chartColors:series.map(x=>x.color),
    showValue:true,dataLabelFormatCode:o.fmt||'0.0%',dataLabelFontSize:8,dataLabelFontFace:'Arial',dataLabelColor:DC.ink,valAxisHidden:true,valGridLine:{style:'none'},catAxisLabelFontSize:9,catAxisLabelFontFace:'Arial',catAxisLabelColor:DC.ink,catAxisLineShow:false,
    showLegend:series.length>1,legendPos:'t',legendFontSize:9,legendFontFace:'Arial',barGapWidthPct:55,showTitle:!!o.title,title:o.title,titleFontSize:11,titleFontFace:'Arial',titleColor:DC.navy,...o});
  // ---- 1. Title
  {const s=pptx.addSlide();s.background={color:DC.navy};s.addImage({data:logo,x:0.55,y:0.55,w:0.9,h:0.9});
    s.addText(focusName.toUpperCase(),{...F,x:0.85,y:2.0,w:11.6,h:1.25,fontSize:focusName.length>18?44:60,bold:true,color:'FFFFFF',fit:'shrink'});
    s.addText(`${mode==='brand'?'Brand':'Market'} focus  -  Variable Margin review vs previous scenario`,{...F,x:0.87,y:3.3,w:11.6,h:0.5,fontSize:22,bold:true,color:DC.sky});
    s.addShape(pptx.ShapeType.rect,{x:0,y:4.12,w:Wd,h:0.08,fill:{color:DC.sky},line:{color:DC.sky}});
    s.addText([{text:`FY${YEAR} ${META.region}  |  ${curLab()} vs ${prevLab()}`,options:{breakLine:true}},{text:`Markets: ${scopeM}   |   Brands: ${scopeB}   |   ${scopeC}`,options:{fontSize:12,breakLine:true}},{text:`Prepared ${today}`,options:{fontSize:13}}],
      {...F,x:0.87,y:4.45,w:11.6,h:1.35,fontSize:16,color:'FFFFFF',valign:'top',paraSpaceAfter:8,fit:'shrink'});
    s.addText(`© ${YEAR} ${META.company}. All Rights Reserved.`,{...F,x:0.85,y:6.95,w:6,h:0.25,fontSize:9,color:'FFFFFF'});}
  // ---- opportunities (used by summary, improvement and next-step slides)
  const opps=[];
  focus.forEach(e=>{const subs=grpBy(curE[e.k],O),subP=grpBy(prvE[e.k]||[],O);
    Object.entries(subs).forEach(([k,rs])=>{const c=dA(rs);if(c.ns<Math.max(5e4,e.C.ns*0.02))return;const where=`${nm(e.k)} · ${onm(k)}`;
      const gap=e.C.vmp-c.vmp;if(gap>0.03)opps.push({t:'margin',where,issue:`VM% ${pct(c.vmp)} vs ${pct(e.C.vmp)} ${E==='b'?'brand':'market'} average`,gap:pts(-gap),val:gap*c.ns,fix:'Check price, cost and royalty on the main SKUs; revisit the range mix.'});
      const ag=c.alp-e.C.alp;if(ag>0.03)opps.push({t:'allowance',where,issue:`Allowances ${pct(c.alp)} of gross vs ${pct(e.C.alp)} average`,gap:pts(ag),val:ag*c.gs,fix:'Review trade terms and promo depth with the key customers.'});
      const p=subP[k]?dA(subP[k]):null;if(p&&p.ns&&PREV_M.has(O==='m'?k:rs[0].m)){const lc=dA(rs.filter(r=>PREV_M.has(r.m)));const dv=lc.vmp-p.vmp;if(dv<-0.02)opps.push({t:'decline',where,issue:`VM% fell from ${pct(p.vmp)} to ${pct(lc.vmp)} vs previous scenario`,gap:pts(dv),val:-dv*lc.ns,fix:`Confirm what changed since ${prevLab()} (terms, cost, mix) and whether it is intended.`});}});});
  opps.sort((a,b)=>b.val-a.val);
  // SKU view (current submissions; VM = GM − shipping & warehousing)
  const skR=SK.rows.filter(r=>sc.mk.includes(r.m)&&S.ch.has(r.ch)&&S.b.has(r.b)),skG=grpBy(skR,'s');
  const skus=Object.entries(skG).map(([i,rs])=>{const a=dA(rs.map(r=>({...r,vm:r.gm-r.sw})));const o=SK.byI[+i];return {...a,id:o.id,n:o.n,b:o.b};}).filter(x=>x.ns>0);
  const nsCut=Math.max(1e5,C0.ns*0.003),big=skus.filter(x=>x.ns>=nsCut);
  const drags=[...big].sort((a,b)=>a.vmp-b.vmp).slice(0,6),stars=[...big].sort((a,b)=>b.vmp-a.vmp).slice(0,6);
  const skuCall=x=>x.vm<0?'Reduce FC':x.vmp<C0.vmp-0.10?'Review price / cost':x.vmp>C0.vmp+0.05?'Increase FC':'Hold FC';
  // headline texts (What / Why / Improve / Next)
  const topStep=BR?[...BR.steps].sort((a,b)=>Math.abs(b.v)-Math.abs(a.v))[0]:null;
  const whatT=hasPrev?`VM ${money(CL.vm)} (${pct(CL.vmp)} of net sales) vs ${money(P0.vm)} (${pct(P0.vmp)}) in the previous scenario: ${sgn$(CL.vm-P0.vm)}, ${pts(CL.vmp-P0.vmp)}.`:`VM ${money(C0.vm)} (${pct(C0.vmp)} of net sales). No previous scenario for this selection.`;
  const whyT=BR&&topStep?`${whyText(BR,P0,CL)} Allowances ${pct(P0.alp)} → ${pct(CL.alp)} of gross sales.`:`Compared with benchmarks only: VM% ${pct(C0.vmp)} vs ${pct(BM.vmp)} ${benchLab}.`;
  const impT=opps.length?`${opps[0].where}: ${opps[0].issue} – about ${money(opps[0].val)} of VM at stake.`:'No gap above 3 pts versus the benchmarks.';
  const nextT=opps.length?opps.slice(0,2).map(o=>`${o.where}: ${o.fix}`).join(' '):(stars[0]?`Protect and grow the strongest SKUs (e.g. ${stars[0].id} ${stars[0].n}).`:'Keep monitoring at the next forecast.');
  // ---- 2. The short version
  {const s=newSlide('The short version');callout(s,hasPrev?`${focusName}: Variable Margin ${CL.vm>=P0.vm?'up':'down'} ${money(Math.abs(CL.vm-P0.vm))} vs the previous scenario, VM% ${pct(P0.vmp)} → ${pct(CL.vmp)}. For every $100 of net sales we now keep $${(CL.vmp*100).toFixed(0)} after product cost, royalties, warehousing and shipping.`
      :`${focusName}: Variable Margin ${money(C0.vm)} on ${money(C0.ns)} net sales (${pct(C0.vmp)}). No previous scenario covers this selection, so it is benchmarked against the ${benchLab} (${pct(BM.vmp)}).`);
    const K=hasPrev?[['Net Sales',money(P0.ns),money(CL.ns),(CL.ns-P0.ns)/(P0.ns||1),'%'],['Variable Margin',money(P0.vm),money(CL.vm),CL.vm-P0.vm,'$'],['VM %',pct(P0.vmp),pct(CL.vmp),CL.vmp-P0.vmp,'pp'],['Allowance %',pct(P0.alp),pct(CL.alp),CL.alp-P0.alp,'ppi']]
      :[['Net Sales','',money(C0.ns),null],['Variable Margin','',money(C0.vm),null],['VM %',pct(BM.vmp),pct(C0.vmp),C0.vmp-BM.vmp,'pp'],['Allowance %',pct(BM.alp),pct(C0.alp),C0.alp-BM.alp,'ppi']];
    K.forEach(([lab,a,b,d,t],i)=>{const x=0.55+i*3.1,w=2.9;s.addShape(pptx.ShapeType.rect,{x,y:1.95,w,h:1.25,fill:{color:DC.blue},line:{color:DC.blue}});
      s.addText([{text:lab,options:{fontSize:12,bold:true,breakLine:true}},{text:a?`${a}  →  ${b}`:b,options:{fontSize:16,bold:true}}],{...F,x:x+0.12,y:1.98,w:w-0.24,h:1.2,color:'FFFFFF',valign:'top',paraSpaceAfter:6,fit:'shrink'});
      const dt=d==null?'current':t==='%'?`${d>=0?'+':''}${(d*100).toFixed(1)}%`:t==='$'?sgn$(d):pts(d);const col=d==null?DC.gray:good(d,t==='ppi');
      s.addShape(pptx.ShapeType.rect,{x,y:3.2,w,h:0.45,fill:{color:col},line:{color:col}});s.addText(dt+(hasPrev?'':(d==null?'':' vs benchmark')),{...F,x,y:3.2,w,h:0.45,fontSize:13,bold:true,color:'FFFFFF',align:'center',valign:'middle'});});
    [['1  What happened',whatT],['2  Why it happened',whyT],['3  Improvement area',impT],['4  Next steps',nextT]].forEach(([h,t],i)=>{const x=0.55+(i%2)*6.2,y=3.95+Math.floor(i/2)*1.45;
      s.addShape(pptx.ShapeType.rect,{x,y,w:6.05,h:1.3,fill:{color:DC.soft},line:{color:DC.hair}});s.addShape(pptx.ShapeType.rect,{x,y,w:0.07,h:1.3,fill:{color:DC.sky},line:{color:DC.sky}});
      s.addText([{text:h,options:{bold:true,color:DC.navy,fontSize:13,breakLine:true}},{text:t,options:{fontSize:11.5}}],{...F,x:x+0.2,y:y+0.05,w:5.75,h:1.2,valign:'top',paraSpaceAfter:4,fit:'shrink'});});
    note(s,lflNote+' VM (Variable Margin) = net sales less product cost, royalties, warehousing and shipping.');}
  // ---- 3. Scorecard
  {const s=newSlide(`Scorecard by ${E==='b'?'brand':'market'}`,'1 · WHAT HAPPENED');const list=ents.slice(0,12);
    const rows=[[hdr(E==='b'?'Brand':'Market'),hdr('Net sales'),hdr('vs prev.'),hdr('VM %'),hdr('vs prev.'),hdr('Allowance %'),hdr('vs prev.'),hdr('What changed')]];
    list.forEach(e=>{const hp=e.P.ns>0&&e.L.ns>0,dv=e.L.vmp-e.P.vmp,da=e.L.alp-e.P.alp,dn=(e.L.ns-e.P.ns)/(e.P.ns||1);
      rows.push([cell(nm(e.k),{bold:true}),cell(money(e.C.ns),{align:'right'}),cell(hp?`${dn>=0?'+':''}${(dn*100).toFixed(0)}%`:'–',{align:'right',color:hp?good(dn):DC.gray}),cell(pct(e.C.vmp),{align:'right',bold:true}),
        cell(hp?pts(dv):'–',{align:'right',color:hp?good(dv):DC.gray,bold:true}),cell(pct(e.C.alp),{align:'right'}),cell(hp?pts(da):'–',{align:'right',color:hp?good(da,true):DC.gray}),cell(hp?whyText(e.br,e.P,e.L):`No previous scenario; vs ${benchLab}: VM% ${pts(e.C.vmp-BM.vmp)}.`,{fontSize:8.5})]);});
    rows.push([cell('Total selection',{bold:true,fill:{color:DC.tint}}),cell(money(C0.ns),{bold:true,align:'right',fill:{color:DC.tint}}),cell(hasPrev?`${CL.ns>=P0.ns?'+':''}${((CL.ns-P0.ns)/(P0.ns||1)*100).toFixed(0)}%`:'–',{bold:true,align:'right',fill:{color:DC.tint}}),
      cell(pct(C0.vmp),{bold:true,align:'right',fill:{color:DC.tint}}),cell(hasPrev?pts(CL.vmp-P0.vmp):'–',{bold:true,align:'right',fill:{color:DC.tint},color:hasPrev?good(CL.vmp-P0.vmp):DC.gray}),cell(pct(C0.alp),{bold:true,align:'right',fill:{color:DC.tint}}),
      cell(hasPrev?pts(CL.alp-P0.alp):'–',{bold:true,align:'right',fill:{color:DC.tint},color:hasPrev?good(CL.alp-P0.alp,true):DC.gray}),cell(hasPrev?whyText(BR,P0,CL):'',{fontSize:8.5,fill:{color:DC.tint}})]);
    s.addTable(rows,{x:0.55,y:1.2,w:12.25,colW:[1.9,1.0,0.8,0.8,0.85,1.0,0.85,5.05],fontFace:'Arial',fontSize:9.5,color:DC.ink,border:{type:'solid',pt:0.5,color:DC.hair},rowH:0.36,valign:'middle',margin:0.04,autoPage:false});
    note(s,`"vs prev." = change vs the ${srcName(PREV_K)} (like-for-like markets). Net sales and VM % in the first columns are the full current selection. Green = better, magenta = worse. ${sc.noBase.length?lflNote:''}`);}
  // ---- 4. VM% and allowance charts
  {const s=newSlide('Margin and allowances: now vs previous scenario','1 · WHAT HAPPENED');const ce=ents.filter(e=>e.P.ns>0&&e.L.ns>0).slice(0,10);
    if(ce.length){const labs=ce.map(e=>nm(e.k));const mv=[...ce].sort((a,b)=>Math.abs(b.L.vmp-b.P.vmp)-Math.abs(a.L.vmp-a.P.vmp))[0];
      callout(s,`Biggest VM% move: ${nm(mv.k)} ${pts(mv.L.vmp-mv.P.vmp)} (${pct(mv.P.vmp)} → ${pct(mv.L.vmp)}). Allowances for the selection moved ${pts(CL.alp-P0.alp)} to ${pct(CL.alp)} of gross sales.`);
      bar(s,labs,[{name:'Previous scenario',values:ce.map(e=>e.P.vmp),color:DC.prev},{name:'Current submission',values:ce.map(e=>e.L.vmp),color:DC.blue}],{x:0.45,y:1.95,w:6.2,h:4.85,title:'VM % of net sales'});
      bar(s,labs,[{name:'Previous scenario',values:ce.map(e=>e.P.alp),color:DC.prev},{name:'Current submission',values:ce.map(e=>e.L.alp),color:DC.sky}],{x:6.75,y:1.95,w:6.2,h:4.85,title:'Allowances % of gross sales (lower is better)'});
      note(s,lflNote+' Bars compare the same markets in both scenarios.');}
    else{callout(s,`No previous scenario exists for this selection. VM% ${pct(C0.vmp)} vs ${pct(BM.vmp)} ${benchLab}.`);const labs=ents.slice(0,10).map(e=>nm(e.k));
      bar(s,labs,[{name:'Current VM %',values:ents.slice(0,10).map(e=>e.C.vmp),color:DC.blue}],{x:0.45,y:1.95,w:6.2,h:4.85,title:'VM % of net sales'});
      bar(s,labs,[{name:'Current allowance %',values:ents.slice(0,10).map(e=>e.C.alp),color:DC.sky}],{x:6.75,y:1.95,w:6.2,h:4.85,title:'Allowances % of gross sales'});note(s,lflNote);}}
  // ---- 4b. monthly phasing (only when the current or previous scenario is a phased forecast; current first)
  const PK=MONS[CUR_K]?CUR_K:MONS[PREV_K]?PREV_K:null;
  if(PK){const MP=MONS[PK],PL=MP.lab,mr=MP.R.filter(r=>sc.mk.includes(r.m)&&S.ch.has(r.ch)&&(sc.aB||S.b.has(r.b)));
    if(mr.length){const ser=mSeries(mr),T=cAgg(mr),nsv=ser.map(o=>o.ns),pk=nsv.indexOf(Math.max(...nsv)),h2=T.ns?sum(nsv.slice(6),x=>x)/T.ns:0,q4=T.ns?sum(nsv.slice(9),x=>x)/T.ns:0;
      const tg=sc.aB?MO.map((_,i)=>sum(MP.tgt.filter(a=>sc.mk.includes(a[0])&&S.ch.has(a[1])&&a[2]===i+1),a=>a[3])):null;
      const s=newSlide(`${PL} by month`,'1 · WHAT HAPPENED');
      callout(s,`${focusName}: ${money(T.ns)} net revenue in ${PL}, peaking in ${MO[pk]} (${money(nsv[pk])}). The second half carries ${pct(h2)} of the year and Q4 ${pct(q4)}.`);
      const series=[{name:PL,labels:MO,values:nsv.map(v=>v/1e6)}];if(tg)series.push({name:'Monthly phasing target',labels:MO,values:tg.map(v=>v/1e6)});
      s.addChart(pptx.ChartType.bar,series,{x:0.45,y:1.95,w:8.3,h:4.8,barDir:'col',barGrouping:'clustered',chartColors:tg?[DC.blue,DC.prev]:[DC.blue],showValue:!tg,dataLabelFormatCode:'0.0',dataLabelFontSize:8,dataLabelFontFace:'Arial',dataLabelColor:DC.ink,
        valAxisLabelFormatCode:'0',valAxisLabelFontSize:9,valAxisLabelFontFace:'Arial',catAxisLabelFontSize:9,catAxisLabelFontFace:'Arial',catAxisLabelColor:DC.ink,valGridLine:{color:DC.hair,size:0.5},
        showLegend:!!tg,legendPos:'t',legendFontSize:9,legendFontFace:'Arial',showTitle:true,title:'Net revenue by month, $M',titleFontSize:11,titleFontFace:'Arial',titleColor:DC.navy,barGapWidthPct:45});
      const live=ser.map((o,i)=>({i,v:o.vmp,ns:o.ns})).filter(x=>x.ns>0),lo=live.reduce((a,b)=>b.v<a.v?b:a,live[0]),hi=live.reduce((a,b)=>b.v>a.v?b:a,live[0]);
      const pts4=[`Peak month: ${MO[pk]}, ${pct(nsv[pk]/(T.ns||1))} of the year.`,`Second half ${pct(h2)} and Q4 ${pct(q4)} of full-year net revenue.`,
        `Variable Margin ${money(T.vm)} (${pct(T.vmp)}); by month from ${pct(lo.v)} in ${MO[lo.i]} to ${pct(hi.v)} in ${MO[hi.i]}.`];
      if(tg)pts4.push(`Every month matches the monthly phasing targets to within ${money0(Math.max(...nsv.map((v,i)=>Math.abs(v-tg[i]))))}.`);
      else pts4.push('Phasing targets are set per market and channel, so they are not shown for a brand selection.');
      s.addText('Key points',{...F,x:9.0,y:1.95,w:3.9,h:0.35,fontSize:14,bold:true,color:DC.navy});bullets(s,pts4,{x:9.0,y:2.35,w:3.9,h:4.3,fontSize:11});
      note(s,`${PL} = ${DS[MP.base].lab} quantities rescaled month by month so Domestic and FOB net revenue matches the monthly phasing targets; each brand keeps its yearly share of its market. Market submissions have no monthly split.`);}}
  // ---- 5. VM bridge
  if(BR){const s=newSlide(`What moved Variable Margin (${sgn$(BR.end-BR.start)})`,'2 · WHY IT HAPPENED');
    callout(s,whyText(BR,P0,CL)+` Volume changes the size of the margin; allowances, product cost and logistics change the margin rate.`);
    const pts5=[{l:'Previous VM',v:BR.start,t:'tot'},...BR.steps.map(x=>({l:x.l,v:x.v,t:'step'})),{l:'Current VM',v:BR.end,t:'end'}];
    let run=0;const bars=pts5.map(p=>{if(p.t==='step'){const y0=run;run+=p.v;return {...p,y0,y1:run};}run=p.v;return {...p,y0:0,y1:p.v};});
    const lo=Math.min(0,...bars.map(b=>Math.min(b.y0,b.y1))),hi=Math.max(...bars.map(b=>Math.max(b.y0,b.y1))),X0=0.7,Y0=2.25,WW=7.6,HH=3.9,sp=WW/bars.length,bw=sp*0.66,Y=v=>Y0+(hi-v)/((hi-lo)||1)*HH;
    bars.forEach((b,i)=>{const x=X0+i*sp+(sp-bw)/2,top=Y(Math.max(b.y0,b.y1)),h=Math.max(0.03,Math.abs(Y(b.y0)-Y(b.y1)));const col=b.t==='tot'?DC.blue:b.t==='end'?DC.navy:(b.v>=0?DC.lime:DC.mag);
      s.addShape(pptx.ShapeType.rect,{x,y:top,w:bw,h,fill:{color:col},line:{color:col}});s.addText(b.t==='step'?sgn$(b.v):money(b.v),{...F,x:x-0.2,y:top-0.34,w:bw+0.4,h:0.3,fontSize:11,bold:true,align:'center'});
      s.addText(b.l,{...F,x:x-0.2,y:Y(lo)+0.06,w:bw+0.4,h:0.5,fontSize:9.5,bold:true,align:'center',valign:'top'});});
    s.addShape(pptx.ShapeType.line,{x:X0-0.1,y:Y(0),w:WW+0.2,h:0,line:{color:DC.gray,width:1}});
    const ex={vol:`Sales volume & mix: gross sales ${money(P0.gs)} → ${money(CL.gs)}, valued at the previous margin rate.`,alw:`Allowances (trade discounts, promotions): ${pct(P0.alp)} → ${pct(CL.alp)} of gross sales.`,
      gm:`Product cost & royalties: ${pct(P0.cp)} → ${pct(CL.cp)} of gross sales.`,sw:`Warehousing & shipping: ${pct(P0.wp)} → ${pct(CL.wp)} of gross sales.`};
    s.addText('How to read it',{...F,x:8.75,y:2.0,w:4.1,h:0.35,fontSize:14,bold:true,color:DC.navy});
    bullets(s,BR.steps.map(x=>`${ex[x.k]} Effect ${sgn$(x.v)}.`),{x:8.75,y:2.4,w:4.1,h:4.3,fontSize:11});
    note(s,lflNote+' Each step changes one driver at a time, in the order shown; together they add up exactly to the VM change.');}
  // ---- 6. drivers by entity
  {const de=ents.filter(e=>e.br).slice(0,12);if(de.length){const s=newSlide(`Why it happened: drivers by ${E==='b'?'brand':'market'}`,'2 · WHY IT HAPPENED');
    const mx=Math.max(...de.flatMap(e=>e.br.steps.map(x=>Math.abs(x.v))),1),shade=v=>{const t=Math.min(1,Math.abs(v)/mx);const mix=(a,b)=>Math.round(a+(b-a)*t).toString(16).padStart(2,'0');return v>=0?mix(255,215)+mix(255,238)+mix(255,190):mix(255,244)+mix(255,200)+mix(255,225);};
    const rows=[[hdr(E==='b'?'Brand':'Market'),hdr('Previous VM'),hdr('Volume & mix'),hdr('Allowances'),hdr('Product margin'),hdr('Warehousing & shipping'),hdr('Current VM'),hdr('Change')]];
    de.forEach(e=>rows.push([cell(nm(e.k),{bold:true}),cell(money(e.br.start),{align:'right'}),...e.br.steps.map(x=>cell(sgn$(x.v),{align:'right',fill:{color:shade(x.v)}})),cell(money(e.br.end),{align:'right',bold:true}),cell(sgn$(e.br.end-e.br.start),{align:'right',bold:true,color:good(e.br.end-e.br.start)})]));
    s.addTable(rows,{x:0.55,y:1.2,w:12.25,colW:[2.25,1.4,1.45,1.45,1.5,1.7,1.3,1.2],fontFace:'Arial',fontSize:10,color:DC.ink,border:{type:'solid',pt:0.5,color:DC.hair},rowH:0.36,valign:'middle',margin:0.05,autoPage:false});
    const worst=[...de].sort((a,b)=>(a.br.end-a.br.start)-(b.br.end-b.br.start))[0],best=[...de].sort((a,b)=>(b.br.end-b.br.start)-(a.br.end-a.br.start))[0];
    bullets(s,[`${nm(best.k)}: ${whyText(best.br,best.P,best.L)}`,`${nm(worst.k)}: ${whyText(worst.br,worst.P,worst.L)}`],{x:0.55,y:Math.min(6.0,1.35+rows.length*0.36+0.15),w:12.25,h:0.9,fontSize:11});
    note(s,'Green cells added margin, pink cells took margin away (darker = bigger). '+lflNote);}}
  // ---- 7. benchmarks
  {const s=newSlide('How we compare with the benchmark','2 · WHY IT HAPPENED');const be=ents.slice(0,10),labs=be.map(e=>nm(e.k));
    const above=be.filter(e=>e.C.vmp>BM.vmp+0.03).map(e=>nm(e.k)),below=be.filter(e=>e.C.vmp<BM.vmp-0.03).map(e=>nm(e.k)),hiA=be.filter(e=>e.C.alp>BM.alp+0.03).map(e=>nm(e.k));
    callout(s,`Benchmark = ${benchLab}: VM% ${pct(BM.vmp)}, allowances ${pct(BM.alp)} of gross sales.`);
    bar(s,labs,[{name:'Benchmark',values:be.map(()=>BM.vmp),color:DC.prev},{name:'Current',values:be.map(e=>e.C.vmp),color:DC.blue}],{x:0.45,y:1.95,w:6.2,h:4.1,title:'VM % vs benchmark'});
    bar(s,labs,[{name:'Benchmark',values:be.map(()=>BM.alp),color:DC.prev},{name:'Current',values:be.map(e=>e.C.alp),color:DC.sky}],{x:6.75,y:1.95,w:6.2,h:4.1,title:'Allowance % vs benchmark (lower is better)'});
    bullets(s,[above.length?`Above benchmark on margin: ${above.join(', ')}.`:'No one is more than 3 pts above the benchmark margin.',below.length?`Below benchmark on margin: ${below.join(', ')}.`:'No one is more than 3 pts below the benchmark margin.',hiA.length?`Allowances more than 3 pts above benchmark: ${hiA.join(', ')}.`:'Allowance levels are within 3 pts of the benchmark.'],{x:0.55,y:6.08,w:12.25,h:0.8,fontSize:10.5});}
  // ---- 8. deep dives
  focus.slice(0,6).forEach(e=>{const s=newSlide(`${nm(e.k)}: by ${O==='m'?'market':'brand'}`,'1-2 · WHAT & WHY');const subs=grpBy(curE[e.k],O),subP=grpBy(prvE[e.k]||[],O);
    const sl=Object.entries(subs).map(([k,rs])=>{const c=dA(rs),l=dA(rs.filter(r=>PREV_M.has(r.m))),p=subP[k]?dA(subP[k]):null;return {k,c,l,p:p&&p.ns&&l.ns?p:null};}).sort((a,b)=>b.c.ns-a.c.ns).slice(0,9);
    const hp=e.P.ns>0&&e.L.ns>0;
    [['Net sales',money(e.C.ns)],['VM %',pct(e.C.vmp)],[hp?'VM % vs prev.':'VM % vs bench.',hp?pts(e.L.vmp-e.P.vmp):pts(e.C.vmp-BM.vmp)],['Allowance %',pct(e.C.alp)],[`Share of selection NS`,pct(e.C.ns/(C0.ns||1),0)]].forEach(([l,v],i)=>{const x=0.55+i*2.47;
      s.addShape(pptx.ShapeType.rect,{x,y:1.15,w:2.32,h:0.8,fill:{color:i===2?DC.navy:DC.blue},line:{color:DC.blue}});s.addText([{text:l,options:{fontSize:9.5,breakLine:true}},{text:v,options:{fontSize:17,bold:true}}],{...F,x:x+0.08,y:1.15,w:2.16,h:0.8,color:'FFFFFF',valign:'middle',fit:'shrink'});});
    const cs=sl.filter(x=>x.p);const labs=(cs.length?cs:sl).map(x=>onm(x.k));
    bar(s,labs,cs.length?[{name:'Previous scenario',values:cs.map(x=>x.p.vmp),color:DC.prev},{name:'Current submission',values:cs.map(x=>x.l.vmp),color:DC.blue}]:[{name:'Current VM %',values:sl.map(x=>x.c.vmp),color:DC.blue}],{x:0.45,y:2.1,w:6.6,h:4.7,title:`VM % by ${O==='m'?'market':'brand'}`});
    const com=[];const mv=[...cs].sort((a,b)=>Math.abs(b.l.vmp-b.p.vmp)-Math.abs(a.l.vmp-a.p.vmp))[0];
    if(mv){const w=whyText(bridge(mv.p,mv.l),mv.p,mv.l).replace(/^VM% [^:;.]*[:;]? ?/,'');com.push(`Biggest change: ${onm(mv.k)} ${pts(mv.l.vmp-mv.p.vmp)} (${pct(mv.p.vmp)} → ${pct(mv.l.vmp)})${w.length>1?' – '+w:'.'}`);}
    const lo2=[...sl].sort((a,b)=>a.c.vmp-b.c.vmp)[0],hi2=[...sl].sort((a,b)=>b.c.vmp-a.c.vmp)[0];if(lo2&&hi2&&lo2!==hi2)com.push(`Range: ${onm(hi2.k)} earns ${pct(hi2.c.vmp)} VM, ${onm(lo2.k)} only ${pct(lo2.c.vmp)}.`);
    const ha=sl.filter(x=>x.c.alp>e.C.alp+0.03);if(ha.length)com.push(`Allowances above the ${E==='b'?'brand':'market'} average (${pct(e.C.alp)}): ${ha.map(x=>`${onm(x.k)} ${pct(x.c.alp)}`).join(', ')}.`);
    const nb=sl.filter(x=>!x.p).map(x=>onm(x.k));if(hp&&nb.length)com.push(`No previous scenario for: ${nb.join(', ')}.`);
    if(!hp)com.push(`Compared with the ${benchLab}: VM% ${pts(e.C.vmp-BM.vmp)}, allowances ${pts(e.C.alp-BM.alp)}.`);
    s.addText('Comments',{...F,x:7.3,y:2.15,w:5.5,h:0.35,fontSize:14,bold:true,color:DC.navy});bullets(s,com.length?com:['In line with the previous scenario.'],{x:7.3,y:2.55,w:5.5,h:4.2,fontSize:11});note(s,lflNote);});
  // ---- 9. improvement areas
  {const s=newSlide('Where to improve','3 · IMPROVEMENT AREAS');const list=opps.slice(0,8);
    callout(s,list.length?`${list.length} improvement area${list.length>1?'s':''} found. Closing ${list.length>1?'them':'it'} is worth up to ${money(sum(list,o=>o.val))} of Variable Margin (before any volume effect).`:'No margin, allowance or decline gap above the 3-point threshold in this selection.');
    if(list.length){const rows=[[hdr('Where'),hdr('What we see'),hdr('Gap'),hdr('VM at stake'),hdr('Suggested fix')]];
      list.forEach(o=>rows.push([cell(o.where,{bold:true}),cell(o.issue),cell(o.gap,{align:'center',color:DC.mag,bold:true}),cell(money(o.val),{align:'right',bold:true}),cell(o.fix,{fontSize:9})]));
      s.addTable(rows,{x:0.55,y:2.0,w:12.25,colW:[2.6,3.8,0.9,1.25,3.7],fontFace:'Arial',fontSize:10,color:DC.ink,border:{type:'solid',pt:0.5,color:DC.hair},rowH:0.4,valign:'middle',margin:0.05,autoPage:false});}
    note(s,'"VM at stake" = the gap in points × net sales (allowances: × gross sales at the current margin rate). Thresholds: 3 pts below average margin, 3 pts above average allowances, or 2 pts decline vs previous scenario; only areas above 2% of the focus net sales.');}
  // ---- 10. SKUs
  if(big.length){const s=newSlide('SKUs to act on','3 · IMPROVEMENT AREAS');
    const tbl=(title,list,x,col)=>{s.addText(title,{...F,x,y:1.2,w:6,h:0.35,fontSize:14,bold:true,color:col});
      const rows=[[hdr('SKU'),hdr('Brand'),hdr('Net sales'),hdr('VM %'),hdr('Suggestion')]];list.forEach(k=>rows.push([cell(`${k.id} ${k.n}`,{fontSize:8.5}),cell(k.b,{fontSize:8.5}),cell(money(k.ns),{align:'right'}),cell(pct(k.vmp),{align:'right',bold:true,color:k.vmp<C0.vmp?DC.mag:DC.lime}),cell(skuCall(k),{fontSize:9,bold:true})]));
      s.addTable(rows,{x,y:1.6,w:6.05,colW:[2.45,1.25,0.85,0.65,0.85],fontFace:'Arial',fontSize:9.5,color:DC.ink,border:{type:'solid',pt:0.5,color:DC.hair},rowH:0.42,valign:'middle',margin:0.04,autoPage:false});};
    tbl('Margin drags (lowest VM %)',drags,0.55,DC.mag);tbl('Margin stars (highest VM %)',stars,6.75,DC.lime);
    note(s,`SKU detail from the market submissions (no SKU-level previous scenario). SKUs with at least ${money(nsCut)} net sales. Suggestion rule: negative VM → reduce FC; VM% more than 10 pts under the selection average (${pct(C0.vmp)}) → review price/cost; more than 5 pts above → increase FC. Check sell-through and stock before changing forecasts.`);}
  // ---- 11. next steps
  {const s=newSlide('Next steps','4 · NEXT STEPS');const acts=[];
    opps.slice(0,3).forEach(o=>acts.push([`${o.where}: ${o.fix}`,o.t==='allowance'?'Commercial / Sales':o.t==='decline'?'Market finance':'Brand & commercial finance',`${money(o.val)} VM`]));
    const up=stars.filter(k=>skuCall(k)==='Increase FC').slice(0,3),dn=drags.filter(k=>skuCall(k)!=='Hold FC').slice(0,3);
    if(up.length)acts.push([`Increase FC on the strongest SKUs: ${up.map(k=>k.id).join(', ')}, if demand and stock allow.`,'Demand planning','Growth']);
    if(dn.length)acts.push([`Reduce FC or fix economics on: ${dn.map(k=>`${k.id} (${skuCall(k).toLowerCase()})`).join(', ')}.`,'Brand team + finance','Margin']);
    if(sc.noBase.length)acts.push([`Add ${sc.noBase.map(pm).join(', ')} to the central forecast so the next review is fully like-for-like.`,'Regional finance','Data']);
    acts.push(['Re-run this deck after the next forecast pass and track the gaps above.','Regional finance','Follow-up']);
    const rows=[[hdr('#'),hdr('Action'),hdr('Suggested owner'),hdr('Why / value')]];acts.slice(0,7).forEach((a,i)=>rows.push([cell(i+1,{align:'center',bold:true,color:DC.blue}),cell(a[0]),cell(a[1],{fontSize:9.5}),cell(a[2],{fontSize:9.5,bold:true})]));
    callout(s,`Priorities for ${focusName}, in order of VM at stake.`,1.15,0.55);
    s.addTable(rows,{x:0.55,y:1.9,w:12.25,colW:[0.5,7.6,2.2,1.95],fontFace:'Arial',fontSize:10.5,color:DC.ink,border:{type:'solid',pt:0.5,color:DC.hair},rowH:0.5,valign:'middle',margin:0.06,autoPage:false});
    note(s,'Suggested owners are generic roles; adjust to your team.');}
  // ---- 12. glossary & method
  {const s=newSlide('How to read this deck');
    s.addText('Plain-English glossary',{...F,x:0.55,y:1.2,w:6,h:0.35,fontSize:14,bold:true,color:DC.navy});
    bullets(s,['Gross sales – list-price value of what we ship to customers.','Allowances – trade discounts, promotions and rebates we give customers; shown as % of gross sales (lower keeps more money).','Net sales – what customers actually pay: gross sales minus allowances.','Product margin – net sales minus product cost and royalties to licensors.','Variable Margin (VM) – product margin minus warehousing and shipping. VM % = VM ÷ net sales: "cents kept per dollar sold".','pts – percentage points: 45% → 47% is +2 pts.'],{x:0.55,y:1.6,w:6.1,h:5.0,fontSize:11});
    s.addText('Method & sources',{...F,x:6.95,y:1.2,w:5.9,h:0.35,fontSize:14,bold:true,color:DC.navy});
    bullets(s,[`Current: ${srcDesc(CUR_K)}`,`Previous scenario: ${srcDesc(PREV_K)}`,'Closeouts and central costs are excluded; VM is before central overheads.',...((CUR_K==='sub')!==(PREV_K==='sub')?['Caveat: the two sources cost differently (central = standard cost + logistics allocation; markets = own inventory cost + Shipping & Warehousing line). Part of any product-cost or logistics variance can be definitional – validate large moves.']:[]),'Brands use the same brand mapping for both scenarios.',`Selection: ${scopeM} · ${scopeB} · ${scopeC}.`],{x:6.95,y:1.6,w:5.9,h:5.0,fontSize:10.5});}
  const blob=await pptx.write({outputType:'blob'});
  const safe=t=>t.replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,80);
  return {blob,name:`Forecast ${mode==='brand'?'Brand':'Market'} Focus - ${safe(focusName)} - ${new Date().toISOString().slice(0,10)}.pptx`};}
function deckMsg(cls,t){const n=$('#deckNote');n.className='railnote '+(cls||'');n.textContent=t;}
async function exportDeck(mode){deckSync();if(CUR_K===PREV_K||DS[PREV_K].pending)return;const bs=$$('.deckbtn');bs.forEach(b=>b.disabled=true);deckMsg('busy','Building the deck…');
  try{await loadPptx();const {blob,name}=await buildDeck(mode);
    const dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null;
    if(dl){try{await dl.save({filename:name,data:blob});deckMsg('ok','Deck ready: '+name);}catch(e){const c=e&&e.code;deckMsg(c==='declined'?'':'err',c==='declined'?'Download cancelled.':c==='rate_limited'?'A download prompt is already open; try again in a moment.':'Download not available here ('+(c||'error')+').');}}
    else{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);deckMsg('ok','Deck ready: '+name);}}
  catch(e){console.error(e);deckMsg('err',e.message||'Could not build the deck.');}
  finally{bs.forEach(b=>b.disabled=false);}}
$$('.deckbtn').forEach(b=>b.addEventListener('click',()=>exportDeck(b.dataset.deck)));

// controls
const liveM=()=>[...S.m].filter(x=>S.view==='raw'||x!==CENTRAL);
// Multi-select dropdown: search, select all (or all matches), invert, per-row "only"; never leaves the selection empty.
