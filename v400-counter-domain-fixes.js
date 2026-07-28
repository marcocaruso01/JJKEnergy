/* JJK Energy V40.0 - stable Itadori counter, full Soul Domain cost, live Jogo counters */
(function(root,factory){
  const api=factory(root||globalThis);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
'use strict';

const VERSION='40.0.0';
const RANK={G4:0,G3:1,G2:2,G1:3,SS:4,SG:5};
const JOGO_MOVES_KEY='jjk_jogo_v37_volcano_moves';
const JOGO_ERUPTION_KEY='jjk_jogo_v37_eruption_used';
const num=value=>Number.isFinite(Number(value))?Number(value):0;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,num(value)));

function resolveSoulDomain(slash,dice,availableEnergy,effectiveCost=null,free=false){
  const slashRoll=clamp(Math.trunc(num(slash)),1,24);
  const normal=(Array.isArray(dice)?dice:[]).slice(0,2).map(value=>clamp(Math.trunc(num(value)),1,6));
  while(normal.length<2)normal.push(1);
  const totalRoll=slashRoll+normal[0]+normal[1];
  const available=Math.max(0,num(availableEnergy));
  const cost=effectiveCost===null?totalRoll:Math.max(0,num(effectiveCost));
  if(free)return{slash:slashRoll,dice:normal,totalRoll,available,effectiveCost:cost,paid:0,body:totalRoll,missing:0};
  const paid=Math.min(available,cost);
  const body=Math.min(totalRoll,available);
  return{slash:slashRoll,dice:normal,totalRoll,available,effectiveCost:cost,paid,body,missing:Math.max(0,totalRoll-body)};
}

function read(name,fallback=null){
  try{const value=(0,eval)(name);return value===undefined?fallback:value;}
  catch(_){return root[name]===undefined?fallback:root[name];}
}
function write(name,value){
  root.__v400Value=value;
  try{(0,eval)(name+'=globalThis.__v400Value');}
  catch(_){try{root[name]=value;}catch(__){}}
  delete root.__v400Value;
}
function getfn(name){const value=read(name,root[name]);return typeof value==='function'?value:null;}
function setfn(name,value){
  root[name]=value;root.__v400Fn=value;
  try{(0,eval)(name+'=globalThis.__v400Fn');}catch(_){}
  delete root.__v400Fn;
}
function cid(){return read('currentId',null);}
function current(){return read('current',null);}
function grade(){return read('gradeId','G4');}
function used(){const value=read('used',[]);return Array.isArray(value)?value:[];}
function roomAllowed(){const fn=getfn('roomActionAllowed');try{return fn?!!fn():true;}catch(_){return true;}}
function bossFree(){const fn=getfn('isBossRushFree');try{return fn?!!fn():false;}catch(_){return false;}}
function baseBody(){return num(getfn('effectiveBaseBody')?.()??current()?.baseBody);}
function combatBonus(){return num(read('combatBonus',0));}
function discountedCost(value){const fn=getfn('mcDiscountCost');try{return Math.max(0,num(fn?fn(cid(),value):value));}catch(_){return Math.max(0,num(value));}}
function show(title,value,text){try{getfn('showModal')?.(title,value,text);}catch(_){} }
function log(title,text){try{getfn('addLog')?.(title,text);}catch(_){} }
function saveRender(){try{getfn('saveState')?.();}catch(_){}try{getfn('renderAll')?.();}catch(_){} }
function play(technique){try{getfn('playTechniqueEffect')?.(technique);}catch(_){} }
function storageGet(key,fallback='0'){try{const value=localStorage.getItem(key);return value===null?fallback:value;}catch(_){return fallback;}}

function chooseSoulDice(){
  const raw=root.prompt('Inserisci dado Taglio di Sukuna, dado normale, dado normale (esempio 16,5,3):');
  if(raw===null)return null;
  const values=raw.split(/[^0-9]+/).filter(Boolean).map(Number);
  if(values.length!==3||!Number.isInteger(values[0])||values[0]<1||values[0]>24||values.slice(1).some(value=>!Number.isInteger(value)||value<1||value>6)){
    show('Dadi non validi','','Inserisci un risultato da 1 a 24 per il dado Taglio e due risultati da 1 a 6.');
    return null;
  }
  return{slash:values[0],dice:values.slice(1)};
}

function finishSoul(technique,copyCard,before,resolved,total,text){
  if(copyCard){
    try{getfn('markYutaCopyUsed')?.(copyCard,technique,resolved.paid);}catch(_){}
    log('Copia: '+technique.name,'Energia '+before+' → '+num(read('energy',0))+'. '+text);
    saveRender();play(technique);show('Copia: '+technique.name,total+' Combattimento',text);
    return;
  }
  const list=used();if(!list.includes(technique.key))list.push(technique.key);write('used',list);
  try{getfn('recordTechniqueUse')?.(cid(),technique,resolved.paid);}catch(_){}
  log('Tecnica utilizzata',technique.name+': Energia '+before+' → '+num(read('energy',0))+'. '+text);
  saveRender();play(technique);show(technique.name,total+' Combattimento',text);
}

