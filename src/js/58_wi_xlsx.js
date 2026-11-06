// ---------- What-If → Excel: the scenario as a live, formula-driven workbook ----------
// Base (full year, split into actuals / YTD and rest of year) → one sheet per lever, each reading the previous sheet → Scenario
// rows → Summary P&L and OP bridge, By market, By brand. Every figure below the inputs is a formula; blue cells on yellow are
// inputs (lever values and units, closeout rates, rest-of-year shares, scope and in-view flags), so the workbook recalculates in
// Excel. Cached values are written as well, so the file reads correctly before Excel recalculates (e.g. in Protected View).
// The xlsx is written by hand (SpreadsheetML + a small zip writer, deflate via CompressionStream when the browser has it).
const XK=['u','gs','al','ns','cogs','roy','wh','fr',...OH_K],XS=[...XK,'cgs','cns'],XD=['gp','gmr','vm','op'];
const XL={u:'Units',gs:'Gross sales',al:'Allowances (+ = deduction)',ns:'Net revenue',cogs:'Product cost',roy:'Royalties incl. MG',wh:'Warehousing / S&W',fr:'Freight',cgs:'Closeout gross sales',cns:'Closeout net sales',gp:'Gross profit',gmr:'GMR',vm:'Variable margin',op:'Operating profit'};
OH_K.forEach(k=>XL[k]=OH_LAB[k]+' (+ = cost)');
const X_SHORT={allow:'Allowance',price:'Price',sales:'Sales',fob:'FOB share',infl:'Cost inflation',mg:'MG',oh:'Overheads',close:'Closeouts'};
// style ids (see xStyles): h header, m money, p %, im/in/ip/it inputs (money, number, %, text), sm/sp/sb subtotal money/%/label
const XF={h:1,m:2,p:3,im:4,in:5,sm:6,b:7,t:8,ip:9,n:10,r4:11,sp:12,it:13,sb:14};
const XC=n=>{let s='';n++;while(n){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-m-1)/26;}return s;};
const xq=n=>`'${n.replace(/'/g,"''")}'`;
const xesc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const xDer=o=>{o.gp=o.ns+o.cogs;o.gmr=o.gp+o.roy;o.vm=o.gmr+o.wh+o.fr;o.op=o.vm-OH_K.reduce((s,k)=>s+(o[k]||0),0);return o;};
function XSheet(name,o={}){return {name,rows:[],w:o.w||{},freeze:o.freeze||null,tab:!!o.tab};}
function xput(sh,r,c,v,s,f){(sh.rows[r]??=[])[c]={v,s,f};}
// derived P&L columns from the column map of a block (cm[k] = column index); OH_K sit next to each other, dt first
function xDerF(cm,er){const c=k=>XC(cm[k])+er;return {gp:`${c('ns')}+${c('cogs')}`,gmr:`${c('gp')}+${c('roy')}`,vm:`${c('gmr')}+${c('wh')}+${c('fr')}`,op:`${c('vm')}-SUM(${c(OH_K[0])}:${c(OH_K[OH_K.length-1])})`};}
function xSheetXml(sh){const cols=Object.entries(sh.w).map(([c,w])=>`<col min="${+c+1}" max="${+c+1}" width="${w}" customWidth="1"/>`).join('');
  const [fy,fx]=sh.freeze||[0,0],pane=fy||fx?`<pane${fx?` xSplit="${fx}"`:''}${fy?` ySplit="${fy}"`:''} topLeftCell="${XC(fx)}${fy+1}" activePane="${fx&&fy?'bottomRight':fy?'bottomLeft':'topRight'}" state="frozen"/>`:'';
  const rows=sh.rows.map((row,r)=>{if(!row)return '';const cs=row.map((x,c)=>{if(!x)return '';const ref=XC(c)+(r+1),st=x.s?` s="${x.s}"`:'';
      if(x.f!=null){const num=typeof x.v==='number'&&isFinite(x.v);return `<c r="${ref}"${st}${x.v!=null&&!num?' t="str"':''}><f>${xesc(x.f)}</f>${x.v==null?'':`<v>${num?x.v:xesc(x.v)}</v>`}</c>`;}
      if(typeof x.v==='number')return isFinite(x.v)?`<c r="${ref}"${st}><v>${x.v}</v></c>`:'';
      if(x.v==null||x.v==='')return st?`<c r="${ref}"${st}/>`:'';
      return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xesc(x.v)}</t></is></c>`;}).join('');
    return `<row r="${r+1}">${cs}</row>`;}).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"${sh.tab?' tabSelected="1"':''} zoomScale="90">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="13.5"/>${cols?`<cols>${cols}</cols>`:''}<sheetData>${rows}</sheetData></worksheet>`;}
function xStyles(){const font=(o='')=>`<font>${o}<sz val="${/sz/.test(o)?'':10}"/><name val="Arial"/></font>`.replace('<sz val=""/>','');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="#,##0;-#,##0;&quot;-&quot;"/><numFmt numFmtId="165" formatCode="0.0%"/><numFmt numFmtId="166" formatCode="0.000000"/></numFmts>
<fonts count="6">${font()}${font('<b/><color rgb="FFFFFFFF"/>')}${font('<b/>')}${font('<b/><sz val="14"/><color rgb="FF0B1F44"/>')}${font('<color rgb="FF0000FF"/>')}${font('<i/><sz val="9"/><color rgb="FF6B7280"/>')}</fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B1F44"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEF1F6"/></patternFill></fill></fills>
<borders count="2"><border/><border><top style="thin"><color rgb="FF9CA3AF"/></top></border></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="15"><xf/>
<xf fontId="1" fillId="2" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
<xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="165" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="4" fillId="3" applyNumberFormat="1" applyFont="1" applyFill="1"/><xf fontId="4" fillId="3" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="2" fillId="4" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/><xf fontId="2" applyFont="1"/><xf fontId="3" applyFont="1"/>
<xf numFmtId="165" fontId="4" fillId="3" applyNumberFormat="1" applyFont="1" applyFill="1"/><xf fontId="5" applyFont="1"/><xf numFmtId="166" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="2" fillId="4" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/><xf fontId="4" fillId="3" applyFont="1" applyFill="1"/>
<xf fontId="2" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/></cellXfs></styleSheet>`;}
// ---- zip (STORE or DEFLATE) ----
const X_CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const xCrc=b=>{let c=~0;for(let i=0;i<b.length;i++)c=X_CRC[(c^b[i])&255]^(c>>>8);return (~c)>>>0;};
async function xDeflate(b){if(typeof CompressionStream!=='function')return null;try{return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());}catch(e){return null;}}
async function xZip(files){const enc=new TextEncoder(),parts=[],cd=[],d=new Date();let off=0;
  const tm=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),dt=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  for(const [name,txt] of files){const raw=enc.encode(txt),crc=xCrc(raw),z=await xDeflate(raw),body=z||raw,nm=enc.encode(name);
    const h=new DataView(new ArrayBuffer(30));[[0,0x04034b50,4],[4,20,2],[6,0x0800,2],[8,z?8:0,2],[10,tm,2],[12,dt,2],[14,crc,4],[18,body.length,4],[22,raw.length,4],[26,nm.length,2],[28,0,2]].forEach(([o,v,n])=>n===4?h.setUint32(o,v,true):h.setUint16(o,v,true));
    const c=new DataView(new ArrayBuffer(46));[[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x0800,2],[10,z?8:0,2],[12,tm,2],[14,dt,2],[16,crc,4],[20,body.length,4],[24,raw.length,4],[28,nm.length,2],[30,0,2],[32,0,2],[34,0,2],[36,0,2],[38,0,4],[42,off,4]].forEach(([o,v,n])=>n===4?c.setUint32(o,v,true):c.setUint16(o,v,true));
    parts.push(new Uint8Array(h.buffer),nm,body);cd.push(new Uint8Array(c.buffer),nm);off+=30+nm.length+body.length;}
  const cdLen=cd.reduce((s,b)=>s+b.length,0),e=new DataView(new ArrayBuffer(22));
  [[0,0x06054b50,4],[4,0,2],[6,0,2],[8,files.length,2],[10,files.length,2],[12,cdLen,4],[16,off,4],[20,0,2]].forEach(([o,v,n])=>n===4?e.setUint32(o,v,true):e.setUint16(o,v,true));
  return new Blob([...parts,...cd,new Uint8Array(e.buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}
async function xBook(sheets){const ns='http://schemas.openxmlformats.org/';
  const files=[['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${ns}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}package/2006/relationships"><Relationship Id="rId1" Type="${ns}officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${ns}spreadsheetml/2006/main" xmlns:r="${ns}officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map((s,i)=>`<sheet name="${xesc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
    ['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="${ns}officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="${ns}officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml',xStyles()],...sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,xSheetXml(s)])];
  return xZip(files);}

