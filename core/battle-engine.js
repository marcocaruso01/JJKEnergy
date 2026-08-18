/* JJK 2.0 - isolated battle engine. Never writes to the V40.4 runtime. */
(function(root){
'use strict';
if(root.JJK2BattleEngine)return;

const VERSION='2.0.0-alpha.2';
let battle=null;

function clone(value){
  if(value===null||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(clone);
  const out={};Object.keys(value).forEach(key=>{out[key]=clone(value[key]);});return out;
}
function freeze(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.keys(value).forEach(key=>freeze(value[key]));
    Object.freeze(value);
  }
  return value;
}
function number(value,fallback=0){const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback;}
function catalog(){return root.JJK2CharacterCatalog;}
function rules(){return root.JJK2BattleRules;}
function stateApi(){return root.JJK2BattleState;}
function emit(type,detail){try{root.dispatchEvent(new CustomEvent(type,{detail}));}catch(_){ }}

function gradeDefinition(definition,gradeId){
  return definition?.grades?.find?.(grade=>grade?.id===gradeId)||definition?.grades?.[0]||null;
}

function baseFighter(characterId,options={}){
  const definition=catalog()?.get?.(characterId);
  if(!definition)throw new Error('Personaggio non trovato: '+characterId);
  const gradeId=options.gradeId||definition.grades?.[0]?.id||'G4';
  const grade=gradeDefinition(definition,gradeId);
  const maxLife=Math.max(0,number(options.maxLife,number(definition.maxLife)));
  const maxEnergy=Math.max(0,number(options.maxEnergy,number(grade?.max)));
  return {
    characterId,
    name:definition.name||characterId,
    image:definition.image||'',
    gradeId,
    body:{base:number(options.baseBody,number(definition.baseBody)),combatBonus:number(options.combatBonus)},
    life:{current:Math.max(0,number(options.life,maxLife)),max:maxLife},
    energy:{
      current:Math.max(0,number(options.energy,maxEnergy)),
      max:maxEnergy,
      kind:characterId==='toji'?'vigor':characterId==='jogo'?'life-energy':'cursed-energy'
    },
    usedTechniqueKeys:Array.isArray(options.usedTechniqueKeys)?clone(options.usedTechniqueKeys):[],
    resources:clone(options.resources||{}),
    metadata:{source:options.source||'catalog'}
  };
}

function fighterFromGameState(characterId,options={}){
  const snapshot=root.JJK2GameState?.get?.();
  if(!snapshot||snapshot.characterId!==characterId)return baseFighter(characterId,options);
  const definition=catalog()?.get?.(characterId);
  return baseFighter(characterId,{
    ...options,
    source:'game-state',
    gradeId:snapshot.gradeId||options.gradeId,
    baseBody:number(definition?.baseBody),
    combatBonus:number(snapshot.combatBonus),
    life:number(snapshot.life?.current),
    maxLife:number(snapshot.life?.max,number(definition?.maxLife)),
    energy:number(snapshot.energy?.current),
    maxEnergy:number(snapshot.energy?.max),
    usedTechniqueKeys:clone(snapshot.usedTechniqueKeys||[]),
    resources:clone(snapshot.resources||{})
  });
}

function createFighter(characterId,options={}){
  return freeze(options.fromGameState?fighterFromGameState(characterId,options):baseFighter(characterId,options));
}

function start(config={}){
  if(!catalog()?.audit?.().ok)throw new Error('Character Catalog non pronto.');
  if(!rules()||!stateApi())throw new Error('Battle Rules o Battle State non disponibili.');
  const aConfig=typeof config.fighterA==='string'?{characterId:config.fighterA}:config.fighterA||{};
  const bConfig=typeof config.fighterB==='string'?{characterId:config.fighterB}:config.fighterB||{};
  if(!aConfig.characterId||!bConfig.characterId)throw new Error('Servono due personaggi per iniziare la battaglia.');
  const fighterA=createFighter(aConfig.characterId,aConfig);
  const fighterB=createFighter(bConfig.characterId,bConfig);
  battle=stateApi().create(fighterA,fighterB);
  battle=stateApi().update(battle,{
    activeFighter:config.first==='B'?'B':'A',
    pendingActions:{A:null,B:null},
    lastResolution:null,
    mode:config.mode||'simulator'
  });
  battle=stateApi().appendLog(battle,{type:'battle-start',turn:1,text:fighterA.name+' vs '+fighterB.name,at:Date.now()});
  emit('jjk2:battle-started',{battle});
  return battle;
}

function get(){return battle;}
function requireBattle(){if(!battle||battle.status!=='active')throw new Error('Nessuna battaglia attiva.');return battle;}
function fighter(side){const current=requireBattle();return current.fighters?.[side]||null;}
function definitionFor(side){const current=fighter(side);return current?catalog()?.get?.(current.characterId):null;}
function techniques(side){return rules().listTechniques(fighter(side),definitionFor(side));}

function preview(side,techniqueKey,inputs={}){
  const current=fighter(side);
  const definition=definitionFor(side);
  const technique=definition?.techniques?.find?.(item=>item.key===techniqueKey);
  if(!technique)return freeze({ok:false,reason:'technique-not-found'});
  return freeze({ok:true,side,technique:rules().normalizeTechnique(current,technique,inputs)});
}

function replaceFighter(side,nextFighter,patch={}){
  const current=requireBattle();
  battle=stateApi().update(current,{...patch,fighters:{...clone(current.fighters),[side]:clone(nextFighter)}});
  return battle;
}

function commitTechnique(side,techniqueKey,inputs={}){
  const current=requireBattle();
  if(side!==current.activeFighter)return freeze({ok:false,reason:'not-your-turn',battle:current});
  const fighterBefore=clone(current.fighters[side]);
  const definition=catalog()?.get?.(fighterBefore.characterId);
  const rawTechnique=definition?.techniques?.find?.(item=>item.key===techniqueKey);
  if(!rawTechnique)return freeze({ok:false,reason:'technique-not-found',battle:current});

  const normalized=rules().normalizeTechnique(fighterBefore,rawTechnique,inputs);
  if(!normalized.available)return freeze({ok:false,reason:normalized.availabilityReason,technique:normalized,battle:current});
  if(!normalized.energyCost?.known)return freeze({ok:false,reason:normalized.energyCost?.reason||'input-required',technique:normalized,battle:current});

  const fighterAfter=clone(fighterBefore);
  const bossFree=!!fighterAfter.resources?.bossRushActive;
  const energyCost=Math.max(0,number(normalized.energyCost?.value));
  const tokenCost=Math.max(0,number(normalized.tokenCost));
  const lifeCost=Math.max(0,number(normalized.lifeCost));
  if(!bossFree){
    fighterAfter.energy.current=Math.max(0,number(fighterAfter.energy.current)-energyCost);
    if(tokenCost)fighterAfter.resources.tokens=Math.max(0,number(fighterAfter.resources.tokens)-tokenCost);
    if(lifeCost)fighterAfter.life.current=Math.max(0,number(fighterAfter.life.current)-lifeCost);
  }
  if(!fighterAfter.usedTechniqueKeys.includes(techniqueKey))fighterAfter.usedTechniqueKeys.push(techniqueKey);

  const action=freeze({
    side,
    characterId:fighterAfter.characterId,
    techniqueKey,
    techniqueName:normalized.name,
    combatScore:normalized.combatScore,
    requiresSpecialResolution:normalized.requiresSpecialResolution,
    spent:{energy:bossFree?0:energyCost,tokens:bossFree?0:tokenCost,life:bossFree?0:lifeCost},
    inputs:clone(inputs),
    at:Date.now()
  });
  const pendingActions={...clone(current.pendingActions||{}),[side]:action};
  replaceFighter(side,fighterAfter,{pendingActions});
  battle=stateApi().appendLog(battle,{
    type:'technique-committed',turn:battle.turn,side,techniqueKey,techniqueName:normalized.name,
    combatScore:normalized.combatScore?.known?normalized.combatScore.value:null,
    special:normalized.requiresSpecialResolution,at:Date.now()
  });
  emit('jjk2:battle-action',{battle,action});
  return freeze({ok:true,action,battle});
}

function switchTurn(){
  const current=requireBattle();
  battle=stateApi().update(current,{activeFighter:current.activeFighter==='A'?'B':'A',turn:number(current.turn,1)+1});
  emit('jjk2:battle-turn',{battle});
  return battle;
}

function resolveRound(result={}){
  const current=requireBattle();
  const winner=result.winnerSide==='A'||result.winnerSide==='B'?result.winnerSide:null;
  const fighters=clone(current.fighters);
  const losses=result.lifeLoss||{};
  ['A','B'].forEach(side=>{
    const amount=Math.max(0,number(losses[side]));
    if(amount)fighters[side].life.current=Math.max(0,number(fighters[side].life.current)-amount);
  });
  const defeated=['A','B'].find(side=>number(fighters[side].life.current)<=0)||null;
  const resolution=freeze({
    winnerSide:winner,
    loserSide:winner?(winner==='A'?'B':'A'):null,
    lifeLoss:{A:Math.max(0,number(losses.A)),B:Math.max(0,number(losses.B))},
    note:String(result.note||''),at:Date.now()
  });
  battle=stateApi().update(current,{
    fighters,
    pendingActions:{A:null,B:null},
    lastResolution:resolution,
    status:defeated||result.finish?'finished':'active',
    winnerSide:defeated?(defeated==='A'?'B':'A'):(result.finish?winner:null),
    activeFighter:result.nextSide==='A'||result.nextSide==='B'?result.nextSide:(current.activeFighter==='A'?'B':'A'),
    turn:number(current.turn,1)+1
  });
  battle=stateApi().appendLog(battle,{type:'round-resolved',turn:current.turn,winnerSide:winner,lifeLoss:resolution.lifeLoss,note:resolution.note,at:Date.now()});
  emit('jjk2:battle-resolved',{battle,resolution});
  return battle;
}

function resetCombat(side){
  const current=requireBattle();
  if(side!=='A'&&side!=='B')throw new Error('Lato non valido.');
  const next=clone(current.fighters[side]);next.usedTechniqueKeys=[];
  return replaceFighter(side,next);
}
function end(winnerSide=null,note=''){
  const current=requireBattle();
  battle=stateApi().update(current,{status:'finished',winnerSide:winnerSide==='A'||winnerSide==='B'?winnerSide:null,endedAt:Date.now()});
  battle=stateApi().appendLog(battle,{type:'battle-ended',winnerSide:battle.winnerSide,note:String(note||''),at:Date.now()});
  emit('jjk2:battle-ended',{battle});
  return battle;
}
function clear(){battle=null;return null;}
function audit(){return freeze({ok:!!catalog()&&!!rules()&&!!stateApi(),version:VERSION,writesLegacy:false,hasBattle:!!battle,resolutionMode:'explicit'});}

root.JJK2BattleEngine=Object.freeze({
  version:VERSION,createFighter,start,get,fighter,techniques,preview,commitTechnique,switchTurn,resolveRound,resetCombat,end,clear,audit
});
})(window);
