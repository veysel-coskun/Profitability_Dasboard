// ---------- What-If Scenarios ----------
// Base = header Current forecast (DS rows to VM) + below-VM cost pools from the market submissions (data/ohl.js: Jul submissions
// for the Jul-cycle bases, Sept submissions for Sept / Oct), so the scenario P&L runs to Operating Profit. Pools are matched on
// market × channel × brand; pool rows with no match in the base are re-spread by net sales within the market × channel, then the
// market, then EMEA, so the pool total is kept. Actuals are locked to the chosen month; levers change only the rest of the year
// (ROY). Each row is split YTD / ROY by the monthly net-revenue profile of the base when it is phased, else of Nov FC Phased (m×ch×b → m×ch → channel → EMEA); overhead
// lines follow the same split. Levers run in list order over all rows, each on the result of the previous one; every row keeps
// its own step deltas, so the bridge adds up exactly for any filter. Each lever can be a rate (%, pts) or an absolute $ amount;
// $ is spread over the scope in proportion to the lever's driver.
const WI_TYPES={
  allow:{lab:'Allowance change',rel:'pts of gross',abs:'$ allowances',step:0.5,def:1,drv:x=>x.gs},
  price:{lab:'Price increase',rel:'% on gross price',abs:'$ gross sales',step:0.5,def:2,drv:x=>x.gs},
  sales:{lab:'Incremental sales',rel:'% of net sales',abs:'$ net sales',step:1,def:5,drv:x=>x.ns},
  fob:{lab:'FOB share',rel:'pts of net sales to FOB',abs:'$ net sales to FOB',step:1,def:5,drv:x=>x.ns},
  infl:{lab:'Product cost inflation',rel:'% on product cost',abs:'$ product cost',step:0.5,def:3,drv:x=>-x.cogs},
  mg:{lab:'Minimum Guarantee change',rel:'% of royalties',abs:'$ MG charge',step:1,def:500000,u:'abs',drv:x=>-x.roy},
  oh:{lab:'A&P / overhead change',rel:'% of the line',abs:'$ cost',step:1,def:5,drv:(x,l)=>wiOhBase(x,l)},
  close:{lab:'Additional closeouts',rel:'% of gross sales',abs:'$ closeout gross sales',step:0.5,def:2,drv:x=>x.gs}};
const WI_LVL={emea:'EMEA',m:'Markets',b:'Brands',mb:'Markets × brands'};
const OH_K=['dt','ap','ss','ol','ms','ia','ad','ca'],OH_LAB={dt:'Development & tooling',ap:'A&P',ss:'Special shipping',ol:'Other local overhead',ms:'Marketing & sales',ia:'Amortisation',ad:'Administration',ca:'Central adjustments'};
const OH_PICK={all:'All A&P and overheads',ap:'A&P',ms:'Marketing & sales',ad:'Administration',ol:'Other local overhead',ss:'Special shipping',dt:'Development & tooling',ia:'Amortisation'};
const wiOhKeys=l=>l.line&&l.line!=='all'?[l.line]:['dt','ap','ss','ol','ms','ia','ad'];
const wiOhBase=(x,l)=>wiOhKeys(l).reduce((s,k)=>s+(x[k]||0),0);
const OH_POOL={sub:'jul',jul:'jul',sep:'sep',oct:'sep',ocp:'sep',nov:'sep',nvp:'sep',py:'sep'};
const VAR_K=['u','gs','al','ns','cogs','roy','wh','fr'];
// closeout economics observed in the market submissions in the data pack (closeout rows, central costs excluded)
const WI_CO=(()=>{const c=DATA.groups.filter(g=>g.b===CLOSE&&g.m!==CENTRAL),gs=sum(c,g=>g.gs),al=sum(c,g=>g.al),ns=sum(c,g=>g.ns),gm=sum(c,g=>g.gm),roy=sum(c,g=>g.L.roy);
  return {gs,al:gs?al/gs:0.8,cost:gs?(ns-gm)/gs:0.2,roy:gs?roy/gs:0};})();
