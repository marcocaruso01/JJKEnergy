'use strict';
const assert=require('node:assert/strict');
const rules=require('../v399-itadori-ui-progression.js');

assert.equal(rules.version,'39.9.0');
assert.equal(rules.maxLifeForFingers(0),4);
assert.equal(rules.maxLifeForFingers(4),4);
assert.equal(rules.maxLifeForFingers(8),5);
assert.equal(rules.maxLifeForFingers(12),6);
assert.equal(rules.maxLifeForFingers(16),7);
assert.equal(rules.maxLifeForFingers(20),8);
assert.equal(rules.thresholdUpgrade(4),'+1 Corpo permanente');
assert.equal(rules.thresholdUpgrade(8),'+1 Corpo permanente · +1 Vita massima');
assert.match(rules.thresholdUpgrade(12),/\+2 EM massima/);
assert.match(rules.thresholdUpgrade(16),/\+1 Vita massima/);
assert.match(rules.thresholdUpgrade(20),/\+1 Corpo permanente/);
assert.deepEqual(rules.fingerBonuses(20),{body:5,life:4,energy:6});
console.log('V39.9 Itadori UI/progression tests passed');
