/* JJK Energy V40.8 - semantic game state facade */
(function(root){
'use strict';
if(root.__JJK_GAME_STATE_V408__)return;
root.__JJK_GAME_STATE_V408__=true;

const VERSION='40.8.0';
const bridge=root.JJKLegacyBridge;
if(!bridge)throw new Error('JJK Game State requires JJKLegacyBridge');

const CONTEXT_FIELDS=new Set(['currentId','current']);
const MUTABLE_FIELDS=Object.freeze(bridge.fields.filter(name=>!CONTEXT_FIELDS.has(name)));
const MUTABLE_SET=new Set(MUTABLE_FIELDS);
const ROOM_FIELDS=Object.freeze([
  'characterId','gradeId','energy','exp','life','maxLife','tokens','combatBonus','jogoLife','jogoHeat',
  'getoOneUse','tojiCollectedEnergy','megumiCompanionOn','itadoriFingers','itadoriMaxFingers','itadoriOneUse',
  'yutaKatanaActive','yutaCopiedTechnique','yutaCopiedTokens','yutaCopiedVigor','yutaCopiedFingers',
  'yutaCopiedMaxFingers','yutaCopiedHeat','bossRushActive','used','log','updatedAt','pvpPoints'
]);
let buildingRoomSnapshot=false;

function cloneValue(value){
  if(value===undefined||value===null||typeof value!=='object')return value;
  try{if(typeof root.structuredClone==='function')return root.structuredClone(value);}catch(_){}
  try{return JSON.parse(JSON.stringify(value));}catch(_){return value;}
}
function comparable(value){
  if(value===undefined)return'__undefined__';
  if(value===null||typeof value!=='object')return typeof value+':'+String(value);
  try{return JSON.stringify(value);}catch(_){return value;}
}
function sameValue(a,b){return Object.is(a,b)||comparable(a)===comparable(b);}
function get(name){return bridge.read(name);}
function snapshot(){
  const out={};
  bridge.fields.forEach(name=>{out[name]=cloneValue(bridge.read(name));});
  return out;
}
function baseRoomSnapshot(updatedAt){
  const characterId=get('currentId'),current=get('current');
  if(!characterId||!current)return null;
  return {
    characterId,
    gradeId:get('gradeId'),
    energy:get('energy'),
    exp:get('exp'),
    life:get('life'),
    maxLife:current.maxLife,
    tokens:get('tokens'),
    combatBonus:get('combatBonus'),
    jogoLife:get('jogoLife'),
    jogoHeat:get('jogoHeat'),
    getoOneUse:get('getoOneUse'),
    tojiCollectedEnergy:get('tojiCollectedEnergy'),
    megumiCompanionOn:get('megumiCompanionOn'),
    itadoriFingers:get('itadoriFingers'),
    itadoriMaxFingers:get('itadoriMaxFingers'),
    itadoriOneUse:get('itadoriOneUse'),
    yutaKatanaActive:get('yutaKatanaActive'),
    yutaCopiedTechnique:cloneValue(get('yutaCopiedTechnique')),
    yutaCopiedTokens:get('yutaCopiedTokens'),
    yutaCopiedVigor:get('yutaCopiedVigor'),
    yutaCopiedFingers:get('yutaCopiedFingers'),
    yutaCopiedMaxFingers:get('yutaCopiedMaxFingers'),
    yutaCopiedHeat:get('yutaCopiedHeat'),
    bossRushActive:get('bossRushActive'),
    used:cloneValue(get('used'))||[],
    log:(cloneValue(get('log'))||[]).slice(0,50),
    updatedAt
  };
}
function roomSnapshot(options={}){
  const forcedUpdatedAt=Number(options.updatedAt);
  const stamp=Number.isFinite(forcedUpdatedAt)?forcedUpdatedAt:Date.now();
  if(!get('currentId')||!get('current'))return null;
  let output=null;
  const builder=!buildingRoomSnapshot?bridge.resolveFunction('buildLocalPlayerState'):null;
  if(builder){
    buildingRoomSnapshot=true;
    try{output=cloneValue(builder.call(root));}catch(_){}
    finally{buildingRoomSnapshot=false;}
  }
  if(!output)output=baseRoomSnapshot(stamp);
  if(output)output.updatedAt=stamp;
  return output;
}
function emitChange(fields,source){
  if(!fields.length)return;
  try{root.dispatchEvent(new CustomEvent('jjk:state-change',{detail:{version:VERSION,fields:[...fields],source:source||'game-state'}}));}catch(_){}
}
function refreshRuntime(reason){
  try{root.JJKV406?.refresh?.('state',reason||'v408-game-state');}catch(_){}
}
function applySideEffects(options,changed){
  if(!changed.length)return;
  if(options.persist===true)bridge.invoke('saveState');
  if(options.render===true)bridge.invoke('renderAll');
  emitChange(changed,options.source);
  if(options.refresh!==false)refreshRuntime(options.source||'v408-game-state');
}
function patch(values,options={}){
  if(!values||typeof values!=='object'||Array.isArray(values))throw new TypeError('JJKGameState.patch expects an object');
  const keys=Object.keys(values);
  keys.forEach(name=>{if(!MUTABLE_SET.has(name))throw new Error('JJK Game State field is not mutable through the facade: '+name);});
  const before={};
  keys.forEach(name=>{before[name]=bridge.read(name);});
  const changed=keys.filter(name=>!sameValue(before[name],values[name]));
  if(!changed.length)return {changed:[],snapshot:snapshot()};
  const applied=[];
  try{
    changed.forEach(name=>{bridge.write(name,values[name]);applied.push(name);});
  }catch(error){
    for(let index=applied.length-1;index>=0;index--){
      const name=applied[index];
      try{bridge.write(name,before[name]);}catch(_){}
    }
    throw error;
  }
  applySideEffects(options,changed);
  return {changed:[...changed],snapshot:snapshot()};
}
function set(name,value,options={}){return patch({[name]:value},options);}
function commit(options={}){
  if(options.persist!==false)bridge.invoke('saveState');
  if(options.render===true)bridge.invoke('renderAll');
  if(options.refresh!==false)refreshRuntime(options.source||'v408-commit');
  return snapshot();
}
function selectCharacter(characterId,options={}){
  const catalog=root.JJKCharacterCatalog;
  if(!catalog?.has?.(characterId))return false;
  bridge.invoke('openCharacter',characterId,options);
  return get('current')===catalog.get(characterId);
}
function audit(){
  const issues=[];
  const bridgeAudit=bridge.audit();
  if(!bridgeAudit.ok)issues.push(...bridgeAudit.issues.map(item=>'bridge: '+item));
  if(new Set(bridge.fields).size!==bridge.fields.length)issues.push('duplicate legacy state field');
  if(new Set(ROOM_FIELDS).size!==ROOM_FIELDS.length)issues.push('duplicate room snapshot field');
  const currentId=get('currentId'),current=get('current');
  if(currentId&&root.JJKCharacterCatalog){
    const catalogCharacter=root.JJKCharacterCatalog.get(currentId);
    if(current!==catalogCharacter)issues.push('current character is not the Character Catalog object');
  }
  const checks={version:VERSION,fieldCount:bridge.fields.length,mutableFieldCount:MUTABLE_FIELDS.length,roomFieldCount:ROOM_FIELDS.length,issues,ok:issues.length===0};
  root.JJKGameStateAudit=checks;
  return checks;
}

const api=Object.freeze({
  version:VERSION,
  fields:bridge.fields,
  mutableFields:MUTABLE_FIELDS,
  roomFields:ROOM_FIELDS,
  get,set,patch,snapshot,roomSnapshot,commit,selectCharacter,audit
});
root.JJKGameState=api;
root.JJKState=api;
let initialAudit=null;
try{initialAudit=audit();}catch(error){console.warn('JJK Game State audit failed',error);}
try{root.dispatchEvent(new CustomEvent('jjk:game-state-ready',{detail:{version:VERSION,ok:!!initialAudit?.ok}}));}catch(_){}
console.info('JJK Energy Game State ready',VERSION);
})(typeof window!=='undefined'?window:globalThis);
