/* JJK Energy V40.3 - queue rapid player resource taps */
(function(root){
'use strict';
if(root.__JJK_V403_PLAYER_QUEUE__)return;
root.__JJK_V403_PLAYER_QUEUE__=true;

const VERSION='40.3.0';
const ANDROID=/Android/i.test(root.navigator?.userAgent||'');
const ALLOWED=new Set([
  'gainEnergy','gainExp','changeLife','changeCombatBonus','changeJogoHeat','changeTojiVigor',
  'changeGetoOneUse','changeTojiCollectedEnergy','changeTokens','changeItadoriFingers','changeYutaCopiedResource'
]);
const pending=new Map();
let chain=Promise.resolve();

function parse(button){
  const raw=button?.getAttribute('onclick')||'';
  const match=raw.match(/^\s*([A-Za-z_$][\w$]*)\s*\(\s*(-?\d+)\s*\)\s*;?\s*$/);
  if(!match||!ALLOWED.has(match[1]))return null;
  return{name:match[1],delta:Number(match[2])};
}
function flush(name){
  const item=pending.get(name);if(!item)return;
  pending.delete(name);clearTimeout(item.timer);
  const delta=item.delta;
  if(!delta)return;
  chain=chain.then(()=>{
    const fn=root[name];
    if(typeof fn==='function')fn(delta);
  }).catch(error=>console.warn('V40.3 resource queue',error));
}
function enqueue(name,delta){
  delta=Math.trunc(Number(delta)||0);if(!ALLOWED.has(name)||!delta)return false;
  const item=pending.get(name)||{delta:0,timer:null};
  item.delta+=delta;clearTimeout(item.timer);
  item.timer=setTimeout(()=>flush(name),ANDROID?125:85);
  pending.set(name,item);return true;
}
function onClick(event){
  const button=event.target.closest('button[onclick]');
  const action=parse(button);if(!action)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  enqueue(action.name,action.delta);
}
function install(){
  document.addEventListener('click',onClick,true);
  root.JJKV403PlayerQueue={version:VERSION,enqueue,get pendingCount(){return pending.size;}};
  console.info('JJK Energy player resource queue ready',VERSION);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(typeof window!=='undefined'?window:globalThis);
