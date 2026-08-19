from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f'V40.7: block not found for {label}')

index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
index = replace_once(
    index,
    'sfx.js?v=20260819s406a',
    'sfx.js?v=20260819s407a',
    'sfx cache key',
)
index_path.write_text(index, encoding='utf-8')

audit_path = Path('scripts/static-audit.mjs')
audit = audit_path.read_text(encoding='utf-8')
audit = replace_once(
    audit,
    '20260819s405a|20260819s406a)/.test(index)',
    '20260819s405a|20260819s406a|20260819s407a)/.test(index)',
    'approved sfx cache keys',
)
audit = audit.replace('approved V39.7-V40.6 sfx cache key', 'approved V39.7-V40.7 sfx cache key', 1)
anchor = "const sfx = read('sfx.js');\n"
block = """const catalog407 = read('character-catalog-v407.js');
if (!/Character Catalog foundation/.test(catalog407) || !/function legacyCharacters/.test(catalog407)) {
  fail('V40.7 Character Catalog foundation is missing.');
}
if (!/Object\\.freeze\\(\\{version:VERSION,ids,has,get,entries,legacy,technique,grade,validate,audit\\}\\)/.test(catalog407)) {
  fail('V40.7 Character Catalog API is incomplete.');
}
if (!/sfx\\.js\\?v=20260819s407a/.test(index)) {
  fail('index.html does not activate the V40.7 loader cache key.');
}
"""
if "const catalog407 = read('character-catalog-v407.js');" not in audit:
    if anchor not in audit:
        raise SystemExit('V40.7: static audit sfx anchor missing')
    audit = audit.replace(anchor, block + '\n' + anchor, 1)
loader_check = "if (!/character-catalog-v407\\.js\\?v=20260819v407a/.test(sfx)) fail('sfx.js does not load the V40.7 Character Catalog before gameplay patches.');\n"
if loader_check not in audit:
    sfx_anchor = "const sfx = read('sfx.js');\n"
    audit = audit.replace(sfx_anchor, sfx_anchor + loader_check, 1)
audit_path.write_text(audit, encoding='utf-8')

print('V40.7 Character Catalog preparation complete')
