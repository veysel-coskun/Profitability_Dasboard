// ---------- Insights Engine (chat, via the viewer's Claude) ----------
// market aliases are built from META.markets: both the market code and its display name, lower-cased with punctuation collapsed to single spaces
const aliasKey=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const MKT_ALIAS=(()=>{const o={};Object.entries(META.markets||{}).forEach(([c,v])=>{if(c===CENTRAL)return;[c,v&&v.name].forEach(t=>{const k=t?aliasKey(t):'';if(k)o[k]=c;});});return o;})();
const BR_ALIAS={};   // brands are matched on their punctuation-free names (see detect); no hard-coded aliases
const normT=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const BR_ALL=[...new Set([...ALL_B,...FCS.s.map(s=>s[2])])].filter(b=>b!==CLOSE&&b!=='Unmapped');
const ID_ALL=new Set([...SK.list.map(o=>o.id),...FCS.s.map(s=>s[0])]);
const MK_ALL=[...new Set([...ALL_M,...FCS.m])].filter(m=>m!==CENTRAL);
function detect(q){const ql=' '+q.toLowerCase()+' ',n=normT(q),ms=new Set(),bs=new Set(),ids=new Set(),src=new Set();
  Object.entries(MKT_ALIAS).forEach(([a,m])=>{if(new RegExp('[^a-z]'+a.replace(/ /g,'\\s+')+'[^a-z]').test(ql))ms.add(m);});
  BR_ALL.forEach(b=>{const k=normT(b);if(k.length>=4&&n.includes(k))bs.add(b);});Object.entries(BR_ALIAS).forEach(([a,b])=>{if(n.includes(a)&&BR_ALL.includes(b))bs.add(b);});
  (q.match(/\b[A-Z0-9]{5,6}\b/gi)||[]).forEach(t=>{const T=t.toUpperCase();if(ID_ALL.has(T))ids.add(T);});
  if(/\bjul(y)?\b|\bfc ?1\b|forecast (#|number )?(1|one)\b/i.test(q))src.add('jul');if(/\bsept?\b|september|\bfc ?2\b|forecast (#|number )?(2|two)\b/i.test(q))src.add('sep');if(/submission/i.test(q))src.add('sub');
  return {ms,bs,ids,src};}
// small table helpers for the data pack
const f$=v=>v==null||!isFinite(v)?'–':money(v),fP=v=>v==null||!isFinite(v)?'–':(v*100).toFixed(1)+'%',fU=v=>v==null?'–':'$'+v.toFixed(2),fE=v=>v==null?'–':'€'+v.toFixed(2),fN=v=>Math.round(v).toLocaleString('en-US');
function tb(title,cols,rows,note){return {title,cols,rows,note};}
function subRows(M,B){return skuRows().filter(r=>M.has(r.m)&&(B==='ALL'||(B?B.has(r.b):(allBrands()||S.b.has(r.b)))));}
function subLine(lab,rs){const T=sAgg(rs),sw=sum(rs,r=>r.sw||0),p=pAgg(rs.map(r=>({id:SK.byI[r.s].id,u:r.u,ns:r.ns,gs:r.gs,al:r.al})));
  return [lab,f$(T.ns),fN(T.u),T.u>0?fU(T.ns/T.u):'–',fP(T.alp),fP(T.gmp),fP(T.ns?(T.gm-sw)/T.ns:null),fP(T.opp),fU(p.avg),fE(p.avgE)];}
const SUBC=['Scope','Net sales','Units','NS/unit','Allow % of gross','GM %','GM − S&W %','Op %','Avg SRP $','Avg SRP €'];
function cfcLine(lab,J,P){const j=pAgg(J),p=pAgg(P),jn=sum(J,r=>r.ns),pn=sum(P,r=>r.ns),jv=sum(J,r=>r.vm),pvv=sum(P,r=>r.vm);
  return [lab,f$(jn),f$(pn),jn?fP(pn/jn-1):'–',fP(jn?jv/jn:null),fP(pn?pvv/pn:null),fP(j.alp),fP(p.alp),fU(j.avg),fU(p.avg)];}
const CFCC=['Scope','FC1 Jul net rev','FC2 Sept net rev','Change','FC1 VM %','FC2 VM %','FC1 Allow %','FC2 Allow %','FC1 avg SRP $','FC2 avg SRP $'];
function buildPack(q,prev){const d=detect(q),follow=!!prev&&(/^(and|what about|how about|same|also|now|then|vs|versus|compared?)\b/i.test(q.trim())||q.trim().length<60);
  let M=d.ms.size?d.ms:(follow?prev.M:null),B=d.bs.size?d.bs:(follow?prev.B:null),ids=d.ids;
  if(ENG.force){M=null;B=null;ids=new Set();ENG.force=false;}   // "See in detail" prompts: analyse the whole rail selection, not just names quoted in the prompt
  if(!d.ms.size&&!d.bs.size&&!ids.size&&prev){M=prev.M;B=prev.B;ids=prev.ids||new Set();}
  const Mset=M||new Set(liveM().filter(m=>m!==CENTRAL)),allMk=new Set(MK_ALL);const T=[];
  const scopeTxt=`Markets: ${M?[...M].map(cName).join(', '):'rail selection ('+[...Mset].map(mS).join(', ')+')'} · Brands: ${B?[...B].join(', '):(allBrands()?'all brands':'rail selection ('+[...S.b].slice(0,12).join(', ')+(S.b.size>12?'…':'')+')')} · Channels: ${[...S.ch].map(c=>CH[c]).join(', ')} · Central costs: ${S.view==='alloc'?'allocated':'separate'}`;
  // 1 market submissions by market
  const sr=subRows(allMk,B),srM=grp(sr,r=>r.m),rws=[...Mset].filter(m=>srM[m]).map(m=>subLine(cName(m),srM[m]));
  rws.push(subLine('EMEA total (all markets, same brands)',sr));if(B)rws.push(subLine('EMEA all brands (benchmark)',subRows(allMk,'ALL')));
  T.push(tb('Market submissions (FY'+META.year+'): P&L by market',SUBC,rws,'Closeouts excluded. "GM − S&W %" = gross margin less shipping & warehousing, before royalties (SKU-level submissions have no royalty split; the Header timeframes table has the full like-for-like VM). Op % after central costs '+(S.view==='alloc'?'allocated':'shown separately')+'.'));
  if(B&&B.size>1&&B.size<=8){const bb=[];[...B].forEach(b=>{const x=subRows(Mset,new Set([b]));if(x.length)bb.push(subLine(b+' · selected markets',x));[...Mset].forEach(m=>{const y=x.filter(r=>r.m===m);if(y.length)bb.push(subLine(b+' · '+cName(m),y));});});T.push(tb('Market submissions: by brand and market',SUBC,bb));}
  if(!B){const bR=grp(subRows(Mset,null),r=>r.b),bl=Object.entries(bR).map(([b,x])=>({b,x,ns:sum(x,r=>r.ns)})).sort((a,b)=>b.ns-a.ns).slice(0,20).map(o=>subLine(o.b,o.x));T.push(tb('Market submissions: top 20 brands in the selected markets',SUBC,bl));}
  // 2 central FC1 vs FC2
  const J=iRows('jul',{m:allMk,b:B}),P=iRows('sep',{m:allMk,b:B}),Jm=grp(J,r=>r.m),Pm=grp(P,r=>r.m);
  const cr=[...Mset].filter(m=>Jm[m]||Pm[m]).map(m=>cfcLine(cName(m),Jm[m]||[],Pm[m]||[]));cr.push(cfcLine('Central forecast total (same brands)',J,P));
  const miss=[...Mset].filter(m=>!FCS.m.includes(m));
  T.push(tb('Forecasts: FC1 Jul Fcst (central forecast) vs FC2 Sept FC (Sept market submissions)',CFCC,cr,'VM = GMR − warehousing − freight for FC1, gross margin − royalty − shipping & warehousing for FC2, % of net revenue.'+(miss.length?' Not in the central forecast: '+miss.map(cName).join(', ')+'.':'')));
  // 2b FC3 Oct FC Phased vs FC4 Nov FC Phased (brand level), FC4 by fiscal month
  {const fr=k=>CFR[k].filter(r=>allMk.has(r.m)&&S.ch.has(r.ch)&&(!B||B.has(r.b))),Q=fr('ocp'),O=fr('nvp'),Qm=grp(Q,r=>r.m),Om=grp(O,r=>r.m);
    const ln=(lab,a,b)=>{const x=cAgg(a),y=cAgg(b);return [lab,f$(x.ns),f$(y.ns),x.ns?fP(y.ns/x.ns-1):'–',fP(x.ns?x.vmp:null),fP(y.ns?y.vmp:null),fP(x.gs?x.alp:null),fP(y.gs?y.alp:null)];};
    const rw=[...Mset].filter(m=>Qm[m]||Om[m]).map(m=>ln(cName(m),Qm[m]||[],Om[m]||[]));rw.push(ln('Central forecast total (all markets in each FC, same brands)',Q,O));
    T.push(tb('Central forecast: FC3 Oct FC Phased vs FC4 Nov FC Phased',['Scope','FC3 Oct Phased net rev','FC4 Nov Phased net rev','Change','FC3 VM %','FC4 VM %','FC3 Allow %','FC4 Allow %'],rw,'FC3 and FC4 cover the same markets and are fitted to the same monthly phasing target, so market × channel net revenue is the same and the change is in brand mix, allowances and margins. Both are brand level (no SKU or SRP detail). FC4 allowances = Sept FC submitted gross-to-net factors; FC3 allowances for some markets were set so the full year matches phasing.'));
    const mr=MONS.nvp.R.filter(r=>Mset.has(r.m)&&S.ch.has(r.ch)&&(!B||B.has(r.b))),ser=mSeries(mr);
    const ml=a=>MO.map((_,i)=>sum(a.filter(x=>Mset.has(x[0])&&S.ch.has(x[1])&&x[2]===i+1),x=>x[3])),tg=B?null:ml(MONS.nvp.tgt),pr=B?null:ml(MONS.nvp.pre);
    T.push(tb('FC4 Nov FC Phased by fiscal month (selected markets'+(B?', selected brands':'')+')',['Month','Net rev','VM','VM %','Units',...(tg?['Phasing target','Before phasing']:[])],
      ser.map((o,i)=>[MO[i],f$(o.ns),f$(o.vm),fP(o.ns?o.vmp:null),fN(o.u),...(tg?[f$(tg[i]),f$(pr[i])]:[])]),'Months match the monthly phasing target (net revenue by market × channel). Before phasing = Nov FC with no phasing factor. Each brand keeps its yearly share of its market.'));
    if(Mset.size<=4)[...Mset].forEach(m=>{const x=mr.filter(r=>r.m===m);if(!x.length)return;const s2=mSeries(x);T.push(tb(`FC4 Nov FC Phased by month: ${cName(m)}`,['Month','Net rev','VM','VM %'],s2.map((o,i)=>[MO[i],f$(o.ns),f$(o.vm),fP(o.ns?o.vmp:null)])));});}

  // 3 price detail for the brands in scope
  const srcs=d.src.size?[...d.src]:['sub','sep'];
  srcs.forEach(k=>{const rs=iRows(k,{m:Mset,b:B}),byK=grp(rs,r=>(B&&B.size<=6?r.b+' · ':'')+cName(r.m));const pr=Object.entries(byK).map(([key,x])=>({key,a:pAgg(x)})).filter(o=>o.a.uP>0).sort((a,b)=>a.key<b.key?-1:1)
      .map(o=>[o.key,fU(o.a.avg),fE(o.a.avgE),fU(o.a.npu),fP(o.a.real),fP(o.a.alp),fN(o.a.uP),fP(o.a.cov)]);
    const E=pAgg(iRows(k,{m:allMk,b:B}));pr.push(['All markets (same brands)',fU(E.avg),fE(E.avgE),fU(E.npu),fP(E.real),fP(E.alp),fN(E.uP),fP(E.cov)]);
    T.push(tb(`Average SRP: ${INS_SRC[k].lab}`,['Scope','Avg SRP $','Avg SRP €','Net sales/unit $','Net ÷ SRP','Allow % of gross','Priced units','SRP coverage'],pr.slice(0,60)));});
  if(B&&B.size<=3&&Mset.size<=5){const rs=iRows('sub',{m:Mset,b:B}),bx=[];
    [...B].forEach(b=>[...Mset].forEach(m=>{const x=rs.filter(r=>r.b===b&&r.m===m);const mx=bandMix(x);if(!mx.t)return;bx.push([b+' · '+cName(m),...mx.sh.map(s=>fP(s)),fN(mx.t)]);
      const sk=grp(x.filter(r=>r.u>0),r=>r.id);const tops=Object.entries(sk).map(([id,v])=>({id,n:v[0].n,u:sum(v,r=>r.u),ns:sum(v,r=>r.ns)})).sort((a,b)=>b.u-a.u).slice(0,8);
      T.push(tb(`Top SKUs by units: ${b} · ${cName(m)} (market submissions)`,['SKU','Name','Units','Unit share','SRP €','Net sales/unit $'],tops.map(o=>[o.id,o.n,fN(o.u),fP(o.u/(mx.t||1)),SRP[o.id]?fE(SRP[o.id]):'no SRP',o.u?fU(o.ns/o.u):'–'])));}));
    T.push(tb('Unit mix by SRP band (market submissions)',['Scope',...BANDS.map(b=>b[2]),'Priced units'],bx));}
  // 4 top SKUs
  const tk=d.src.has('jul')&&!d.src.has('sep')?'jul':'sep',A=(()=>{const keep=S.m;S.m=allMk;const x=topList(tk);S.m=keep;return x;})();
  const inScope=A.all.filter(x=>(!B||B.has(x.b))&&[...Mset].some(m=>(x.mk[m]||0)>0)).slice(0,15),mcols=[...Mset].filter(m=>A.mr[m]);
  T.push(tb(`Top SKUs in scope by net revenue: ${INS_SRC[tk].lab}`,['EMEA rank','SKU','Name','Brand','Net rev (all BUs)','VM %','SRP €',...mcols.map(m=>'Rank '+mS(m))],inScope.map(x=>[x.rk,x.id,x.n,x.b,f$(x.ns),fP(x.ns?x.vm/x.ns:null),SRP[x.id]?fE(SRP[x.id]):'–',...mcols.map(m=>A.mr[m].r[x.id]||'not sold')])));
  {const rs=iRows('sub',{m:Mset,b:B}),g=grp(rs,r=>r.id),l=Object.entries(g).map(([id,v])=>({id,n:v[0].n,b:v[0].b,ns:sum(v,r=>r.ns),u:sum(v,r=>r.u),gm:sum(v,r=>r.gm)})).sort((a,b)=>b.ns-a.ns).slice(0,10);
    T.push(tb('Top SKUs in scope by net sales: market submissions',['SKU','Name','Brand','Net sales','Units','NS/unit $','GM %','SRP €'],l.map(o=>[o.id,o.n,o.b,f$(o.ns),fN(o.u),o.u>0?fU(o.ns/o.u):'–',fP(o.ns?o.gm/o.ns:null),SRP[o.id]?fE(SRP[o.id]):'–'])));}
  // 5 SKU detail
  [...ids].slice(0,4).forEach(id=>{const rw=[];['sub','jul','sep'].forEach(k=>{const x=INSR[k].filter(r=>r.id===id&&S.ch.has(r.ch));const g=grp(x,r=>r.m);Object.entries(g).forEach(([m,v])=>{const ns=sum(v,r=>r.ns),u=sum(v,r=>r.u),gs=sum(v,r=>r.gs),al=sum(v,r=>r.al),vm=sum(v,r=>r.vm);rw.push([INS_SRC[k].short,cName(m),f$(ns),fN(u),u>0?fU(ns/u):'–',fP(gs?al/gs:null),fP(ns?vm/ns:null)]);});});
    const nm=(INSR.sub.find(r=>r.id===id)||INSR.sep.find(r=>r.id===id)||{}).n||'';T.push(tb(`SKU ${id} ${nm} (SRP ${SRP[id]?fE(SRP[id]):'not in SKU list'})`,['Dataset','Market','Net sales','Units','NS/unit $','Allow %','VM %'],rw));});
  // 6 context: market overview
  const mo=grp(subRows(allMk,null),r=>r.m);T.push(tb('Context: all markets, all brands in the rail selection (market submissions)',SUBC,Object.entries(mo).sort((a,b)=>sum(b[1],r=>r.ns)-sum(a[1],r=>r.ns)).map(([m,x])=>subLine(cName(m),x))));
  // 7 header timeframes: Current vs Prior forecast by market, plus cost and overhead lines (vertical analysis)
  {const ck=S.slot.cur,pk=S.slot.pri,keepM=S.m;S.m=Mset;const bset=B||null,fl=r=>!bset||bset.has(r.b);
    const rc=uRows(ck).filter(fl),rp=DS[pk].pending||pk===ck?[]:uRows(pk).filter(fl),bc=uBy(rc,'m'),bp=uBy(rp,'m');S.m=keepM;
    const ln=(lab,c,p)=>[lab,f$(c.ns),fP(c.alp),fP(c.r('pc')),fP(c.r('roy')),fP(c.gmp),fP(c.opp),p?f$(p.ns):'–',p?fP(p.alp):'–',p?fP(p.r('pc')):'–',p?fP(p.opp):'–'];
    const lbC=ck==='sub'?'Op %':'VM %',lbP=pk==='sub'?'Op %':'VM %';
    T.push(tb(`Header timeframes: Current ${DS[ck].lab} vs Prior ${DS[pk].lab}, by market`,['Market',`${DS[ck].lab} net sales`,'Allow % of gross','Product cost % NS','Royalty % NS',ck==='sub'?'GM %':'GP %',lbC,`${DS[pk].lab} net sales`,'Allow %','Product cost %',lbP],
      [...Object.keys(bc).sort().map(m=>ln(cName(m),bc[m],bp[m])),ln('Selection total',uA(rc),rp.length?uA(rp):null)],'Product cost = cost of goods in each dataset. Central forecast datasets stop at VM.'));
    const keep2=S.m;S.m=Mset;const rs=uRows('sub').filter(fl);S.m=keep2;const bm=uBy(rs,'m'),pc=(x,k)=>fP(x.ns?(x.L[k]||0)/x.ns:null);
    T.push(tb('Market submissions: A&P and overhead lines as % of net sales (vertical analysis)',['Market','Net sales','A&P','Special shipping','Dev & tooling','Shipping & warehousing','Other local OH','Marketing & sales','Amortisation','Administration','Op %'],
      [...Object.keys(bm).sort().map(m=>{const x=bm[m];return [cName(m),f$(x.ns),pc(x,'ap'),pc(x,'ss'),pc(x,'dt'),pc(x,'sw'),pc(x,'ol'),pc(x,'ms'),pc(x,'ia'),pc(x,'ad'),fP(x.opp)];}),(()=>{const x=uA(rs);return ['Selection total',f$(x.ns),pc(x,'ap'),pc(x,'ss'),pc(x,'dt'),pc(x,'sw'),pc(x,'ol'),pc(x,'ms'),pc(x,'ia'),pc(x,'ad'),fP(x.opp)];})()],
      `Closeouts excluded; central charges ${S.view==='alloc'?'allocated to markets by net-sales share':'excluded (Separate view)'}.`));}
  const txt=T.map(t=>`### ${t.title}\n${t.note?t.note+'\n':''}${t.cols.join(' | ')}\n${t.rows.map(r=>r.join(' | ')).join('\n')}`).join('\n\n');
  return {M,B,ids,T,scopeTxt,txt:`SCOPE: ${scopeTxt}\n\n${txt}`};}
const ENG_RULES=`You are the Insights Engine of the ${META.title} cockpit: a senior FP&A analyst writing for finance and non-finance colleagues, working from the cockpit's data pack for ${META.company} (${META.region}, FY${META.year}).
Answer the question using ONLY the DATA PACK sent with it (and the get_data tool, if offered). Never invent figures, SKUs, markets, causes or outside facts (no competitor, consumer or market-research claims). If the data cannot answer part of the question, say so plainly and name the data that would be needed.
Structure every substantive answer as:
**Headline:** one sentence with the key number.
## What the data shows: the comparison with exact figures, naming the dataset (market submissions, FC1 Jul Fcst, FC2 Sept FC, FC3 Oct FC Phased, FC4 Nov FC Phased) and currency. Use a markdown table when comparing three or more numbers.
## Why: the drivers visible in the data (SKU and price-band mix, allowances, cost and margin, channel, volume, forecast changes). Separate facts from interpretation ("this suggests…").
## So what: what it means for the business and 2 to 4 concrete, prioritised actions tied to the numbers (pricing, range mix, listings, trade terms, forecast).
## Watch-outs: only the caveats that matter for this answer.
Write richly but stay relevant: roughly 300 to 550 words, plain English, explain any finance term briefly the first time, no filler and no generic advice that is not tied to a figure.
Charts: add 1 or 2 charts when a comparison is visual, each as a fenced block exactly like:
\`\`\`chart
{"type":"bar","title":"Average SRP, Clayworks","unit":"$","labels":["France","Italy"],"series":[{"name":"Avg SRP","values":[5.99,7.49]}]}
\`\`\`
type: "bar" (vertical, grouped), "hbar" (horizontal, best for more than 6 labels) or "pie" (one series of shares). unit: "$", "€", "%" (values in percent, e.g. 42.5) or "". At most 20 labels and 3 series. Every value must come from the data.
Header timeframes: the user picks a Current forecast and a Prior forecast in the cockpit header; the "Header timeframes" table compares them by market, and "vs prior" in a question means that pair unless another dataset is named. Vertical analysis = a line as % of net sales; horizontal analysis = change vs the prior dataset. A&P and operating overheads exist only in the market submissions.
Definitions: Net sales = net revenue = gross sales − allowances. Allow % = allowances ÷ gross sales (closeouts excluded). GM % = gross margin ÷ net sales. VM (variable margin) = GMR − warehousing − freight in the central forecast; for market submissions the like-for-like VM = gross margin − royalty expense − shipping & warehousing (submission gross margin is before royalties). VM % is on net sales. Op % = operating profit ÷ net sales. Avg SRP = units-weighted average of each SKU's retail price (SRP, in EUR, from the data pack's SKU list; USD at the pack's FX rate: ${FX_TXT}). Every SKU has ONE SRP, so SRP differences between markets come from SKU mix. Net ÷ SRP = net sales per unit ÷ SRP (what ${META.company} keeps of the shelf price; the gap is retailer margin, allowances and any VAT in the SRP). FC1 = Jul Fcst (central forecast) and FC2 = Sept FC (market submissions, mapped like the submissions: gross profit = submission gross margin, royalty = royalty expense, warehousing = shipping & warehousing, freight 0; closeouts and central charges excluded). FC1 vs FC2 mixes a method change (central forecast vs market submissions) with the forecast change; say so. Market submissions are the markets' own submitted plans. Markets that price in a non-euro currency (${[...NON_EUR].map(mS).join(', ')||'none in this pack'}) set shelf prices locally, so their SRP averages are mix indicators only. All money in USD unless stated.
FC3 Oct FC Phased is the October central forecast split by fiscal month (Jan to Dec) and fitted so each market's Domestic and FOB net revenue matches the monthly phasing target, with each brand keeping its yearly share of its market. It is brand level only (no SKU or SRP detail), and allowances for some markets were set so the full year matches phasing. Check which markets each forecast covers before comparing; if FC3 covers markets that FC2 does not (or the reverse), say so.
FC4 Nov FC Phased is the November central forecast, built and phased the same way as FC3 and fitted to the same monthly phasing target, so FC3 and FC4 have the same monthly net revenue by market × channel and differ in brand mix, allowances and margins. FC4 quantities are the consensus forecast quantities scaled to the Sept FC market submissions and its allowances are the Sept FC submitted gross-to-net factors. It covers the same markets as FC3 and is brand level only. FC4 is the latest forecast.
Stay on the cockpit's data. If asked something unrelated, say briefly that you only answer questions about this cockpit's data.`;
const ENG={turns:[],busy:false,ctl:null,sample:undefined,tools:false,prev:null};
// example prompts use market and brand names taken from the loaded data pack
const _sm=MK_ALL.map(mName),_sb=BR_ALL.map(b=>b.charAt(0)+b.slice(1).toLowerCase()),_g=(a,i)=>a[i%a.length]||'';
const ENG_SUGG=[`How does Nov FC Phased net revenue phase by month in ${_g(_sm,0)}?`,`What changed from Oct FC Phased to Nov FC Phased in ${_g(_sm,1)}?`,`Compare ${_g(_sb,0)} prices between ${_g(_sm,0)} and ${_g(_sm,1)}`,'Which markets keep the lowest share of SRP, and why?',`How did variable margin change from FC1 to FC2 in ${_g(_sm,0)}?`,`Top 10 SKUs in ${_g(_sm,1)} and how they rank across the region`,`Where do ${_g(_sb,1)} allowances look out of line?`,`Which brands carry the richest price mix in ${_g(_sm,2)} vs ${_g(_sm,3)}?`];
(async()=>{try{ENG.sample=window.claude&&typeof claude.use==='function'?await claude.use('sample'):null;}catch(e){ENG.sample=null;}
  if(ENG.sample&&typeof ENG.sample.limits==='function'){try{const L=await ENG.sample.limits();ENG.tools=!!(L&&L.tools);}catch(e){}}engStatus();})();
function engStatus(){const n=$('#engNote');if(!n)return;if(ENG.sample===undefined)n.textContent='Connecting to Claude…';
  else if(!ENG.sample)n.innerHTML='Written answers need this page open in the claude.ai viewer. Here, a question shows the data tables the engine would use, without the written analysis.';
  else n.textContent='Each question uses your own Claude usage; the first one asks your permission. Answers use only the cockpit data and follow the filters on the left unless the question names markets or brands.';}
function engTool(){return {name:'get_data',description:'Aggregate the cockpit data. Returns up to 60 rows grouped as requested, with net sales, units, gross sales, allowance %, VM, VM %, average SRP (USD and EUR), net sales per unit, net ÷ SRP; submissions also give GM %. fc3_oct_phased (Oct FC Phased) and fc4_nov_phased (Nov FC Phased) are brand level by fiscal month: group by market, brand, channel or month; it has no SKU or SRP fields but gives GP %. Use it only when the DATA PACK lacks a cut you need.',
  inputSchema:{type:'object',properties:{dataset:{type:'string',enum:['submission','fc1_jul','fc2_sept','fc3_oct_phased','fc4_nov_phased']},group_by:{type:'array',items:{type:'string',enum:['market','brand','channel','sku','month'],description:'month works only with fc3_oct_phased and fc4_nov_phased; sku does not work with them'}},markets:{type:'array',items:{type:'string'},description:'Market names, e.g. '+MK_ALL.slice(0,8).join(', ')},brands:{type:'array',items:{type:'string'}},skus:{type:'array',items:{type:'string'}},channels:{type:'array',items:{type:'string',enum:['10','20']},description:'10 = Domestic, 20 = Direct Import / FOB'},sort:{type:'string',enum:['net_sales','units','vm','avg_srp']},limit:{type:'number'}},required:['dataset','group_by']},
  execute(inp){const k={submission:'sub',fc1_jul:'jul',fc2_sept:'sep',fc3_oct_phased:'ocp',fc4_nov_phased:'nvp'}[String(inp.dataset)];if(!k)throw new Error('unknown dataset');
    const rm=a=>Array.isArray(a)&&a.length?new Set(a.map(x=>{const s=String(x).trim(),u=s.toUpperCase();return MK_ALL.find(m=>m.toUpperCase()===u)||MKT_ALIAS[aliasKey(s)]||u;})):null;
    if(MONS[k]){const Bx=Array.isArray(inp.brands)&&inp.brands.length?new Set(inp.brands.map(b=>{const u=String(b).toUpperCase().trim();return BR_ALL.find(x=>x===u)||BR_ALIAS[normT(u)]||u;})):null,Mx=rm(inp.markets),Cx=Array.isArray(inp.channels)&&inp.channels.length?new Set(inp.channels.map(String)):null;
      const Gx=(Array.isArray(inp.group_by)?inp.group_by:['market']).filter(g=>['market','brand','channel','month'].includes(g));
      const rs=MONS[k].R.filter(r=>(!Mx||Mx.has(r.m))&&(!Bx||Bx.has(r.b))&&(!Cx||Cx.has(r.ch)));
      const key=r=>Gx.map(g=>g==='market'?r.m:g==='brand'?r.b:g==='channel'?CH[r.ch]:MO[r.mo-1]).join(' · ')||'total';
      let out=Object.entries(grp(rs,key)).map(([kk,x])=>{const t=cAgg(x);return {group:kk,net_sales:Math.round(t.ns),units:Math.round(t.u),gross_sales:Math.round(t.gs),allow_pct:+(t.alp*100).toFixed(1),gp_pct:t.ns?+(t.gpp*100).toFixed(1):null,vm:Math.round(t.vm),vm_pct:t.ns?+(t.vmp*100).toFixed(1):null};});
      const sk={net_sales:'net_sales',units:'units',vm:'vm'}[inp.sort]||'net_sales';
      if(Gx.length===1&&Gx[0]==='month')out.sort((a,b)=>MO.indexOf(a.group)-MO.indexOf(b.group));else out.sort((a,b)=>(b[sk]||0)-(a[sk]||0));
      return {dataset:(k==='nvp'?'FC4 Nov FC Phased':'FC3 Oct FC Phased')+' (brand level, by fiscal month)',rows:out.slice(0,Math.min(60,Math.max(1,+inp.limit||25))),total_groups:out.length};}

    const M=rm(inp.markets),Bs=Array.isArray(inp.brands)&&inp.brands.length?new Set(inp.brands.map(b=>{const u=String(b).toUpperCase().trim();return BR_ALL.find(x=>x===u)||BR_ALIAS[normT(u)]||u;})):null;
    const Sk=Array.isArray(inp.skus)&&inp.skus.length?new Set(inp.skus.map(s=>String(s).toUpperCase().trim())):null,C=Array.isArray(inp.channels)&&inp.channels.length?new Set(inp.channels.map(String)):null;
    const G=(Array.isArray(inp.group_by)?inp.group_by:['market']).filter(g=>['market','brand','channel','sku'].includes(g));
    const rs=INSR[k].filter(r=>(!M||M.has(r.m))&&(!Bs||Bs.has(r.b))&&(!Sk||Sk.has(r.id))&&(!C||C.has(r.ch)));
    const key=r=>G.map(g=>g==='market'?r.m:g==='brand'?r.b:g==='channel'?CH[r.ch]:r.id+' '+r.n).join(' · ')||'total';
    let out=Object.entries(grp(rs,key)).map(([kk,x])=>{const p=pAgg(x),ns=sum(x,r=>r.ns),vm=sum(x,r=>r.vm),o={group:kk,net_sales:Math.round(ns),units:Math.round(sum(x,r=>r.u)),gross_sales:Math.round(sum(x,r=>r.gs)),allow_pct:+(p.alp*100).toFixed(1),vm:Math.round(vm),vm_pct:ns?+(vm/ns*100).toFixed(1):null,avg_srp_usd:p.avg!=null?+p.avg.toFixed(2):null,avg_srp_eur:p.avgE!=null?+p.avgE.toFixed(2):null,net_per_unit_usd:p.npu!=null?+p.npu.toFixed(2):null,net_to_srp_pct:p.real!=null?+(p.real*100).toFixed(1):null};if(k==='sub'){const gm=sum(x,r=>r.gm);o.gm_pct=ns?+(gm/ns*100).toFixed(1):null;}return o;});
    const sk={net_sales:'net_sales',units:'units',vm:'vm',avg_srp:'avg_srp_usd'}[inp.sort]||'net_sales';out.sort((a,b)=>(b[sk]||0)-(a[sk]||0));
    return {dataset:INS_SRC[k].lab,rows:out.slice(0,Math.min(60,Math.max(1,+inp.limit||25))),total_groups:out.length};}};}
function engSend(q){q=(q||'').trim();if(!q||ENG.busy)return;$('#engIn').value='';
  const pack=buildPack(q,ENG.prev);ENG.prev=pack;
  const chat=$('#engChat');chat.insertAdjacentHTML('beforeend',`<div class="msg u">${esc(q)}</div>`);
  const box=document.createElement('div');box.className='msg a';box.innerHTML=`<div class="who">Insights Engine</div><div class="md"><span class="thinking"><i></i><i></i><i></i></span> <span style="color:var(--muted)">Reading the cockpit data…</span></div>`;chat.appendChild(box);box.scrollIntoView({behavior:'smooth',block:'start'});
  const md=$('.md',box);const used=()=>{const dt=document.createElement('details');dt.className='used';dt.innerHTML=`<summary>Data used · ${pack.T.length} tables · ${esc(pack.scopeTxt)}</summary><pre>${esc(pack.txt)}</pre>`;box.appendChild(dt);};
  if(!ENG.sample){md.innerHTML=`<p><b>Written analysis is not available in this view.</b> Open the cockpit in claude.ai to get it. Here are the figures the engine would use for this question.</p>`+pack.T.map(t=>`<h3>${esc(t.title)}</h3>${t.note?`<p style="color:var(--muted);font-size:12px">${esc(t.note)}</p>`:''}<div class="tblwrap"><table><thead><tr>${t.cols.map(c=>`<th>${esc(String(c))}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r=>`<tr>${r.map(c=>`<td>${esc(String(c))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('');return;}
  ENG.turns.push({role:'user',content:q});const hist=ENG.turns.slice(-7);
  const input=[{role:'user',content:ENG_RULES},...hist.slice(0,-1),{role:'user',content:`DATA PACK for this question (USD unless stated):\n\n${pack.txt}\n\nQUESTION: ${q}`}];
  ENG.busy=true;ENG.ctl=new AbortController();$('#engSend').disabled=true;$('#engStop').hidden=false;let raf=0,latest='';
  const opts={signal:ENG.ctl.signal,onText:({text})=>{latest=text;if(!raf)raf=requestAnimationFrame(()=>{raf=0;md.innerHTML=mdRender(latest);});}};
  if(ENG.tools)opts.tools=[engTool()];else opts.cache=false;
  ENG.sample(input,opts).then(r=>{md.innerHTML=mdRender(r.text);ENG.turns.push({role:'assistant',content:r.text});if(r.truncated)md.insertAdjacentHTML('beforeend','<p style="color:var(--warn)">The answer was cut short; ask a narrower question for the rest.</p>');used();})
    .catch(e=>{const c=e&&e.code;if(e&&e.text)md.innerHTML=mdRender(e.text);else md.innerHTML='';ENG.turns.pop();
      const msg={cancelled:'Stopped.',not_granted:'Claude access was not allowed for this page, so the engine is off in this view.',sampling_disabled:'Claude is not available for this account.',rate_limited:'Too many requests right now; try again in a moment.',session_expired:'Please sign in to claude.ai again.',refused:'Claude declined this question; try rephrasing it.',prompt_too_large:'The question needs too much data; narrow it to fewer markets or brands.',tools_unavailable:'Tools are unavailable in this view.'}[c]||'Something went wrong; please try again.';
      md.insertAdjacentHTML('beforeend',`<p style="color:${c==='cancelled'?'var(--muted)':'var(--neg)'}">${msg}</p>`);if(c==='tools_unavailable')ENG.tools=false;used();})
    .finally(()=>{ENG.busy=false;$('#engSend').disabled=false;$('#engStop').hidden=true;});}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function inl(s){return esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g,'$1<i>$2</i>').replace(/`([^`]+)`/g,'<code>$1</code>');}
function mdTable(rows){const cells=l=>l.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>c.trim());const body=rows.filter(l=>!/^\s*\|?\s*:?-{2,}/.test(l.replace(/\|/g,'|')));if(!body.length)return '';
  const hd=cells(body[0]),num=c=>/^[−\-+]?[$€£]?[−\-+]?[\d.,]+\s*(%|pts?|pp|[kmb]|m|bn)?$/i.test(c.replace(/[()]/g,''));
  return `<div class="tblwrap"><table><thead><tr>${hd.map(c=>`<th>${inl(c)}</th>`).join('')}</tr></thead><tbody>${body.slice(1).map(r=>`<tr>${cells(r).map((c,i)=>`<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function mdRender(src){const L=String(src).replace(/\r/g,'').split('\n');let h='',i=0;
  while(i<L.length){const l=L[i];let m;
    if(/^\s*```/.test(l)){const lang=l.trim().slice(3).trim().toLowerCase(),buf=[];let closed=false;i++;while(i<L.length){if(/^\s*```/.test(L[i])){closed=true;i++;break;}buf.push(L[i]);i++;}
      h+=lang==='chart'?(closed?chartHTML(buf.join('\n')):'<div class="chartbox"><span class="thinking"><i></i><i></i><i></i></span> <span style="color:var(--muted)">drawing chart…</span></div>'):`<pre><code>${esc(buf.join('\n'))}</code></pre>`;continue;}
    if(/^\s*\|/.test(l)){const rows=[];while(i<L.length&&/^\s*\|/.test(L[i])){rows.push(L[i]);i++;}h+=mdTable(rows);continue;}
    if((m=l.match(/^\s*(#{1,4})\s+(.*)/))){const n=Math.min(3,m[1].length+1);h+=`<h${n}>${inl(m[2])}</h${n}>`;i++;continue;}
    if(/^\s*([-*•]|\d+[.)])\s+/.test(l)){const ord=/^\s*\d/.test(l),it=[];while(i<L.length&&/^\s*([-*•]|\d+[.)])\s+/.test(L[i])&&/^\s*\d/.test(L[i])===ord){it.push(L[i].replace(/^\s*([-*•]|\d+[.)])\s+/,''));i++;}h+=`<${ord?'ol':'ul'}>${it.map(x=>`<li>${inl(x)}</li>`).join('')}</${ord?'ol':'ul'}>`;continue;}
    if(/^\s*>/.test(l)){const b=[];while(i<L.length&&/^\s*>/.test(L[i])){b.push(L[i].replace(/^\s*>\s?/,''));i++;}h+=`<blockquote>${inl(b.join(' '))}</blockquote>`;continue;}
    if(/^\s*(-{3,}|\*{3,})\s*$/.test(l)){h+='<hr>';i++;continue;}
    if(!l.trim()){i++;continue;}
    const p=[];while(i<L.length&&L[i].trim()&&!/^\s*(```|#{1,4}\s|\||([-*•]|\d+[.)])\s+|>)/.test(L[i])){p.push(L[i]);i++;}if(!p.length){p.push(l);i++;}h+=`<p>${inl(p.join(' '))}</p>`;}
  return h;}
const CCOL=['var(--accent)','var(--blue)','var(--pos)'];
function cFmt(v,u){if(v==null||!isFinite(v))return '–';if(u==='%')return v.toFixed(1)+'%';const a=Math.abs(v),s=a>=1e9?(a/1e9).toFixed(2)+'B':a>=1e6?(a/1e6).toFixed(1)+'M':a>=1e4?(a/1e3).toFixed(0)+'K':a>=100?a.toFixed(0):a.toFixed(2);return (v<0?'−':'')+(u==='$'||u==='€'?u:'')+s;}
function chartHTML(src){let c;try{c=JSON.parse(src);}catch(e){return '<div class="chartbox" style="color:var(--muted)">Chart could not be read.</div>';}
  const labels=(Array.isArray(c.labels)?c.labels:[]).slice(0,20).map(x=>String(x)),series=(Array.isArray(c.series)?c.series:[]).slice(0,3).map(s=>({name:String(s.name||''),v:(Array.isArray(s.values)?s.values:[]).slice(0,labels.length).map(Number)}));
  if(!labels.length||!series.length)return '';const u=['$','€','%'].includes(c.unit)?c.unit:'',ttl=`<h5>${esc(c.title||'')}</h5>`;
  const leg=series.length>1||c.type==='pie'?'':'';
  if(c.type==='pie'){const v=series[0].v.map(x=>Math.max(0,x||0)),t=v.reduce((a,b)=>a+b,0)||1;let a0=-Math.PI/2,paths='';const cols=['#b8801a','#2a78d6','#0a8a1f','#cc3b3b','#7a5bd6','#1a9aa0','#c98a12','#5a6473','#e07a5f','#3d5a80'];
    v.forEach((x,i)=>{const a1=a0+x/t*2*Math.PI,lg=a1-a0>Math.PI?1:0,R=70,r=42,p=(ang,rr)=>`${(90+rr*Math.cos(ang)).toFixed(1)},${(90+rr*Math.sin(ang)).toFixed(1)}`;if(x>0)paths+=`<path d="M${p(a0,R)} A${R},${R} 0 ${lg} 1 ${p(a1-1e-4,R)} L${p(a1-1e-4,r)} A${r},${r} 0 ${lg} 0 ${p(a0,r)} Z" fill="${cols[i%cols.length]}"><title>${esc(labels[i])}: ${(x/t*100).toFixed(1)}%</title></path>`;a0=a1;});
    return `<div class="chartbox">${ttl}<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><svg viewBox="0 0 180 180" width="170" height="170">${paths}</svg><div class="legend" style="flex-direction:column;gap:6px;margin:0">${labels.map((l,i)=>`<span><span class="swatch" style="background:${cols[i%cols.length]}"></span>${esc(l)} · <b class="mono">${(v[i]/t*100).toFixed(1)}%</b></span>`).join('')}</div></div></div>`;}
  const all=series.flatMap(s=>s.v).filter(isFinite),mx=Math.max(0,...all),mn=Math.min(0,...all),span=(mx-mn)||1;
  const lg=series.length>1?`<div class="legend">${series.map((s,i)=>`<span><span class="swatch" style="background:${CCOL[i]}"></span>${esc(s.name)}</span>`).join('')}</div>`:'';
  if(c.type==='hbar'){const rowH=series.length*16+10,W=620,LW=150,VW=70,PW=W-LW-VW,H=labels.length*rowH+8,x=v=>LW+(v-mn)/span*PW;let g=`<line class="axis" x1="${x(0)}" x2="${x(0)}" y1="0" y2="${H}"/>`;
    labels.forEach((l,i)=>{const y0=4+i*rowH;g+=`<text class="blab" x="${LW-8}" y="${y0+rowH/2+4}" text-anchor="end">${esc(l.length>22?l.slice(0,21)+'…':l)}</text>`;series.forEach((s,j)=>{const v=s.v[i]||0,y=y0+j*16,x1=x(Math.min(0,v)),w=Math.abs(x(v)-x(0));g+=`<rect x="${x1.toFixed(1)}" y="${y}" width="${Math.max(1,w).toFixed(1)}" height="13" rx="3" fill="${CCOL[j]}"><title>${esc(s.name)} · ${esc(l)}: ${cFmt(v,u)}</title></rect><text class="gtxt" x="${(x(Math.max(0,v))+5).toFixed(1)}" y="${y+10.5}">${cFmt(v,u)}</text>`;});});
    return `<div class="chartbox">${ttl}<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px">${g}</svg>${lg}</div>`;}
  const W=Math.max(520,labels.length*series.length*38+80),H=250,pT=22,pB=46,y=v=>pT+(mx-v)/span*(H-pT-pB),step=(W-20)/labels.length,bw=Math.min(40,(step-12)/series.length);let g=`<line class="axis" x1="10" x2="${W-10}" y1="${y(0)}" y2="${y(0)}"/>`;
  labels.forEach((l,i)=>{const cx=10+i*step+step/2;series.forEach((s,j)=>{const v=s.v[i]||0,xx=cx-series.length*bw/2+j*bw,top=Math.min(y(v),y(0)),hh=Math.max(1,Math.abs(y(v)-y(0)));g+=`<rect x="${(xx+1).toFixed(1)}" y="${top.toFixed(1)}" width="${(bw-2).toFixed(1)}" height="${hh.toFixed(1)}" rx="3" fill="${CCOL[j]}"><title>${esc(s.name)} · ${esc(l)}: ${cFmt(v,u)}</title></rect><text class="gtxt" x="${(xx+bw/2).toFixed(1)}" y="${(v>=0?top-5:top+hh+12).toFixed(1)}" text-anchor="middle">${cFmt(v,u)}</text>`;});
    const w=l.length>16?l.slice(0,15)+'…':l;g+=`<text class="blab" x="${cx}" y="${H-pB+18}" text-anchor="middle">${esc(w)}</text>`;});
  return `<div class="chartbox">${ttl}<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;min-width:${Math.min(W,480)}px">${g}</svg></div>${lg}</div>`;}