S.wi={cut:7,levers:[],seq:1};
try{const sv=JSON.parse(localStorage.getItem('cockpit-whatif')||'null');if(sv&&Array.isArray(sv.levers)){S.wi.cut=Math.max(0,Math.min(11,+sv.cut||0));S.wi.levers=sv.levers.filter(l=>WI_TYPES[l.t]).map(l=>({u:'rel',line:'all',...l,m:new Set(l.m||[]),b:new Set(l.b||[])}));S.wi.seq=1+Math.max(0,...S.wi.levers.map(l=>l.id||0));}}catch(e){}
function wiSave(){try{localStorage.setItem('cockpit-whatif',JSON.stringify({cut:S.wi.cut,levers:S.wi.levers.map(l=>({...l,m:[...l.m],b:[...l.b]}))}));}catch(e){}}
// rest-of-year share per row from a phased forecast's months: the base itself when phased, else the latest (Nov FC Phased)
const wiProfK=k=>MONS[k]?k:'nvp',_wiProf={};
function wiProf(k){const pk=wiProfK(k);if(_wiProf[pk])return _wiProf[pk];const P={};const add=(k,mo,ns)=>{const x=P[k]??={t:0,mo:new Array(13).fill(0)};x.t+=ns;x.mo[mo]+=ns;};
  MONS[pk].R.forEach(r=>{add(r.m+'|'+r.ch+'|'+r.b,r.mo,r.ns);add(r.m+'|'+r.ch,r.mo,r.ns);add('*|'+r.ch,r.mo,r.ns);add('*',r.mo,r.ns);});return _wiProf[pk]=P;}
function wiShare(r,cut,P=wiProf(S.slot.cur)){for(const k of [r.m+'|'+r.ch+'|'+r.b,r.m+'|'+r.ch,'*|'+r.ch,'*']){const p=P[k];if(p&&p.t>0){let s=0;for(let i=cut+1;i<=12;i++)s+=p.mo[i];return {s:s/p.t,src:k.split('|').length};}}return {s:(12-cut)/12,src:0};}
// Each lever can start later than the setup month. The rest of the year is cut into periods at every lever start
// (cuts[i] → cuts[i+1]); a lever changes only the periods that start at or after its own month.
const wiLc=(l,cut)=>Math.max(cut,l.from==null||l.from===''?cut:+l.from);
function wiCuts(cut,L){return [...new Set([cut,...L.map(l=>wiLc(l,cut))])].sort((a,b)=>a-b);}
const wiPerLab=(cuts,p)=>{const a=cuts[p]+1,e=p+1<cuts.length?cuts[p+1]:12;return a===e?MO[a-1]:`${MO[a-1]}–${MO[e-1]}`;};
function wiShares(r,cuts,P=wiProf(S.slot.cur)){const end=i=>i+1<cuts.length?cuts[i+1]:12;
  for(const k of [r.m+'|'+r.ch+'|'+r.b,r.m+'|'+r.ch,'*|'+r.ch,'*']){const p=P[k];if(p&&p.t>0)return {sh:cuts.map((c,i)=>{let s=0;for(let m=c+1;m<=end(i);m++)s+=p.mo[m];return s/p.t;}),src:k.split('|').length};}
  return {sh:cuts.map((c,i)=>(end(i)-c)/12),src:0};}
const WL=['u','gs','al','ns','cogs','gp','roy','gmr','wh','fr','vm',...OH_K,'op'];
const wiScale=(r,f)=>{const o={};WL.forEach(k=>o[k]=(r[k]||0)*f);return o;};
const wiFix=o=>{o.gp=o.ns+o.cogs;o.gmr=o.gp+o.roy;o.vm=o.gmr+o.wh+o.fr;o.op=o.vm-OH_K.reduce((s,k)=>s+(o[k]||0),0);return o;};
// base rows with the overhead pool attached (memoised per base dataset)
const _wiBase=new Map();
function wiBase(k){let B=_wiBase.get(k);if(B)return B;const pool=OHL[OH_POOL[k]||'sep']||{},rows=DS[k].rows.map(r=>({...r,...Object.fromEntries(OH_K.map(q=>[q,0]))}));
  const idx={};rows.forEach((r,i)=>(idx[r.m+'|'+r.ch+'|'+r.b]??=[]).push(i));const left=[];
  Object.entries(pool).forEach(([key,v])=>{const ii=idx[key];if(!ii){left.push([key,v]);return;}const t=sum(ii,i=>Math.max(0,rows[i].ns));
    ii.forEach(i=>{const w=t?Math.max(0,rows[i].ns)/t:1/ii.length;OH_K.forEach((q,j)=>rows[i][q]+=(v[j]||0)*w);});});
  let resp=0;left.forEach(([key,v])=>{const [m,ch]=key.split('|');let tg=rows.filter(r=>r.m===m&&r.ch===ch&&r.ns>0);if(!tg.length)tg=rows.filter(r=>r.m===m&&r.ns>0);if(!tg.length)tg=rows.filter(r=>r.ns>0);
    const tn=sum(tg,r=>r.ns);tg.forEach(r=>OH_K.forEach((q,j)=>r[q]+=(v[j]||0)*r.ns/tn));resp+=v.reduce((a,b)=>a+b,0);});
  rows.forEach(wiFix);B={rows,pool:OH_POOL[k]||'sep',respread:resp,poolTot:sum(Object.values(pool),v=>v.reduce((a,b)=>a+b,0))};_wiBase.set(k,B);return B;}
