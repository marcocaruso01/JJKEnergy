/* JJK Energy V36.1 - Classifica, Trofei e Profili Pubblici */
(function(){
'use strict';

const VERSION='36.1.0';
const state={leaderboard:[],progression:null,personal:null,activeExtra:null,trophyFilter:'unlocked',bound:false,observer:null,annotateTimer:null};

function esc(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function num(value){const n=Number(value);return Number.isFinite(n)?n:0;}
function int(value){return Math.round(num(value)).toLocaleString('it-IT');}
function clamp(value,min,max){return Math.max(min,Math.min(max,num(value)));}
function fmtDuration(seconds){const total=Math.max(0,Math.floor(num(seconds))),h=Math.floor(total/3600),m=Math.floor((total%3600)/60);if(h)return h+'h '+String(m).padStart(2,'0')+'m';if(m)return m+'m';return total+'s';}
function fmtDate(value){if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',year:'numeric'}).format(d);}
function getCharacters(){try{const local=eval('characters');return local||window.characters||{};}catch(_){return window.characters||{};}}
function characterName(id){const c=getCharacters()[id];return c?.name||id||'—';}
function characterImage(id){return getCharacters()[id]?.image||'';}
function cloudState(){return window.JJKV36?.state||{};}

async function cloudReady(){if(window.jjkEnsureCloudReady)await window.jjkEnsureCloudReady();if(!window.jjkSupabase&&window.JJKAccount?.getClient)window.jjkSupabase=window.JJKAccount.getClient();if(!window.jjkSupabase)throw new Error('Connessione Supabase non disponibile.');return window.jjkSupabase;}
async function rpc(name,args={}){if(window.jjkCloudRpc)return window.jjkCloudRpc(name,args);const client=await cloudReady();const {data,error}=await client.rpc(name,args);if(error)throw error;if(typeof data==='string'){try{return JSON.parse(data);}catch(_){return data;}}return data;}
function migrationMessage(error){const text=String(error?.message||error||'');if(/jjk_public_player_profile_v361|schema cache|function .* does not exist/i.test(text))return '<div class="v361-warning"><b>Aggiornamento Supabase richiesto</b><span>Esegui il file <code>JJK_Supabase_Passo_11_V36_1_Classifica_Profili.sql</code> nel SQL Editor.</span></div>';return '<div class="v361-error">'+esc(text)+'</div>';}

function ensureUi(){
  const shell=document.getElementById('v36StatsShell');
  const nav=shell?.querySelector('.v36-stats-nav');
  if(!shell||!nav)return false;
  if(!nav.querySelector('[data-v361-view="ranking"]')){
    const profileButton=nav.querySelector('[data-v36-stats="profile"]');
    const ranking=document.createElement('button');
    ranking.type='button';ranking.dataset.v361View='ranking';
    ranking.innerHTML='<span>冠</span><b>Classifica</b><small>Livelli e profili pubblici</small>';
    const trophies=document.createElement('button');
    trophies.type='button';trophies.dataset.v361View='trophies';
    trophies.innerHTML='<span>🏆</span><b>Trofei</b><small>Badge raggiunti e progressi</small>';
    nav.insertBefore(ranking,profileButton||null);
    nav.insertBefore(trophies,profileButton||null);
  }
  if(!document.getElementById('v361StatsRanking')){
    const ranking=document.createElement('div');ranking.id='v361StatsRanking';ranking.className='v36-stats-panel v361-extra-panel';
    const trophies=document.createElement('div');trophies.id='v361StatsTrophies';trophies.className='v36-stats-panel v361-extra-panel';
    shell.append(ranking,trophies);
  }
  const intro=shell.querySelector('.v36-stats-intro p');
  const introCopy='Panoramica, partite live, storico, classifica, trofei e profili pubblici degli Stregoni.';
  if(intro&&intro.textContent!==introCopy)intro.textContent=introCopy;
  ensureProfileModal();
  return true;
}

function ensureProfileModal(){
  if(document.getElementById('v361PublicProfileModal'))return;
  const modal=document.createElement('div');
  modal.id='v361PublicProfileModal';modal.className='v36-modal v361-profile-modal';
  modal.innerHTML='<section class="v36-modal-shell v361-profile-shell"><header><div><small>PROFILO PUBBLICO STREGONE</small><h2 id="v361ProfileTitle">Caricamento…</h2><p id="v361ProfileSubtitle">Statistiche in sola lettura</p></div><button type="button" data-v361-close-profile>✕</button></header><div id="v361ProfileContent" class="v361-profile-content"><div class="v361-loading">Recupero del profilo…</div></div><footer>Profilo ospite · nessun dato privato viene mostrato.</footer></section>';
  document.body.appendChild(modal);
}

function deactivateExtra(){
  state.activeExtra=null;
  document.querySelectorAll('[data-v361-view]').forEach(button=>button.classList.remove('active'));
  document.querySelectorAll('.v361-extra-panel').forEach(panel=>panel.classList.remove('active'));
}
function openExtra(view){
  if(!ensureUi())return;
  state.activeExtra=view;
  document.querySelectorAll('.v36-stats-nav button').forEach(button=>button.classList.toggle('active',button.dataset.v361View===view));
  document.querySelectorAll('#v36StatsShell .v36-stats-panel').forEach(panel=>panel.classList.remove('active'));
  const panel=document.getElementById(view==='ranking'?'v361StatsRanking':'v361StatsTrophies');
  panel?.classList.add('active');
  localStorage.setItem('jjk_v361_extra_view',view);
  if(view==='ranking')loadLeaderboard();else loadTrophies();
}

function playerAttrs(player){
  const uid=player?.user_id||'';
  const tag=player?.account_tag||'';
  if(!uid&&!tag)return '';
  return ' data-v361-player="1" data-v361-user-id="'+esc(uid)+'" data-v361-account-tag="'+esc(tag)+'"';
}

function renderLeaderboard(){
  const root=document.getElementById('v361StatsRanking');if(!root)return;
  const rows=Array.isArray(state.leaderboard)?state.leaderboard:[];
  if(!rows.length){root.innerHTML='<div class="v36-empty">La classifica si popolerà dopo le prime partite concluse.</div>';return;}
  const podiumOrder=rows.length>=3?[rows[1],rows[0],rows[2]]:rows;
  const podium=podiumOrder.map(player=>'<button type="button" class="v361-podium-card rank-'+int(player.rank)+'"'+playerAttrs(player)+'><span class="v361-rank-medal">'+(num(player.rank)===1?'♛':num(player.rank)===2?'◆':'▲')+'</span><span class="v361-player-avatar">'+esc((player.account_tag||player.player_name||'?').slice(0,1).toUpperCase())+'</span><b>@'+esc(player.account_tag||player.player_name||'giocatore')+'</b><small>'+esc(player.title||'Iniziato')+'</small><strong>Livello '+int(player.level)+'</strong><em>'+int(player.xp)+' XP · '+int(player.achievements)+' trofei</em><i>Apri profilo</i></button>').join('');
  const table=rows.map(player=>'<button type="button" class="v361-ranking-row"'+playerAttrs(player)+'><span class="v361-ranking-rank">#'+int(player.rank)+'</span><span class="v361-ranking-name"><b>@'+esc(player.account_tag||player.player_name||'giocatore')+'</b><small>'+esc(player.title||'Iniziato')+'</small></span><span><small>Livello</small><b>'+int(player.level)+'</b></span><span><small>XP</small><b>'+int(player.xp)+'</b></span><span><small>Trofei</small><b>'+int(player.achievements)+'</b></span><span><small>Vittorie</small><b>'+int(player.wins)+'</b></span><span><small>Tempo</small><b>'+fmtDuration(player.total_play_seconds)+'</b></span><i>Vedi profilo ›</i></button>').join('');
  root.innerHTML='<section class="v36-section v361-ranking-section"><header><div><small>HALL OF FAME</small><h3>Classifica globale degli Stregoni</h3><p>Clicca un giocatore per visitare il suo profilo pubblico, vedere livello, trofei, tempo di gioco e tecniche preferite.</p></div><button type="button" data-v361-refresh-ranking>↻ Aggiorna</button></header><div class="v361-podium">'+podium+'</div><div class="v361-ranking-list">'+table+'</div></section>';
}

async function loadLeaderboard(){
  const root=document.getElementById('v361StatsRanking');if(root)root.innerHTML='<div class="v361-loading">Caricamento classifica…</div>';
  try{const data=await rpc('jjk_global_level_leaderboard',{p_limit:100});state.leaderboard=Array.isArray(data)?data:[];renderLeaderboard();}
  catch(error){if(root)root.innerHTML=migrationMessage(error);}
}

function trophyCard(achievement){
  const unlocked=!!achievement.unlocked;
  const progress=num(achievement.progress),threshold=Math.max(1,num(achievement.threshold)),pct=clamp(100*progress/threshold,0,100);
  return '<article class="v361-trophy '+(unlocked?'unlocked':'locked')+'"><div class="v361-trophy-icon">'+esc(achievement.icon||'✦')+'</div><div><span>'+(unlocked?'TROFEO SBLOCCATO':'IN PROGRESSO')+'</span><h4>'+esc(achievement.name||'Trofeo')+'</h4><p>'+esc(achievement.description||'')+'</p><div class="v361-trophy-progress"><i style="--p:'+pct+'%"></i></div><small>'+(unlocked?'Ottenuto '+fmtDate(achievement.unlocked_at):int(progress)+' / '+int(threshold))+' · +'+int(achievement.xp_reward)+' XP</small></div></article>';
}

function renderTrophies(){
  const root=document.getElementById('v361StatsTrophies');if(!root)return;
  const p=state.progression?.progression||{};
  const achievements=Array.isArray(state.progression?.achievements)?state.progression.achievements:[];
  const personal=state.personal||{};
  const techs=Array.isArray(personal.top_techniques)?personal.top_techniques:[];
  const visible=state.trophyFilter==='all'?achievements:achievements.filter(item=>item.unlocked);
  root.innerHTML='<section class="v361-my-hero"><div class="v361-level-orb"><span>LV</span><b>'+int(p.level||1)+'</b><small>'+clamp(p.progress_percent,0,100).toFixed(1)+'%</small></div><div><small>PROGRESSIONE PERSONALE</small><h2>'+esc(p.title||'Iniziato')+'</h2><p>'+int(p.xp)+' XP complessivi</p><div class="v361-level-progress"><i style="--p:'+clamp(p.progress_percent,0,100)+'%"></i></div><div class="v361-my-kpis">'+[['Partite',p.matches],['Vittorie',p.wins],['Tempo',fmtDuration(p.total_play_seconds)],['Tecniche',p.techniques_used],['Boss Rush',p.boss_rush_matches],['Trofei',int(p.achievements_unlocked)+' / '+int(p.achievements_total)]].map(([label,value])=>'<span><small>'+label+'</small><b>'+esc(value??0)+'</b></span>').join('')+'</div></div></section><section class="v36-section"><header><div><small>BACHECA TROFEI</small><h3>Tutti i tuoi traguardi</h3><p>Visualizza i trofei raggiunti e quanto manca ai prossimi.</p></div><div class="v361-trophy-filters"><button type="button" data-v361-trophy-filter="unlocked" class="'+(state.trophyFilter==='unlocked'?'active':'')+'">Sbloccati</button><button type="button" data-v361-trophy-filter="all" class="'+(state.trophyFilter==='all'?'active':'')+'">Tutti</button></div></header><div class="v361-trophy-grid">'+(visible.length?visible.map(trophyCard).join(''):'<div class="v36-empty">Non hai ancora sbloccato trofei.</div>')+'</div></section><section class="v36-section"><header><div><small>STILE DI GIOCO</small><h3>Tecniche più utilizzate</h3></div></header><div class="v361-tech-ranking">'+(techs.length?techs.slice(0,10).map((tech,index)=>'<div><b>#'+(index+1)+'</b><span>'+esc(tech.technique_name||'Tecnica')+'<small>'+esc(characterName(tech.character_id))+'</small></span><strong>'+int(tech.uses)+' usi</strong></div>').join(''):'<div class="v36-empty">Le tecniche compariranno dopo le prime partite registrate.</div>')+'</div></section>';
}

async function loadTrophies(){
  const root=document.getElementById('v361StatsTrophies');if(root)root.innerHTML='<div class="v361-loading">Caricamento trofei…</div>';
  try{const [progression,personal]=await Promise.all([rpc('jjk_my_progression'),rpc('jjk_my_statistics')]);state.progression=progression||{};state.personal=personal||{};renderTrophies();}
  catch(error){if(root)root.innerHTML='<div class="v361-error">'+esc(error?.message||error)+'</div>';}
}

function renderPublicProfile(data){
  const root=document.getElementById('v361ProfileContent');if(!root)return;
  const account=data?.account||{},p=data?.progression||{},achievements=Array.isArray(data?.achievements)?data.achievements:[],techs=Array.isArray(data?.top_techniques)?data.top_techniques:[],favorites=Array.isArray(data?.favorite_characters)?data.favorite_characters:[],recent=Array.isArray(data?.recent_matches)?data.recent_matches:[];
  document.getElementById('v361ProfileTitle').textContent='@'+(account.account_tag||account.display_name||'giocatore');
  document.getElementById('v361ProfileSubtitle').textContent=(p.title||'Iniziato')+' · Profilo pubblico in sola lettura';
  const winRate=num(p.total_matches)?100*num(p.wins)/num(p.total_matches):0;
  root.innerHTML='<section class="v361-public-hero"><span class="v361-public-avatar">'+esc((account.account_tag||account.display_name||'?').slice(0,1).toUpperCase())+'</span><div><small>STREGONE REGISTRATO</small><h2>@'+esc(account.account_tag||account.display_name||'giocatore')+'</h2><p>'+esc(p.title||'Iniziato')+' · dal '+fmtDate(account.registered_at)+'</p></div><strong>LV '+int(p.level||1)+'</strong></section><section class="v361-public-kpis">'+[['XP',p.xp],['Partite',p.total_matches],['Vittorie',p.wins],['Win rate',winRate.toFixed(1)+'%'],['Tempo di gioco',fmtDuration(p.total_play_seconds)],['Trofei',p.achievements_unlocked]].map(([label,value])=>'<article><small>'+label+'</small><b>'+esc(value??0)+'</b></article>').join('')+'</section><div class="v361-public-columns"><section class="v36-section"><header><div><small>TROFEI RAGGIUNTI</small><h3>Bacheca pubblica</h3></div></header><div class="v361-public-trophies">'+(achievements.length?achievements.map(a=>'<article><i>'+esc(a.icon||'✦')+'</i><span><b>'+esc(a.name)+'</b><small>'+esc(a.description||'')+' · '+fmtDate(a.unlocked_at)+'</small></span></article>').join(''):'<div class="v36-empty">Nessun trofeo sbloccato.</div>')+'</div></section><section class="v36-section"><header><div><small>TECNICHE PREFERITE</small><h3>Più utilizzate</h3></div></header><div class="v361-tech-ranking">'+(techs.length?techs.map((tech,index)=>'<div><b>#'+(index+1)+'</b><span>'+esc(tech.technique_name||'Tecnica')+'<small>'+esc(characterName(tech.character_id))+'</small></span><strong>'+int(tech.uses)+' usi</strong></div>').join(''):'<div class="v36-empty">Nessuna tecnica registrata.</div>')+'</div></section></div><section class="v36-section"><header><div><small>PERSONAGGI PIÙ GIOCATI</small><h3>Roster personale</h3></div></header><div class="v361-favorite-grid">'+(favorites.length?favorites.map(f=>'<article><img src="'+esc(characterImage(f.character_id))+'" alt=""><span><b>'+esc(characterName(f.character_id))+'</b><small>'+int(f.matches)+' partite · '+int(f.wins)+' vittorie</small></span></article>').join(''):'<div class="v36-empty">Nessun personaggio registrato.</div>')+'</div></section>'+(recent.length?'<section class="v36-section"><header><div><small>ULTIME PARTITE</small><h3>Attività recente</h3></div></header><div class="v361-recent-grid">'+recent.map(m=>'<article class="'+(m.is_winner?'winner':'')+'"><img src="'+esc(characterImage(m.character_id))+'" alt=""><span><b>'+esc(characterName(m.character_id))+'</b><small>'+(m.is_winner?'Vittoria':'Partecipazione')+' · '+fmtDate(m.ended_at)+'</small></span><strong>'+fmtDuration(m.duration_seconds)+'</strong></article>').join('')+'</div></section>':'');
}

async function openPublicProfile(userId='',accountTag=''){
  ensureProfileModal();
  const modal=document.getElementById('v361PublicProfileModal'),root=document.getElementById('v361ProfileContent');
  modal?.classList.add('show');
  document.getElementById('v361ProfileTitle').textContent='Caricamento…';
  document.getElementById('v361ProfileSubtitle').textContent='Recupero statistiche pubbliche';
  if(root)root.innerHTML='<div class="v361-loading">Apertura profilo ospite…</div>';
  try{const data=await rpc('jjk_public_player_profile_v361',{p_user_id:userId||null,p_account_tag:accountTag||null});renderPublicProfile(data||{});}
  catch(error){if(root)root.innerHTML=migrationMessage(error);}
}
function closePublicProfile(){document.getElementById('v361PublicProfileModal')?.classList.remove('show');}

function annotatePlayers(){
  const cloud=cloudState();
  document.querySelectorAll('#v36OnlineList .v36-online-grid article').forEach((card,index)=>{const player=cloud.online?.[index];if(!player)return;card.dataset.v361Player='1';card.dataset.v361UserId=player.user_id||'';card.dataset.v361AccountTag=player.account_tag||'';card.classList.add('v361-clickable-player');card.title='Apri il profilo pubblico';});
  document.querySelectorAll('#v36StatsHistory .v36-history-card').forEach((card,matchIndex)=>{const participants=cloud.history?.[matchIndex]?.participants||[];card.querySelectorAll('.v36-history-players>div').forEach((entry,index)=>{const player=participants[index];if(!player)return;entry.dataset.v361Player='1';entry.dataset.v361UserId=player.user_id||'';entry.dataset.v361AccountTag=player.account_tag||'';entry.classList.add('v361-clickable-player');entry.title='Apri il profilo pubblico';});});
  document.querySelectorAll('#v36StatsLive .v36-live-card').forEach((card,matchIndex)=>{const participants=cloud.live?.[matchIndex]?.participants||[];card.querySelectorAll('.v36-live-roster>span').forEach((entry,index)=>{const player=participants[index];if(!player)return;entry.dataset.v361Player='1';entry.dataset.v361UserId=player.user_id||'';entry.dataset.v361AccountTag=player.account_tag||'';entry.classList.add('v361-clickable-player');entry.title='Apri il profilo pubblico';});});
}
function scheduleAnnotate(){clearTimeout(state.annotateTimer);state.annotateTimer=setTimeout(()=>{ensureUi();annotatePlayers();},80);}

function bind(){
  if(state.bound)return;state.bound=true;
  document.addEventListener('click',event=>{
    const extra=event.target.closest('[data-v361-view]');if(extra){event.preventDefault();openExtra(extra.dataset.v361View);return;}
    if(event.target.closest('[data-v36-stats]')){deactivateExtra();return;}
    if(event.target.closest('[data-v361-close-profile]')){closePublicProfile();return;}
    if(event.target.closest('[data-v361-refresh-ranking]')){loadLeaderboard();return;}
    const filter=event.target.closest('[data-v361-trophy-filter]');if(filter){state.trophyFilter=filter.dataset.v361TrophyFilter;renderTrophies();return;}
    const player=event.target.closest('[data-v361-player]');if(player){openPublicProfile(player.dataset.v361UserId||'',player.dataset.v361AccountTag||'');return;}
    if(event.target.id==='v361PublicProfileModal')closePublicProfile();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closePublicProfile();});
  document.addEventListener('jjk:cloudstats',scheduleAnnotate);
  window.addEventListener('jjk-account-ready',scheduleAnnotate);
  state.observer=new MutationObserver(scheduleAnnotate);
  state.observer.observe(document.body,{childList:true,subtree:true});
}

function init(){
  bind();
  const timer=setInterval(()=>{if(ensureUi()){clearInterval(timer);scheduleAnnotate();}},120);
  setTimeout(()=>clearInterval(timer),15000);
  console.info('JJK Energy V36.1 public profiles ready',VERSION);
}

window.JJKV361={version:VERSION,state,openProfile:openPublicProfile,openLeaderboard:()=>openExtra('ranking'),openTrophies:()=>openExtra('trophies')};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
