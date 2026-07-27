import { test, expect } from '@playwright/test';

const characters = ['gojo', 'megumi', 'geto', 'sukuna', 'mahito', 'jogo', 'toji', 'itadori', 'yuta'];

async function openCleanPage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=397', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.JJKV395 && window.JJKV396, null, { timeout: 15_000 });
  await page.waitForTimeout(700);
}

function observeRuntime(page) {
  const pageErrors = [];
  const localFailures = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => {
    const url = request.url();
    if (url.startsWith('http://127.0.0.1:4173/')) {
      localFailures.push(`${request.method()} ${url}: ${request.failure()?.errorText || 'failed'}`);
    }
  });
  return { pageErrors, localFailures };
}

test('home loads without uncaught errors, missing local files or duplicate runtime IDs', async ({ page }) => {
  const runtime = observeRuntime(page);
  await openCleanPage(page);

  await expect(page.locator('#home')).toHaveClass(/active/);
  await expect(page.locator('#home')).toBeVisible();

  const globals = await page.evaluate(() => ({
    showScreen: typeof window.showScreen,
    openCharacter: typeof window.openCharacter,
    techniqueFix: window.JJKV395?.version,
    jogoCleanup: window.JJKV396?.version
  }));
  expect(globals).toEqual({
    showScreen: 'function',
    openCharacter: 'function',
    techniqueFix: '39.5.0',
    jogoCleanup: '39.6.0'
  });

  const duplicates = await page.evaluate(() => {
    const seen = new Set();
    const repeated = new Set();
    document.querySelectorAll('[id]').forEach(element => {
      if (seen.has(element.id)) repeated.add(element.id);
      seen.add(element.id);
    });
    return [...repeated];
  });

  expect(duplicates).toEqual([]);
  expect(runtime.localFailures).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});

test('all characters render and every technique card keeps its exact key', async ({ page }) => {
  const runtime = observeRuntime(page);
  await openCleanPage(page);

  for (const id of characters) {
    await page.evaluate(characterId => window.openCharacter(characterId, { silentStats: true }), id);
    await expect(page.locator('#player')).toHaveClass(/active/);

    const grades = page.locator('#gradeRow .grade-btn');
    await expect(grades).toHaveCount(6);
    await grades.last().click();
    await page.waitForTimeout(180);
    await page.evaluate(() => window.JJKV395.rebind());

    const result = await page.evaluate(characterId => {
      const cards = [...document.querySelectorAll('#techGrid > .tech-card')];
      const audit = window.JJKV395.audit();
      return {
        characterId,
        count: cards.length,
        audit,
        badCards: cards.map(card => ({
          name: card.querySelector('.tech-name')?.textContent?.trim() || '',
          cardKey: card.dataset.techKey || '',
          buttonKey: card.querySelector('.use-btn')?.dataset.techKey || '',
          hasButton: !!card.querySelector('.use-btn')
        })).filter(card => !card.hasButton || !card.cardKey || card.cardKey !== card.buttonKey)
      };
    }, id);

    expect(result.count, `${id} must show techniques at SG`).toBeGreaterThan(0);
    expect(result.badCards, `${id} contains a wrongly bound technique button`).toEqual([]);
    expect(result.audit?.character, `${id} audit points to another character`).toBe(id);
    expect(result.audit?.ok, `${id} technique identity audit failed`).toBe(true);
  }

  expect(runtime.localFailures).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});

test('Jogo displays one compact control system and hides obsolete panels', async ({ page }) => {
  const runtime = observeRuntime(page);
  await openCleanPage(page);
  await page.evaluate(() => window.openCharacter('jogo', { silentStats: true }));
  await page.locator('#gradeRow .grade-btn').last().click();
  await page.waitForTimeout(350);
  await page.evaluate(() => window.JJKV396.clean());

  const state = await page.evaluate(() => {
    const legacy = document.getElementById('v27JogoTerrain');
    const duplicate = document.getElementById('v392JogoPanel');
    const active = document.getElementById('v37JogoPanel');
    const visiblePanels = [legacy, duplicate, active].filter(element => element && getComputedStyle(element).display !== 'none');
    const disabledVisible = active ? [...active.querySelectorAll('button:disabled')].filter(button => getComputedStyle(button).display !== 'none').length : -1;
    return {
      activeExists: !!active,
      activeParent: active?.parentElement?.id || '',
      visiblePanelIds: visiblePanels.map(element => element.id),
      legacyDisplay: legacy ? getComputedStyle(legacy).display : 'missing',
      duplicateDisplay: duplicate ? getComputedStyle(duplicate).display : 'missing',
      disabledVisible
    };
  });

  expect(state.activeExists).toBe(true);
  expect(state.activeParent).toBe('jogoPanel');
  expect(state.visiblePanelIds).toEqual(['v37JogoPanel']);
  expect(state.legacyDisplay).toBe('none');
  expect(['none', 'missing']).toContain(state.duplicateDisplay);
  expect(state.disabledVisible).toBe(0);
  expect(runtime.localFailures).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});

test('mobile pages do not create destructive horizontal overflow', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Mobile-only layout audit');
  const runtime = observeRuntime(page);
  await openCleanPage(page);

  const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(homeOverflow).toBeLessThanOrEqual(3);

  for (const id of characters) {
    await page.evaluate(characterId => window.openCharacter(characterId, { silentStats: true }), id);
    await page.waitForTimeout(120);
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    }));
    expect(overflow.overflow, `${id} overflows mobile viewport: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(8);
  }

  expect(runtime.localFailures).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});
