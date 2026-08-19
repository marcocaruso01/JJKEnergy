import { test, expect } from '@playwright/test';

async function openCleanPage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=409', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '#v21AuthGate{display:none!important;pointer-events:none!important}' });
  await page.waitForFunction(() => window.JJKBattleEngine?.audit?.().ok === true, null, { timeout: 15_000 });
}

async function openCharacter(page, characterId) {
  await openCleanPage(page);
  await page.evaluate(id => window.JJKGameState.selectCharacter(id, { silentStats: true }), characterId);
  await page.waitForFunction(id => window.JJKGameState.get('currentId') === id, characterId);
}

test('V40.9 Battle Engine boots above Catalog, Game State and Legacy Bridge', async ({ page }) => {
  await openCleanPage(page);
  const result = await page.evaluate(() => ({
    version: window.JJKBattleEngine.version,
    alias: window.JJKBattle === window.JJKBattleEngine,
    modes: window.JJKBattleEngine.modes,
    audit: window.JJKBattleEngine.audit(),
    catalog: window.JJKCharacterCatalog.audit(),
    state: window.JJKGameState.audit(),
    bridge: window.JJKLegacyBridge.audit()
  }));
  expect(result.version).toBe('40.9.0');
  expect(result.alias).toBe(true);
  expect(result.modes).toEqual({ LIVE: 'live', PRACTICE: 'practice' });
  expect(result.audit.issues).toEqual([]);
  expect(result.catalog.ok).toBe(true);
  expect(result.state.ok).toBe(true);
  expect(result.bridge.ok).toBe(true);
});

test('practice fighters are isolated snapshots and never replace the live character', async ({ page }) => {
  await openCharacter(page, 'gojo');
  const result = await page.evaluate(() => {
    const state = window.JJKGameState;
    const before = state.snapshot();
    const fighter = window.JJKBattleEngine.practiceFighter('toji', { gradeId: 'G1', combatBonus: 2 });
    const after = state.snapshot();
    return {
      fighter: {
        source: fighter.source,
        characterId: fighter.characterId,
        gradeId: fighter.gradeId,
        resource: fighter.resource,
        body: fighter.body,
        authoritative: fighter.authoritative,
        execution: fighter.execution
      },
      liveIdBefore: before.currentId,
      liveIdAfter: after.currentId,
      exactLiveCharacter: after.current === window.JJKCharacterCatalog.get('gojo'),
      stateUnchanged: window.JJKGameState.fields.every(name => {
        try { return JSON.stringify(before[name]) === JSON.stringify(after[name]); }
        catch (_) { return before[name] === after[name]; }
      })
    };
  });
  expect(result.fighter.source).toBe('practice');
  expect(result.fighter.characterId).toBe('toji');
  expect(result.fighter.gradeId).toBe('G1');
  expect(result.fighter.resource.kind).toBe('vigor');
  expect(result.fighter.resource.label).toBe('Vigore');
  expect(result.fighter.authoritative).toBe(false);
  expect(result.fighter.execution).toBe('preview-only');
  expect(result.liveIdBefore).toBe('gojo');
  expect(result.liveIdAfter).toBe('gojo');
  expect(result.exactLiveCharacter).toBe(true);
  expect(result.stateUnchanged).toBe(true);
});

test('practice technique visibility mirrors the current Itadori finger gate without mutating live state', async ({ page }) => {
  await openCharacter(page, 'gojo');
  const result = await page.evaluate(() => {
    const character = window.JJKCharacterCatalog.get('itadori');
    const fingerTechnique = character.techniques.find(item => item.fingerOnly && !item.instantWin) || character.techniques.find(item => item.fingerOnly);
    if (!fingerTechnique) return { missing: true };
    const required = Number(fingerTechnique.fingerReq) || 0;
    const locked = window.JJKBattleEngine.practiceFighter('itadori', { gradeId: 'G4', itadoriMaxFingers: Math.max(0, required - 1) });
    const unlocked = window.JJKBattleEngine.practiceFighter('itadori', { gradeId: 'G4', itadoriMaxFingers: required });
    const lockedView = locked.techniques.find(item => item.key === fingerTechnique.key);
    const unlockedView = unlocked.techniques.find(item => item.key === fingerTechnique.key);
    return {
      missing: false,
      key: fingerTechnique.key,
      required,
      locked: lockedView.unlocked,
      unlocked: unlockedView.unlocked,
      liveId: window.JJKGameState.get('currentId')
    };
  });
  expect(result.missing).toBe(false);
  expect(result.required).toBeGreaterThan(0);
  expect(result.locked).toBe(false);
  expect(result.unlocked).toBe(true);
  expect(result.liveId).toBe('gojo');
});

