from pathlib import Path

path = Path('scripts/refactor-v406.py')
text = path.read_text(encoding='utf-8')
old = '''text = replace_once(\n    text,\n    "setInterval(()=>{if(document.getElementById('gmViewAssistant')?.classList.contains('active'))renderGMAssistant();},2500);",\n    "window.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all'].includes(kind)&&document.getElementById('gmViewAssistant')?.classList.contains('active')&&!document.hidden)setTimeout(renderGMAssistant,0);},{passive:true});",\n    'cinematic GM assistant poll',\n)'''
new = '''text = sub_once(\n    text,\n    r"setInterval\\(\\(\\)=>\\{if\\([^{}]*gmViewAssistant[^{}]*\\)renderGMAssistant\\(\\);\\},\\s*2500\\);",\n    "window.addEventListener('jjk:runtime-scheduled',event=>{const kind=event.detail?.kind||'state';if(['state','remote','screen','all'].includes(kind)&&document.getElementById('gmViewAssistant')?.classList.contains('active')&&!document.hidden)setTimeout(renderGMAssistant,0);},{passive:true});",\n    'cinematic GM assistant poll',\n)'''
if old not in text:
    if new not in text:
        raise SystemExit('V40.6 cinematic generator block not found')
else:
    text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
