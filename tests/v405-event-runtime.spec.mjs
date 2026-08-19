import { test, expect } from '@playwright/test';

async function openCleanPage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=405', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '#v21AuthGate{display:none!important;pointer-events:none!important}' });
  await page.waitForFunction(() => window.JJKV405?.audit?.().ok === true, null, { timeout: 15_000 });
  await page.waitForTimeout(3800);
}

test('V40.5 leaves no native interval from known legacy UI modules', async ({ page }) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await openCleanPage(page);
  const audit=await page.evaluate(()=>window.JJKV405.audit());
  expect(audit.version).toBe('40.5.0');
  expect(audit.legacyNativeIntervals).toBe(0);
  expect(audit.wrappedFunctions).toBeGreaterThan(5);
  expect(errors).toEqual([]);
});

test('idle UI stays idle instead of re-rendering on a timer', async ({ page }) => {
  await openCleanPage(page);
  const before=await page.evaluate(()=>({flushes:window.JJKV405.audit().flushCount,runs:window.JJKV405.blocked.reduce((sum,item)=>sum+item.runs,0)}));
  await page.waitForTimeout(2200);
  const after=await page.evaluate(()=>({flushes:window.JJKV405.audit().flushCount,runs:window.JJKV405.blocked.reduce((sum,item)=>sum+item.runs,0)}));
  expect(after.flushes-before.flushes).toBeLessThanOrEqual(1);
  expect(after.runs-before.runs).toBeLessThanOrEqual(1);
});

test('a real resource change still refreshes the character state', async ({ page }) => {
  await openCleanPage(page);
  await page.evaluate(()=>window.openCharacter('gojo',{silentStats:true}));
  await page.waitForTimeout(250);
  const before=Number(await page.locator('#energyValue').textContent());
  await page.evaluate(()=>window.gainEnergy(1));
  await page.waitForTimeout(250);
  const after=Number(await page.locator('#energyValue').textContent());
  expect(after).toBe(before+1);
  expect(await page.locator('#techGrid > .tech-card').count()).toBeGreaterThan(0);
});

test('V40.4 compatibility API still points at V40.5', async ({ page }) => {
  await openCleanPage(page);
  const result=await page.evaluate(()=>({same:window.JJKV404===window.JJKV405,version:window.JJKV404?.version}));
  expect(result).toEqual({same:true,version:'40.5.0'});
});
