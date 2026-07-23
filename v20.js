/* JJK Energy V2.0 - Ascension Edition
   UI cinematica, progressione account, achievement, menu dominio,
   soundscape originale e assistente eventi per il Game Master. */
(function(){
'use strict';
const VERSION='2.0.0';
const STORE={music:'jjk_v20_music_enabled',volume:'jjk_v20_music_volume',achievementFilter:'jjk_v20_achievement_filter'};
const colors={gojo:'#55cfff',megumi:'#6ee7ff',geto:'#45df96',sukuna:'#ff4058',mahito:'#b164ff',jogo:'#ff7a28',toji:'#a064ff',itadori:'#ff4f79',yuta:'#4e9dff'};
const glyphs={gojo:'∞',megumi:'影',geto:'呪',sukuna:'斬',mahito:'魂',jogo:'火',toji:'砕',itadori:'拳',yuta:'刀'};
const state={progression:null,leaderboard:[],loading:false,filter:localStorage.getItem(STORE.achievementFilter)||'all',menuOpen:false,event:null,lastTechnique:null};

function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function int(v){return Math.round(num(v)).toLocaleString('it-IT');}
function currentCharacterId(){try{return (typeof currentId!=='undefined'&&currentId)||window.currentId||null;}catch(e){return window.currentId||null;}}
function getCharacters(){try{return characters;}catch(e){return window.characters||{};}}
function characterName(id){try{return characterDisplayName(id);}catch(e){return getCharacters()[id]?.name||id||'Personaggio';}}
function room(){try{return roomSession;}catch(e){return window.roomSession||null;}}
function activeScreen(){return document.querySelector('.screen.active')?.id||'home';}
function isMobile(){return matchMedia('(max-width:720px)').matches||/iPhone|Android|Mobile/i.test(navigator.userAgent);}
function formatTime(seconds){const s=Math.max(0,Math.floor(num(seconds))),h=Math.floor(s/3600),m=Math.floor((s%3600)/60);if(h)return h+'h '+m+'m';if(m)return m+'m';return s+'s';}
function formatDate(value){if(!value)return '';try{return new Date(value).toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'});}catch(e){return '';}}
function setGlobalFunction(name,fn){window[name]=fn;try{eval(name+' = fn');}catch(e){}}
async function cloudRpc(name,args={}){if(window.jjkEnsureCloudReady)await window.jjkEnsureCloudReady();if(window.jjkCloudRpc)return window.jjkCloudRpc(name,args);const sb=window.jjkSupabase;if(!sb)throw new Error('Supabase non inizializzato');const {data,error}=await sb.rpc(name,args);if(error)throw error;return typeof data==='string'?JSON.parse(data):data;}

/* ---------------------------------------------------------
   MENU DOMINIO
--------------------------------------------------------- */
function injectDomainMenu(){
  if(document.getElementById('v20DomainMenu'))return;
  const stack=document.createElement('div');stack.className='v20-control-stack';stack.innerHTML=
    '<button id="v20MenuLauncher" class="v20-fab" type="button" aria-label="Apri menu dominio">☰<span class="v20-fab-label">Menu dominio</span></button>'+ 
    '<button id="v20MusicToggle" class="v20-fab" type="button" aria-label="Attiva musica dinamica">♫<span class="v20-fab-label">Musica dinamica</span></button>';
  document.body.appendChild(stack);
  const menu=document.createElement('div');menu.id='v20DomainMenu';menu.className='v20-domain-menu';menu.setAttribute('aria-hidden','true');menu.innerHTML=
    '<div class="v20-domain-backdrop"><div class="v20-domain-ring"></div></div>'+ 
    '<section class="v20-domain-shell" role="dialog" aria-modal="true" aria-label="Menu principale">'+
      '<div class="v20-domain-head"><div><div class="v20-domain-kicker">Espansione del menu</div><h2>JJK Energy Ascension</h2><p>Navigazione rapida, progressione e controllo audio.</p></div><button class="v20-domain-close" data-v20-close>✕</button></div>'+ 
      '<div class="v20-domain-grid">'+
        '<button class="v20-domain-card" style="--c:#ff5c82" data-v20-nav="home"><span class="v20-domain-icon">家</span><b>Home</b><small>Torna al portale principale</small></button>'+ 
        '<button class="v20-domain-card" style="--c:#52cfff" data-v20-nav="selection"><span class="v20-domain-icon">人</span><b>Info personaggi</b><small>Roster, tecniche e progressione</small></button>'+ 
        '<button class="v20-domain-card" style="--c:#a56bff" data-v20-nav="rooms"><span class="v20-domain-icon">結</span><b>Stanze online</b><small>Lobby e multiplayer cloud</small></button>'+ 
        '<button class="v20-domain-card" style="--c:#ffd05c" data-v20-nav="progression"><span class="v20-domain-icon">冠</span><b>Livello account</b><small>Achievement, badge e classifica</small></button>'+ 
      '</div>'+ 
      '<div class="v20-domain-footer"><span>V2.0 · Interfaccia cinematica originale</span><div class="v20-domain-audio"><span>Volume musica</span><input id="v20MusicVolume" type="range" min="0" max="100" step="1" value="24"></div></div>'+ 
    '</section>';
  document.body.appendChild(menu);
  const panel=document.createElement('div');panel.id='v20MusicPanel';panel.className='v20-music-panel';panel.innerHTML='<span>Musica dinamica</span><input id="v20MusicVolumeMini" type="range" min="0" max="100" value="24"><button type="button" data-v20-hide-music>✕</button>';document.body.appendChild(panel);
  const toast=document.createElement('div');toast.id='v20ToastStack';toast.className='v20-toast-stack';document.body.appendChild(toast);
  document.getElementById('v20MenuLauncher').addEventListener('click',()=>toggleDomainMenu());
  document.getElementById('v20MusicToggle').addEventListener('click',()=>toggleMusic());
  menu.addEventListener('click',e=>{
    if(e.target===menu||e.target.closest('[data-v20-close]')){closeDomainMenu();return;}
    const nav=e.target.closest('[data-v20-nav]');if(!nav)return;
    navigate(nav.dataset.v20Nav);closeDomainMenu();
  });
  document.querySelector('[data-v20-hide-music]')?.addEventListener('click',()=>panel.classList.remove('show'));
  ['v20MusicVolume','v20MusicVolumeMini'].forEach(id=>document.getElementById(id)?.addEventListener('input',e=>setMusicVolume(Number(e.target.value)/100,true)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.menuOpen)closeDomainMenu();else if((e.key==='m'||e.key==='M')&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))toggleDomainMenu();});
}
function openDomainMenu(){const el=document.getElementById('v20DomainMenu');if(!el)return;state.menuOpen=true;el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.classList.add('v20-menu-open');window.JJKSfx?.play('domain');}
function closeDomainMenu(){const el=document.getElementById('v20DomainMenu');if(!el)return;state.menuOpen=false;el.classList.remove('open');el.setAttribute('aria-hidden','true');document.body.classList.remove('v20-menu-open');}
function toggleDomainMenu(){state.menuOpen?closeDomainMenu():openDomainMenu();}
function navigate(target){
  if(target==='rooms'){window.openRooms?.();return;}
  if(target==='progression'){window.openStatistics?.();setTimeout(()=>window.setCloudStatsView?.('progression'),80);return;}
  window.showScreen?.(target);
}

/* ---------------------------------------------------------
   HUD E PROGRESSIONE ACCOUNT
--------------------------------------------------------- */
function injectAccountHud(){if(document.getElementById('v20AccountHud'))return;const hud=document.createElement('button');hud.id='v20AccountHud';hud.className='v20-account-hud';hud.type='button';hud.innerHTML='<span class="v20-account-level" id="v20HudLevel">—</span><span class="v20-account-copy"><b id="v20HudTitle">Progressione account</b><small id="v20HudMeta">Sincronizzazione cloud…</small><span class="v20-account-bar"><i id="v20HudBar"></i></span></span>';hud.addEventListener('click',()=>navigate('progression'));document.body.appendChild(hud);}
function injectProgressionPanel(){
  const nav=document.querySelector('.cloud-stats-nav');if(!nav||document.querySelector('[data-cloud-view="progression"]'))return;
  const archive=nav.querySelector('[data-cloud-view="archive"]');const btn=document.createElement('button');btn.className='cloud-stats-tab';btn.dataset.cloudView='progression';btn.innerHTML='<span>冠</span><b>Progressione</b><small>Livello, badge e obiettivi</small>';btn.addEventListener('click',()=>window.setCloudStatsView?.('progression'));nav.insertBefore(btn,archive||null);
  const archivePanel=document.querySelector('[data-cloud-view-panel="archive"]');const panel=document.createElement('div');panel.className='cloud-stats-view';panel.dataset.cloudViewPanel='progression';panel.innerHTML=
    '<section class="cloud-section cloud-section-featured v20-progression-shell">'+
      '<div class="cloud-section-head"><div><div class="cloud-section-kicker">Ascensione account</div><h3>Livello, titoli e achievement</h3></div><div class="cloud-section-note">La progressione usa partite, vittorie, tecniche, tempo giocato e Boss Rush.</div></div>'+ 
      '<div id="v20ProgressionContent"><div class="cloud-loading">Sincronizzazione progressione…</div></div>'+ 
    '</section>';
  archivePanel?.parentNode?.insertBefore(panel,archivePanel);
  const baseSet=window.setCloudStatsView;
  const setView=function(view,scroll=true){const allowed=['overview','charts','ranking','characters','profile','progression','archive'];const target=allowed.includes(view)?view:'overview';document.querySelectorAll('.cloud-stats-tab').forEach(x=>x.classList.toggle('active',x.dataset.cloudView===target));document.querySelectorAll('.cloud-stats-view').forEach(x=>x.classList.toggle('active',x.dataset.cloudViewPanel===target));localStorage.setItem('jjk_cloud_stats_view',target);if(target==='progression')loadProgression();if(scroll)document.querySelector('.cloud-stats-nav')?.scrollIntoView({behavior:'smooth',block:'start'});};
  setGlobalFunction('setCloudStatsView',setView);
  const baseOpen=window.openStatistics;
  if(typeof baseOpen==='function'&&!baseOpen.__v20){const wrapped=function(){const result=baseOpen.apply(this,arguments);setTimeout(()=>{const saved=localStorage.getItem('jjk_cloud_stats_view');if(saved==='progression')setView('progression',false);loadProgression(true);},80);return result;};wrapped.__v20=true;setGlobalFunction('openStatistics',wrapped);}
}
async function loadProgression(silent=false){
  if(state.loading)return;state.loading=true;
  const content=document.getElementById('v20ProgressionContent');if(content&&!silent)content.innerHTML='<div class="cloud-loading">Calcolo del livello account…</div>';
  try{
    const [mine,board]=await Promise.all([cloudRpc('jjk_my_progression'),cloudRpc('jjk_global_level_leaderboard',{p_limit:50})]);
    state.progression=mine||{};state.leaderboard=Array.isArray(board)?board:[];renderProgression();renderAccountHud();showNewAchievements();
  }catch(error){
    console.warn('[JJK V2 progression]',error);
    if(content)content.innerHTML='<div class="v20-progress-error"><b>Progressione cloud non ancora attiva.</b><br>'+esc(error?.message||error)+'<br><small>Esegui su Supabase il file “JJK_Supabase_Passo_6_Progressione_Achievement.sql”, poi premi Aggiorna.</small></div>';
    renderAccountHud(true);
  }finally{state.loading=false;}
}
function renderAccountHud(error=false){const p=state.progression?.progression||{};const level=document.getElementById('v20HudLevel'),title=document.getElementById('v20HudTitle'),meta=document.getElementById('v20HudMeta'),bar=document.getElementById('v20HudBar');if(!level)return;if(error){level.textContent='!';title.textContent='Progressione da attivare';meta.textContent='Apri Statistiche';bar?.style.setProperty('--p','0%');return;}level.textContent=p.level||1;title.textContent=p.title||'Iniziato';meta.textContent=int(p.xp)+' XP · '+int(p.achievements_unlocked)+' badge';bar?.style.setProperty('--p',Math.max(0,Math.min(100,num(p.progress_percent)))+'%');}
function renderProgression(){
  const root=document.getElementById('v20ProgressionContent');if(!root)return;const p=state.progression?.progression||{},achievements=Array.isArray(state.progression?.achievements)?state.progression.achievements:[];
  const categories=['all','partite','vittorie','tecniche','boss_rush','tempo','roster','personaggi'];const labels={all:'Tutti',partite:'Partite',vittorie:'Vittorie',tecniche:'Tecniche',boss_rush:'Boss Rush',tempo:'Tempo',roster:'Roster',personaggi:'Personaggi'};
  const filtered=state.filter==='all'?achievements:achievements.filter(a=>a.category===state.filter);
  const achievementHtml=filtered.length?filtered.map(a=>{const pct=Math.min(100,a.threshold?100*num(a.progress)/num(a.threshold):0);return '<article class="v20-achievement '+(a.unlocked?'unlocked':'')+'" style="--p:'+pct+'"><div class="v20-achievement-icon">'+esc(a.icon||'✦')+'</div><div><div class="v20-achievement-name">'+esc(a.name)+'</div><div class="v20-achievement-desc">'+esc(a.description)+'</div><div class="v20-achievement-progress"><i></i></div><div class="v20-achievement-meta"><span>'+(a.unlocked?'Sbloccato '+formatDate(a.unlocked_at):int(a.progress)+' / '+int(a.threshold))+'</span><span>+'+int(a.xp_reward)+' XP</span></div></div></article>';}).join(''):'<div class="cloud-empty">Nessun achievement in questa categoria.</div>';
  const leaderboard=state.leaderboard.length?state.leaderboard.map((x,i)=>'<div class="v20-level-row '+(i<3?'top':'')+'"><div class="v20-level-rank">#'+int(x.rank||i+1)+'</div><div class="v20-level-player"><b>'+esc(x.player_name||'Giocatore')+'</b><small>'+esc(x.title||'Iniziato')+'</small></div><div class="v20-level-cell"><span>Livello</span><b>'+int(x.level)+'</b></div><div class="v20-level-cell"><span>XP</span><b>'+int(x.xp)+'</b></div><div class="v20-level-cell"><span>Badge</span><b>'+int(x.achievements)+'</b></div></div>').join(''):'<div class="cloud-empty">La classifica livelli apparirà dopo la prima progressione sincronizzata.</div>';
  root.innerHTML=
    '<div class="v20-level-hero"><div class="v20-level-orb" style="--p:'+num(p.progress_percent)+'"><div class="v20-level-orb-content"><span>Livello</span><b>'+int(p.level||1)+'</b><small>'+num(p.progress_percent).toFixed(1)+'%</small></div></div><div class="v20-level-copy"><div class="v20-level-kicker">Titolo account</div><h3>'+esc(p.title||'Iniziato')+'</h3><div class="v20-level-title">'+int(p.xp)+' XP complessivi</div><div class="v20-level-xp-row"><span>'+int(p.xp-num(p.level_start_xp))+' XP nel livello</span><span>'+(num(p.level)>=100?'Livello massimo':int(num(p.next_level_xp)-num(p.xp))+' XP al prossimo')+'</span></div><div class="v20-level-progress"><i style="--p:'+num(p.progress_percent)+'%"></i></div><div class="v20-level-metrics"><div class="v20-level-metric"><span>Partite</span><b>'+int(p.matches)+'</b></div><div class="v20-level-metric"><span>Vittorie</span><b>'+int(p.wins)+'</b></div><div class="v20-level-metric"><span>Tecniche</span><b>'+int(p.techniques_used)+'</b></div><div class="v20-level-metric"><span>Boss Rush</span><b>'+int(p.boss_rush_matches)+'</b></div><div class="v20-level-metric"><span>Tempo</span><b>'+formatTime(p.total_play_seconds)+'</b></div><div class="v20-level-metric"><span>Badge</span><b>'+int(p.achievements_unlocked)+' / '+int(p.achievements_total)+'</b></div></div></div></div>'+ 
    '<div class="v20-progress-toolbar"><h3>Achievement e badge</h3><div class="v20-achievement-filters">'+categories.map(c=>'<button class="v20-achievement-filter '+(state.filter===c?'active':'')+'" data-v20-achievement-filter="'+c+'">'+labels[c]+'</button>').join('')+'</div></div>'+ 
    '<div class="v20-achievement-grid">'+achievementHtml+'</div>'+ 
    '<div class="v20-progress-toolbar" style="margin-top:8px"><h3>Classifica livelli globale</h3><small>Livello, XP e badge sbloccati</small></div><div class="v20-level-leaderboard">'+leaderboard+'</div>';
  root.querySelectorAll('[data-v20-achievement-filter]').forEach(btn=>btn.addEventListener('click',()=>{state.filter=btn.dataset.v20AchievementFilter;localStorage.setItem(STORE.achievementFilter,state.filter);renderProgression();}));
}
function showNewAchievements(){const codes=Array.isArray(state.progression?.newly_unlocked)?state.progression.newly_unlocked:[];if(!codes.length)return;const achievements=state.progression?.achievements||[];codes.slice(0,3).forEach((code,i)=>{const a=achievements.find(x=>x.code===code);if(a)setTimeout(()=>achievementToast(a),i*450);});if(codes.length>3)setTimeout(()=>achievementToast({icon:'✦',name:'Altri achievement sbloccati',description:'Hai ottenuto altri '+(codes.length-3)+' badge.'}),1400);}
function achievementToast(a){const stack=document.getElementById('v20ToastStack');if(!stack)return;const el=document.createElement('article');el.className='v20-achievement-toast';el.innerHTML='<div class="v20-toast-icon">'+esc(a.icon||'✦')+'</div><div class="v20-toast-copy"><span>Achievement sbloccato</span><b>'+esc(a.name)+'</b><small>'+esc(a.description||'Nuovo badge ottenuto')+'</small></div>';stack.appendChild(el);window.JJKSfx?.play('confirm');setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),320);},4600);}

