/* JJK 2.0 - read-only game state mirror over the V40.4 runtime */
(function(root){
'use strict';
if(root.JJK2GameState)return;

const VERSION='2.0.0-alpha.3';
const MODE='observe';
const listeners=new Set();
let state=freeze({
  version:VERSION,
  mode:MODE,
  source:'empty',
  reason:'boot',
  updatedAt:0,
  characterId:null,
  gradeId:null,
  exp:0,
  life:{current:0,max:0},
  energy:{current:0,max:0,kind:'energy'},
  combatBonus:0,
  usedTechniqueKeys:[],
  log:[],
  resources:{}
});

function readLegacy(name){
  try{return (0,eval)(name);}catch(_){return undefined;}
}

function clone(value,seen=new WeakMap()){
  if(value===null||typeof value!=='object')return value;
  if(seen.has(value))return seen.get(value);
  if(Array.isArray(value)){
    const out=[];
    seen.set(value,out);
    value.forEach(item=>out.push(clone(item,seen)));
    return out;
  }
  if(value instanceof Date)return new Date(value.getTime());
  const out={};
  seen.set(value,out);
  Object.keys(value).forEach(key=>{out[key]=clone(value[key],seen);});
  return out;
}

function freeze(value,seen=new WeakSet()){
  if(value===null||typeof value!=='object'||seen.has(value))return value;
  seen.add(value);
  Object.keys(value).forEach(key=>freeze(value[key],seen));
  return Object.freeze(value);
}

function numeric(name,fallback=0){
  const value=Number(readLegacy(name));
  return Number.isFinite(value)?value:fallback;
}

function booleanValue(name){return !!readLegacy(name);}

function replace(next,meta={}){
  state=freeze(clone({...next,version:VERSION,mode:MODE,updatedAt:Date.now()}));
  listeners.forEach(fn=>{try{fn(state,meta);}catch(_){ }});
  try{root.dispatchEvent(new CustomEvent('jjk2:state-changed',{detail:{state,meta}}));}catch(_){ }
  return state;
}

function maxEnergyFor(characterId,definition,gradeId){
  if(characterId==='jogo')return Math.max(0,numeric('jogoLife',numeric('life',0)));
  const grade=definition?.grades?.find?.(item=>item?.id===gradeId);
  let value=Number(grade?.max);
  if(!Number.isFinite(value))value=0;
  if(characterId==='itadori'&&numeric('itadoriMaxFingers')>=10)value+=5;
  return value;
}

function energyKind(characterId){
  if(characterId==='toji')return 'vigor';
  if(characterId==='jogo')return 'life-energy';
  return 'cursed-energy';
}

function syncFromLegacy(reason='manual'){
  const characterId=readLegacy('currentId')||null;
  const gradeId=readLegacy('gradeId')||null;
  const definition=characterId?root.JJK2CharacterCatalog?.get?.(characterId):null;
  const used=readLegacy('used');
  const legacyLog=readLegacy('log');
  const yutaCopiedTechnique=readLegacy('yutaCopiedTechnique');

  return replace({
    source:'V40.4 legacy runtime',
    reason,
    characterId,
    gradeId,
    exp:numeric('exp'),
    life:{
      current:numeric('life'),
      max:Number(definition?.maxLife)||0
    },
    energy:{
      current:numeric('energy'),
      max:maxEnergyFor(characterId,definition,gradeId),
      kind:energyKind(characterId)
    },
    combatBonus:numeric('combatBonus'),
    usedTechniqueKeys:Array.isArray(used)?clone(used):[],
    log:Array.isArray(legacyLog)?clone(legacyLog):[],
    resources:{
      tokens:numeric('tokens'),
      jogoLife:numeric('jogoLife'),
      jogoHeat:numeric('jogoHeat'),
      getoOneUse:numeric('getoOneUse'),
      tojiCollectedEnergy:numeric('tojiCollectedEnergy'),
      megumiCompanionOn:booleanValue('megumiCompanionOn'),
      itadoriFingers:numeric('itadoriFingers'),
      itadoriMaxFingers:numeric('itadoriMaxFingers'),
      itadoriOneUse:numeric('itadoriOneUse'),
      yutaKatanaActive:booleanValue('yutaKatanaActive'),
      yutaCopiedTechnique:yutaCopiedTechnique?clone(yutaCopiedTechnique):null,
      yutaCopiedTokens:numeric('yutaCopiedTokens'),
      yutaCopiedVigor:numeric('yutaCopiedVigor'),
      yutaCopiedFingers:numeric('yutaCopiedFingers'),
      yutaCopiedMaxFingers:numeric('yutaCopiedMaxFingers'),
      yutaCopiedHeat:numeric('yutaCopiedHeat'),
      bossRushActive:booleanValue('bossRushActive')
    }
  },{reason});
}

function get(){return state;}
function subscribe(fn){
  if(typeof fn!=='function')return ()=>{};
  listeners.add(fn);
  return ()=>listeners.delete(fn);
}
function audit(){
  const hasLegacyCharacters=!!readLegacy('characters');
  return Object.freeze({
    ok:MODE==='observe'&&hasLegacyCharacters,
    version:VERSION,
    mode:MODE,
    source:state.source,
    characterId:state.characterId,
    updatedAt:state.updatedAt,
    hasLegacyCharacters,
    writeThrough:false
  });
}

root.JJK2GameState=Object.freeze({
  version:VERSION,
  mode:MODE,
  get,
  syncFromLegacy,
  subscribe,
  audit
});
})(window);
