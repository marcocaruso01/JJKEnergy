/* JJK Energy - Supabase Multiplayer Adapter
   Replaces the legacy PeerJS room transport while preserving the existing UI. */
(function(){
'use strict';
const SUPABASE_URL='https://yadsmiwjoyaiemlzkomd.supabase.co';
const SUPABASE_KEY='sb_publishable_x6ESBbVZ_IhmfnePfN8tDQ_ADAcpuJ6';
const RESUME_KEY='jjk_supabase_room_resume_v1';
const CLIENT_KIND=document.documentElement.classList.contains('mobile')||/Mobile|iPhone|Android/i.test(navigator.userAgent)?'mobile':'desktop';
let sb=null, currentUser=null, channel=null, pollTimer=null, heartbeatTimer=null, refreshTimer=null, saveTimer=null, stateWritePromise=Promise.resolve(), stateVersion=0, lastAppliedStateVersion=0, lastLocalBossRush=null, adapterReady=false, refreshing=false, lifecycleBound=false, authPromise=null;

/*
  The original application declares roomSession with top-level `let`.
  A top-level `let` is NOT the same thing as window.roomSession.  The first
  Supabase build only wrote to window.roomSession, so the legacy UI still saw
  `roomSession === null` and creation failed immediately after a successful RPC.
  These helpers keep both references aligned.
*/
function getRoomSession(){
  try{return roomSession;}catch(e){return window.roomSession||null;}
}
function setRoomSession(value){
  try{roomSession=value;}catch(e){}
  window.roomSession=value;
  return value;
}
function getCurrentCharacterId(){
  try{return currentId;}catch(e){return window.currentId||null;}
}
function getLastAppliedStateAt(){
  try{return Number(roomLastAppliedStateAt||0);}catch(e){return Number(window.roomLastAppliedStateAt||0);}
}
function setLastAppliedStateAt(value){
  try{roomLastAppliedStateAt=value;}catch(e){}
  window.roomLastAppliedStateAt=value;
}
function setLastRoomPhase(value){
  try{roomLastPhase=value;}catch(e){}
  window.roomLastPhase=value;
}
function setApplyingRemoteState(value){
  try{roomApplyingRemoteState=value;}catch(e){}
  window.roomApplyingRemoteState=value;
}
function isApplyingRemoteState(){
  try{return !!roomApplyingRemoteState;}catch(e){return !!window.roomApplyingRemoteState;}
}
function normalizeRpcRecord(value){
  if(Array.isArray(value))value=value[0]??null;
  if(typeof value==='string'){
    try{value=JSON.parse(value);}catch(e){}
  }
  return value;
}

/* Prevent the scheduled legacy PeerJS resume from starting in parallel. */
try{localStorage.removeItem('jjk_room_resume_v4');}catch(e){}
try{resumeSavedRoom=function(){};}catch(e){}

function modal(title,sub='',body=''){ try{ showModal(title,sub,body); }catch(e){ alert([title,sub,body].filter(Boolean).join('\n')); } }
function cleanError(error){
  const raw=String(error?.message||error||'Errore sconosciuto');
  const key=['REGISTERED_ACCOUNT_REQUIRED','PROFILE_REQUIRED','EMAIL_VERIFICATION_REQUIRED','AUTH_REQUIRED','PLAYER_NAME_REQUIRED','ROOM_NOT_FOUND','ROOM_ENDED','PLAYER_KICKED','ROOM_FULL','HOST_MUST_CLOSE_ROOM','NOT_ROOM_MEMBER','HOST_ONLY','INVALID_ROOM_STATUS','SELECTION_NOT_OPEN','PLAYER_NOT_FOUND','CHARACTER_ALREADY_TAKEN','NO_PLAYERS','PLAYERS_NOT_READY','TURN_ORDER_REQUIRED','TURN_ORDER_ONLY_DURING_SELECTION','TURN_ORDER_PLAYER_MISMATCH','INVALID_TURN_ORDER','NEXT_PLAYER_NOT_FOUND','NOT_YOUR_TURN','STATE_VERSION_CONFLICT','MATCH_NOT_PLAYING','INVALID_WINNER','EVENT_CONFLICT','EVENT_TURNS_PAUSED','INVALID_EVENT_DURATION','NO_ACTIVE_TURN','BOSS_RUSH_EVENT_ALREADY_ACTIVE','BOSS_RUSH_EVENT_NOT_ACTIVE','DOUBLE_EXP_EVENT_ALREADY_ACTIVE','DOUBLE_EXP_EVENT_NOT_ACTIVE'].find(k=>raw.includes(k));
  const labels={REGISTERED_ACCOUNT_REQUIRED:'Devi registrare o accedere a un account verificato.',PROFILE_REQUIRED:'Completa lo username del tuo account prima di giocare.',EMAIL_VERIFICATION_REQUIRED:'Conferma l’email ricevuta prima di continuare.',AUTH_REQUIRED:'Accedi al tuo account per usare il multiplayer.',PLAYER_NAME_REQUIRED:'Inserisci il nome del giocatore.',ROOM_NOT_FOUND:'Stanza non trovata.',ROOM_ENDED:'Questa stanza è stata chiusa.',PLAYER_KICKED:'Sei stato espulso da questa stanza.',ROOM_FULL:'La stanza è piena.',HOST_MUST_CLOSE_ROOM:'Il Game Master deve chiudere la stanza.',NOT_ROOM_MEMBER:'Non fai più parte della stanza.',HOST_ONLY:'Azione riservata al Game Master.',INVALID_ROOM_STATUS:'La stanza non è nello stato corretto.',SELECTION_NOT_OPEN:'La scelta personaggio non è ancora aperta.',PLAYER_NOT_FOUND:'Giocatore non trovato.',CHARACTER_ALREADY_TAKEN:'Questo personaggio è già stato scelto.',NO_PLAYERS:'Non ci sono giocatori nella stanza.',PLAYERS_NOT_READY:'Tutti i giocatori devono scegliere un personaggio.',TURN_ORDER_REQUIRED:'Il Game Master deve salvare un ordine completo dei turni prima di avviare la partita.',TURN_ORDER_ONLY_DURING_SELECTION:'L’ordine dei turni si può modificare soltanto prima dell’avvio della partita.',TURN_ORDER_PLAYER_MISMATCH:'L’ordine deve contenere tutti e soltanto i giocatori presenti.',INVALID_TURN_ORDER:'L’ordine dei turni contiene giocatori duplicati o non validi.',NEXT_PLAYER_NOT_FOUND:'Non è stato trovato il giocatore successivo.',NOT_YOUR_TURN:'Non è il tuo turno.',STATE_VERSION_CONFLICT:'Lo stato è cambiato: aggiornamento in corso.',MATCH_NOT_PLAYING:'La partita non è attiva.',INVALID_WINNER:'Seleziona un vincitore valido.',EVENT_CONFLICT:'Concludi prima l’altro evento attivo.',EVENT_TURNS_PAUSED:'Durante l’evento Boss Rush i turni automatici sono sospesi.',INVALID_EVENT_DURATION:'Scegli una durata valida da 1 a 20 giri.',NO_ACTIVE_TURN:'Deve esserci un giocatore con il turno attivo.',BOSS_RUSH_EVENT_ALREADY_ACTIVE:'L’evento Boss Rush è già attivo.',BOSS_RUSH_EVENT_NOT_ACTIVE:'L’evento Boss Rush non è attivo.',DOUBLE_EXP_EVENT_ALREADY_ACTIVE:'L’evento Doppi EXP è già attivo.',DOUBLE_EXP_EVENT_NOT_ACTIVE:'L’evento Doppi EXP non è attivo.'};
  return key?labels[key]:raw;
}
async function rpc(name,args={}){ if(!sb)throw new Error('Supabase non inizializzato'); const {data,error}=await sb.rpc(name,args); if(error)throw error; return data; }
function saveResume(){
  const s=getRoomSession();
  if(!s?.roomId){localStorage.removeItem(RESUME_KEY);return;}
  localStorage.setItem(RESUME_KEY,JSON.stringify({roomId:s.roomId,code:s.code,playerId:s.selfPeerId,name:s.selfName,isHost:s.isHost,ts:Date.now()}));
}
function clearResume(){localStorage.removeItem(RESUME_KEY);}
function parseTime(v){const n=v?Date.parse(v):NaN;return Number.isFinite(n)?n:null;}
function mapSnapshot(snap, previousPhase){
  if(!snap?.room)return null;
  const previousSession=getRoomSession();
  const r=snap.room;
  const players=(snap.players||[]).filter(p=>!p.left_at&&!p.kicked_at).map(p=>{
    const stateUpdatedAt=parseTime(p.state_updated_at);
    const rawState=(p.state&&Object.keys(p.state).length)?JSON.parse(JSON.stringify(p.state)):null;
    const syncedState=rawState?{
      ...rawState,
      bossRushActive:!!p.boss_rush,
      updatedAt:stateUpdatedAt||Number(rawState.updatedAt)||Date.now()
    }:null;
    return {
      peerId:p.id, playerToken:p.id, roomPlayerId:p.id, userId:p.user_id,
      name:p.player_name, characterId:p.character_id||null, isHost:!!p.is_host,
      role:p.is_host?'gm':'player', connected:p.is_connected!==false,
      locked:!!p.is_locked, selfManage:p.self_manage!==false,
      energyDiscount:!!p.energy_discount, hasEye:!!p.has_eye,
      bossRush:!!p.boss_rush, turnOrder:Number(p.turn_order)||null, state:syncedState,
      stateVersion:Number(p.state_version||0), stateUpdatedAt,
      joinedAt:parseTime(p.joined_at)||Date.now(),
      lastSeen:parseTime(p.last_seen), kickedAt:p.kicked_at||null
    };
  });
  if(r.status==='playing')players.forEach(player=>{if(!player.isHost&&!player.state)player.locked=true;});
  const previousMe=previousSession?.players?.find(p=>p.userId===currentUser?.id)||previousSession?.players?.find(p=>p.peerId===previousSession?.selfPeerId)||null;
  const me=players.find(p=>p.userId===currentUser?.id)||players.find(p=>p.peerId===previousSession?.selfPeerId);
  if(!me) throw new Error('NOT_ROOM_MEMBER');
  const wd=r.winner_data||{};
  const session={
    code:r.code, roomId:r.id, isHost:!!me.isHost, selfPeerId:me.peerId, playerToken:me.peerId,
    selfName:me.name, hostPeerId:'supabase:'+r.id, maxPlayers:Number(r.max_players||8),
    phase:r.status||'lobby', startedAt:parseTime(r.started_at), endedAt:parseTime(r.ended_at),
    winner:Object.keys(wd).length?{name:wd.player_name,characterId:wd.character_id,characterName:window.characterDisplayName?.(wd.character_id)||wd.character_id,durationMs:Number(wd.duration_seconds||0)*1000}:null,
    players, settings:(r.settings&&typeof r.settings==='object'?r.settings:{}), transport:'supabase', serverTime:snap.server_time
  };
  setRoomSession(session);
  const incomingVersion=Number(me.stateVersion||0);
  const previousVersion=Number(stateVersion||0);
  stateVersion=incomingVersion;
  saveResume();
  try{setRoomUrl(session.code);}catch(e){}
  try{renderRoomUI();renderRoomSelectionBanner();renderRoomCharacterAvailability();updatePassTurnButton();applyRoomTurnLock();}catch(e){console.warn(e);}
  if(previousPhase!==undefined && previousPhase!==session.phase){try{handleRoomPhaseTransition(previousPhase,session.phase);}catch(e){console.warn(e);}}

  if(session.phase==='playing'&&!session.isHost&&me.characterId){
    const active=!!me.bossRush;
    const bossChanged=previousMe&&previousMe.bossRush!==active;
    const turnUnlocked=!!(previousMe&&previousMe.locked&&!me.locked);
    const turnLocked=!!(previousMe&&!previousMe.locked&&me.locked);
    try{bossRushActive=active;}catch(e){}
    window.bossRushActive=active;
    try{localStorage.setItem('jjk_'+me.characterId+'_bossRushActive',active?'1':'0');}catch(e){}

    if(me.state?.characterId){
      me.state.bossRushActive=active;
      const remoteTs=Number(me.state.updatedAt||me.stateUpdatedAt||0);
      const mustApply=getCurrentCharacterId()!==me.characterId || incomingVersion>lastAppliedStateVersion || remoteTs>getLastAppliedStateAt();
      if(mustApply){
        try{applyRoomPlayerStateSnapshot(me.state,true);lastAppliedStateVersion=incomingVersion;}catch(e){console.warn(e);}
      }
    }else if(getCurrentCharacterId()!==me.characterId){
      try{openCharacter(me.characterId,{roomSync:true,silentStats:true});}catch(e){}
    }
    try{updateBossRushPlayerBadge();}catch(e){}
    const globalBossEvent=!!session.settings?.events?.boss_rush?.active;
    if(turnUnlocked&&!globalBossEvent){
      try{window.JJKSfx?.play('confirm');}catch(e){}
      try{if(typeof showPlayerNotification==='function')showPlayerNotification('È il tuo turno','La tua scheda è stata sbloccata automaticamente.','#55e39b');else modal('È il tuo turno','','La tua scheda è stata sbloccata automaticamente.');}catch(e){}
    }else if(turnLocked&&!globalBossEvent){
      try{window.JJKSfx?.play('nav');}catch(e){}
    }
    if(bossChanged||lastLocalBossRush!==active){
      if(lastLocalBossRush!==null){
        const title=active?'Boss Rush attiva':'Boss Rush disattivata';
        const text=active?'Tutte le tecniche sono gratuite e le risorse non vengono consumate.':'Le risorse possedute prima della Boss Rush sono state ripristinate.';
        try{if(typeof showPlayerNotification==='function')showPlayerNotification(title,text,active?'#ffd35f':'#54bfff');else modal(title,'',text);}catch(e){}
      }
      lastLocalBossRush=active;
    }
  }else if(!session.isHost){
    try{bossRushActive=false;}catch(e){}
    window.bossRushActive=false;
    lastLocalBossRush=null;
    try{updateBossRushPlayerBadge();}catch(e){}
  }

  if(session.isHost&&session.phase==='playing'){try{renderGMDashboard();}catch(e){}}
  try{window.JJKEventsV26?.sync?.(previousSession);}catch(e){console.warn('V26 event sync',e);}
  return session;
}
async function refreshRoom(force=false){
  const activeSession=getRoomSession();
  if(refreshing||!activeSession?.roomId)return;
  refreshing=true; const oldPhase=activeSession.phase;
  try{const snap=await rpc('jjk_room_snapshot',{p_room_id:activeSession.roomId});mapSnapshot(snap,oldPhase);}catch(e){
    const msg=cleanError(e); if(/Non fai più parte|espulso|chiusa/.test(msg)){await hardLeave(true);modal('Stanza non disponibile','',msg);}
    else if(force)console.warn('Room refresh:',e);
  }finally{refreshing=false;}
}
function scheduleRefresh(delay=80){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refreshRoom(false),delay);}
function stopRealtime(){
  if(channel&&sb){try{sb.removeChannel(channel);}catch(e){}} channel=null;
  clearInterval(pollTimer);clearInterval(heartbeatTimer);clearTimeout(refreshTimer);clearTimeout(saveTimer);
  pollTimer=heartbeatTimer=refreshTimer=saveTimer=null;
}
function startRealtime(){
  stopRealtime(); const s=getRoomSession();
  if(!sb||!s?.roomId)return;
  const rid=s.roomId;
  channel=sb.channel('jjk-room-'+rid,{config:{broadcast:{ack:true},presence:{key:currentUser?.id||'anon'}}})
    .on('postgres_changes',{event:'*',schema:'public',table:'rooms',filter:'id=eq.'+rid},()=>scheduleRefresh(40))
    .on('postgres_changes',{event:'*',schema:'public',table:'room_players',filter:'room_id=eq.'+rid},()=>scheduleRefresh(40))
    .on('postgres_changes',{event:'*',schema:'public',table:'player_states',filter:'room_id=eq.'+rid},()=>scheduleRefresh(40))
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'room_events',filter:'room_id=eq.'+rid},()=>scheduleRefresh(60))
    .subscribe(status=>{if(status==='SUBSCRIBED')scheduleRefresh(10);});
  pollTimer=setInterval(()=>refreshRoom(false),5000);
  heartbeatTimer=setInterval(async()=>{const hs=getRoomSession();if(!hs?.roomId)return;try{await rpc('jjk_heartbeat',{p_room_id:hs.roomId});if(hs.isHost)await rpc('jjk_mark_stale_players',{p_room_id:hs.roomId,p_timeout_seconds:120});}catch(e){console.warn('heartbeat',e);}},20000);
  if(!lifecycleBound){
    lifecycleBound=true;
    document.addEventListener('visibilitychange',onVisibility,{passive:true});
    window.addEventListener('online',onVisibility,{passive:true});
    window.addEventListener('focus',onVisibility,{passive:true});
    window.addEventListener('pageshow',onVisibility,{passive:true});
  }
}
function onVisibility(){if(document.visibilityState==='visible'||navigator.onLine)scheduleRefresh(10);}
async function establishFromResult(result,name){
  stateWritePromise=Promise.resolve();stateVersion=0;lastAppliedStateVersion=0;lastLocalBossRush=null;
  result=normalizeRpcRecord(result);
  if(!result?.room_id||!result?.player_id||!result?.code){
    console.error('Invalid jjk room RPC response:',result);
    throw new Error('Risposta stanza non valida dal server. Ricarica la pagina e riprova.');
  }
  setRoomSession({code:result.code,roomId:result.room_id,isHost:!!result.is_host,selfPeerId:result.player_id,playerToken:result.player_id,selfName:name,maxPlayers:Number(result.max_players||8),phase:result.status||'lobby',players:[],transport:'supabase'});
  try{await rpc('jjk_set_profile_name',{p_display_name:name});}catch(profileError){console.warn('profile sync',profileError);}
  saveResume();
  await refreshRoom(true);
  startRealtime();
  try{showScreen('rooms');}catch(e){}
  return result;
}
async function ensureAuth(){
  if(window.JJKAccount?.ensureAuthenticated){
    const account=await window.JJKAccount.ensureAuthenticated();
    sb=account.client;
    currentUser=account.user;
    if(!sb||!currentUser)throw new Error('REGISTERED_ACCOUNT_REQUIRED');
    window.jjkSupabase=sb;
    window.jjkSupabaseUser=currentUser;
    adapterReady=true;
    return;
  }
  throw new Error('REGISTERED_ACCOUNT_REQUIRED');
}
async function ensureCloudReady(){
  if(adapterReady&&sb&&currentUser)return;
  if(!authPromise)authPromise=ensureAuth().finally(()=>{authPromise=null;});
  await authPromise;
}
async function restoreSession(){
  let saved=null;try{saved=JSON.parse(localStorage.getItem(RESUME_KEY)||'null');}catch(e){}
  if(!saved?.roomId)return;
  setRoomSession({roomId:saved.roomId,code:saved.code,isHost:!!saved.isHost,selfPeerId:saved.playerId,playerToken:saved.playerId,selfName:saved.name,phase:'lobby',players:[],transport:'supabase'});
  try{await refreshRoom(true);if(getRoomSession()?.roomId)startRealtime();}
  catch(e){clearResume();setRoomSession(null);}
}
async function hardLeave(silent=false){
  stopRealtime();
  setRoomSession(null);
  setLastRoomPhase(null);
  setLastAppliedStateAt(0);
  stateWritePromise=Promise.resolve();stateVersion=0;lastAppliedStateVersion=0;lastLocalBossRush=null;
  try{bossRushActive=false;}catch(e){}window.bossRushActive=false;
  try{gmSelectedPlayers.clear();}catch(e){}
  clearResume();
  try{setRoomUrl('');renderRoomUI();renderRoomSelectionBanner();renderRoomCharacterAvailability();applyRoomTurnLock();updatePassTurnButton();}catch(e){}
  if(!silent)modal('Hai lasciato la stanza','','Puoi crearne una nuova o partecipare con un altro codice.');
}
function busy(title){try{setRoomStatus(title,'connecting');}catch(e){}}

