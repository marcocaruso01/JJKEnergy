import { test, expect } from '@playwright/test';

async function openCleanPage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=403', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '#v21AuthGate{display:none!important;pointer-events:none!important}' });
  await page.waitForFunction(() => window.__JJK_V403_INSTALLED__ && window.JJKV403Audit?.ok === true && window.JJKV403PlayerQueue, null, { timeout: 15_000 });
}

test('rapid mobile resource taps are combined instead of being lost', async ({ page }) => {
  await openCleanPage(page);

  const result = await page.evaluate(async () => {
    const calls = [];
    const player = { playerToken: 'p1', state: { energy: 10 } };
    window.roomFindPlayer = token => token === 'p1' ? player : null;
    window.gmAdjustPlayer = async (token, field, delta) => {
      calls.push({ token, field, delta });
      player.state[field] = Math.max(0, Number(player.state[field] || 0) + Number(delta || 0));
    };

    window.JJKV403.setDrawerToken('p1');
    window.JJKV403.enqueueResourceDelta('p1', 'energy', 1, 'Energia');
    window.JJKV403.enqueueResourceDelta('p1', 'energy', 1, 'Energia');
    window.JJKV403.enqueueResourceDelta('p1', 'energy', -1, 'Energia');
    await new Promise(resolve => setTimeout(resolve, 500));

    return { calls, energy: player.state.energy };
  });

  expect(result.calls).toEqual([{ token: 'p1', field: 'energy', delta: 1 }]);
  expect(result.energy).toBe(11);
});

test('rapid player EXP taps survive DOM rebuilding', async ({ page }) => {
  await openCleanPage(page);

  const calls = await page.evaluate(async () => {
    const values = [];
    window.gainExp = delta => values.push(delta);
    const button = document.createElement('button');
    button.setAttribute('onclick', 'gainExp(1)');
    button.textContent = '+1 EXP';
    document.body.appendChild(button);
    button.click();
    button.click();
    button.click();
    await new Promise(resolve => setTimeout(resolve, 400));
    button.remove();
    return values;
  });

  expect(calls).toEqual([3]);
});

test('Android numeric input is not overwritten while the user is typing', async ({ page }) => {
  await openCleanPage(page);

  const value = await page.evaluate(async () => {
    const drawer = document.getElementById('mobileV24GMDrawer');
    const input = document.getElementById('mobileV24GMExact');
    if (!drawer || !input) throw new Error('mobile resource drawer missing');
    drawer.classList.add('show');
    drawer.setAttribute('aria-hidden', 'false');
    input.focus();
    if (document.activeElement !== input) throw new Error('numeric input did not receive focus');
    input.value = '17';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = '2';
    await new Promise(resolve => setTimeout(resolve, 260));
    return input.value;
  });

  expect(value).toBe('17');
});

test('V40.3 installs touch-safe controls and throttled GM rendering', async ({ page }) => {
  await openCleanPage(page);
  const state = await page.evaluate(() => ({
    audit: window.JJKV403Audit,
    wrapped: !!window.renderGMDashboard?.__v403Performance,
    style: !!document.getElementById('v403PerformanceStyle'),
    inputEvents: document.documentElement.dataset.v403InputEvents,
    playerQueue: window.JJKV403PlayerQueue?.version
  }));

  expect(state.audit?.ok).toBe(true);
  expect(state.wrapped).toBe(true);
  expect(state.style).toBe(true);
  expect(state.inputEvents).toBe('1');
  expect(state.playerQueue).toBe('40.3.0');
});