function wiIn(l,r){return l.lvl==='emea'||((l.lvl==='b'||l.m.has(r.m))&&(l.lvl==='m'||l.b.has(r.b)));}
// one lever on one row's rest-of-year values; f = rate as a fraction (pts or % ÷ 100, or $ ÷ scope driver)
function wiApply(l,x,f){
  if(l.t==='allow'){const d=f*x.gs,ry=x.ns?x.roy/x.ns:0;x.al+=d;x.ns-=d;x.roy-=ry*d;}
  else if(l.t==='price'){const ry=x.ns?x.roy/x.ns:0,n0=x.ns;x.gs*=1+f;x.al*=1+f;x.ns*=1+f;x.roy+=ry*(x.ns-n0);}
  else if(l.t==='sales'){VAR_K.forEach(k=>x[k]*=1+f);}
  else if(l.t==='infl'){x.cogs*=1+f;}
  else if(l.t==='mg'){x.roy*=1+f;}
  else if(l.t==='oh'){wiOhKeys(l).forEach(k=>x[k]*=1+f);}
  else if(l.t==='close'){const cg=f*x.gs,a=(+l.ca||0)/100,c=(+l.cc||0)/100,cns=cg*(1-a);
    if(l.mode==='rep'&&x.ns>0){const g=Math.max(0,1-cns/x.ns);VAR_K.forEach(k=>x[k]*=g);}
    x.gs+=cg;x.al+=cg*a;x.ns+=cns;x.cogs-=cg*c;x.roy-=cg*WI_CO.roy;x.cgs=(x.cgs||0)+cg;x.cns=(x.cns||0)+cns;}
  return wiFix(x);}
function wiRun(){const k=S.slot.cur,D=DS[k],cut=S.wi.cut,L=S.wi.levers,BB=wiBase(k),cuts=wiCuts(cut,L),PF=wiProf(k);let ps=0,pn=0;
  const R=BB.rows.map(r=>{const sp=wiShares(r,cuts,PF);ps+=sp.src===3?r.ns:0;pn+=r.ns;const s=sp.sh.reduce((a,b)=>a+b,0),sl0=sp.sh.map(q=>wiScale(r,q));
    return {m:r.m,ch:r.ch,b:r.b,base:r,ytd:wiScale(r,1-s),roy:wiScale(r,s),sh:sp.sh,sl0,sl:sl0.map(x=>({...x})),st:[],sv:[]};});
  const notes=[],tot=(r,q)=>sum(r.sl,x=>x[q]||0);
  // every lever works on (row, period) slices: the rows in its scope × the periods from its own month
  L.forEach((l,i)=>{const T=WI_TYPES[l.t],v=+l.v||0,abs=l.u==='abs',lc=wiLc(l,cut),P=cuts.map((c,p)=>c>=lc?p:-1).filter(p=>p>=0),In=[];
    R.forEach(r=>{r._o=tot(r,'op');r._v=tot(r,'vm');if(wiIn(l,r.base))P.forEach(p=>In.push({r,p}));});const X=it=>it.r.sl[it.p];
    if(l.t==='fob'){const G={};In.forEach(it=>{(G[it.r.m+'|'+it.r.b]??={d:[],f:[]})[it.r.ch==='20'?'f':'d'].push(it);});const tt=sum(In,it=>X(it).ns);let skip=0,moved=0;
      Object.values(G).forEach(g=>{const dn=sum(g.d,it=>X(it).ns),fn=sum(g.f,it=>X(it).ns),gt=dn+fn;if(gt<=0)return;let mv=abs?v*gt/(tt||1):v/100*gt;mv=Math.max(-fn,Math.min(dn,mv));
        if((!fn&&mv>0)||(!dn&&mv<0)){skip+=Math.abs(mv);return;}moved+=mv;
        [[g.d,dn?1-mv/dn:1],[g.f,fn?1+mv/fn:1]].forEach(([its,q])=>its.forEach(it=>{const x=X(it);VAR_K.forEach(z=>x[z]*=q);wiFix(x);}));});
      notes[i]={moved,skip};}
    else{let dr=sum(In,it=>T.drv(X(it),l)),fb=false;if(abs&&!dr&&(l.t==='mg'||l.t==='oh')){fb=true;dr=sum(In,it=>X(it).ns);}   // $ with no base line: spread by net sales
      const f=abs?(dr?v/dr:0):v/100;
      In.forEach(it=>{const x=X(it);if(fb){const add=dr?v*x.ns/dr:0;if(l.t==='mg')x.roy-=add;else x[wiOhKeys(l)[0]]+=add;wiFix(x);}else it.r.sl[it.p]=wiApply(l,{...x},f);});
      notes[i]={driver:dr,fallback:fb,f};}
    R.forEach(r=>{r.st[i]=tot(r,'op')-r._o;r.sv[i]=tot(r,'vm')-r._v;});});
  R.forEach(r=>{const x={};WL.concat(['cgs','cns']).forEach(q=>x[q]=tot(r,q));r.x=x;const sc={};WL.forEach(q=>sc[q]=r.ytd[q]+x[q]);sc.cgs=x.cgs;sc.cns=x.cns;r.scen=sc;r.roy2=x;});
  return {k,D,cut,cuts,rows:R,notes,profCov:pn?ps/pn:0,BB};}
