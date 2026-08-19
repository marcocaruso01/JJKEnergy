from pathlib import Path

path = Path('scripts/refactor-v406.py')
text = path.read_text(encoding='utf-8')

# The current v14-cinematic.js in main is already event-driven and contains no
# recurring GM-assistant interval. Earlier audit notes referred to an older
# version of the file, so V40.6 must leave the current cinematic source intact.
start_marker = "text = read('v14-cinematic.js')"
end_marker = "text = read('gm-ai.js')"
if start_marker in text:
    start = text.index(start_marker)
    end = text.index(end_marker, start)
    text = text[:start] + "# v14-cinematic.js already has no recurring polling; preserve it unchanged.\n\n" + text[end:]

text = text.replace(
    "    ('v14-cinematic.js?v=20260714v14', 'v14-cinematic.js?v=20260819v406a', 'cinematic cache'),\n",
    "",
)
text = text.replace(
    "'events-v26.js','events-v26-2.js','v14-cinematic.js','gm-ai.js'",
    "'events-v26.js','events-v26-2.js','gm-ai.js'",
)

# V40.6 removes loaded UI polling at source, so the browser regression must not
# require specific old native timers to exist. It should only require that
# genuinely periodic work still exists and that none comes from refactored UI
# modules. Static audit separately proves the required V36 network fallbacks are
# still present in source.
old_timer_assertions = """  expect(result.aliases).toBe(true);
  expect(result.native.some(item=>item.file==='index.html'&&item.delay>=1000)).toBe(true);
  expect(result.native.some(item=>item.file==='enhancements.js'&&item.delay>=4000)).toBe(true);"""
new_timer_assertions = """  expect(result.aliases).toBe(true);
  expect(result.native.length).toBeGreaterThan(0);
  const forbidden=[...SOURCE_REFACTORED,'gm-ai.js'];
  expect(result.native.filter(item=>forbidden.includes(item.file))).toEqual([]);"""
if old_timer_assertions in text:
    text = text.replace(old_timer_assertions, new_timer_assertions, 1)
elif new_timer_assertions not in text:
    raise SystemExit('V40.6 network timer regression assertion block not found')

path.write_text(text, encoding='utf-8')
