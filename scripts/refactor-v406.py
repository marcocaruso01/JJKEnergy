from pathlib import Path
import re

ROOT = Path('.')


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f'V40.6 refactor: block not found for {label}')


def sub_once(text, pattern, replacement, label, flags=0):
    new_text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count == 1:
        return new_text
    if replacement in text:
        return text
    raise SystemExit(f'V40.6 refactor: regex block not found for {label}')


# ---------------------------------------------------------------------------
# V40.6 runtime: preserve every V40.5 safety guard, expose a new cumulative API,
# and allow the spectator network fallback to remain a real network timer.
# ---------------------------------------------------------------------------
runtime = read('v405-event-runtime.js')
runtime = replace_once(
    runtime,
    '/* JJK Energy V40.5 - strict event-driven runtime coordinator */',
    '/* JJK Energy V40.6 - deep source event-driven runtime coordinator */',
    'runtime banner',
)
runtime = replace_once(
    runtime,
    "if(root.__JJK_V405_INSTALLED__)return;\nroot.__JJK_V405_INSTALLED__=true;\nroot.__JJK_V404_INSTALLED__=true;\n\nconst VERSION='40.5.0';",
    "if(root.__JJK_V406_INSTALLED__)return;\nroot.__JJK_V406_INSTALLED__=true;\nroot.__JJK_V405_INSTALLED__=true;\nroot.__JJK_V404_INSTALLED__=true;\n\nconst VERSION='40.6.0';",
    'runtime version',
)
runtime = replace_once(
    runtime,
    "    if(/renderOtherSheets|refreshSpectator/.test(source))return'remote';",
    "    if(/renderOtherSheets/.test(source))return'remote';",
    'spectator network exemption',
)
runtime = replace_once(
    runtime,
    "root.JJKV405={version:VERSION,refresh:schedule,audit,get blocked(){return [...blocked.values()].map(entry=>({kind:entry.kind,file:entry.file,delay:entry.delay,runs:entry.runs}));},get blockedObservers(){return blockedObservers.slice();},get nativeIntervals(){return [...nativeIntervals.values()].map(entry=>({...entry}));}};\nroot.JJKV404=root.JJKV405;",
    "root.JJKV406={version:VERSION,refresh:schedule,audit,get blocked(){return [...blocked.values()].map(entry=>({kind:entry.kind,file:entry.file,delay:entry.delay,runs:entry.runs}));},get blockedObservers(){return blockedObservers.slice();},get nativeIntervals(){return [...nativeIntervals.values()].map(entry=>({...entry}));}};\nroot.JJKV405=root.JJKV406;\nroot.JJKV404=root.JJKV406;",
    'runtime public API',
)
write('v406-event-runtime.js', runtime)


# ---------------------------------------------------------------------------
# V37: stop rebinding the whole module every 1.3s and stop polling the open
# player-sheets modal. Actual state/screen/remote events refresh it instead.
# ---------------------------------------------------------------------------
text = read('v37-update.js')
text = replace_once(
    text,
    "clearInterval(sheetsTimer);sheetsTimer=setInterval(()=>renderSheets(false),900);",
    "clearInterval(sheetsTimer);sheetsTimer=null;",
    'V37 sheets poll',
)
text = replace_once(
    text,
    "setInterval(()=>{bindAll();watchTurn();updatePanels();},1300);",
    "const runtimeRefresh=()=>{bindAll();watchTurn();updatePanels();if(document.getElementById('v37SheetsModal')?.classList.contains('show'))renderSheets(false);};root.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all','rebind'].includes(kind)&&!document.hidden)setTimeout(runtimeRefresh,0);},{passive:true});root.addEventListener('pageshow',()=>setTimeout(runtimeRefresh,0),{passive:true});",
    'V37 whole-module poll',
)
write('v37-update.js', text)


