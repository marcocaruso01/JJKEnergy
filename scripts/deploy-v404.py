from pathlib import Path
import json
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f"{label}: source block not found")
    return text.replace(old, new, 1)


runtime = Path("v404-event-runtime.js")
text = runtime.read_text(encoding="utf-8")
text = replace_once(
    text,
    "const nativeRequestAnimationFrame=(root.requestAnimationFrame||function(callback){return nativeSetTimeout(callback,16);}).bind(root);\nconst blocked=new Map();",
    "const nativeRequestAnimationFrame=(root.requestAnimationFrame||function(callback){return nativeSetTimeout(callback,16);}).bind(root);\nconst NativeMutationObserver=root.MutationObserver;\nconst MOBILE=!!(root.matchMedia&&root.matchMedia('(max-width:900px)').matches);\nconst blocked=new Map();\nconst blockedObservers=[];",
    "native observer declarations",
)

old_source = """function sourceFile(stack){
  for(const file of HEAVY_FILES)if(stack.includes('/'+file+':')||stack.includes(file+':'))return file;
  if(stack.includes('index.html:'))return'index.html';
  if(stack.includes('supabase-multiplayer.js:'))return'supabase-multiplayer.js';
  if(stack.includes('supabase-statistics.js:'))return'supabase-statistics.js';
  if(stack.includes('enhancements.js:'))return'enhancements.js';
  if(stack.includes('cinematic-v14.js:'))return'cinematic-v14.js';
  if(stack.includes('gm-ai.js:'))return'gm-ai.js';
  if(stack.includes('v20.js:'))return'v20.js';
  if(stack.includes('v36-update.js:'))return'v36-update.js';
  return'';
}"""
new_source = """function stackHasFile(stack,file){return stack.includes('/'+file+':')||stack.includes('/'+file+'?')||stack.includes(file+':')||stack.includes(file+'?');}
function sourceFile(stack){
  for(const file of HEAVY_FILES)if(stackHasFile(stack,file))return file;
  if(stackHasFile(stack,'index.html'))return'index.html';
  if(stackHasFile(stack,'supabase-multiplayer.js'))return'supabase-multiplayer.js';
  if(stackHasFile(stack,'supabase-statistics.js'))return'supabase-statistics.js';
  if(stackHasFile(stack,'enhancements.js'))return'enhancements.js';
  if(stackHasFile(stack,'cinematic-v14.js'))return'cinematic-v14.js';
  if(stackHasFile(stack,'gm-ai.js'))return'gm-ai.js';
  if(stackHasFile(stack,'v20.js'))return'v20.js';
  if(stackHasFile(stack,'v36-update.js'))return'v36-update.js';
  return'';
}"""
text = replace_once(text, old_source, new_source, "stack source detection")
text = text.replace(
    "if(/updateOtherSheetsButton|injectJogoQuickControls|syncLocalTojiMonster/.test(source))return'state';",
    "if(/updateOtherSheetsButton|injectJogoQuickControls|syncLocalTojiMonster|changeCombatBonus|v36-body-lock-note|permanentBodyLocked/.test(source))return'state';",
    1,
)
text = text.replace(
    "if(document.hidden&&file!=='supabase-multiplayer.js')return;",
    "if(document.hidden&&['index.html','cinematic-v14.js','gm-ai.js','v20.js','enhancements.js'].includes(file))return;",
    1,
)

old_clear = """root.clearInterval=function(id){
  if(blocked.delete(id))return;
  return nativeClearInterval(id);
};

function kindMatches"""
new_clear = """root.clearInterval=function(id){
  if(blocked.delete(id))return;
  return nativeClearInterval(id);
};
if(typeof NativeMutationObserver==='function'){
  root.MutationObserver=function(callback){
    const stack=stackText(),file=sourceFile(stack),source=callbackText(callback);
    const suppress=file==='v392-gameplay.js'||(MOBILE&&file==='v14-cinematic.js'&&/records|v14-value-pop|cloud-kpi-value|gm-summary-value/.test(source));
    if(suppress){
      blockedObservers.push({file,source:source.slice(0,220),registeredAt:Date.now()});
      schedule(file==='v392-gameplay.js'?'state':'screen','observer-register');
      return{observe(){},disconnect(){},takeRecords(){return[];}};
    }
    return new NativeMutationObserver(callback);
  };
  root.MutationObserver.prototype=NativeMutationObserver.prototype;
}

function kindMatches"""
text = replace_once(text, old_clear, new_clear, "observer interception")

