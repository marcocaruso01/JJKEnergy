/* JJK Energy V26.2 - pannello eventi GM statico e sempre visibile */
(function(){
'use strict';
const VERSION='V26.2';
let selectedBossId='';
let selectedRounds=2;
let busy=false;
let lastSignature='';

function session(){try{return roomSession||window.roomSession||null;}catch(e){return window.roomSession||null;}}
function esc(v){try{return typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}catch(e){return String(v??'');}}
function charName(id){try{return typeof characterDisplayName==='function'?characterDisplayName(id):id||'Personaggio';}catch(e){return id||'Personaggio';}}
function charImage(id){try{return window.characters?.[id]?.image||'';}catch(e){return '';}}
function events(){return session()?.settings?.events||{};}
function boss(){const e=events().boss_rush;return e&&e.active?e:null;}
function doubleExp(){const e=events().double_exp;return e&&e.active?e:null;}
function activePlayer(){return session()?.players?.find(p=>!p.isHost&&!p.locked)||null;}
function players(){return (session()?.players||[]).filter(p=>!p.isHost&&p.characterId&&p.connected!==false);}
function cleanError(e){try{return typeof window.jjkCleanCloudError==='function'?window.jjkCleanCloudError(e):String(e?.message||e||'Errore sconosciuto');}catch(_){return String(e?.message||e||'Errore sconosciuto');}}
function message(title,body){try{showModal(title,'',body);}catch(e){alert(title+'\n'+body);}}
function el(id){return document.getElementById(id);}

function setPanelMessage(text,type){const box=el('v262PanelMessage');if(!box)return;box.textContent=text||'';box.className='v262-panel-message'+(text?' show':'')+(type?' '+type:'');}
function signature(){const r=session(),b=boss(),d=doubleExp();return JSON.stringify({room:r?.roomId||'',phase:r?.phase||'',host:!!r?.isHost,b:b?{id:b.boss_player_id,name:b.boss_player_name}:null,d:d?{left:d.rounds_remaining,total:d.rounds_total,anchor:d.anchor_player_name}:null,p:players().map(x=>[x.playerToken,x.name,x.characterId,x.locked]),selectedBossId,selectedRounds,busy});}

function render(force){
  const panel=el('v262GMEvents');if(!panel)return;
  const r=session(),isHost=!!r?.isHost,isPlaying=r?.phase==='playing';
  const badge=el('v262ReadyBadge');
  if(!r){if(badge){badge.textContent='IN ATTESA';badge.className='v262-ready';}setPanelMessage('Entra in una stanza e avvia la partita per utilizzare gli eventi.');disableAll(true);return;}
  if(!isHost){if(badge){badge.textContent='SOLO GM';badge.className='v262-ready error';}setPanelMessage('Questi eventi possono essere controllati soltanto dal Game Master.');disableAll(true);return;}
  if(!isPlaying){if(badge){badge.textContent='PARTITA NON AVVIATA';badge.className='v262-ready';}setPanelMessage('Avvia prima la partita dalla lobby. Gli eventi diventeranno selezionabili.');disableAll(true);return;}
  if(badge){badge.textContent='PRONTO';badge.className='v262-ready ok';}
  setPanelMessage('');
  const sig=signature();if(!force&&sig===lastSignature)return;lastSignature=sig;
  const b=boss(),d=doubleExp(),list=players();
  if(!list.some(p=>p.playerToken===selectedBossId))selectedBossId=list[0]?.playerToken||'';
  const conflict=!!(b||d);
  const box=el('v262BossPlayers');
  if(box)box.innerHTML=list.length?list.map(p=>'<button type="button" class="v262-player-choice '+(p.playerToken===selectedBossId?'selected':'')+'" data-v262-boss="'+esc(p.playerToken)+'" '+((conflict||busy)?'disabled':'')+'><img src="'+esc(charImage(p.characterId))+'" alt=""><span><b>'+esc(p.name)+'</b><small>'+esc(charName(p.characterId))+'</small></span></button>').join(''):'<div class="v262-empty">Nessun giocatore disponibile. Tutti devono scegliere un personaggio.</div>';
  const bs=el('v262BossStatus');if(bs)bs.innerHTML=b?'<b>ATTIVO</b> · Boss: '+esc(b.boss_player_name||'—')+' · tecniche gratuite':'Disattivato · selezionato: '+esc(list.find(p=>p.playerToken===selectedBossId)?.name||'nessuno');
  const ds=el('v262DoubleStatus');if(ds)ds.innerHTML=d?'<b>ATTIVO</b> · '+esc(d.rounds_remaining||0)+' / '+esc(d.rounds_total||0)+' giri · riferimento: '+esc(d.anchor_player_name||'—'):'Disattivato · durata scelta: '+selectedRounds+' giri';
  document.querySelectorAll('[data-v262-round]').forEach(btn=>{btn.classList.toggle('selected',Number(btn.dataset.v262Round)===selectedRounds);btn.disabled=conflict||busy;});
  const input=el('v262CustomRounds');if(input){input.value=String(selectedRounds);input.disabled=conflict||busy;}
  setDisabled('v262StartBoss',busy||!!b||!!d||!selectedBossId);
  setDisabled('v262EndBoss',busy||!b);
  setDisabled('v262StartDouble',busy||!!b||!!d||!activePlayer());
  setDisabled('v262EndDouble',busy||!d);
}
function setDisabled(id,value){const x=el(id);if(x)x.disabled=!!value;}
function disableAll(value){['v262StartBoss','v262EndBoss','v262StartDouble','v262EndDouble','v262CustomRounds'].forEach(id=>setDisabled(id,value));document.querySelectorAll('[data-v262-round],[data-v262-boss]').forEach(x=>x.disabled=!!value);}
async function rpc(name,args){if(typeof window.jjkCloudRpc!=='function')throw new Error('Multiplayer cloud non pronto');return window.jjkCloudRpc(name,args);}
async function refresh(){if(typeof window.jjkRefreshRoom==='function')await window.jjkRefreshRoom(true);render(true);}
async function run(task){if(busy)return;busy=true;render(true);try{await task();}catch(e){console.error(e);message('Evento non modificato',cleanError(e));}finally{busy=false;render(true);}}
async function startBoss(){const r=session(),p=players().find(x=>x.playerToken===selectedBossId);if(!r?.isHost||!p){message('Boss mancante','Tocca prima il giocatore che controllerà il Boss.');return;}if(!confirm('Attivare Boss Rush con '+p.name+' come Boss?'))return;await run(async()=>{await rpc('jjk_gm_start_boss_rush_event',{p_room_id:r.roomId,p_boss_player_id:selectedBossId});await refresh();});}
async function endBoss(){const r=session();if(!r?.isHost)return;if(!confirm('Terminare Boss Rush e ripristinare la partita?'))return;await run(async()=>{await rpc('jjk_gm_end_boss_rush_event',{p_room_id:r.roomId});await refresh();});}
async function startDouble(){const r=session(),a=activePlayer();if(!r?.isHost)return;if(!a){message('Turno attivo mancante','Assegna il turno a un giocatore prima di attivare Doppi EXP.');return;}if(!confirm('Attivare Doppi EXP per '+selectedRounds+' giri completi? Il conteggio parte da '+a.name+'.'))return;await run(async()=>{await rpc('jjk_gm_start_double_exp_event',{p_room_id:r.roomId,p_rounds:selectedRounds});await refresh();});}
async function endDouble(){const r=session();if(!r?.isHost)return;if(!confirm('Terminare subito Doppi EXP?'))return;await run(async()=>{await rpc('jjk_gm_end_double_exp_event',{p_room_id:r.roomId});await refresh();});}
function bind(){const panel=el('v262GMEvents');if(!panel||panel.dataset.bound==='1')return;panel.dataset.bound='1';panel.addEventListener('click',e=>{const bossBtn=e.target.closest('[data-v262-boss]');if(bossBtn&&!bossBtn.disabled){selectedBossId=bossBtn.dataset.v262Boss||'';render(true);return;}const round=e.target.closest('[data-v262-round]');if(round&&!round.disabled){selectedRounds=Math.max(1,Math.min(20,Number(round.dataset.v262Round)||1));render(true);return;}const id=e.target.closest('button')?.id;if(id==='v262StartBoss')startBoss();if(id==='v262EndBoss')endBoss();if(id==='v262StartDouble')startDouble();if(id==='v262EndDouble')endDouble();});const input=el('v262CustomRounds');input?.addEventListener('change',()=>{selectedRounds=Math.max(1,Math.min(20,Math.trunc(Number(input.value)||1)));render(true);});}
const oldRender=window.renderGMDashboard;if(typeof oldRender==='function')window.renderGMDashboard=function(){const out=oldRender.apply(this,arguments);setTimeout(()=>render(true),0);return out;};
if(window.JJKEventsV26){const oldSync=window.JJKEventsV26.sync;window.JJKEventsV26.sync=function(previous){const out=oldSync?.call(this,previous);render(true);return out;};}
function init(){bind();render(true);setInterval(()=>render(false),500);console.info('JJK GM events panel ready',VERSION);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,120),{once:true});else setTimeout(init,120);
})();