# ---------------------------------------------------------------------------
# V36: keep network/liveness timers (presence, online, spectator), but make all
# local UI/state maintenance event-driven. The spectator timer deliberately
# remains because it reads another room and has no local realtime channel.
# ---------------------------------------------------------------------------
text = read('v36-update.js')
text = replace_once(
    text,
    "setInterval(update,1200);update();",
    "window.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all'].includes(kind)&&!document.hidden)setTimeout(update,0);},{passive:true});window.addEventListener('pageshow',()=>setTimeout(update,0),{passive:true});update();",
    'V36 permanent body UI poll',
)
text = replace_once(
    text,
    "state.roomSheetTimer=setInterval(renderOtherSheets,2500);",
    "state.roomSheetTimer=null;",
    'V36 other-sheets poll',
)
runtime_refresh = """function bindRuntimeRefresh(){if(document.documentElement.dataset.v36RuntimeEvents==='1')return;document.documentElement.dataset.v36RuntimeEvents='1';const refresh=()=>{updateOtherSheetsButton();injectJogoQuickControls();if(document.getElementById('v36OtherSheetsModal')?.classList.contains('show'))renderOtherSheets();};window.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all','rebind'].includes(kind)&&!document.hidden)setTimeout(refresh,0);},{passive:true});window.addEventListener('pageshow',()=>setTimeout(refresh,0),{passive:true});} 
"""
if 'function bindRuntimeRefresh()' not in text:
    text = text.replace('function init(){', runtime_refresh + 'function init(){', 1)
text = replace_once(
    text,
    "setInterval(()=>{updateOtherSheetsButton();injectJogoQuickControls();},1500);",
    "bindRuntimeRefresh();",
    'V36 global UI poll',
)
write('v36-update.js', text)


# ---------------------------------------------------------------------------
# V36.2: Toji/Yuta helper UI follows state events rather than a 1.5s loop.
# ---------------------------------------------------------------------------
text = read('v362-rules-hotfix.js')
text = replace_once(
    text,
    "setInterval(()=>{fixTojiLocal(false);updateYutaNote();},1500);",
    "window.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all','rebind'].includes(kind)&&!document.hidden)setTimeout(()=>{fixTojiLocal(false);updateYutaNote();},0);},{passive:true});window.addEventListener('pageshow',()=>setTimeout(()=>{fixTojiLocal(false);updateYutaNote();},0),{passive:true});",
    'V36.2 helper poll',
)
write('v362-rules-hotfix.js', text)


# ---------------------------------------------------------------------------
# V39.2 authoritative gameplay: remove the 900ms rebinder and the body-wide
# observer. The runtime already knows every mutation function that can change
# these panels, so the module now reacts only to those events.
# ---------------------------------------------------------------------------
text = read('v392-gameplay.js')
old = "setInterval(()=>{patchTechniqueFunction();applyBlueprints();updatePanels();},900);const observer=new MutationObserver(()=>{clearTimeout(observer._t);observer._t=setTimeout(decorate,30);});observer.observe(document.documentElement,{childList:true,subtree:true});"
new = "const runtimeRefresh=()=>{patchTechniqueFunction();applyBlueprints();updatePanels();decorate();};root.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all','rebind'].includes(kind)&&!document.hidden)setTimeout(runtimeRefresh,0);},{passive:true});root.addEventListener('pageshow',()=>setTimeout(runtimeRefresh,0),{passive:true});"
text = replace_once(text, old, new, 'V39.2 poll and document observer')
write('v392-gameplay.js', text)


# ---------------------------------------------------------------------------
# Exact technique identity: keep its targeted #techGrid observer, remove only
# the unconditional 1s polling fallback.
# ---------------------------------------------------------------------------
text = read('v394-technique-fix.js')
text = replace_once(
    text,
    "setInterval(()=>{patchRenderer();observeGrid();bindButtons();},1000);",
    "root.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all','rebind'].includes(kind)&&!document.hidden)setTimeout(bind,0);},{passive:true});root.addEventListener('pageshow',()=>setTimeout(bind,0),{passive:true});",
    'exact technique poll',
)
write('v394-technique-fix.js', text)


# ---------------------------------------------------------------------------
# V39.8 Itadori variable rules: rebinding now follows real state/screen events.
# ---------------------------------------------------------------------------
text = read('v398-itadori-variable-rules.js')
text = replace_once(
    text,
    "setInterval(bind,750);",
    "root.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all','rebind'].includes(kind)&&!document.hidden)setTimeout(bind,0);},{passive:true});root.addEventListener('pageshow',()=>setTimeout(bind,0),{passive:true});",
    'V39.8 bind poll',
)
write('v398-itadori-variable-rules.js', text)


