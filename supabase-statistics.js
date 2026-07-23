/* JJK Energy - Global Statistics & Analytics (Supabase) */
(function(){
'use strict';

const CLOUD_STATS_VERSION='g2';
const state={
  global:null,
  personal:null,
  live:[],
  recent:[],
  selectedCharacter:null,
  loading:false,
  lastLoadedAt:0,
  realtime:null,
  refreshTimer:null,
  liveTimer:null,
  analyticsTail:Promise.resolve(),
  actionDepth:0
};
window.jjkCloudStatsState=state;

function normalize(value){
  if(typeof value==='string'){try{return JSON.parse(value);}catch(e){return value;}}
  return value;
}
function esc(value){
  if(typeof window.escapeHtml==='function')return window.escapeHtml(value??'');
  return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function num(value){const n=Number(value);return Number.isFinite(n)?n:0;}
function integer(value){return Math.round(num(value)).toLocaleString('it-IT');}
function formatSeconds(seconds){
  const total=Math.max(0,Math.floor(num(seconds))),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
  if(h)return h+'h '+String(m).padStart(2,'0')+'m';
  if(m)return m+'m '+String(s).padStart(2,'0')+'s';
  return s+'s';
}
function formatDate(value,withTime=true){
  if(!value)return '—';const d=new Date(value);if(Number.isNaN(d.getTime()))return '—';
  return new Intl.DateTimeFormat('it-IT',withTime?{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}:{day:'2-digit',month:'short'}).format(d);
}
function currentSession(){try{return roomSession||window.roomSession||null;}catch(e){return window.roomSession||null;}}
function localPlayer(){try{return typeof getLocalRoomPlayer==='function'?getLocalRoomPlayer():null;}catch(e){return null;}}
function currentCharacter(){try{return currentId||window.currentId||null;}catch(e){return window.currentId||null;}}
function currentGradeId(){try{return gradeId||'G4';}catch(e){return 'G4';}}
function currentClientKind(){return document.documentElement.classList.contains('mobile')||/Mobile|iPhone|Android/i.test(navigator.userAgent)?'mobile':'desktop';}
function getCharacters(){try{return characters;}catch(e){return window.characters||{};}}
function characterName(id){try{return characterDisplayName(id);}catch(e){return id||'—';}}
function characterColor(id){try{return uiCharacterMeta(id)?.color||'#54bfff';}catch(e){return '#54bfff';}}
function characterImage(id){try{return characters[id]?.image||'';}catch(e){return '';}}

async function waitForCloud(timeout=12000){
  if(typeof window.jjkEnsureCloudReady==='function'){
    await window.jjkEnsureCloudReady();
  }
  const start=Date.now();
  while((!window.jjkSupabase||!window.jjkSupabaseUser)&&Date.now()-start<timeout){await new Promise(r=>setTimeout(r,80));}
  if(!window.jjkSupabase||!window.jjkSupabaseUser)throw new Error('Connessione Supabase non disponibile. Ricarica la pagina e riprova.');
  return window.jjkSupabase;
}
async function rpc(name,args={}){
  const client=await waitForCloud();
  const {data,error}=await client.rpc(name,args);
  if(error)throw error;
  return normalize(data);
}
function cloudContext(){
  const session=currentSession(),me=localPlayer();
  if(!session?.roomId||session.phase!=='playing'||session.isHost||!me||me.isHost||me.locked)return null;
  return {session,me,characterId:currentCharacter()||me.characterId};
}
function enqueueAnalytics(task){
  state.analyticsTail=state.analyticsTail.then(async()=>{try{return await task();}catch(error){console.warn('[JJK analytics]',error?.message||error);}});
  return state.analyticsTail;
}
window.jjkFlushAnalytics=function(){return state.analyticsTail.catch(()=>{});};

function setStatus(title,text='',mode=''){
  const el=document.getElementById('cloudStatsStatus');if(!el)return;
  el.className='cloud-stats-status '+mode;
  el.innerHTML='<strong>'+esc(title)+'</strong>'+esc(text);
}
function activeStatsScreen(){return document.getElementById('statistics')?.classList.contains('active');}

function validCloudStatsView(view){return ['overview','charts','ranking','characters','profile','archive'].includes(view)?view:'overview';}
window.setCloudStatsView=function(view,scroll=true){
  const target=validCloudStatsView(view);
  document.querySelectorAll('.cloud-stats-tab').forEach(btn=>btn.classList.toggle('active',btn.dataset.cloudView===target));
  document.querySelectorAll('.cloud-stats-view').forEach(panel=>panel.classList.toggle('active',panel.dataset.cloudViewPanel===target));
  localStorage.setItem('jjk_cloud_stats_view',target);
  if(scroll){const nav=document.querySelector('.cloud-stats-nav');nav?.scrollIntoView({behavior:'smooth',block:'start'});}
};

async function loadCloudStatistics(options={}){
  if(state.loading)return;
  state.loading=true;
  const refresh=document.getElementById('cloudStatsRefresh');if(refresh)refresh.disabled=true;
  if(!options.silent)setStatus('Aggiornamento in corso','Sincronizzazione con Supabase…','loading');
  try{
    const [globalData,personalData,liveData,recentData]=await Promise.all([
      rpc('jjk_global_statistics'),
      rpc('jjk_my_statistics'),
      rpc('jjk_public_live_matches'),
      rpc('jjk_public_recent_matches',{p_limit:30})
    ]);
    state.global=globalData||{};
    state.personal=personalData||{};
    state.live=Array.isArray(liveData)?liveData:[];
    state.recent=Array.isArray(recentData)?recentData:[];
    state.lastLoadedAt=Date.now();
    if(!state.selectedCharacter){
      state.selectedCharacter=state.global?.characters?.[0]?.character_id||Object.keys(getCharacters())[0]||null;
    }
    renderAllCloudStats();
    setStatus('Dati globali sincronizzati','Ultimo aggiornamento: '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}));
    setupRealtime();
  }catch(error){
    console.error('Statistiche globali:',error);
    setStatus('Statistiche non disponibili',String(error?.message||error),'error');
    renderStatsError(error);
  }finally{
    state.loading=false;if(refresh)refresh.disabled=false;
  }
}
window.refreshCloudStatistics=function(){return loadCloudStatistics({silent:false});};
window.openStatistics=function(){
  try{showScreen('statistics');}catch(e){}
  window.setCloudStatsView(localStorage.getItem('jjk_cloud_stats_view')||'overview',false);
  loadCloudStatistics({silent:false});
};
window.renderStatistics=function(){
  if(state.global)renderAllCloudStats();else loadCloudStatistics({silent:false});
};

function setupRealtime(){
  if(state.realtime||!window.jjkSupabase)return;
  const client=window.jjkSupabase;
  state.realtime=client.channel('jjk-global-stats-'+Math.random().toString(36).slice(2,8))
    .on('postgres_changes',{event:'*',schema:'public',table:'global_stats_pulse',filter:'id=eq.1'},()=>scheduleStatsReload())
    .subscribe();
  clearInterval(state.liveTimer);
  state.liveTimer=setInterval(()=>{
    if(activeStatsScreen())loadLiveOnly();
  },15000);
}
function scheduleStatsReload(){
  clearTimeout(state.refreshTimer);
  const elapsed=Date.now()-state.lastLoadedAt;
  const delay=Math.max(450,3000-elapsed);
  state.refreshTimer=setTimeout(()=>{if(activeStatsScreen())loadCloudStatistics({silent:true});},delay);
}
async function loadLiveOnly(){
  try{const live=await rpc('jjk_public_live_matches');state.live=Array.isArray(live)?live:[];renderLiveMatches();renderTotals();renderWorldPulse();}catch(e){console.warn(e);}
}

function renderStatsError(error){
  const ids=['cloudLiveMatches','cloudCharacterChart','cloudWinRateChart','cloudTechniqueChart','cloudResourceChart','cloudMatchesTrend','cloudHallOfFame','cloudRecentMatches','cloudCharacterDetail','cloudPersonalRecent','cloudPersonalTechniques'];
  ids.forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='<div class="cloud-error-box">'+esc(error?.message||error||'Impossibile caricare i dati.')+'</div>';});
}
function renderAllCloudStats(){
  renderTotals();renderWorldPulse();renderLiveMatches();renderCharts();renderHallOfFame();renderPersonal();renderCharacterPicker();renderCharacterDetail();renderRecentMatches();
  try{document.dispatchEvent(new CustomEvent('jjk:cloudstats',{detail:state}));}catch(e){}
}
function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}
function renderTotals(){
  const t=state.global?.totals||{};
  setText('cloudMatchesPlayed',integer(t.matches_played));
  setText('cloudUniquePlayers',integer(t.unique_players));
  setText('cloudActiveMatches',integer(state.live.length||t.active_matches));
  setText('cloudOnlinePlayers',integer(t.online_players));
  setText('cloudTechniquesUsed',integer(t.techniques_used));
  setText('cloudAverageDuration',formatSeconds(t.average_duration_seconds));
  setText('cloudBossRushMatches',integer(t.boss_rush_matches));
  setText('cloudTotalPlayTime',formatSeconds(t.total_play_seconds));
  setText('cloudLiveCount',state.live.length+' '+(state.live.length===1?'partita':'partite'));
}
function renderWorldPulse(){
  const topPlayers=Array.isArray(state.global?.top_players)?state.global.top_players:[];
  const chars=Array.isArray(state.global?.characters)?state.global.characters:[];
  const techs=Array.isArray(state.global?.techniques)?state.global.techniques:[];
  const champion=topPlayers[0]||null;
  const topCharacter=chars.slice().sort((a,b)=>num(b.selections)-num(a.selections))[0]||null;
  const topTechnique=techs.slice().sort((a,b)=>num(b.uses)-num(a.uses))[0]||null;
  setText('cloudWorldChampion',champion?.player_name||'—');
  setText('cloudWorldChampionMeta',champion?(integer(champion.wins)+' vittorie · '+num(champion.win_rate).toFixed(1)+'% win rate'):'In attesa di partite');
  setText('cloudWorldCharacter',topCharacter?characterName(topCharacter.character_id):'—');
  setText('cloudWorldCharacterMeta',topCharacter?(integer(topCharacter.selections)+' selezioni · '+integer(topCharacter.wins)+' vittorie'):'0 selezioni');
  setText('cloudWorldTechnique',topTechnique?.technique_name||'—');
  setText('cloudWorldTechniqueMeta',topTechnique?(characterName(topTechnique.character_id)+' · '+integer(topTechnique.uses)+' utilizzi'):'0 utilizzi');
  setText('cloudWorldLive',state.live.length+' '+(state.live.length===1?'partita LIVE':'partite LIVE'));
  setText('cloudWorldLiveMeta',integer(state.global?.totals?.online_players)+' giocatori online');
}
function renderLiveMatches(){
  const el=document.getElementById('cloudLiveMatches');if(!el)return;
  if(!state.live.length){el.innerHTML='<div class="cloud-empty">Nessuna partita è attualmente in corso. La sezione si aggiorna automaticamente senza mostrare alcun codice stanza.</div>';return;}
  el.innerHTML=state.live.map(match=>{
    const connected=num(match.connected_players),players=num(match.player_count);
    return '<article class="cloud-live-card">'+
      '<div class="cloud-live-title"><span>'+esc(match.label||'Partita live')+'</span><span class="cloud-live-badge">In corso</span></div>'+
      '<div class="cloud-live-metrics">'+
        '<div class="cloud-live-metric"><span>Giocatori</span><b>'+players+' partecipanti</b></div>'+
        '<div class="cloud-live-metric"><span>Connessi ora</span><b>'+connected+' / '+players+'</b></div>'+
        '<div class="cloud-live-metric"><span>Durata</span><b>'+formatSeconds(match.duration_seconds)+'</b></div>'+ 
        '<div class="cloud-live-metric"><span>Game Master</span><b>'+(match.gm_online?'Online':'In riconnessione')+'</b></div>'+ 
      '</div><div class="cloud-live-flags"><span class="cloud-chip '+(match.gm_online?'good':'warn')+'">GM '+(match.gm_online?'presente':'offline')+'</span>'+(match.boss_rush_active?'<span class="cloud-chip warn">Boss Rush attiva</span>':'<span class="cloud-chip">Boss Rush disattivata</span>')+'</div>'+ 
    '</article>';
  }).join('');
}

