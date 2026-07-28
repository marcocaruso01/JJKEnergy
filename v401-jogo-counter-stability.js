/* JJK Energy V40.2 - single authoritative Jogo volcano/crater state */
(function(root,factory){
  const api=factory(root||globalThis);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.JJKV401=api;root.JJKV402=api;}
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
'use strict';

const VERSION='40.2.0';
const RANK={G4:0,G3:1,G2:2,G1:3,SS:4,SG:5};
const MOVES_KEY='jjk_jogo_v37_volcano_moves';
const ERUPTION_KEY='jjk_jogo_v37_eruption_used';
const num=value=>Number.isFinite(Number(value))?Number(value):0;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,num(value)));

function read(name,fallback=null){try{const value=(0,eval)(name);return value===undefined?fallback:value;}catch(_){return root[name]===undefined?fallback:root[name];}}
function write(name,value){root.__v402Value=value;try{(0,eval)(name+'=globalThis.__v402Value');}catch(_){try{root[name]=value;}catch(__){}}delete root.__v402Value;}
function getfn(name){const value=read(name,root[name]);return typeof value==='function'?value:null;}
function setfn(name,value){root[name]=value;root.__v402Fn=value;try{(0,eval)(name+'=globalThis.__v402Fn');}catch(_){}delete root.__v402Fn;}
function cid(){return read('currentId',null);}
function grade(){return read('gradeId','G4');}
function used(){const value=read('used',[]);return Array.isArray(value)?value:[];}
function roomAllowed(){const fn=getfn('roomActionAllowed');try{return fn?!!fn():true;}catch(_){return true;}}
function storageGet(key,fallback='0'){try{const value=localStorage.getItem(key);return value===null?fallback:value;}catch(_){return fallback;}}
function storageSet(key,value){try{localStorage.setItem(key,String(value));}catch(_){} }
function log(title,text){try{getfn('addLog')?.(title,text);}catch(_){} }

const state={initialized:false,scope:'',volcanoes:0,craters:0,moves:0,eruption:false,grade:'G4',updatedAt:0};
let signature='';
let lastLocked=null;

function scopeId(){
  const room=read('roomSession',root.roomSession||null);
  let me=null;try{me=getfn('getLocalRoomPlayer')?.()||null;}catch(_){}
  return String(room?.code||'local')+'|'+String(me?.playerToken||'player');
}
function snapshot(candidate){
  if(!candidate||candidate.characterId!=='jogo')return null;
  return{volcanoes:clamp(candidate.jogoVolcanoes,0,3),craters:Math.max(0,num(candidate.jogoCraters)),moves:Math.max(0,num(candidate.jogoVolcanoMovesUsed)),eruption:!!candidate.jogoEruptionUsed,grade:candidate.gradeId||grade(),updatedAt:Math.max(0,num(candidate.updatedAt))};
}
function rawState(){return{volcanoes:clamp(read('jogoVolcanoes',0),0,3),craters:Math.max(0,num(read('jogoCraters',0))),moves:Math.max(0,num(storageGet(MOVES_KEY,'0'))),eruption:storageGet(ERUPTION_KEY,'0')==='1',grade:grade(),updatedAt:0};}
function roomState(){try{const me=getfn('getLocalRoomPlayer')?.();return me?.characterId==='jogo'?snapshot(me.state):null;}catch(_){return null;}}
function assign(candidate,stamp=Date.now(),force=false){
  if(!candidate)return false;
  const next=Math.max(0,num(stamp));
  if(state.initialized&&!force&&next<=state.updatedAt)return false;
  state.initialized=true;state.scope=scopeId();state.volcanoes=clamp(candidate.volcanoes,0,3);state.craters=Math.max(0,num(candidate.craters));state.moves=Math.max(0,num(candidate.moves));state.eruption=!!candidate.eruption;state.grade=candidate.grade||grade();state.updatedAt=Math.max(next,Date.now(),state.updatedAt+1);
  return true;
}
function initialize(force=false){
  if(cid()!=='jogo')return false;
  const scope=scopeId();
  if(!force&&state.initialized&&state.scope===scope)return true;
  const candidate=roomState()||rawState();
  assign(candidate,candidate.updatedAt||Date.now(),true);syncGlobals();return true;
}
function syncGlobals(){
  if(!state.initialized||cid()!=='jogo')return;
  if(clamp(read('jogoVolcanoes',0),0,3)!==state.volcanoes)write('jogoVolcanoes',state.volcanoes);
  if(Math.max(0,num(read('jogoCraters',0)))!==state.craters)write('jogoCraters',state.craters);
  storageSet(MOVES_KEY,state.moves);storageSet(ERUPTION_KEY,state.eruption?'1':'0');
}
function commit(patch){
  initialize(false);
  assign({volcanoes:patch.volcanoes??state.volcanoes,craters:patch.craters??state.craters,moves:patch.moves??state.moves,eruption:patch.eruption??state.eruption,grade:patch.grade??grade()},Date.now(),true);
  syncGlobals();render(true);
}
function saveAndRender(){try{getfn('saveState')?.();}catch(_){}try{getfn('renderAll')?.();}catch(_){}render(true);}

