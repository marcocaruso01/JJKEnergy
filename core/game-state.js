/* JJK 2.0 - game state foundation (compatibility layer) */
(function(root){
'use strict';
if(root.JJK2GameState)return;

const VERSION='2.0.0-alpha.1';
let state=Object.freeze({version:VERSION,source:'empty',updatedAt:0,characterId:null,resources:{},special:{}});
const listeners=new Set();

function clone(value){
  if(value===null||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(clone);
  const out={};Object.keys(value).forEach(k=>out[k]=clone(value[k]));return out;
}
function freeze(value){
  if(value&&typeof value==='object'){
    Object.keys(value).forEach(k=>freeze(value[k]));
    Object.freeze(value);
  }
  return value;
}
function notify(){listeners.forEach(fn=>{try{fn(state);}catch(_){}});}
function set(next){
  state=freeze(clone({...state,...next,updatedAt:Date.now()}));
  notify();
  return state;
}
function syncFromLegacy(){
  const currentId=root.currentId||null;
  if(!currentId)return state;
  return set({
    source:'V40.4 legacy bridge',
    characterId:currentId,
    gradeId:root.gradeId||null,
    exp:Number(root.exp)||0,
    resources:{
      life:Number(root.life)||0,
      energy:Number(root.energy)||0,
      combatBonus:Number(root.combatBonus)||0
    },
    special:{
      tokens:Number(root.tokens)||0,
      jogoHeat:Number(root.jogoHeat)||0,
      tojiCollectedEnergy:Number(root.tojiCollectedEnergy)||0,
      itadoriFingers:Number(root.itadoriFingers)||0
    }
  });
}
function get(){return state;}
function subscribe(fn){if(typeof fn==='function'){listeners.add(fn);return ()=>listeners.delete(fn);}return ()=>{};}
function audit(){return {version:VERSION,ok:!!state,characterId:state.characterId,updatedAt:state.updatedAt};}

root.JJK2GameState=Object.freeze({version:VERSION,get,set,syncFromLegacy,subscribe,audit});
})(window);
