from pathlib import Path
import json


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f'V40.8: block not found for {label}')


index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
index = replace_once(
    index,
    'sfx.js?v=20260819s407a',
    'sfx.js?v=20260819s408a',
    'sfx cache key',
)
index_path.write_text(index, encoding='utf-8')

sfx_path = Path('sfx.js')
sfx = sfx_path.read_text(encoding='utf-8')
catalog_loader = " ['character-catalog-v407.js?v=20260819v407a','jjk-v407-character-catalog'],\n"
state_loaders = (
    " ['legacy-bridge-v408.js?v=20260819v408a','jjk-v408-legacy-bridge'],\n"
    " ['game-state-v408.js?v=20260819v408a','jjk-v408-game-state'],\n"
)
if 'legacy-bridge-v408.js?v=20260819v408a' not in sfx:
    if catalog_loader not in sfx:
        raise SystemExit('V40.8: Character Catalog loader anchor missing')
    sfx = sfx.replace(catalog_loader, catalog_loader + state_loaders, 1)
sfx_path.write_text(sfx, encoding='utf-8')

package_path = Path('package.json')
package_data = json.loads(package_path.read_text(encoding='utf-8'))
package_data['version'] = '40.8.0'
package_path.write_text(json.dumps(package_data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

workflow_path = Path('.github/workflows/v39-tests.yml')
workflow = workflow_path.read_text(encoding='utf-8')
syntax_anchor = '          node --check character-catalog-v407.js\n'
syntax_lines = (
    '          node --check legacy-bridge-v408.js\n'
    '          node --check game-state-v408.js\n'
)
if 'node --check legacy-bridge-v408.js' not in workflow:
    if syntax_anchor not in workflow:
        raise SystemExit('V40.8: syntax-check anchor missing')
    workflow = workflow.replace(syntax_anchor, syntax_anchor + syntax_lines, 1)
workflow_path.write_text(workflow, encoding='utf-8')

audit_path = Path('scripts/static-audit.mjs')
audit = audit_path.read_text(encoding='utf-8')
audit = replace_once(
    audit,
    '20260819s406a|20260819s407a)/.test(index)',
    '20260819s406a|20260819s407a|20260819s408a)/.test(index)',
    'approved sfx cache keys',
)
audit = audit.replace('approved V39.7-V40.7 sfx cache key', 'approved V39.7-V40.8 sfx cache key', 1)
audit = replace_once(
    audit,
    "if (!/sfx\\.js\\?v=20260819s407a/.test(index)) {\n  fail('index.html does not activate the V40.7 loader cache key.');\n}",
    "if (!/sfx\\.js\\?v=20260819s408a/.test(index)) {\n  fail('index.html does not activate the V40.8 loader cache key.');\n}",
    'active V40.8 cache key',
)

sfx_anchor = "const sfx = read('sfx.js');\n"
state_audit = """const legacyBridge408 = read('legacy-bridge-v408.js');
if (!/legacy state bridge/.test(legacyBridge408) || !/function read\\(name\\)/.test(legacyBridge408) || !/function write\\(name,value\\)/.test(legacyBridge408)) {
  fail('V40.8 Legacy Bridge foundation is missing.');
}
if (/localStorage\\./.test(legacyBridge408) || /setInterval\\s*\\(/.test(legacyBridge408)) {
  fail('V40.8 Legacy Bridge must not create a second persisted or polling state source.');
}
const gameState408 = read('game-state-v408.js');
if (!/semantic game state facade/.test(gameState408) || !/function roomSnapshot/.test(gameState408) || !/function patch\\(values,options=\\{\\}\\)/.test(gameState408)) {
  fail('V40.8 Game State facade is incomplete.');
}
if (/setInterval\\s*\\(/.test(gameState408)) {
  fail('V40.8 Game State must remain event-driven.');
}
"""
if "const legacyBridge408 = read('legacy-bridge-v408.js');" not in audit:
    if sfx_anchor not in audit:
        raise SystemExit('V40.8: static audit sfx anchor missing')
    audit = audit.replace(sfx_anchor, state_audit + '\n' + sfx_anchor, 1)

loader_anchor = "if (!/character-catalog-v407\\.js\\?v=20260819v407a/.test(sfx)) fail('sfx.js does not load the V40.7 Character Catalog before gameplay patches.');\n"
loader_checks = """const v408CatalogLoader = sfx.indexOf('character-catalog-v407.js?v=20260819v407a');
const v408BridgeLoader = sfx.indexOf('legacy-bridge-v408.js?v=20260819v408a');
const v408StateLoader = sfx.indexOf('game-state-v408.js?v=20260819v408a');
if (!(v408CatalogLoader >= 0 && v408BridgeLoader > v408CatalogLoader && v408StateLoader > v408BridgeLoader)) {
  fail('sfx.js must load Character Catalog, Legacy Bridge and Game State in that order.');
}
"""
if 'const v408CatalogLoader = sfx.indexOf' not in audit:
    if loader_anchor not in audit:
        raise SystemExit('V40.8: catalog loader audit anchor missing')
    audit = audit.replace(loader_anchor, loader_anchor + loader_checks, 1)

audit_path.write_text(audit, encoding='utf-8')

print('V40.8 Game State + Legacy Bridge preparation complete')
