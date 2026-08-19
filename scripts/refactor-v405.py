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
    raise SystemExit(f'V40.5 refactor: block not found for {label}')

# 1) Replace the compatibility coordinator with a stricter V40.5 coordinator.
runtime = read('v404-event-runtime.js')
runtime = replace_once(runtime,
    '/* JJK Energy V40.4 - event-driven runtime coordinator */',
    '/* JJK Energy V40.5 - strict event-driven runtime coordinator */',
    'runtime banner')
runtime = replace_once(runtime,
    "if(root.__JJK_V404_INSTALLED__)return;\nroot.__JJK_V404_INSTALLED__=true;\n\nconst VERSION='40.4.0';",
    "if(root.__JJK_V405_INSTALLED__)return;\nroot.__JJK_V405_INSTALLED__=true;\nroot.__JJK_V404_INSTALLED__=true;\n\nconst VERSION='40.5.0';",
    'runtime version')
runtime = replace_once(runtime,
    'const blockedObservers=[];\nconst wrappers=new Map();',
    'const blockedObservers=[];\nconst nativeIntervals=new Map();\nconst wrappers=new Map();',
    'native interval registry')
runtime = replace_once(runtime,
    "  if(file==='v403-performance-android.js')return'rebind';\n  return'';\n}",
    "  if(file==='v403-performance-android.js')return'rebind';\n  // V40.5: every recurring callback created by a known legacy UI module is\n  // event-driven. Pattern-specific rules above keep the most accurate group;\n  // this fallback prevents an unrecognised legacy poll from escaping natively.\n  if(HEAVY_FILES.has(file)){\n    if(file==='gameplay-v25.js'||file==='v372-gm-controls-audit.js')return'gm';\n    if(/^events-v26/.test(file))return'events';\n    if(['v365-late-technique-ui.js','v391-stable.js','v393-stability.js','v394-technique-fix.js','v397-runtime-guards.js','v403-performance-android.js'].includes(file))return'rebind';\n    if(file==='v37-update.js'||file==='v36-update.js')return'state';\n    return'state';\n  }\n  return'';\n}",
    'strict legacy fallback')
runtime = replace_once(runtime,
    "  return nativeSetInterval(function(){\n    if(document.hidden&&['index.html','cinematic-v14.js','gm-ai.js','v20.js','enhancements.js'].includes(file))return;\n    if(/rotateHomeCast/.test(source)&&activeScreen()!=='home')return;\n    if(/updateGMClock/.test(source)&&activeScreen()!=='gameMaster')return;\n    return typeof callback==='function'?callback.apply(root,args):root.eval(String(callback));\n  },adjusted);\n}",
    "  const id=nativeSetInterval(function(){\n    if(document.hidden&&['index.html','cinematic-v14.js','gm-ai.js','v20.js','enhancements.js'].includes(file))return;\n    if(/rotateHomeCast/.test(source)&&activeScreen()!=='home')return;\n    if(/updateGMClock/.test(source)&&activeScreen()!=='gameMaster')return;\n    return typeof callback==='function'?callback.apply(root,args):root.eval(String(callback));\n  },adjusted);\n  nativeIntervals.set(id,{id,file:file||'unknown',delay:adjusted,source:source.slice(0,180),registeredAt:Date.now()});\n  return id;\n}",
    'native interval tracking')
runtime = replace_once(runtime,
    "root.clearInterval=function(id){\n  if(blocked.delete(id))return;\n  return nativeClearInterval(id);\n};",
    "root.clearInterval=function(id){\n  if(blocked.delete(id))return;\n  nativeIntervals.delete(id);\n  return nativeClearInterval(id);\n};",
    'native interval cleanup')
