import { test, expect } from '@playwright/test';

async function openCleanPage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=401', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '#v21AuthGate{display:none!important;pointer-events:none!important}' });
  await page.waitForFunction(() => window.__JJK_V401_INSTALLED__ && window.JJKV401Audit?.ok === true, null, { timeout: 15_000 });
}

test('Jogo visible counter ignores stale 0-1-2 rewrites', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await openCleanPage(page);
  await page.evaluate(() => window.openCharacter('jogo', { silentStats: true }));
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    (0, eval)('gradeId = "G3"');
    (0, eval)('energy = 100');
    window.renderAll();
    window.useTechnique('vulcani');
  });

  const stableSummary = page.locator('#v401JogoSummary');
  await expect(stableSummary).toContainText('1 Vulcani · 0 Crateri');
  await expect(page.locator('#v37JogoSummary')).toBeHidden();

  await page.evaluate(() => {
    let index = 0;
    const values = [0, 1, 2, 0, 2, 1];
    window.__v401Oscillation = setInterval(() => {
      const value = values[index++ % values.length];
      (0, eval)(`jogoVolcanoes = ${value}`);
      (0, eval)(`jogoCraters = ${value}`);
    }, 70);
  });

  for (let sample = 0; sample < 8; sample += 1) {
    await page.waitForTimeout(160);
    await expect(stableSummary).toContainText('1 Vulcani · 0 Crateri');
  }

  await page.evaluate(() => clearInterval(window.__v401Oscillation));
  await page.waitForTimeout(600);
  await expect(stableSummary).toContainText('1 Vulcani · 0 Crateri');
  expect(pageErrors).toEqual([]);
});
