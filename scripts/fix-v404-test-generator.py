from pathlib import Path

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

if old_idle not in text:
    if new_idle not in text:
        raise SystemExit('Idle test generator block not found')
else:
    text = text.replace(old_idle, new_idle, 1)

if old_resource not in text:
    if new_resource not in text:
        raise SystemExit('Resource test generator block not found')
else:
    text = text.replace(old_resource, new_resource, 1)

path.write_text(text, encoding='utf-8')