function barRows(items,options={}){
  if(!items?.length)return '<div class="cloud-empty">Nessun dato disponibile. Le statistiche inizieranno a popolarsi dopo le prime partite.</div>';
  const max=options.max||Math.max(...items.map(x=>Math.max(0,num(x.value))),1);
  return '<div class="cloud-bars">'+items.map(item=>{
    const value=Math.max(0,num(item.value)),width=Math.max(value>0?3:0,Math.min(100,(value/max)*100));
    return '<div class="cloud-bar-row"><div class="cloud-bar-label" title="'+esc(item.label)+'">'+esc(item.label)+'</div><div class="cloud-bar-track"><div class="cloud-bar-fill" style="--w:'+width+'%;--bar:'+(item.color||'#54bfff')+'"></div></div><div class="cloud-bar-value">'+esc(item.display??integer(value))+'</div></div>';
  }).join('')+'</div>';
}
function renderCharts(){
  const chars=Array.isArray(state.global?.characters)?state.global.characters:[];
  const techniques=Array.isArray(state.global?.techniques)?state.global.techniques:[];
  const resources=Array.isArray(state.global?.resources)?state.global.resources:[];
  const selections=chars.slice().sort((a,b)=>num(b.selections)-num(a.selections)).slice(0,10).map(x=>({label:characterName(x.character_id),value:x.selections,color:characterColor(x.character_id)}));
  const winRates=chars.filter(x=>num(x.selections)>0).slice().sort((a,b)=>num(b.win_rate)-num(a.win_rate)).slice(0,10).map(x=>({label:characterName(x.character_id),value:x.win_rate,display:num(x.win_rate).toFixed(1)+'%',color:characterColor(x.character_id)}));
  const techniqueRows=techniques.slice(0,12).map(x=>({label:x.technique_name+' · '+characterName(x.character_id),value:x.uses,color:characterColor(x.character_id)}));
  const resourcesByCharacter={};resources.forEach(x=>{const id=x.character_id||'unknown';resourcesByCharacter[id]=resourcesByCharacter[id]||{spent:0,recovered:0};resourcesByCharacter[id].spent+=num(x.spent);resourcesByCharacter[id].recovered+=num(x.recovered);});
  const resourceRows=Object.entries(resourcesByCharacter).map(([id,v])=>({label:characterName(id),value:v.spent,display:integer(v.spent)+' spesi',color:characterColor(id)})).sort((a,b)=>b.value-a.value).slice(0,10);
  const ids=[['cloudCharacterChart',barRows(selections)],['cloudWinRateChart',barRows(winRates,{max:100})],['cloudTechniqueChart',barRows(techniqueRows)],['cloudResourceChart',barRows(resourceRows)]];
  ids.forEach(([id,html])=>{const el=document.getElementById(id);if(el)el.innerHTML=html;});
  renderLineChart();
}
function renderLineChart(){
  const el=document.getElementById('cloudMatchesTrend');if(!el)return;
  const rows=Array.isArray(state.global?.matches_by_day)?state.global.matches_by_day:[];
  if(!rows.length){el.innerHTML='<div class="cloud-line-empty">Il grafico delle partite comparirà dopo la prima partita conclusa.</div>';return;}
  const W=760,H=225,padL=38,padR=18,padT=18,padB=35,plotW=W-padL-padR,plotH=H-padT-padB,max=Math.max(...rows.map(x=>num(x.matches)),1);
  const points=rows.map((row,i)=>{const x=padL+(rows.length===1?plotW/2:(i/(rows.length-1))*plotW),y=padT+plotH-(num(row.matches)/max)*plotH;return {x,y,row};});
  const line=points.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' '),area=padL+','+(padT+plotH)+' '+line+' '+(padL+plotW)+','+(padT+plotH);
  const grid=[0,.25,.5,.75,1].map(r=>{const y=padT+plotH-r*plotH;return '<line class="cloud-line-grid" x1="'+padL+'" y1="'+y+'" x2="'+(padL+plotW)+'" y2="'+y+'"/><text class="cloud-line-axis" x="5" y="'+(y+4)+'">'+Math.round(max*r)+'</text>';}).join('');
  const labels=points.filter((_,i)=>i===0||i===points.length-1||i===Math.floor(points.length/2)).map(p=>'<text class="cloud-line-axis" text-anchor="middle" x="'+p.x+'" y="'+(H-8)+'">'+esc(formatDate(p.row.day,false))+'</text>').join('');
  el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Partite concluse negli ultimi 30 giorni"><defs><linearGradient id="cloudLineGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55bfff" stop-opacity=".36"/><stop offset="1" stop-color="#55bfff" stop-opacity="0"/></linearGradient></defs>'+grid+'<polygon class="cloud-line-area" points="'+area+'"/><polyline class="cloud-line-path" points="'+line+'"/>'+points.map(p=>'<circle class="cloud-line-point" cx="'+p.x+'" cy="'+p.y+'" r="5"><title>'+formatDate(p.row.day,false)+': '+integer(p.row.matches)+' partite</title></circle>').join('')+labels+'</svg>';
}
function renderHallOfFame(){
  const el=document.getElementById('cloudHallOfFame');if(!el)return;
  const players=Array.isArray(state.global?.top_players)?state.global.top_players:[];
  if(!players.length){el.innerHTML='<div class="cloud-empty">La Hall of Fame apparirà dopo la prima partita conclusa.</div>';return;}
  const ranked=players.map((p,i)=>({...p,rank:i+1}));
  const top=ranked.slice(0,3),podium=top.length>=3?[top[1],top[0],top[2]]:top;
  const initials=name=>String(name||'G').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
  const crown=r=>r===1?'♛':r===2?'◆':'▲';
  const labels={1:'Campione globale',2:'Secondo posto',3:'Terzo posto'};
  const podiumHtml='<div class="cloud-hof-podium">'+podium.map(p=>'<article class="cloud-hof-card rank-'+p.rank+'"><div class="cloud-hof-crown">'+crown(p.rank)+'</div><div class="cloud-hof-avatar">'+esc(initials(p.player_name))+'</div><div class="cloud-hof-name">'+esc(p.player_name||'Giocatore')+'</div><div class="cloud-hof-rank-label">'+labels[p.rank]+'</div><div class="cloud-hof-metrics"><div class="cloud-hof-metric"><span>Partite</span><b>'+integer(p.matches)+'</b></div><div class="cloud-hof-metric"><span>Vittorie</span><b>'+integer(p.wins)+'</b></div><div class="cloud-hof-metric"><span>Win rate</span><b>'+num(p.win_rate).toFixed(1)+'%</b></div></div><div class="cloud-hof-time">Tempo giocato · '+formatSeconds(p.total_play_seconds)+'</div></article>').join('')+'</div>';
  const rest=ranked.slice(3);
  const restHtml=rest.length?'<div class="cloud-hof-rest-title"><b>Classifica completa</b><span>'+players.length+' giocatori</span></div><div class="cloud-table-wrap"><table class="cloud-table"><thead><tr><th>#</th><th>Giocatore</th><th>Partite</th><th>Vittorie</th><th>Win rate</th><th>Tempo giocato</th></tr></thead><tbody>'+rest.map(p=>'<tr><td><span class="cloud-rank">'+p.rank+'</span></td><td><b>'+esc(p.player_name||'Giocatore')+'</b></td><td>'+integer(p.matches)+'</td><td class="cloud-win">'+integer(p.wins)+'</td><td>'+num(p.win_rate).toFixed(1)+'%</td><td>'+formatSeconds(p.total_play_seconds)+'</td></tr>').join('')+'</tbody></table></div>':'';
  el.innerHTML='<div class="cloud-hof-stage">'+podiumHtml+restHtml+'</div>';
}
function renderPersonal(){
  const profile=state.personal?.profile||{},totals=state.personal?.totals||{},favorite=state.personal?.favorite_character||{},techs=Array.isArray(state.personal?.top_techniques)?state.personal.top_techniques:[],matches=Array.isArray(state.personal?.recent_matches)?state.personal.recent_matches:[];
  const input=document.getElementById('cloudProfileName');if(input&&!input.matches(':focus'))input.value=profile.display_name||localStorage.getItem('jjk_last_player_name')||'';
  setText('cloudMyMatches',integer(totals.matches));setText('cloudMyWins',integer(totals.wins));setText('cloudMyWinRate',num(totals.win_rate).toFixed(1)+'%');setText('cloudMyPlayTime',formatSeconds(totals.total_play_seconds));setText('cloudMyFavorite',favorite.character_id?characterName(favorite.character_id):'—');setText('cloudMyTechniques',integer(totals.techniques_used));
  const meta=document.getElementById('cloudProfileMeta');if(meta)meta.textContent=profile.first_seen_at?'Profilo account sincronizzato dal '+formatDate(profile.first_seen_at,false)+'. Progressione e statistiche seguono il tuo accesso.':'Accedi o registra un account per sincronizzare il profilo e comparire nella Hall of Fame.';
  const techEl=document.getElementById('cloudPersonalTechniques');if(techEl)techEl.innerHTML=barRows(techs.slice(0,8).map(x=>({label:x.technique_name+' · '+characterName(x.character_id),value:x.uses,color:characterColor(x.character_id)})));
  const matchEl=document.getElementById('cloudPersonalRecent');if(matchEl)matchEl.innerHTML=matches.length?'<div class="cloud-recent-list">'+matches.slice(0,8).map(m=>'<div class="cloud-recent-card"><div class="cloud-recent-icon">'+(m.is_winner?'W':'L')+'</div><div class="cloud-recent-main"><b>'+characterName(m.character_id)+'</b><small>'+(m.is_winner?'Vittoria':'Sconfitta')+' · vincitore '+esc(m.winner_name||'—')+'</small></div><div class="cloud-recent-meta">'+formatDate(m.ended_at)+'<br>'+formatSeconds(m.duration_seconds)+'</div></div>').join('')+'</div>':'<div class="cloud-empty">Nessuna partita personale conclusa.</div>';
}
window.saveCloudProfileName=async function(){
  const input=document.getElementById('cloudProfileName'),name=String(input?.value||'').trim().replace(/\s+/g,' ').slice(0,30);
  if(!name){try{showModal('Nome richiesto','','Inserisci un nome da 1 a 30 caratteri.');}catch(e){}return;}
  const btn=document.getElementById('cloudProfileSave');if(btn)btn.disabled=true;
  try{await rpc('jjk_set_profile_name',{p_display_name:name});localStorage.setItem('jjk_last_player_name',name);await loadCloudStatistics({silent:true});try{showModal('Profilo aggiornato',name,'Il nome verrà utilizzato nelle classifiche globali.');}catch(e){}}
  catch(error){try{showModal('Profilo non aggiornato','',String(error?.message||error));}catch(e){}}
  finally{if(btn)btn.disabled=false;}
};
function renderCharacterPicker(){
  const el=document.getElementById('cloudCharacterPicker');if(!el)return;
  const statsMap=Object.fromEntries((state.global?.characters||[]).map(x=>[x.character_id,x]));
  el.innerHTML=Object.entries(getCharacters()).map(([id,ch])=>{const s=statsMap[id]||{};return '<button class="cloud-character-btn '+(state.selectedCharacter===id?'active':'')+'" style="--cc:'+characterColor(id)+'" onclick="selectCloudStatsCharacter(\''+id+'\')"><img src="'+esc(ch.image)+'" alt="'+esc(ch.name)+'"><span>'+esc(ch.name)+'<small>'+integer(s.selections)+' scelte · '+num(s.win_rate).toFixed(1)+'% vittorie</small></span></button>';}).join('');
}
window.selectCloudStatsCharacter=function(id){if(!getCharacters()?.[id])return;state.selectedCharacter=id;renderCharacterPicker();renderCharacterDetail();};
function renderCharacterDetail(){
  const el=document.getElementById('cloudCharacterDetail');if(!el)return;const id=state.selectedCharacter;
  if(!id||!getCharacters()?.[id]){el.innerHTML='<div class="cloud-empty">Seleziona un personaggio.</div>';return;}
  const c=getCharacters()[id],summary=(state.global?.characters||[]).find(x=>x.character_id===id)||{},techs=(state.global?.techniques||[]).filter(x=>x.character_id===id).sort((a,b)=>num(b.uses)-num(a.uses)),resources=(state.global?.resources||[]).filter(x=>x.character_id===id);
  const spent=resources.reduce((s,x)=>s+num(x.spent),0),recovered=resources.reduce((s,x)=>s+num(x.recovered),0);
  el.innerHTML='<div class="cloud-character-detail"><img class="cloud-character-portrait" src="'+esc(c.image)+'" alt="'+esc(c.name)+'"><div class="cloud-character-body"><div class="cloud-character-name">'+esc(c.name)+'</div><div class="cloud-character-stats"><div class="cloud-character-stat"><span>Scelte</span><b>'+integer(summary.selections)+'</b></div><div class="cloud-character-stat"><span>Vittorie</span><b>'+integer(summary.wins)+'</b></div><div class="cloud-character-stat"><span>Win rate</span><b>'+num(summary.win_rate).toFixed(1)+'%</b></div><div class="cloud-character-stat"><span>Tecniche usate</span><b>'+integer(techs.reduce((s,x)=>s+num(x.uses),0))+'</b></div><div class="cloud-character-stat"><span>Risorse spese</span><b>'+integer(spent)+'</b></div><div class="cloud-character-stat"><span>Risorse recuperate</span><b>'+integer(recovered)+'</b></div></div><div class="cloud-chart-title"><b>Mosse più usate</b><span>Dati globali</span></div>'+barRows(techs.slice(0,8).map(x=>({label:x.technique_name,value:x.uses,color:characterColor(id)})))+'</div></div>';
}
function renderRecentMatches(){
  const el=document.getElementById('cloudRecentMatches');if(!el)return;
  if(!state.recent.length){el.innerHTML='<div class="cloud-empty">L’archivio globale si popolerà dopo la prima partita conclusa.</div>';return;}
  el.innerHTML='<div class="cloud-table-wrap"><table class="cloud-table"><thead><tr><th>Data</th><th>Vincitore</th><th>Personaggio</th><th>Giocatori</th><th>Durata</th><th>Boss Rush</th><th>Tecniche</th></tr></thead><tbody>'+state.recent.map(m=>'<tr><td>'+formatDate(m.ended_at)+'</td><td><b>'+esc(m.winner_name||'—')+'</b></td><td>'+esc(characterName(m.character_id))+'</td><td>'+integer(m.player_count)+'</td><td>'+formatSeconds(m.duration_seconds)+'</td><td>'+(m.boss_rush_used?'<span class="cloud-win">Sì</span>':'No')+'</td><td>'+integer(m.total_techniques)+'</td></tr>').join('')+'</tbody></table></div>';
}

