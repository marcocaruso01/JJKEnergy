import { test, expect } from '@playwright/test';

async function openCleanPage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=400', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '#v21AuthGate{display:none!important;pointer-events:none!important}' });
  await page.waitForFunction(() => window.__JJK_V400_INSTALLED__ && window.JJKV400Audit?.ok === true, null, { timeout: 15_000 });
  await page.waitForTimeout(700);
}

function observeRuntime(page) {
  const pageErrors = [];
  const localFailures = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => {
    const url = request.url();
    if (url.startsWith('http://127.0.0.1:4173/')) localFailures.push(`${request.method()} ${url}: ${request.failure()?.errorText || 'failed'}`);
  });
  return { pageErrors, localFailures };
}

test('Itadori finger counter does not jump during background refreshes', async ({ page }) => {
  const runtime = observeRuntime(page);
  await openCleanPage(page);
  await page.evaluate(() => window.openCharacter('itadori', { silentStats: true }));
  const resourcesTab = page.getByRole('button', { name: /Risorse/ });
  if (await resourcesTab.isVisible()) await resourcesTab.click();
  await page.waitForTimeout(900);

  const panel = page.locator('#v392ItadoriPanel');
  await expect(panel).toBeVisible();
  await expect(page.locator('#v37ItadoriPanel')).toBeHidden();

  const before = await panel.boundingBox();
  await page.waitForTimeout(3000);
  const after = await panel.boundingBox();

  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
  expect(runtime.localFailures).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});

test('Jogo volcano and crater counters refresh automatically from gameplay state', async ({ page }) => {
  const runtime = observeRuntime(page);
  await openCleanPage(page);
  await page.evaluate(() => window.openCharacter('jogo', { silentStats: true }));
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    (0, eval)('jogoVolcanoes = 2');
    (0, eval)('jogoCraters = 3');
  });

  await expect(page.locator('#v37JogoSummary')).toContainText('2 Vulcani · 3 Crateri');

  await page.evaluate(() => {
    (0, eval)('jogoVolcanoes = 1');
    (0, eval)('jogoCraters = 4');
  });

  await expect(page.locator('#v37JogoSummary')).toContainText('1 Vulcani · 4 Crateri');
  expect(runtime.localFailures).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});
