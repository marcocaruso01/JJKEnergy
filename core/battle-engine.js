/* JJK 2.0 - isolated battle engine prototype */
(function(root){
'use strict';
if(root.JJK2BattleEngine)return;

const VERSION='2.0.0-alpha.1';

function create(fighterA,fighterB){
  return root.JJK2BattleState.create(fighterA,fighterB);
}

function getActive(state){
  return state.activeFighter==='A'?state.fighters.A:state.fighters.B;
}

function getOpponent(state){
  return state.activeFighter==='A'?state.fighters.B:state.fighters.A;
}

function useTechnique(state,technique,inputs={}){
  const attacker=getActive(state);
  const defender=getOpponent(state);
  const result=root.JJK2BattleRules.normalizeTechnique(attacker,technique,inputs);

  if(!result.available){
    return root.JJK2BattleState.appendLog(state,{
      type:'failed-action',
      reason:result.availabilityReason,
      technique:result.name
    });
  }

  const nextAttack={...attacker};
  const nextDefense={...defender};
  const cost=result.energyCost?.value||0;

  if(nextAttack.energy){
    nextAttack.energy={...nextAttack.energy,current:Math.max(0,nextAttack.energy.current-cost)};
  }

  let damage=0;
  if(result.combatScore?.known){
    damage=Math.max(0,result.combatScore.value);
    nextDefense.life={...nextDefense.life,current:Math.max(0,nextDefense.life.current-damage)};
  }

  let next={
    ...state,
    fighters:{
      A:state.activeFighter==='A'?nextAttack:nextDefense,
      B:state.activeFighter==='A'?nextDefense:nextAttack
    },
    turn:state.turn+1,
    activeFighter:state.activeFighter==='A'?'B':'A'
  };

  return root.JJK2BattleState.appendLog(next,{
    type:'technique',
    attacker:attacker.characterId,
    technique:result.name,
    cost,
    damage
  });
}

function audit(){
  return Object.freeze({ok:true,version:VERSION,legacyWrites:false});
}

root.JJK2BattleEngine=Object.freeze({version:VERSION,create,useTechnique,audit});
})(window);