/* ---- Registrazione automatica delle attività in partita ---- */
const originalRecordTechniqueUse=window.recordTechniqueUse;
if(typeof originalRecordTechniqueUse==='function'){
  window.recordTechniqueUse=function(characterId,technique,cost){
    const result=originalRecordTechniqueUse.apply(this,arguments),ctx=cloudContext();
    if(ctx&&technique){
      const lifeCost=num(technique.lifeCost||(/perdi anche 1 vita/i.test(technique.extra||'')?1:0));
      const tokenCost=num(technique.tokenCost),bossRush=!!ctx.me.bossRush;
      let combatValue=null;
      if(Number.isFinite(Number(technique.bonus))){
        try{combatValue=num(effectiveBaseBody())+num(technique.bonus)+num(combatBonus);}catch(e){combatValue=num(technique.bonus);}
      }
      enqueueAnalytics(()=>rpc('jjk_record_technique_use',{
        p_room_id:ctx.session.roomId,
        p_technique_key:String(technique.key||'unknown').slice(0,100),
        p_technique_name:String(technique.name||technique.key||'Tecnica').slice(0,100),
        p_grade:String(currentGradeId()||technique.grade||'').slice(0,20)||null,
        p_energy_spent:Math.max(0,Math.round(num(cost))),
        p_special_spent:{life:bossRush?0:lifeCost,tokens:bossRush?0:tokenCost,boss_rush:bossRush,resource:characterId==='toji'?'vigor':'energy'},
        p_combat_value:combatValue,
        p_details:{client:currentClientKind(),source_character:characterId,technique_grade:technique.grade||null,copied:technique.key?.startsWith?.('copia_')||false}
      }));
    }
    return result;
  };
}

