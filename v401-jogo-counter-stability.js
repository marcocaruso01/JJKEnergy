/* JJK Energy V40.1 - stable authoritative Jogo volcano/crater counter */
(function(root,factory){
  const api=factory(root||globalThis);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
'use strict';

const VERSION='40.1.0';
const RANK={G4:0,G3:1,G2:2,G1:3,SS:4,SG:5};
const MOVES_KEY='jjk_jogo_v37_volcano_moves';
const ERUPTION_KEY='jjk_jogo_v37_eruption_used';
const num=value=>Number.isFinite(Number(value))?Number(value):0;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,num(value)));

function read(name,fallback=null){
  try{const value=(0,eval)(name);return value===undefined?fallback:value;}
  catch(_){return root[name]===undefined?fallback:root[name];}
}
function write(name,value){
  root.__v401Value=value;
  try{(0,eval)(name+'=globalThis.__v401Value');}
  catch(_){try{root[name]=value;}catch(__){}}
  delete root.__v401Value;
}
function getfn(name){const value=read(name,root[name]);return typeof value==='function'?value:null;}
function setfn(name,value){
  root[name]=value;root.__v401Fn=value;
  try{(0,eval)(name+'=globalThis.__v401Fn');}catch(_){}
  delete root.__v401Fn;
}
function cid(){return read('currentId',null);}
function grade(){return read('gradeId','G4');}
function storageGet(key,fallback='0'){try{const value=localStorage.getItem(key);return value===null?fallback:value;}catch(_){return fallback;}}

const stable={initialized:false,volcanoes:0,craters:0,moves:0,eruption:false,grade:'G4',updatedAt:0};
let renderedSignature='';
let captureTimer=null;

function rawState(){
  return{
    volcanoes:clamp(read('jogoVolcanoes',0),0,3),
    craters:Math.max(0,num(read('jogoCraters',0))),
    moves:Math.max(0,num(storageGet(MOVES_KEY,'0'))),
    eruption:storageGet(ERUPTION_KEY,'0')==='1',
    grade:grade()
  };
}

function snapshotState(state){
  if(!state||state.characterId!=='jogo')return null;
  return{
    volcanoes:clamp(state.jogoVolcanoes,0,3),
    craters:Math.max(0,num(state.jogoCraters)),
    moves:Math.max(0,num(state.jogoVolcanoMovesUsed)),
    eruption:!!state.jogoEruptionUsed,
    grade:state.gradeId||grade(),
    updatedAt:Math.max(0,num(state.updatedAt))
  };
}

function accept(candidate,updatedAt=Date.now(),force=false){
  if(!candidate)return false;
  const stamp=Math.max(0,num(updatedAt));
  if(stable.initialized&&!force&&stamp<=stable.updatedAt)return false;
  stable.initialized=true;
  stable.volcanoes=clamp(candidate.volcanoes,0,3);
  stable.craters=Math.max(0,num(candidate.craters));
  stable.moves=Math.max(0,num(candidate.moves));
  stable.eruption=!!candidate.eruption;
  stable.grade=candidate.grade||grade();
  stable.updatedAt=stamp||Date.now();
  return true;
}

function ensureInitialized(){
  if(cid()!=='jogo')return false;
  if(!stable.initialized)accept(rawState(),Date.now(),true);
  return true;
}

function enforceGlobals(){
  if(!ensureInitialized())return;
  if(clamp(read('jogoVolcanoes',0),0,3)!==stable.volcanoes)write('jogoVolcanoes',stable.volcanoes);
  if(Math.max(0,num(read('jogoCraters',0)))!==stable.craters)write('jogoCraters',stable.craters);
}

function ensureStyle(){
  if(document.getElementById('v401JogoCounterStyle'))return;
  const style=document.createElement('style');
  style.id='v401JogoCounterStyle';
  style.textContent=`
    #v37JogoSummary{display:none!important}
    #v401JogoSummary{padding:11px 12px;border:1px solid rgba(255,148,78,.22);border-radius:13px;background:rgba(9,7,10,.62);color:#fff;line-height:1.35;overflow-anchor:none;contain:layout paint}
    #v401JogoSummary b{display:block;color:#ffd0aa;font-size:.92rem}
    #v401JogoSummary small{display:block;margin-top:4px;color:#b8aabf;font-size:.7rem}
  `;
  document.head.appendChild(style);
}

function ensureSummary(){
  const panel=document.getElementById('v37JogoPanel');
  if(!panel)return null;
  let summary=document.getElementById('v401JogoSummary');
  if(!summary){
    summary=document.createElement('div');
    summary.id='v401JogoSummary';
    const old=document.getElementById('v37JogoSummary');
    if(old?.parentElement===panel)panel.insertBefore(summary,old);
    else panel.prepend(summary);
  }
  return summary;
}

