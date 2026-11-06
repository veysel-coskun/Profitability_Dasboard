// ---------- Scenarios: one registry for every dataset the cockpit can compare ----------
// Common row shape (USD): m, ch, b, u, gs, al, ns, cogs, gp, roy, gmr, wh, fr, vm. cogs / roy / wh / fr are negative,
// so gp = ns + cogs, gmr = gp + roy, vm = gmr + wh + fr. Market submissions map onto it with cogs = GM − NS,
// cogs = −(inventory cost + inventory variance) so gp = submission Gross Margin, roy = −royalty expense (submissions book it below
// Gross Margin), Shipping & Warehousing as wh; so VM = GM − royalty − S&W, like the central GMR − warehousing − freight.
// Closeouts and central charges are excluded.
const DS=(()=>{
  const sub=BASE.filter(g=>g.b!==CLOSE).map(g=>{const L=g.L,gmr=g.gm-L.roy;
    return {m:g.m,ch:g.ch,b:g.b,u:g.u,gs:g.gs,al:g.al,ns:g.ns,cogs:g.gm-g.ns,gp:g.gm,roy:-L.roy,gmr,wh:-L.sw,fr:0,vm:gmr-L.sw};});
  const py=(PY.rows||[]).map(a=>({m:a[0],ch:String(a[1]),b:a[2],u:a[3],gs:a[4],al:a[5],ns:a[6],cogs:a[7],gp:a[8],roy:a[9],gmr:a[10],wh:a[11],fr:a[12],vm:a[13]}));
  const d={
    nvp:{lab:CFC.nvp.lab,full:CFC.nvp.full,grp:'Forecast',rows:CFR.nvp,pending:!CFR.nvp.length},
    nov:{lab:CFC.nov.lab,full:CFC.nov.full,grp:'Forecast',rows:CFR.nov,pending:!CFR.nov.length},
    ocp:{lab:CFC.ocp.lab,full:CFC.ocp.full,grp:'Forecast',rows:CFR.ocp,pending:!CFR.ocp.length},
    oct:{lab:CFC.oct.lab,full:CFC.oct.full,grp:'Forecast',rows:CFR.oct,pending:!CFR.oct.length},
    sep:{lab:CFC.sep.lab,full:CFC.sep.full,grp:'Forecast',rows:CFR.sep,pending:!CFR.sep.length},
    jul:{lab:CFC.jul.lab,full:CFC.jul.full,grp:'Forecast',rows:CFR.jul,pending:!CFR.jul.length},
    sub:{lab:'Market submissions',full:`Market submissions for ${META.company} (P&L by market × channel × brand)`,grp:'Forecast',rows:sub},
    py:{lab:PY.lab||'FY2025 actuals',full:PY.full||'FY2025 actuals',grp:'Actuals',rows:py,pending:!py.length,source:PY.source||''}};
  for(const k in d){d[k].k=k;d[k].mk=new Set(d[k].rows.map(r=>r.m));}
  return d;})();
// The three timeframe slots chosen in the header; Compare = Current vs Prior Forecast, Current vs Prior Year.
// default slots: the latest forecasts that have rows in the data pack (a pack may leave slots empty)
{const has=k=>DS[k]&&DS[k].rows.length,fc=['nvp','nov','ocp','oct','sep','jul','sub'].filter(has),cur=fc[0]||'sub';S.slot={cur,pri:(cur==='nvp'&&has('ocp')?'ocp':fc.find(k=>k!==cur))||cur,py:'py'};}S.cmpSub='pri';S.lfl=true;S.cmpMetric='vm';
const SLOT_LAB={cur:'Current forecast',pri:'Prior forecast',py:'Prior year'};
// Filtered rows are memoised per dataset × filter state × market set, so tab switches and repeated renders are cheap.
const _fc=new Map();
function fSig(){return [...S.m].sort().join('|')+'#'+[...S.ch].sort().join('|')+'#'+(allBrands()?'*':[...S.b].sort().join('|'));}
function dsRows(k,mk){const D=DS[k];if(!D)return [];const key=k+'@'+fSig()+'@'+(mk?[...mk].sort().join('|'):'');let r=_fc.get(key);if(r)return r;
  const aB=allBrands();r=D.rows.filter(x=>S.m.has(x.m)&&S.ch.has(x.ch)&&(aB||S.b.has(x.b))&&(!mk||mk.has(x.m)));
  if(_fc.size>80)_fc.clear();_fc.set(key,r);return r;}
function slotSync(){$$('.slotsel').forEach(sel=>{const s=sel.dataset.slot;sel.value=S.slot[s];});}
function slotInit(){const opt=k=>`<option value="${k}">${DS[k].lab}${DS[k].pending?' (pending)':''}</option>`,grp=g=>Object.keys(DS).filter(k=>DS[k].grp===g);
  $$('.slotsel').forEach(sel=>{sel.innerHTML=`<optgroup label="Forecasts">${grp('Forecast').map(opt).join('')}</optgroup><optgroup label="Actuals">${grp('Actuals').map(opt).join('')}</optgroup>`;
    sel.addEventListener('change',()=>{S.slot[sel.dataset.slot]=sel.value;deckSync();render();});});  // every view reads the slots
  slotSync();}