const RESOURCE_FIELDS={
  life:{type:'life',read:()=>life},
  energy:{type:()=>currentCharacter()==='toji'?'vigor':'energy',read:()=>energy,skip:()=>currentCharacter()==='jogo'},
  exp:{type:'exp',read:()=>exp},
  combatBonus:{type:'combat_bonus',read:()=>combatBonus},
  tokens:{type:'cursed_tokens',read:()=>tokens},
  jogoHeat:{type:'heat',read:()=>jogoHeat},
  getoOneUse:{type:'one_use_body',read:()=>getoOneUse},
  tojiCollectedEnergy:{type:'collected_cursed_energy',read:()=>tojiCollectedEnergy},
  itadoriFingers:{type:'sukuna_fingers',read:()=>itadoriFingers},
  itadoriOneUse:{type:'choso_body',read:()=>itadoriOneUse},
  yutaCopiedTokens:{type:'copied_tokens',read:()=>yutaCopiedTokens},
  yutaCopiedVigor:{type:'copied_vigor',read:()=>yutaCopiedVigor},
  yutaCopiedFingers:{type:'copied_fingers',read:()=>yutaCopiedFingers},
  yutaCopiedHeat:{type:'copied_heat',read:()=>yutaCopiedHeat}
};
function snapshotResources(){
  const out={characterId:currentCharacter(),values:{}};
  Object.entries(RESOURCE_FIELDS).forEach(([key,meta])=>{try{if(meta.skip?.())return;const value=Number(meta.read());if(Number.isFinite(value))out.values[key]=value;}catch(e){}});
  return out;
}
function recordResourceDiff(before,after,source){
  const ctx=cloudContext();if(!ctx||!before||!after||before.characterId!==after.characterId)return;
  Object.entries(after.values).forEach(([key,afterValue])=>{
    if(before.values[key]===undefined)return;const delta=Math.round(afterValue-before.values[key]);if(!delta)return;const meta=RESOURCE_FIELDS[key],type=typeof meta.type==='function'?meta.type():meta.type;
    enqueueAnalytics(()=>rpc('jjk_record_resource_event',{
      p_room_id:ctx.session.roomId,p_resource_type:type,p_delta:delta,p_source:String(source||'game').slice(0,80),p_details:{before:before.values[key],after:afterValue,character_id:after.characterId,client:currentClientKind()},p_room_player_id:null
    }));
  });
}
function wrapResourceAction(name,source){
  const original=window[name];if(typeof original!=='function'||original.__cloudStatsWrapped)return;
  function wrapped(){
    const outer=state.actionDepth===0,before=outer?snapshotResources():null;state.actionDepth++;
    let result;
    try{result=original.apply(this,arguments);}catch(error){state.actionDepth--;throw error;}
    const finalize=()=>{state.actionDepth=Math.max(0,state.actionDepth-1);if(outer){const after=snapshotResources();recordResourceDiff(before,after,source||name);}};
    if(result&&typeof result.then==='function')return result.then(value=>{finalize();return value;},error=>{finalize();throw error;});
    finalize();return result;
  }
  wrapped.__cloudStatsWrapped=true;window[name]=wrapped;
}
[
  'useTechnique','useYutaKatanaSolo','convertYutaLifeToEnergy','convertYutaEnergyToLife','gainEnergy','fullEnergy','gainExp','changeLife','changeCombatBonus','changeTokens','changeJogoHeat','changeTojiVigor','fullTojiVigor','changeGetoOneUse','changeTojiCollectedEnergy','changeItadoriFingers','resetItadoriCurrentFingers','changeYutaCopiedResource','resetYutaCopiedResource','forgetYutaCopy','newCombat'
].forEach(name=>wrapResourceAction(name,'player:'+name));