runtime = replace_once(runtime,
    "  const checks={version:VERSION,installed:true,events:document.documentElement.dataset.v404Events==='1',blockedIntervals:blocked.size,blockedObservers:blockedObservers.length,groups,flushCount,lastFlushAt,wrappedFunctions:wrappers.size};\n  checks.ok=checks.events&&checks.wrappedFunctions>0;",
    "  const legacyNativeIntervals=[...nativeIntervals.values()].filter(entry=>HEAVY_FILES.has(entry.file));\n  const checks={version:VERSION,installed:true,events:document.documentElement.dataset.v404Events==='1',blockedIntervals:blocked.size,blockedObservers:blockedObservers.length,nativeIntervals:nativeIntervals.size,legacyNativeIntervals:legacyNativeIntervals.length,groups,flushCount,lastFlushAt,wrappedFunctions:wrappers.size};\n  checks.ok=checks.events&&checks.wrappedFunctions>0&&checks.legacyNativeIntervals===0;",
    'runtime audit')
runtime = replace_once(runtime,
    "root.JJKV404={version:VERSION,refresh:schedule,audit,get blocked(){return [...blocked.values()].map(entry=>({kind:entry.kind,file:entry.file,delay:entry.delay,runs:entry.runs}));},get blockedObservers(){return blockedObservers.slice();}};",
    "root.JJKV405={version:VERSION,refresh:schedule,audit,get blocked(){return [...blocked.values()].map(entry=>({kind:entry.kind,file:entry.file,delay:entry.delay,runs:entry.runs}));},get blockedObservers(){return blockedObservers.slice();},get nativeIntervals(){return [...nativeIntervals.values()].map(entry=>({...entry}));}};\nroot.JJKV404=root.JJKV405;",
    'runtime public api')
write('v405-event-runtime.js', runtime)

# 2) Remove recurring rebind loops from modules that already have idempotent hooks.
replacements = {
    'v403-performance-android.js': [
        ("setInterval(()=>{if(!document.hidden)bind();},3000);",
         "root.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all','rebind'].includes(kind)&&!document.hidden)bind();},{passive:true});root.addEventListener('pageshow',()=>{if(!document.hidden)bind();},{passive:true});root.addEventListener('focus',()=>{if(!document.hidden)bind();},{passive:true});",
         'V40.3 recurring bind'),
    ],
    'v399-itadori-ui-progression.js': [
        ("setInterval(bind,700);",
         "root.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all','rebind'].includes(kind)&&!document.hidden)setTimeout(bind,0);},{passive:true});root.addEventListener('pageshow',()=>setTimeout(bind,0),{passive:true});",
         'Itadori recurring bind'),
    ],
    'v400-counter-domain-fixes.js': [
        ("setInterval(()=>{patchTechniques();patchRefreshHooks();stabilizeItadoriCounter();updateJogoCounter(false);},250);",
         "root.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(!['state','remote','screen','all','rebind'].includes(kind)||document.hidden)return;setTimeout(()=>{patchTechniques();patchRefreshHooks();stabilizeItadoriCounter();updateJogoCounter(false);},0);},{passive:true});root.addEventListener('pageshow',()=>setTimeout(bind,0),{passive:true});",
         'V40 recurring counter poll'),
    ],
    'v401-jogo-counter-stability.js': [
        ("setInterval(()=>{bind();watchTurn();if(cid()==='jogo'){syncGlobals();render(false);}},250);",
         "root.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(!['state','remote','screen','all','rebind'].includes(kind)||document.hidden)return;setTimeout(()=>{bind();watchTurn();if(cid()==='jogo'){syncGlobals();render(false);}},0);},{passive:true});root.addEventListener('pageshow',()=>setTimeout(()=>{bind();watchTurn();if(cid()==='jogo'){syncGlobals();render(false);}},0),{passive:true});",
         'Jogo 250ms state poll'),
    ],
    'v396-jogo-ui-cleanup.js': [
        ("setInterval(()=>clean(false),2200);",
         "root.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all'].includes(kind)&&!document.hidden)setTimeout(()=>clean(false),0);},{passive:true});root.addEventListener('pageshow',()=>setTimeout(()=>clean(true),0),{passive:true});",
         'Jogo cleanup interval'),
    ],
    'v397-runtime-guards.js': [
        ("setInterval(install,2200);",
         "root.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all','rebind'].includes(kind)&&!document.hidden)setTimeout(install,0);},{passive:true});root.addEventListener('pageshow',()=>setTimeout(install,0),{passive:true});",
         'runtime guard interval'),
    ],
}
for filename, rules in replacements.items():
    text = read(filename)
    for old, new, label in rules:
        text = replace_once(text, old, new, label)
    write(filename, text)

