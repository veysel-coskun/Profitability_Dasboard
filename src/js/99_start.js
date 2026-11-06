// ---------- Start: a pack saved in this browser if there is one, else the demo data; then wire the Data dialog ----------
function packUI(){const $=s=>document.querySelector(s),dlg=$('#dataDlg'),msg=(t,c)=>{const m=$('#dataMsg');m.textContent=t||'';m.className='dd-msg '+(c||'');};
  const own=!PACK_INFO.demo;$('#dataBtn').classList.toggle('own',own);$('#dataLab').textContent=own?(META.company||'Your data'):'Demo data';
  $('#dataStatus').textContent=own?`Showing your data pack: ${META.company}${PACK_INFO.file?` (${PACK_INFO.file}, loaded ${PACK_INFO.at})`:''}.`:`Showing demo data for ${META.company}, a fictional company. All names and numbers are made up.`;
  $('#dataReset').hidden=!own;
  $('#dataBtn').addEventListener('click',()=>{msg('');dlg.showModal();});
  $('#dataTpl').addEventListener('click',async()=>{msg('Building the template…');try{const X=await loadXlsx(),wb=packToBook(X);
      const blob=new Blob([X.write(wb,{type:'array',bookType:'xlsx',compression:true})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      await saveBlob(blob,`${(META.company||'cockpit').replace(/[\\/:*?"<>|]+/g,' ')} data pack.xlsx`);msg('Template saved.','ok');}
    catch(e){msg(e&&e.code==='declined'?'Download cancelled.':(e.message||'Could not build the template.'),'err');}});
  $('#dataFile').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;msg(`Reading ${f.name}…`);
    try{const X=await loadXlsx(),wb=X.read(await f.arrayBuffer(),{type:'array'}),p=bookToPack(X,wb),info={demo:false,file:f.name,at:new Date().toLocaleString('en-GB')};
      await packSave({p,info});dlg.close();packStart(p,info);}
    catch(err){msg('The file could not be loaded:\n'+(err.message||err),'err');}});
  $('#dataReset').addEventListener('click',async()=>{await packClear();dlg.close();packStart(DEMO_PACK,{demo:true});});}
(async()=>{const saved=await packLoad();if(saved&&saved.p){try{packStart(saved.p,saved.info);return;}catch(e){console.error('Saved data pack failed; showing demo data',e);await packClear();}}
  packStart(DEMO_PACK,{demo:true});})();