/* ---------------------------------------------------------
   ASSISTENTE EVENTI GAME MASTER
--------------------------------------------------------- */
const eventDeck=[
  {title:'Risonanza Maledetta',text:'Evento opzionale: ogni giocatore può scegliere se ottenere +1 EXP oppure recuperare 1 Energia. Il Game Master applica manualmente la scelta.',tags:['Gestione risorse','Scelta tattica']},
  {title:'Barriera Instabile',text:'Evento opzionale: per un giro completo, i giocatori non possono usare la tecnica di grado più alto già sbloccata.',tags:['Vincolo temporaneo','Un giro']},
  {title:'Eco del Dominio',text:'Evento opzionale: la prossima tecnica a costo 0 richiede comunque 2 Energia, salvo Boss Rush.',tags:['Costo speciale','Prossima tecnica']},
  {title:'Zona di Recupero',text:'Evento opzionale: il giocatore con meno Vita può recuperare 1 Vita rinunciando alla propria prossima azione offensiva.',tags:['Recupero','Rischio']},
  {title:'Tempesta di Energia',text:'Evento opzionale: tutti i giocatori ricevono +2 Energia, ma chi supera il massimo perde 1 Combattimento nel prossimo scontro.',tags:['Energia','Sovraccarico']},
  {title:'Marchio del Predatore',text:'Evento opzionale: il giocatore di turno sceglie un avversario. Se lo sconfigge prima del prossimo turno ottiene +2 EXP.',tags:['Obiettivo','PvP']},
  {title:'Silenzio delle Tecniche',text:'Evento opzionale: fino al prossimo giro, ogni personaggio può utilizzare una sola tecnica attiva.',tags:['Limitazione','Tattica']},
  {title:'Frattura dello Spazio',text:'Evento opzionale: il Game Master sposta l’ordine del prossimo turno di una posizione, mantenendo invariato il resto della sequenza.',tags:['Turni','Imprevisto']}
];
function injectEventLab(){const shell=document.querySelector('#gmViewAssistant .gm-ai-shell');if(!shell||document.getElementById('v20EventLab'))return;const details=shell.querySelector('.gm-ai-rules');const lab=document.createElement('section');lab.id='v20EventLab';lab.className='v20-event-lab';lab.innerHTML='<div class="v20-event-head"><div><div class="v20-event-kicker">Regia IA · eventi opzionali</div><h4>Generatore di eventi contestuali</h4><p>Propone variazioni coerenti con lo stato della partita. Non applica mai modifiche automatiche.</p></div><div class="v20-event-actions"><button class="v20-event-btn" data-v20-event-generate>✦ Nuovo evento</button><button class="v20-event-btn ghost" data-v20-event-copy>Copia</button></div></div><div id="v20EventCard" class="v20-event-card"></div><div class="v20-event-disclaimer">Suggerimento facoltativo: il regolamento originale resta sempre prioritario.</div>';shell.insertBefore(lab,details||null);lab.querySelector('[data-v20-event-generate]').addEventListener('click',()=>generateEvent(true));lab.querySelector('[data-v20-event-copy]').addEventListener('click',()=>copyEvent());generateEvent(false);}
function generateEvent(playSound=true){const s=room(),players=(s?.players||[]).filter(p=>!p.isHost),active=players.find(p=>!p.locked),alerts=window.JJKGMIntel?.getAlerts?.()||[];let event;
  if(active&&num(active.state?.life)<=1)event={title:'Ultima Scintilla di '+active.name,text:'Evento opzionale: '+active.name+' può recuperare 1 Vita, ma il suo prossimo turno inizia con -2 Energia.',tags:['Vita critica',characterName(active.characterId)]};
  else if(players.some(p=>p.bossRush))event={title:'Collasso della Boss Rush',text:'Evento opzionale: il giocatore in Boss Rush sceglie tra rinunciare a una tecnica in questo turno oppure dare +1 EXP a tutti gli avversari.',tags:['Boss Rush','Fase finale']};
  else if(alerts.some(a=>a.severity==='critical'))event={title:'Interferenza della Barriera',text:'Evento opzionale: prima di proseguire, risolvi l’avviso critico indicato dall’Assistente IA. Il giocatore attivo ottiene +1 EXP per l’attesa.',tags:['Controllo regole','Pausa tattica']};
  else if(active&&active.characterId==='geto')event={title:'Sciame di Maledizioni',text:'Evento opzionale: Geto può ottenere +2 Segnalini Maledetti, ma perde 1 Energia prima della prossima tecnica.',tags:['Geto','Segnalini']};
  else if(active&&active.characterId==='itadori')event={title:'Risonanza del Ricettacolo',text:'Evento opzionale: Itadori può guadagnare +1 Dito temporaneo per questo scontro, poi la rimuove a fine turno.',tags:['Itadori','Dita di Sukuna']};
  else event=eventDeck[Math.floor(Math.random()*eventDeck.length)];
  state.event=event;renderEvent();if(playSound)window.JJKSfx?.play('domain');}
