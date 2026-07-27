'use strict';
const assert=require('node:assert/strict');
const rules=require('../v398-itadori-variable-rules.js');

assert.equal(rules.version,'39.8.0');

assert.deepEqual(
  rules.resolveVariableCost(16,14,16,false),
  {roll:16,available:14,paid:14,body:14,missing:2,effectiveCost:16}
);
assert.deepEqual(
  rules.resolveVariableCost(16,14,13,false),
  {roll:16,available:14,paid:13,body:14,missing:2,effectiveCost:13}
);
assert.deepEqual(
  rules.resolveVariableCost(24,0,24,false),
  {roll:24,available:0,paid:0,body:0,missing:24,effectiveCost:24}
);
assert.deepEqual(
  rules.resolveVariableCost(24,3,24,true),
  {roll:24,available:3,paid:0,body:24,missing:0,effectiveCost:24}
);

assert.deepEqual(rules.fingerBonuses(0),{body:0,life:0,energy:0});
assert.deepEqual(rules.fingerBonuses(4),{body:1,life:0,energy:0});
assert.deepEqual(rules.fingerBonuses(8),{body:2,life:1,energy:0});
assert.deepEqual(rules.fingerBonuses(12),{body:3,life:2,energy:2});
assert.deepEqual(rules.fingerBonuses(16),{body:4,life:3,energy:4});
assert.deepEqual(rules.fingerBonuses(20),{body:5,life:4,energy:6});

assert.deepEqual(rules.analyzeBlackFlash([1,1,4,6]),{ok:true,rolls:[1,1,4,6],sum:12,error:null});
assert.equal(rules.analyzeBlackFlash([4,3]).ok,false);
assert.equal(rules.analyzeBlackFlash([0,2]).ok,false);

const itadori=rules.itadoriBlueprint();
assert.equal(itadori.maxLife,4);
assert.equal(itadori.baseBody,4);
assert.equal(itadori.coins,1);
assert.deepEqual(itadori.grades.map(grade=>grade.exp),[0,9,19,30,42,50]);
assert.deepEqual(itadori.grades.map(grade=>grade.max),[10,12,15,18,20,21]);
assert.deepEqual(
  itadori.techniques.map(technique=>technique.key),
  ['pugno_divergente','black_flash_itadori','manipolazione_sangue','freccia_itadori','richiamo_anima_sukuna','immortalita']
);
assert.match(itadori.innateEffect,/fino a 12/);
assert.match(itadori.innateEffect,/5 Dita/);
assert.match(itadori.innateEffect,/10 Dita/);
assert.equal(itadori.techniques[0].cost,4);
assert.equal(itadori.techniques[0].bonus,4);
assert.equal(itadori.techniques[3].cost,10);
assert.equal(itadori.techniques[3].bonus,10);
assert.equal(itadori.techniques[3].lifeCost,1);

assert.equal(rules.audit().ok,true);
console.log('V39.8 requested rules tests passed');