# 3) Make Supabase realtime authoritative. Keep only a low-frequency health fallback.
mp = read('supabase-multiplayer.js')
mp = replace_once(mp,
    "let sb=null, currentUser=null, channel=null, pollTimer=null, heartbeatTimer=null, refreshTimer=null, saveTimer=null, stateWritePromise=Promise.resolve(), stateVersion=0, lastAppliedStateVersion=0, lastLocalBossRush=null, adapterReady=false, refreshing=false, lifecycleBound=false, authPromise=null;",
    "let sb=null, currentUser=null, channel=null, pollTimer=null, heartbeatTimer=null, refreshTimer=null, saveTimer=null, stateWritePromise=Promise.resolve(), stateVersion=0, lastAppliedStateVersion=0, lastLocalBossRush=null, lastSnapshotSignature='', adapterReady=false, refreshing=false, lifecycleBound=false, authPromise=null;",
    'multiplayer signature state')
mp = replace_once(mp,
    "function mapSnapshot(snap, previousPhase){\n  if(!snap?.room)return null;\n  const previousSession=getRoomSession();\n  const r=snap.room;",
    "function snapshotSignature(snap){\n  if(!snap?.room)return '';\n  const room=snap.room;\n  const players=(snap.players||[]).filter(p=>!p.left_at&&!p.kicked_at).map(p=>[p.id,p.character_id||'',p.is_host?1:0,p.is_connected===false?0:1,p.is_locked?1:0,p.self_manage===false?0:1,p.energy_discount?1:0,p.has_eye?1:0,p.boss_rush?1:0,Number(p.turn_order)||0,Number(p.state_version)||0,p.state_updated_at||''].join(':')).sort().join('|');\n  const events=(snap.events||[]).map(e=>[e.id||'',e.event_type||e.type||'',e.status||'',e.updated_at||e.created_at||''].join(':')).sort().join('|');\n  return [room.id||'',room.status||'',room.updated_at||'',JSON.stringify(room.settings||{}),JSON.stringify(room.winner_data||{}),players,events].join('#');\n}\nfunction mapSnapshot(snap, previousPhase){\n  if(!snap?.room)return null;\n  const previousSession=getRoomSession();\n  const signature=snapshotSignature(snap);\n  if(signature&&signature===lastSnapshotSignature&&previousSession){previousSession.serverTime=snap.server_time;return previousSession;}\n  lastSnapshotSignature=signature;\n  const r=snap.room;",
    'snapshot dedupe')
mp = replace_once(mp,
    "function stopRealtime(){\n  if(channel&&sb){try{sb.removeChannel(channel);}catch(e){}} channel=null;",
    "function stopRealtime(){\n  if(channel&&sb){try{sb.removeChannel(channel);}catch(e){}} channel=null;lastSnapshotSignature='';",
    'snapshot reset')
mp = replace_once(mp,
    "pollTimer=setInterval(()=>refreshRoom(false),5000);",
    "pollTimer=setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)refreshRoom(false);},60000);",
    'realtime fallback poll')
write('supabase-multiplayer.js', mp)

# 4) Cache/version wiring.
index = read('index.html')
index = replace_once(index,
    '<script src="v404-event-runtime.js?v=20260801v404b"></script>',
    '<script src="v405-event-runtime.js?v=20260819v405a"></script>',
    'head runtime loader')
