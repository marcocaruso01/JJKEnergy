/* JJK Energy V39.9.1 - Itadori UI, milestone notifications and max-life sync */
(function(root,factory){
  const api=factory(root||globalThis);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
'use strict';

const VERSION='39.9.1';
const THRESHOLDS=[4,8,12,16,20];
const MONSTER_KEY='jjk_itadori_v37_monster_fingers';
const num=value=>Number.isFinite(Number(value))?Number(value):0;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,num(value)));

function fingerBonuses(value){
  const fingers=clamp(value,0,20);
  const out={body:0,life:0,energy:0};
  if(fingers>=4)out.body+=1;
  if(fingers>=8){out.body+=1;out.life+=1;}
  if(fingers>=12){out.body+=1;out.life+=1;out.energy+=2;}
  if(fingers>=16){out.body+=1;out.life+=1;out.energy+=2;}
  if(fingers>=20){out.body+=1;out.life+=1;out.energy+=2;}
  return out;
}

function maxLifeForFingers(value){return 4+fingerBonuses(value).life;}

function thresholdUpgrade(value){
  const threshold=Number(value);
  if(threshold===4)return '+1 Corpo permanente';
  if(threshold===8)return '+1 Corpo permanente · +1 Vita massima';
  if([12,16,20].includes(threshold))return '+1 Corpo permanente · +1 Vita massima · +2 EM massima';
  return '';
}

function read(name,fallback=null){
  try{const value=(0,eval)(name);return value===undefined?fallback:value;}
  catch(_){return root[name]===undefined?fallback:root[name];}
}
function write(name,value){
  root.__v399Value=value;
  try{(0,eval)(name+'=globalThis.__v399Value');}
  catch(_){try{root[name]=value;}catch(__){}}
  delete root.__v399Value;
}
function getfn(name){const value=read(name,root[name]);return typeof value==='function'?value:null;}
function setfn(name,value){
  root[name]=value;root.__v399Fn=value;
  try{(0,eval)(name+'=globalThis.__v399Fn');}catch(_){}
  delete root.__v399Fn;
}
function chars(){return read('characters',root.characters||{});}
function cid(){return read('currentId',null);}
function currentFingers(){return clamp(read('itadoriFingers',0),0,20);}
function maxFingers(){return clamp(read('itadoriMaxFingers',0),0,20);}
function roomAllowed(){const fn=getfn('roomActionAllowed');try{return fn?!!fn():true;}catch(_){return true;}}
function storageGet(key,fallback='0'){try{const value=localStorage.getItem(key);return value===null?fallback:value;}catch(_){return fallback;}}
function storageSet(key,value){try{localStorage.setItem(key,String(value));}catch(_){} }
function monsterCount(){return clamp(storageGet(MONSTER_KEY,'0'),0,12);}
function saveRender(){try{getfn('saveState')?.();}catch(_){}try{getfn('renderAll')?.();}catch(_){} }
function log(title,text){try{getfn('addLog')?.(title,text);}catch(_){} }
function show(title,value,text){try{getfn('showModal')?.(title,value,text);}catch(_){} }

function ensureStyle(){
  if(document.getElementById('v399ItadoriStyle'))return;
  const style=document.createElement('style');
  style.id='v399ItadoriStyle';
  style.textContent=`
    body.theme-itadori #itadoriChosoPanel{display:none!important}
    body.theme-itadori #v392ItadoriPanel{padding:14px!important;overflow:hidden}
    body.theme-itadori #v392ItadoriPanel .v392-actions{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
    body.theme-itadori #v392ItadoriPanel .v392-actions button{min-width:0!important;min-height:62px!important;padding:9px 6px!important;font-size:.78rem!important;line-height:1.18!important}
    body.theme-itadori #v392ItadoriPanel .v392-actions button small{font-size:.68rem!important}
    body.theme-itadori #v392ItadoriPanel .v392-milestones{grid-template-columns:repeat(5,minmax(55px,1fr))!important;overflow-x:auto!important;padding-bottom:2px}
    body.theme-itadori #v392ItadoriPanel .v392-milestones span{white-space:nowrap}
    body.theme-itadori #v398FingerRules{margin-top:10px!important;padding:10px 11px;border:1px solid rgba(255,103,91,.2);border-radius:12px;background:rgba(9,7,12,.55);font-size:.7rem!important}
    body.theme-itadori #v37BloodNowBtn.v399-inline-blood{position:static!important;inset:auto!important;z-index:auto!important;display:none!important;width:100%!important;max-width:none!important;margin:10px 0 0!important;padding:12px 14px!important;border-radius:14px!important;text-align:center!important;box-shadow:none!important}
    body.theme-itadori #v37BloodNowBtn.v399-inline-blood.show{display:block!important}
    body.theme-itadori #v37BloodNowBtn.v399-inline-blood b{font-size:.86rem!important}
    body.theme-itadori #v37BloodNowBtn.v399-inline-blood small{font-size:.68rem!important;line-height:1.3!important}
    #v399FingerNotifications{position:fixed;top:calc(env(safe-area-inset-top,0px) + 14px);left:50%;z-index:190000;display:grid;gap:8px;width:min(410px,calc(100vw - 28px));transform:translateX(-50%);pointer-events:none}
    .v399-finger-toast{padding:13px 14px;border:1px solid rgba(255,113,91,.72);border-radius:16px;background:linear-gradient(145deg,rgba(69,20,23,.98),rgba(16,9,17,.98));box-shadow:0 16px 44px rgba(0,0,0,.55),0 0 22px rgba(255,76,57,.2);color:#fff;animation:v399ToastIn .24s ease both}
    .v399-finger-toast strong,.v399-finger-toast span{display:block}.v399-finger-toast strong{font-size:.88rem}.v399-finger-toast span{margin-top:4px;color:#ffd2c7;font-size:.73rem;line-height:1.35}
    .v399-finger-toast.out{animation:v399ToastOut .2s ease both}
    @keyframes v399ToastIn{from{opacity:0;transform:translateY(-12px) scale(.97)}to{opacity:1;transform:none}}
    @keyframes v399ToastOut{to{opacity:0;transform:translateY(-8px) scale(.98)}}
    @media(max-width:390px){body.theme-itadori #v392ItadoriPanel .v392-actions{grid-template-columns:1fr!important}body.theme-itadori #v392ItadoriPanel .v392-actions button{min-height:54px!important}}
  `;
  document.head.appendChild(style);
}

