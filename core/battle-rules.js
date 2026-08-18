/* JJK 2.0 - isolated battle rule helpers. Does not write to the V40.4 runtime. */
(function(root){
'use strict';
if(root.JJK2BattleRules)return;

const VERSION='2.0.0-alpha.1';
const GRADE_ORDER=Object.freeze(['G4','G3','G2','G1','SS','SG']);
const SAFE_TECHNIQUE_KEYS=new Set(['key','name','grade','cost','bonus','image','badge']);

function number(value,fallback=0){
  const parsed=Number(value);
  return Number.isFinite(parsed)?parsed:fallback;
}

function gradeRank(id){
  const index=GRADE_ORDER.indexOf(String(id||''));
  return index<0?-1:index;
}

function gradeUnlocked(currentGrade,requiredGrade){
  const current=gradeRank(currentGrade);
  const required=gradeRank(requiredGrade);
  if(current<0||required<0)return false;
  return current>=required;
}

function specialFlags(technique){
  if(!technique||typeof technique!=='object')return [];
  return Object.keys(technique).filter(key=>{
    if(SAFE_TECHNIQUE_KEYS.has(key))return false;
    if(key==='extra')return true;
    return !!technique[key];
  });
}

function requiresSpecialResolution(characterId,technique){
  if(!technique)return true;
  if(characterId==='jogo')return true;
  if(technique.dynamicCost||technique.tokenCost||technique.lifeCost)return true;
  if(typeof technique.bonus!=='number')return true;
  return specialFlags(technique).length>0;
}

function effectiveEnergyCost(fighter,technique,inputs={}){
  if(fighter?.resources?.bossRushActive)return {known:true,value:0,reason:'boss-rush'};
  if(fighter?.characterId==='jogo')return {known:true,value:0,reason:'jogo-life-energy'};
  if(technique?.dynamicCost){
    const dynamic=Number(inputs.energyCost??inputs.cost??inputs.roll);
    return Number.isFinite(dynamic)&&dynamic>=0
      ?{known:true,value:dynamic,reason:'dynamic-input'}
      :{known:false,value:null,reason:'dynamic-input-required'};
  }
  return {known:true,value:Math.max(0,number(technique?.cost)),reason:'catalog'};
}

function techniqueAvailability(fighter,technique,inputs={}){
  if(!fighter||!technique)return {available:false,reason:'missing-data'};
  if(!gradeUnlocked(fighter.gradeId,technique.grade))return {available:false,reason:'grade-locked'};
  if(Array.isArray(fighter.usedTechniqueKeys)&&fighter.usedTechniqueKeys.includes(technique.key))return {available:false,reason:'already-used'};

  const energyCost=effectiveEnergyCost(fighter,technique,inputs);
  if(energyCost.known&&number(fighter.energy?.current)<energyCost.value)return {available:false,reason:'energy',energyCost};
  if(technique.tokenCost&&number(fighter.resources?.tokens)<number(technique.tokenCost))return {available:false,reason:'tokens',energyCost};
  if(technique.lifeCost&&number(fighter.life?.current)<=number(technique.lifeCost))return {available:false,reason:'life',energyCost};

  return {
    available:true,
    reason:requiresSpecialResolution(fighter.characterId,technique)?'special-resolution':'ready',
    energyCost,
    requiresSpecialResolution:requiresSpecialResolution(fighter.characterId,technique)
  };
}

function combatScore(fighter,technique,inputs={}){
  if(!fighter||!technique)return {known:false,value:null,reason:'missing-data'};
  if(typeof technique.bonus!=='number')return {known:false,value:null,reason:'special-technique'};
  const base=number(fighter.body?.base);
  const combatBonus=number(fighter.body?.combatBonus);
  const manualBonus=number(inputs.manualBonus);
  return {
    known:true,
    value:base+combatBonus+number(technique.bonus)+manualBonus,
    parts:Object.freeze({base,technique:number(technique.bonus),combatBonus,manualBonus})
  };
}

function normalizeTechnique(fighter,technique,inputs={}){
  const availability=techniqueAvailability(fighter,technique,inputs);
  const score=combatScore(fighter,technique,inputs);
  return Object.freeze({
    key:technique?.key||'',
    name:technique?.name||technique?.key||'Tecnica',
    grade:technique?.grade||null,
    image:technique?.image||'',
    rawCost:Math.max(0,number(technique?.cost)),
    tokenCost:Math.max(0,number(technique?.tokenCost)),
    lifeCost:Math.max(0,number(technique?.lifeCost)),
    dynamicCost:!!technique?.dynamicCost,
    bonus:typeof technique?.bonus==='number'?technique.bonus:null,
    available:availability.available,
    availabilityReason:availability.reason,
    energyCost:availability.energyCost||effectiveEnergyCost(fighter,technique,inputs),
    combatScore:score,
    requiresSpecialResolution:requiresSpecialResolution(fighter?.characterId,technique),
    specialFlags:Object.freeze(specialFlags(technique))
  });
}

function listTechniques(fighter,definition){
  const source=definition?.techniques||[];
  return Object.freeze(source.map(technique=>normalizeTechnique(fighter,technique)));
}

function audit(){
  return Object.freeze({
    ok:true,
    version:VERSION,
    gradeOrder:GRADE_ORDER,
    writesLegacy:false,
    damageModel:'external-resolution'
  });
}

root.JJK2BattleRules=Object.freeze({
  version:VERSION,
  gradeOrder:GRADE_ORDER,
  gradeRank,
  gradeUnlocked,
  specialFlags,
  requiresSpecialResolution,
  effectiveEnergyCost,
  techniqueAvailability,
  combatScore,
  normalizeTechnique,
  listTechniques,
  audit
});
})(window);