index = replace_once(index,
    '<script src="supabase-multiplayer.js?v=20260714v21"></script>',
    '<script src="supabase-multiplayer.js?v=20260819v405a"></script>',
    'multiplayer cache key')
index = replace_once(index,
    '<script src="sfx.js?v=20260801s404b"></script>',
    '<script src="sfx.js?v=20260819s405a"></script>',
    'sfx cache key')
write('index.html', index)

sfx = read('sfx.js')
for old, new, label in [
    ('v397-runtime-guards.js?v=20260727v397a','v397-runtime-guards.js?v=20260819v405a','guard cache'),
    ('v399-itadori-ui-progression.js?v=20260728v399b','v399-itadori-ui-progression.js?v=20260819v405a','Itadori UI cache'),
    ('v396-jogo-ui-cleanup.js?v=20260727v397b','v396-jogo-ui-cleanup.js?v=20260819v405a','Jogo UI cache'),
    ('v400-counter-domain-fixes.js?v=20260728v400a','v400-counter-domain-fixes.js?v=20260819v405a','V40 cache'),
    ('v401-jogo-counter-stability.js?v=20260728v402a','v401-jogo-counter-stability.js?v=20260819v405a','Jogo state cache'),
    ('v403-performance-android.js?v=20260730v403a','v403-performance-android.js?v=20260819v405a','Android cache'),
]:
    sfx = replace_once(sfx, old, new, label)
write('sfx.js', sfx)

package = read('package.json')
package = replace_once(package, '"version": "40.4.0"', '"version": "40.5.0"', 'package version')
write('package.json', package)

# 5) Static audit now verifies the source refactor, not just the compatibility layer.
audit = read('scripts/static-audit.mjs')
audit = replace_once(audit,
    '20260730s403a|20260801s404a|20260801s404b)',
    '20260730s403a|20260801s404a|20260801s404b|20260819s405a)',
    'approved cache regex')
audit = audit.replace("V39.7-V40.4 sfx cache key", "V39.7-V40.5 sfx cache key")
for old, new in [
    ("v397-runtime-guards\\.js\\?v=20260727v397a", "v397-runtime-guards\\.js\\?v=20260819v405a"),
    ("v399-itadori-ui-progression\\.js\\?v=20260728v399b", "v399-itadori-ui-progression\\.js\\?v=20260819v405a"),
    ("v396-jogo-ui-cleanup\\.js\\?v=20260727v397b", "v396-jogo-ui-cleanup\\.js\\?v=20260819v405a"),
    ("v400-counter-domain-fixes\\.js\\?v=20260728v400a", "v400-counter-domain-fixes\\.js\\?v=20260819v405a"),
    ("v401-jogo-counter-stability\\.js\\?v=20260728v402a", "v401-jogo-counter-stability\\.js\\?v=20260819v405a"),
    ("v403-performance-android\\.js\\?v=20260730v403a", "v403-performance-android\\.js\\?v=20260819v405a"),
]:
    audit = audit.replace(old, new)