old_matches = """function kindMatches(entry,kinds){
  return kinds.has('all')||kinds.has(entry.kind)||
    (kinds.has('state')&&entry.kind==='events')||
    (kinds.has('remote')&&(entry.kind==='state'||entry.kind==='events'||entry.kind==='gm'))||
    (kinds.has('screen')&&(entry.kind==='state'||entry.kind==='rebind'||entry.kind==='gm'||entry.kind==='events'));
}"""
new_matches = """function kindMatches(entry,kinds){
  return kinds.has('all')||kinds.has(entry.kind)||
    (kinds.has('state')&&(entry.kind==='events'||entry.kind==='rebind'))||
    (kinds.has('remote')&&(entry.kind==='state'||entry.kind==='events'||entry.kind==='gm'||entry.kind==='rebind'))||
    (kinds.has('screen')&&(entry.kind==='state'||entry.kind==='rebind'||entry.kind==='gm'||entry.kind==='events'));
}"""
text = replace_once(text, old_matches, new_matches, "event matching")
text = text.replace(
    "if(kinds.has('all')||kinds.has('screen')||kinds.has('rebind')){",
    "if(kinds.has('all')||kinds.has('screen')||kinds.has('rebind')||kinds.has('state')||kinds.has('remote')){",
    1,
)
text = text.replace(
    "const checks={version:VERSION,installed:true,events:document.documentElement.dataset.v404Events==='1',blockedIntervals:blocked.size,groups,flushCount,lastFlushAt,wrappedFunctions:wrappers.size};",
    "const checks={version:VERSION,installed:true,events:document.documentElement.dataset.v404Events==='1',blockedIntervals:blocked.size,blockedObservers:blockedObservers.length,groups,flushCount,lastFlushAt,wrappedFunctions:wrappers.size};",
    1,
)
text = text.replace(
    "get blocked(){return [...blocked.values()].map(entry=>({kind:entry.kind,file:entry.file,delay:entry.delay,runs:entry.runs}));}};",
    "get blocked(){return [...blocked.values()].map(entry=>({kind:entry.kind,file:entry.file,delay:entry.delay,runs:entry.runs}));},get blockedObservers(){return blockedObservers.slice();}};",
    1,
)
runtime.write_text(text, encoding="utf-8")

index = Path("index.html")
html = index.read_text(encoding="utf-8")
html = re.sub(r'\s*<script src="v404-event-runtime\.js\?v=[^"]+"></script>\s*', "\n", html)
marker = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
if marker not in html:
    raise SystemExit("viewport marker not found")
html = html.replace(marker, marker + '\n<script src="v404-event-runtime.js?v=20260801v404b"></script>', 1)
html = re.sub(r'sfx\.js\?v=[^"\']+', "sfx.js?v=20260801s404b", html, count=1)
index.write_text(html, encoding="utf-8")

package = Path("package.json")
data = json.loads(package.read_text(encoding="utf-8"))
data["version"] = "40.4.0"
package.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