function wiAgg(rs,f){const T={};WL.concat(['cgs','cns']).forEach(q=>T[q]=0);rs.forEach(r=>{const o=f(r);for(const q in T)T[q]+=o[q]||0;});
  T.alp=T.gs?T.al/T.gs:0;T.vmp=T.ns?T.vm/T.ns:0;T.gpp=T.ns?T.gp/T.ns:0;T.opp=T.ns?T.op/T.ns:0;T.oh=OH_K.reduce((s,k)=>s+T[k],0);return T;}
const wiUnit=l=>l.u==='abs'?WI_TYPES[l.t].abs:WI_TYPES[l.t].rel;
const wiV=l=>{const v=+l.v||0;if(l.u==='abs')return signed(v,money0);const u=WI_TYPES[l.t].rel,n=(v>=0?'+':'')+v;return u.startsWith('%')?n+u:`${n} ${Math.abs(v)===1?u.replace('pts','pt'):u}`;};
function wiScopeTxt(l){return l.lvl==='emea'?'EMEA':[l.lvl!=='b'?[...l.m].map(mName).join(', '):'',l.lvl!=='m'?[...l.b].join(', '):''].filter(Boolean).join(' · ');}
const wiFromTxt=l=>{const c=S.wi.cut,lc=wiLc(l,c);return lc>c?` · from ${MO[lc]}`:'';};
function wiLeverText(l){const T=WI_TYPES[l.t];return `${T.lab}${l.t==='oh'?` (${OH_PICK[l.line||'all']})`:''} ${wiV(l)} · ${wiScopeTxt(l)}${wiFromTxt(l)}${l.t==='close'?` · ${l.mode==='rep'?'replacing':'incremental'}, allowance ${l.ca}%, cost ${l.cc}% of gross`:''}`;}
function wiAdd(t){const id=S.wi.seq++,rows=DS[S.slot.cur].rows,top=Object.entries(cBy(rows,'m')).sort((a,b)=>b[1].ns-a[1].ns)[0],topB=Object.entries(cBy(rows,'b')).sort((a,b)=>b[1].ns-a[1].ns)[0],T=WI_TYPES[t];
  S.wi.levers.push({id,t,from:null,lvl:'emea',u:T.u||'rel',v:T.def,line:t==='oh'?'ap':'all',m:new Set(top?[top[0]]:[]),b:new Set(topB?[topB[0]]:[]),mode:'inc',ca:+(WI_CO.al*100).toFixed(1),cc:+(WI_CO.cost*100).toFixed(1)});wiSave();wiLevers();renderWI();}