// ---- the scenario model ----
function wiWorkbook(){const R=wiRun(),D=R.D,L=S.wi.levers,cut=R.cut,cuts=R.cuts,PN=cuts.length,aB=allBrands(),rows=R.rows,N=rows.length,NP=N*PN,sub=R.k==='sub';
  const inView=r=>S.m.has(r.m)&&S.ch.has(r.ch)&&(aB||S.b.has(r.b))?1:0,mo=cut?MO[cut-1]:'',rest=cut?`${MO[cut]}–Dec`:'Jan–Dec';
  const rng=(sh,c,n=N)=>`${xq(sh)}!$${XC(c)}$3:$${XC(c)}$${n+2}`,rngP=(sh,c)=>rng(sh,c,NP);
  const hdr=(sh,r,labels,c0=0)=>labels.forEach((t,i)=>xput(sh,r,c0+i,t,XF.h));
  // slices: one line per base row × period, row-major, so lines j*PN … j*PN+PN-1 belong to base row j
  const SL=[];rows.forEach((r,j)=>cuts.forEach((c0,p)=>SL.push({r,j,p})));
  const sumSl=(arr,j)=>{const o={};XS.forEach(k=>o[k]=0);for(let p=0;p<PN;p++)XS.forEach(k=>o[k]+=arr[j*PN+p][k]||0);return xDer(o);};
  // Base: identifiers, inputs, full year (values) and YTD (formulas)
  const BS=XSheet('Base',{freeze:[2,5],w:{0:9,1:20,2:7,3:11,4:22,5:8,6:10}}),FY={},YT={};
  let c=7;[...XK,...XD].forEach(k=>FY[k]=c++);[...XK,...XD].forEach(k=>YT[k]=c++);for(let i=7;i<c;i++)BS.w[i]=13;
  xput(BS,0,0,`Base: ${D.full} · USD · one row per market × channel × brand`,XF.b);xput(BS,0,FY.u,'Full year, base forecast (values)',XF.b);xput(BS,0,YT.u,`Actuals / YTD, Jan–${mo||'(none)'} = full year × (1 − rest-of-year share)`,XF.b);
  hdr(BS,1,['Market code','Market','Channel code','Channel','Brand','In view (1/0)','Rest-of-year share (sum of Periods)']);[[FY,XK],[YT,XK]].forEach(([cm,ks])=>[...ks,...XD].forEach(k=>xput(BS,1,cm[k],XL[k],XF.h)));
  rows.forEach((r,i)=>{const er=i+3,a=i*PN+3,b=a+PN-1,sh=r.sh.reduce((x,y)=>x+y,0);
    [r.m,mName(r.m),r.ch,CH[r.ch]||r.ch,r.b].forEach((v,j)=>xput(BS,i+2,j,v));xput(BS,i+2,5,inView(r),XF.in);xput(BS,i+2,6,sh,XF.p,`SUM(Periods!$G$${a}:$G$${b})`);
    XK.forEach(k=>{xput(BS,i+2,FY[k],r.base[k]||0,XF.m);xput(BS,i+2,YT[k],r.ytd[k]||0,XF.m,`${XC(FY[k])}${er}*(1-$G${er})`);});
    [[FY,xDer({...r.base})],[YT,xDer({...r.ytd})]].forEach(([cm,o])=>{const F=xDerF(cm,er);XD.forEach(k=>xput(BS,i+2,cm[k],o[k],XF.m,F[k]));});});
  const IVb=rng('Base',5);
  // Periods: the rest of the year cut at each lever's start month; the input to lever 1
  const PS=XSheet('Periods',{freeze:[2,3],w:{0:9,1:7,2:22,3:8,4:12,5:10,6:10}}),PC={};c=7;[...XS,...XD].forEach(k=>PC[k]=c++);for(let i=7;i<c;i++)PS.w[i]=13;
  xput(PS,0,0,`Rest of year (${rest}) cut into periods at each lever's start month: ${cuts.map((c0,p)=>wiPerLab(cuts,p)).join(' · ')}. Share = the period's part of full-year net revenue (${MONS[wiProfK(R.k)].lab} profile); values = Base full year × share.`,XF.b);
  hdr(PS,1,['Market code','Channel code','Brand','In view','Period','Starts after month #','Share of full year']);[...XS,...XD].forEach(k=>xput(PS,1,PC[k],XL[k],XF.h));
  const st0=SL.map((s,q)=>{const er=q+3,br=s.j+3,r=s.r,o={...r.sl0[s.p],cgs:0,cns:0};
    [r.m,r.ch,r.b].forEach((v,n)=>xput(PS,q+2,n,v));xput(PS,q+2,3,inView(r),0,`Base!$F$${br}`);xput(PS,q+2,4,wiPerLab(cuts,s.p));xput(PS,q+2,5,cuts[s.p]);xput(PS,q+2,6,r.sh[s.p],XF.ip);
    XK.forEach(k=>xput(PS,q+2,PC[k],o[k]||0,XF.m,`Base!${XC(FY[k])}${br}*$G${er}`));xput(PS,q+2,PC.cgs,0,XF.m);xput(PS,q+2,PC.cns,0,XF.m);
    const od=xDer({...o}),FD=xDerF(PC,er);XD.forEach(k=>xput(PS,q+2,PC[k],od[k],XF.m,FD[k]));return o;});
  const IVp=rngP('Periods',3);
  // Levers: inputs and the rate each lever applies
  const LS=XSheet('Levers',{freeze:[4,0],w:{0:4,1:24,2:20,3:15,4:38,5:7,6:12,7:12,8:12,9:12,10:16,11:12,12:9,13:15,14:15,15:14}}),LR=i=>5+i;
  xput(LS,0,0,`What-If levers on ${D.lab}`,XF.t);
  xput(LS,1,1,'Closeout royalty, % of closeout gross sales',XF.b);xput(LS,1,6,WI_CO.roy,XF.ip);xput(LS,1,7,'Market submissions in the data pack, closeout rows',XF.n);
  xput(LS,2,1,`Blue cells on yellow are inputs. Unit "$" = absolute amount spread by the driver; "%" or "pts" = rate ÷ 100. Levers run top to bottom, each on the result of the one above. Built on (month #): the lever changes only periods that start after it; use a period start on the Periods sheet (${cuts.join(', ')}).`,XF.n);
  hdr(LS,3,['#','Lever','Line','Scope level','Scope','Unit','Value','Closeout mode','Closeout allowance %','Closeout cost %','Driver in scope (prior step)','Rate applied','$ spread by net sales','Δ operating profit (in view)','Δ variable margin (in view)','Built on actuals to (month #)']);
  // lever sheets (one line per slice, aligned with Periods)
  const steps=[];let prev={name:'Periods',cm:PC},pst=st0;
  L.forEach((l,i)=>{const T=WI_TYPES[l.t],nm=`L${i+1} ${X_SHORT[l.t]}`.slice(0,31),lr=LR(i),abs=l.u==='abs',v=+l.v||0,lc=wiLc(l,cut);
    const help={allow:['d'],price:['k'],sales:['k'],infl:['k'],mg:['k','add'],oh:['k','add'],close:['cg','cn','g'],fob:['dn','fn','mv','q']}[l.t];
    const HL={d:'Allowance added',k:'Factor',add:'$ added (spread by NR)',cg:'Closeout gross',cn:'Closeout net',g:'Replacement factor',dn:'Domestic NR in group',fn:'FOB NR in group',mv:'NR moved to FOB',q:'Factor'};
    const SS=XSheet(nm,{freeze:[2,3],w:{0:9,1:7,2:22,3:8,4:10,5:8}}),hc={},cm={};let cc=6;help.forEach(h=>hc[h]=cc++);[...XS,...XD].forEach(k=>cm[k]=cc++);for(let j=6;j<cc;j++)SS.w[j]=13;
    xput(SS,0,0,`Lever ${i+1}: ${wiLeverText(l)} · reads '${prev.name}', rate from Levers row ${lr}`,XF.b);
    hdr(SS,1,['Market code','Channel code','Brand','In scope = scope × period','Starts after month #','Scope (1/0)',...help.map(h=>HL[h])]);[...XS,...XD].forEach(k=>xput(SS,1,cm[k],XL[k],XF.h));
    const P=(k,er)=>`${xq(prev.name)}!${XC(prev.cm[k])}${er}`,Pr=k=>rngP(prev.name,prev.cm[k]),SC=rngP(nm,3);
    const scp=SL.map(s=>wiIn(l,s.r.base)?1:0),sc=SL.map((s,q)=>scp[q]*(cuts[s.p]>=lc?1:0)),sp=(fn)=>sum(SL.map((s,q)=>sc[q]*fn(pst[q])),x=>x);
    // driver over the scope, on the previous step
    const okeys=wiOhKeys(l);let drF,drV;
    if(['allow','price','close'].includes(l.t)){drF=`SUMPRODUCT(${SC},${Pr('gs')})`;drV=sp(x=>x.gs);}
    else if(l.t==='sales'||l.t==='fob'){drF=`SUMPRODUCT(${SC},${Pr('ns')})`;drV=sp(x=>x.ns);}
    else if(l.t==='infl'){drF=`-SUMPRODUCT(${SC},${Pr('cogs')})`;drV=-sp(x=>x.cogs);}
    else if(l.t==='mg'){drF=`-SUMPRODUCT(${SC},${Pr('roy')})`;drV=-sp(x=>x.roy);}
    else{drF=okeys.map(k=>`SUMPRODUCT(${SC},${Pr(k)})`).join('+');drV=sp(x=>okeys.reduce((s,k)=>s+x[k],0));}
    const canFb=l.t==='mg'||l.t==='oh',fbV=canFb&&abs&&!drV?1:0,KV=fbV?sp(x=>x.ns):drV,fV=abs?(KV?v/KV:0):v/100;
    const unit=abs?'$':(T.rel.startsWith('pts')?'pts':'%');
    [i+1,T.lab,l.t==='oh'?OH_PICK[l.line||'all']:'',WI_LVL[l.lvl],wiScopeTxt(l)].forEach((x,j)=>xput(LS,lr-1,j,x));
    xput(LS,lr-1,5,unit,XF.it);xput(LS,lr-1,6,v,XF.in);
    if(l.t==='close'){xput(LS,lr-1,7,l.mode==='rep'?'Replacing':'Incremental',XF.it);xput(LS,lr-1,8,+l.ca||0,XF.in);xput(LS,lr-1,9,+l.cc||0,XF.in);}
    xput(LS,lr-1,10,KV,XF.m,canFb?`IF(AND($F${lr}="$",${drF}=0),SUMPRODUCT(${SC},${Pr('ns')}),${drF})`:drF);
    xput(LS,lr-1,11,fV,XF.r4,`IF($F${lr}="$",IF($K${lr}=0,0,$G${lr}/$K${lr}),$G${lr}/100)`);
    xput(LS,lr-1,12,fbV,0,canFb?`IF(AND($F${lr}="$",${drF}=0),1,0)`:'0');
    const f=`Levers!$L$${lr}`,vv=`Levers!$G$${lr}`,K=`Levers!$K$${lr}`,fb=`Levers!$M$${lr}`,un=`Levers!$F$${lr}`,a=`Levers!$I$${lr}/100`,cR=`Levers!$J$${lr}/100`,md=`Levers!$H$${lr}`,coR='Levers!$G$2';
    const av=(+l.ca||0)/100,cv=(+l.cc||0)/100,TOT=drV;
    // fob groups (market × brand, in scope) on the previous step
    const G={};if(l.t==='fob')SL.forEach(({r},j)=>{if(!sc[j])return;const g=G[r.m+'|'+r.b]??={dn:0,fn:0};g[r.ch==='20'?'fn':'dn']+=pst[j].ns;});
    const nst=SL.map(({r},j)=>{const er=j+3,x=pst[j],s=sc[j],o={...x},F={},H={},cs=`$D${er}`,hr=h=>`${XC(hc[h])}${er}`;XS.forEach(k=>F[k]=P(k,er));
      if(l.t==='allow'){H.d=[s*fV*x.gs,`${cs}*${f}*${P('gs',er)}`];const d=H.d[0],ry=x.ns?x.roy/x.ns:0;o.al+=d;o.ns-=d;o.roy-=ry*d;
        F.al=`${P('al',er)}+${hr('d')}`;F.ns=`${P('ns',er)}-${hr('d')}`;F.roy=`${P('roy',er)}-IF(${P('ns',er)}=0,0,${P('roy',er)}/${P('ns',er)})*${hr('d')}`;}
      else if(l.t==='price'){const q=1+s*fV;H.k=[q,`1+${cs}*${f}`];['gs','al','ns'].forEach(k=>{o[k]*=q;F[k]=`${P(k,er)}*${hr('k')}`;});if(x.ns)o.roy*=q;F.roy=`IF(${P('ns',er)}=0,${P('roy',er)},${P('roy',er)}*${hr('k')})`;}
      else if(l.t==='sales'||l.t==='infl'){const q=1+s*fV;H.k=[q,`1+${cs}*${f}`];(l.t==='sales'?VAR_K:['cogs']).forEach(k=>{o[k]*=q;F[k]=`${P(k,er)}*${hr('k')}`;});}
      else if(l.t==='mg'||l.t==='oh'){const q=fbV?1:1+s*fV,ad=fbV&&KV?s*v*x.ns/KV:0;H.k=[q,`IF(${fb}=1,1,1+${cs}*${f})`];H.add=[ad,`IF(${fb}=1,IF(${K}=0,0,${cs}*${vv}*${P('ns',er)}/${K}),0)`];
        if(l.t==='mg'){o.roy=x.roy*q-ad;F.roy=`${P('roy',er)}*${hr('k')}-${hr('add')}`;}
        else okeys.forEach((k,n)=>{o[k]=x[k]*q+(n?0:ad);F[k]=`${P(k,er)}*${hr('k')}${n?'':`+${hr('add')}`}`;});}
      else if(l.t==='close'){const cg=s*fV*x.gs,cn=cg*(1-av),g=l.mode==='rep'&&x.ns>0?Math.max(0,1-cn/x.ns):1;
        H.cg=[cg,`${cs}*${f}*${P('gs',er)}`];H.cn=[cn,`${hr('cg')}*(1-${a})`];H.g=[g,`IF(AND(${md}="Replacing",${P('ns',er)}>0),MAX(0,1-${hr('cn')}/${P('ns',er)}),1)`];
        const add={gs:[cg,hr('cg')],al:[cg*av,`${hr('cg')}*${a}`],ns:[cn,hr('cn')],cogs:[-cg*cv,`-${hr('cg')}*${cR}`],roy:[-cg*WI_CO.roy,`-${hr('cg')}*${coR}`]};
        VAR_K.forEach(k=>{o[k]=x[k]*g+(add[k]?add[k][0]:0);F[k]=`${P(k,er)}*${hr('g')}${add[k]?'+'+add[k][1]:''}`.replace('+-','-');});
        o.cgs=x.cgs+cg;o.cns=x.cns+cn;F.cgs=`${P('cgs',er)}+${hr('cg')}`;F.cns=`${P('cns',er)}+${hr('cn')}`;}
      else if(l.t==='fob'){const g=G[r.m+'|'+r.b]||{dn:0,fn:0},gt=g.dn+g.fn,mv=s?Math.max(-g.fn,Math.min(g.dn,abs?v*gt/(TOT||1):v/100*gt)):0;
        const skip=!s||gt<=0||(!g.fn&&mv>0)||(!g.dn&&mv<0),q=skip?1:r.ch==='20'?(g.fn?1+mv/g.fn:1):(g.dn?1-mv/g.dn:1);
        const crit=`${rngP(nm,0)},$A${er},${rngP(nm,2)},$C${er},${SC},1`;
        // Domestic = group total − FOB (a "<>20" criterion would not exclude the text code "20")
        H.dn=[s?g.dn:0,`${cs}*SUMIFS(${Pr('ns')},${crit})-${hr('fn')}`];H.fn=[s?g.fn:0,`${cs}*SUMIFS(${Pr('ns')},${crit},${rngP(nm,1)},"20")`];
        H.mv=[mv,`MAX(-${hr('fn')},MIN(${hr('dn')},IF(${un}="$",${vv}*(${hr('dn')}+${hr('fn')})/IF(${K}=0,1,${K}),${vv}/100*(${hr('dn')}+${hr('fn')}))))`];
        H.q=[q,`IF(OR(${cs}=0,${hr('dn')}+${hr('fn')}<=0,AND(${hr('fn')}=0,${hr('mv')}>0),AND(${hr('dn')}=0,${hr('mv')}<0)),1,IF($B${er}="20",IF(${hr('fn')}=0,1,1+${hr('mv')}/${hr('fn')}),IF(${hr('dn')}=0,1,1-${hr('mv')}/${hr('dn')})))`];
        VAR_K.forEach(k=>{o[k]=x[k]*q;F[k]=`${P(k,er)}*${hr('q')}`;});}
      [r.m,r.ch,r.b].forEach((v2,n)=>xput(SS,j+2,n,v2));xput(SS,j+2,3,s,0,`$F${er}*($E${er}>=Levers!$P$${lr})`);xput(SS,j+2,4,cuts[SL[j].p],0,`Periods!$F${er}`);xput(SS,j+2,5,scp[j],XF.in);
      help.forEach(h=>xput(SS,j+2,hc[h],H[h][0],h==='k'||h==='g'||h==='q'?XF.r4:XF.m,H[h][1]));
      XS.forEach(k=>xput(SS,j+2,cm[k],o[k],XF.m,F[k]));const od=xDer({...o}),FD=xDerF(cm,er);XD.forEach(k=>xput(SS,j+2,cm[k],od[k],XF.m,FD[k]));
      return o;});
    // impact in view (vs previous step)
    const dV=k=>sum(SL.map(({r},j)=>inView(r)*(xDer({...nst[j]})[k]-xDer({...pst[j]})[k])),q=>q);
    xput(LS,lr-1,13,dV('op'),XF.m,`SUMIFS(${rngP(nm,cm.op)},${IVp},1)-SUMIFS(${Pr('op')},${IVp},1)`);
    xput(LS,lr-1,14,dV('vm'),XF.m,`SUMIFS(${rngP(nm,cm.vm)},${IVp},1)-SUMIFS(${Pr('vm')},${IVp},1)`);
    xput(LS,lr-1,15,lc,XF.in);
    steps.push(SS);prev={name:nm,cm};pst=nst;});
  if(!L.length)xput(LS,4,1,'No levers: the scenario equals the base.',XF.n);
  // Scenario rows = YTD + last step
  const SR=XSheet('Scenario rows',{freeze:[2,5],w:{0:9,1:20,2:7,3:11,4:22,5:8}}),SCm={};c=6;[...XS,...XD].forEach(k=>SCm[k]=c++);for(let i=6;i<c;i++)SR.w[i]=13;
  xput(SR,0,0,`Scenario, full year = Base YTD + '${prev.name}' (rest of year after all levers)`,XF.b);
  hdr(SR,1,['Market code','Market','Channel code','Channel','Brand','In view']);[...XS,...XD].forEach(k=>xput(SR,1,SCm[k],XL[k],XF.h));
  const scV=rows.map((r,j)=>{const er=j+3,o={},a=j*PN+3,b=a+PN-1,lsum=k=>`SUM(${xq(prev.name)}!${XC(prev.cm[k])}${a}:${XC(prev.cm[k])}${b})`,ls=sumSl(pst,j);[r.m,mName(r.m),r.ch,CH[r.ch]||r.ch,r.b].forEach((v,n)=>xput(SR,j+2,n,v));xput(SR,j+2,5,inView(r),0,`Base!F${er}`);
    XK.forEach(k=>{o[k]=(r.ytd[k]||0)+ls[k];xput(SR,j+2,SCm[k],o[k],XF.m,`Base!${XC(YT[k])}${er}+${lsum(k)}`);});
    ['cgs','cns'].forEach(k=>{o[k]=ls[k];xput(SR,j+2,SCm[k],o[k],XF.m,lsum(k));});
    const od=xDer({...o}),FD=xDerF(SCm,er);XD.forEach(k=>xput(SR,j+2,SCm[k],od[k],XF.m,FD[k]));return od;});
  // Summary: P&L in view, base vs scenario, full year and rest of year
  const SM=XSheet('Summary',{tab:true,freeze:[4,1],w:{0:34,1:15,2:9,3:15,4:9,5:14,6:9,7:15,8:15,9:14}});
  xput(SM,0,0,`What-If scenario on ${D.lab}`,XF.t);
  xput(SM,1,0,`${cut?`Actuals locked Jan–${mo}; levers change ${rest}`:'No months locked; levers change the whole year'} · in view: ${scope()} · USD · exported ${new Date().toLocaleString('en-GB')} from the Forecast Cockpit`,XF.n);
  xput(SM,2,0,'All figures are formulas over the Base, lever and Scenario rows sheets (rows flagged In view = 1). Change blue inputs on Levers or Base and Excel recalculates.',XF.n);
  hdr(SM,3,['P&L line','Base FY','% NR','Scenario FY','% NR','Δ $','Δ pts',`Base ${rest}`,`Scenario ${rest}`,`Δ ${rest}`]);
  const vis=rows.map(inView),agg=(get)=>{const T={};[...XS,...XD].forEach(k=>T[k]=0);rows.forEach((r,j)=>{if(!vis[j])return;const o=get(r,j);[...XS,...XD].forEach(k=>T[k]+=o[k]||0);});return T;};
  const AB=agg(r=>xDer({...r.base})),AC=agg((r,j)=>scV[j]),ABR=agg((r,j)=>sumSl(st0,j)),ACR=agg((r,j)=>sumSl(pst,j));
  const src=[['Base',FY,AB],['Scenario rows',SCm,AC],['Periods',PC,ABR],[prev.name,prev.cm,ACR]],colOf=[1,3,7,8];
  const sumK=(n,k)=>n<2?`SUMIFS(${rng(src[n][0],src[n][1][k])},${IVb},1)`:`SUMIFS(${rngP(src[n][0],src[n][1][k])},${IVp},1)`;
  // [label, kind, value fn(T), formula fn(n, rowOf)] kind: 0 line, 1 subtotal, 2 allowance (% of gross), 3 overhead
  const PL=[['Gross sales',0,T=>T.gs,n=>sumK(n,'gs')],['Allowances',2,T=>-T.al,n=>`-${sumK(n,'al')}`],['Net revenue',1,T=>T.ns,n=>sumK(n,'ns')],
    ['Product cost',0,T=>T.cogs,n=>sumK(n,'cogs')],['Gross profit',1,T=>T.gp,(n,R2)=>`${R2('Net revenue')}+${R2('Product cost')}`],['Royalties (incl. MG)',0,T=>T.roy,n=>sumK(n,'roy')],
    ['GMR',1,T=>T.gmr,(n,R2)=>`${R2('Gross profit')}+${R2('Royalties (incl. MG)')}`],['Logistics',0,T=>T.wh+T.fr,n=>`${sumK(n,'wh')}+${sumK(n,'fr')}`],
    [sub?'VM (GM − royalties − S&W)':'Variable margin',1,T=>T.vm,(n,R2)=>`${R2('GMR')}+${R2('Logistics')}`],
    ...OH_K.map(k=>[OH_LAB[k],3,T=>-T[k],n=>`-${sumK(n,k)}`]),['A&P and overheads',1,T=>-OH_K.reduce((s,k)=>s+T[k],0),(n,R2)=>`SUM(${R2(OH_LAB[OH_K[0]])}:${R2(OH_LAB[OH_K[OH_K.length-1]])})`],
    ['Operating profit',1,T=>T.op,(n,R2)=>`${R2(sub?'VM (GM − royalties − S&W)':'Variable margin')}+${R2('A&P and overheads')}`]];
  const rowOf={};PL.forEach((p,i)=>rowOf[p[0]]=i+5);
  PL.forEach(([lab,kind,fv,ff],i)=>{const r=i+4,er=r+1,st=kind===1?XF.sm:XF.m;xput(SM,r,0,kind===3?'   '+lab:lab+(kind===2?' (% of gross)':''),kind===1?XF.sb:0);
    src.forEach((s2,n)=>{const col=XC(colOf[n]);xput(SM,r,colOf[n],fv(s2[2]),st,ff(n,l2=>`${col}${rowOf[l2]}`));});
    const pr=(c2,T)=>kind===2?(T.gs?-fv(T)/T.gs:0):(T.ns?fv(T)/T.ns:0),den=c2=>kind===2?`${c2}$${rowOf['Gross sales']}`:`${c2}$${rowOf['Net revenue']}`;
    xput(SM,r,2,pr('B',AB),kind===1?XF.sp:XF.p,`IF(${den('B')}=0,0,${kind===2?'-':''}B${er}/${den('B')})`);xput(SM,r,4,pr('D',AC),kind===1?XF.sp:XF.p,`IF(${den('D')}=0,0,${kind===2?'-':''}D${er}/${den('D')})`);
    xput(SM,r,5,fv(AC)-fv(AB),st,`D${er}-B${er}`);xput(SM,r,6,pr('D',AC)-pr('B',AB),kind===1?XF.sp:XF.p,`E${er}-C${er}`);xput(SM,r,9,fv(ACR)-fv(ABR),st,`I${er}-H${er}`);});
  let r=PL.length+5;const opR=rowOf['Operating profit'];
  xput(SM,r,0,'Check: operating profit vs row totals (should be 0)',XF.n);xput(SM,r,1,0,XF.m,`B${opR}-${sumK(0,'op')}`);xput(SM,r,3,0,XF.m,`D${opR}-${sumK(1,'op')}`);
  r+=1;xput(SM,r,0,'Closeout gross sales added (memo)',XF.n);xput(SM,r,3,AC.cgs,XF.m,sumK(1,'cgs'));xput(SM,r+1,0,'Closeout net sales added (memo)',XF.n);xput(SM,r+1,3,AC.cns,XF.m,sumK(1,'cns'));
  r+=3;xput(SM,r,0,'Operating profit bridge (in view)',XF.t);hdr(SM,r+1,['Step','Operating profit','Δ variable margin']);r+=2;const b0=r+1;
  xput(SM,r,0,'Base operating profit',XF.sb);xput(SM,r,1,AB.op,XF.sm,`B${opR}`);r++;
  L.forEach((l,i)=>{xput(SM,r,0,`${i+1}. ${WI_TYPES[l.t].lab}${l.t==='oh'?` (${OH_PICK[l.line||'all']})`:''} · ${wiScopeTxt(l)}`);const n=LS.rows[LR(i)-1];xput(SM,r,1,n[13].v,XF.m,`Levers!N${LR(i)}`);xput(SM,r,2,n[14].v,XF.m,`Levers!O${LR(i)}`);r++;});
  xput(SM,r,0,'Scenario operating profit',XF.sb);xput(SM,r,1,AC.op,XF.sm,`D${opR}`);
  xput(SM,r+1,0,'Check: base + steps − scenario (should be 0)',XF.n);xput(SM,r+1,1,0,XF.m,`B${b0}+SUM(B${b0+1}:B${r})-B${r+1}`);
  // By market / By brand
  const by=(name,key,lab,bc)=>{const sh=XSheet(name,{freeze:[3,2],w:{0:12,1:24}}),g={};for(let i=2;i<14;i++)sh.w[i]=14;rows.forEach((r2,j)=>{if(vis[j])(g[r2[key]]??=[]).push(j);});
    xput(sh,0,0,`${name}: base vs scenario, full year, in view`,XF.t);hdr(sh,2,[name==='By market'?'Market code':'Brand',name==='By market'?'Market':'',...['NR','VM','OP'].flatMap(m=>[`Base ${m}`,`Scenario ${m}`,`Δ ${m}`]),'Base Op %','Scenario Op %','Δ pts']);
    const ks=Object.keys(g).map(k=>{const j=g[k],B=sum(j,q=>xDer({...rows[q].base}).op),C=sum(j,q=>scV[q].op);return {k,j,d:C-B};}).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));
    const SI=(s2,cm,k,er)=>`SUMIFS(${rng(s2,cm[k])},${rng('Base',bc)},$A${er},${IVb},1)`;
    ks.forEach((o,i)=>{const rr=i+3,er=rr+1,vB=k=>sum(o.j,q=>xDer({...rows[q].base})[k]),vC=k=>sum(o.j,q=>scV[q][k]);xput(sh,rr,0,o.k);xput(sh,rr,1,name==='By market'?lab(o.k):'');
      ['ns','vm','op'].forEach((k,n)=>{const c0=2+n*3;xput(sh,rr,c0,vB(k),XF.m,SI('Base',FY,k,er));xput(sh,rr,c0+1,vC(k),XF.m,SI('Scenario rows',SCm,k,er));xput(sh,rr,c0+2,vC(k)-vB(k),XF.m,`${XC(c0+1)}${er}-${XC(c0)}${er}`);});
      xput(sh,rr,11,vB('ns')?vB('op')/vB('ns'):0,XF.p,`IF(C${er}=0,0,I${er}/C${er})`);xput(sh,rr,12,vC('ns')?vC('op')/vC('ns'):0,XF.p,`IF(D${er}=0,0,J${er}/D${er})`);xput(sh,rr,13,0,XF.p,`M${er}-L${er}`);});
    const tr=ks.length+3,te=tr+1;xput(sh,tr,0,'Total',XF.sb);xput(sh,tr,1,'',XF.sb);for(let c2=2;c2<11;c2++)xput(sh,tr,c2,null,XF.sm,`SUM(${XC(c2)}4:${XC(c2)}${tr})`);
    xput(sh,tr,11,null,XF.sp,`IF(C${te}=0,0,I${te}/C${te})`);xput(sh,tr,12,null,XF.sp,`IF(D${te}=0,0,J${te}/D${te})`);xput(sh,tr,13,null,XF.sp,`M${te}-L${te}`);return sh;};
  const BM=by('By market','m',mName,0),BB=by('By brand','b',x=>x,4);
  // Notes
  const NT=XSheet('Notes',{w:{0:150}});
  ['How this workbook works',`Base: ${D.full}. A&P and overheads from the ${R.BB.pool==='jul'?'Jul':'Sept'} market submissions in the data pack by market × channel × brand (rows with no forecast match re-spread by net sales; central costs allocated by brand net sales; closeouts excluded).`,
   `Base sheet: full-year values per row, split into actuals (Jan–${mo||'none'}) and rest of year (${rest}) by the rest-of-year share, taken from the ${MONS[wiProfK(R.k)].lab} monthly net-revenue profile (market × channel × brand, then market × channel, channel, EMEA).`,
   `Periods sheet: each row's rest of year cut into periods at every lever's start month (${cuts.map((c0,p)=>wiPerLab(cuts,p)).join(', ')}); share = the period's part of full-year net revenue, an input.`,
   'Lever sheets (L1, L2, …): one line per row × period, aligned with Periods. Each reads the sheet before it and applies one lever where In scope = Scope (1/0) × (period starts at or after the lever\'s Built on month on the Levers sheet), using the rate on the Levers sheet. A $ amount is turned into a rate by dividing by the driver summed over the scope.',
   'Drivers: allowance, price and closeouts → gross sales; incremental sales and FOB share → net sales; inflation → product cost; MG → royalties; overhead levers → the chosen overhead lines. MG and overhead $ levers with no base in the scope are spread by net sales.',
   'Allowance and price changes move royalties with net sales; incremental sales scale units, gross-to-net, cost, royalties and logistics with A&P and overheads fixed; inflation applies to product cost only; FOB share moves net sales between the Domestic and DI / FOB rows of each market × brand at each channel’s own economics.',
   'Closeouts add gross sales at the closeout allowance, cost and royalty rates; Replacing first scales the row down by the closeout net sales.',
   'Scenario rows = Base YTD + the last lever sheet. Summary, By market and By brand sum the rows flagged In view = 1 (the cockpit filter at export).',
   'Sign convention on the row sheets: product cost, royalties, warehousing and freight are negative; allowances and A&P / overhead lines are positive amounts that are deducted. The Summary shows the P&L with deductions as negatives.',
   'Inputs (blue on yellow): Levers G (value), F (unit: %, pts or $), H (closeout mode: Incremental or Replacing), I and J (closeout rates), G2 (closeout royalty); Base F (in view) and G (rest-of-year share); lever sheets D (in scope).',
   'Check rows on the Summary should read 0.'].forEach((t,i)=>xput(NT,i,0,t,i?0:XF.t));
  return {sheets:[SM,LS,BM,BB,BS,PS,...steps,SR,NT],check:{scen:rows.map((r,j)=>sumSl(pst,j)),R},name:`What-If ${D.lab} ${cut?`actuals to ${mo} `:''}${new Date().toISOString().slice(0,10)}.xlsx`.replace(/[\\/:*?"<>|]+/g,' ')};}
async function wiExportXlsx(){const b=$('#wiXlsx'),m=$('#wiXmsg'),say=(t,e)=>{m.textContent=t;m.classList.toggle('err',!!e);};b.disabled=true;say('Building the workbook…');
  try{const W=wiWorkbook(),blob=await xBook(W.sheets),name=W.name;
    const dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null;
    if(dl){try{await dl.save({filename:name,data:blob});say('Saved: '+name);}catch(e){const c=e&&e.code;say(c==='declined'?'Download cancelled.':c==='rate_limited'?'A download prompt is already open; try again in a moment.':'Download not available here ('+(c||'error')+').',c!=='declined');}}
    else{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);say('Saved: '+name);}}
  catch(e){console.error(e);say(e.message||'Could not build the workbook.',true);}
  finally{b.disabled=false;}}
$('#wiXlsx').addEventListener('click',wiExportXlsx);