function renderEvent(){const el=document.getElementById('v20EventCard');if(!el||!state.event)return;el.innerHTML='<b>'+esc(state.event.title)+'</b><p>'+esc(state.event.text)+'</p><div class="v20-event-tags">'+state.event.tags.map(t=>'<span class="v20-event-tag">'+esc(t)+'</span>').join('')+'</div>';}
async function copyEvent(){if(!state.event)return;const text=state.event.title+'\n'+state.event.text;try{await navigator.clipboard.writeText(text);window.showPlayerNotification?.('Evento copiato','Il testo è negli appunti.','#a56bff');}catch(e){prompt('Copia evento:',text);}}

/* ---------------------------------------------------------
   CINEMATIC DIRECTOR
--------------------------------------------------------- */
function installCinematicDirector(){if(window.playTechniqueEffect?.__v20)return;let base;try{base=playTechniqueEffect;}catch(e){base=window.playTechniqueEffect;}const wrapper=function(t){try{base?.(t);}catch(e){console.warn(e);}cinematicTechnique(t);};wrapper.__v20=true;setGlobalFunction('playTechniqueEffect',wrapper);}
function techniqueContext(t){const id=currentCharacterId()||'gojo';return {id,name:t?.name||'Tecnica',key:String(t?.key||'').toLowerCase(),color:colors[id]||'#6bcaff',glyph:glyphs[id]||'術'};}
function cinematicTechnique(t){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const ctx=techniqueContext(t);let overlay=document.getElementById('v20CinematicOverlay');if(!overlay){overlay=document.createElement('div');overlay.id='v20CinematicOverlay';document.body.appendChild(overlay);}overlay.style.setProperty('--c',ctx.color);overlay.className='show';overlay.innerHTML='<div class="v20-cinema-wash"></div><div class="v20-cinema-bar top"></div><div class="v20-cinema-bar bottom"></div><div class="v20-cinema-title"><span>'+esc(characterName(ctx.id))+'</span><b>'+esc(ctx.name)+'</b><small>'+esc(ctx.glyph)+' · ENERGIA MALEDETTA</small></div>';
  const add=(cls,style='')=>{const e=document.createElement('i');e.className=cls;if(style)e.style.cssText=style;overlay.appendChild(e);};
  if(ctx.id==='gojo')add('v20-cinema-orb');
  if(['sukuna','yuta'].includes(ctx.id)){for(let i=0;i<5;i++)add('v20-cinema-streak','--r:'+(-36+i*18)+'deg;--d:'+(i*.035)+'s');}
  if(ctx.id==='toji'){for(let i=0;i<8;i++)add('v20-cinema-crack','--r:'+(i*45-20)+'deg;--d:'+(i*.018)+'s');}
  if(ctx.id==='itadori'){add('v20-cinema-orb');for(let i=0;i<7;i++)add('v20-cinema-crack','--r:'+(i*51)+'deg;--d:'+(i*.02)+'s');}
  if(['megumi','geto','mahito','jogo'].includes(ctx.id)){for(let i=0;i<(isMobile()?8:15);i++)add('v20-cinema-particle','--x:'+(10+Math.random()*80)+'%;--y:'+(20+Math.random()*65)+'%;--dx:'+(Math.random()*380-190)+'px;--dy:'+(Math.random()*280-200)+'px;--d:'+(Math.random()*.14)+'s');}
  const sounds={gojo:'energy',sukuna:'slash',megumi:'shadow',geto:'dragon',mahito:'distort',jogo:'fire',toji:'impact',itadori:'impact',yuta:'slash'};window.JJKSfx?.play(sounds[ctx.id]||'technique');duckMusic();clearTimeout(cinematicTechnique.timer);cinematicTechnique.timer=setTimeout(()=>{overlay.className='';overlay.innerHTML='';},1100);}