audit = Path("scripts/static-audit.mjs")
source = audit.read_text(encoding="utf-8")
source = source.replace("20260730s403a)/.test(index)", "20260730s403a|20260801s404a|20260801s404b)/.test(index)")
source = source.replace("V39.7-V40.3 sfx cache key", "V39.7-V40.4 sfx cache key")
block = r'''
const runtime404 = read('v404-event-runtime.js');
if (!/event-driven runtime coordinator/.test(runtime404) || !/classifyLegacyInterval/.test(runtime404)) {
  fail('V40.4 event-driven runtime coordinator is missing.');
}
if (!/<meta name=["']viewport["'][^>]*>\s*<script src=["']v404-event-runtime\.js\?v=20260801v404b["']><\/script>/.test(index)) {
  fail('V40.4 must load in the document head before legacy scripts.');
}
if (!/blockedObservers/.test(runtime404) || !/NativeMutationObserver/.test(runtime404)) {
  fail('V40.4 does not suppress obsolete body-wide observers.');
}
if (!/function schedule\(/.test(runtime404) || !/blocked=new Map/.test(runtime404)) {
  fail('V40.4 does not coordinate legacy refresh callbacks through events.');
}
'''
anchor = "const exactTechniqueFix = read('v394-technique-fix.js');"
if "const runtime404" not in source:
    if anchor not in source:
        raise SystemExit("static audit anchor missing")
    source = source.replace(anchor, block + "\n" + anchor, 1)
else:
    source = source.replace("20260801v404a", "20260801v404b")
audit.write_text(source, encoding="utf-8")

Path("tests/v404-event-runtime.spec.mjs").write_text(
    """import { test, expect } from '@playwright/test';

async function openCleanPage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
  });
  await page.goto('/?audit=404', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '#v21AuthGate{display:none!important;pointer-events:none!important}' });
  await page.waitForFunction(() => window.JJKV404?.audit?.().ok === true, null, { timeout: 15_000 });
  await page.waitForTimeout(3800);
}

test('legacy polling and obsolete observers are captured', async ({ page }) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await openCleanPage(page);
  const audit=await page.evaluate(()=>window.JJKV404.audit());
  expect(audit.blockedIntervals).toBeGreaterThanOrEqual(8);
  expect(audit.blockedObservers).toBeGreaterThanOrEqual(1);
  expect(audit.groups.state||0).toBeGreaterThan(0);
  expect(audit.wrappedFunctions).toBeGreaterThan(5);
  expect(errors).toEqual([]);
});

test('idle pages do not continuously execute captured UI refreshes', async ({ page }) => {
  await openCleanPage(page);
  const before=await page.evaluate(()=>({flushes:window.JJKV404.audit().flushCount,runs:window.JJKV404.blocked.reduce((sum,item)=>sum+item.runs,0),blocked:window.JJKV404.blocked.length}));
  await page.waitForTimeout(1800);
  const after=await page.evaluate(()=>({flushes:window.JJKV404.audit().flushCount,runs:window.JJKV404.blocked.reduce((sum,item)=>sum+item.runs,0),blocked:window.JJKV404.blocked.length}));
  expect(after.flushes-before.flushes).toBeLessThanOrEqual(1);
  expect(after.runs-before.runs).toBeLessThanOrEqual(Math.max(before.blocked,after.blocked));
});

test('a real state event performs a coordinated refresh', async ({ page }) => {
  await openCleanPage(page);
  const before=await page.evaluate(()=>window.JJKV404.audit().flushCount);
  await page.evaluate(()=>window.JJKV404.refresh('state','test'));
  await page.waitForTimeout(180);
  const after=await page.evaluate(()=>window.JJKV404.audit().flushCount);
  expect(after).toBeGreaterThanOrEqual(before+1);
  expect(after).toBeLessThanOrEqual(before+2);
});

test('characters and resource controls remain functional', async ({ page }) => {
  await openCleanPage(page);
  await page.evaluate(()=>window.openCharacter('gojo',{silentStats:true}));
  await page.waitForTimeout(250);
  const resourcesTab=page.getByRole('button',{name:/Risorse/});
  if(await resourcesTab.isVisible()){
    await resourcesTab.click();
    await page.waitForTimeout(180);
  }
  const before=Number(await page.locator('#energyValue').textContent());
  await page.locator('#energyActions .gain').first().click();
  await page.waitForTimeout(250);
  const after=Number(await page.locator('#energyValue').textContent());
  expect(after).toBe(before+1);
  expect(await page.locator('#techGrid > .tech-card').count()).toBeGreaterThan(0);
});
""",
    encoding="utf-8",
)
