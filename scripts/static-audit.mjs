import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const notes = [];

function fail(message) { failures.push(message); }
function note(message) { notes.push(message); }
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function exists(file) { return fs.existsSync(path.join(root, file)); }

const index = read('index.html');

// 1. Duplicate static IDs are a common cause of selectors updating the wrong widget.
const ids = [...index.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
const duplicateIds = [...new Set(ids.filter((id, position) => ids.indexOf(id) !== position))];
if (duplicateIds.length) fail(`Duplicate IDs in index.html: ${duplicateIds.join(', ')}`);
else note(`Static DOM IDs are unique (${ids.length} checked).`);

// 2. Every local HTML script/stylesheet/image must exist in the repository.
const htmlRefs = [...index.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]);
const localHtmlRefs = htmlRefs
  .filter(ref => !/^(?:https?:|data:|blob:|mailto:|tel:|#|javascript:)/i.test(ref))
  .map(ref => ref.split(/[?#]/)[0])
  .filter(Boolean);
for (const ref of new Set(localHtmlRefs)) {
  if (!exists(ref)) fail(`Missing file referenced by index.html: ${ref}`);
}
note(`Checked ${new Set(localHtmlRefs).size} local references from index.html.`);

// 3. Scan source files for direct assets/... references.
const sourceExtensions = new Set(['.html', '.js', '.css', '.json']);
const ignoredDirs = new Set(['.git', 'node_modules', 'test-results', 'playwright-report']);
const sourceFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (sourceExtensions.has(path.extname(entry.name))) sourceFiles.push(absolute);
  }
}
walk(root);

const assetRefs = new Set();
for (const absolute of sourceFiles) {
  const content = fs.readFileSync(absolute, 'utf8');
  for (const match of content.matchAll(/["'`](assets\/[A-Za-z0-9_./%+() -]+?\.(?:png|jpe?g|webp|gif|svg|mp3|wav|ogg|m4a))[?#["'`)]/gi)) {
    assetRefs.add(decodeURIComponent(match[1]));
  }
}
for (const ref of assetRefs) {
  if (!exists(ref)) fail(`Missing asset referenced by source: ${ref}`);
}
note(`Checked ${assetRefs.size} direct asset references.`);

// 4. Guard against known conflicting technique dispatchers and stale cache keys.
if (/v365-late-technique-ui\.js/i.test(index) || /v393-stability\.js/i.test(index)) {
  fail('index.html still loads a known conflicting technique dispatcher.');
}
if (!/sfx\.js\?v=(?:20260727s397[ab]|20260728s398a|20260728s399[ab]|20260728s400a|20260728s401a|20260728s402a|20260730s403a|20260801s404a|20260801s404b|20260819s405a|20260819s406a|20260819s407a)/.test(index)) {
  fail('index.html does not use an approved V39.7-V40.7 sfx cache key.');
}

const catalog407 = read('character-catalog-v407.js');
if (!/Character Catalog foundation/.test(catalog407) || !/function legacyCharacters/.test(catalog407)) {
  fail('V40.7 Character Catalog foundation is missing.');
}
if (!/Object\.freeze\(\{version:VERSION,ids,has,get,entries,legacy,technique,grade,validate,audit\}\)/.test(catalog407)) {
  fail('V40.7 Character Catalog API is incomplete.');
}
if (!/sfx\.js\?v=20260819s407a/.test(index)) {
  fail('index.html does not activate the V40.7 loader cache key.');
}

const sfx = read('sfx.js');
if (!/character-catalog-v407\.js\?v=20260819v407a/.test(sfx)) fail('sfx.js does not load the V40.7 Character Catalog before gameplay patches.');
if (!/v394-technique-fix\.js\?v=20260819v406a/.test(sfx)) fail('sfx.js does not load the latest exact technique identity fix.');
if (!/v397-runtime-guards\.js\?v=20260819v405a/.test(sfx)) fail('sfx.js does not load the V39.7 runtime guards.');
if (!/v398-itadori-variable-rules\.js\?v=20260819v406a/.test(sfx)) fail('sfx.js does not load the V39.8 Itadori and variable-technique rules.');
if (!/v399-itadori-ui-progression\.js\?v=20260819v405a/.test(sfx)) fail('sfx.js does not load the V39.9.1 Itadori UI, controls and progression fixes.');
if (!/v396-jogo-ui-cleanup\.js\?v=20260819v405a/.test(sfx)) fail('sfx.js does not load the latest Jogo UI cleanup.');
if (!/v400-counter-domain-fixes\.js\?v=20260819v405a/.test(sfx)) fail('sfx.js does not load the V40 counter and Domain fixes.');
if (!/v401-jogo-counter-stability\.js\?v=20260819v405a/.test(sfx)) fail('sfx.js does not load the V40.2 single Jogo state.');
if (!/v403-performance-android\.js\?v=20260819v405a/.test(sfx)) fail('sfx.js does not load the V40.3 performance and Android fixes.');
if (/v365-late-technique-ui\.js|v393-stability\.js/.test(sfx)) fail('sfx.js still loads an obsolete conflicting patch.');


const runtime406 = read('v406-event-runtime.js');
if (!/deep source event-driven runtime coordinator/.test(runtime406) || !/classifyLegacyInterval/.test(runtime406)) {
  fail('V40.6 deep event-driven runtime coordinator is missing.');
}
if (!/<meta name=["']viewport["'][^>]*>\s*<script src=["']v406-event-runtime\.js\?v=20260819v406a["']><\/script>/.test(index)) {
  fail('V40.6 must load in the document head before legacy scripts.');
}
if (!/HEAVY_FILES\.has\(file\)/.test(runtime406) || !/legacyNativeIntervals/.test(runtime406)) {
  fail('V40.6 does not retain the V40.5 legacy-poll safety net.');
}
if (!/root\.JJKV405=root\.JJKV406/.test(runtime406) || !/root\.JJKV404=root\.JJKV406/.test(runtime406)) {
  fail('V40.6 does not preserve V40.4/V40.5 runtime compatibility.');
}


// V40.5: the hottest compatibility modules must no longer own recurring UI polls.
for (const file of ['v396-jogo-ui-cleanup.js','v397-runtime-guards.js','v399-itadori-ui-progression.js','v400-counter-domain-fixes.js','v401-jogo-counter-stability.js','v403-performance-android.js']) {
  const source = read(file);
  if (/setInterval\s*\(/.test(source)) fail(`${file} still contains a recurring UI poll after the V40.5 refactor.`);
  if (!/jjk:runtime-scheduled/.test(source)) fail(`${file} is not connected to the event-driven runtime.`);
}
const multiplayer405 = read('supabase-multiplayer.js');
if (!/snapshotSignature/.test(multiplayer405) || !/lastSnapshotSignature/.test(multiplayer405)) fail('V40.5 multiplayer does not deduplicate unchanged snapshots.');
if (!/60000/.test(multiplayer405) || /setInterval\(\(\)=>refreshRoom\(false\),5000\)/.test(multiplayer405)) fail('V40.5 multiplayer still performs the old 5-second full-room poll.');


// V40.6: these loaded modules must be genuinely event-driven at source.
for (const file of ['v37-update.js','v362-rules-hotfix.js','v392-gameplay.js','v394-technique-fix.js','v398-itadori-variable-rules.js','gameplay-v25.js','events-v26.js','events-v26-2.js','gm-ai.js']) {
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

const exactTechniqueFix = read('v394-technique-fix.js');
if (/available\s*\[\s*i\s*\]/.test(exactTechniqueFix)) fail('Technique fix still contains positional available[i] mapping.');
if (!/techniqueForCard/.test(exactTechniqueFix) || !/dataset\.techKey/.test(exactTechniqueFix)) {
  fail('Technique fix is missing semantic card identity binding.');
}
if (!/isUtilityCard/.test(exactTechniqueFix) || !/isolateUtilityCard/.test(exactTechniqueFix)) {
  fail('Technique fix does not isolate utility cards from technique identity mapping.');
}

const runtimeGuards = read('v397-runtime-guards.js');
if (!/renderAll/.test(runtimeGuards) || !/hasCharacter/.test(runtimeGuards)) {
  fail('Runtime guard does not protect character rendering when no character is selected.');
}

const requestedRules = read('v398-itadori-variable-rules.js');
if (!/function resolveVariableCost/.test(requestedRules) || !/Math\.min\(rolled,available\)/.test(requestedRules)) {
  fail('V39.8 does not cap variable-technique Body by available Energy.');
}
if (!/function itadoriBlueprint/.test(requestedRules) || !/Richiamo del Ricettacolo Perfetto/.test(requestedRules)) {
  fail('V39.8 does not contain the requested Itadori blueprint.');
}
if (!/pugno_divergente,black_flash_itadori,manipolazione_sangue,freccia_itadori,richiamo_anima_sukuna,immortalita/.test(requestedRules)) {
  fail('V39.8 Itadori technique audit is incomplete.');
}

const itadoriUi = read('v399-itadori-ui-progression.js');
if (!/function maxLifeForFingers/.test(itadoriUi) || !/4\+fingerBonuses\(value\)\.life/.test(itadoriUi)) {
  fail('V39.9.1 does not synchronize Itadori maximum Life with finger milestones.');
}
if (!/function thresholdUpgrade/.test(itadoriUi) || !/notifyThreshold/.test(itadoriUi)) {
  fail('V39.9.1 does not implement milestone upgrade notifications.');
}
if (!/itadoriChosoPanel\{display:none!important\}/.test(itadoriUi) || !/v399-inline-blood/.test(itadoriUi)) {
  fail('V39.9.1 does not clean the obsolete Itadori panel or integrate Blood Manipulation.');
}
if (!/function awardFingers/.test(itadoriUi) || !/data-v392-sukuna/.test(itadoriUi) || !/data-v392-monster/.test(itadoriUi)) {
  fail('V39.9.1 does not bind the Itadori finger controls.');
}

const v400 = read('v400-counter-domain-fixes.js');
if (!/function resolveSoulDomain/.test(v400) || !/slashRoll\+normal\[0\]\+normal\[1\]/.test(v400)) {
  fail('V40 does not charge the Itadori Domain for d24 + both d6 results.');
}
if (!/v37ItadoriPanel/.test(v400) || !/overflow-anchor:none/.test(v400)) {
  fail('V40 does not stabilize the Itadori finger counter layout.');
}
if (!/function updateJogoCounter/.test(v400) || !/v37JogoSummary/.test(v400)) {
  fail('V40 does not update the visible Jogo counters automatically.');
}

const v402 = read('v401-jogo-counter-stability.js');
if (!/const state=/.test(v402) || !/function syncGlobals/.test(v402) || !/function commit/.test(v402)) {
  fail('V40.2 does not maintain a single authoritative Jogo state.');
}
if (!/#jogoPanel\.show #v37JogoPanel,#jogoPanel\.show #v392JogoPanel,#jogoPanel\.show #v401JogoSummary\{display:none!important\}/.test(v402) || !/v402JogoPanel/.test(v402)) {
  fail('V40.2 does not remove the obsolete competing Jogo panels.');
}
if (!/function wrapSnapshot/.test(v402) || !/function wrapBuildState/.test(v402) || !/function wrapUseTechnique/.test(v402)) {
  fail('V40.2 does not synchronize local actions and multiplayer through its authoritative state.');
}
if (/captureLocalChange|scheduleCapture/.test(v402)) {
  fail('V40.2 still accepts arbitrary periodic global rewrites.');
}

const v403 = read('v403-performance-android.js');
if (!/function wrapGmRender/.test(v403) || !/__v403Performance/.test(v403)) {
  fail('V40.3 does not throttle and deduplicate expensive GM rendering.');
}
if (!/function enqueueResourceDelta/.test(v403) || !/const pending=new Map/.test(v403)) {
  fail('V40.3 does not queue rapid resource taps.');
}
if (!/function editingLoop/.test(v403) || !/mobileV24GMExact/.test(v403)) {
  fail('V40.3 does not protect Android numeric input while typing.');
}
if (!/touch-action:manipulation/.test(v403) || !/font-size:16px!important/.test(v403)) {
  fail('V40.3 is missing Android touch and keyboard safeguards.');
}

const giocoCleanup = read('v396-jogo-ui-cleanup.js');
if (!/#v27JogoTerrain\{display:none!important\}/.test(giocoCleanup)) fail('Jogo cleanup does not suppress the obsolete V27 terrain panel.');
if (!/#v392JogoPanel\{display:none!important\}/.test(giocoCleanup)) fail('Jogo cleanup does not suppress the duplicated V39.2 panel.');
if (!/#jogoPanel\.show #v37JogoPanel/.test(giocoCleanup)) fail('Jogo cleanup does not force the single active panel to remain visible.');

if (failures.length) {
  console.error('\nSTATIC AUDIT FAILED');
  failures.forEach((message, index) => console.error(`${index + 1}. ${message}`));
  process.exit(1);
}

console.log('\nSTATIC AUDIT PASSED');
notes.forEach(message => console.log(`- ${message}`));