function useSoulDomain(technique,copyCard=null){
  const result=chooseSoulDice();if(!result)return;
  const before=Math.max(0,num(read('energy',0)));
  const rawTotal=result.slash+result.dice[0]+result.dice[1];
  const effective=discountedCost(rawTotal);
  const resolved=resolveSoulDomain(result.slash,result.dice,before,effective,bossFree());
  if(!bossFree())write('energy',before-resolved.paid);
  const total=baseBody()+resolved.body+combatBonus();
  const text='Dado Taglio '+resolved.slash+' + dadi normali '+resolved.dice.join(' + ')+' = '+resolved.totalRoll+'. Costo totale '+resolved.effectiveCost+', EM pagata '+resolved.paid+'. Corpo complessivo dei dadi '+resolved.body+(resolved.missing?' (−'+resolved.missing+' perché l’EM disponibile era '+before+')':'')+'. Totale '+baseBody()+' + '+resolved.body+' + bonus '+combatBonus()+' = '+total+'.';
  finishSoul(technique,copyCard,before,resolved,total,text);
}

function preserveFlags(target,source){
  ['__v37','__v392','__v398','__v399','__v394ExactButtons','__v395ExactIdentity'].forEach(flag=>{if(source?.[flag])target[flag]=true;});
  return target;
}

function patchTechniques(){
  const active=getfn('useTechnique');
  if(active&&!active.__v400Soul){
    const original=active;
    const wrapped=function(key){
      const technique=current()?.techniques?.find(item=>String(item.key)===String(key));
      if(cid()==='itadori'&&technique?.key==='richiamo_anima_sukuna'){
        if(!roomAllowed()||used().includes(technique.key))return;
        return useSoulDomain(technique);
      }
      const output=original.apply(this,arguments);scheduleJogoCounter();return output;
    };
    wrapped.__v400Soul=true;preserveFlags(wrapped,active);setfn('useTechnique',wrapped);
  }

  const copied=getfn('executeYutaCopiedTechnique');
  if(copied&&!copied.__v400Soul){
    const original=copied;
    const wrapped=function(card){
      const source=getfn('getYutaCopiedSource')?.(),technique=source?.t;
      if(technique?.key==='richiamo_anima_sukuna'||technique?.v392Soul||technique?.v37ItadoriSoulDomain)return useSoulDomain(technique,card);
      return original.apply(this,arguments);
    };
    wrapped.__v400Soul=true;preserveFlags(wrapped,copied);setfn('executeYutaCopiedTechnique',wrapped);
  }
}

function ensureStyle(){
  if(document.getElementById('v400CounterStyle'))return;
  const style=document.createElement('style');style.id='v400CounterStyle';style.textContent=`
    body.theme-itadori #itadoriFingerPanel{overflow-anchor:none!important}
    body.theme-itadori #itadoriFingerPanel > #v37ItadoriPanel,
    body.theme-itadori #itadoriFingerPanel > #v27ItadoriChoices{display:none!important}
    body.theme-itadori #v392ItadoriPanel{overflow-anchor:none!important;contain:layout paint}
    body.theme-itadori #v392ItadoriPanel [data-v392-fingers],
    body.theme-itadori #v392ItadoriPanel [data-v392-monsters]{min-height:2.5em;display:grid;place-items:center}
  `;document.head.appendChild(style);
}

function stabilizeItadoriCounter(){
  ensureStyle();
  if(cid()!=='itadori')return;
  const old=document.getElementById('v37ItadoriPanel');
  if(old){old.hidden=true;old.setAttribute('aria-hidden','true');old.style.setProperty('display','none','important');}
  const choices=document.getElementById('v27ItadoriChoices');
  if(choices){choices.hidden=true;choices.setAttribute('aria-hidden','true');}
}

function jogoState(){
  return{
    volcanoes:clamp(read('jogoVolcanoes',0),0,3),
    craters:Math.max(0,num(read('jogoCraters',0))),
    moves:Math.max(0,num(storageGet(JOGO_MOVES_KEY,'0'))),
    eruption:storageGet(JOGO_ERUPTION_KEY,'0')==='1',
    grade:grade()
  };
}