/* ---------------------------------------------------------
   MUSICA DINAMICA ORIGINALE (Web Audio)
--------------------------------------------------------- */
const savedMusicVolume=localStorage.getItem(STORE.volume);
const music={ctx:null,master:null,current:null,enabled:localStorage.getItem(STORE.music)==='1',volume:Math.max(0,Math.min(1,num(savedMusicVolume===null ? .24 : savedMusicVolume))),theme:'',groups:[]};
const themeNotes={home:[55,82.4,110],statistics:[65.4,98,130.8],rooms:[58.3,87.3,116.5],selection:[61.7,92.5,123.5],game:[52,78,104],boss:[36.7,55,73.4],gojo:[73.4,146.8,220],megumi:[61.7,92.5,123.5],geto:[55,82.4,110],sukuna:[49,73.5,98],mahito:[46.2,69.3,92.5],jogo:[41.2,61.7,82.4],toji:[43.7,65.4,87.3],itadori:[52,78,104],yuta:[58.3,87.3,116.5]};
function ensureMusicContext(){if(music.ctx)return music.ctx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;music.ctx=new AC();music.master=music.ctx.createGain();music.master.gain.value=music.enabled?music.volume:0;music.master.connect(music.ctx.destination);return music.ctx;}
function createNoise(ctx){const len=ctx.sampleRate*2,buffer=ctx.createBuffer(1,len,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*.35;return buffer;}
function desiredMusicTheme(){const s=room();if((s?.players||[]).some(p=>p.bossRush)&&s?.phase==='playing')return 'boss';const screen=activeScreen();if(screen==='player')return currentCharacterId()||'game';if(screen==='gameMaster')return 'boss';if(screen==='statistics')return 'statistics';if(screen==='rooms'||screen==='roomCharacterSelect')return 'rooms';if(screen==='selection')return 'selection';return 'home';}
function startTheme(theme){if(!music.enabled)return;const ctx=ensureMusicContext();if(!ctx)return;if(ctx.state==='suspended')ctx.resume().catch(()=>{});if(music.theme===theme&&music.current)return;const notes=themeNotes[theme]||themeNotes.home;const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.085,ctx.currentTime+1.2);gain.connect(music.master);const nodes=[];
  notes.slice(0,2).forEach((freq,i)=>{const osc=ctx.createOscillator(),g=ctx.createGain(),filter=ctx.createBiquadFilter();osc.type=i?'triangle':'sine';osc.frequency.value=freq;filter.type='lowpass';filter.frequency.value=i?420:260;g.gain.value=i?.11:.18;osc.connect(filter).connect(g).connect(gain);osc.start();nodes.push(osc,g,filter);});
  const high=ctx.createOscillator(),hg=ctx.createGain(),lfo=ctx.createOscillator(),lfg=ctx.createGain();high.type='sine';high.frequency.value=notes[2];hg.gain.value=.035;lfo.frequency.value=.09;lfg.gain.value=.025;lfo.connect(lfg).connect(hg.gain);high.connect(hg).connect(gain);high.start();lfo.start();nodes.push(high,hg,lfo,lfg);
  const noise=ctx.createBufferSource(),ng=ctx.createGain(),nf=ctx.createBiquadFilter();noise.buffer=createNoise(ctx);noise.loop=true;nf.type='bandpass';nf.frequency.value=theme==='boss'?95:180;nf.Q.value=.55;ng.gain.value=theme==='boss'?.035:.018;noise.connect(nf).connect(ng).connect(gain);noise.start();nodes.push(noise,ng,nf);
  const old=music.current;music.current={theme,gain,nodes};music.theme=theme;music.groups.push(music.current);if(old){old.gain.gain.cancelScheduledValues(ctx.currentTime);old.gain.gain.setValueAtTime(Math.max(.0001,old.gain.gain.value),ctx.currentTime);old.gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+1.1);setTimeout(()=>stopGroup(old),1300);}updateMusicUi();}