// Transport overrides
window.createRoom=async function(){
  const name=cleanPlayerName(document.getElementById('hostPlayerName')?.value||'');
  if(!name){modal('Nome richiesto','','Inserisci il nome del Game Master.');return;}
  busy('Creazione stanza…');
  try{
    await ensureCloudReady();
    const result=await rpc('jjk_create_room',{p_player_name:name,p_max_players:8,p_settings:{client:CLIENT_KIND,version:'supabase-v2'}});
    localStorage.setItem('jjk_last_player_name',name);
    const established=await establishFromResult(result,name);
    modal('Stanza creata',established.code,'Condividi il codice con gli altri giocatori.');
  }catch(e){
    console.error('createRoom',e);
    modal('Creazione non riuscita','',cleanError(e));
    try{renderRoomUI();}catch(_){}
  }
};
window.joinRoom=async function(){
  const name=cleanPlayerName(document.getElementById('joinPlayerName')?.value||''),code=normalizeRoomCode(document.getElementById('joinRoomCode')?.value||'');
  if(!name||code.length!==6){modal('Dati mancanti','','Inserisci nome e codice stanza di 6 caratteri.');return;}
  busy('Ingresso nella stanza…');
  try{
    await ensureCloudReady();
    const result=await rpc('jjk_join_room',{p_code:code,p_player_name:name});
    localStorage.setItem('jjk_last_player_name',name);
    await establishFromResult(result,name);
    modal('Connesso alla stanza',code,'La stanza ora è sincronizzata tramite Supabase.');
  }catch(e){
    console.error('joinRoom',e);
    modal('Ingresso non riuscito','',cleanError(e));
    try{renderRoomUI();}catch(_){}
  }
};
window.leaveRoom=async function(silent=false){
  const s=getRoomSession();if(!s){await hardLeave(silent);return;}
  try{if(s.isHost)await rpc('jjk_close_room',{p_room_id:s.roomId});else await rpc('jjk_leave_room',{p_room_id:s.roomId});}catch(e){if(!silent)modal('Uscita non completata','',cleanError(e));}
  await hardLeave(silent);
};
window.notifyRoomCharacterSelection=async function(characterId){
  if(!roomSession||!characters[characterId])return;if(roomSession.isHost){modal('Game Master','','Il Game Master non seleziona un personaggio.');return;}
  try{await rpc('jjk_select_character',{p_room_id:roomSession.roomId,p_character_id:characterId});await refreshRoom(true);modal('Personaggio scelto',characterDisplayName(characterId),'La scelta è stata salvata nella stanza.');}catch(e){modal('Scelta non disponibile','',cleanError(e));}
};
window.startRoomSelection=async function(){
  if(!roomSession?.isHost)return;if(!roomSession.players.some(p=>!p.isHost)){modal('Nessun giocatore','','Attendi che almeno un giocatore entri.');return;}
  try{await rpc('jjk_start_character_selection',{p_room_id:roomSession.roomId});await refreshRoom(true);modal('Scelta personaggi avviata','','Ogni giocatore deve scegliere un personaggio diverso.');}catch(e){modal('Operazione non riuscita','',cleanError(e));}
};
window.startRoomGame=async function(){
  if(!roomSession?.isHost)return;
  const guests=roomSession.players.filter(p=>!p.isHost&&p.characterId);
  const ordered=guests.slice().sort((a,b)=>(Number(a.turnOrder)||99)-(Number(b.turnOrder)||99));
  const orderValid=guests.length>0&&ordered.every((p,index)=>Number(p.turnOrder)===index+1)&&new Set(ordered.map(p=>p.turnOrder)).size===guests.length;
  if(!orderValid){modal('Ordine turni mancante','','Prima di avviare la partita, ordina tutti i giocatori e premi “Salva ordine”.');return;}
  try{
    const startResult=normalizeRpcRecord(await rpc('jjk_start_match',{p_room_id:roomSession.roomId}));
    await refreshRoom(true);
    const activeGuests=roomSession.players.filter(p=>!p.isHost&&p.characterId);
    await Promise.all(activeGuests.map(p=>rpc('jjk_gm_patch_player_state',{p_room_player_id:p.playerToken,p_patch:createInitialRoomPlayerState(p.characterId),p_event_label:'Stato iniziale partita'})));
    await refreshRoom(true);openGMDashboard();
    const firstName=startResult?.first_player_name||roomSession.players.find(p=>!p.isHost&&!p.locked)?.name||ordered[0]?.name||'primo giocatore';
    modal('Partita avviata','Primo turno: '+firstName,'Da ora, quando un giocatore passa il turno, il successivo nell’ordine viene sbloccato automaticamente.');
  }catch(e){modal('Partita non avviata','',cleanError(e));}
};
window.scheduleRoomPlayerStateSync=function(){
  if(isApplyingRemoteState()||!roomSession||roomSession.isHost||roomSession.phase!=='playing')return;
  clearTimeout(saveTimer);saveTimer=setTimeout(()=>window.sendLocalPlayerState(false),180);
};
window.sendLocalPlayerState=function(){
  clearTimeout(saveTimer);saveTimer=null;
  stateWritePromise=stateWritePromise.then(async()=>{
    const session=getRoomSession();if(!session||session.isHost||session.phase!=='playing')return;
    const me=getLocalRoomPlayer();if(!me||me.locked)return;
    const state=buildLocalPlayerState();if(!state)return;
    state.bossRushActive=!!me.bossRush;
    if(me.bossRush&&me.state?._bossRushSnapshot)state._bossRushSnapshot=cloneJson(me.state._bossRushSnapshot);
    else delete state._bossRushSnapshot;
    const expectedVersion=Number.isFinite(Number(stateVersion))?Number(stateVersion):null;
    try{
      const result=normalizeRpcRecord(await rpc('jjk_save_my_state',{p_room_id:session.roomId,p_state:state,p_expected_version:expectedVersion}));
      stateVersion=Number(result?.version??stateVersion+1);lastAppliedStateVersion=stateVersion;scheduleRefresh(60);
    }catch(e){
      const raw=String(e?.message||e);
      if(raw.includes('STATE_VERSION_CONFLICT'))scheduleRefresh(0);
      else if(!raw.includes('NOT_YOUR_TURN'))console.warn('save state',e);
    }
  });
  return stateWritePromise;
};
window.playerPassTurn=async function(){
  const me=getLocalRoomPlayer();if(!roomSession||roomSession.isHost||roomSession.phase!=='playing'||!me||me.locked)return;
  try{
    await window.jjkFlushAnalytics?.();
    await window.sendLocalPlayerState();
    const result=normalizeRpcRecord(await rpc('jjk_pass_turn',{p_room_id:roomSession.roomId}));
    await refreshRoom(true);
    const nextName=result?.next_player_name||roomSession.players.find(p=>!p.isHost&&!p.locked)?.name||'il giocatore successivo';
    try{window.JJKSfx?.play('nav');}catch(e){}
    try{if(typeof showPlayerNotification==='function')showPlayerNotification('Turno passato','Ora tocca a '+nextName+'.','#ff9b55');else modal('Turno passato','Ora tocca a '+nextName,'La tua scheda è stata bloccata automaticamente.');}catch(e){}
  }catch(e){modal('Passaggio turno non riuscito','',cleanError(e));}
};
window.updatePassTurnButton=function(){const btn=document.getElementById('passTurnBtn');if(!btn)return;const me=getLocalRoomPlayer();const visible=!!(roomSession&&!roomSession.isHost&&roomSession.phase==='playing'&&me);btn.classList.toggle('show',visible);btn.style.display=visible?'block':'none';btn.disabled=!visible||!!me?.locked;btn.textContent=me?.locked?'Turno terminato · In attesa del GM':'Passa il turno · Blocca scheda';};
window.gmGiveTurn=async function(id){if(!roomSession?.isHost)return;try{await rpc('jjk_gm_give_turn',{p_room_id:roomSession.roomId,p_room_player_id:id});await refreshRoom(true);}catch(e){modal('Turno non assegnato','',cleanError(e));}};
window.gmTogglePlayerLock=async function(id){const p=roomFindPlayer(id);if(!p||!roomSession?.isHost)return;try{await rpc('jjk_gm_set_player_controls',{p_room_player_id:id,p_locked:!p.locked,p_self_manage:null,p_energy_discount:null,p_has_eye:null});await refreshRoom(true);}catch(e){modal('Comando non riuscito','',cleanError(e));}};
window.gmToggleEye=async function(id){const p=roomFindPlayer(id);if(!p||!roomSession?.isHost)return;try{await rpc('jjk_gm_set_player_controls',{p_room_player_id:id,p_locked:null,p_self_manage:null,p_energy_discount:null,p_has_eye:!p.hasEye});await refreshRoom(true);}catch(e){modal('Comando non riuscito','',cleanError(e));}};
window.gmToggleSelfManage=async function(id){const p=roomFindPlayer(id);if(!p||!roomSession?.isHost)return;try{await rpc('jjk_gm_set_player_controls',{p_room_player_id:id,p_locked:null,p_self_manage:!(p.selfManage!==false),p_energy_discount:null,p_has_eye:null});await refreshRoom(true);}catch(e){modal('Comando non riuscito','',cleanError(e));}};
window.gmToggleEnergyDiscount=async function(id){const p=roomFindPlayer(id);if(!p||!roomSession?.isHost)return;try{await rpc('jjk_gm_set_player_controls',{p_room_player_id:id,p_locked:null,p_self_manage:null,p_energy_discount:!p.energyDiscount,p_has_eye:null});await refreshRoom(true);}catch(e){modal('Comando non riuscito','',cleanError(e));}};
window.gmAdjustPlayer=async function(id,field,delta,rerender=true){
  if(!roomSession?.isHost||roomSession.phase!=='playing')return;const p=roomFindPlayer(id);if(!p?.state)return;const st=JSON.parse(JSON.stringify(p.state));const temp={...p,state:st};adjustRoomStateObject(temp,field,Number(delta)||0);
  try{await rpc('jjk_gm_patch_player_state',{p_room_player_id:id,p_patch:st,p_event_label:'Modifica '+field+' '+(delta>=0?'+':'')+delta});await refreshRoom(true);if(rerender)renderGMDashboard();}catch(e){modal('Risorsa non modificata','',cleanError(e));}
};
window.gmApplyGroup=async function(field,delta,scope){const ids=gmTargetIds(scope);if(!ids.length){modal('Nessun giocatore selezionato','','Seleziona almeno un giocatore.');return;}for(const id of ids)await window.gmAdjustPlayer(id,field,delta,false);await refreshRoom(true);renderGMDashboard();};
window.gmSetGroupLock=async function(locked,scope){const ids=gmTargetIds(scope);if(!ids.length){modal('Nessun giocatore selezionato','','Seleziona almeno un giocatore.');return;}for(const id of ids){const p=roomFindPlayer(id);if(p)await rpc('jjk_gm_set_player_controls',{p_room_player_id:id,p_locked:!!locked,p_self_manage:null,p_energy_discount:null,p_has_eye:null});}await refreshRoom(true);};
window.gmApplyGroupAmount=async function(){const scope=document.getElementById('gmGroupScope')?.value||'selected',field=document.getElementById('gmGroupField')?.value||'energy',operation=Number(document.getElementById('gmGroupOperation')?.value)||1,amount=Math.abs(Math.trunc(Number(document.getElementById('gmGroupAmount')?.value)||0));if(!amount){modal('Quantità non valida','','Inserisci una quantità maggiore di zero.');return;}await window.gmApplyGroup(field,operation*amount,scope);};
window.gmKickPlayer=async function(id){const p=roomFindPlayer(id);if(!p||!roomSession?.isHost)return;if(!confirm('Espellere '+p.name+' dalla stanza?'))return;try{await rpc('jjk_gm_kick_player',{p_room_player_id:id});await refreshRoom(true);modal('Giocatore espulso',p.name,'Il posto e il personaggio sono stati liberati.');}catch(e){modal('Espulsione non riuscita','',cleanError(e));}};

