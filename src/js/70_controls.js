function makeDD(el,{noun,items,get,set,visible=()=>true,label=x=>x,sub=()=>''}){
  el.innerHTML=`<button class="dd-btn" type="button" aria-haspopup="listbox"><span class="lab"></span><span class="cnt"></span><span class="car">▾</span></button>
    <div class="dd-pan"><input type="text" placeholder="Search ${noun}…" autocomplete="off"><div class="dd-acts"><button class="resetlink" data-a="all">Select all</button><button class="resetlink" data-a="inv">Invert</button></div><div class="dd-list" role="listbox"></div></div>`;
  const btn=$('.dd-btn',el),inp=$('input',el),list=$('.dd-list',el);
  const vis=()=>items.filter(visible),match=()=>{const q=inp.value.trim().toLowerCase();return vis().filter(x=>!q||label(x).toLowerCase().includes(q));};
  const apply=s=>{if(![...s].some(visible))return;set(s);render();};
  function draw(){const cur=get();list.innerHTML=match().map(x=>`<div class="dd-opt${cur.has(x)?' on':''}" data-v="${String(x).replace(/"/g,'&quot;')}" role="option" aria-selected="${cur.has(x)}"><span class="ck">${cur.has(x)?'✓':''}</span><span>${label(x)}</span><span style="display:flex;gap:8px;align-items:center"><span class="mono" style="font-size:11px;color:var(--muted)">${sub(x)}</span><button class="only" data-only="1">only</button></span></div>`).join('')||'<div class="ms-empty">No matches.</div>';
    $$('.dd-opt',list).forEach(o=>o.addEventListener('click',e=>{const v=o.dataset.v,s=new Set(get());if(e.target.dataset.only){apply(new Set([v]));return;}s.has(v)?s.delete(v):s.add(v);apply(s);}));}
  function sync(){const V=vis(),n=V.filter(x=>get().has(x)).length;$('.lab',btn).textContent=n===V.length?`All ${noun}`:n===1?label(V.find(x=>get().has(x))):`${n} ${noun}`;$('.cnt',btn).textContent=`${n}/${V.length}`;if(el.classList.contains('open'))draw();}
  btn.addEventListener('click',()=>{const o=!el.classList.contains('open');$$('.dd.open').forEach(d=>d.classList.remove('open'));if(o){el.classList.add('open');inp.value='';draw();inp.focus();}});
  inp.addEventListener('input',draw);
  inp.addEventListener('keydown',e=>{if(e.key==='Escape'){el.classList.remove('open');btn.focus();}});
  $$('.dd-acts button',el).forEach(b=>b.addEventListener('click',()=>{const q=inp.value.trim(),m=match();
    if(b.dataset.a==='all')apply(q?new Set([...get(),...m]):new Set(items));else apply(new Set(vis().filter(x=>!get().has(x))));}));
  document.addEventListener('click',e=>{if(!e.composedPath().includes(el))el.classList.remove('open');}); // path survives the list redraw
  sync();return {sync};}
const nsBy=k=>BASE.reduce((a,g)=>(a[g[k]]=(a[g[k]]||0)+g.ns,a),{});const M_NS=nsBy('m'),B_NS=nsBy('b');
const DD_M=makeDD($('#mktDD'),{noun:'markets',items:ALL_M,get:()=>S.m,set:s=>{S.m=s;},visible:m=>S.view==='raw'||m!==CENTRAL,label:mName,sub:m=>M_NS[m]?money(M_NS[m]):''});
const DD_B=makeDD($('#brDD'),{noun:'brands',items:[...ALL_B].sort((a,b)=>(B_NS[b]||0)-(B_NS[a]||0)),get:()=>S.b,set:s=>{S.b=s;},sub:b=>B_NS[b]?money(B_NS[b]):'central only'});
$$('#viewSeg button').forEach(b=>b.addEventListener('click',()=>{S.view=b.dataset.v;$$('#viewSeg button').forEach(x=>x.classList.toggle('on',x===b));
  if(!liveM().length)S.m=new Set(ALL_M);render();}));
$('#coChip').addEventListener('click',()=>{S.co=!S.co;$('#coChip').classList.toggle('on',S.co);render();});
$('#chChips').innerHTML=ALL_CH.map(c=>`<span class="chip on" data-ch="${c}">${CH[c]||c}</span>`).join('');
$$('#chChips .chip').forEach(ch=>ch.addEventListener('click',()=>{const c=ch.dataset.ch;if(S.ch.has(c)){if(S.ch.size>1){S.ch.delete(c);ch.classList.remove('on');}}else{S.ch.add(c);ch.classList.add('on');}render();}));
$$('#mMetric button').forEach(b=>b.addEventListener('click',()=>{S.mMetric=b.dataset.m;$$('#mMetric button').forEach(x=>x.classList.toggle('on',x===b));render();}));
$$('#hMetric button').forEach(b=>b.addEventListener('click',()=>{S.hMetric=b.dataset.m;$$('#hMetric button').forEach(x=>x.classList.toggle('on',x===b));render();}));
$$('.tab').forEach(t=>t.addEventListener('click',()=>showTab(t.dataset.k)));
$$('.mtab').forEach(t=>t.addEventListener('click',()=>showTab(LAST_V[t.dataset.g])));   // a section opens on its last-used view
(function(){try{const s=localStorage.getItem('cockpit-theme');if(s)document.documentElement.setAttribute('data-theme',s);}catch(e){}})();
$('#themeBtn').addEventListener('click',()=>{const c=document.documentElement.getAttribute('data-theme');const isDark=c==='dark'||(!c&&matchMedia('(prefers-color-scheme:dark)').matches);const n=isDark?'light':'dark';document.documentElement.setAttribute('data-theme',n);try{localStorage.setItem('cockpit-theme',n);}catch(e){}render();});