function syncItadoriMaxLife(){
  const character=chars().itadori;
  if(!character)return 4;
  const maximum=maxLifeForFingers(maxFingers());
  character.baseMaxLife=4;
  character.maxLife=maximum;
  if(cid()==='itadori'){
    write('current',character);
    const maxNode=document.getElementById('lifeMaxValue');
    if(maxNode)maxNode.textContent=String(maximum);
  }
  return maximum;
}

function ensureNotificationHost(){
  let host=document.getElementById('v399FingerNotifications');
  if(!host){host=document.createElement('div');host.id='v399FingerNotifications';host.setAttribute('aria-live','polite');document.body.appendChild(host);}
  return host;
}

function notifyThreshold(threshold,delay=0){
  const upgrade=thresholdUpgrade(threshold);if(!upgrade)return;
  setTimeout(()=>{
    const host=ensureNotificationHost(),toast=document.createElement('div');
    toast.className='v399-finger-toast';
    toast.innerHTML='<strong>'+threshold+' Dita raggiunte</strong><span>Upgrade ottenuto: '+upgrade+'. Vita massima attuale: '+maxLifeForFingers(threshold)+'.</span>';
    host.appendChild(toast);
    setTimeout(()=>{toast.classList.add('out');setTimeout(()=>toast.remove(),220);},3600);
  },delay);
}

let observedMax=null;

function awardFingers(amount,source,monster=false){
  if(cid()!=='itadori'||!roomAllowed())return;
  if(monster&&monsterCount()>=12){show('Limite mostri raggiunto','12 / 12','Itadori ha già ottenuto il massimo di 12 Dita tramite i mostri.');return;}
  const before=currentFingers(),oldMax=maxFingers(),after=clamp(before+num(amount),0,20);
  if(after===before){show('Limite Dita raggiunto','20 / 20','Itadori ha già raggiunto il limite massimo di Dita.');return;}
  const newMax=Math.max(oldMax,after),oldBonus=fingerBonuses(oldMax),newBonus=fingerBonuses(newMax);
  write('itadoriFingers',after);write('itadoriMaxFingers',newMax);
  if(monster)storageSet(MONSTER_KEY,monsterCount()+1);
  const lifeGain=Math.max(0,newBonus.life-oldBonus.life),energyGain=Math.max(0,newBonus.energy-oldBonus.energy);
  syncItadoriMaxLife();
  if(lifeGain)write('life',Math.max(0,num(read('life',0)))+lifeGain);
  if(energyGain)write('energy',Math.max(0,num(read('energy',0)))+energyGain);
  const reached=THRESHOLDS.filter(value=>oldMax<value&&newMax>=value);
  observedMax=newMax;
  log(source,before+' → '+after+' Dita · massimo '+newMax+'/20.'+(lifeGain?' Vita massima +'+lifeGain+'.':'')+(energyGain?' EM massima +'+energyGain+'.':''));
  saveRender();
  reached.forEach((value,index)=>notifyThreshold(value,index*500));
}

function correctFinger(){
  if(cid()!=='itadori'||!roomAllowed())return;
  const before=currentFingers();if(before<=0)return;
  write('itadoriFingers',before-1);
  log('Correzione Dita',before+' → '+(before-1)+'. Il massimo raggiunto e gli upgrade permanenti non cambiano.');
  saveRender();
}

