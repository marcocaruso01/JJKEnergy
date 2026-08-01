import { test, expect } from '@playwright/test';

async function openCleanPage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=404', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '#v21AuthGate{display:none!important;pointer-events:none!important}' });
  await page.waitForFunction(() => window.JJKV404?.audit?.().ok === true, null, { timeout: 15_000 });
  await page.waitForTimeout(3800);
}

test('legacy polling and obsolete observers are captured', async ({ page }) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await openCleanPage(page);
  const audit=await page.evaluate(()=>window.JJKV404.audit());
  expect(audit.blockedIntervals).toBeGreaterThanOrEqual(8);
  expect(audit.blockedObservers).toBeGreaterThanOrEqual(1);
  expect(audit.groups.state||0).toBeGreaterThan(0);
  expect(audit.wrappedFunctions).toBeGreaterThan(5);
  expect(errors).toEqual([]);
});

test('idle pages do not continuously execute captured UI refreshes', async ({ page }) => {
  await openCleanPage(page);
  const before=await page.evaluate(()=>({flushes:window.JJKV404.audit().flushCount,runs:window.JJKV404.blocked.reduce((sum,item)=>sum+item.runs,0),blocked:window.JJKV404.blocked.length}));
  await page.waitForTimeout(1800);
  const after=await page.evaluate(()=>({flushes:window.JJKV404.audit().flushCount,runs:window.JJKV404.blocked.reduce((sum,item)=>sum+item.runs,0),blocked:window.JJKV404.blocked.length}));
  expect(after.flushes-before.flushes).toBeLessThanOrEqual(1);
  expect(after.runs-before.runs).toBeLessThanOrEqual(Math.max(before.blocked,after.blocked));
});

test('a real state event performs a coordinated refresh', async ({ page }) => {
  await openCleanPage(page);
  const before=await page.evaluate(()=>window.JJKV404.audit().flushCount);
  await page.evaluate(()=>window.JJKV404.refresh('state','test'));
  await page.waitForTimeout(180);
  const after=await page.evaluate(()=>window.JJKV404.audit().flushCount);
  expect(after).toBeGreaterThanOrEqual(before+1);
  expect(after).toBeLessThanOrEqual(before+2);
});

test('characters and resource controls remain functional', async ({ page }) => {
  await openCleanPage(page);
  await page.evaluate(()=>window.openCharacter('gojo',{silentStats:true}));
  await page.waitForTimeout(250);
  const resourcesTab=page.getByRole('button',{name:/Risorse/});
  if(await resourcesTab.isVisible()){
    await resourcesTab.click();
    await page.waitForTimeout(180);
  }
  const before=Number(await page.locator('#energyValue').textContent());
  await page.locator('#energyActions .gain').first().click();
  await page.waitForTimeout(250);
  const after=Number(await page.locator('#energyValue').textContent());
  expect(after).toBe(before+1);
  expect(await page.locator('#techGrid > .tech-card').count()).toBeGreaterThan(0);
});
