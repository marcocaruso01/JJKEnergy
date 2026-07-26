/* JJK Energy V37.1 fallback loader + V37.2 GM audit */
(function(){
'use strict';
if(window.__JJK_V371_BOOTSTRAP__)return;
window.__JJK_V371_BOOTSTRAP__=true;
const PARTS=['.v371/payload.00','.v371/payload.01','.v371/payload.02','.v371/payload.03'];
function decodeBase64(value){const raw=atob(value),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;}
async function gunzip(bytes){
  if(typeof DecompressionStream!=='function')throw new Error('DecompressionStream non disponibile');
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new TextDecoder().decode(await new Response(stream).arrayBuffer());
}
function loadV372(){
  if(document.querySelector('[data-jjk-v372-gm-audit]'))return;
  const script=document.createElement('script');
  script.src='v372-gm-controls-audit.js?v=20260726v372';
  script.defer=true;
  script.dataset.jjkV372GmAudit='1';
  script.onload=()=>console.info('JJK Energy V37.2 GM audit loaded');
  script.onerror=()=>console.error('JJK Energy V37.2 GM audit failed to load');
  document.head.appendChild(script);
}
async function load(){
  try{
    const chunks=await Promise.all(PARTS.map(path=>fetch(path+'?v=20260726v371',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error(path+' '+response.status);return response.text();})));
    const source=await gunzip(decodeBase64(chunks.join('').replace(/\s+/g,'')));
    if(!source.includes("const VERSION='37.1.0'"))throw new Error('Versione V37.1 non riconosciuta');
    (0,eval)(source+'\n//# sourceURL=v371-jogo-itadori-fixes.js');
    window.JJKV371Bootstrap={loaded:true,parts:PARTS.length};
    console.info('JJK Energy V37.1 fallback loaded');
  }catch(error){
    window.JJKV371Bootstrap={loaded:false,error:String(error?.message||error)};
    console.error('JJK Energy V37.1 fallback failed',error);
  }finally{
    loadV372();
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,700),{once:true});else setTimeout(load,700);
})();