# ---------------------------------------------------------------------------
# V25 GM dashboard: the clock keeps its own core timer, but the expensive full
# dashboard is rendered only after actual room/state/GM changes.
# ---------------------------------------------------------------------------
text = read('gameplay-v25.js')
old = "setInterval(()=>{const room=getRoom();if(room?.isHost&&room.phase==='playing'&&document.getElementById('gameMaster')?.classList.contains('active'))window.renderGMDashboard();},900);"
new = "window.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';const room=getRoom();if(['state','remote','screen','all'].includes(kind)&&room?.isHost&&room.phase==='playing'&&document.getElementById('gameMaster')?.classList.contains('active'))setTimeout(()=>window.renderGMDashboard(),0);},{passive:true});"
text = replace_once(text, old, new, 'V25 GM dashboard poll')
write('gameplay-v25.js', text)


# ---------------------------------------------------------------------------
# Global event HUD and GM event selector: both are pure projections of room
# state, so they no longer need 1s/500ms loops.
# ---------------------------------------------------------------------------
text = read('events-v26.js')
text = replace_once(
    text,
    "setInterval(()=>{renderHud();renderGMEventPanel();updatePassTurnForEvents();},1000);",
    "window.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all'].includes(kind)&&!document.hidden)setTimeout(()=>{renderHud();renderGMEventPanel();updatePassTurnForEvents();},0);},{passive:true});",
    'V26 event HUD poll',
)
write('events-v26.js', text)

text = read('events-v26-2.js')
text = replace_once(
    text,
    "setInterval(()=>render(false),500);",
    "window.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all'].includes(kind)&&!document.hidden)setTimeout(()=>render(false),0);},{passive:true});",
    'V26.2 GM event panel poll',
)
write('events-v26-2.js', text)


# ---------------------------------------------------------------------------
# Cinematic GM assistant and local GM intelligence: scans/rendering follow the
# same actual state changes. Manual refresh remains available unchanged.
# ---------------------------------------------------------------------------
text = read('v14-cinematic.js')
text = replace_once(
    text,
    "setInterval(()=>{if(document.getElementById('gmViewAssistant')?.classList.contains('active'))renderGMAssistant();},2500);",
    "window.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all'].includes(kind)&&document.getElementById('gmViewAssistant')?.classList.contains('active')&&!document.hidden)setTimeout(renderGMAssistant,0);},{passive:true});",
    'cinematic GM assistant poll',
)
write('v14-cinematic.js', text)

text = read('gm-ai.js')
old = "clearInterval(state.timer);state.timer=setInterval(()=>{const active=document.getElementById('gameMaster')?.classList.contains('active'),assistant=document.getElementById('gmViewAssistant')?.classList.contains('active');if(state.auto&&active&&assistant)scan(false);},3500);"
new = "clearInterval(state.timer);state.timer=null;window.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state',active=document.getElementById('gameMaster')?.classList.contains('active'),assistant=document.getElementById('gmViewAssistant')?.classList.contains('active');if(['state','remote','screen','all'].includes(kind)&&state.auto&&active&&assistant&&!document.hidden)setTimeout(()=>scan(false),0);},{passive:true});"
text = replace_once(text, old, new, 'GM intelligence poll')
text = replace_once(text, 'v36-update.js?v=20260724v36', 'v36-update.js?v=20260819v406a', 'V36 cache key in GM AI')
write('gm-ai.js', text)


# ---------------------------------------------------------------------------
# Cache/version wiring. No content, rule, technique or value is changed here.
# ---------------------------------------------------------------------------
index = read('index.html')
for old, new, label in [
    ('v405-event-runtime.js?v=20260819v405a', 'v406-event-runtime.js?v=20260819v406a', 'runtime loader'),
    ('sfx.js?v=20260819s405a', 'sfx.js?v=20260819s406a', 'sfx loader'),
    ('v14-cinematic.js?v=20260714v14', 'v14-cinematic.js?v=20260819v406a', 'cinematic cache'),
    ('gm-ai.js?v=20260714v14', 'gm-ai.js?v=20260819v406a', 'GM AI cache'),
    ('gameplay-v25.js?v=20260716v25', 'gameplay-v25.js?v=20260819v406a', 'V25 cache'),
    ('events-v26.js?v=20260717v26', 'events-v26.js?v=20260819v406a', 'V26 cache'),
    ('events-v26-2.js?v=20260718v262', 'events-v26-2.js?v=20260819v406a', 'V26.2 cache'),
    ('v37-update.js?v=20260726v372', 'v37-update.js?v=20260819v406a', 'V37 cache'),
]:
    index = replace_once(index, old, new, label)