function ensureStyle(){
  if(document.getElementById('v402JogoStyle'))return;
  const style=document.createElement('style');style.id='v402JogoStyle';style.textContent=`
    #v37JogoPanel,#v392JogoPanel,#v401JogoSummary{display:none!important}
    #jogoPanel.show #v37JogoPanel,#jogoPanel.show #v392JogoPanel,#jogoPanel.show #v401JogoSummary{display:none!important}
    #jogoPanel.show #v402JogoPanel{display:block!important}
    #v402JogoPanel{display:none;margin:12px 0 0;padding:14px;border:1px solid rgba(255,132,58,.48);border-radius:18px;background:linear-gradient(145deg,rgba(35,16,9,.98),rgba(10,8,11,.98))}
    #v402JogoPanel .v402-title{margin:0 0 8px;color:#ffad68;font-size:.82rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
    #v402JogoSummary{padding:11px 12px;border:1px solid rgba(255,148,78,.22);border-radius:13px;background:rgba(9,7,10,.62);color:#fff;line-height:1.35;overflow-anchor:none;contain:layout paint}
    #v402JogoSummary b{display:block;color:#ffd0aa;font-size:.92rem}#v402JogoSummary small{display:block;margin-top:4px;color:#b8aabf;font-size:.7rem}
    #v402JogoPanel .v402-actions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:10px}
    #v402JogoPanel .v402-actions button{min-height:44px;width:100%;padding:10px 12px;border:1px solid rgba(255,145,71,.52);border-radius:12px;background:linear-gradient(135deg,#9d3f13,#4f1c08);color:#fff;font-size:.78rem;font-weight:900}
    #v402JogoPanel .v402-actions button:disabled{display:none!important}
  `;document.head.appendChild(style);
}
function ensurePanel(){
  const host=document.getElementById('jogoPanel');if(!host)return null;
  let panel=document.getElementById('v402JogoPanel');if(panel)return panel;
  panel=document.createElement('section');panel.id='v402JogoPanel';
  panel.innerHTML='<div class="v402-title">Controllo Vulcani e Crateri</div><div id="v402JogoSummary"><b><span data-v402-volcanoes>0</span> Vulcani · <span data-v402-craters>0</span> Crateri</b><small>Movimenti Vulcano nel turno: <span data-v402-moves>0</span>/<span data-v402-max>0</span> · Eruzione: <span data-v402-eruption>disponibile</span></small></div><div class="v402-actions"><button type="button" data-v402-absorb>Assorbi Cratere · +10 EM</button><button type="button" data-v402-move>Muovi 1 Vulcano · max 4</button><button type="button" data-v402-erupt>Fai eruttare 1 Vulcano · crea Cratere</button></div>';
  host.appendChild(panel);
  panel.querySelector('[data-v402-absorb]').addEventListener('click',absorbCrater);
  panel.querySelector('[data-v402-move]').addEventListener('click',moveVolcano);
  panel.querySelector('[data-v402-erupt]').addEventListener('click',eruptVolcano);
  return panel;
}
function setText(node,value){const next=String(value);if(node&&node.textContent!==next)node.textContent=next;}
function render(force=false){
  ensureStyle();if(cid()!=='jogo'){signature='';return false;}initialize(false);syncGlobals();
  const panel=ensurePanel();if(!panel)return false;
  const next=[state.volcanoes,state.craters,state.moves,state.eruption,state.grade].join('|');
  if(force||next!==signature){setText(panel.querySelector('[data-v402-volcanoes]'),state.volcanoes);setText(panel.querySelector('[data-v402-craters]'),state.craters);setText(panel.querySelector('[data-v402-moves]'),state.moves);setText(panel.querySelector('[data-v402-max]'),state.volcanoes);setText(panel.querySelector('[data-v402-eruption]'),state.eruption?'usata':'disponibile');signature=next;}
  const sg=(RANK[state.grade]??0)>=RANK.SG;
  const absorb=panel.querySelector('[data-v402-absorb]');if(absorb)absorb.disabled=state.craters<1;
  const move=panel.querySelector('[data-v402-move]');if(move)move.disabled=!sg||state.moves>=state.volcanoes;
  const erupt=panel.querySelector('[data-v402-erupt]');if(erupt)erupt.disabled=!sg||state.eruption||state.volcanoes<1;
  return true;
}
function absorbCrater(){if(cid()!=='jogo'||!roomAllowed())return;initialize(false);if(state.craters<1)return;const before=Math.max(0,num(read('energy',0)));write('energy',before+10);commit({craters:state.craters-1});log('Cratere assorbito','Energia '+before+' → '+(before+10)+'. La casella torna attiva.');saveAndRender();}
function moveVolcano(){if(cid()!=='jogo'||!roomAllowed())return;initialize(false);if((RANK[grade()]??0)<RANK.SG||state.moves>=state.volcanoes)return;commit({moves:state.moves+1,grade:grade()});log('Vulcano spostato','Un Vulcano è stato mosso fino a 4 caselle. '+state.moves+'/'+state.volcanoes+' Vulcani mossi in questo turno.');saveAndRender();}
function eruptVolcano(){if(cid()!=='jogo'||!roomAllowed())return;initialize(false);if((RANK[grade()]??0)<RANK.SG||state.eruption||state.volcanoes<1)return;commit({volcanoes:state.volcanoes-1,craters:state.craters+1,eruption:true,grade:grade()});log('Eruzione vulcanica','1 Vulcano consumato e trasformato in Cratere.');saveAndRender();}