const BOSS_RUSH_RESOURCE_KEYS=['energy','life','tokens','combatBonus','jogoLife','jogoHeat','getoOneUse','tojiCollectedEnergy','itadoriFingers','itadoriMaxFingers','itadoriOneUse','yutaKatanaActive','yutaCopiedTokens','yutaCopiedVigor','yutaCopiedFingers','yutaCopiedMaxFingers','yutaCopiedHeat'];
function cloneJson(value){return value==null?value:JSON.parse(JSON.stringify(value));}
function createBossRushResourceSnapshot(state){
  const snapshot={};
  BOSS_RUSH_RESOURCE_KEYS.forEach(key=>{if(state&&state[key]!==undefined)snapshot[key]=cloneJson(state[key]);});
  return snapshot;
}
function normalizeBossRushResourceSnapshot(snapshot){
  const out={};
  BOSS_RUSH_RESOURCE_KEYS.forEach(key=>{if(snapshot&&snapshot[key]!==undefined)out[key]=cloneJson(snapshot[key]);});
  return out;
}
async function deactivateBossRushPlayer(player,label='Boss Rush disattivata'){
  if(!player?.playerToken)return;
  const snapshot=normalizeBossRushResourceSnapshot(player.state?._bossRushSnapshot||{});
  const restore={...snapshot,bossRushActive:false,_bossRushSnapshot:null,updatedAt:Date.now()};
  await rpc('jjk_gm_patch_player_state',{p_room_player_id:player.playerToken,p_patch:restore,p_event_label:label});
  await rpc('jjk_gm_set_boss_rush',{p_room_player_id:player.playerToken,p_enabled:false,p_snapshot:null});
}

