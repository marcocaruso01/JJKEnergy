import { test, expect } from '@playwright/test';

async function openCleanPage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=410', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '#v21AuthGate{display:none!important;pointer-events:none!important}' });
  await page.waitForFunction(() => window.JJKBattleUI?.audit?.().ok === true && window.JJKPracticeBattle?.audit?.().ok === true, null, { timeout: 15_000 });
}

async function launchGojoVsMahito(page, grade = 'G4') {
  await openCleanPage(page);
  await page.evaluate(() => window.JJKBattleUI.open());
  await page.selectOption('#jjkBattlePlayerCharacter', 'gojo');
  await page.selectOption('#jjkBattlePlayerGrade', grade);
  await page.selectOption('#jjkBattleOpponentCharacter', 'mahito');
  await page.selectOption('#jjkBattleOpponentGrade', grade);
  await page.getByTestId('battle-launch').click();
  await expect(page.getByTestId('battle-arena')).toBeVisible();
}

test('V41.0 Battle UI boots and adds a home entry without replacing existing navigation', async ({ page }) => {
  await openCleanPage(page);
  const result = await page.evaluate(() => ({
    uiVersion: window.JJKBattleUI.version,
    controllerVersion: window.JJKPracticeBattle.version,
    uiAudit: window.JJKBattleUI.audit(),
    controllerAudit: window.JJKPracticeBattle.audit(),
    homeAction: !!document.getElementById('jjkBattlePracticeHome'),
    existingInfoAction: !!document.querySelector('.home-action-play')
  }));
  expect(result.uiVersion).toBe('41.0.0');
  expect(result.controllerVersion).toBe('41.0.0');
  expect(result.uiAudit.issues).toEqual([]);
  expect(result.controllerAudit.issues).toEqual([]);
  expect(result.homeAction).toBe(true);
  expect(result.existingInfoAction).toBe(true);
});

test('opening and launching practice battle never mutates live Game State', async ({ page }) => {
  await openCleanPage(page);
  await page.evaluate(() => window.JJKGameState.selectCharacter('itadori', { silentStats: true }));
  const before = await page.evaluate(() => window.JJKGameState.snapshot());
  await page.evaluate(() => window.JJKBattleUI.open());
  await page.selectOption('#jjkBattlePlayerCharacter', 'gojo');
  await page.selectOption('#jjkBattleOpponentCharacter', 'mahito');
  await page.getByTestId('battle-launch').click();
  const after = await page.evaluate(() => window.JJKGameState.snapshot());
  expect(after).toEqual(before);
});

test('practice arena renders both fighters, HUD resources and unlocked techniques', async ({ page }) => {
  await launchGojoVsMahito(page);
  await expect(page.locator('#jjkBattlePlayerHud')).toContainText('Satoru Gojo');
  await expect(page.locator('#jjkBattleOpponentHud')).toContainText('Mahito');
  await expect(page.locator('#jjkBattlePlayerHud')).toContainText('10 / 10');
  await expect(page.locator('#jjkBattleTechniques [data-tech-key="blu"]')).toBeVisible();
  const shot = await page.evaluate(() => window.JJKBattleUI.getSession().snapshot());
  expect(shot.mode).toBe('practice');
  expect(shot.persistent).toBe(false);
  expect(shot.player.characterId).toBe('gojo');
  expect(shot.opponent.characterId).toBe('mahito');
});

test('standard techniques consume only practice resources and compare Combat values', async ({ page }) => {
  await launchGojoVsMahito(page);
  await page.locator('#jjkBattleTechniques [data-tech-key="blu"]').click();
  let shot = await page.evaluate(() => window.JJKBattleUI.getSession().snapshot());
  expect(shot.player.resource.current).toBe(8);
  expect(shot.round.actions.player.techniqueKey).toBe('blu');
  expect(shot.round.actions.player.score).toBe(8);

  await page.locator('#battlePractice [data-side="opponent"]').click();
  await page.locator('#jjkBattleTechniques [data-tech-key="distorsione"]').click();
  shot = await page.evaluate(() => window.JJKBattleUI.getSession().snapshot());
  expect(shot.opponent.resource.current).toBe(5);
  expect(shot.round.actions.opponent.score).toBe(6);
  expect(shot.round.comparison).toEqual({ ready: true, winner: 'player', margin: 2, tie: false });
  await expect(page.locator('#jjkBattleResult')).toContainText('Satoru Gojo');
});

test('special techniques are visible but V41.0 refuses to invent their legacy effects', async ({ page }) => {
  await launchGojoVsMahito(page, 'G2');
  await page.locator('#jjkBattleTechniques [data-tech-key="infinito"]').click();
  const result = await page.evaluate(() => {
    const session = window.JJKBattleUI.getSession();
    const before = session.snapshot();
    const action = session.useTechnique('player', 'infinito');
    const after = session.snapshot();
    return { action, beforeEnergy: before.player.resource.current, afterEnergy: after.player.resource.current };
  });
  expect(result.action.ok).toBe(false);
  expect(result.action.reason).toBe('special-technique');
  expect(result.afterEnergy).toBe(result.beforeEnergy);
});

test('new practice round re-enables techniques without restoring spent resources', async ({ page }) => {
  await launchGojoVsMahito(page);
  await page.locator('#jjkBattleTechniques [data-tech-key="blu"]').click();
  await page.locator('#battlePractice [data-action="new-round"]').click();
  const shot = await page.evaluate(() => window.JJKBattleUI.getSession().snapshot());
  expect(shot.round.number).toBe(2);
  expect(shot.player.resource.current).toBe(8);
  expect(shot.player.used).toEqual([]);
  expect(shot.round.actions.player).toBeNull();
  expect(shot.round.actions.opponent).toBeNull();
});
