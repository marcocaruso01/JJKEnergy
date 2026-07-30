/* JJK Energy V40.3 - performance, Android input stability and queued resources */
(function(root,factory){
  const api=factory(root||globalThis);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.JJKV403=api;if(root.document)api.install();}
})(typeof window!=='undefined'?window:globalThis,function(root){
'use strict';

const VERSION='40.3.0';
const ANDROID=!!(root.navigator&&/Android/i.test(root.navigator.userAgent||''));
const MOBILE=ANDROID||!!(root.matchMedia&&root.matchMedia('(max-width:900px)').matches);
const num=value=>Number.isFinite(Number(value))?Number(value):0;
function read(name,fallback=null){try{const value=(0,eval)(name);return value===undefined?fallback:value;}catch(_){return root[name]===undefined?fallback:root[name];}}
function getfn(name){const value=read(name,root[name]);return typeof value==='function'?value:null;}
function setfn(name,value){root[name]=value;root.__v403Fn=value;try{(0,eval)(name+'=globalThis.__v403Fn');}catch(_){}delete root.__v403Fn;}
function room(){return read('roomSession',root.roomSession||null);}
function applyingRemote(){return !!read('roomApplyingRemoteState',root.roomApplyingRemoteState||false);}

let drawerToken='';
let editingId='';
let editingValue='';
let editingTimer=null;
let syncTimer=null;
let queuePromise=Promise.resolve();
const pending=new Map();
const originals={};

function ensureStyle(){
  if(document.getElementById('v403PerformanceStyle'))return;
  const style=document.createElement('style');
  style.id='v403PerformanceStyle';
  style.textContent=`
    html.v403-android button,html.v403-mobile button{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    html.v403-android input,html.v403-android select,html.v403-mobile #mobileV24GMDrawer input,html.v403-mobile #mobileV24GMDrawer select{font-size:16px!important}
    #mobileV24GMDrawer .mobile-v24-gm-resource-card{overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
    #mobileV24GMDrawer button{min-height:48px}
    #mobileV24GMDrawer input,#mobileV24GMDrawer select{min-height:48px}
    #mobileV24GMDrawer.v403-pending .mobile-v24-gm-resource-card{pointer-events:auto}
    #mobileV24GMDrawer.v403-pending [data-v24-delta],#mobileV24GMDrawer.v403-pending [data-v24-op],#mobileV24GMDrawer.v403-pending [data-v24-exact],#mobileV24GMDrawer.v403-pending [data-v24-zero]{opacity:.82}
    @media(max-width:900px){
      #gmPlayerGrid>.gm-player-card{content-visibility:auto;contain-intrinsic-size:420px;contain:layout paint style}
      .gm-player-card img{content-visibility:auto}
    }
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}}
  `;
  document.head.appendChild(style);
  document.documentElement.classList.toggle('v403-android',ANDROID);
  document.documentElement.classList.toggle('v403-mobile',MOBILE);
}

function stateSignature(){
  const session=room();
  if(!session)return'none';
  const players=(session.players||[]).map(player=>{
    const state=player.state||{};
    return[
      player.playerToken||player.peerId||'',player.characterId||'',player.connected!==false?1:0,player.locked?1:0,
      player.selfManage===false?0:1,player.hasEye?1:0,player.bossRush?1:0,player.stateVersion||0,
      state.updatedAt||player.stateUpdatedAt||0,state.gradeId||'',state.life??'',state.maxLife??'',state.energy??'',state.exp??'',
      state.combatBonus??'',state.tokens??'',state.jogoHeat??'',state.jogoVolcanoes??'',state.jogoCraters??'',
      state.tojiCollectedEnergy??'',state.itadoriFingers??'',state.yutaCopiedTokens??'',state.yutaCopiedVigor??'',state.yutaCopiedFingers??'',state.yutaCopiedHeat??''
    ].join(':');
  }).join('|');
  return[session.code||'',session.phase||'',session.isHost?1:0,players,read('gmUiView',''),read('gmUiSearch',''),read('gmUiStatus','')].join('#');
}

function preserveFlags(target,source){
  ['__v24','__v37','__v392','__v398','__v399','__v400Counter','__v401Jogo','__v402Jogo'].forEach(flag=>{if(source&&source[flag])target[flag]=true;});
  return target;
}

function wrapGmRender(){
  const active=getfn('renderGMDashboard');
  if(!active||active.__v403Performance)return;
  originals.renderGMDashboard=active;
  let lastSignature='';
  let lastRun=0;
  let timer=null;
  let queuedArgs=null;
  const execute=(ctx,args)=>{
    timer=null;
    const signature=stateSignature();
    const grid=document.getElementById('gmPlayerGrid');
    if(signature===lastSignature&&grid&&grid.childElementCount>0){restoreEditingSoon();return;}
    lastSignature=signature;lastRun=performance.now();
    const output=active.apply(ctx,args||[]);
    restoreEditingSoon();
    return output;
  };
  const wrapped=function(){
    queuedArgs=[...arguments];
    const now=performance.now();
    const signature=stateSignature();
    const grid=document.getElementById('gmPlayerGrid');
    if(signature===lastSignature&&grid&&grid.childElementCount>0){restoreEditingSoon();return;}
    const wait=Math.max(0,(MOBILE?120:70)-(now-lastRun));
    if(wait>0){if(!timer)timer=setTimeout(()=>execute(this,queuedArgs),wait);return;}
    return execute(this,queuedArgs);
  };
  wrapped.__v403Performance=true;preserveFlags(wrapped,active);setfn('renderGMDashboard',wrapped);
}

function installStateSyncDebounce(){
  const active=getfn('scheduleRoomPlayerStateSync');
  if(!active||active.__v403Performance)return;
  originals.scheduleRoomPlayerStateSync=active;
  const wrapped=function(){
    const session=room();
    if(applyingRemote()||!session||session.isHost||session.phase!=='playing')return;
    clearTimeout(syncTimer);
    syncTimer=setTimeout(()=>{syncTimer=null;try{root.sendLocalPlayerState?.(false);}catch(_){}},ANDROID?420:(MOBILE?320:220));
  };
  wrapped.__v403Performance=true;setfn('scheduleRoomPlayerStateSync',wrapped);
}

function drawer(){return document.getElementById('mobileV24GMDrawer');}
function currentPlayer(){try{return drawerToken&&getfn('roomFindPlayer')?.(drawerToken)||null;}catch(_){return null;}}
function currentField(){return document.getElementById('mobileV24GMField')?.value||'energy';}
function fieldValue(player,field){return num(player?.state?.[field]);}
function status(text){const element=document.getElementById('mobileV24GMStatus');if(element)element.textContent=text||'';}
function optimistic(delta){
  const current=document.getElementById('mobileV24GMCurrent');
  if(current){const base=num(current.textContent);current.textContent=String(Math.max(0,base+delta));}
  const exact=document.getElementById('mobileV24GMExact');
  if(exact&&document.activeElement!==exact)exact.value=current?.textContent||exact.value;
}

function flushKey(key){
  const item=pending.get(key);if(!item)return;
  pending.delete(key);clearTimeout(item.timer);
  const delta=item.delta;
  if(!delta)return;
  const panel=drawer();panel?.classList.add('v403-pending');
  status('Aggiornamento risorsa…');
  queuePromise=queuePromise.then(async()=>{
    const fn=getfn('gmAdjustPlayer');
    if(!fn)throw new Error('gmAdjustPlayer non disponibile');
    await Promise.resolve(fn(item.token,item.field,delta,true));
    const player=currentPlayer();
    status((item.label||item.field)+': '+fieldValue(player,item.field));
  }).catch(()=>status('Modifica non riuscita. Riprova.')).finally(()=>{
    if(pending.size===0)panel?.classList.remove('v403-pending');
    restoreEditingSoon();
  });
}

function enqueueResourceDelta(token,field,delta,label='Risorsa'){
  token=String(token||'');field=String(field||'');delta=Math.trunc(num(delta));
  if(!token||!field||!delta)return false;
  const key=token+'|'+field;
  const item=pending.get(key)||{token,field,delta:0,label,timer:null};
  item.delta+=delta;item.label=label||item.label;
  clearTimeout(item.timer);item.timer=setTimeout(()=>flushKey(key),ANDROID?130:90);
  pending.set(key,item);optimistic(delta);status('Modifica in coda: '+(item.delta>0?'+':'')+item.delta);
  return true;
}

function interceptDrawerClick(event){
  const resourceOpen=event.target.closest('[data-v24-resources]');
  if(resourceOpen){drawerToken=String(resourceOpen.dataset.v24Resources||'');return;}
  if(event.target.closest('.mobile-v24-gm-close')||event.target===drawer()){drawerToken='';return;}
  const control=event.target.closest('[data-v24-delta],[data-v24-op],[data-v24-exact],[data-v24-zero]');
  if(!control||!drawer()?.classList.contains('show')||!drawerToken)return;
  const player=currentPlayer(),field=currentField();if(!player||!field)return;
  let delta=0;
  if(control.hasAttribute('data-v24-delta'))delta=Math.trunc(num(control.dataset.v24Delta));
  else if(control.hasAttribute('data-v24-op')){
    const amount=Math.abs(Math.trunc(num(document.getElementById('mobileV24GMAmount')?.value)));
    if(!amount){status('Inserisci una quantità maggiore di zero.');event.preventDefault();event.stopImmediatePropagation();return;}
    delta=Math.trunc(num(control.dataset.v24Op))*amount;
  }else if(control.hasAttribute('data-v24-exact')){
    const target=Math.max(0,Math.trunc(num(document.getElementById('mobileV24GMExact')?.value)));
    delta=target-fieldValue(player,field);
  }else if(control.hasAttribute('data-v24-zero'))delta=-fieldValue(player,field);
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  enqueueResourceDelta(drawerToken,field,delta,document.getElementById('mobileV24GMField')?.selectedOptions?.[0]?.textContent||field);
}

function beginEditing(input){
  if(!input||!['mobileV24GMAmount','mobileV24GMExact'].includes(input.id))return;
  editingId=input.id;editingValue=input.value;clearTimeout(editingTimer);editingLoop();
}
function editingLoop(){
  clearTimeout(editingTimer);
  if(!editingId)return;
  const input=document.getElementById(editingId);
  if(!input||document.activeElement!==input){editingId='';return;}
  if(input.value!==editingValue)input.value=editingValue;
  editingTimer=setTimeout(editingLoop,120);
}
function restoreEditingSoon(){
  if(!editingId)return;
  [0,40,120].forEach(delay=>setTimeout(()=>{
    const input=document.getElementById(editingId);
    if(input&&document.activeElement===input&&input.value!==editingValue)input.value=editingValue;
  },delay));
}
function installInputProtection(){
  if(document.documentElement.dataset.v403InputEvents==='1')return;
  document.documentElement.dataset.v403InputEvents='1';
  document.addEventListener('click',interceptDrawerClick,true);
  document.addEventListener('focusin',event=>beginEditing(event.target),true);
  document.addEventListener('input',event=>{
    if(event.target?.id===editingId)editingValue=event.target.value;
  },true);
  document.addEventListener('focusout',event=>{
    if(event.target?.id===editingId){clearTimeout(editingTimer);editingTimer=null;editingId='';editingValue='';}
  },true);
  document.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch'&&event.target.closest('button'))event.target.closest('button').classList.add('v403-touch-active');
  },{capture:true,passive:true});
  document.addEventListener('pointerup',event=>event.target.closest('button')?.classList.remove('v403-touch-active'),{capture:true,passive:true});
}

function bind(){ensureStyle();wrapGmRender();installStateSyncDebounce();installInputProtection();}
function audit(){
  const checks={version:VERSION,androidClass:!ANDROID||document.documentElement.classList.contains('v403-android'),inputEvents:document.documentElement.dataset.v403InputEvents==='1',gmRenderWrapped:!!getfn('renderGMDashboard')?.__v403Performance};
  checks.ok=Object.entries(checks).filter(([key])=>!['version','ok'].includes(key)).every(([,value])=>value===true);
  root.JJKV403Audit=checks;return checks;
}
function install(){
  if(root.__JJK_V403_INSTALLED__)return;root.__JJK_V403_INSTALLED__=true;
  const start=()=>{
    bind();setTimeout(bind,500);setTimeout(bind,1800);setTimeout(()=>{bind();audit();},2800);
    setInterval(()=>{if(!document.hidden)bind();},3000);
    console.info('JJK Energy performance and Android fixes ready',VERSION);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}

return{version:VERSION,install,audit,enqueueResourceDelta,setDrawerToken(value){drawerToken=String(value||'');},get pendingCount(){return pending.size;},get android(){return ANDROID;}};
});
