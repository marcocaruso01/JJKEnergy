/* JJK 2.0 - isolated battle state container */
(function(root){
'use strict';
if(root.JJK2BattleState)return;

const VERSION='2.0.0-alpha.1';

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

function create(fighterA,fighterB){
  return freeze({
    version:VERSION,
    status:'active',
    turn:1,
    activeFighter:'A',
    fighters:{
      A:clone(fighterA),
      B:clone(fighterB)
    },
    history:[]
  });
}

function update(state,patch){
  return freeze({...clone(state),...clone(patch)});
}

function appendLog(state,event){
  const history=[...(state.history||[]),clone(event)];
  return update(state,{history});
}

function audit(){
  return Object.freeze({ok:true,version:VERSION,writesLegacy:false});
}

root.JJK2BattleState=Object.freeze({version:VERSION,create,update,appendLog,audit});
})(window);
