/* JJK Energy V40.9 - semantic battle engine foundation */
(function(root){
'use strict';
if(root.__JJK_BATTLE_ENGINE_V409__)return;
root.__JJK_BATTLE_ENGINE_V409__=true;

const VERSION='40.9.0';
const catalog=root.JJKCharacterCatalog;
const gameState=root.JJKGameState;
const bridge=root.JJKLegacyBridge;
if(!catalog||!gameState||!bridge)throw new Error('JJK Battle Engine requires Character Catalog, Game State and Legacy Bridge');

const MODES=Object.freeze({LIVE:'live',PRACTICE:'practice'});

function cloneValue(value){
  if(value===undefined||value===null||typeof value!=='object')return value;
  try{if(typeof root.structuredClone==='function')return root.structuredClone(value);}catch(_){}
  try{return JSON.parse(JSON.stringify(value));}catch(_){return value;}
}
function number(value,fallback=0){const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback;}
function nonNegative(value,fallback=0){return Math.max(0,number(value,fallback));}
function uniqueStrings(values){return [...new Set((Array.isArray(values)?values:[]).map(value=>String(value)))];}
function characterOrThrow(characterId){
  const character=catalog.get(characterId);
  if(!character)throw new Error('Unknown JJK battle character: '+characterId);
  return character;
}
function gradeIndex(character,gradeId){return Math.max(0,(character.grades||[]).findIndex(item=>item?.id===gradeId));}
function gradeOrThrow(character,gradeId){
  const grade=(character.grades||[]).find(item=>item?.id===gradeId);
  if(!grade)throw new Error('Unknown grade '+gradeId+' for '+character.name);
  return grade;
}
function resourceKind(characterId){return characterId==='toji'?'vigor':'energy';}
function resourceLabel(characterId){return characterId==='toji'?'Vigore':'Energia Maledetta';}
function bossRushFreeForLive(raw){
  if(!raw?.bossRushActive)return false;
  const fn=bridge.resolveFunction('isBossRushFree');
  if(fn){try{return !!fn.call(root);}catch(_){}}
  return false;
}
function fallbackTechniqueUnlocked(characterId,technique,gradeId,raw){
  const character=characterOrThrow(characterId);
  if(characterId==='itadori'&&technique?.fingerOnly){
    if(nonNegative(raw?.itadoriMaxFingers)<nonNegative(technique.fingerReq))return false;
    if(technique.instantWin&&gradeId==='SG')return false;
    return true;
  }
  return gradeIndex(character,technique?.grade)<=gradeIndex(character,gradeId);
}
function techniqueUnlocked(characterId,technique,gradeId,raw,source){
  if(source==='live'&&gameState.get('currentId')===characterId){
    const fn=bridge.resolveFunction('techniqueIsAvailable');
    if(fn){try{return !!fn.call(root,technique);}catch(_){}}
  }
  return fallbackTechniqueUnlocked(characterId,technique,gradeId,raw);
}
function effectiveTechniqueCost(characterId,technique,raw,source,bossRushFree){
  if(bossRushFree)return 0;
  if(technique?.dynamicCost||technique?.itadoriBlackFlash)return null;
  if(technique?.convertAllEnergy)return nonNegative(raw?.energy);
  const base=nonNegative(technique?.cost);
  if(characterId==='toji')return base;
  if(source==='live'&&gameState.get('currentId')===characterId){
    const fn=bridge.resolveFunction('mcDiscountCost');
    if(fn){try{return nonNegative(fn.call(root,characterId,base),base);}catch(_){}}
  }
  return base;
}
function techniqueNeedsInput(characterId,technique){
  if(!technique)return false;
  if(technique.dynamicCost||technique.itadoriBlackFlash||technique.yutaDomain)return true;
  if(characterId==='sukuna'&&technique.key==='solitudine')return true;
  if(characterId==='mahito'&&technique.key==='perfetta')return true;
  return false;
}
function techniqueView(characterId,technique,gradeId,raw,source,bossRushFree){
  const unlocked=techniqueUnlocked(characterId,technique,gradeId,raw,source);
  const used=uniqueStrings(raw?.used).includes(String(technique.key));
  const cost=effectiveTechniqueCost(characterId,technique,raw,source,bossRushFree);
  const blockers=[];
  if(!unlocked)blockers.push('locked');
  if(used)blockers.push('used');
  if(unlocked&&!used&&!bossRushFree&&cost!==null&&nonNegative(raw?.energy)<cost)blockers.push(resourceKind(characterId)==='vigor'?'insufficient-vigor':'insufficient-energy');
  if(unlocked&&!used&&!bossRushFree&&nonNegative(technique?.tokenCost)>nonNegative(raw?.tokens))blockers.push('insufficient-tokens');
  return {
    key:String(technique.key||''),
    name:String(technique.name||''),
    gradeId:String(technique.grade||''),
    badge:String(technique.badge||technique.grade||''),
    image:technique.image||'',
    cost,
    tokenCost:nonNegative(technique.tokenCost),
    lifeCost:nonNegative(technique.lifeCost),
    fingerRequirement:technique.fingerOnly?nonNegative(technique.fingerReq):0,
    unlocked,
    used,
    ready:blockers.length===0,
    blockers,
    requiresInput:techniqueNeedsInput(characterId,technique),
    bossRushFree:!!bossRushFree,
    execution:source==='live'?'legacy-delegated':'preview-only'
  };
}
function liveBody(characterId,character,raw){
  let body=number(character.baseBody);
  const baseFn=bridge.resolveFunction('effectiveBaseBody');
  if(baseFn){try{body=number(baseFn.call(root),body);}catch(_){}}
  body+=number(raw?.combatBonus);
  if(characterId==='megumi'&&raw?.megumiCompanionOn){
    const companionFn=bridge.resolveFunction('getMegumiCompanionBonus');
    if(companionFn){try{body+=number(companionFn.call(root));}catch(_){}}
  }
  return body;
}
function practiceBody(characterId,character,raw){
  let body=number(character.baseBody)+number(raw?.combatBonus);
  if(characterId==='megumi'&&raw?.megumiCompanionOn)body+=number(raw?.megumiCompanionBonus,2);
  return body;
}
function specialState(raw){
  return {
    tokens:nonNegative(raw?.tokens),
    jogoHeat:nonNegative(raw?.jogoHeat),
    getoOneUse:nonNegative(raw?.getoOneUse),
    tojiCollectedEnergy:nonNegative(raw?.tojiCollectedEnergy),
    megumiCompanionOn:!!raw?.megumiCompanionOn,
    itadoriFingers:nonNegative(raw?.itadoriFingers),
    itadoriMaxFingers:nonNegative(raw?.itadoriMaxFingers),
    itadoriOneUse:nonNegative(raw?.itadoriOneUse),
    yutaKatanaActive:!!raw?.yutaKatanaActive,
    yutaCopiedTechnique:cloneValue(raw?.yutaCopiedTechnique)||null,
    bossRushActive:!!raw?.bossRushActive,
    pvpPoints:nonNegative(raw?.pvpPoints)
  };
}
function buildFighter(characterId,raw,source){
  const character=characterOrThrow(characterId);
  const gradeId=String(raw?.gradeId||character.grades?.[0]?.id||'G4');
  const grade=gradeOrThrow(character,gradeId);
  const maxLife=nonNegative(raw?.maxLife,character.maxLife);
  const life=nonNegative(raw?.life,maxLife);
  const resourceMax=nonNegative(raw?.resourceMax,grade.max);
  const resourceCurrent=nonNegative(raw?.energy,characterId==='jogo'?life:resourceMax);
  const bossRushFree=source==='live'?bossRushFreeForLive(raw):!!raw?.bossRushFree;
  const techniques=(character.techniques||[]).map(technique=>techniqueView(characterId,technique,gradeId,raw,source,bossRushFree));
  const body=source==='live'?liveBody(characterId,character,raw):practiceBody(characterId,character,raw);
  return {
    version:VERSION,
    source,
    characterId,
    character,
    name:String(character.name||characterId),
    image:character.image||character.portrait||'',
    gradeId,
    gradeLabel:String(grade.label||gradeId),
    exp:nonNegative(raw?.exp),
    life,
    maxLife,
    body,
    combatBonus:number(raw?.combatBonus),
    resource:{kind:resourceKind(characterId),label:resourceLabel(characterId),current:resourceCurrent,max:resourceMax},
    used:uniqueStrings(raw?.used),
    special:specialState(raw),
    bossRushFree,
    techniques,
    unlockedTechniques:techniques.filter(item=>item.unlocked),
    readyTechniques:techniques.filter(item=>item.ready),
    authoritative:source==='live',
    execution:source==='live'?'legacy-delegated':'preview-only'
  };
}
function liveFighter(){
  const characterId=gameState.get('currentId');
  if(!characterId||!gameState.get('current'))return null;
  const raw=gameState.snapshot();
  return buildFighter(characterId,raw,'live');
}
function practiceFighter(characterId,options={}){
  const character=characterOrThrow(characterId);
  const gradeId=String(options.gradeId||character.grades?.[0]?.id||'G4');
  const grade=gradeOrThrow(character,gradeId);
  const maxLife=nonNegative(options.maxLife,character.maxLife);
  const life=nonNegative(options.life,maxLife);
  const resourceMax=nonNegative(options.resourceMax,grade.max);
  const raw={
    gradeId,
    exp:options.exp===undefined?nonNegative(grade.exp):nonNegative(options.exp),
    life,
    maxLife,
    resourceMax,
    energy:options.energy===undefined?(characterId==='jogo'?life:resourceMax):nonNegative(options.energy),
    combatBonus:number(options.combatBonus),
    used:uniqueStrings(options.used),
    tokens:nonNegative(options.tokens),
    jogoHeat:nonNegative(options.jogoHeat),
    getoOneUse:nonNegative(options.getoOneUse),
    tojiCollectedEnergy:nonNegative(options.tojiCollectedEnergy),
    megumiCompanionOn:!!options.megumiCompanionOn,
    megumiCompanionBonus:number(options.megumiCompanionBonus,2),
    itadoriFingers:nonNegative(options.itadoriFingers),
    itadoriMaxFingers:nonNegative(options.itadoriMaxFingers),
    itadoriOneUse:nonNegative(options.itadoriOneUse),
    yutaKatanaActive:!!options.yutaKatanaActive,
    yutaCopiedTechnique:cloneValue(options.yutaCopiedTechnique)||null,
    bossRushActive:!!options.bossRushActive,
    bossRushFree:!!options.bossRushFree,
    pvpPoints:nonNegative(options.pvpPoints)
  };
  return buildFighter(characterId,raw,'practice');
}
function fighterFromRoomPlayer(player){
  if(!player?.characterId)return null;
  const raw={...(cloneValue(player.state)||{}),maxLife:player.state?.maxLife};
  return buildFighter(String(player.characterId),raw,'room');
}
function createPracticeSession(playerCharacterId,opponentCharacterId,options={}){
  const player=practiceFighter(playerCharacterId,options.player||{});
  const opponent=practiceFighter(opponentCharacterId,options.opponent||{});
  return Object.freeze({
    version:VERSION,
    mode:MODES.PRACTICE,
    id:'practice:'+Date.now()+':'+Math.random().toString(36).slice(2,8),
    player,
    opponent,
    persistent:false,
    execution:'preview-only'
  });
}
function createLiveSession(opponent,options={}){
  const player=liveFighter();
  if(!player)throw new Error('Cannot create a live battle session without an active character');
  let normalizedOpponent=null;
  if(typeof opponent==='string')normalizedOpponent=practiceFighter(opponent,options.opponent||{});
  else if(opponent?.state&&opponent?.characterId)normalizedOpponent=fighterFromRoomPlayer(opponent);
  else if(opponent?.characterId&&opponent?.techniques)normalizedOpponent=opponent;
  if(!normalizedOpponent)throw new Error('A live battle session requires an opponent');
  return Object.freeze({
    version:VERSION,
    mode:MODES.LIVE,
    id:'live:'+Date.now()+':'+Math.random().toString(36).slice(2,8),
    player,
    opponent:normalizedOpponent,
    persistent:false,
    execution:'legacy-delegated'
  });
}
function resetLiveCombat(){
  const fn=bridge.resolveFunction('newCombat');
  if(!fn)throw new Error('Legacy newCombat is unavailable');
  fn.call(root);
  return liveFighter();
}
function useLiveTechnique(techniqueKey){
  const fighter=liveFighter();
  if(!fighter)return {delegated:false,reason:'no-active-character',fighter:null};
  const technique=catalog.technique(fighter.characterId,techniqueKey);
  if(!technique)return {delegated:false,reason:'unknown-technique',fighter};
  const fn=bridge.resolveFunction('useTechnique');
  if(!fn)throw new Error('Legacy useTechnique is unavailable');
  const before=gameState.snapshot();
  fn.call(root,technique.key);
  const after=gameState.snapshot();
  const changed=gameState.mutableFields.filter(name=>{
    try{return JSON.stringify(before[name])!==JSON.stringify(after[name]);}catch(_){return before[name]!==after[name];}
  });
  return {delegated:true,reason:null,techniqueKey:String(technique.key),changed,fighter:liveFighter()};
}
function audit(){
  const issues=[];
  if(catalog.audit?.().ok!==true)issues.push('Character Catalog audit failed');
  if(gameState.audit?.().ok!==true)issues.push('Game State audit failed');
  if(bridge.audit?.().ok!==true)issues.push('Legacy Bridge audit failed');
  const currentId=gameState.get('currentId');
  if(currentId&&gameState.get('current')!==catalog.get(currentId))issues.push('live character identity diverged from Character Catalog');
  if(currentId){
    const before=gameState.snapshot();
    try{practiceFighter(currentId);}catch(error){issues.push('practice fighter failed: '+error.message);}
    const after=gameState.snapshot();
    const mutated=gameState.fields.some(name=>{
      try{return JSON.stringify(before[name])!==JSON.stringify(after[name]);}catch(_){return before[name]!==after[name];}
    });
    if(mutated)issues.push('practice fighter mutated live Game State');
  }
  const checks={version:VERSION,modes:[MODES.LIVE,MODES.PRACTICE],issues,ok:issues.length===0};
  root.JJKBattleEngineAudit=checks;
  return checks;
}

const api=Object.freeze({
  version:VERSION,
  modes:MODES,
  liveFighter,
  practiceFighter,
  fighterFromRoomPlayer,
  createPracticeSession,
  createLiveSession,
  resetLiveCombat,
  useLiveTechnique,
  audit
});
root.JJKBattleEngine=api;
root.JJKBattle=api;
let initialAudit=null;
try{initialAudit=audit();}catch(error){console.warn('JJK Battle Engine audit failed',error);}
try{root.dispatchEvent(new CustomEvent('jjk:battle-engine-ready',{detail:{version:VERSION,ok:!!initialAudit?.ok}}));}catch(_){}
console.info('JJK Energy Battle Engine ready',VERSION);
})(typeof window!=='undefined'?window:globalThis);