let lastJogoSignature='';
function updateJogoCounter(force=false){
  if(cid()!=='jogo'){lastJogoSignature='';return false;}
  const panel=document.getElementById('v37JogoPanel'),summary=document.getElementById('v37JogoSummary');
  if(!panel||!summary)return false;
  const state=jogoState();
  const title=state.volcanoes+' Vulcani · '+state.craters+' Crateri';
  const subtitle='Movimenti Vulcano nel turno: '+state.moves+'/'+state.volcanoes+' · Eruzione: '+(state.eruption?'usata':'disponibile');
  const signature=[state.volcanoes,state.craters,state.moves,state.eruption,state.grade].join('|');
  const actualTitle=summary.querySelector('b')?.textContent||'';
  const actualSubtitle=summary.querySelector('small')?.textContent||'';
  if(force||signature!==lastJogoSignature||actualTitle!==title||actualSubtitle!==subtitle){
    summary.innerHTML='<b>'+title+'</b><small style="display:block;margin-top:4px;color:#b8aabf">'+subtitle+'</small>';
    const sg=(RANK[state.grade]??0)>=RANK.SG;
    const move=panel.querySelector('[data-v37-move-volcano]');if(move)move.disabled=!sg||state.moves>=state.volcanoes;
    const erupt=panel.querySelector('[data-v37-erupt-volcano]');if(erupt)erupt.disabled=!sg||state.eruption||state.volcanoes<1;
    const absorb=panel.querySelector('[data-v37-absorb-crater]');if(absorb)absorb.disabled=state.craters<1;
    const hidden=document.getElementById('v392JogoPanel');
    if(hidden){
      const volcanoNode=hidden.querySelector('[data-v392-volcanoes]');if(volcanoNode)volcanoNode.textContent=state.volcanoes+' / 3';
      const craterNode=hidden.querySelector('[data-v392-craters]');if(craterNode)craterNode.textContent=String(state.craters);
      const domainNode=hidden.querySelector('[data-v392-domain]');if(domainNode)domainNode.textContent='+'+Math.min(3,state.volcanoes)+' / +3';
    }
    lastJogoSignature=signature;
    return true;
  }
  return false;
}

let jogoTimer=null;
function scheduleJogoCounter(){
  clearTimeout(jogoTimer);jogoTimer=setTimeout(()=>updateJogoCounter(false),0);
}

function wrapAfter(name){
  const active=getfn(name);if(!active||active.__v400Counter)return;
  const wrapped=function(){const output=active.apply(this,arguments);stabilizeItadoriCounter();scheduleJogoCounter();return output;};
  wrapped.__v400Counter=true;preserveFlags(wrapped,active);setfn(name,wrapped);
}

function patchRefreshHooks(){
  ['renderAll','applyRoomPlayerStateSnapshot','openCharacter'].forEach(wrapAfter);
  if(document.documentElement.dataset.v400CounterEvents!=='1'){
    document.documentElement.dataset.v400CounterEvents='1';
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-v37-absorb-crater],[data-v37-move-volcano],[data-v37-erupt-volcano],.use-btn'))setTimeout(()=>updateJogoCounter(true),20);
    });
  }
}

function audit(){
  const sample=resolveSoulDomain(16,[5,3],30,24,false);
  const capped=resolveSoulDomain(16,[5,3],20,24,false);
  const checks={
    version:VERSION,
    fullDomainCost:sample.totalRoll===24&&sample.paid===24&&sample.body===24,
    insufficientEnergyCap:capped.paid===20&&capped.body===20&&capped.missing===4,
    oldItadoriPanelSuppressed:!!document.getElementById('v400CounterStyle'),
    jogoCounterFunction:typeof updateJogoCounter==='function'
  };
  checks.ok=Object.entries(checks).filter(([key])=>!['version','ok'].includes(key)).every(([,value])=>value===true);
  root.JJKV400Audit=checks;return checks;
}

function bind(){ensureStyle();patchTechniques();patchRefreshHooks();stabilizeItadoriCounter();updateJogoCounter(false);}
function install(){
  if(root.__JJK_V400_INSTALLED__)return;root.__JJK_V400_INSTALLED__=true;
  const wait=attempt=>{
    if((!root.__JJK_V398_INSTALLED__||!root.__JJK_V399_INSTALLED__||!root.__JJK_V396_JOGO_UI__)&&attempt<100){setTimeout(()=>wait(attempt+1),50);return;}
    bind();setTimeout(bind,200);setTimeout(()=>{bind();audit();},900);
    setInterval(()=>{patchTechniques();patchRefreshHooks();stabilizeItadoriCounter();updateJogoCounter(false);},250);
    console.info('JJK Energy V40 counter/domain fixes ready',VERSION);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>wait(0),{once:true});else wait(0);
}

return{version:VERSION,resolveSoulDomain,updateJogoCounter,stabilizeItadoriCounter,install,audit};
});
