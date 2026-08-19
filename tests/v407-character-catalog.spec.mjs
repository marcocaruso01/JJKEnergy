import { test, expect } from '@playwright/test';

async function openCleanPage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=407', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '#v21AuthGate{display:none!important;pointer-events:none!important}' });
  await page.waitForFunction(() => window.JJKCharacterCatalog?.audit?.().ok === true, null, { timeout: 15_000 });
}

test('V40.7 Character Catalog mirrors the complete legacy roster without copying it', async ({ page }) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await openCleanPage(page);
  const result=await page.evaluate(() => {
    const legacy=(0,eval)('characters');
    const catalog=window.JJKCharacterCatalog;
    return {
      version:catalog.version,
      ids:catalog.ids(),
      legacyIds:Object.keys(legacy),
      sameGojo:catalog.get('gojo')===legacy.gojo,
      sameItadori:catalog.get('itadori')===legacy.itadori,
      sameJogo:catalog.get('jogo')===legacy.jogo,
      audit:catalog.audit()
    };
  });
  expect(result.version).toBe('40.7.0');
  expect(result.ids).toEqual(result.legacyIds);
  expect(result.ids.length).toBeGreaterThanOrEqual(6);
  expect(result.sameGojo).toBe(true);
  expect(result.sameItadori).toBe(true);
  expect(result.sameJogo).toBe(true);
  expect(result.audit.issues).toEqual([]);
  expect(errors).toEqual([]);
});

test('catalog semantic lookups resolve the exact grade and technique objects', async ({ page }) => {
  await openCleanPage(page);
  const result=await page.evaluate(() => {
    const legacy=(0,eval)('characters');
    const catalog=window.JJKCharacterCatalog;
    return {
      gojoTechnique:catalog.technique('gojo','blu')===legacy.gojo.techniques.find(item=>item.key==='blu'),
      gojoGrade:catalog.grade('gojo','G4')===legacy.gojo.grades.find(item=>item.id==='G4'),
      missingCharacter:catalog.get('__missing__'),
      missingTechnique:catalog.technique('gojo','__missing__')
    };
  });
  expect(result.gojoTechnique).toBe(true);
  expect(result.gojoGrade).toBe(true);
  expect(result.missingCharacter).toBeNull();
  expect(result.missingTechnique).toBeNull();
});

test('catalog remains live after gameplay patches mutate authoritative character blueprints', async ({ page }) => {
  await openCleanPage(page);
  await page.waitForFunction(() => window.__JJK_V392_INSTALLED__ === true, null, { timeout: 15_000 });
  const result=await page.evaluate(() => {
    const legacy=(0,eval)('characters');
    const catalog=window.JJKCharacterCatalog;
    return {
      sameItadori:catalog.get('itadori')===legacy.itadori,
      sameJogo:catalog.get('jogo')===legacy.jogo,
      itadoriBody:catalog.get('itadori').baseBody,
      jogoLife:catalog.get('jogo').maxLife,
      fingerTechnique:catalog.technique('itadori','richiamo_anima_sukuna')?.name||''
    };
  });
  expect(result.sameItadori).toBe(true);
  expect(result.sameJogo).toBe(true);
  expect(result.itadoriBody).toBe(4);
  expect(result.jogoLife).toBe(8);
  expect(result.fingerTechnique).toBe("(Dominio) Richiamo dell'Anima di Sukuna");
});

test('opening a character still uses the same authoritative object exposed by the catalog', async ({ page }) => {
  await openCleanPage(page);
  await page.evaluate(() => window.openCharacter('gojo',{silentStats:true}));
  await page.waitForTimeout(250);
  const result=await page.evaluate(() => ({
    currentId:(0,eval)('currentId'),
    sameCurrent:(0,eval)('current')===window.JJKCharacterCatalog.get('gojo'),
    visibleName:document.getElementById('heroName')?.textContent||document.querySelector('.hero-name')?.textContent||''
  }));
  expect(result.currentId).toBe('gojo');
  expect(result.sameCurrent).toBe(true);
  expect(result.visibleName).toContain('Gojo');
});