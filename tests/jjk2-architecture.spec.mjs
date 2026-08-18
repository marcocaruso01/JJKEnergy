import { test, expect } from '@playwright/test';

async function openJJK2(page){
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=jjk2', { waitUntil:'domcontentloaded' });
  await page.waitForFunction(() => !!window.JJK2CharacterCatalog && !!window.JJK2GameState && !!window.JJK2LegacyBridge, null, {timeout:15000});
}

test('JJK2 architecture layer is installed without replacing legacy runtime', async ({page})=>{
  await openJJK2(page);
  const result=await page.evaluate(()=>({
    catalog:window.JJK2CharacterCatalog.audit(),
    state:window.JJK2GameState.audit(),
    bridge:window.JJK2LegacyBridge.audit()
  }));

  expect(result.catalog.ok).toBeTruthy();
  expect(result.state.ok).toBeTruthy();
  expect(result.bridge.gameState).toBeTruthy();
  expect(result.bridge.catalog).toBeTruthy();
  expect(result.bridge.writeThrough).toBeFalsy();
});

test('JJK2 mirror follows a legacy character selection', async ({page})=>{
  await openJJK2(page);
  await page.evaluate(()=>{
    window.openCharacter('gojo',{silentStats:true});
    window.JJK2LegacyBridge.sync('test-character-selection');
  });

  const state=await page.evaluate(()=>window.JJK2GameState.get());
  expect(state.characterId).toBe('gojo');
  expect(state.source).toContain('V40.4');
  expect(state.life.current).toBeGreaterThan(0);
});

test('JJK2 does not mutate legacy actions', async ({page})=>{
  await openJJK2(page);
  await page.evaluate(()=>window.openCharacter('gojo',{silentStats:true}));
  const before=await page.evaluate(()=>Number(window.energy));
  await page.evaluate(()=>window.gainEnergy(1));
  await page.waitForTimeout(100);
  const values=await page.evaluate(()=>({legacy:Number(window.energy),mirror:window.JJK2GameState.get().energy.current}));

  expect(values.legacy).toBe(before+1);
  expect(values.mirror).toBe(values.legacy);
});