function preserveFlags(target,source){['__v37','__v392','__v398','__v399','__v400Soul','__v400Counter','__v401Jogo'].forEach(flag=>{if(source?.[flag])target[flag]=true;});return target;}
function wrapUseTechnique(){
  const active=getfn('useTechnique');if(!active||active.__v402Jogo)return;
  const wrapped=function(key){
    if(cid()!=='jogo')return active.apply(this,arguments);
    initialize(false);const beforeUsed=used().slice(),beforeV=state.volcanoes,beforeC=state.craters;const output=active.apply(this,arguments);let done=false;
    const reconcile=()=>{if(done)return;const after=used(),success=!beforeUsed.includes(String(key))&&after.includes(String(key));if(!success){syncGlobals();render(false);return;}done=true;if(String(key)==='vulcani')commit({volcanoes:Math.min(3,beforeV+1),grade:grade()});else if(String(key)==='bara_ferro')commit({craters:beforeC+1,grade:grade()});else{syncGlobals();render(false);}try{getfn('saveState')?.();}catch(_){}};
    reconcile();setTimeout(reconcile,0);return output;
  };
  wrapped.__v402Jogo=true;preserveFlags(wrapped,active);setfn('useTechnique',wrapped);
}
function wrapSnapshot(){
  const active=getfn('applyRoomPlayerStateSnapshot');if(!active||active.__v402Jogo)return;
  const wrapped=function(candidate){const incoming=snapshot(candidate);const output=active.apply(this,arguments);if(incoming){if(!state.initialized||incoming.updatedAt>state.updatedAt)assign(incoming,incoming.updatedAt,false);syncGlobals();render(true);}return output;};
  wrapped.__v402Jogo=true;preserveFlags(wrapped,active);setfn('applyRoomPlayerStateSnapshot',wrapped);
}
function wrapBuildState(){
  const active=getfn('buildLocalPlayerState');if(!active||active.__v402Jogo)return;
  const wrapped=function(){if(cid()==='jogo')initialize(false);const output=active.apply(this,arguments);if(output?.characterId==='jogo'&&state.initialized){output.jogoVolcanoes=state.volcanoes;output.jogoCraters=state.craters;output.jogoVolcanoMovesUsed=state.moves;output.jogoEruptionUsed=state.eruption;output.updatedAt=Math.max(num(output.updatedAt),state.updatedAt);}return output;};
  wrapped.__v402Jogo=true;preserveFlags(wrapped,active);setfn('buildLocalPlayerState',wrapped);
}
function wrapOpenCharacter(){
  const active=getfn('openCharacter');if(!active||active.__v402Jogo)return;
  const wrapped=function(id){const output=active.apply(this,arguments);if(id==='jogo')setTimeout(()=>{initialize(state.scope!==scopeId());syncGlobals();render(true);},0);return output;};
  wrapped.__v402Jogo=true;preserveFlags(wrapped,active);setfn('openCharacter',wrapped);
}
function watchTurn(){
  if(cid()!=='jogo'){lastLocked=null;return;}
  let me=null;try{me=getfn('getLocalRoomPlayer')?.()||null;}catch(_){}
  if(!me){lastLocked=null;return;}const locked=!!me.locked;
  if(lastLocked===true&&locked===false){initialize(false);commit({moves:0,eruption:false,grade:grade()});saveAndRender();}
  lastLocked=locked;
}
function bind(){ensureStyle();wrapUseTechnique();wrapSnapshot();wrapBuildState();wrapOpenCharacter();if(cid()==='jogo'){initialize(false);syncGlobals();render(false);}}
function audit(){const checks={version:VERSION,singlePanel:!!document.getElementById('v402JogoPanel')||cid()!=='jogo',canonicalState:Number.isFinite(state.volcanoes)&&Number.isFinite(state.craters)};checks.ok=Object.entries(checks).filter(([key])=>!['version','ok'].includes(key)).every(([,value])=>value===true);root.JJKV401Audit=checks;root.JJKV402Audit=checks;return checks;}
function install(){
  if(root.__JJK_V402_INSTALLED__)return;root.__JJK_V401_INSTALLED__=true;root.__JJK_V402_INSTALLED__=true;
  const wait=attempt=>{if(!root.__JJK_V400_INSTALLED__&&attempt<100){setTimeout(()=>wait(attempt+1),50);return;}bind();setTimeout(bind,200);setTimeout(()=>{bind();audit();},900);setInterval(()=>{bind();watchTurn();if(cid()==='jogo'){syncGlobals();render(false);}},250);console.info('JJK Energy single Jogo state ready',VERSION);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>wait(0),{once:true});else wait(0);
}

return{version:VERSION,install,audit,render,state};
});
