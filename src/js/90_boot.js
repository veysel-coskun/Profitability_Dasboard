function renderIns(){if(!$('#tab-ins').classList.contains('active'))return;if(S.insSub==='price')renderPricing();else if(S.insSub==='top')renderTop();}
$$('#insSub button').forEach(b=>b.addEventListener('click',()=>{S.insSub=b.dataset.s;$$('#insSub button').forEach(x=>x.classList.toggle('on',x===b));$$('#tab-ins .ipanel').forEach(p=>p.classList.toggle('on',p.id==='ins-'+S.insSub));renderIns();}));
$$('#prSrc button').forEach(b=>b.addEventListener('click',()=>{S.prSrc=b.dataset.v;renderPricing();}));
$$('#prCcy button').forEach(b=>b.addEventListener('click',()=>{S.prCcy=b.dataset.v;renderPricing();}));
$('#prBand').addEventListener('change',e=>{S.prBand=e.target.value;renderPricing();});
$$('#topSrc button').forEach(b=>b.addEventListener('click',()=>{S.topSrc=b.dataset.v;renderTop();}));
$('#engSugg').innerHTML=ENG_SUGG.map(s=>`<button>${esc(s)}</button>`).join('');$$('#engSugg button').forEach(b=>b.addEventListener('click',()=>engSend(b.textContent)));
$('#engSend').addEventListener('click',()=>engSend($('#engIn').value));
$('#engIn').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();engSend(e.target.value);}});
$('#engStop').addEventListener('click',()=>{if(ENG.ctl)ENG.ctl.abort();});
$('#engClear').addEventListener('click',()=>{if(ENG.ctl)ENG.ctl.abort();ENG.turns=[];ENG.prev=null;$('#engChat').innerHTML='';});

slotInit();cmpInit();deckSync();wiInit();
S.plLfl=false;$('#ovLfl').addEventListener('click',()=>{S.plLfl=!S.plLfl;renderPL();});
{const h=(location.hash||'').slice(1);if(h&&(VIEWS[h]||h==='ins'))setActiveTab(h);}
// header (title, subtitle and logo from the data pack) and the collapsible filter panel (remembered per viewer)
$('#hLogo').src='data:image/png;base64,'+LOGO;
$('#hTitle').textContent=[META.region,META.title].filter(Boolean).join(' ');$('#hSub').textContent=META.sub||'';document.title=$('#hTitle').textContent;
$('#fxNote').textContent=`Values in USD${FX_TXT?` (local currencies converted at ${FX_TXT})`:''}. Brands, markets and scenarios as defined in the data pack.`;
{const set=off=>{document.body.classList.toggle('rail-off',off);$('#railTog').setAttribute('aria-expanded',!off);try{localStorage.setItem('cockpit-rail',off?'off':'on');}catch(e){}};
  let off=innerWidth<=940;try{const v=localStorage.getItem('cockpit-rail');if(v)off=v==='off';}catch(e){}set(off);   // phones start collapsed
  $('#railTog').addEventListener('click',()=>{set(!document.body.classList.contains('rail-off'));});}
render();
window.CK={S,DS,render,showTab,wiRun,wiAdd,wiWorkbook,xBook,deckSync,buildDeck,loadPptx,ALL_B,ALL_M};   // handle for checks from the console