function wiLevers(){const box=$('#wiLevers'),k=S.slot.cur,mk=[...DS[k].mk].sort(),br=[...new Set(DS[k].rows.map(r=>r.b))].sort();
  if(!S.wi.levers.length){box.innerHTML='<div class="empty-s">No levers yet. Add one below: each lever changes the rest of the year for the scope you choose.</div>';return;}
  box.innerHTML=S.wi.levers.map((l,i)=>`<div class="wi-lv" data-id="${l.id}"><span class="wi-n">${i+1}</span>
    <select class="sel wi-t" aria-label="Lever">${Object.entries(WI_TYPES).map(([t,x])=>`<option value="${t}"${t===l.t?' selected':''}>${x.lab}</option>`).join('')}</select>
    ${l.t==='oh'?`<select class="sel wi-line" aria-label="Line">${Object.entries(OH_PICK).map(([t,x])=>`<option value="${t}"${t===(l.line||'all')?' selected':''}>${x}</option>`).join('')}</select>`:''}
    <select class="sel wi-c" aria-label="Built on actuals to" title="Built on actuals to: the lever changes only the months after">${(()=>{const c=S.wi.cut,lc=wiLc(l,c);
      return [`<option value=""${lc===c?' selected':''}>Built on ${c?MO[c-1]:'no actuals'} (setup)</option>`,...Array.from({length:11-c},(_,j)=>c+1+j).map(m=>`<option value="${m}"${lc===m?' selected':''}>Built on ${MO[m-1]} · from ${MO[m]}</option>`)].join('');})()}</select>
    <select class="sel wi-l" aria-label="Level">${Object.entries(WI_LVL).map(([t,x])=>`<option value="${t}"${t===l.lvl?' selected':''}>${x}</option>`).join('')}</select>
    <div class="dd wi-m"${l.lvl==='m'||l.lvl==='mb'?'':' hidden'}></div><div class="dd wi-b"${l.lvl==='b'||l.lvl==='mb'?'':' hidden'}></div>
    <div class="metricseg wi-u" title="Rate or absolute amount"><button data-v="rel"${l.u!=='abs'?' class="on"':''}>${l.t==='allow'||l.t==='fob'?'pts':'%'}</button><button data-v="abs"${l.u==='abs'?' class="on"':''}>$</button></div>
    <label class="wi-v${l.u==='abs'?' wide':''}"><input type="number" step="${l.u==='abs'?1000:WI_TYPES[l.t].step}" value="${l.v}" aria-label="Value"><span>${wiUnit(l)}</span></label>
    ${l.t==='close'?`<div class="metricseg wi-mode"><button data-v="inc"${l.mode!=='rep'?' class="on"':''}>Incremental</button><button data-v="rep"${l.mode==='rep'?' class="on"':''}>Replacing</button></div>
      <label class="wi-v sm"><input type="number" step="1" class="wi-ca" value="${l.ca}"><span>% allow.</span></label><label class="wi-v sm"><input type="number" step="1" class="wi-cc" value="${l.cc}"><span>% cost</span></label>`:''}
    <button class="iconbtn wi-x" title="Remove lever" aria-label="Remove lever">×</button></div>`).join('');
  let tmr=0;const later=()=>{clearTimeout(tmr);tmr=setTimeout(()=>{wiSave();renderWI();},160);};
  $$('.wi-lv',box).forEach(el=>{const l=S.wi.levers.find(x=>x.id===+el.dataset.id);
    $('.wi-t',el).addEventListener('change',e=>{l.t=e.target.value;l.u=WI_TYPES[l.t].u||'rel';l.v=WI_TYPES[l.t].def;if(l.t==='oh'&&(!l.line||l.line==='all'))l.line='ap';wiSave();wiLevers();renderWI();});
    const ln=$('.wi-line',el);if(ln)ln.addEventListener('change',e=>{l.line=e.target.value;wiSave();renderWI();});
    $('.wi-l',el).addEventListener('change',e=>{l.lvl=e.target.value;wiSave();wiLevers();renderWI();});
    $('.wi-c',el).addEventListener('change',e=>{l.from=e.target.value===''?null:+e.target.value;wiSave();renderWI();});
    $$('.wi-u button',el).forEach(b=>b.addEventListener('click',()=>{if(l.u===b.dataset.v)return;l.u=b.dataset.v;l.v=l.u==='abs'?1000000:(WI_TYPES[l.t].u==='abs'?5:WI_TYPES[l.t].def);wiSave();wiLevers();renderWI();}));
    $('.wi-v input',el).addEventListener('input',e=>{l.v=e.target.value;later();});
    const ca=$('.wi-ca',el),cc=$('.wi-cc',el);if(ca)ca.addEventListener('input',e=>{l.ca=e.target.value;later();});if(cc)cc.addEventListener('input',e=>{l.cc=e.target.value;later();});
    $$('.wi-mode button',el).forEach(b=>b.addEventListener('click',()=>{l.mode=b.dataset.v;wiSave();wiLevers();renderWI();}));
    $('.wi-x',el).addEventListener('click',()=>{S.wi.levers=S.wi.levers.filter(x=>x!==l);wiSave();wiLevers();renderWI();});
    // the dropdown only redraws on sync(), so sync it after each pick (the rail dropdowns are synced by render())
    const pick=(sel,noun,items,key,lab)=>{const d=$(sel,el);if(d.hidden)return;const h=makeDD(d,{noun,items,get:()=>l[key],set:s=>{l[key]=new Set(s);wiSave();h.sync();},label:lab});};
    pick('.wi-m','markets',mk,'m',mName);pick('.wi-b','brands',br,'b',x=>x);});}