function bindItadoriActions(panel){
  if(!panel||panel.id!=='v392ItadoriPanel')return;
  const actions=[
    ['[data-v392-monster]',()=>awardFingers(1,'Mostro abbattuto',true)],
    ['[data-v392-sukuna]',()=>awardFingers(5,'Sukuna sconfitto')],
    ['[data-v392-stolen]',()=>awardFingers(1,'Dito rubato')],
    ['[data-v392-correct]',correctFinger]
  ];
  actions.forEach(([selector,action])=>{
    const button=panel.querySelector(selector);if(!button)return;
    button.type='button';button.dataset.v399Bound='1';
    button.onclick=event=>{event.preventDefault();event.stopPropagation();action();};
  });
}

function cleanItadoriScreen(){
  ensureStyle();
  const obsolete=document.getElementById('itadoriChosoPanel');
  if(obsolete){obsolete.hidden=true;obsolete.setAttribute('aria-hidden','true');obsolete.classList.remove('show');}
  const panel=document.getElementById('v392ItadoriPanel')||document.getElementById('v37ItadoriPanel');
  if(panel)bindItadoriActions(panel);
  const blood=document.getElementById('v37BloodNowBtn');
  if(panel&&blood){
    blood.classList.add('v399-inline-blood');
    blood.innerHTML='<b>Manipolazione del Sangue</b><small>1 Vita → 10 EM · utilizzabile in qualsiasi momento</small>';
    if(blood.parentElement!==panel)panel.appendChild(blood);
  }
}

function checkProgression(){
  if(cid()!=='itadori'){observedMax=null;return;}
  const currentMax=maxFingers();
  syncItadoriMaxLife();cleanItadoriScreen();
  if(observedMax===null){observedMax=currentMax;return;}
  if(currentMax<observedMax){observedMax=currentMax;return;}
  if(currentMax===observedMax)return;
  const reached=THRESHOLDS.filter(value=>observedMax<value&&currentMax>=value);
  reached.forEach((value,index)=>notifyThreshold(value,index*500));
  observedMax=currentMax;
}

function wrap(name,factory){
  const active=getfn(name);if(!active||active.__v399)return;
  const wrapped=factory(active);wrapped.__v399=true;
  if(active.__v398)wrapped.__v398=true;if(active.__v392)wrapped.__v392=true;if(active.__v37)wrapped.__v37=true;
  setfn(name,wrapped);
}

function patchCore(){
  ['renderAll','renderHeader','updateBars'].forEach(name=>wrap(name,original=>function(){
    syncItadoriMaxLife();
    const result=original.apply(this,arguments);
    syncItadoriMaxLife();cleanItadoriScreen();checkProgression();
    return result;
  }));
  wrap('buildLocalPlayerState',original=>function(){
    const state=original.apply(this,arguments);
    if(state?.characterId==='itadori')state.maxLife=maxLifeForFingers(state.itadoriMaxFingers);
    return state;
  });
  wrap('sanitizeRoomState',original=>function(state,characterId){
    const clean=original.apply(this,arguments)||{};
    if(characterId==='itadori')clean.maxLife=maxLifeForFingers(state?.itadoriMaxFingers);
    return clean;
  });
  wrap('openCharacter',original=>function(id){
    const result=original.apply(this,arguments);
    if(id==='itadori'){observedMax=null;setTimeout(()=>{syncItadoriMaxLife();cleanItadoriScreen();checkProgression();},0);}
    return result;
  });
}

function installEvents(){
  if(document.documentElement.dataset.v399ItadoriEvents==='1')return;
  document.documentElement.dataset.v399ItadoriEvents='1';
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-v392-monster],[data-v392-sukuna],[data-v392-stolen],[data-v392-correct]'))setTimeout(checkProgression,0);
  });
}

function audit(){
  const checks={
    version:VERSION,
    lifeAt0:maxLifeForFingers(0)===4,
    lifeAt8:maxLifeForFingers(8)===5,
    lifeAt12:maxLifeForFingers(12)===6,
    lifeAt16:maxLifeForFingers(16)===7,
    lifeAt20:maxLifeForFingers(20)===8,
    thresholds:THRESHOLDS.every(value=>!!thresholdUpgrade(value))
  };
  checks.ok=Object.entries(checks).filter(([key])=>!['version','ok'].includes(key)).every(([,value])=>value===true);
  root.JJKV399Audit=checks;return checks;
}

function bind(){patchCore();installEvents();syncItadoriMaxLife();cleanItadoriScreen();checkProgression();}
function install(){
  if(root.__JJK_V399_INSTALLED__)return;root.__JJK_V399_INSTALLED__=true;
  const wait=attempt=>{
    if(!root.__JJK_V398_INSTALLED__&&attempt<80){setTimeout(()=>wait(attempt+1),50);return;}
    bind();setTimeout(bind,150);setTimeout(bind,600);setTimeout(()=>{bind();audit();},1500);setInterval(bind,700);
    console.info('JJK Energy Itadori UI/progression ready',VERSION);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>wait(0),{once:true});else wait(0);
}

return {version:VERSION,fingerBonuses,maxLifeForFingers,thresholdUpgrade,install,audit};
});
