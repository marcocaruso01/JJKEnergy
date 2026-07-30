/* JJK Energy V39.7 - clean single-panel Jogo controls */
(function(root){
'use strict';
if(root.__JJK_V396_JOGO_UI__)return;
root.__JJK_V396_JOGO_UI__=true;
const VERSION='39.7.2';

function read(name,fallback=null){try{const value=(0,eval)(name);return value===undefined?fallback:value;}catch(_){return root[name]===undefined?fallback:root[name];}}

function ensureStyle(){
  if(document.getElementById('v396JogoStyle'))return;
  const style=document.createElement('style');
  style.id='v396JogoStyle';
  style.textContent=`
    #v27JogoTerrain{display:none!important}
    #v392JogoPanel{display:none!important}
    #jogoPanel.show #v37JogoPanel{
      display:block!important;
      margin:12px 0 0!important;
      padding:14px!important;
      border:1px solid rgba(255,132,58,.48)!important;
      border-radius:18px!important;
      background:radial-gradient(circle at 100% 0,rgba(255,111,32,.18),transparent 42%),linear-gradient(145deg,rgba(35,16,9,.98),rgba(10,8,11,.98))!important;
      box-shadow:0 12px 28px rgba(0,0,0,.34),inset 0 0 22px rgba(255,107,35,.05)!important;
    }
    #jogoPanel:not(.show) #v37JogoPanel{display:none!important}
    #jogoPanel #v37JogoPanel .v37-panel-title{
      margin:0 0 8px;
      color:#ffad68;
      font-size:.82rem;
      font-weight:950;
      letter-spacing:.08em;
      text-transform:uppercase;
    }
    #jogoPanel #v37JogoSummary{
      padding:11px 12px;
      border:1px solid rgba(255,148,78,.22);
      border-radius:13px;
      background:rgba(9,7,10,.62);
      color:#fff;
      line-height:1.35;
    }
    #jogoPanel #v37JogoSummary b{color:#ffd0aa;font-size:.92rem}
    #jogoPanel #v37JogoPanel .v37-actions{
      display:grid!important;
      grid-template-columns:1fr!important;
      gap:8px!important;
      margin-top:10px!important;
    }
    #jogoPanel #v37JogoPanel .v37-actions button{
      min-height:44px!important;
      width:100%!important;
      padding:10px 12px!important;
      border:1px solid rgba(255,145,71,.52)!important;
      border-radius:12px!important;
      background:linear-gradient(135deg,#9d3f13,#4f1c08)!important;
      color:#fff!important;
      font-size:.78rem!important;
      font-weight:900!important;
      box-shadow:none!important;
    }
    #jogoPanel #v37JogoPanel .v37-actions button:disabled{display:none!important}
    #jogoPanel #v37JogoPanel .v396-jogo-empty{
      display:none;
      margin-top:9px;
      color:#a9958d;
      font-size:.72rem;
      line-height:1.35;
    }
    #jogoPanel #v37JogoPanel.v396-no-actions .v396-jogo-empty{display:block}
    @media(max-width:620px){
      #jogoPanel #v37JogoPanel{margin-top:10px!important;padding:12px!important}
      #jogoPanel #v37JogoPanel .v37-actions button{min-height:42px!important}
    }
  `;
  document.head.appendChild(style);
}

function clean(force=false){
  if(document.hidden&&!force)return;
  ensureStyle();
  const giocoPanel=document.getElementById('jogoPanel');
  const legacy=document.getElementById('v27JogoTerrain');
  const active=document.getElementById('v37JogoPanel');
  const isJogo=read('currentId',null)==='jogo';
  const v402OwnsPanel=!!root.__JJK_V402_INSTALLED__;

  if(giocoPanel&&active&&active.parentElement!==jogoPanel)giocoPanel.appendChild(active);
  if(giocoPanel)giocoPanel.classList.toggle('show',isJogo);
  if(active){
    const showLegacy=isJogo&&!v402OwnsPanel;
    const nextDisplay=showLegacy?'block':'none';
    if(active.style.getPropertyValue('display')!==nextDisplay||active.style.getPropertyPriority('display')!=='important')active.style.setProperty('display',nextDisplay,'important');
    active.setAttribute('aria-hidden',showLegacy?'false':'true');
  }
  if(legacy){legacy.setAttribute('aria-hidden','true');legacy.hidden=true;}
  if(active){
    let empty=active.querySelector('.v396-jogo-empty');
    if(!empty){empty=document.createElement('div');empty.className='v396-jogo-empty';empty.textContent='Nessuna azione speciale disponibile in questo momento.';active.appendChild(empty);}
    const buttons=[...active.querySelectorAll('.v37-actions button')];
    active.classList.toggle('v396-no-actions',buttons.length>0&&buttons.every(button=>button.disabled));
  }
}

function start(){
  clean(true);
  setTimeout(()=>clean(true),180);
  setTimeout(()=>clean(true),900);
  const panel=document.getElementById('jogoPanel');
  if(panel){
    const observer=new MutationObserver(()=>{
      clearTimeout(observer._v396Timer);
      observer._v396Timer=setTimeout(()=>clean(false),80);
    });
    observer.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','disabled']});
  }
  setInterval(()=>clean(false),2200);
  root.JJKV396={version:VERSION,clean};
  console.info('JJK Energy Jogo UI cleanup ready',VERSION);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(typeof window!=='undefined'?window:globalThis);