function wiTable(B,C,sub){const OHr=OH_K.map(q=>[OH_LAB[q],T=>-T[q],0,0,1]);
  const L=[['Gross sales',T=>T.gs],['Allowances',T=>-T.al,1],['Net revenue',T=>T.ns,0,1],['Product cost',T=>T.cogs],['Gross profit',T=>T.gp,0,1],['Royalties (incl. MG)',T=>T.roy],['GMR',T=>T.gmr,0,1],['Logistics',T=>T.wh+T.fr],[sub?'VM (GM − royalties − S&W)':'Variable margin',T=>T.vm,0,1],...OHr,['Operating profit',T=>T.op,0,1]];
  return `<thead><tr><th>P&amp;L line</th><th>Base</th><th>% NR</th><th>Scenario</th><th>% NR</th><th>Δ $</th><th>Δ pts</th></tr></thead><tbody>${L.map(([lab,f,isA,st,isOh])=>{const b=f(B),c=f(C);if(isOh&&Math.abs(b)<1&&Math.abs(c)<1)return '';
    const vb=isA?(B.gs?-b/B.gs:0):(B.ns?b/B.ns:0),vc=isA?(C.gs?-c/C.gs:0):(C.ns?c/C.ns:0),d=c-b,dp=vc-vb;
    return `<tr class="${st?'subt':''}"><td class="${isOh?'ind':''}">${lab}${isA?' <span class="eyebrow" style="letter-spacing:.04em">% of gross</span>':''}</td><td class="mono">${money(b)}</td><td class="mono vp">${pct(vb)}</td><td class="mono">${money(c)}</td><td class="mono vp">${pct(vc)}</td><td class="mono ${cls3(d,1,1)}">${signed(d,money)}</td><td class="mono ${cls3(dp,isA?-1:1,0.0005)}">${dpts(dp)}</td></tr>`;}).join('')}</tbody>`;}
