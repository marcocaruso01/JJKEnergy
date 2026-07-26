/* JJK Energy V37 - bootstrap verificato del pacchetto gameplay */
(function(){
'use strict';
if(window.__JJK_V37_BOOTSTRAP__)return;
window.__JJK_V37_BOOTSTRAP__={status:'loading',version:'37.0.0'};
function reportFailure(error){
  const message=String(error?.message||error||'Errore sconosciuto');
  window.__JJK_V37_BOOTSTRAP__={status:'failed',version:'37.0.0',error:message};
  console.error('JJK V37 bootstrap failed',error);
  try{
    if(typeof window.showPlayerNotification==='function')window.showPlayerNotification('Aggiornamento V37 non caricato',message,'#ff647b');
    else if(typeof window.showModal==='function')window.showModal('Aggiornamento V37 non caricato','',message);
  }catch(_){}
}
async function load(){
  try{
    if(typeof DecompressionStream!=='function')throw new Error('Il browser non supporta la decompressione necessaria. Aggiorna Safari e ricarica la pagina.');
    const response=await fetch('.v37/js.00?v=20260726v370',{cache:'no-store'});
    if(!response.ok)throw new Error('Pacchetto V37 non trovato: HTTP '+response.status+'.');
    const encoded=(await response.text()).replace(/\s+/g,'');
    if(encoded.length<1000)throw new Error('Pacchetto V37 incompleto.');
    const binary=atob(encoded),bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const source=await new Response(stream).text();
    if(!source.includes("const VERSION='37.0.0'"))throw new Error('Versione V37 non valida.');
    if(!source.includes('resolveVariableCost')||!source.includes('v37ItadoriImmortality'))throw new Error('Pacchetto V37 privo delle regole richieste.');
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    const script=document.createElement('script');
    script.src=url;
    script.dataset.jjkV37Runtime='1';
    script.onload=()=>{
      URL.revokeObjectURL(url);
      window.__JJK_V37_BOOTSTRAP__={status:'loaded',version:'37.0.0',bytes:source.length};
      setTimeout(()=>{
        const checks=window.JJKV37RuntimeChecks;
        if(checks&&!checks.ok)console.error('JJK V37 runtime checks failed',checks);
      },2200);
    };
    script.onerror=()=>{URL.revokeObjectURL(url);reportFailure(new Error('Il motore V37 non è stato eseguito.'));};
    document.body.appendChild(script);
  }catch(error){reportFailure(error);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
