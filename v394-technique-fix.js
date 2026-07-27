/* JJK Energy V39.7 - exact technique identity, never positional */
(function(root){
'use strict';
if(root.__JJK_V395_TECHNIQUE_FIX__)return;
root.__JJK_V395_TECHNIQUE_FIX__=true;
root.__JJK_V397_TECHNIQUE_FIX__=true;

/* Prevent the older capture/replay systems from being installed. */
document.documentElement.dataset.v392Events='1';
document.documentElement.dataset.v365Capture='1';
root.__JJK_V393_INSTALLED__=true;

const VERSION='39.7.1';
function read(name,fallback=null){try{const value=(0,eval)(name);return value===undefined?fallback:value;}catch(_){return root[name]===undefined?fallback:root[name];}}
function getfn(name){const value=read(name,root[name]);return typeof value==='function'?value:null;}
function setfn(name,value){root[name]=value;root.__v397fn=value;try{(0,eval)(name+'=globalThis.__v397fn');}catch(_){}delete root.__v397fn;}
function current(){return read('current',null);}
function currentId(){return read('currentId',null);}
function normalize(value){return String(value||'').replace(/\s+/g,' ').trim();}
function isUtilityCard(card){
  const label=normalize(card?.querySelector('.tech-name')?.textContent).toLowerCase();
  return !!card&&(card.classList.contains('v25-body-card')||card.classList.contains('v397-utility-card')||label==='corpo'||card.dataset.utilityCard==='1');
}

function ensureUtilityStyle(){
  if(document.getElementById('v397UtilityCardStyle'))return;
  const style=document.createElement('style');
  style.id='v397UtilityCardStyle';
  style.textContent=`
    #techGrid>.v397-utility-card{position:relative;overflow:hidden;border:1px solid rgba(255,205,96,.46);border-radius:18px;background:linear-gradient(145deg,rgba(66,48,12,.92),rgba(13,10,17,.98));min-height:510px}
    #techGrid>.v397-utility-card>img{position:absolute;inset:48px 8px 82px;width:calc(100% - 16px);height:calc(100% - 130px);object-fit:contain;object-position:center top;background:#050308;border-radius:12px;filter:saturate(.7) brightness(.72)}
    #techGrid>.v397-utility-card>.tech-content{position:absolute;z-index:3;left:0;right:0;bottom:0;min-height:82px;padding:11px;background:linear-gradient(transparent,#050308 28%)}
    #techGrid>.v397-utility-card .tech-name{font-size:.86rem;line-height:1.12;font-weight:950;text-transform:uppercase}
    #techGrid>.v397-utility-card .tech-cost{font-size:.76rem;color:#ddd;margin:3px 0 6px}
    #techGrid>.v397-utility-card .use-btn{width:100%;padding:8px;border:0;border-radius:14px;background:linear-gradient(135deg,#916b18,#4e3509);color:#fff;font-weight:900;cursor:pointer}
    @media(max-width:1080px){#techGrid>.v397-utility-card{min-height:490px}}
    @media(max-width:620px){#techGrid>.v397-utility-card{min-height:560px}}
  `;
  document.head.appendChild(style);
}

function techniqueForCard(card){
  const character=current();
  if(!card||!character||isUtilityCard(card))return null;
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

function clearStaleIdentity(card,button){
  if(card)delete card.dataset.techKey;
  if(button)delete button.dataset.techKey;
}

function isolateUtilityCard(card,button){
  ensureUtilityStyle();
  clearStaleIdentity(card,button);
  card.dataset.utilityCard='1';
  card.classList.remove('tech-card');
  card.classList.add('v397-utility-card');
}

function bindButtons(){
  const grid=document.getElementById('techGrid');
  const character=current();
  if(!grid||!character)return;
  ensureUtilityStyle();
  const audit=[];

  [...grid.querySelectorAll(':scope > .tech-card,:scope > .v397-utility-card')].forEach(card=>{
    const button=card.querySelector('.use-btn');
    if(isUtilityCard(card)){
      isolateUtilityCard(card,button);
      return;
    }

    const technique=techniqueForCard(card);
    if(!button||!technique){
      clearStaleIdentity(card,button);
      audit.push({label:normalize(card.querySelector('.tech-name')?.textContent),key:null,ok:false});
      return;
    }

    const key=String(technique.key);
    delete card.dataset.utilityCard;
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
  if(!active||active.__v397ExactIdentity)return;
  const original=active;
  const wrapped=function(){
    const result=original.apply(this,arguments);
    bindButtons();
    /* Outer legacy decorators run after this wrapper; repair identity once they finish. */
    if(typeof queueMicrotask==='function')queueMicrotask(bindButtons);
    setTimeout(bindButtons,0);
    return result;
  };
  wrapped.__v397ExactIdentity=true;
  wrapped.__v395ExactIdentity=true;
  wrapped.__v394ExactButtons=true;
  wrapped.__v393=true;
  wrapped.__v392=true;
  wrapped.__v37=true;
  setfn('renderTechniques',wrapped);
}

function observeGrid(){
  const grid=document.getElementById('techGrid');
  if(!grid||grid.dataset.v397Observed==='1')return;
  grid.dataset.v397Observed='1';
  grid.dataset.v395Observed='1';
  const observer=new MutationObserver(()=>{
    clearTimeout(observer._timer);
    observer._timer=setTimeout(bindButtons,0);
  });
  observer.observe(grid,{childList:true,subtree:true,attributes:true,attributeFilter:['data-tech-key','class']});
}

function bind(){patchRenderer();observeGrid();bindButtons();}
function start(){
  bind();
  setTimeout(bind,100);
  setTimeout(bind,500);
  setTimeout(bind,1400);
  setInterval(()=>{patchRenderer();observeGrid();bindButtons();},1000);
  console.info('JJK Energy exact technique identity ready',VERSION);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
root.JJKV394={version:VERSION,rebind:bindButtons,audit:()=>root.JJKV395TechniqueMap};
root.JJKV395={version:VERSION,rebind:bindButtons,audit:()=>root.JJKV395TechniqueMap};
root.JJKV397={version:VERSION,rebind:bindButtons,audit:()=>root.JJKV395TechniqueMap};
})(typeof window!=='undefined'?window:globalThis);