function stateFieldValue(player,field){
  const s=player?.state||{};
  if(field==='energy')return num(s.energy);return num(s[field]);
}
const originalGmAdjustPlayer=window.gmAdjustPlayer;
if(typeof originalGmAdjustPlayer==='function'){
  window.gmAdjustPlayer=async function(id,field,delta,rerender=true){
    const beforePlayer=typeof roomFindPlayer==='function'?roomFindPlayer(id):null,before=stateFieldValue(beforePlayer,field),session=currentSession();
    const result=await originalGmAdjustPlayer.apply(this,arguments);
    const afterPlayer=typeof roomFindPlayer==='function'?roomFindPlayer(id):null,after=stateFieldValue(afterPlayer,field),actual=Math.round(after-before);
    if(actual&&session?.roomId&&session.isHost&&session.phase==='playing'){
      enqueueAnalytics(()=>rpc('jjk_record_resource_event',{
        p_room_id:session.roomId,p_resource_type:field==='combatBonus'?'combat_bonus':field,p_delta:actual,p_source:'game_master',p_details:{requested_delta:num(delta),before,after,client:currentClientKind()},p_room_player_id:id
      }));
    }
    return result;
  };
}

/* Aggiorna il profilo anche quando viene usato un nome nella lobby. */
window.jjkSyncProfileName=function(name){
  const clean=String(name||'').trim().replace(/\s+/g,' ').slice(0,30);if(!clean)return Promise.resolve();
  return enqueueAnalytics(()=>rpc('jjk_set_profile_name',{p_display_name:clean}));
};

/* Se la schermata e' gia' aperta dopo un refresh, carica i dati. */
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(activeStatsScreen())loadCloudStatistics({silent:false});},{once:true});
else if(activeStatsScreen())loadCloudStatistics({silent:false});

console.info('JJK global statistics ready',CLOUD_STATS_VERSION);
})();
