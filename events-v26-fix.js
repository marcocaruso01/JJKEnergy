/* JJK Energy V26.1 - controlli eventi GM senza menu a tendina */
(function(){
'use strict';
const VERSION='V26.1';
let selectedBossId='';
let selectedRounds=2;
let busy=false;
let lastSignature='';

function getRoom(){try{return roomSession||window.roomSession||null;}catch(e){return window.roomSession||null;}}
function escapeValue(v){try{return typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}catch(e){return String(v??'');}}
function characterName(id){try{return typeof characterDisplayName==='function'?characterDisplayName(id):id||'Personaggio';}catch(e){return id||'Personaggio';}}
function characterImage(id){try{return window.characters?.[id]?.image||'';}catch(e){return '';}}
function roomEvents(){return getRoom()?.settings?.events||{};}
function bossEvent(){const e=roomEvents().boss_rush;return e&&e.active?e:null;}
function doubleEvent(){const e=roomEvents().double_exp;return e&&e.active?e:null;}
function activePlayer(){return getRoom()?.players?.find(p=>!p.isHost&&!p.locked)||null;}
function showMessage(title,body){try{showModal(title,'',body);}catch(e){alert(title+'\n'+body);}}
function cleanError(error){try{return typeof window.jjkCleanCloudError==='function'?window.jjkCleanCloudError(error):String(error?.message||error||'Errore sconosciuto');}catch(e){return String(error?.message||error||'Errore sconosciuto');}}

function ensurePanel(){
  const view=document.getElementById('gmViewPlayers');
  if(!view)return null;
  const old=document.getElementById('v26GMEvents');if(old)old.hidden=true;
  let panel=document.getElementById('v261GMEvents');
  if(panel)return panel;
  panel=document.createElement('section');
  panel.id='v261GMEvents';panel.className='v261-gm-events';panel.hidden=true;
  const target=view.querySelector('.gm-control-bar')||view.firstElementChild;
  if(target&&target.parentElement===view)view.insertBefore(panel,target);else view.prepend(panel);
  panel.addEventListener('click',onPanelClick);
  panel.addEventListener('change',e=>{
    if(e.target.id==='v261CustomRounds'){
      const n=Math.max(1,Math.min(20,Math.trunc(Number(e.target.value)||1)));
      selectedRounds=n;e.target.value=String(n);render(true);
    }
  });
  return panel;
}

function signature(){
  const r=getRoom(),b=bossEvent(),d=doubleEvent();
  return JSON.stringify({
    room:r?.roomId||'',phase:r?.phase||'',host:!!r?.isHost,b:b?{id:b.boss_player_id,name:b.boss_player_name}:null,
    d:d?{left:d.rounds_remaining,total:d.rounds_total,anchor:d.anchor_player_name}:null,
    players:(r?.players||[]).filter(p=>!p.isHost).map(p=>[p.playerToken,p.name,p.characterId,p.connected,p.locked]),selectedBossId,selectedRounds,busy
  });
}

function render(force){
  const r=getRoom(),panel=ensurePanel();if(!panel)return;
  const allowed=!!(r?.isHost&&r.phase==='playing');
  panel.hidden=!allowed;if(!allowed)return;
  const sig=signature();if(!force&&sig===lastSignature)return;lastSignature=sig;
  const b=bossEvent(),d=doubleEvent();
  const players=(r.players||[]).filter(p=>!p.isHost&&p.characterId&&p.connected!==false);
  if(!players.some(p=>p.playerToken===selectedBossId))selectedBossId=players[0]?.playerToken||'';
  const conflict=!!(b||d);
  const playerChoices=players.length?players.map(p=>{
    const selected=p.playerToken===selectedBossId;
    return '<button type="button" class="v261-player-choice '+(selected?'selected':'')+'" data-v261-boss="'+escapeValue(p.playerToken)+'" '+((b||d||busy)?'disabled':'')+'><img src="'+escapeValue(characterImage(p.characterId))+'" alt=""><span><b>'+escapeValue(p.name)+'</b><small>'+escapeValue(characterName(p.characterId))+'</small></span></button>';
  }).join(''):'<div class="v261-status">Nessun giocatore disponibile. Tutti devono aver scelto un personaggio.</div>';
  const roundButtons=[1,2,3,5,10].map(n=>'<button type="button" class="v261-round '+(selectedRounds===n?'selected':'')+'" data-v261-round="'+n+'" '+((b||d||busy)?'disabled':'')+'>'+n+'</button>').join('');
  panel.classList.toggle('busy',busy);
  panel.innerHTML=''
    +'<div class="v261-head"><div><div class="v261-head-kicker">Eventi partita</div><h3>Regia del Game Master</h3><p>Seleziona direttamente giocatori e durata: nessun menu a tendina.</p></div><div class="v261-live">'+(conflict?'EVENTO ATTIVO':'PRONTO')+'</div></div>'
    +'<div class="v261-grid">'
      +'<article class="v261-card boss"><div class="v261-card-title"><span class="v261-card-icon">∞</span><div><b>Boss Rush</b><small>Il Boss usa tecniche gratuite; gli altri consumano le proprie risorse.</small></div></div><span class="v261-label">Tocca il giocatore che sarà il Boss</span><div class="v261-player-list">'+playerChoices+'</div><div class="v261-status">'+(b?'<b>ATTIVO</b> · Boss: '+escapeValue(b.boss_player_name||'—'):'Disattivato · selezionato: '+escapeValue(players.find(p=>p.playerToken===selectedBossId)?.name||'nessuno'))+'</div><div class="v261-actions"><button type="button" data-v261-action="start-boss" '+((busy||b||d||!selectedBossId)?'disabled':'')+'>Attiva Boss Rush</button><button type="button" class="danger" data-v261-action="end-boss" '+((busy||!b)?'disabled':'')+'>Termina evento</button></div><div class="v261-helper">Durante Boss Rush i turni automatici sono sospesi e le risorse manuali restano sotto il controllo del GM.</div></article>'
      +'<article class="v261-card exp"><div class="v261-card-title"><span class="v261-card-icon">×2</span><div><b>Doppi EXP</b><small>Ogni guadagno EXP positivo viene raddoppiato per il numero di giri scelto.</small></div></div><span class="v261-label">Durata in giri completi</span><div class="v261-round-row">'+roundButtons+'</div><div class="v261-custom"><input id="v261CustomRounds" type="number" min="1" max="20" step="1" inputmode="numeric" value="'+selectedRounds+'" '+((b||d||busy)?'disabled':'')+'><button type="button" data-v261-action="apply-rounds" '+((b||d||busy)?'disabled':'')+'>Usa durata</button></div><div class="v261-status">'+(d?'<b>ATTIVO</b> · '+escapeValue(d.rounds_remaining||0)+' / '+escapeValue(d.rounds_total||0)+' giri · riferimento: '+escapeValue(d.anchor_player_name||'—'):'Disattivato · durata scelta: '+selectedRounds+' giri')+'</div><div class="v261-actions"><button type="button" data-v261-action="start-double" '+((busy||b||d||!activePlayer())?'disabled':'')+'>Attiva Doppi EXP</button><button type="button" class="danger" data-v261-action="end-double" '+((busy||!d)?'disabled':'')+'>Termina evento</button></div><div class="v261-helper">Serve un giocatore con turno attivo. Un giro termina quando il turno ritorna al giocatore di riferimento.</div></article>'
    +'</div>';
}

async function rpc(name,args){
  if(typeof window.jjkCloudRpc!=='function')throw new Error('Multiplayer cloud non pronto');
  return window.jjkCloudRpc(name,args);
}
async function refresh(){if(typeof window.jjkRefreshRoom==='function')await window.jjkRefreshRoom(true);render(true);}
async function runBusy(task){if(busy)return;busy=true;render(true);try{await task();}catch(e){console.error(e);showMessage('Evento non modificato',cleanError(e));}finally{busy=false;render(true);}}

async function startBoss(){
  const r=getRoom();if(!r?.isHost)return;
  const player=(r.players||[]).find(p=>p.playerToken===selectedBossId);
  if(!player){showMessage('Boss mancante','Tocca prima il giocatore che controllerà il Boss.');return;}
  if(!confirm('Attivare Boss Rush con '+player.name+' come Boss?'))return;
  await runBusy(async()=>{await rpc('jjk_gm_start_boss_rush_event',{p_room_id:r.roomId,p_boss_player_id:selectedBossId});await refresh();});
}
async function endBoss(){const r=getRoom();if(!r?.isHost)return;if(!confirm('Terminare Boss Rush e ripristinare la partita?'))return;await runBusy(async()=>{await rpc('jjk_gm_end_boss_rush_event',{p_room_id:r.roomId});await refresh();});}
async function startDouble(){
  const r=getRoom(),anchor=activePlayer();if(!r?.isHost)return;
  if(!anchor){showMessage('Turno attivo mancante','Assegna il turno a un giocatore prima di attivare Doppi EXP.');return;}
  if(!confirm('Attivare Doppi EXP per '+selectedRounds+' giri completi? Il conteggio parte da '+anchor.name+'.'))return;
  await runBusy(async()=>{await rpc('jjk_gm_start_double_exp_event',{p_room_id:r.roomId,p_rounds:selectedRounds});await refresh();});
}
async function endDouble(){const r=getRoom();if(!r?.isHost)return;if(!confirm('Terminare subito Doppi EXP?'))return;await runBusy(async()=>{await rpc('jjk_gm_end_double_exp_event',{p_room_id:r.roomId});await refresh();});}

function onPanelClick(e){
  const boss=e.target.closest('[data-v261-boss]');if(boss&&!boss.disabled){selectedBossId=boss.dataset.v261Boss||'';render(true);return;}
  const round=e.target.closest('[data-v261-round]');if(round&&!round.disabled){selectedRounds=Number(round.dataset.v261Round)||1;render(true);return;}
  const action=e.target.closest('[data-v261-action]');if(!action||action.disabled)return;
  const type=action.dataset.v261Action;
  if(type==='apply-rounds'){
    const input=document.getElementById('v261CustomRounds');selectedRounds=Math.max(1,Math.min(20,Math.trunc(Number(input?.value)||1)));render(true);return;
  }
  if(type==='start-boss')startBoss();
  if(type==='end-boss')endBoss();
  if(type==='start-double')startDouble();
  if(type==='end-double')endDouble();
}

const originalRenderGM=window.renderGMDashboard;
if(typeof originalRenderGM==='function')window.renderGMDashboard=function(){const out=originalRenderGM.apply(this,arguments);setTimeout(()=>render(true),0);return out;};
const originalShowScreen=window.showScreen;
if(typeof originalShowScreen==='function')window.showScreen=function(id){const out=originalShowScreen.apply(this,arguments);if(id==='gameMaster')setTimeout(()=>render(true),0);return out;};
if(window.JJKEventsV26){const originalSync=window.JJKEventsV26.sync;window.JJKEventsV26.sync=function(previous){const out=originalSync?.call(this,previous);render(true);return out;};}

function init(){ensurePanel();render(true);setInterval(()=>render(false),700);console.info('JJK event selector fix ready',VERSION);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,160),{once:true});else setTimeout(init,160);
})();
