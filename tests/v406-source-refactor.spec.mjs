import { test, expect } from '@playwright/test';

async function openCleanPage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=406', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '#v21AuthGate{display:none!important;pointer-events:none!important}' });
  await page.waitForFunction(() => window.JJKV406?.audit?.().ok === true, null, { timeout: 15_000 });
  await page.waitForTimeout(3800);
}

const SOURCE_REFACTORED = [
  'v37-update.js','v362-rules-hotfix.js','v392-gameplay.js','v394-technique-fix.js',
  'v398-itadori-variable-rules.js','gameplay-v25.js','events-v26.js','events-v26-2.js'
];

test('V40.6 source-refactored modules no longer register recurring UI polling', async ({ page }) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await openCleanPage(page);
  const result=await page.evaluate(files=>({
    version:window.JJKV406.audit().version,
    blocked:window.JJKV406.blocked.filter(item=>files.includes(item.file)),
    legacyNative:window.JJKV406.audit().legacyNativeIntervals
  }),SOURCE_REFACTORED);
  expect(result.version).toBe('40.6.0');
  expect(result.blocked).toEqual([]);
  expect(result.legacyNative).toBe(0);
  expect(errors).toEqual([]);
});

test('idle character UI stays quiet after the deeper refactor', async ({ page }) => {
  await openCleanPage(page);
  await page.evaluate(()=>window.openCharacter('gojo',{silentStats:true}));
  await page.waitForTimeout(300);
  const before=await page.evaluate(()=>({flushes:window.JJKV406.audit().flushCount,runs:window.JJKV406.blocked.reduce((sum,item)=>sum+item.runs,0)}));
  await page.waitForTimeout(2400);
  const after=await page.evaluate(()=>({flushes:window.JJKV406.audit().flushCount,runs:window.JJKV406.blocked.reduce((sum,item)=>sum+item.runs,0)}));
  expect(after.flushes-before.flushes).toBeLessThanOrEqual(1);
  expect(after.runs-before.runs).toBeLessThanOrEqual(1);
});

test('actual resource and technique state changes still propagate', async ({ page }) => {
  await openCleanPage(page);
  await page.evaluate(()=>window.openCharacter('gojo',{silentStats:true}));
  await page.waitForTimeout(250);
  const before=Number(await page.locator('#energyValue').textContent());
  await page.evaluate(()=>window.gainEnergy(1));
  await page.waitForTimeout(300);
  const after=Number(await page.locator('#energyValue').textContent());
  expect(after).toBe(before+1);
  expect(await page.locator('#techGrid > .tech-card').count()).toBeGreaterThan(0);
});

test('network and clock timers remain allowed while legacy UI polling stays blocked', async ({ page }) => {
  await openCleanPage(page);
  const result=await page.evaluate(()=>({
    aliases:window.JJKV404===window.JJKV406&&window.JJKV405===window.JJKV406,
    native:window.JJKV406.nativeIntervals.map(item=>({file:item.file,delay:item.delay,source:item.source}))
  }));
  expect(result.aliases).toBe(true);
  expect(result.native.length).toBeGreaterThan(0);
  const forbidden=[...SOURCE_REFACTORED,'gm-ai.js'];
  expect(result.native.filter(item=>forbidden.includes(item.file))).toEqual([]);
});
