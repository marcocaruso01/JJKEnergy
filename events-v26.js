/* JJK Energy V26 - Eventi globali Boss Rush / Doppi EXP */
(function(){
'use strict';
const VERSION='V26';
let lastBossKey='';
let lastDoubleKey='';
let expNoticeTimer=0;
let gmEventBusy=false;

function room(){try{return roomSession||window.roomSession||null;}catch(e){return window.roomSession||null;}}
function events(){return room()?.settings?.events||{};}
function bossEvent(){const e=events().boss_rush;return e&&e.active?e:null;}
function doubleExpEvent(){const e=events().double_exp;return e&&e.active?e:null;}
function esc(v){try{return typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}catch(e){return String(v??'');}}
function notify(title,text,color){try{if(typeof showPlayerNotification==='function')showPlayerNotification(title,text,color||'#62c7ff');else showModal(title,'',text);}catch(e){}}
function activePlayer(){return room()?.players?.find(p=>!p.isHost&&!p.locked)||null;}
function eventKey(e){return e?String(e.started_at||e.startedAt||'active')+':'+String(e.boss_player_id||e.anchor_player_id||''):'';}

function ensureHud(){
  let el=document.getElementById('v26EventHud');
  if(el)return el;
  el=document.createElement('aside');el.id='v26EventHud';el.className='v26-event-hud';el.setAttribute('aria-live','polite');document.body.appendChild(el);
  return el;
}
function ensureTransition(){
  let el=document.getElementById('v26EventTransition');
  if(el)return el;
  el=document.createElement('div');el.id='v26EventTransition';el.className='v26-event-transition';el.innerHTML='<div class="v26-event-transition-core"><div class="v26-event-transition-icon">∞</div><div class="v26-event-transition-kicker">EVENTO DEL GAME MASTER</div><h2></h2><p></p></div>';
  document.body.appendChild(el);return el;
}
function showTransition(type,title,text){
  const el=ensureTransition();el.dataset.type=type;el.querySelector('h2').textContent=title;el.querySelector('p').textContent=text;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(showTransition._t);showTransition._t=setTimeout(()=>el.classList.remove('show'),2100);
}
function renderHud(){
  const el=ensureHud(),b=bossEvent(),d=doubleExpEvent(),r=room();
  document.body.classList.toggle('v26-boss-event-active',!!b);
  document.body.classList.toggle('v26-double-exp-active',!!d);
  if(!r||r.phase!=='playing'||(!b&&!d)){el.classList.remove('show');el.innerHTML='';return;}
  const chunks=[];
  if(b)chunks.push('<section class="v26-event-chip boss"><span class="v26-event-chip-icon">∞</span><div><b>Boss Rush</b><small>Boss: '+esc(b.boss_player_name||'—')+' · tutti possono usare le tecniche · risorse manuali gestite solo dal GM</small></div></section>');
  if(d)chunks.push('<section class="v26-event-chip exp"><span class="v26-event-chip-icon">×2</span><div><b>Doppi EXP</b><small>'+esc(d.rounds_remaining||0)+' giri rimasti · il giro termina tornando a '+esc(d.anchor_player_name||'—')+'</small></div></section>');
  el.innerHTML=chunks.join('');el.classList.add('show');
}
function forceBossEventPlayerView(){
  const b=bossEvent(),r=room();if(!b||!r||r.isHost||r.phase!=='playing')return;
  try{if(document.querySelector('.screen.active')?.id!=='player')showScreen('player');}catch(e){}
  setTimeout(()=>{try{document.querySelector('[data-v24-tab="techniques"]')?.click();document.getElementById('gameMovesDropdown')?.setAttribute('open','');}catch(e){}},60);
}
function sync(previous){
  const prevEvents=previous?.settings?.events||{},b=bossEvent(),d=doubleExpEvent(),prevB=prevEvents.boss_rush?.active?prevEvents.boss_rush:null,prevD=prevEvents.double_exp?.active?prevEvents.double_exp:null;
  renderHud();renderGMEventPanel();
  const bKey=eventKey(b),dKey=eventKey(d);
  if(b&&!prevB&&bKey!==lastBossKey){showTransition('boss','BOSS RUSH','Boss scelto: '+(b.boss_player_name||'—')+'. Tutte le schede sono sbloccate e solo le tecniche sono utilizzabili.');notify('Boss Rush attiva','Boss: '+(b.boss_player_name||'—')+'. Le risorse manuali sono bloccate.','#ffb33e');forceBossEventPlayerView();}
  if(!b&&prevB){showTransition('end','BOSS RUSH CONCLUSA','La partita torna ai turni e ai controlli precedenti.');notify('Boss Rush conclusa','Turni e permessi precedenti sono stati ripristinati.','#64c9ff');}
  if(d&&!prevD&&dKey!==lastDoubleKey){showTransition('exp','DOPPI EXP','Per '+(d.rounds_total||d.rounds_remaining||1)+' giri ogni EXP positivo vale il doppio.');notify('Doppi EXP attivo','Durata: '+(d.rounds_remaining||0)+' giri.','#ffb52e');}
  if(d&&prevD&&Number(d.rounds_remaining)!==Number(prevD.rounds_remaining))notify('Doppi EXP','Restano '+d.rounds_remaining+' giri.','#ffb52e');
  if(!d&&prevD){showTransition('end','DOPPI EXP CONCLUSO','I guadagni EXP tornano al valore normale.');notify('Doppi EXP concluso','L’evento è terminato.','#64c9ff');}
  lastBossKey=bKey||lastBossKey;lastDoubleKey=dKey||lastDoubleKey;
  updatePassTurnForEvents();
}

function updatePassTurnForEvents(){
  const active=!!bossEvent();
  ['passTurnBtn','mobileV24Pass'].forEach(id=>{const btn=document.getElementById(id);if(!btn)return;if(active){btn.disabled=true;btn.dataset.v26BossDisabled='1';btn.textContent='Turni sospesi · Boss Rush';}else if(btn.dataset.v26BossDisabled){delete btn.dataset.v26BossDisabled;try{window.updatePassTurnButton?.();}catch(e){}}});
}

function ensureGMEventPanel(){
  const view=document.getElementById('gmViewPlayers');if(!view)return null;
  let panel=document.getElementById('v26GMEvents');
  if(panel)return panel;
  panel=document.createElement('section');panel.id='v26GMEvents';panel.className='v26-gm-events';
  panel.innerHTML='<div class="v26-gm-events-head"><div><span>Eventi partita</span><h3>Regia del Game Master</h3><p>Attiva un evento globale senza modificare le regole permanenti dei personaggi.</p></div><div class="v26-event-live">EVENTI LIVE</div></div><div class="v26-event-grid"><article class="v26-event-card boss"><div class="v26-event-card-title"><span>∞</span><div><b>Boss Rush</b><small>Un Boss usa tecniche gratuite; tutti gli altri spendono normalmente.</small></div></div><label><span>Scegli Boss</span><select id="v26BossSelect"></select></label><div id="v26BossStatus" class="v26-event-status">Disattivato</div><div class="v26-event-buttons"><button id="v26BossStart" type="button">Attiva evento</button><button id="v26BossEnd" class="danger" type="button">Termina evento</button></div></article><article class="v26-event-card exp"><div class="v26-event-card-title"><span>×2</span><div><b>Doppi EXP</b><small>Ogni EXP positivo ottenuto durante l’evento viene raddoppiato.</small></div></div><label><span>Durata in giri completi</span><input id="v26DoubleRounds" type="number" min="1" max="20" step="1" value="2" inputmode="numeric"></label><div id="v26DoubleStatus" class="v26-event-status">Disattivato</div><div class="v26-event-buttons"><button id="v26DoubleStart" type="button">Attiva evento</button><button id="v26DoubleEnd" class="danger" type="button">Termina evento</button></div></article></div>';
  const target=view.querySelector('.gm-control-bar')||view.firstElementChild;if(target&&target.parentElement===view)view.insertBefore(panel,target);else view.prepend(panel);
  panel.addEventListener('click',async e=>{
    const id=e.target.closest('button')?.id;if(!id||gmEventBusy)return;
    if(id==='v26BossStart')await startBossEvent();
    if(id==='v26BossEnd')await endBossEvent();
    if(id==='v26DoubleStart')await startDoubleEvent();
    if(id==='v26DoubleEnd')await endDoubleEvent();
  });
  return panel;
}
function renderGMEventPanel(){
  const r=room();if(!r?.isHost||r.phase!=='playing')return;
  const panel=ensureGMEventPanel();if(!panel)return;
  const b=bossEvent(),d=doubleExpEvent(),players=(r.players||[]).filter(p=>!p.isHost&&p.characterId);
  const select=document.getElementById('v26BossSelect');if(select){const old=select.value;select.innerHTML='<option value="">Seleziona giocatore</option>'+players.map(p=>'<option value="'+esc(p.playerToken)+'">'+esc(p.name)+' · '+esc((typeof characterDisplayName==='function'?characterDisplayName(p.characterId):p.characterId))+'</option>').join('');select.value=b?.boss_player_id||old||'';select.disabled=!!b||gmEventBusy;}
  const bs=document.getElementById('v26BossStatus');if(bs)bs.innerHTML=b?'<b>ATTIVO</b> · Boss '+esc(b.boss_player_name||'—')+' · turni sospesi':'Disattivato · il gioco segue l’ordine normale dei turni';
  const ds=document.getElementById('v26DoubleStatus');if(ds)ds.innerHTML=d?'<b>ATTIVO</b> · '+esc(d.rounds_remaining||0)+' / '+esc(d.rounds_total||0)+' giri · ancora '+esc(d.anchor_player_name||'—'):'Disattivato · gli EXP hanno valore normale';
  const rounds=document.getElementById('v26DoubleRounds');if(rounds){rounds.disabled=!!d||gmEventBusy;}
  ['v26BossStart','v26DoubleStart'].forEach(id=>{const x=document.getElementById(id);if(x)x.disabled=gmEventBusy||(id==='v26BossStart'?!!b:!!d)||!!(id==='v26BossStart'?d:b);});
  ['v26BossEnd','v26DoubleEnd'].forEach(id=>{const x=document.getElementById(id);if(x)x.disabled=gmEventBusy||(id==='v26BossEnd'?!b:!d);});
  panel.classList.toggle('busy',gmEventBusy);
  document.querySelectorAll('#gmPlayerGrid [data-gm-action="boss"]').forEach(btn=>{btn.disabled=!!b;btn.title=b?'Gestito dall’evento Boss Rush globale':'';});
}
async function callRpc(name,args){if(typeof window.jjkCloudRpc!=='function')throw new Error('Multiplayer cloud non pronto');return window.jjkCloudRpc(name,args);}
async function refresh(){if(typeof window.jjkRefreshRoom==='function')await window.jjkRefreshRoom(true);renderHud();renderGMEventPanel();}
async function withBusy(fn){if(gmEventBusy)return;gmEventBusy=true;renderGMEventPanel();try{await fn();}catch(e){console.error(e);showModal('Evento non modificato','',String(e?.message||e));}finally{gmEventBusy=false;renderGMEventPanel();}}
async function startBossEvent(){
  const r=room(),id=document.getElementById('v26BossSelect')?.value;if(!r?.isHost||!id){showModal('Boss mancante','','Scegli il giocatore che controllerà il Boss.');return;}
  if(!confirm('Attivare Boss Rush? Tutti potranno usare le tecniche e soltanto il Game Master potrà modificare manualmente le risorse.'))return;
  await withBusy(async()=>{await callRpc('jjk_gm_start_boss_rush_event',{p_room_id:r.roomId,p_boss_player_id:id});await refresh();});
}
async function endBossEvent(){const r=room();if(!r?.isHost)return;if(!confirm('Terminare Boss Rush e ripristinare i turni precedenti?'))return;await withBusy(async()=>{await callRpc('jjk_gm_end_boss_rush_event',{p_room_id:r.roomId});await refresh();});}
async function startDoubleEvent(){
  const r=room(),rounds=Math.max(1,Math.min(20,Math.trunc(Number(document.getElementById('v26DoubleRounds')?.value)||0)));if(!r?.isHost)return;if(!rounds){showModal('Durata mancante','','Inserisci almeno 1 giro.');return;}
  const active=activePlayer();if(!active){showModal('Turno attivo mancante','','Assegna il turno a un giocatore prima di attivare Doppi EXP.');return;}
  if(!confirm('Attivare Doppi EXP per '+rounds+' giri completi? Il conteggio inizierà dal turno di '+active.name+'.'))return;
  await withBusy(async()=>{await callRpc('jjk_gm_start_double_exp_event',{p_room_id:r.roomId,p_rounds:rounds});await refresh();});
}
async function endDoubleEvent(){const r=room();if(!r?.isHost)return;if(!confirm('Terminare subito Doppi EXP?'))return;await withBusy(async()=>{await callRpc('jjk_gm_end_double_exp_event',{p_room_id:r.roomId});await refresh();});}

function showDoubleApplied(base,total){clearTimeout(expNoticeTimer);notify('Doppi EXP','+'+base+' EXP diventano +'+total+' EXP.','#ffb52e');expNoticeTimer=setTimeout(()=>{},400);}
const baseGainExp=window.gainExp;
if(typeof baseGainExp==='function')window.gainExp=function(value){const n=Number(value)||0,d=doubleExpEvent();if(d&&n>0){showDoubleApplied(n,n*2);return baseGainExp.call(this,n*2);}return baseGainExp.apply(this,arguments);};
const baseGMAdjust=window.gmAdjustPlayer;
if(typeof baseGMAdjust==='function')window.gmAdjustPlayer=function(id,field,delta){let n=Number(delta)||0;if(field==='exp'&&n>0&&doubleExpEvent())n*=2;const args=[id,field,n].concat(Array.prototype.slice.call(arguments,3));return baseGMAdjust.apply(this,args);};

const baseRenderGM=window.renderGMDashboard;
if(typeof baseRenderGM==='function')window.renderGMDashboard=function(){const out=baseRenderGM.apply(this,arguments);setTimeout(renderGMEventPanel,0);return out;};
const baseApplyLock=window.applyRoomTurnLock;
if(typeof baseApplyLock==='function')window.applyRoomTurnLock=function(){const out=baseApplyLock.apply(this,arguments);renderHud();updatePassTurnForEvents();return out;};
const baseUpdatePass=window.updatePassTurnButton;
if(typeof baseUpdatePass==='function')window.updatePassTurnButton=function(){const out=baseUpdatePass.apply(this,arguments);updatePassTurnForEvents();return out;};

window.JJKEventsV26={sync,render:renderHud,bossEvent,doubleExpEvent,startBossEvent,endBossEvent,startDoubleEvent,endDoubleEvent};
function init(){ensureHud();ensureTransition();ensureGMEventPanel();renderHud();renderGMEventPanel();setInterval(()=>{renderHud();renderGMEventPanel();updatePassTurnForEvents();},1000);console.info('JJK events ready',VERSION);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,100),{once:true});else setTimeout(init,100);
})();
