/* JJK 2.0 - legacy bridge lifecycle */
(function(root){
'use strict';
if(root.JJK2LegacyBridge)return;

const VERSION='2.0.0-alpha.2';
let installed=false;

function sync(reason='manual'){
  try{
    return root.JJK2GameState?.syncFromLegacy?.(reason)||null;
  }catch(_){return null;}
}

function install(){
  if(installed)return;
  installed=true;
  if(!document.documentElement.dataset.jjk2Bridge){
    document.documentElement.dataset.jjk2Bridge='1';
  }
  ['jjk:runtime-scheduled','jjk:runtime-refresh'].forEach(event=>{
    root.addEventListener(event,()=>sync(event));
  });
  root.addEventListener('jjk2:catalog-ready',()=>sync('catalog-ready'));
  root.addEventListener('jjk2:state-changed',event=>{
    try{root.dispatchEvent(new CustomEvent('jjk2:legacy-state-observed',{detail:event.detail}));}catch(_){ }
  });
}

function audit(){
  return Object.freeze({
    version:VERSION,
    installed,
    gameState:!!root.JJK2GameState,
    catalog:!!root.JJK2CharacterCatalog,
    writeThrough:false
  });
}

root.JJK2LegacyBridge=Object.freeze({version:VERSION,sync,install,audit});
install();
})(window);
