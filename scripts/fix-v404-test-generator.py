from pathlib import Path
import re

path = Path('scripts/deploy-v404.py')
text = path.read_text(encoding='utf-8')

old_idle = """  const before=await page.evaluate(()=>({flushes:window.JJKV404.audit().flushCount,runs:window.JJKV404.blocked.reduce((sum,item)=>sum+item.runs,0)}));
  await page.waitForTimeout(1800);
  const after=await page.evaluate(()=>({flushes:window.JJKV404.audit().flushCount,runs:window.JJKV404.blocked.reduce((sum,item)=>sum+item.runs,0)}));
  expect(after.flushes-before.flushes).toBeLessThanOrEqual(1);
  expect(after.runs-before.runs).toBeLessThanOrEqual(window.JJKV404?.blocked?.length||0);"""
new_idle = """  const before=await page.evaluate(()=>({flushes:window.JJKV404.audit().flushCount,runs:window.JJKV404.blocked.reduce((sum,item)=>sum+item.runs,0),blocked:window.JJKV404.blocked.length}));
  await page.waitForTimeout(1800);
  const after=await page.evaluate(()=>({flushes:window.JJKV404.audit().flushCount,runs:window.JJKV404.blocked.reduce((sum,item)=>sum+item.runs,0),blocked:window.JJKV404.blocked.length}));
  expect(after.flushes-before.flushes).toBeLessThanOrEqual(1);
  expect(after.runs-before.runs).toBeLessThanOrEqual(Math.max(before.blocked,after.blocked));"""

old_resource = """  await page.evaluate(()=>window.openCharacter('gojo',{silentStats:true}));
  await page.waitForTimeout(250);
  const before=Number(await page.locator('#energyValue').textContent());
  await page.locator('#energyActions .gain').first().click();"""
new_resource = """  await page.evaluate(()=>window.openCharacter('gojo',{silentStats:true}));
  await page.waitForTimeout(250);
  const resourcesTab=page.getByRole('button',{name:/Risorse/});
  if(await resourcesTab.isVisible()){
    await resourcesTab.click();
    await page.waitForTimeout(180);
  }
  const before=Number(await page.locator('#energyValue').textContent());
  await page.locator('#energyActions .gain').first().click();"""

if old_idle in text:
    text = text.replace(old_idle, new_idle, 1)
elif new_idle not in text:
    raise SystemExit('Idle test generator block not found')

if old_resource in text:
    text = text.replace(old_resource, new_resource, 1)
elif new_resource not in text:
    raise SystemExit('Resource test generator block not found')

# GitHub App tokens cannot push workflow-file changes. The final runtime does not
# need to modify the existing syntax workflow because the PR audit and browser
# suite validate v404-event-runtime.js directly before merge.
workflow_pattern = re.compile(
    r'''workflow = Path\(["']\.github/workflows/v39-tests\.yml["']\)\n'''
    r'''.*?'''
    r'''workflow\.write_text\(yml, encoding=["']utf-8["']\)\n\n''',
    re.S,
)
text, removed = workflow_pattern.subn('', text, count=1)
if removed != 1 and 'workflow = Path(".github/workflows/v39-tests.yml")' in text:
    raise SystemExit('Could not remove workflow modification block')

path.write_text(text, encoding='utf-8')
