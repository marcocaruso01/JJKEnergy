'use strict';
const assert=require('node:assert/strict');
const rules=require('../v400-counter-domain-fixes.js');

assert.equal(rules.version,'40.0.0');

assert.deepEqual(
  rules.resolveSoulDomain(16,[5,3],30,24,false),
  {slash:16,dice:[5,3],totalRoll:24,available:30,effectiveCost:24,paid:24,body:24,missing:0}
);

assert.deepEqual(
  rules.resolveSoulDomain(16,[5,3],20,24,false),
  {slash:16,dice:[5,3],totalRoll:24,available:20,effectiveCost:24,paid:20,body:20,missing:4}
);

assert.deepEqual(
  rules.resolveSoulDomain(16,[5,3],30,18,false),
  {slash:16,dice:[5,3],totalRoll:24,available:30,effectiveCost:18,paid:18,body:24,missing:0}
);

assert.deepEqual(
  rules.resolveSoulDomain(16,[5,3],0,24,true),
  {slash:16,dice:[5,3],totalRoll:24,available:0,effectiveCost:24,paid:0,body:24,missing:0}
);

console.log('V40 counter/domain rule tests passed');
