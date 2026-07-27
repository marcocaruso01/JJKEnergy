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
if (!/sfx\.js\?v=(?:20260727s397[ab]|20260728s398a|20260728s399a)/.test(index)) {
  fail('index.html does not use an approved V39.7/V39.8/V39.9 sfx cache key.');
}

const sfx = read('sfx.js');
if (!/v394-technique-fix\.js\?v=20260727v397b/.test(sfx)) fail('sfx.js does not load the latest exact technique identity fix.');
if (!/v397-runtime-guards\.js\?v=20260727v397a/.test(sfx)) fail('sfx.js does not load the V39.7 runtime guards.');
if (!/v398-itadori-variable-rules\.js\?v=20260728v398a/.test(sfx)) fail('sfx.js does not load the V39.8 Itadori and variable-technique rules.');
if (!/v399-itadori-ui-progression\.js\?v=20260728v399a/.test(sfx)) fail('sfx.js does not load the V39.9 Itadori UI and progression fixes.');
if (!/v396-jogo-ui-cleanup\.js\?v=20260727v397b/.test(sfx)) fail('sfx.js does not load the latest Jogo UI cleanup.');
if (/v365-late-technique-ui\.js|v393-stability\.js/.test(sfx)) fail('sfx.js still loads an obsolete conflicting patch.');

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
  fail('V39.9 does not synchronize Itadori maximum Life with finger milestones.');
}
if (!/function thresholdUpgrade/.test(itadoriUi) || !/notifyThreshold/.test(itadoriUi)) {
  fail('V39.9 does not implement milestone upgrade notifications.');
}
if (!/itadoriChosoPanel\{display:none!important\}/.test(itadoriUi) || !/v399-inline-blood/.test(itadoriUi)) {
  fail('V39.9 does not clean the obsolete Itadori panel or integrate Blood Manipulation.');
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
