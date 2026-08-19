import { test, expect } from '@playwright/test';

async function openCleanPage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=408', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '#v21AuthGate{display:none!important;pointer-events:none!important}' });
  await page.waitForFunction(() => window.JJKLegacyBridge?.audit?.().ok === true && window.JJKGameState?.audit?.().ok === true, null, { timeout: 15_000 });
}

async function openGojo(page) {
  await openCleanPage(page);
  await page.evaluate(() => window.JJKGameState.selectCharacter('gojo', { silentStats: true }));
  await page.waitForFunction(() => window.JJKGameState.get('currentId') === 'gojo');
}

test('V40.8 Game State mirrors the live legacy state and Character Catalog identity', async ({ page }) => {
  await openGojo(page);
  const result = await page.evaluate(() => {
    const state = window.JJKGameState;
    const bridge = window.JJKLegacyBridge;
    const snapshot = state.snapshot();
    return {
      stateVersion: state.version,
      bridgeVersion: bridge.version,
      fieldCount: state.fields.length,
      id: state.get('currentId'),
      exactCurrent: state.get('current') === window.JJKCharacterCatalog.get('gojo'),
      energyMatches: snapshot.energy === (0, eval)('energy'),
      lifeMatches: snapshot.life === (0, eval)('life'),
      gradeMatches: snapshot.gradeId === (0, eval)('gradeId'),
      usedMatches: JSON.stringify(snapshot.used) === JSON.stringify((0, eval)('used')),
      stateAudit: state.audit(),
      bridgeAudit: bridge.audit()
    };
  });
  expect(result.stateVersion).toBe('40.8.0');
  expect(result.bridgeVersion).toBe('40.8.0');
  expect(result.fieldCount).toBeGreaterThanOrEqual(20);
  expect(result.id).toBe('gojo');
  expect(result.exactCurrent).toBe(true);
  expect(result.energyMatches).toBe(true);
  expect(result.lifeMatches).toBe(true);
  expect(result.gradeMatches).toBe(true);
  expect(result.usedMatches).toBe(true);
  expect(result.stateAudit.issues).toEqual([]);
  expect(result.bridgeAudit.issues).toEqual([]);
});

test('Legacy Bridge reads and writes the same lexical state without creating a duplicate store', async ({ page }) => {
  await openGojo(page);
  const result = await page.evaluate(() => {
    const bridge = window.JJKLegacyBridge;
    const before = bridge.read('energy');
    bridge.write('energy', before + 3);
    const afterBridge = bridge.read('energy');
    const afterLegacy = (0, eval)('energy');
    bridge.write('energy', before);
    return {
      before,
      afterBridge,
      afterLegacy,
      restored: (0, eval)('energy'),
      hasWindowShadow: Object.prototype.hasOwnProperty.call(window, 'energy')
    };
  });
  expect(result.afterBridge).toBe(result.before + 3);
  expect(result.afterLegacy).toBe(result.before + 3);
  expect(result.restored).toBe(result.before);
  expect(result.hasWindowShadow).toBe(false);
});

test('Game State patch updates multiple legacy fields atomically and emits one semantic event', async ({ page }) => {
  await openGojo(page);
  const result = await page.evaluate(() => {
    const state = window.JJKGameState;
    const before = { energy: state.get('energy'), combatBonus: state.get('combatBonus') };
    let events = 0;
    let detail = null;
    const handler = event => { events += 1; detail = event.detail; };
    window.addEventListener('jjk:state-change', handler);
    const change = state.patch(
      { energy: before.energy + 2, combatBonus: before.combatBonus + 1 },
      { persist: false, render: false, refresh: false, source: 'v408-test' }
    );
    const after = {
      energy: (0, eval)('energy'),
      combatBonus: (0, eval)('combatBonus'),
      events,
      detail,
      changed: change.changed
    };
    window.removeEventListener('jjk:state-change', handler);
    state.patch(before, { persist: false, render: false, refresh: false, source: 'v408-test-restore' });
    return after;
  });
  expect(result.energy).toBeGreaterThan(0);
  expect(result.changed.sort()).toEqual(['combatBonus', 'energy']);
  expect(result.events).toBe(1);
  expect(result.detail.source).toBe('v408-test');
  expect(result.detail.fields.sort()).toEqual(['combatBonus', 'energy']);
});

test('Game State roomSnapshot remains wire-compatible with the existing multiplayer snapshot', async ({ page }) => {
  await openGojo(page);
  const result = await page.evaluate(() => {
    const legacy = (0, eval)('buildLocalPlayerState')();
    const modern = window.JJKGameState.roomSnapshot({ updatedAt: legacy.updatedAt });
    return {
      same: JSON.stringify(modern) === JSON.stringify(legacy),
      legacy,
      modern,
      roomFields: window.JJKGameState.roomFields
    };
  });
  expect(result.same).toBe(true);
  expect(result.modern.characterId).toBe('gojo');
  expect(result.modern.maxLife).toBe(result.legacy.maxLife);
  expect(result.roomFields).toEqual(Object.keys(result.modern));
});

test('existing gameplay mutations remain authoritative and are immediately visible through Game State', async ({ page }) => {
  await openGojo(page);
  const result = await page.evaluate(() => {
    const state = window.JJKGameState;
    const before = state.get('energy');
    (0, eval)('gainEnergy')(1);
    return {
      before,
      afterState: state.get('energy'),
      afterLegacy: (0, eval)('energy'),
      visible: Number(document.getElementById('energyValue')?.textContent)
    };
  });
  expect(result.afterState).toBe(result.before + 1);
  expect(result.afterLegacy).toBe(result.before + 1);
  expect(result.visible).toBe(result.before + 1);
});
