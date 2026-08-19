/* JJK Energy V41.0 - isolated practice battle controller */
(function(root){
'use strict';
if(root.__JJK_BATTLE_PRACTICE_V410__)return;
root.__JJK_BATTLE_PRACTICE_V410__=true;

const VERSION='41.0.0';
const engine=root.JJKBattleEngine;
const catalog=root.JJKCharacterCatalog;
if(!engine||!catalog)throw new Error('JJK Practice Battle requires Battle Engine and Character Catalog');

const SIDES=Object.freeze({PLAYER:'player',OPPONENT:'opponent'});
const clone=value=>{
  if(value===undefined||value===null||typeof value!=='object')return value;
  try{if(typeof root.structuredClone==='function')return root.structuredClone(value);}catch(_){}
  try{return JSON.parse(JSON.stringify(value));}catch(_){return value;}
};
const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const nonNegative=(value,fallback=0)=>Math.max(0,number(value,fallback));
const strings=value=>[...new Set((Array.isArray(value)?value:[]).map(item=>String(item)))];
const now=()=>new Date().toISOString();

function characterOrThrow(characterId){
  const character=catalog.get(characterId);
  if(!character)throw new Error('Unknown practice character: '+characterId);
  return character;
}
function gradeOrThrow(character,gradeId){
  const grade=(character.grades||[]).find(item=>item?.id===gradeId);
  if(!grade)throw new Error('Unknown practice grade '+gradeId+' for '+character.name);
  return grade;
}
function initialSide(characterId,options={}){
  const character=characterOrThrow(characterId);
  const gradeId=String(options.gradeId||character.grades?.[0]?.id||'G4');
  const grade=gradeOrThrow(character,gradeId);
  const maxLife=nonNegative(options.maxLife,character.maxLife);
  const life=nonNegative(options.life,maxLife);
  const resourceMax=nonNegative(options.resourceMax,grade.max);
  return {
    characterId:String(characterId),gradeId,
    exp:nonNegative(options.exp,grade.exp),
    maxLife,life:Math.min(maxLife,life),resourceMax,
    energy:nonNegative(options.energy,characterId==='jogo'?life:resourceMax),
    combatBonus:number(options.combatBonus),used:strings(options.used),
    tokens:nonNegative(options.tokens),jogoHeat:nonNegative(options.jogoHeat),
    getoOneUse:nonNegative(options.getoOneUse),tojiCollectedEnergy:nonNegative(options.tojiCollectedEnergy),
    megumiCompanionOn:!!options.megumiCompanionOn,megumiCompanionBonus:number(options.megumiCompanionBonus,2),
    itadoriFingers:nonNegative(options.itadoriFingers),itadoriMaxFingers:nonNegative(options.itadoriMaxFingers),
    itadoriOneUse:nonNegative(options.itadoriOneUse),yutaKatanaActive:!!options.yutaKatanaActive,
    yutaCopiedTechnique:clone(options.yutaCopiedTechnique)||null,bossRushActive:false,bossRushFree:false,
    pvpPoints:nonNegative(options.pvpPoints)
  };
}
function project(raw){return engine.practiceFighter(raw.characterId,raw);}
function sideOrThrow(state,side){
  if(side!==SIDES.PLAYER&&side!==SIDES.OPPONENT)throw new Error('Unknown practice side: '+side);
  return state.sides[side];
}
function techniqueSupport(technique){
  if(!technique)return {supported:false,kind:'missing'};
  if(technique.dynamicCost||technique.itadoriBlackFlash||technique.convertAllEnergy||technique.instantWin||technique.yutaDomain||technique.yutaCopy||technique.yutaReverse||technique.yutaKatana||technique.getoDarkTokens||technique.itadoriChoso||technique.resetFingers){
    return {supported:false,kind:'special'};
  }
  const hasBonus=Number.isFinite(Number(technique.bonus));
  const hasHeal=nonNegative(technique.heal)>0;
  if(!hasBonus&&!hasHeal)return {supported:false,kind:'special'};
  return {supported:true,kind:hasBonus?'combat':'support',partial:!!(technique.effect||technique.extra)};
}
function compareRound(round){
  const player=round.actions.player,opponent=round.actions.opponent;
  if(!player||!opponent||!Number.isFinite(player.score)||!Number.isFinite(opponent.score))return {ready:false,winner:null,margin:0,tie:false};
  if(player.score===opponent.score)return {ready:true,winner:null,margin:0,tie:true};
  const winner=player.score>opponent.score?SIDES.PLAYER:SIDES.OPPONENT;
  return {ready:true,winner,margin:Math.abs(player.score-opponent.score),tie:false};
}
function snapshotState(state){
  const player=project(state.sides.player),opponent=project(state.sides.opponent);
  const comparison=compareRound(state.round);
  return clone({
    version:VERSION,id:state.id,mode:'practice',persistent:false,
    player,opponent,
    round:{number:state.round.number,actions:state.round.actions,comparison},
    log:state.log,
    createdAt:state.createdAt
  });
}
function blockedMessage(view){
  const labels={locked:'Tecnica non ancora sbloccata.',used:'Tecnica già usata in questo scontro.','insufficient-energy':'Energia Maledetta insufficiente.','insufficient-vigor':'Vigore insufficiente.','insufficient-tokens':'Segnalini insufficienti.'};
  return (view.blockers||[]).map(item=>labels[item]||item).join(' ')||'Tecnica non disponibile.';
}

function createSession(playerCharacterId,opponentCharacterId,options={}){
  const initial={
    player:initialSide(playerCharacterId,options.player||{}),
    opponent:initialSide(opponentCharacterId,options.opponent||{})
  };
  const state={
    id:'practice410:'+Date.now()+':'+Math.random().toString(36).slice(2,8),
    createdAt:now(),sides:clone(initial),
    round:{number:1,actions:{player:null,opponent:null}},log:[]
  };
  function append(type,message,detail={}){
    state.log.unshift({at:now(),round:state.round.number,type,message,...clone(detail)});
    state.log=state.log.slice(0,30);
  }
  function useTechnique(side,techniqueKey){
    const raw=sideOrThrow(state,side),fighter=project(raw);
    const view=fighter.techniques.find(item=>item.key===String(techniqueKey));
    const technique=catalog.technique(raw.characterId,techniqueKey);
    if(!view||!technique)return {ok:false,reason:'unknown-technique',message:'Tecnica non trovata.',snapshot:snapshotState(state)};
    if(!view.ready){
      const message=blockedMessage(view);append('blocked',message,{side,techniqueKey:String(techniqueKey)});
      return {ok:false,reason:'blocked',message,view:clone(view),snapshot:snapshotState(state)};
    }
    const support=techniqueSupport(technique);
    if(!support.supported){
      const message='Questa tecnica usa una regola speciale: V41.0 la mostra correttamente ma non ne simula ancora l’effetto.';
      append('special',message,{side,techniqueKey:String(techniqueKey)});
      return {ok:false,reason:'special-technique',message,view:clone(view),snapshot:snapshotState(state)};
    }
    const before=project(raw),cost=nonNegative(view.cost),tokenCost=nonNegative(view.tokenCost),lifeCost=nonNegative(view.lifeCost);
    raw.energy=Math.max(0,nonNegative(raw.energy)-cost);
    raw.tokens=Math.max(0,nonNegative(raw.tokens)-tokenCost);
    raw.life=Math.max(0,nonNegative(raw.life)-lifeCost);
    const healed=nonNegative(technique.heal);
    if(healed)raw.life=Math.min(nonNegative(raw.maxLife),raw.life+healed);
    if(raw.characterId==='jogo')raw.energy=raw.life;
    if(!raw.used.includes(String(technique.key)))raw.used.push(String(technique.key));
    const bonus=Number.isFinite(Number(technique.bonus))?Number(technique.bonus):null;
    const score=bonus===null?null:before.body+bonus;
    const action={
      side,characterId:raw.characterId,techniqueKey:String(technique.key),techniqueName:String(technique.name||technique.key),
      score,body:before.body,bonus,resourceSpent:cost,tokensSpent:tokenCost,lifeSpent:lifeCost,healed,
      partial:support.partial,note:support.partial?'Il valore di Combattimento è simulato; eventuali effetti speciali testuali restano informativi.':''
    };
    state.round.actions[side]=action;
    append('action',action.techniqueName+(score===null?' utilizzata.':' → '+score+' Combattimento.'),{side,action});
    const comparison=compareRound(state.round);
    if(comparison.ready){
      const message=comparison.tie?'Parità: '+state.round.actions.player.score+' a '+state.round.actions.opponent.score+'.':(comparison.winner==='player'?project(state.sides.player).name:project(state.sides.opponent).name)+' è avanti di '+comparison.margin+' Combattimento.';
      append('comparison',message,{comparison});
    }
    return {ok:true,reason:null,action:clone(action),comparison:clone(comparison),snapshot:snapshotState(state)};
  }
  function newRound(){
    state.round={number:state.round.number+1,actions:{player:null,opponent:null}};
    state.sides.player.used=[];state.sides.opponent.used=[];
    append('round','Nuovo scontro: tecniche nuovamente disponibili.');
    return snapshotState(state);
  }
  function reset(){
    state.sides=clone(initial);state.round={number:1,actions:{player:null,opponent:null}};state.log=[];
    append('reset','Prova ripristinata ai valori iniziali.');
    return snapshotState(state);
  }
  return Object.freeze({version:VERSION,id:state.id,snapshot:()=>snapshotState(state),useTechnique,newRound,reset});
}

function audit(){
  const issues=[];
  try{
    const ids=catalog.ids();
    if(ids.length>=2){
      const session=createSession(ids[0],ids[1]);
      const shot=session.snapshot();
      if(shot.persistent!==false)issues.push('practice session must be non-persistent');
      if(shot.mode!=='practice')issues.push('practice session mode invalid');
    }
  }catch(error){issues.push('practice session failed: '+error.message);}
  const checks={version:VERSION,issues,ok:issues.length===0};root.JJKPracticeBattleAudit=checks;return checks;
}

const api=Object.freeze({version:VERSION,sides:SIDES,createSession,techniqueSupport,audit});
root.JJKPracticeBattle=api;
let initialAudit=null;try{initialAudit=audit();}catch(error){console.warn('JJK Practice Battle audit failed',error);}
try{root.dispatchEvent(new CustomEvent('jjk:practice-battle-ready',{detail:{version:VERSION,ok:!!initialAudit?.ok}}));}catch(_){}
console.info('JJK Energy Practice Battle ready',VERSION);
})(typeof window!=='undefined'?window:globalThis);
