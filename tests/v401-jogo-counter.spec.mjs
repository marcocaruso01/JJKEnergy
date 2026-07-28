import { test, expect } from '@playwright/test';

async function openCleanPage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=402', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '#v21AuthGate{display:none!important;pointer-events:none!important}' });
  await page.waitForFunction(() => window.__JJK_V402_INSTALLED__ && window.JJKV402Audit?.ok === true, null, { timeout: 15_000 });
}

test('Jogo uses one counter and rejects stale rewrites and stale snapshots', async ({ page }) => {
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

  const summary = page.locator('#v402JogoSummary');
  await expect(summary).toContainText('1 Vulcani · 0 Crateri');
  await expect(page.locator('#v37JogoPanel')).toBeHidden();
  await expect(page.locator('#v392JogoPanel')).toBeHidden();

  await page.evaluate(() => {
    let index = 0;
    const values = [0, 1, 2, 0, 2, 1];
    window.__v402Oscillation = setInterval(() => {
      const value = values[index++ % values.length];
      (0, eval)(`jogoVolcanoes = ${value}`);
      (0, eval)(`jogoCraters = ${value}`);
      window.renderAll();
    }, 70);
  });

  for (let sample = 0; sample < 8; sample += 1) {
    await page.waitForTimeout(160);
    await expect(summary).toContainText('1 Vulcani · 0 Crateri');
  }

  await page.evaluate(() => {
    clearInterval(window.__v402Oscillation);
    const stale = {
      characterId: 'jogo',
      gradeId: 'G3',
      giocoVolcanoes: 0,
      giocoCraters: 2,
      jogoVolcanoes: 0,
      jogoCraters: 2,
      jogoVolcanoMovesUsed: 0,
      giocoEruptionUsed: false,
      jogoEruptionUsed: false,
      updatedAt: 1
    };
    window.applyRoomPlayerStateSnapshot(stale, true);
  });

  await page.waitForTimeout(500);
  await expect(summary).toContainText('1 Vulcani · 0 Crateri');
  expect(pageErrors).toEqual([]);
});
