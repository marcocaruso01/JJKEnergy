/* JJK Energy V39.5 - exact technique identity, never positional */
(function(root){
'use strict';
if(root.__JJK_V395_TECHNIQUE_FIX__)return;
root.__JJK_V395_TECHNIQUE_FIX__=true;

/* Prevent the older capture/replay systems from being installed. */
document.documentElement.dataset.v392Events='1';
document.documentElement.dataset.v365Capture='1';
root.__JJK_V393_INSTALLED__=true;

const VERSION='39.5.0';
function read(name,fallback=null){try{const value=(0,eval)(name);return value===undefined?fallback:value;}catch(_){return root[name]===undefined?fallback:root[name];}}
function getfn(name){const value=read(name,root[name]);return typeof value==='function'?value:null;}
function setfn(name,value){root[name]=value;root.__v395fn=value;try{(0,eval)(name+'=globalThis.__v395fn');}catch(_){}delete root.__v395fn;}
function current(){return read('current',null);}
function currentId(){return read('currentId',null);}
function normalize(value){return String(value||'').replace(/\s+/g,' ').trim();}

function techniqueForCard(card){
  const character=current();
  if(!card||!character)return null;
  const label=normalize(card.querySelector('.tech-name')?.textContent);
  const techniques=Array.isArray(character.techniques)?character.techniques:[];

  /* Yuta shows the copied technique name, but the real button key remains "copia". */
  if(currentId()==='yuta'&&label.toLowerCase().startsWith('copia:')){
    return techniques.find(item=>item.yutaCopy||item.key==='copia')||null;
  }

  /* The card title is generated directly from technique.name: use that stable identity. */
  let exact=techniques.find(item=>normalize(item.name)===label);
  if(exact)return exact;

  /* Defensive fallback for labels that visually omit the "(Dominio)" prefix. */
  const withoutDomain=label.replace(/^\(dominio\)\s*/i,'');
  exact=techniques.find(item=>normalize(item.name).replace(/^\(dominio\)\s*/i,'')===withoutDomain);
  if(exact)return exact;

  /* Last fallback: match the card image only when it identifies exactly one technique. */
  const src=(card.querySelector('img')?.getAttribute('src')||'').split('?')[0];
  if(src){
    const matches=techniques.filter(item=>String(item.image||'').split('?')[0]===src);
    if(matches.length===1)return matches[0];
  }
  return null;
}

function bindButtons(){
  const grid=document.getElementById('techGrid');
  const character=current();
  if(!grid||!character)return;
  const audit=[];

  [...grid.querySelectorAll(':scope > .tech-card')].forEach(card=>{
    const button=card.querySelector('.use-btn');
    const technique=techniqueForCard(card);
    if(!button||!technique){
      audit.push({label:normalize(card.querySelector('.tech-name')?.textContent),key:null,ok:false});
      return;
    }

    const key=String(technique.key);
    card.dataset.techKey=key;
    button.dataset.techKey=key;
    button.type='button';
    button.setAttribute('aria-label','Usa '+technique.name);
    button.onclick=function exactTechniqueClick(event){
      event.preventDefault();
      event.stopPropagation();
      const active=current();
      const selected=active?.techniques?.find(item=>String(item.key)===key);
      if(!selected){
        getfn('showModal')?.('Tecnica non disponibile','',key+' non appartiene al personaggio aperto.');
        return;
      }
      return getfn('useTechnique')?.(key);
    };
    audit.push({label:normalize(card.querySelector('.tech-name')?.textContent),key,ok:true});
  });

  root.JJKV395TechniqueMap={
    version:VERSION,
    character:currentId(),
    cards:audit,
    ok:audit.length>0&&audit.every(item=>item.ok)
  };
}

function patchRenderer(){
  const active=getfn('renderTechniques');
  if(!active||active.__v395ExactIdentity)return;
  const original=active;
  const wrapped=function(){
    const result=original.apply(this,arguments);
    bindButtons();
    /* Outer legacy decorators run after this wrapper; repair identity once they finish. */
    if(typeof queueMicrotask==='function')queueMicrotask(bindButtons);
    setTimeout(bindButtons,0);
    return result;
  };
  wrapped.__v395ExactIdentity=true;
  wrapped.__v394ExactButtons=true;
  wrapped.__v393=true;
  wrapped.__v392=true;
  wrapped.__v37=true;
  setfn('renderTechniques',wrapped);
}

function observeGrid(){
  const grid=document.getElementById('techGrid');
  if(!grid||grid.dataset.v395Observed==='1')return;
  grid.dataset.v395Observed='1';
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
  console.info('JJK Energy exact technique identity ready',VERSION);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
root.JJKV394={version:VERSION,rebind:bindButtons,audit:()=>root.JJKV395TechniqueMap};
root.JJKV395={version:VERSION,rebind:bindButtons,audit:()=>root.JJKV395TechniqueMap};
})(typeof window!=='undefined'?window:globalThis);