const WI_MO=['None · whole year open','Jan · month 1','Feb · month 2','Mar · month 3','Apr · month 4','May · month 5','Jun · month 6','Jul · month 7','Aug · month 8','Sep · month 9','Oct · month 10','Nov · month 11'];
function renderWI(){if(!$('#tab-wi'))return;if(S.wi.lastK!==S.slot.cur){S.wi.lastK=S.slot.cur;wiLevers();}const R=wiRun(),D=R.D,sub=R.k==='sub',L=S.wi.levers,aB=allBrands(),vis=r=>S.m.has(r.m)&&S.ch.has(r.ch)&&(aB||S.b.has(r.b)),rs=R.rows.filter(vis);
  $('#wiBase').value=R.k;$('#wiCut').value=String(R.cut);
  const B=wiAgg(rs,r=>r.base),C=wiAgg(rs,r=>r.scen),BR=wiAgg(rs,r=>r.roy),CR=wiAgg(rs,r=>r.roy2),cut=R.cut,mo=cut?MO[cut-1]:'',rest=cut?`${MO[cut]}–Dec`:'Jan–Dec',restL=cut?rest:'the whole year';
  const per=L.map((l,i)=>sum(rs,r=>r.st[i]||0)),perV=L.map((l,i)=>sum(rs,r=>r.sv[i]||0));
  $('#wiPeriod').textContent=cut?`Actuals locked Jan–${mo} · levers change ${rest} (${pct(B.ns?BR.ns/B.ns:0,0)} of base net revenue)`:'No months locked · levers change the whole year';
  $('#wiScopeNote').textContent=`${D.full} · results shown for ${scope()}${!MONS[R.k]&&cut?` · rest-of-year split from the ${MONS[wiProfK(R.k)].lab} monthly profile (${pct(R.profCov,0)} of net revenue matched at market × channel × brand)`:''} · A&P and overheads from the ${R.BB.pool==='jul'?'Jul':'Sept'} market submissions in the data pack (${money(R.BB.poolTot)} incl. central costs)`;
  const dN=C.ns-B.ns,dO=C.op-B.op;
  $('#wiTitle').textContent=!L.length?`Base: ${D.lab}${cut?`, built on actuals to ${mo}`:''}, operating profit ${money(B.op)} (${pct(B.opp)} of net revenue). Add levers to build a scenario.`:`Scenario on ${D.lab}: net revenue ${dN>=0?'up':'down'} ${money(Math.abs(dN))} (${B.ns?pchg(C.ns/B.ns-1):''}), operating profit ${dO>=0?'up':'down'} ${money(Math.abs(dO))} to ${money(C.op)} (${pct(C.opp)} of net revenue)`;
  $('#kpiWi').innerHTML=vTile('Net revenue · FY',C.ns,B.ns,money)+vTile('Variable margin · FY',C.vm,B.vm,money)+vTile('Operating profit · FY',C.op,B.op,money)+vTile('Op % of NR',C.opp,B.opp,fP1,'pts')
    +vTile('Allowance % of gross',C.alp,B.alp,fP1,'pts',-1)+vTile('A&P + overheads · FY',C.oh,B.oh,money,null,-1)+vTile(`Op profit · ${rest}`,CR.op,BR.op,money);
  $('#wiPL').innerHTML=wiTable(B,C,sub);
  const short=l=>({allow:'Allowance',price:'Price',sales:'Sales',fob:'FOB share',infl:'Cost infl.',mg:'MG',oh:l.line&&l.line!=='all'?OH_PICK[l.line].split(' ')[0]:'Overheads',close:'Closeouts'}[l.t]);
  const br=[{k:'Base OP',v:B.op,tot:1},...L.map((l,i)=>({k:`${i+1}. ${short(l)}`,v:per[i]})),{k:'Scenario OP',v:C.op,tot:1}];
  if(L.length)wfChart($('#wiWf'),br,'Scenario','Base');else $('#wiWf').innerHTML='<div class="empty-s">The bridge appears once a lever is added.</div>';
  const msg=[];
  if(L.length){L.forEach((l,i)=>{const n=R.notes[i]||{};let extra='';
      if(l.t==='close')extra=`; closeout gross sales ${money(C.cgs)}, net ${money(C.cns)}`;
      if(l.t==='fob')extra=`; ${money(Math.abs(n.moved||0))} of net sales moved ${(n.moved||0)>=0?'to FOB':'to Domestic'}${n.skip?`, ${money(n.skip)} not moved (no FOB or Domestic business in that market × brand)`:''}`;
      if(l.u==='abs'&&n.f!=null&&l.t!=='fob')extra+=n.fallback?'; spread by net sales (the scope has no base for this line)':`; equals ${(n.f*100).toFixed(2)}${l.t==='allow'?' pts of gross':'% of the driver'} across the scope`;
      msg.push(`<b>${WI_TYPES[l.t].lab}${l.t==='oh'?` · ${OH_PICK[l.line||'all']}`:''} ${wiV(l)}</b> (${wiScopeTxt(l)}${wiFromTxt(l)}): ${signed(per[i],money)} of operating profit${Math.abs(perV[i]-per[i])>1?` (${signed(perV[i],money)} at VM)`:''}${extra}.`);});
    msg.push(`<b>Net effect</b> on ${restL}: net revenue ${signed(CR.ns-BR.ns,money)}, operating profit ${signed(CR.op-BR.op,money)} (${pct(BR.opp)} → ${pct(CR.opp)} of net revenue); full year ${money(B.op)} → ${money(C.op)}.`);
    const ry=1+(BR.ns?BR.roy/BR.ns:0),one=BR.gs/100;msg.push(`<b>Sensitivity</b> on ${restL}: 1 pt of allowance = ${money(one)} of net revenue (about ${money(one*ry)} of profit after royalties); 1% price = ${money(BR.ns/100*ry)}; 1% product cost = ${money(-BR.cogs/100)}; 1% incremental sales = ${money(BR.vm/100)}; 1% of A&amp;P and overheads = ${money(BR.oh/100)}.`);
    if(L.some(l=>l.t==='close'))msg.push(`<b>Closeout economics</b> default to the market submissions in the data pack: ${pct(WI_CO.al)} allowance, ${pct(WI_CO.cost)} cost and ${pct(WI_CO.roy)} royalty of closeout gross sales. Replacing = closeout net sales take the place of the same regular net sales in the scope.`);
    if(L.some(l=>l.t==='fob'))msg.push('<b>FOB share</b> moves net sales between the Domestic and Direct Import rows of each market and brand at each channel’s own economics (FOB: lower price and allowances, no local logistics). A&amp;P and overheads stay fixed.');}
  $('#wiMsg').innerHTML=msg.map(x=>`<li>${x}</li>`).join('')||'<li>Add a lever to see its effect.</li>';
  const tbl=(key,name,lab)=>{const g={};rs.forEach(r=>{(g[r[key]]??=[]).push(r);});const rws=Object.entries(g).map(([k2,v])=>({k:k2,b:wiAgg(v,r=>r.base),c:wiAgg(v,r=>r.scen)})).filter(o=>Math.abs(o.c.op-o.b.op)>=1||Math.abs(o.c.ns-o.b.ns)>=1).sort((a,b)=>Math.abs(b.c.op-b.b.op)-Math.abs(a.c.op-a.b.op));
    return `<thead><tr><th>${name}</th><th>Base NR</th><th>Scenario NR</th><th>Δ NR</th><th>Base Op %</th><th>Scen. Op %</th><th>Δ Op %</th><th>Δ VM $</th><th>Δ Op $</th></tr></thead><tbody>${rws.map(o=>`<tr><td>${lab(o.k)}</td><td class="mono">${money(o.b.ns)}</td><td class="mono">${money(o.c.ns)}</td><td class="mono ${cls3(o.c.ns-o.b.ns,1,1)}">${signed(o.c.ns-o.b.ns,money)}</td><td class="mono">${pct(o.b.opp)}</td><td class="mono">${pct(o.c.opp)}</td><td class="mono ${cls3(o.c.opp-o.b.opp,1,0.0005)}">${dpts(o.c.opp-o.b.opp)}</td><td class="mono ${cls3(o.c.vm-o.b.vm,1,1)}">${signed(o.c.vm-o.b.vm,money)}</td><td class="mono ${cls3(o.c.op-o.b.op,1,1)}"><b>${signed(o.c.op-o.b.op,money)}</b></td></tr>`).join('')||`<tr><td colspan="9" class="empty-s">No ${name.toLowerCase()} affected by the levers.</td></tr>`}</tbody>`;};
  $('#wiMkt').innerHTML=tbl('m','Market',mName);$('#wiBr').innerHTML=tbl('b','Brand',x=>x);
  $('#wiFoot').textContent=`Base ${D.full}; A&P and overheads from the ${R.BB.pool==='jul'?'Jul':'Sept'} market submissions in the data pack by market × channel × brand (${money(R.BB.respread)} re-spread by net sales where the forecast has no matching row; central costs allocated by brand net sales; closeouts excluded). ${cut?`Jan–${mo} kept as forecast; levers change ${rest}.`:'Levers change the whole year.'} A lever with its own “Built on” month changes only the months after it (never earlier than the setup month). Levers apply in the order listed, each on the result of the previous one; a $ lever is spread over its scope in proportion to its driver (gross sales, net sales, product cost, royalties or the overhead line). Allowance and price changes move royalties with net sales; incremental sales carry the scope’s own gross-to-net, cost, royalty and logistics rates with A&P and overheads fixed; inflation applies to product cost only (no price pass-through); MG changes hit royalties.`;
  $('#wiDetail').onclick=()=>{if(!L.length)return;goEngine(`What-if scenario on ${D.lab}${cut?`, built on actuals to ${mo} (levers change ${rest} only)`:''}. Levers: ${L.map((l,i)=>`${i+1}) ${wiLeverText(l)} → ${signed(per[i],money)} operating profit`).join('; ')}. Result: full-year net revenue ${money(B.ns)} → ${money(C.ns)}, variable margin ${money(B.vm)} → ${money(C.vm)}, operating profit ${money(B.op)} → ${money(C.op)} (${pct(B.opp)} → ${pct(C.opp)}). Explain the scenario in business terms, which markets and brands carry the impact, the risks and assumptions behind each lever, and what would have to be true to deliver it. Recommend whether to pursue it and the 3 most important actions.`);};}
function wiInit(){const sel=$('#wiBase');sel.innerHTML=Object.keys(DS).filter(k=>!DS[k].pending).map(k=>`<option value="${k}">${DS[k].lab}</option>`).join('');
  sel.addEventListener('change',()=>{const h=$('.slotsel[data-slot=cur]');h.value=sel.value;h.dispatchEvent(new Event('change'));});
  const cs=$('#wiCut');cs.innerHTML=WI_MO.map((t,i)=>`<option value="${i}">${t}</option>`).join('');cs.addEventListener('change',()=>{S.wi.cut=+cs.value;wiSave();wiLevers();renderWI();});
  $$('#wiAdd button').forEach(b=>b.addEventListener('click',()=>wiAdd(b.dataset.t)));
  $('#wiReset').addEventListener('click',()=>{S.wi.levers=[];wiSave();wiLevers();renderWI();});wiLevers();}
