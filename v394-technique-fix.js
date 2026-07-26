/* JJK Energy V39.4 - exact technique button binding */
(function(root){
'use strict';
if(root.__JJK_V394_TECHNIQUE_FIX__)return;
root.__JJK_V394_TECHNIQUE_FIX__=true;

/* These flags are set before the older modules load, so their global
   capture-phase click replay systems are never installed. */
document.documentElement.dataset.v392Events='1';
document.documentElement.dataset.v365Capture='1';
root.__JJK_V393_INSTALLED__=true;

const VERSION='39.4.1';
const RANK={G4:0,G3:1,G2:2,G1:3,SS:4,SG:5};
function read(name,fallback=null){try{const value=(0,eval)(name);return value===undefined?fallback:value;}catch(_){return root[name]===undefined?fallback:root[name];}}
function getfn(name){const value=read(name,root[name]);return typeof value==='function'?value:null;}
function setfn(name,value){root[name]=value;root.__v394fn=value;try{(0,eval)(name+'=globalThis.__v394fn');}catch(_){}delete root.__v394fn;}
function current(){return read('current',null);}
function currentId(){return read('currentId',null);}
function grade(){return read('gradeId','G4');}
function availableTechniques(){
  const character=current();if(!character)return [];
  const available=getfn('techniqueIsAvailable');
  return (character.techniques||[]).filter(technique=>{
    try{return available?!!available(technique):(RANK[technique.grade]??0)<=(RANK[grade()]??0);}
    catch(_){return true;}
  });
}
function bindButtons(){
  const grid=document.getElementById('techGrid');if(!grid||!current())return;
  const techniques=availableTechniques();
  const cards=[...grid.querySelectorAll(':scope > .tech-card')];
  cards.forEach((card,index)=>{
    const technique=techniques[index];
    const button=card.querySelector('.use-btn');
    if(!technique||!button)return;
    const key=String(technique.key);
    card.dataset.techKey=key;
    button.dataset.techKey=key;
    button.type='button';
    button.setAttribute('aria-label','Usa '+technique.name);
    button.onclick=function techniqueClick(event){
      event.preventDefault();
      event.stopPropagation();
      const activeCharacter=current();
      const exact=activeCharacter?.techniques?.find(item=>String(item.key)===key);
      if(!exact){getfn('showModal')?.('Tecnica non disponibile','',key+' non appartiene più al personaggio aperto.');return;}
      return getfn('useTechnique')?.(key);
    };
  });
  root.JJKV394TechniqueMap={
    version:VERSION,
    character:currentId(),
    keys:cards.map(card=>card.querySelector('.use-btn')?.dataset.techKey||null),
    ok:cards.every(card=>!!card.querySelector('.use-btn')?.dataset.techKey)
  };
}
function patchRenderer(){
  const active=getfn('renderTechniques');
  if(!active||active.__v394ExactButtons)return;
  const original=active;
  const wrapped=function(){
    const result=original.apply(this,arguments);
    bindButtons();
    return result;
  };
  wrapped.__v394ExactButtons=true;
  wrapped.__v393=true;
  wrapped.__v392=true;
  wrapped.__v37=true;
  setfn('renderTechniques',wrapped);
}
function observeGrid(){
  const grid=document.getElementById('techGrid');
  if(!grid||grid.dataset.v394Observed==='1')return;
  grid.dataset.v394Observed='1';
  const observer=new MutationObserver(()=>{
    clearTimeout(observer._timer);
    observer._timer=setTimeout(bindButtons,0);
  });
  observer.observe(grid,{childList:true,subtree:true});
}
function bind(){patchRenderer();observeGrid();bindButtons();}
function start(){
  bind();
  setTimeout(bind,100);
  setTimeout(bind,500);
  setTimeout(bind,1400);
  setInterval(()=>{patchRenderer();observeGrid();},2000);
  console.info('JJK Energy exact technique binding ready',VERSION);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
root.JJKV394={version:VERSION,rebind:bindButtons,audit:()=>root.JJKV394TechniqueMap};
})(typeof window!=='undefined'?window:globalThis);