function renderStableCounter(force=false){
  ensureStyle();
  if(cid()!=='jogo'){renderedSignature='';return false;}
  ensureInitialized();
  enforceGlobals();
  const panel=document.getElementById('v37JogoPanel'),summary=ensureSummary();
  if(!panel||!summary)return false;
  const signature=[stable.volcanoes,stable.craters,stable.moves,stable.eruption,stable.grade].join('|');
  if(force||signature!==renderedSignature){
    summary.innerHTML='<b>'+stable.volcanoes+' Vulcani · '+stable.craters+' Crateri</b><small>Movimenti Vulcano nel turno: '+stable.moves+'/'+stable.volcanoes+' · Eruzione: '+(stable.eruption?'usata':'disponibile')+'</small>';
    renderedSignature=signature;
  }
  const sg=(RANK[stable.grade]??0)>=RANK.SG;
  const move=panel.querySelector('[data-v37-move-volcano]');if(move)move.disabled=!sg||stable.moves>=stable.volcanoes;
  const erupt=panel.querySelector('[data-v37-erupt-volcano]');if(erupt)erupt.disabled=!sg||stable.eruption||stable.volcanoes<1;
  const absorb=panel.querySelector('[data-v37-absorb-crater]');if(absorb)absorb.disabled=stable.craters<1;
  return true;
}

function captureLocalChange(){
  if(cid()!=='jogo')return;
  const candidate=rawState();
  if(candidate.volcanoes===stable.volcanoes&&candidate.craters===stable.craters&&candidate.moves===stable.moves&&candidate.eruption===stable.eruption){renderStableCounter(false);return;}
  accept(candidate,Date.now(),true);
  renderStableCounter(true);
}

function scheduleCapture(delay=0){
  clearTimeout(captureTimer);
  captureTimer=setTimeout(captureLocalChange,delay);
}

function preserveFlags(target,source){
  ['__v37','__v392','__v398','__v399','__v400Soul','__v400Counter'].forEach(flag=>{if(source?.[flag])target[flag]=true;});
  return target;
}

function wrapUseTechnique(){
  const active=getfn('useTechnique');
  if(!active||active.__v401Jogo)return;
  const wrapped=function(){
    const wasJogo=cid()==='jogo';
    const output=active.apply(this,arguments);
    if(wasJogo){captureLocalChange();scheduleCapture(40);}
    return output;
  };
  wrapped.__v401Jogo=true;preserveFlags(wrapped,active);setfn('useTechnique',wrapped);
}

function wrapSnapshot(){
  const active=getfn('applyRoomPlayerStateSnapshot');
  if(!active||active.__v401Jogo)return;
  const wrapped=function(state){
    const candidate=snapshotState(state);
    if(candidate)accept(candidate,candidate.updatedAt,false);
    const output=active.apply(this,arguments);
    if(candidate){enforceGlobals();renderStableCounter(true);}
    return output;
  };
  wrapped.__v401Jogo=true;preserveFlags(wrapped,active);setfn('applyRoomPlayerStateSnapshot',wrapped);
}

function wrapBuildState(){
  const active=getfn('buildLocalPlayerState');
  if(!active||active.__v401Jogo)return;
  const wrapped=function(){
    enforceGlobals();
    const state=active.apply(this,arguments);
    if(state?.characterId==='jogo'&&stable.initialized){
      state.jogoVolcanoes=stable.volcanoes;
      state.jogoCraters=stable.craters;
      state.jogoVolcanoMovesUsed=stable.moves;
      state.jogoEruptionUsed=stable.eruption;
      state.updatedAt=Math.max(num(state.updatedAt),stable.updatedAt);
    }
    return state;
  };
  wrapped.__v401Jogo=true;preserveFlags(wrapped,active);setfn('buildLocalPlayerState',wrapped);
}

function wrapOpenCharacter(){
  const active=getfn('openCharacter');
  if(!active||active.__v401Jogo)return;
  const wrapped=function(id){
    const output=active.apply(this,arguments);
    if(id==='jogo'){
      stable.initialized=false;renderedSignature='';
      setTimeout(()=>{ensureInitialized();renderStableCounter(true);},0);
    }
    return output;
  };
  wrapped.__v401Jogo=true;preserveFlags(wrapped,active);setfn('openCharacter',wrapped);
}

function installEvents(){
  if(document.documentElement.dataset.v401JogoEvents==='1')return;
  document.documentElement.dataset.v401JogoEvents='1';
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-v37-absorb-crater],[data-v37-move-volcano],[data-v37-erupt-volcano],.use-btn'))scheduleCapture(30);
  });
}

function bind(){
  ensureStyle();wrapUseTechnique();wrapSnapshot();wrapBuildState();wrapOpenCharacter();installEvents();renderStableCounter(false);
}
function audit(){
  const checks={version:VERSION,separateSummary:!!document.getElementById('v401JogoSummary')||cid()!=='jogo',stableState:typeof stable.volcanoes==='number'&&typeof stable.craters==='number'};
  checks.ok=Object.entries(checks).filter(([key])=>!['version','ok'].includes(key)).every(([,value])=>value===true);
  root.JJKV401Audit=checks;return checks;
}
function install(){
  if(root.__JJK_V401_INSTALLED__)return;root.__JJK_V401_INSTALLED__=true;
  const wait=attempt=>{
    if(!root.__JJK_V400_INSTALLED__&&attempt<100){setTimeout(()=>wait(attempt+1),50);return;}
    bind();setTimeout(bind,200);setTimeout(()=>{bind();audit();},900);
    setInterval(()=>{wrapUseTechnique();wrapSnapshot();wrapBuildState();wrapOpenCharacter();renderStableCounter(false);},500);
    console.info('JJK Energy stable Jogo counter ready',VERSION);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>wait(0),{once:true});else wait(0);
}

return{version:VERSION,install,audit,renderStableCounter};
});