window.gmToggleBossRush=async function(id){
  let p=roomFindPlayer(id);
  if(!p||!roomSession?.isHost||roomSession.phase!=='playing')return;
  try{
    if(!p.state&&p.characterId){
      const initial=createInitialRoomPlayerState(p.characterId);
      await rpc('jjk_gm_patch_player_state',{p_room_player_id:id,p_patch:initial,p_event_label:'Inizializzazione Boss Rush'});
      await refreshRoom(true);
      p=roomFindPlayer(id);
    }
    if(!p?.state){modal('Boss Rush non disponibile','','Lo stato del giocatore non è ancora pronto. Attendi un secondo e riprova.');return;}

    if(p.bossRush){
      await deactivateBossRushPlayer(p,'Boss Rush disattivata · risorse ripristinate');
      await refreshRoom(true);
      modal('Boss Rush disattivata',p.name,'Le risorse precedenti sono state ripristinate.');
      return;
    }

    const alreadyActive=(roomSession.players||[]).filter(x=>!x.isHost&&x.bossRush&&x.playerToken!==id);
    for(const other of alreadyActive){
      await deactivateBossRushPlayer(other,'Boss Rush trasferita · risorse ripristinate');
    }

    const snapshot=createBossRushResourceSnapshot(p.state);
    const activePatch={bossRushActive:true,_bossRushSnapshot:snapshot,updatedAt:Date.now()};
    await rpc('jjk_gm_patch_player_state',{p_room_player_id:id,p_patch:activePatch,p_event_label:'Boss Rush attivata'});
    await rpc('jjk_gm_set_boss_rush',{p_room_player_id:id,p_enabled:true,p_snapshot:snapshot});
    await refreshRoom(true);
    modal('Boss Rush attivata',p.name,'Tecniche gratuite e nessun consumo di Energia, Vita, Vigore, Segnalini o risorse speciali.');
  }catch(e){console.error('gmToggleBossRush',e);modal('Boss Rush non modificata','',cleanError(e));}
};
window.gmEndGame=async function(){
  if(!roomSession?.isHost||roomSession.phase!=='playing')return;const id=document.getElementById('gmWinnerSelect')?.value,p=roomFindPlayer(id);if(!p?.characterId){modal('Vincitore mancante','','Seleziona il giocatore vincitore.');return;}if(!confirm('Concludere la partita e registrare '+p.name+' come vincitore?'))return;
  try{await window.jjkFlushAnalytics?.();const result=await rpc('jjk_end_match',{p_room_id:roomSession.roomId,p_winner_player_id:id,p_summary:{client:CLIENT_KIND,statistics:'global-v1'}});const endedAt=Date.now(),durationMs=Number(result.duration_seconds||0)*1000;const win={id:'win_'+endedAt,name:p.name,characterId:p.characterId,characterName:characterDisplayName(p.characterId),timestamp:endedAt,durationMs,roomCode:roomSession.code};const wins=loadVictories();wins.unshift(win);saveVictories(wins);await refreshRoom(true);showScreen('rooms');modal('Partita conclusa',p.name,win.characterName+' · durata '+formatDuration(durationMs)+'.');}catch(e){modal('Partita non conclusa','',cleanError(e));}
};
window.broadcastRoomState=function(){scheduleRefresh(30);};
window.sendToRoomPlayer=function(){};
window.ensureRoomConnectivity=function(){if(roomSession?.roomId)scheduleRefresh(10);};
window.persistRoomResumeSession=saveResume;
window.destroyRoomPeer=function(){};
const cloudConnection={get open(){return !!getRoomSession()?.roomId;},send(){}};
try{roomPeer=null;roomHostConnection=cloudConnection;}catch(e){}
window.roomPeer=null;window.roomHostConnection=cloudConnection;

window.jjkCloudRpc=rpc;
window.jjkEnsureCloudReady=ensureCloudReady;
window.jjkGetRoomSession=getRoomSession;
window.jjkGetCloudUser=function(){return currentUser;};
window.jjkRefreshRoom=refreshRoom;

async function init(){
  try{await ensureCloudReady();await restoreSession();console.info('JJK Supabase multiplayer ready v21-registered',CLIENT_KIND);}catch(e){console.error(e);modal('Multiplayer cloud non disponibile','',cleanError(e));}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
