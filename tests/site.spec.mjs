import { test, expect } from '@playwright/test';

const characters = ['gojo', 'megumi', 'geto', 'sukuna', 'mahito', 'jogo', 'toji', 'itadori', 'yuta'];

async function openCleanPage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=3991', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '#v21AuthGate{display:none!important;pointer-events:none!important}' });
  await page.waitForFunction(() => window.JJKV395 && window.JJKV396 && window.JJKV397Runtime && window.__JJK_V398_INSTALLED__ && window.__JJK_V399_INSTALLED__, null, { timeout: 15_000 });
  await page.waitForTimeout(700);
}

async function setSpecialGrade(page) {
  await page.evaluate(() => {
    const grades = [...document.querySelectorAll('#gradeRow .grade-btn')];
    if (grades.length !== 6) throw new Error(`Expected 6 grade buttons, found ${grades.length}`);
    grades[grades.length - 1].click();
  });
  await page.waitForTimeout(220);
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
    giocoCleanup: window.JJKV396?.version,
    runtimeGuard: window.JJKV397Runtime?.version,
    itadoriRulesInstalled: !!window.__JJK_V398_INSTALLED__,
    itadoriUiInstalled: !!window.__JJK_V399_INSTALLED__
  }));
  expect(globals).toEqual({
    showScreen: 'function',
    openCharacter: 'function',
    techniqueFix: '39.7.1',
    giocoCleanup: '39.7.1',
    runtimeGuard: '39.7.0',
    itadoriRulesInstalled: true,
    itadoriUiInstalled: true
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
    await expect(page.locator('#gradeRow .grade-btn')).toHaveCount(6);
    await setSpecialGrade(page);
    await page.evaluate(() => window.JJKV395.rebind());

    const result = await page.evaluate(characterId => {
      const cards = [...document.querySelectorAll('#techGrid > .tech-card')]
        .filter(card => !card.classList.contains('v25-body-card') && card.dataset.utilityCard !== '1');
      const utilityCards = [...document.querySelectorAll('#techGrid > .v25-body-card')];
      const audit = window.JJKV395.audit();
      return {
        characterId,
        count: cards.length,
        audit,
        utilityCardsClean: utilityCards.every(card =>
          card.classList.contains('v397-utility-card') &&
          !card.classList.contains('tech-card') &&
          !card.dataset.techKey &&
          !card.querySelector('.use-btn')?.dataset.techKey
        ),
        badCards: cards.map(card => ({
          name: card.querySelector('.tech-name')?.textContent?.trim() || '',
          cardKey: card.dataset.techKey || '',
          buttonKey: card.querySelector('.use-btn')?.dataset.techKey || '',
          hasButton: !!card.querySelector('.use-btn')
        })).filter(card => !card.hasButton || !card.cardKey || card.cardKey !== card.buttonKey)
      };
    }, id);

    expect(result.count, `${id} must show techniques at SG`).toBeGreaterThan(0);
    expect(result.utilityCardsClean, `${id} utility card was not isolated from technique dispatch`).toBe(true);
    expect(result.badCards, `${id} contains a wrongly bound technique button`).toEqual([]);
    expect(result.audit?.character, `${id} audit points to another character`).toBe(id);
    expect(result.audit?.ok, `${id} technique identity audit failed`).toBe(true);
  }

  expect(runtime.localFailures).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});

test('Itadori uses one clean panel, announces finger upgrades and updates maximum Life', async ({ page }) => {
  const runtime = observeRuntime(page);
  await openCleanPage(page);
  await page.evaluate(() => window.openCharacter('itadori', { silentStats: true }));
  await page.waitForTimeout(350);

  const resourcesTab = page.getByRole('button', { name: /Risorse/ });
  if (await resourcesTab.isVisible()) {
    await resourcesTab.click();
    await page.waitForTimeout(220);
  }

  const sukunaButton = page.locator('[data-v392-sukuna]');
  await expect(sukunaButton).toBeVisible();
  for (let index = 0; index < 4; index += 1) {
    await sukunaButton.click();
    await page.waitForTimeout(160);
  }
  await page.waitForTimeout(700);

  await expect(page.locator('#lifeMaxValue')).toHaveText('8');
  await expect(page.locator('#itadoriChosoPanel')).toBeHidden();
  await expect(page.locator('#v37BloodNowBtn')).toHaveClass(/v399-inline-blood/);
  await page.waitForFunction(() => window.JJKV399Audit?.ok === true, null, { timeout: 5_000 });

  const state = await page.evaluate(() => {
    const panel = document.getElementById('v392ItadoriPanel');
    const blood = document.getElementById('v37BloodNowBtn');
    const obsolete = document.getElementById('itadoriChosoPanel');
    const notices = [...document.querySelectorAll('.v399-finger-toast')].map(element => element.textContent);
    return {
      panelExists: !!panel,
      bloodParent: blood?.parentElement?.id || '',
      obsoleteDisplay: obsolete ? getComputedStyle(obsolete).display : 'missing',
      maxLife: document.getElementById('lifeMaxValue')?.textContent || '',
      notices,
      audit: window.JJKV399Audit
    };
  });

  expect(state.panelExists).toBe(true);
  expect(state.bloodParent).toBe('v392ItadoriPanel');
  expect(['none', 'missing']).toContain(state.obsoleteDisplay);
  expect(state.maxLife).toBe('8');
  expect(state.notices.some(text => text.includes('4 Dita raggiunte'))).toBe(true);
  expect(state.notices.some(text => text.includes('20 Dita raggiunte'))).toBe(true);
  expect(state.audit?.ok).toBe(true);
  expect(runtime.localFailures).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});

test('Jogo displays only the V40.2 control system and hides obsolete panels', async ({ page }) => {
  const runtime = observeRuntime(page);
  await openCleanPage(page);
  await page.evaluate(() => window.openCharacter('jogo', { silentStats: true }));
  await setSpecialGrade(page);
  await page.waitForFunction(() => window.__JJK_V402_INSTALLED__ && document.getElementById('v402JogoPanel'));

  const state = await page.evaluate(() => {
    const legacy = document.getElementById('v27JogoTerrain');
    const v37 = document.getElementById('v37JogoPanel');
    const v392 = document.getElementById('v392JogoPanel');
    const active = document.getElementById('v402JogoPanel');
    const visiblePanels = [legacy, v37, v392, active].filter(element => element && getComputedStyle(element).display !== 'none');
    const disabledVisible = active ? [...active.querySelectorAll('button:disabled')].filter(button => getComputedStyle(button).display !== 'none').length : -1;
    return {
      activeExists: !!active,
      activeParent: active?.parentElement?.id || '',
      parentShown: document.getElementById('jogoPanel')?.classList.contains('show') || false,
      visiblePanelIds: visiblePanels.map(element => element.id),
      legacyDisplay: legacy ? getComputedStyle(legacy).display : 'missing',
      v37Display: v37 ? getComputedStyle(v37).display : 'missing',
      v392Display: v392 ? getComputedStyle(v392).display : 'missing',
      disabledVisible
    };
  });

  expect(state.activeExists).toBe(true);
  expect(state.activeParent).toBe('jogoPanel');
  expect(state.parentShown).toBe(true);
  expect(state.visiblePanelIds).toEqual(['v402JogoPanel']);
  expect(state.legacyDisplay).toBe('none');
  expect(['none', 'missing']).toContain(state.v37Display);
  expect(['none', 'missing']).toContain(state.v392Display);
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
    await page.waitForTimeout(150);
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