test('live fighter technique unlocks delegate to the authoritative legacy rule', async ({ page }) => {
  await openCharacter(page, 'itadori');
  const result = await page.evaluate(() => {
    const character = window.JJKCharacterCatalog.get('itadori');
    const fighter = window.JJKBattleEngine.liveFighter();
    const legacyEligibility = character.techniques.map(technique => ({
      key: technique.key,
      unlocked: (0, eval)('techniqueIsAvailable')(technique)
    }));
    return {
      source: fighter.source,
      authoritative: fighter.authoritative,
      exactCharacter: fighter.character === character,
      engineEligibility: fighter.techniques.map(item => ({ key: item.key, unlocked: item.unlocked })),
      legacyEligibility
    };
  });
  expect(result.source).toBe('live');
  expect(result.authoritative).toBe(true);
  expect(result.exactCharacter).toBe(true);
  expect(result.engineEligibility).toEqual(result.legacyEligibility);
});

test('practice sessions create two independent battle projections without a second persistent store', async ({ page }) => {
  await openCharacter(page, 'gojo');
  const result = await page.evaluate(() => {
    const before = window.JJKGameState.snapshot();
    const session = window.JJKBattleEngine.createPracticeSession('itadori', 'mahito', {
      player: { gradeId: 'G2', energy: 7 },
      opponent: { gradeId: 'G1', combatBonus: 1 }
    });
    const after = window.JJKGameState.snapshot();
    return {
      mode: session.mode,
      persistent: session.persistent,
      execution: session.execution,
      player: { id: session.player.characterId, source: session.player.source, grade: session.player.gradeId },
      opponent: { id: session.opponent.characterId, source: session.opponent.source, grade: session.opponent.gradeId },
      liveId: after.currentId,
      stateUnchanged: window.JJKGameState.fields.every(name => {
        try { return JSON.stringify(before[name]) === JSON.stringify(after[name]); }
        catch (_) { return before[name] === after[name]; }
      })
    };
  });
  expect(result.mode).toBe('practice');
  expect(result.persistent).toBe(false);
  expect(result.execution).toBe('preview-only');
  expect(result.player).toEqual({ id: 'itadori', source: 'practice', grade: 'G2' });
  expect(result.opponent).toEqual({ id: 'mahito', source: 'practice', grade: 'G1' });
  expect(result.liveId).toBe('gojo');
  expect(result.stateUnchanged).toBe(true);
});

test('live combat reset is a semantic command that still delegates to legacy gameplay', async ({ page }) => {
  await openCharacter(page, 'gojo');
  const result = await page.evaluate(() => {
    const state = window.JJKGameState;
    const key = window.JJKCharacterCatalog.get('gojo').techniques[0].key;
    state.patch({ used: [key] }, { persist: false, render: false, refresh: false, source: 'v409-test' });
    const before = state.get('used').slice();
    const fighter = window.JJKBattleEngine.resetLiveCombat();
    return {
      before,
      after: state.get('used').slice(),
      fighterUsed: fighter.used,
      source: fighter.source,
      id: fighter.characterId
    };
  });
  expect(result.before.length).toBe(1);
  expect(result.after).toEqual([]);
  expect(result.fighterUsed).toEqual([]);
  expect(result.source).toBe('live');
  expect(result.id).toBe('gojo');
});