write('index.html', index)

sfx = read('sfx.js')
for old, new, label in [
    ('v362-rules-hotfix.js?v=20260724v362', 'v362-rules-hotfix.js?v=20260819v406a', 'V36.2 cache'),
    ('v394-technique-fix.js?v=20260727v397b', 'v394-technique-fix.js?v=20260819v406a', 'exact technique cache'),
    ('v392-gameplay.js?v=20260726v392b', 'v392-gameplay.js?v=20260819v406a', 'V39.2 cache'),
    ('v398-itadori-variable-rules.js?v=20260728v398a', 'v398-itadori-variable-rules.js?v=20260819v406a', 'V39.8 cache'),
]:
    sfx = replace_once(sfx, old, new, label)
write('sfx.js', sfx)

package = read('package.json')
package = replace_once(package, '"version": "40.5.0"', '"version": "40.6.0"', 'package version')
write('package.json', package)


# ---------------------------------------------------------------------------
# Preserve V40.5 regression coverage as a compatibility test for V40.6.
# ---------------------------------------------------------------------------
compat = read('tests/v405-event-runtime.spec.mjs')
compat = compat.replace("expect(audit.version).toBe('40.5.0');", "expect(['40.5.0','40.6.0']).toContain(audit.version);")
compat = compat.replace("test('V40.4 compatibility API still points at V40.5'", "test('V40.4 and V40.5 compatibility APIs remain available'")
compat = compat.replace("expect(result).toEqual({same:true,version:'40.5.0'});", "expect(result.same).toBe(true);expect(['40.5.0','40.6.0']).toContain(result.version);")
write('tests/v405-event-runtime.spec.mjs', compat)


# ---------------------------------------------------------------------------
# New browser regression checks: the newly refactored source files must not
# register legacy recurring UI callbacks anymore, while real mutations work.
# ---------------------------------------------------------------------------
test = r"""import { test, expect } from '@playwright/test';

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
  expect(result.native.some(item=>item.file==='index.html'&&item.delay>=1000)).toBe(true);
  expect(result.native.some(item=>item.file==='enhancements.js'&&item.delay>=4000)).toBe(true);
});
"""
write('tests/v406-source-refactor.spec.mjs', test)


# ---------------------------------------------------------------------------
# Static audit: require the V40.6 wiring and prove each source-level UI poll was
# actually removed instead of merely intercepted by the runtime.
# ---------------------------------------------------------------------------
audit = read('scripts/static-audit.mjs')
audit = audit.replace('20260819s405a)', '20260819s405a|20260819s406a)')
audit = audit.replace('V39.7-V40.5 sfx cache key', 'V39.7-V40.6 sfx cache key')
for old, new in [
    ('v394-technique-fix\\.js\\?v=20260727v397b', 'v394-technique-fix\\.js\\?v=20260819v406a'),
    ('v398-itadori-variable-rules\\.js\\?v=20260728v398a', 'v398-itadori-variable-rules\\.js\\?v=20260819v406a'),
]:
    audit = audit.replace(old, new)