function stopGroup(group){if(!group)return;group.nodes.forEach(n=>{try{if(typeof n.stop==='function')n.stop();}catch(e){}try{n.disconnect();}catch(e){}});try{group.gain.disconnect();}catch(e){}music.groups=music.groups.filter(x=>x!==group);if(music.current===group)music.current=null;}
function stopMusic(){music.groups.slice().forEach(stopGroup);music.theme='';}
function toggleMusic(){music.enabled=!music.enabled;localStorage.setItem(STORE.music,music.enabled?'1':'0');const ctx=ensureMusicContext();if(ctx&&ctx.state==='suspended')ctx.resume().catch(()=>{});if(music.enabled){if(ctx&&music.master){music.master.gain.cancelScheduledValues(ctx.currentTime);music.master.gain.linearRampToValueAtTime(music.volume,ctx.currentTime+.35);startTheme(desiredMusicTheme());document.getElementById('v20MusicPanel')?.classList.add('show');}else{music.enabled=false;localStorage.setItem(STORE.music,'0');}}else{if(ctx&&music.master){music.master.gain.cancelScheduledValues(ctx.currentTime);music.master.gain.linearRampToValueAtTime(0,ctx.currentTime+.3);}setTimeout(stopMusic,380);}updateMusicUi();window.JJKSfx?.play('toggle');}
function setMusicVolume(value,persist=false){music.volume=Math.max(0,Math.min(1,value));if(persist)localStorage.setItem(STORE.volume,String(music.volume));if(music.master&&music.enabled)music.master.gain.setTargetAtTime(music.volume,music.ctx.currentTime,.08);['v20MusicVolume','v20MusicVolumeMini'].forEach(id=>{const e=document.getElementById(id);if(e&&document.activeElement!==e)e.value=Math.round(music.volume*100);});}
function updateMusicUi(){const btn=document.getElementById('v20MusicToggle');btn?.classList.toggle('music-on',music.enabled);btn?.setAttribute('aria-label',music.enabled?'Disattiva musica dinamica':'Attiva musica dinamica');setMusicVolume(music.volume,false);}
function duckMusic(){if(!music.enabled||!music.master||!music.ctx)return;const now=music.ctx.currentTime;music.master.gain.cancelScheduledValues(now);music.master.gain.setTargetAtTime(music.volume*.35,now,.03);music.master.gain.setTargetAtTime(music.volume,now+.65,.18);}
function monitorMusic(){if(!music.enabled)return;const theme=desiredMusicTheme();if(theme!==music.theme)startTheme(theme);}