old_runtime_block = """const runtime404 = read('v404-event-runtime.js');
if (!/event-driven runtime coordinator/.test(runtime404) || !/classifyLegacyInterval/.test(runtime404)) {
  fail('V40.4 event-driven runtime coordinator is missing.');
}
if (!/<meta name=[\"']viewport[\"'][^>]*>\\s*<script src=[\"']v404-event-runtime\\.js\\?v=20260801v404b[\"']><\\/script>/.test(index)) {
  fail('V40.4 must load in the document head before legacy scripts.');
}
if (!/blockedObservers/.test(runtime404) || !/NativeMutationObserver/.test(runtime404)) {
  fail('V40.4 does not suppress obsolete body-wide observers.');
}
if (!/function schedule\\(/.test(runtime404) || !/blocked=new Map/.test(runtime404)) {
  fail('V40.4 does not coordinate legacy refresh callbacks through events.');
}
"""
new_runtime_block = """const runtime405 = read('v405-event-runtime.js');
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
audit = replace_once(audit, old_runtime_block, new_runtime_block, 'static runtime audit block')
extra = """
// V40.5: the hottest compatibility modules must no longer own recurring UI polls.
for (const file of ['v396-jogo-ui-cleanup.js','v397-runtime-guards.js','v399-itadori-ui-progression.js','v400-counter-domain-fixes.js','v401-jogo-counter-stability.js','v403-performance-android.js']) {
  const source = read(file);
  if (/setInterval\\s*\\(/.test(source)) fail(`${file} still contains a recurring UI poll after the V40.5 refactor.`);
  if (!/jjk:runtime-scheduled/.test(source)) fail(`${file} is not connected to the event-driven runtime.`);
}
const multiplayer405 = read('supabase-multiplayer.js');
if (!/snapshotSignature/.test(multiplayer405) || !/lastSnapshotSignature/.test(multiplayer405)) fail('V40.5 multiplayer does not deduplicate unchanged snapshots.');
if (!/60000/.test(multiplayer405) || /setInterval\\(\\(\\)=>refreshRoom\\(false\\),5000\\)/.test(multiplayer405)) fail('V40.5 multiplayer still performs the old 5-second full-room poll.');
"""
audit = audit.replace("const exactTechniqueFix = read('v394-technique-fix.js');", extra + "\nconst exactTechniqueFix = read('v394-technique-fix.js');", 1)
write('scripts/static-audit.mjs', audit)

# 6) Browser regression test. The old V40.4 API remains aliased for compatibility.
test = r"""import { test, expect } from '@playwright/test';

async function openCleanPage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=405', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '#v21AuthGate{display:none!important;pointer-events:none!important}' });
  await page.waitForFunction(() => window.JJKV405?.audit?.().ok === true, null, { timeout: 15_000 });
  await page.waitForTimeout(3800);
}

test('V40.5 leaves no native interval from known legacy UI modules', async ({ page }) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await openCleanPage(page);
  const audit=await page.evaluate(()=>window.JJKV405.audit());
  expect(audit.version).toBe('40.5.0');
  expect(audit.legacyNativeIntervals).toBe(0);
  expect(audit.wrappedFunctions).toBeGreaterThan(5);
  expect(errors).toEqual([]);
});

test('idle UI stays idle instead of re-rendering on a timer', async ({ page }) => {
  await openCleanPage(page);
  const before=await page.evaluate(()=>({flushes:window.JJKV405.audit().flushCount,runs:window.JJKV405.blocked.reduce((sum,item)=>sum+item.runs,0)}));
  await page.waitForTimeout(2200);
  const after=await page.evaluate(()=>({flushes:window.JJKV405.audit().flushCount,runs:window.JJKV405.blocked.reduce((sum,item)=>sum+item.runs,0)}));
  expect(after.flushes-before.flushes).toBeLessThanOrEqual(1);
  expect(after.runs-before.runs).toBeLessThanOrEqual(1);
});

test('a real resource change still refreshes the character state', async ({ page }) => {
  await openCleanPage(page);
  await page.evaluate(()=>window.openCharacter('gojo',{silentStats:true}));
  await page.waitForTimeout(250);
  const before=Number(await page.locator('#energyValue').textContent());
  await page.evaluate(()=>window.gainEnergy(1));
  await page.waitForTimeout(250);
  const after=Number(await page.locator('#energyValue').textContent());
  expect(after).toBe(before+1);
  expect(await page.locator('#techGrid > .tech-card').count()).toBeGreaterThan(0);
});

test('V40.4 compatibility API still points at V40.5', async ({ page }) => {
  await openCleanPage(page);
  const result=await page.evaluate(()=>({same:window.JJKV404===window.JJKV405,version:window.JJKV404?.version}));
  expect(result).toEqual({same:true,version:'40.5.0'});
});
"""
write('tests/v405-event-runtime.spec.mjs', test)

print('V40.5 source refactor generated successfully')
