/* JJK Energy V39.7 - runtime safety guards */
(function(root){
'use strict';
if(root.__JJK_V397_RUNTIME_GUARDS__)return;
root.__JJK_V397_RUNTIME_GUARDS__=true;
const VERSION='39.7.0';

function read(name,fallback=null){try{const value=(0,eval)(name);return value===undefined?fallback:value;}catch(_){return root[name]===undefined?fallback:root[name];}}
function getfn(name){const value=read(name,root[name]);return typeof value==='function'?value:null;}
function setfn(name,value){root[name]=value;root.__v397guard=value;try{(0,eval)(name+'=globalThis.__v397guard');}catch(_){}delete root.__v397guard;}
function hasCharacter(){return !!(read('currentId',null)&&read('current',null));}

function guardCharacterRenderer(name){
  const active=getfn(name);
  if(!active||active.__v397CharacterGuard)return;
  const guarded=function(){
    if(!hasCharacter())return;
    return active.apply(this,arguments);
  };
  guarded.__v397CharacterGuard=true;
  guarded.__v397Original=active;
  setfn(name,guarded);
}

function install(){
  ['renderHeader','renderGrades','renderTechniques','renderAll','updateBars'].forEach(guardCharacterRenderer);
  root.JJKV397Runtime={version:VERSION,hasCharacter};
}

function start(){
  install();
  setTimeout(install,80);
  setTimeout(install,350);
  setTimeout(install,1200);
  setInterval(install,2200);
  console.info('JJK Energy runtime guards ready',VERSION);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(typeof window!=='undefined'?window:globalThis);
