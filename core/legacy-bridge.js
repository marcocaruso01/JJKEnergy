/* JJK 2.0 - legacy bridge */
(function(root){
'use strict';
if(root.JJK2LegacyBridge)return;

const VERSION='2.0.0-alpha.1';
function sync(reason='manual'){
  try{
    const state=root.JJK2GameState?.syncFromLegacy?.();
    root.dispatchEvent(new CustomEvent('jjk2:legacy-sync',{detail:{reason,state}}));
    return state;
  }catch(_){return null;}
}
function install(){
  if(document.documentElement.dataset.jjk2Bridge==='1')return;
  document.documentElement.dataset.jjk2Bridge='1';
  ['jjk:runtime-scheduled','jjk:runtime-refresh'].forEach(event=>{
    root.addEventListener(event,()=>sync(event));
  });
  root.addEventListener('jjk2:catalog-ready',()=>sync('catalog-ready'));
}
root.JJK2LegacyBridge=Object.freeze({version:VERSION,sync,install});
install();
})(window);
