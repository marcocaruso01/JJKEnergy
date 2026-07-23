/* JJK Energy V2.2 - selettore layout PC / Mobile */
(function(){
'use strict';
const KEY='jjk_layout_preference_v22';
let mode='desktop';

function preferredMode(){
  const saved=localStorage.getItem(KEY);
  if(saved==='mobile'||saved==='desktop')return saved;
  return (window.matchMedia('(max-width: 760px)').matches || /iPhone|Android|Mobile|iPod/i.test(navigator.userAgent))?'mobile':'desktop';
}
function labelFor(nextMode){return nextMode==='mobile'?{icon:'▯',title:'Versione mobile',sub:'Ottimizza per telefono'}:{icon:'▣',title:'Versione PC',sub:'Torna al layout desktop'};}
function ensureButton(){
  let btn=document.getElementById('layoutModeToggle');
  if(btn)return btn;
  btn=document.createElement('button');
  btn.id='layoutModeToggle';btn.type='button';btn.className='layout-mode-toggle';btn.setAttribute('aria-live','polite');
  btn.addEventListener('click',()=>setMode(mode==='mobile'?'desktop':'mobile',true));
  document.body.appendChild(btn);return btn;
}
function updateButton(){
  const btn=ensureButton();const next=mode==='mobile'?'desktop':'mobile';const copy=labelFor(next);
  btn.innerHTML='<span class="layout-mode-icon" aria-hidden="true">'+copy.icon+'</span><span class="layout-mode-copy"><b>'+copy.title+'</b><small>'+copy.sub+'</small></span>';
  btn.setAttribute('aria-label',copy.title+'. '+copy.sub);
  btn.setAttribute('aria-pressed',mode==='mobile'?'true':'false');
}
function normalizeOpenPanels(){
  if(mode!=='mobile')return;
  const moves=document.getElementById('gameMovesDropdown');if(moves)moves.open=true;
  const info=document.getElementById('infoMovesDropdown');if(info)info.open=false;
  const movement=document.getElementById('playerMovementDropdown');if(movement)movement.open=false;
}
function setMode(next,persist){
  mode=next==='mobile'?'mobile':'desktop';
  document.documentElement.dataset.layoutMode=mode;
  document.body.classList.toggle('mobile-layout',mode==='mobile');
  document.body.classList.toggle('desktop-layout',mode==='desktop');
  if(persist)localStorage.setItem(KEY,mode);
  updateButton();normalizeOpenPanels();
  window.dispatchEvent(new CustomEvent('jjk-layout-changed',{detail:{mode}}));
  setTimeout(()=>window.dispatchEvent(new Event('resize')),80);
}
function init(){ensureButton();setMode(preferredMode(),false);}
window.JJKLayout={setMobile:()=>setMode('mobile',true),setDesktop:()=>setMode('desktop',true),toggle:()=>setMode(mode==='mobile'?'desktop':'mobile',true),getMode:()=>mode,clearPreference:()=>localStorage.removeItem(KEY)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
