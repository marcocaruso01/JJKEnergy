/* JJK Energy V39.3 - stable resource bars and exact technique targeting */
(function(root){
'use strict';
if(root.__JJK_V393_INSTALLED__)return;
root.__JJK_V393_INSTALLED__=true;
const VERSION='39.3.0';
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,' ').trim().toLowerCase();
function read(name,fallback=null){try{const value=(0,eval)(name);return value===undefined?fallback:value;}catch(_){return root[name]===undefined?fallback:root[name];}}
function getfn(name){const value=read(name,root[name]);return typeof value==='function'?value:null;}
function setfn(name,value){root[name]=value;root.__v393fn=value;try{(0,eval)(name+'=globalThis.__v393fn');}catch(_){}delete root.__v393fn;}
function current(){return read('current',null);}
function cid(){return read('currentId',null);}
function grade(){return read('gradeId','G4');}
function techniqueAvailable(t){const fn=getfn('techniqueIsAvailable');if(fn){try{return !!fn(t);}catch(_){}}
  const rank={G4:0,G3:1,G2:2,G1:3,SS:4,SG:5};return (rank[t?.grade]??0)<=(rank[grade()]??0);
}
function patchIdempotentDomWrites(){
  if(root.__JJK_V393_DOM_PATCHED__)return;
  root.__JJK_V393_DOM_PATCHED__=true;
  const textDescriptor=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');
  if(textDescriptor?.get&&textDescriptor?.set){
    Object.defineProperty(Node.prototype,'textContent',{configurable:textDescriptor.configurable,enumerable:textDescriptor.enumerable,get:textDescriptor.get,set:function(value){const next=value==null?'':String(value);let currentValue='';try{currentValue=textDescriptor.get.call(this);}catch(_){}if(currentValue===next)return;textDescriptor.set.call(this,value);}});
  }
  const htmlDescriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
  if(htmlDescriptor?.get&&htmlDescriptor?.set){
    Object.defineProperty(Element.prototype,'innerHTML',{configurable:htmlDescriptor.configurable,enumerable:htmlDescriptor.enumerable,get:htmlDescriptor.get,set:function(value){const next=value==null?'':String(value);let currentValue='';try{currentValue=htmlDescriptor.get.call(this);}catch(_){}if(currentValue===next)return;htmlDescriptor.set.call(this,value);}});
  }
}
function techniqueForCard(card){
  const ch=current();if(!ch)return null;
  const techniques=(ch.techniques||[]).filter(techniqueAvailable);
  const label=normalize(card.querySelector('.tech-name')?.textContent);
  if(!label)return null;
  if(cid()==='yuta'&&label.startsWith('copia '))return techniques.find(t=>t.yutaCopy)||null;
  let match=techniques.find(t=>normalize(t.name)===label);
  if(match)return match;
  match=techniques.find(t=>label.endsWith(normalize(t.name))||normalize(t.name).endsWith(label));
  if(match)return match;
  const image=(card.querySelector('img')?.getAttribute('src')||'').split('?')[0].split('/').pop();
  if(image){const imageMatches=techniques.filter(t=>(t.image||'').split('?')[0].split('/').pop()===image);if(imageMatches.length===1)return imageMatches[0];}
  return null;
}
function mapTechniqueCards(){
  const grid=document.getElementById('techGrid');if(!grid||!current())return;
  grid.querySelectorAll('.tech-card').forEach(card=>{
    const technique=techniqueForCard(card);if(!technique)return;
    if(card.dataset.techKey!==technique.key)card.dataset.techKey=technique.key;
    const button=card.querySelector('.use-btn');
    if(button&&button.dataset.v393TechKey!==technique.key){button.dataset.v393TechKey=technique.key;button.setAttribute('aria-label','Usa '+technique.name);}
  });
}
function patchRenderers(){
  const renderTechniques=getfn('renderTechniques');
  if(renderTechniques&&!renderTechniques.__v393){const old=renderTechniques;const wrapped=function(){const result=old.apply(this,arguments);mapTechniqueCards();requestAnimationFrame(mapTechniqueCards);return result;};wrapped.__v393=true;wrapped.__v392=true;setfn('renderTechniques',wrapped);}
  const renderAll=getfn('renderAll');
  if(renderAll&&!renderAll.__v393){const old=renderAll;const wrapped=function(){const result=old.apply(this,arguments);requestAnimationFrame(mapTechniqueCards);return result;};wrapped.__v393=true;setfn('renderAll',wrapped);}
  const openCharacter=getfn('openCharacter');
  if(openCharacter&&!openCharacter.__v393){const old=openCharacter;const wrapped=function(){const result=old.apply(this,arguments);requestAnimationFrame(mapTechniqueCards);setTimeout(mapTechniqueCards,80);return result;};wrapped.__v393=true;wrapped.__v392=true;setfn('openCharacter',wrapped);}
}
function installGridObserver(){
  const grid=document.getElementById('techGrid');if(!grid||grid.dataset.v393Observed==='1')return;
  grid.dataset.v393Observed='1';
  const observer=new MutationObserver(()=>{clearTimeout(observer._timer);observer._timer=setTimeout(mapTechniqueCards,0);});
  observer.observe(grid,{childList:true,subtree:true});
}
function stabilizeResourceBar(){
  if(document.getElementById('v393StableUi'))return;
  const style=document.createElement('style');style.id='v393StableUi';style.textContent=`
  .stats>div{min-width:0;contain:layout paint}.stat-number{font-variant-numeric:tabular-nums;min-height:2.35rem;line-height:2.35rem}.bar{contain:strict;transform:translateZ(0);overflow:hidden}.energy-fill,.exp-fill{transform:translateZ(0);transition:width .16s ease-out;will-change:width}#energyValue,#maxValue,#expValue,#expMaxValue{display:inline-block;min-width:1.35ch;text-align:center}
  `;document.head.appendChild(style);
}
function audit(){
  mapTechniqueCards();
  const cards=[...document.querySelectorAll('#techGrid .tech-card')];
  const mapped=cards.every(card=>!!card.dataset.techKey);
  const unique=cards.every(card=>{const technique=techniqueForCard(card);return !technique||card.dataset.techKey===technique.key;});
  const checks={version:VERSION,mapped,exactMapping:unique,idempotentDom:!!root.__JJK_V393_DOM_PATCHED__};checks.ok=mapped&&unique&&checks.idempotentDom;root.JJKV393Audit=checks;console.info('JJK V39.3 audit',checks);return checks;
}
function bind(){patchIdempotentDomWrites();stabilizeResourceBar();patchRenderers();installGridObserver();mapTechniqueCards();}
function install(){const start=()=>{bind();setTimeout(bind,60);setTimeout(()=>{bind();audit();},450);setInterval(()=>{patchRenderers();installGridObserver();mapTechniqueCards();},1500);};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();}
root.JJKV393={version:VERSION,mapTechniqueCards,audit};
install();
})(typeof window!=='undefined'?window:globalThis);