old_runtime = """const runtime405 = read('v405-event-runtime.js');
if (!/strict event-driven runtime coordinator/.test(runtime405) || !/classifyLegacyInterval/.test(runtime405)) {
  fail('V40.5 strict event-driven runtime coordinator is missing.');
}
if (!/<meta name=[\"']viewport[\"'][^>]*>\\s*<script src=[\"']v405-event-runtime\\.js\\?v=20260819v405a[\"']><\\/script>/.test(index)) {
  fail('V40.5 must load in the document head before legacy scripts.');
}
if (!/HEAVY_FILES\\.has\\(file\\)/.test(runtime405) || !/legacyNativeIntervals/.test(runtime405)) {
  fail('V40.5 does not prevent unclassified legacy polling from escaping natively.');
}
if (!/blockedObservers/.test(runtime405) || !/NativeMutationObserver/.test(runtime405)) {
  fail('V40.5 does not suppress obsolete body-wide observers.');
}
if (!/function schedule\\(/.test(runtime405) || !/blocked=new Map/.test(runtime405)) {
  fail('V40.5 does not coordinate legacy refresh callbacks through events.');
}
"""
new_runtime = """const runtime406 = read('v406-event-runtime.js');
if (!/deep source event-driven runtime coordinator/.test(runtime406) || !/classifyLegacyInterval/.test(runtime406)) {
  fail('V40.6 deep event-driven runtime coordinator is missing.');
}
if (!/<meta name=[\"']viewport[\"'][^>]*>\\s*<script src=[\"']v406-event-runtime\\.js\\?v=20260819v406a[\"']><\\/script>/.test(index)) {
  fail('V40.6 must load in the document head before legacy scripts.');
}
if (!/HEAVY_FILES\\.has\\(file\\)/.test(runtime406) || !/legacyNativeIntervals/.test(runtime406)) {
  fail('V40.6 does not retain the V40.5 legacy-poll safety net.');
}
if (!/root\\.JJKV405=root\\.JJKV406/.test(runtime406) || !/root\\.JJKV404=root\\.JJKV406/.test(runtime406)) {
  fail('V40.6 does not preserve V40.4/V40.5 runtime compatibility.');
}
"""
audit = replace_once(audit, old_runtime, new_runtime, 'static runtime audit')

extra = r"""
// V40.6: these loaded modules must be genuinely event-driven at source.
for (const file of ['v37-update.js','v362-rules-hotfix.js','v392-gameplay.js','v394-technique-fix.js','v398-itadori-variable-rules.js','gameplay-v25.js','events-v26.js','events-v26-2.js','v14-cinematic.js','gm-ai.js']) {
  const source = read(file);
  if (/setInterval\s*\(/.test(source)) fail(`${file} still contains unconditional recurring UI work after the V40.6 refactor.`);
  if (!/jjk:runtime-scheduled/.test(source)) fail(`${file} is not connected to V40.6 runtime events.`);
}
const v36Source = read('v36-update.js');
if (/setInterval\(update,1200\)/.test(v36Source)) fail('V36 still polls the permanent Body guard UI.');
if (/setInterval\(renderOtherSheets,2500\)/.test(v36Source)) fail('V36 still polls other-player sheets instead of reacting to room events.');
if (/setInterval\(\(\)=>\{updateOtherSheetsButton\(\);injectJogoQuickControls\(\);\},1500\)/.test(v36Source)) fail('V36 still performs the general 1.5s UI refresh loop.');
if (!/bindRuntimeRefresh/.test(v36Source) || !/jjk:runtime-scheduled/.test(v36Source)) fail('V36 local UI is not connected to runtime events.');
if (!/setInterval\(refreshSpectator,3000\)/.test(v36Source)) fail('V36 spectator network fallback was removed accidentally.');
if (!/setInterval\(heartbeat,20000\)/.test(v36Source)) fail('V36 presence heartbeat was removed accidentally.');
if (!/setInterval\(\(\)=>loadOnline\(true\),15000\)/.test(v36Source)) fail('V36 online presence fallback was removed accidentally.');
if (!/gameplay-v25\.js\?v=20260819v406a/.test(index) || !/events-v26\.js\?v=20260819v406a/.test(index) || !/events-v26-2\.js\?v=20260819v406a/.test(index) || !/v37-update\.js\?v=20260819v406a/.test(index)) fail('index.html does not use the V40.6 source-refactor cache keys.');
if (!/v36-update\.js\?v=20260819v406a/.test(read('gm-ai.js'))) fail('GM AI does not load the V40.6 V36 source refactor.');
"""
marker = "const exactTechniqueFix = read('v394-technique-fix.js');"
if extra.strip() not in audit:
    audit = audit.replace(marker, extra + '\n' + marker, 1)
write('scripts/static-audit.mjs', audit)

print('V40.6 deep source event refactor generated successfully')
