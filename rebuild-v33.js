(function(){
  'use strict';

  const ui={feedPlayer:'all',feedQuery:''};
  const $=id=>document.getElementById(id);
  const esc=value=>{
    const text=String(value??'');
    if(typeof escapeHtml==='function')return escapeHtml(text);
    return text.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  };
  const getCharacters=()=>typeof characters!=='undefined'?characters:{};
  const getRoom=()=>typeof roomSession!=='undefined'?roomSession:null;
  const players=()=>((getRoom()?.players)||[]).filter(player=>!player.isHost);
  const characterName=id=>typeof characterDisplayName==='function'?characterDisplayName(id):(getCharacters()[id]?.name||id||'—');

  function safe(label,fn){
    try{return fn();}catch(error){console.error('[V33 '+label+']',error);return null;}
  }


  function updateScreenState(){
    document.body.classList.toggle('v33-home-active',document.querySelector('.screen.active')?.id==='home');
  }

  function injectHomeRoster(){
    const card=document.querySelector('#home .home-card-v2');
    const footer=card?.querySelector('.home-footer-line');
    if(!card||!footer||$('v33HomeRoster'))return;
    const data=getCharacters();
    const roster=document.createElement('section');
    roster.id='v33HomeRoster';
    roster.className='v33-home-roster';
    roster.innerHTML='<div class="v33-home-roster-head"><div><b>Roster rapido</b><small>Apri direttamente le informazioni del personaggio.</small></div><span>9 combattenti</span></div><div class="v33-roster-strip">'+
      Object.entries(data).map(([id,ch])=>'<button type="button" class="v33-roster-person" data-v33-character="'+esc(id)+'" aria-label="Apri '+esc(ch.name)+'"><img src="assets/portraits/'+esc(id)+'.webp" alt="'+esc(ch.name)+'"><span>'+esc(ch.name)+'</span></button>').join('')+
      '</div>';
    footer.insertAdjacentElement('beforebegin',roster);
    roster.addEventListener('click',event=>{
      const button=event.target.closest('[data-v33-character]');
      if(!button)return;
      const id=button.dataset.v33Character;
      if(typeof openCharacterInfo==='function')openCharacterInfo(id);
      else if(typeof showScreen==='function')showScreen('selection');
    });
  }

  function injectHomeStatus(){
    const card=document.querySelector('#home .home-card-v2');
    const footer=card?.querySelector('.home-footer-line');
    if(!card||!footer||$('v33HomeStatus'))return;
    const status=document.createElement('section');
    status.id='v33HomeStatus';
    status.className='v33-home-status';
    status.innerHTML='<div class="v33-home-status-card"><small>Sessione</small><b id="v33SessionState">Pronta per giocare</b></div><div class="v33-home-status-card"><small>Stanza</small><b id="v33RoomState">Nessuna</b></div><div class="v33-home-status-card"><small>Versione</small><b>V33 Rebuild Clean</b></div>';
    footer.insertAdjacentElement('beforebegin',status);
    updateHomeStatus();
  }

  function updateHomeStatus(){
    const room=getRoom();
    const session=$('v33SessionState');
    const roomState=$('v33RoomState');
    if(!session||!roomState)return;
    if(!room){
      session.textContent='Pronta per giocare';
      roomState.textContent='Nessuna';
      return;
    }
    const phase={lobby:'Lobby',selection:'Scelta personaggi',playing:'Partita in corso',ended:'Conclusa'}[room.phase]||'Attiva';
    session.textContent=phase;
    roomState.textContent=(room.code||'------')+' · '+players().length+' giocatori';
  }

  function injectRoomsHero(){
    const wrap=document.querySelector('#rooms .rooms-wrap');
    const setup=$('roomSetup');
    if(!wrap||!setup||$('v33RoomsHero'))return;
    const hero=document.createElement('section');
    hero.id='v33RoomsHero';
    hero.className='v33-rooms-hero';
    hero.innerHTML='<div><div class="v33-rooms-kicker">Modalità online</div><h3>Una lobby più chiara, senza cambiare le regole della partita.</h3><p>Crea o raggiungi una stanza, avvia la scelta dei personaggi e controlla turni e risorse dal Game Master.</p><div class="v33-room-chips"><span>Risorse sincronizzate</span><span>Turni controllati</span><span>Boss Rush</span><span>Fino a 8 partecipanti</span></div></div><div class="v33-room-state"><small>Stato corrente</small><b id="v33RoomsStateTitle">Nessuna stanza</b><p id="v33RoomsStateText">Inserisci il nome e crea una lobby oppure usa il codice ricevuto dal Game Master.</p></div>';
    wrap.insertBefore(hero,setup);
    updateRoomsHero();
  }

  function updateRoomsHero(){
    const title=$('v33RoomsStateTitle');
    const text=$('v33RoomsStateText');
    if(!title||!text)return;
    const room=getRoom();
    if(!room){
      title.textContent='Nessuna stanza';
      text.textContent='Inserisci il nome e crea una lobby oppure usa il codice ricevuto dal Game Master.';
      return;
    }
    const phase={lobby:'Lobby aperta',selection:'Scelta personaggi',playing:'Partita in corso',ended:'Partita conclusa'}[room.phase]||'Stanza attiva';
    title.textContent=(room.code||'------')+' · '+phase;
    text.textContent=room.isHost?'Sei il Game Master. Giocatori collegati: '+players().length+'.':'Sei collegato alla stanza. Il Game Master controlla la fase della partita.';
  }

  function injectCounters(){
    const movementSummary=document.querySelector('#playerMovementDropdown summary');
    if(movementSummary&&!$('v33PlayerMoveCount')){
      const count=document.createElement('span');
      count.id='v33PlayerMoveCount';
      count.className='dropdown-count';
      const arrow=movementSummary.querySelector('.dropdown-chevron');
      arrow?movementSummary.insertBefore(count,arrow):movementSummary.appendChild(count);
    }
    updateCounters();
  }

  function updateCounters(){
    const info=$('infoMoveCount');
    const game=$('gameMoveCount');
    const movement=$('v33PlayerMoveCount');
    if(info)info.textContent=String(document.querySelectorAll('#characterInfoTechniques .info-tech-card').length);
    if(game)game.textContent=String(document.querySelectorAll('#techGrid .tech-card').length);
    if(movement)movement.textContent=String(document.querySelectorAll('#logList .log-item').length);
  }

  function observeCounters(){
    ['characterInfoTechniques','techGrid','logList'].forEach(id=>{
      const node=$(id);
      if(!node||node.dataset.v33Observed==='1')return;
      node.dataset.v33Observed='1';
      new MutationObserver(updateCounters).observe(node,{childList:true,subtree:true});
    });
  }

  function injectGMFeed(){
    const playersView=$('gmViewPlayers');
    const controls=playersView?.querySelector('.gm-control-bar');
    if(!playersView||!controls||$('v33GMFeedShell'))return;
    let insertionAnchor=controls;
    while(insertionAnchor.parentElement&&insertionAnchor.parentElement!==playersView)insertionAnchor=insertionAnchor.parentElement;
    const shell=document.createElement('section');
    shell.id='v33GMFeedShell';
    shell.className='gm-control-bar gm-control-v3 v33-gm-feed-shell';
    shell.innerHTML='<div class="v33-gm-feed-top"><div><h4>Movimenti sempre a portata di mano</h4><p>Consulta le azioni recenti senza abbandonare la gestione dei giocatori.</p></div><button type="button" class="gm-btn" id="v33OpenFullFeed">Vista completa</button></div><details class="v33-gm-feed-dropdown" open><summary><span><b>Movimenti recenti</b><small>Feed rapido del Game Master</small></span><span id="v33GMFeedCount" class="v33-feed-count">0</span><span class="dropdown-chevron">⌄</span></summary><div class="v33-gm-feed-body"><div class="v33-gm-feed-toolbar"><label><span>Giocatore</span><select id="v33GMFeedPlayer"><option value="all">Tutti i giocatori</option></select></label><label><span>Cerca</span><input id="v33GMFeedSearch" type="search" placeholder="Tecnica, costo, EXP..."></label><button type="button" class="gm-btn" id="v33GMFeedRefresh">Aggiorna</button></div><div id="v33GMFeed" class="v33-gm-feed"></div></div></details>';
    insertionAnchor.insertAdjacentElement('afterend',shell);
    $('v33OpenFullFeed')?.addEventListener('click',()=>{if(typeof gmSetView==='function')gmSetView('feed');});
    $('v33GMFeedRefresh')?.addEventListener('click',renderGMFeed);
    $('v33GMFeedPlayer')?.addEventListener('change',event=>{ui.feedPlayer=event.target.value;renderGMFeed();});
    $('v33GMFeedSearch')?.addEventListener('input',event=>{ui.feedQuery=String(event.target.value||'').trim().toLowerCase();renderGMFeed();});
  }

  function collectLogs(){
    const logs=[];
    players().forEach(player=>{
      (player.state?.log||[]).forEach(item=>logs.push({
        token:player.playerToken,
        name:player.name,
        char:characterName(player.characterId),
        title:item.title||'Azione',
        detail:item.detail||'',
        time:item.time||'',
        ts:Number(item.ts)||0
      }));
    });
    return logs.sort((a,b)=>b.ts-a.ts);
  }

  function renderGMFeed(){
    injectGMFeed();
    const feed=$('v33GMFeed');
    const select=$('v33GMFeedPlayer');
    const count=$('v33GMFeedCount');
    if(!feed||!select||!count)return;
    const current=ui.feedPlayer;
    select.innerHTML='<option value="all">Tutti i giocatori</option>'+players().map(player=>'<option value="'+esc(player.playerToken)+'">'+esc(player.name)+' · '+esc(characterName(player.characterId))+'</option>').join('');
    if([...select.options].some(option=>option.value===current))select.value=current;
    else{ui.feedPlayer='all';select.value='all';}
    let logs=collectLogs();
    if(ui.feedPlayer!=='all')logs=logs.filter(log=>log.token===ui.feedPlayer);
    if(ui.feedQuery)logs=logs.filter(log=>(log.name+' '+log.char+' '+log.title+' '+log.detail).toLowerCase().includes(ui.feedQuery));
    count.textContent=String(logs.length);
    feed.innerHTML=logs.length?logs.slice(0,40).map(log=>'<article class="v33-feed-item"><span class="v33-feed-player">'+esc(log.name)+'</span><strong>'+esc(log.title)+'</strong><p>'+esc(log.detail||'Nessun dettaglio aggiuntivo.')+'</p><div class="v33-feed-meta">'+esc(log.char)+(log.time?' · '+esc(log.time):'')+'</div></article>').join(''):'<div class="stats-empty">Nessun movimento registrato.</div>';
  }

  function injectUpdateCard(){
    const wrap=document.querySelector('#updates .updates-wrap');
    const topbar=wrap?.querySelector('.topbar');
    if(!wrap||!topbar||$('v33UpdateCard'))return;
    const card=document.createElement('div');
    card.id='v33UpdateCard';
    card.className='updates-card';
    card.innerHTML='<div class="update-version">V33 · Rebuild Clean</div><h3>Ricostruzione grafica sulla V27 originale</h3><p>Home rifatta senza livelli 3D instabili, Stanze più leggibili, roster rapido, contatori delle tecniche e feed movimenti integrato nel Game Master. Personaggi, tecniche, costi, progressioni, account, statistiche ed eventi non sono stati modificati.</p>';
    topbar.insertAdjacentElement('afterend',card);
  }

  function wrap(name,after){
    const previous=window[name];
    if(typeof previous!=='function'||previous.__v33Wrapped)return;
    const wrapped=function(){
      const result=previous.apply(this,arguments);
      safe(name,()=>after.apply(this,arguments));
      return result;
    };
    wrapped.__v33Wrapped=true;
    window[name]=wrapped;
  }

  function installWrappers(){
    wrap('showScreen',function(id){
      if(id==='rooms')updateRoomsHero();
      if(id==='gameMaster')renderGMFeed();
      updateHomeStatus();
      updateScreenState();
      setTimeout(updateCounters,35);
    });
    wrap('renderRoomUI',function(){updateHomeStatus();updateRoomsHero();});
    wrap('renderGMDashboard',function(){renderGMFeed();updateHomeStatus();});
    wrap('renderCharacterInfo',updateCounters);
    wrap('renderRoomDraftSelection',updateCounters);
    wrap('openCharacter',()=>setTimeout(updateCounters,35));
  }

  function health(){
    return {
      version:'33',
      activeScreen:document.querySelector('.screen.active')?.id||null,
      horizontalOverflow:document.documentElement.scrollWidth>window.innerWidth+2,
      missingAssets:[...document.images].filter(image=>image.complete&&image.naturalWidth===0).map(image=>image.getAttribute('src')).filter(Boolean),
      systems:{characters:typeof characters!=='undefined',rooms:typeof roomSession!=='undefined',supabase:typeof window.supabase!=='undefined'||typeof window.jjkCloudRpc==='function'}
    };
  }

  function init(){
    document.title='JJK Energy V33 · Rebuild Clean';
    [injectHomeRoster,injectHomeStatus,injectRoomsHero,injectCounters,observeCounters,injectGMFeed,injectUpdateCard,installWrappers].forEach(fn=>safe(fn.name,fn));
    updateHomeStatus();
    updateScreenState();
    updateRoomsHero();
    updateCounters();
    renderGMFeed();
    window.JJKV33={health,renderGMFeed,updateHomeStatus};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
