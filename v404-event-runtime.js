/* JJK Energy V40.4 - event-driven runtime coordinator */
(function(root){
'use strict';
if(root.__JJK_V404_INSTALLED__)return;
root.__JJK_V404_INSTALLED__=true;

const VERSION='40.4.0';
const nativeSetInterval=root.setInterval.bind(root);
const nativeClearInterval=root.clearInterval.bind(root);
const nativeSetTimeout=root.setTimeout.bind(root);
const nativeRequestAnimationFrame=(root.requestAnimationFrame||function(callback){return nativeSetTimeout(callback,16);}).bind(root);
const NativeMutationObserver=root.MutationObserver;
const MOBILE=!!(root.matchMedia&&root.matchMedia('(max-width:900px)').matches);
const blocked=new Map();
const blockedObservers=[];
const wrappers=new Map();
let virtualId=-400400;
let scheduled=false;
let pendingKinds=new Set();
let flushing=false;
let flushCount=0;
let lastFlushAt=0;

const HEAVY_FILES=new Set([
  'v362-rules-hotfix.js','v365-late-technique-ui.js','v37-update.js','v372-gm-controls-audit.js',
  'v391-stable.js','v392-gameplay.js','v393-stability.js','v394-technique-fix.js',
  'v396-jogo-ui-cleanup.js','v397-runtime-guards.js','v398-itadori-variable-rules.js',
  'v399-itadori-ui-progression.js','v400-counter-domain-fixes.js','v401-jogo-counter-stability.js',
  'v403-performance-android.js','gameplay-v25.js','events-v26.js','events-v26-2.js','events-v26-fix.js'
]);

function callbackText(callback){
  try{return Function.prototype.toString.call(callback);}catch(_){return String(callback||'');}
}
function stackText(){try{return String(new Error().stack||'');}catch(_){return '';}}
function stackHasFile(stack,file){return stack.includes('/'+file+':')||stack.includes('/'+file+'?')||stack.includes(file+':')||stack.includes(file+'?');}
function sourceFile(stack){
  for(const file of HEAVY_FILES)if(stackHasFile(stack,file))return file;
  if(stackHasFile(stack,'index.html'))return'index.html';
  if(stackHasFile(stack,'supabase-multiplayer.js'))return'supabase-multiplayer.js';
  if(stackHasFile(stack,'supabase-statistics.js'))return'supabase-statistics.js';
  if(stackHasFile(stack,'enhancements.js'))return'enhancements.js';
  if(stackHasFile(stack,'cinematic-v14.js'))return'cinematic-v14.js';
  if(stackHasFile(stack,'gm-ai.js'))return'gm-ai.js';
  if(stackHasFile(stack,'v20.js'))return'v20.js';
  if(stackHasFile(stack,'v36-update.js'))return'v36-update.js';
  return'';
}
function classifyLegacyInterval(callback,delay,stack){
  const file=sourceFile(stack),source=callbackText(callback),ms=Number(delay)||0;
  if(file==='index.html'&&ms<=1100&&/renderGMDashboard/.test(source)&&!/updateGMClock/.test(source))return'gm';
  if(file==='gameplay-v25.js'&&/renderGMDashboard/.test(source))return'gm';
  if(/^events-v26/.test(file)&&/render|updatePassTurn/.test(source))return'events';
  if(file==='v37-update.js'){
    if(/bindAll|watchTurn|updatePanels/.test(source))return'state';
    if(/renderSheets/.test(source))return'remote';
  }
  if(file==='v36-update.js'){
    if(/renderOtherSheets|refreshSpectator/.test(source))return'remote';
    if(/updateOtherSheetsButton|injectJogoQuickControls|syncLocalTojiMonster|changeCombatBonus|v36-body-lock-note|permanentBodyLocked/.test(source))return'state';
  }
  if(file==='v362-rules-hotfix.js'&&/fixTojiLocal|updateYutaNote/.test(source))return'state';
  if(file==='v365-late-technique-ui.js')return'rebind';
  if(file==='v372-gm-controls-audit.js'&&/refresh|render/.test(source))return'gm';
  if(file==='v391-stable.js')return'rebind';
  if(file==='v392-gameplay.js')return'state';
  if(file==='v393-stability.js')return'rebind';
  if(file==='v394-technique-fix.js')return'rebind';
  if(file==='v396-jogo-ui-cleanup.js')return'state';
  if(file==='v397-runtime-guards.js')return'rebind';
  if(file==='v398-itadori-variable-rules.js')return'state';
  if(file==='v399-itadori-ui-progression.js')return'state';
  if(file==='v400-counter-domain-fixes.js')return'state';
  if(file==='v401-jogo-counter-stability.js')return'state';
  if(file==='v403-performance-android.js')return'rebind';
  return'';
}
function activeScreen(){return document.querySelector('.screen.active')?.id||'';}
function guardedNativeInterval(callback,delay,args,stack){
  const source=callbackText(callback),file=sourceFile(stack),ms=Number(delay)||0;
  let adjusted=ms;
  if(file==='supabase-multiplayer.js'&&/refreshRoom\(false\)/.test(source)&&ms<=5000)adjusted=15000;
  return nativeSetInterval(function(){
    if(document.hidden&&['index.html','cinematic-v14.js','gm-ai.js','v20.js','enhancements.js'].includes(file))return;
    if(/rotateHomeCast/.test(source)&&activeScreen()!=='home')return;
    if(/updateGMClock/.test(source)&&activeScreen()!=='gameMaster')return;
    return typeof callback==='function'?callback.apply(root,args):root.eval(String(callback));
  },adjusted);
}

root.setInterval=function(callback,delay){
  const args=Array.prototype.slice.call(arguments,2),stack=stackText();
  if(typeof callback!=='function')return nativeSetInterval.apply(root,arguments);
  const kind=classifyLegacyInterval(callback,delay,stack);
  if(kind){
    const id=virtualId--;
    blocked.set(id,{id,kind,callback,args,file:sourceFile(stack),delay:Number(delay)||0,registeredAt:Date.now(),runs:0});
    schedule(kind,'legacy-register');
    return id;
  }
  return guardedNativeInterval(callback,delay,args,stack);
};
root.clearInterval=function(id){
  if(blocked.delete(id))return;
  return nativeClearInterval(id);
};
if(typeof NativeMutationObserver==='function'){
  root.MutationObserver=function(callback){
    const stack=stackText(),file=sourceFile(stack),source=callbackText(callback);
    const suppress=file==='v392-gameplay.js'||(MOBILE&&file==='v14-cinematic.js'&&/records|v14-value-pop|cloud-kpi-value|gm-summary-value/.test(source));
    if(suppress){
      blockedObservers.push({file,source:source.slice(0,220),registeredAt:Date.now()});
      schedule(file==='v392-gameplay.js'?'state':'screen','observer-register');
      return{observe(){},disconnect(){},takeRecords(){return[];}};
    }
    return new NativeMutationObserver(callback);
  };
  root.MutationObserver.prototype=NativeMutationObserver.prototype;
}

function kindMatches(entry,kinds){
  return kinds.has('all')||kinds.has(entry.kind)||
    (kinds.has('state')&&(entry.kind==='events'||entry.kind==='rebind'))||
    (kinds.has('remote')&&(entry.kind==='state'||entry.kind==='events'||entry.kind==='gm'||entry.kind==='rebind'))||
    (kinds.has('screen')&&(entry.kind==='state'||entry.kind==='rebind'||entry.kind==='gm'||entry.kind==='events'));
}
function flush(){
  scheduled=false;
  if(flushing)return;
  const kinds=new Set(pendingKinds);pendingKinds.clear();
  if(!kinds.size)return;
  flushing=true;flushCount+=1;lastFlushAt=Date.now();
  try{
    blocked.forEach(entry=>{
      if(!kindMatches(entry,kinds))return;
      try{entry.callback.apply(root,entry.args);entry.runs+=1;}catch(error){console.warn('V40.4 refresh callback',entry.file,error);}
    });
    if(kinds.has('all')||kinds.has('screen')||kinds.has('rebind')||kinds.has('state')||kinds.has('remote')){
      try{root.JJKV395?.rebind?.();}catch(_){}
      try{root.JJKV396?.clean?.(true);}catch(_){}
    }
    if(kinds.has('all')||kinds.has('state')||kinds.has('remote')||kinds.has('screen')){
      try{root.JJKV400?.stabilizeItadoriCounter?.();}catch(_){}
      try{root.JJKV400?.updateJogoCounter?.(false);}catch(_){}
      try{root.JJKV402?.render?.(false);}catch(_){}
    }
  }finally{flushing=false;}
}
function schedule(kind='state',reason=''){
  if(flushing)return;
  pendingKinds.add(kind||'state');
  if(scheduled)return;
  scheduled=true;
  nativeRequestAnimationFrame(flush);
  try{root.dispatchEvent(new CustomEvent('jjk:runtime-scheduled',{detail:{kind,reason}}));}catch(_){}
}

function assignGlobal(name,value){
  root[name]=value;root.__v404Function=value;
  try{(0,eval)(name+'=globalThis.__v404Function');}catch(_){}
  delete root.__v404Function;
}
function copyFlags(target,source){
  try{Object.keys(source||{}).forEach(key=>{if(key.startsWith('__'))target[key]=source[key];});}catch(_){}
  return target;
}
function wrapFunction(name,kind){
  const active=root[name]||functionFromEval(name);
  if(typeof active!=='function'||active.__v404EventRuntime)return false;
  const wrapped=function(){
    const result=active.apply(this,arguments);
    const finish=()=>schedule(kind, name);
    if(result&&typeof result.then==='function')result.then(finish,finish);else finish();
    return result;
  };
  wrapped.__v404EventRuntime=true;wrapped.__v404Original=active;copyFlags(wrapped,active);
  assignGlobal(name,wrapped);wrappers.set(name,wrapped);return true;
}
function functionFromEval(name){try{const value=(0,eval)(name);return typeof value==='function'?value:null;}catch(_){return null;}}
function installWrappers(){
  const stateNames=['saveState','renderAll','renderHeader','updateBars','renderTechniques','useTechnique','newCombat','syncGrade','changeLife','gainEnergy','fullEnergy','gainExp','changeCombatBonus','changeTokens','changeJogoHeat','changeTojiVigor','fullTojiVigor','changeGetoOneUse','changeTojiCollectedEnergy','changeItadoriFingers','changeYutaCopiedResource'];
  const remoteNames=['applyRoomPlayerStateSnapshot','refreshRoom','sendLocalPlayerState','gmAdjustPlayer','gmApplyGroup','gmSetGroupLock','playerPassTurn','gmGiveTurn','gmTogglePlayerLock','gmToggleEye','gmToggleSelfManage','gmToggleEnergyDiscount','gmToggleBossRush'];
  const screenNames=['openCharacter','showScreen','openGMDashboard','renderRoomUI','renderRoomDraftSelection'];
  stateNames.forEach(name=>wrapFunction(name,'state'));
  remoteNames.forEach(name=>wrapFunction(name,'remote'));
  screenNames.forEach(name=>wrapFunction(name,'screen'));
}
function actionKind(target){
  if(target.closest?.('[data-gm-action],[data-v24-delta],[data-v24-op],[data-v24-exact],[data-v24-zero]'))return'remote';
  if(target.closest?.('.use-btn,.gain,.full,.exp-btn,.life-btn,.combat-reset,.grade-btn,[data-v37-absorb-crater],[data-v37-move-volcano],[data-v37-erupt-volcano],[data-v392-monster],[data-v392-sukuna],[data-v392-stolen],[data-v392-correct],[data-v402-absorb],[data-v402-move],[data-v402-erupt]'))return'state';
  if(target.closest?.('[data-v24-tab],.gm-tab,.back,.home-action,.character-card,.info-character-card,.room-draft-card'))return'screen';
  return'';
}
function installEvents(){
  if(document.documentElement.dataset.v404Events==='1')return;
  document.documentElement.dataset.v404Events='1';
  document.addEventListener('click',event=>{const kind=actionKind(event.target);if(kind)nativeSetTimeout(()=>schedule(kind,'click'),0);},true);
  document.addEventListener('change',event=>{if(event.target.matches?.('input,select'))schedule(event.target.closest('#mobileV24GMDrawer,.gm-player-card')?'remote':'state','change');},true);
  document.addEventListener('input',event=>{if(event.target.matches?.('input[type="number"]')){clearTimeout(event.target.__v404Timer);event.target.__v404Timer=nativeSetTimeout(()=>schedule(event.target.closest('#mobileV24GMDrawer,.gm-player-card')?'remote':'state','input'),180);}},true);
  document.addEventListener('jjk:cloudstats',()=>schedule('state','cloudstats'));
  document.addEventListener('jjk:layout-changed',()=>schedule('screen','layout'));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){installWrappers();schedule('all','visible');}});
  root.addEventListener('online',()=>schedule('remote','online'),{passive:true});
  root.addEventListener('focus',()=>{installWrappers();schedule('remote','focus');},{passive:true});
  root.addEventListener('pageshow',()=>{installWrappers();schedule('all','pageshow');},{passive:true});
  root.addEventListener('jjk:runtime-refresh',event=>schedule(event.detail?.kind||'all','custom'));
}
function audit(){
  const groups={};blocked.forEach(entry=>{groups[entry.kind]=(groups[entry.kind]||0)+1;});
  const checks={version:VERSION,installed:true,events:document.documentElement.dataset.v404Events==='1',blockedIntervals:blocked.size,blockedObservers:blockedObservers.length,groups,flushCount,lastFlushAt,wrappedFunctions:wrappers.size};
  checks.ok=checks.events&&checks.wrappedFunctions>0;
  root.JJKV404Audit=checks;return checks;
}
function settle(){installWrappers();schedule('all','settle');}
function start(){
  installEvents();
  settle();
  [80,250,700,1600,3200].forEach(delay=>nativeSetTimeout(settle,delay));
  nativeSetTimeout(()=>{audit();console.info('JJK Energy event-driven runtime ready',VERSION,audit());},3600);
}

root.JJKV404={version:VERSION,refresh:schedule,audit,get blocked(){return [...blocked.values()].map(entry=>({kind:entry.kind,file:entry.file,delay:entry.delay,runs:entry.runs}));},get blockedObservers(){return blockedObservers.slice();}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(typeof window!=='undefined'?window:globalThis);