/* ---------------------------------------------------------
   PAGE LIFE / LIVE ANIMATIONS
--------------------------------------------------------- */
function installScreenTransitions(){let base=window.showScreen;try{base=showScreen;}catch(e){}if(typeof base!=='function'||base.__v20)return;const wrapped=function(id){const out=base.apply(this,arguments);requestAnimationFrame(()=>{const el=document.getElementById(id);if(el&&!document.documentElement.classList.contains('v34-no-motion')){el.classList.remove('v20-entering');void el.offsetWidth;el.classList.add('v20-entering');setTimeout(()=>el.classList.remove('v20-entering'),520);}monitorMusic();});return out;};wrapped.__v20=true;setGlobalFunction('showScreen',wrapped);}
function installPointerLife(){let raf=0;document.addEventListener('pointermove',e=>{if(raf||document.documentElement.classList.contains('v34-no-motion'))return;raf=requestAnimationFrame(()=>{if(!document.documentElement.classList.contains('v34-no-motion')){document.body.style.setProperty('--v20-pointer-x',(100*e.clientX/innerWidth).toFixed(1)+'%');document.body.style.setProperty('--v20-pointer-y',(100*e.clientY/innerHeight).toFixed(1)+'%');}raf=0;});},{passive:true});document.addEventListener('jjk:cloudstats',()=>{document.querySelectorAll('.cloud-kpi-value').forEach((el,i)=>setTimeout(()=>{if(document.documentElement.classList.contains('v34-no-motion'))return;el.classList.remove('v20-number-pop');void el.offsetWidth;el.classList.add('v20-number-pop');},i*45));loadProgression(true);});}
function addUpdateCard(){const wrap=document.querySelector('#updates .updates-wrap');if(!wrap||wrap.querySelector('[data-v20-update]'))return;const card=document.createElement('div');card.className='updates-card';card.dataset.v20Update='1';card.innerHTML='<div class="update-version">V2.0 Ascension</div><h3>Livelli account, achievement e regia cinematica</h3><p>Aggiunti progressione cloud, badge, classifica livelli, menu Dominio animato, musica dinamica originale, effetti tecnici cinematici e generatore di eventi contestuali per il Game Master.</p>';const first=wrap.querySelector('.updates-card');wrap.insertBefore(card,first||null);}

function init(){injectDomainMenu();injectAccountHud();injectProgressionPanel();injectEventLab();installCinematicDirector();installScreenTransitions();installPointerLife();addUpdateCard();updateMusicUi();document.body.classList.add('v20-ready');setMusicVolume(music.volume,false);setTimeout(()=>loadProgression(true),1600);setInterval(monitorMusic,1200);document.addEventListener('pointerdown',()=>{if(music.enabled){const ctx=ensureMusicContext();ctx?.resume().then(()=>startTheme(desiredMusicTheme())).catch(()=>{});}},{once:true,capture:true});console.info('JJK Energy Ascension Edition ready',VERSION);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.JJKV20={
  version:VERSION,
  openMenu:openDomainMenu,
  loadProgression,
  getProgression:()=>state.progression,
  generateEvent:()=>generateEvent(true),
  toggleMusic,
  setMusicEnabled(value){if(!!value!==music.enabled)toggleMusic();},
  isMusicEnabled:()=>music.enabled,
  setMusicVolume(value){setMusicVolume(value,true);},
  getMusicVolume:()=>music.volume
};
})();
