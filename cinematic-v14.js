/* JJK Energy V14 - Cinematic Edition
   Hall of Fame, statistiche mondiali, Assistente GM e animazioni avanzate. */
(function(){
'use strict';
const VERSION='14.0';
const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('v34-no-motion');
const esc=v=>typeof window.escapeHtml==='function'?window.escapeHtml(v??''):String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const safeNumber=v=>Number.isFinite(Number(v))?Number(v):0;
const charMeta=id=>window.JJK_UI_META?.[id]||{color:'#54bfff',role:'Combattente'};
const getCharacters=()=>{try{return characters;}catch(e){return window.characters||{};}};
const charName=id=>getCharacters()?.[id]?.name||id||'Personaggio';
const charImage=id=>getCharacters()?.[id]?.portrait||getCharacters()?.[id]?.image||'';

function addAmbient(){
  if(document.querySelector('.v14-ambient-layer'))return;
  const layer=document.createElement('div');layer.className='v14-ambient-layer';layer.setAttribute('aria-hidden','true');
  const colors=['#54cfff','#a866ff','#ff5577','#65e5a2','#ffd568'];
  for(let i=0;i<24;i++){
    const dot=document.createElement('i');
    dot.style.setProperty('--x',(2+Math.random()*96)+'%');dot.style.setProperty('--y',(4+Math.random()*92)+'%');dot.style.setProperty('--s',(2+Math.random()*4)+'px');dot.style.setProperty('--c',colors[i%colors.length]);dot.style.setProperty('--d',(6+Math.random()*10)+'s');dot.style.setProperty('--delay',(-Math.random()*10)+'s');dot.style.setProperty('--dx',(Math.random()*30-15)+'px');layer.appendChild(dot);
  }
  document.body.appendChild(layer);
}
function enhanceHome(){
  const home=document.getElementById('home');if(!home||home.dataset.v14==='1')return;home.dataset.v14='1';
  const rift=document.createElement('div');rift.className='v14-home-rift';rift.setAttribute('aria-hidden','true');home.appendChild(rift);
  const glyphs=document.createElement('div');glyphs.className='v14-home-glyphs';glyphs.setAttribute('aria-hidden','true');
  const items=[['無','#54cfff'],['宿','#ff5577'],['影','#47dfff'],['魂','#a866ff'],['火','#ff8c48'],['刃','#b777ff'],['愛','#4d91ff'],['呪','#65e5a2']];
  items.forEach(([g,c],i)=>{const s=document.createElement('span');s.textContent=g;s.style.setProperty('--x',(5+(i*12)%90)+'%');s.style.setProperty('--y',(8+(i*19)%78)+'%');s.style.setProperty('--c',c);s.style.setProperty('--s',(3.3+(i%3)*1.2)+'rem');s.style.setProperty('--d',(7+i%4*1.8)+'s');s.style.setProperty('--delay',(-i*.7)+'s');glyphs.appendChild(s);});home.appendChild(glyphs);
  const strip=home.querySelector('.home-live-strip');if(strip&&!strip.querySelector('.v14-home-live-pulse')){const pulse=document.createElement('span');pulse.className='v14-home-live-pulse';pulse.textContent='Cinematic Edition';strip.prepend(pulse);}
  const card=home.querySelector('.home-card-v2');
  if(card&&!reduced()){
    let raf=0;home.addEventListener('pointermove',e=>{if(innerWidth<850||reduced()){card.classList.remove('v14-tilt');return;}cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{if(reduced()){card.classList.remove('v14-tilt');return;}const r=home.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;document.documentElement.style.setProperty('--v14-pointer-x',(e.clientX/innerWidth*100)+'%');document.documentElement.style.setProperty('--v14-pointer-y',(e.clientY/innerHeight*100)+'%');card.style.setProperty('--tilt-x',(-y*3.4)+'deg');card.style.setProperty('--tilt-y',(x*5.2)+'deg');card.classList.add('v14-tilt');});});
    home.addEventListener('pointerleave',()=>{card.style.setProperty('--tilt-x','0deg');card.style.setProperty('--tilt-y','0deg');});
  }
}

/* ===== Statistiche globali e Hall of Fame ===== */
function ensureWorldStatsContainers(){
  const overview=document.querySelector('[data-cloud-view-panel="overview"]');
  if(overview&&!document.getElementById('v14WorldPulse')){
    const hero=overview.querySelector('.cloud-stats-hero');const box=document.createElement('div');box.id='v14WorldPulse';box.className='v14-world-pulse';box.innerHTML='<article class="v14-world-card" style="--wc:#54bfff"><small>Personaggio del momento</small><b>In attesa dei dati</b><span>Metagame globale</span></article><article class="v14-world-card" style="--wc:#ff5f86"><small>Tecnica dominante</small><b>In attesa dei dati</b><span>Utilizzi complessivi</span></article><article class="v14-world-card" style="--wc:#a866ff"><small>Community pulse</small><b>Sincronizzazione</b><span>Dati Supabase Realtime</span></article>';
    hero?.insertAdjacentElement('afterend',box);
  }
  const hall=document.getElementById('cloudHallOfFame');
  if(hall&&!document.getElementById('v14HallPodium')){const podium=document.createElement('div');podium.id='v14HallPodium';podium.className='v14-hall-podium';hall.before(podium);}
}
function renderWorldStats(){
  ensureWorldStatsContainers();const state=window.jjkCloudStatsState;if(!state?.global)return;
  const chars=Array.isArray(state.global.characters)?state.global.characters:[];
  const techs=Array.isArray(state.global.techniques)?state.global.techniques:[];
  const players=Array.isArray(state.global.top_players)?state.global.top_players:[];
  const topChar=chars.slice().sort((a,b)=>safeNumber(b.selections)-safeNumber(a.selections))[0];
  const topTech=techs.slice().sort((a,b)=>safeNumber(b.uses)-safeNumber(a.uses))[0];
  const pulse=document.getElementById('v14WorldPulse');if(pulse){
    const cards=pulse.children;
    if(cards[0])cards[0].innerHTML='<small>Personaggio del momento</small><b>'+esc(topChar?charName(topChar.character_id):'Nessun dato')+'</b><span>'+(topChar?safeNumber(topChar.selections).toLocaleString('it-IT')+' selezioni globali':'Gioca una partita per popolare il dato')+'</span>';
    if(cards[1])cards[1].innerHTML='<small>Tecnica dominante</small><b>'+esc(topTech?.technique_name||'Nessun dato')+'</b><span>'+(topTech?safeNumber(topTech.uses).toLocaleString('it-IT')+' utilizzi · '+esc(charName(topTech.character_id)):'Le tecniche appariranno dopo le prime partite')+'</span>';
    const totals=state.global.totals||{};if(cards[2])cards[2].innerHTML='<small>Community pulse</small><b>'+safeNumber(totals.online_players).toLocaleString('it-IT')+' online</b><span>'+safeNumber(totals.matches_played).toLocaleString('it-IT')+' partite concluse · '+safeNumber(state.live?.length||totals.active_matches).toLocaleString('it-IT')+' live</span>';
  }
  const podium=document.getElementById('v14HallPodium');if(!podium)return;
  if(!players.length){podium.innerHTML='<div class="cloud-empty" style="grid-column:1/-1">Il podio apparirà dopo la prima partita conclusa.</div>';return;}
  const order=[players[1],players[0],players[2]],classes=['second','first','third'],ranks=['2','1','3'];
  podium.innerHTML=order.map((p,i)=>p?'<article class="v14-podium-card '+classes[i]+'" data-rank="'+ranks[i]+'"><div class="v14-podium-name">'+esc(p.player_name||'Giocatore')+'</div><div class="v14-podium-stat">'+safeNumber(p.wins).toLocaleString('it-IT')+' W</div><div class="v14-podium-meta">'+safeNumber(p.matches).toLocaleString('it-IT')+' partite<br>'+safeNumber(p.win_rate).toFixed(1)+'% win rate</div></article>':'<article class="v14-podium-card '+classes[i]+'" data-rank="'+ranks[i]+'"><div class="v14-podium-name">Posto libero</div><div class="v14-podium-stat">—</div><div class="v14-podium-meta">In attesa di un campione</div></article>').join('');
}

/* ===== Assistente intelligente Game Master ===== */
let aiFilter='all';
function sessionValue(){try{return roomSession||window.roomSession||null;}catch(e){return window.roomSession||null;}}
function resourceMax(player){try{return typeof roomStateResourceMax==='function'?safeNumber(roomStateResourceMax(player)):safeNumber(getCharacters()?.[player.characterId]?.grades?.find(g=>g.id===(player.state?.gradeId||'G4'))?.max);}catch(e){return 0;}}
function gradeIndex(id){return ({G4:0,G3:1,G2:2,G1:3,SS:4,SG:5})[id]??0;}
function expectedGrade(characterId,exp){const grades=getCharacters()?.[characterId]?.grades||[];let current=grades[0]||null;grades.forEach(g=>{if(safeNumber(exp)>=safeNumber(g.exp))current=g;});return current;}
function nextGrade(characterId,gradeId){const grades=getCharacters()?.[characterId]?.grades||[],i=grades.findIndex(g=>g.id===gradeId);return i>=0?grades[i+1]||null:null;}
function issue(severity,icon,title,text,player=null){return {severity,icon,title,text,playerToken:player?.playerToken||player?.peerId||'',playerName:player?.name||'',characterId:player?.characterId||''};}
function analyzeGM(){
  const session=sessionValue(),out=[];if(!session?.isHost||session.phase!=='playing')return out;
  const players=(session.players||[]).filter(p=>!p.isHost),active=players.filter(p=>!p.locked);
  if(!players.length)out.push(issue('warning','人','Nessun giocatore in partita','La partita risulta avviata, ma non ci sono giocatori controllabili.'));
  if(!active.length&&players.length)out.push(issue('critical','▶','Nessun turno attivo','Tutte le schede sono bloccate. Assegna il turno a un giocatore.'));
  if(active.length>1)out.push(issue('warning','⇄','Più turni attivi contemporaneamente',active.map(p=>p.name).join(', ')+' possono agire nello stesso momento.'));
  active.filter(p=>p.connected===false).forEach(p=>out.push(issue('critical','⚠','Turno assegnato a un giocatore offline','Il turno attivo appartiene a '+p.name+', che risulta in riconnessione.',p)));
  const boss=players.filter(p=>p.bossRush);if(boss.length)out.push(issue('info','∞','Boss Rush attiva','Modalità assegnata a '+boss.map(p=>p.name).join(', ')+'. Le risorse non vengono consumate finché resta attiva.',boss[0]));
  players.forEach(p=>{
    const s=p.state||{},ch=getCharacters()?.[p.characterId];if(!p.characterId||!ch){out.push(issue('critical','?','Personaggio non assegnato',p.name+' è in partita senza un personaggio valido.',p));return;}
    if(p.connected===false)out.push(issue('warning','⌁','Giocatore in riconnessione',p.name+' mantiene posto, personaggio e risorse salvate.',p));
    const maxLife=s.maxLife??ch.maxLife,life=s.life??maxLife,maxRes=resourceMax(p),energy=s.energy??0,exp=s.exp??0,grade=s.gradeId||'G4';
    if(life<=2)out.push(issue(life<=1?'critical':'warning','♥','Vita molto bassa',p.name+' ha '+life+' Vita su '+maxLife+'.',p));
    if(life>maxLife)out.push(issue('info','＋','Vita temporanea attiva',p.name+' possiede '+(life-maxLife)+' Vita oltre il massimo.',p));
    if(maxRes>0&&energy<=Math.max(1,Math.floor(maxRes*.25)))out.push(issue('warning',p.characterId==='toji'?'体':'⚡','Risorsa quasi esaurita',p.name+' ha '+energy+' '+(p.characterId==='toji'?'Vigore':'Energia')+' su '+maxRes+'.',p));
    if(maxRes>0&&energy>maxRes)out.push(issue('info','⚡','Energia extra disponibile',p.name+' possiede +'+(energy-maxRes)+' oltre il massimo del grado.',p));
    const expected=expectedGrade(p.characterId,exp);if(expected&&expected.id!==grade)out.push(issue('critical','級','Grado non allineato agli EXP',p.name+' dovrebbe essere '+expected.id+' con '+exp+' EXP, ma lo stato mostra '+grade+'.',p));
    const next=nextGrade(p.characterId,grade);if(next){const left=safeNumber(next.exp)-safeNumber(exp);if(left>=0&&left<=3)out.push(issue('ready','★','Promozione vicina',p.name+' è a '+left+' EXP dal grado '+next.id+'.',p));}
    if(p.claim)out.push(issue('critical','旗','Vittoria dichiarata',p.name+' ha dichiarato: '+p.claim+'. Solo il GM può concludere ufficialmente la partita.',p));
    if(p.characterId==='geto'){
      const tok=safeNumber(s.tokens);if(tok>=20&&gradeIndex(grade)>=gradeIndex('SG'))out.push(issue('ready','呪','Uzumaki pronto',p.name+' possiede '+tok+' Segnalini Maledetti e può soddisfare il costo di Uzumaki.',p));
      if(safeNumber(s.getoOneUse)>0)out.push(issue('info','＋','Corpo monouso pronto','Geto ha +'+safeNumber(s.getoOneUse)+' Corpo per la prossima tecnica da combattimento.',p));
    }
    if(p.characterId==='toji'){
      const collected=safeNumber(s.tojiCollectedEnergy),tokens=Math.min(2,Math.floor(collected/10));if(tokens>0)out.push(issue('ready','刃','Gettoni Forza pronti',p.name+' ha '+tokens+' getton'+(tokens===1?'e':'i')+' da +'+(tokens*2)+' Corpo.',p));
    }
    if(p.characterId==='itadori'){
      const fingers=safeNumber(s.itadoriFingers),maxF=safeNumber(s.itadoriMaxFingers);[5,10,15,20].forEach(v=>{if(maxF===v)out.push(issue('ready','宿','Soglia Dita raggiunta',p.name+' ha raggiunto '+v+' Dita di Sukuna.',p));});
      if(safeNumber(s.itadoriOneUse)>0)out.push(issue('ready','拳','Aiuto di Choso pronto',p.name+' ha +'+safeNumber(s.itadoriOneUse)+' Corpo monouso da applicare alla prossima tecnica.',p));
      if(fingers>=20&&grade!=='SG')out.push(issue('critical','宿','Risveglio totale disponibile',p.name+' ha 20 Dita e può dichiarare la tecnica di vittoria prevista.',p));
    }
    if(p.characterId==='jogo'&&grade==='SG'&&safeNumber(s.jogoHeat)>=8)out.push(issue('ready','火','Calore al massimo',p.name+' ha raggiunto +8 Corpo da Calore.',p));
    if(p.characterId==='yuta'){
      if(gradeIndex(grade)>=gradeIndex('G2')&&!s.yutaCopiedTechnique)out.push(issue('info','愛','Copia disponibile',p.name+' è almeno G2 e può memorizzare una tecnica.',p));
      if(s.yutaKatanaActive)out.push(issue('ready','刀','Katana preparata',p.name+' ha la Katana attiva per la prossima tecnica compatibile.',p));
    }
    if(s.updatedAt&&Date.now()-safeNumber(s.updatedAt)>120000&&p.connected!==false)out.push(issue('warning','時','Stato non aggiornato da oltre 2 minuti','Controlla che la scheda di '+p.name+' sia ancora sincronizzata.',p));
  });
  const order={critical:0,warning:1,ready:2,info:3};return out.sort((a,b)=>order[a.severity]-order[b.severity]||a.playerName.localeCompare(b.playerName,'it'));
}
function installGMAssistant(){
  const nav=document.querySelector('.gm-tabs');if(!nav||document.getElementById('gmViewAssistant'))return;
  const btn=document.createElement('button');btn.className='gm-tab';btn.dataset.gmView='assistant';btn.innerHTML='<span>✦</span> Assistente GM';btn.addEventListener('click',()=>{if(typeof window.gmSetView==='function')window.gmSetView('assistant');renderGMAssistant();});nav.insertBefore(btn,nav.lastElementChild);
  const panel=document.createElement('section');panel.id='gmViewAssistant';panel.className='gm-view';panel.innerHTML='<div class="v14-ai-shell"><div class="v14-ai-hero"><div class="v14-ai-copy"><div class="v14-ai-kicker">Analisi intelligente delle regole</div><h3>Assistente Game Master</h3><p>Controlla turni, connessioni, promozioni, risorse e abilità speciali. Non cambia automaticamente la partita: segnala ciò che merita attenzione, lasciando sempre la decisione al Game Master.</p></div><div class="v14-ai-actions"><button class="v14-ai-btn" onclick="renderGMAssistant(true)">✦ Analizza ora</button></div></div><div id="v14AiSummary" class="v14-ai-summary"></div><div id="v14AiFilters" class="v14-ai-filter"></div><div id="v14AiList" class="v14-ai-list"></div></div>';
  nav.parentElement.appendChild(panel);
}
window.setV14AiFilter=function(value){aiFilter=value;renderGMAssistant();};
window.v14FocusPlayer=function(token,name){
  try{if(typeof window.gmSetSearch==='function')window.gmSetSearch(name||'');const search=document.getElementById('gmPlayerSearch');if(search)search.value=name||'';window.gmSetView?.('players');window.renderGMDashboard?.();setTimeout(()=>{document.querySelector('[data-player-token="'+CSS.escape(token)+'"]')?.scrollIntoView({behavior:'smooth',block:'center'});},120);}catch(e){}
};
window.renderGMAssistant=function(withSound=false){
  installGMAssistant();const list=document.getElementById('v14AiList');if(!list)return;const issues=analyzeGM(),counts={critical:0,warning:0,ready:0,info:0};issues.forEach(x=>counts[x.severity]++);
  const summary=document.getElementById('v14AiSummary');if(summary)summary.innerHTML='<article class="v14-ai-summary-card critical"><small>Urgenti</small><b>'+counts.critical+'</b></article><article class="v14-ai-summary-card warning"><small>Da controllare</small><b>'+counts.warning+'</b></article><article class="v14-ai-summary-card ready"><small>Opportunità</small><b>'+counts.ready+'</b></article><article class="v14-ai-summary-card info"><small>Informazioni</small><b>'+counts.info+'</b></article>';
  const filters=document.getElementById('v14AiFilters');if(filters)filters.innerHTML=[['all','Tutto'],['critical','Urgenti'],['warning','Controlli'],['ready','Pronto'],['info','Info']].map(([v,l])=>'<button class="'+(aiFilter===v?'active':'')+'" onclick="setV14AiFilter(\''+v+'\')">'+l+' '+(v==='all'?issues.length:counts[v])+'</button>').join('');
  const visible=issues.filter(x=>aiFilter==='all'||x.severity===aiFilter);if(!visible.length){list.innerHTML='<div class="v14-ai-empty"><b>Situazione sotto controllo</b>Nessun avviso corrisponde al filtro selezionato.</div>';}else list.innerHTML=visible.map(x=>'<article class="v14-ai-card" data-severity="'+x.severity+'"><div class="v14-ai-icon">'+x.icon+'</div><div><div class="v14-ai-title">'+esc(x.title)+'</div><div class="v14-ai-text">'+esc(x.text)+'</div>'+(x.playerName?'<div class="v14-ai-player">'+esc(x.playerName)+' · '+esc(charName(x.characterId))+'</div>':'')+'</div>'+(x.playerToken?'<button class="v14-ai-focus" onclick="v14FocusPlayer(decodeURIComponent(\''+encodeURIComponent(x.playerToken)+'\'),decodeURIComponent(\''+encodeURIComponent(x.playerName)+'\'))">Apri giocatore</button>':'')+'</article>').join('');
  if(withSound)window.JJKSfx?.play(counts.critical?'danger':'confirm');
};
function patchGMViews(){
  installGMAssistant();const base=window.gmSetView;if(typeof base==='function'&&!base.__v14){const wrapped=function(view){const result=base.apply(this,arguments);if(view==='assistant')setTimeout(()=>renderGMAssistant(),0);return result;};wrapped.__v14=true;window.gmSetView=wrapped;}
  const render=window.renderGMDashboard;if(typeof render==='function'&&!render.__v14){const wrapped=function(){const result=render.apply(this,arguments);if(document.getElementById('gmViewAssistant')?.classList.contains('active'))renderGMAssistant();return result;};wrapped.__v14=true;window.renderGMDashboard=wrapped;}
}

/* ===== Animazioni cinematiche ===== */
function ensureCinema(){let layer=document.getElementById('v14Cinema');if(layer)return layer;layer=document.createElement('div');layer.id='v14Cinema';layer.className='v14-cinema';layer.setAttribute('aria-hidden','true');document.body.appendChild(layer);return layer;}
function techniqueLabel(t){return String(t?.name||'Tecnica').slice(0,70);}
function techniqueKind(id,t){const name=(t?.name||'').toLowerCase(),key=t?.key||'';
  if(id==='gojo'){if(/viola/.test(name)||key==='viola')return'gojo-purple';if(/rosso/.test(name))return'gojo-red';if(/vuoto|infinito|dominio/.test(name))return'gojo-domain';return'gojo-blue';}
  if(id==='sukuna')return /reliquario|dominio/.test(name)?'sukuna-domain':'sukuna-slash';
  if(id==='itadori')return /black flash/.test(name)?'itadori-black':'itadori-impact';
  if(id==='megumi')return /mahoraga|giardino/.test(name)?'megumi-domain':'megumi-shadow';
  if(id==='geto')return /uzumaki/.test(name)?'geto-uzumaki':'geto-dragon';
  if(id==='mahito')return /dominio|perfetta|autoreincarnazione/.test(name)?'mahito-domain':'mahito-distort';
  if(id==='jogo')return'jogo-volcano';if(id==='toji')return /lancia|potenza|frenesia/.test(name)?'toji-break':'toji-speed';if(id==='yuta')return /katana|lancia/.test(name)?'yuta-katana':'yuta-rika';return'generic';
}
function particles(cls,count,color){let html='';for(let i=0;i<count;i++){html+='<i class="'+cls+'" style="--x:'+(8+Math.random()*84)+'%;--y:'+(42+Math.random()*48)+'%;--dx:'+(Math.random()*120-60)+'px;--delay:'+(Math.random()*.13)+'s;--fx:'+color+'"></i>'; }return html;}
function cinemaMarkup(kind,color,t){const label='<div class="v14-label">'+esc(techniqueLabel(t))+'</div>',vig='<div class="v14-vignette"></div>';let body='';
  switch(kind){
    case'gojo-purple':body='<div class="v14-orb" style="--fx:#a648ff;--fx2:#ff3c68"></div><div class="v14-ring" style="--fx:#c858ff"></div><div class="v14-ring" style="--fx:#ff5577;animation-delay:.07s"></div>';break;
    case'gojo-red':body='<div class="v14-orb" style="--fx:#ff344d;--fx2:#fff0f3"></div><div class="v14-impact" style="--fx:#ff344d"></div>';break;
    case'gojo-domain':body='<div class="v14-ring"></div><div class="v14-ring" style="animation-delay:.08s"></div><div class="v14-ring" style="animation-delay:.16s"></div><div class="v14-silhouette"></div>';break;
    case'gojo-blue':body='<div class="v14-orb"></div><div class="v14-ring"></div>';break;
    case'sukuna-domain':body='<div class="v14-silhouette"></div><div class="v14-slash" style="--r:-32deg"></div><div class="v14-slash" style="--r:22deg;--delay:.06s"></div><div class="v14-slash" style="--r:84deg;--delay:.12s"></div>';break;
    case'sukuna-slash':body='<div class="v14-slash" style="--r:-34deg"></div><div class="v14-slash" style="--r:24deg;--delay:.06s"></div><div class="v14-slash" style="--r:82deg;--delay:.12s"></div>';break;
    case'itadori-black':body='<div class="v14-impact"></div>'+Array.from({length:6},(_,i)=>'<div class="v14-lightning" style="--x:'+(22+i*11)+'%;--r:'+(i%2?-8:9)+'deg;--delay:'+(i*.035)+'s"></div>').join('');break;
    case'itadori-impact':body='<div class="v14-impact"></div><div class="v14-ring"></div>';break;
    case'megumi-domain':body='<div class="v14-shadow-pool"></div><div class="v14-silhouette"></div><div class="v14-ring"></div>';break;
    case'megumi-shadow':body='<div class="v14-shadow-pool"></div><div class="v14-silhouette"></div>';break;
    case'geto-uzumaki':body='<div class="v14-ring"></div><div class="v14-dragon"><svg viewBox="0 0 1000 340"><path d="M20 230 C150 20 260 320 390 150 S640 20 760 190 S920 310 980 90"/><circle cx="965" cy="92" r="8"/><circle cx="943" cy="83" r="5"/></svg></div>';break;
    case'geto-dragon':body='<div class="v14-dragon"><svg viewBox="0 0 1000 340"><path d="M20 230 C150 20 260 320 390 150 S640 20 760 190 S920 310 980 90"/><circle cx="965" cy="92" r="8"/><circle cx="943" cy="83" r="5"/></svg></div>';break;
    case'mahito-domain':body='<div class="v14-silhouette"></div><div class="v14-ring"></div><div class="v14-ring" style="border-radius:31% 69% 45% 55%/62% 33% 67% 38%;animation-delay:.08s"></div>';break;
    case'mahito-distort':body='<div class="v14-ring" style="border-radius:29% 71% 41% 59%/63% 33% 67% 37%"></div><div class="v14-ring" style="border-radius:71% 29% 63% 37%/32% 62% 38% 68%;animation-delay:.08s"></div>';break;
    case'jogo-volcano':body='<div class="v14-impact"></div>'+particles('v14-ember',16,'#ff5c23');break;
    case'toji-break':body=Array.from({length:7},(_,i)=>'<div class="v14-crack" style="--r:'+(-66+i*22)+'deg;animation-delay:'+(i*.025)+'s"></div>').join('')+'<div class="v14-impact"></div>';break;
    case'toji-speed':body='<div class="v14-slash" style="--r:82deg"></div><div class="v14-slash" style="--r:86deg;--delay:.05s"></div><div class="v14-slash" style="--r:90deg;--delay:.1s"></div>';break;
    case'yuta-katana':body='<div class="v14-slash" style="--r:-18deg"></div><div class="v14-slash" style="--r:-9deg;--delay:.06s"></div><div class="v14-silhouette"></div>';break;
    case'yuta-rika':body='<div class="v14-silhouette"></div><div class="v14-ring"></div>';break;
    default:body='<div class="v14-flash"></div><div class="v14-ring"></div>';
  }
  return vig+body+label;
}
function soundKind(kind){if(/slash|katana|speed/.test(kind))return'slash';if(/volcano/.test(kind))return'fire';if(/impact|break|black/.test(kind))return'impact';if(/domain|purple|uzumaki|rika/.test(kind))return'domain';if(/dragon/.test(kind))return'dragon';if(/distort/.test(kind))return'distort';return'energy';}
function playCinema(t){if(reduced())return;const id=(()=>{try{return currentId;}catch(e){return window.currentId;}})()||'generic',color=charMeta(id).color||'#54bfff',kind=techniqueKind(id,t),layer=ensureCinema();layer.style.setProperty('--fx',color);layer.innerHTML=cinemaMarkup(kind,color,t);layer.classList.remove('show');void layer.offsetWidth;layer.classList.add('show');window.JJKSfx?.play(soundKind(kind));if(/impact|break|black|purple|domain|uzumaki/.test(kind)){document.body.classList.remove('v14-screen-shake');void document.body.offsetWidth;document.body.classList.add('v14-screen-shake');setTimeout(()=>document.body.classList.remove('v14-screen-shake'),380);}clearTimeout(playCinema._timer);playCinema._timer=setTimeout(()=>{layer.classList.remove('show');layer.innerHTML='';},1250);}
function patchTechniqueFx(){const base=window.playTechniqueEffect;if(typeof base==='function'&&!base.__v14){const wrapped=function(t){try{base.apply(this,arguments);}catch(e){}playCinema(t);};wrapped.__v14=true;window.playTechniqueEffect=wrapped;}}

function patchScreens(){const base=window.showScreen;if(typeof base==='function'&&!base.__v14){const wrapped=function(id){const result=base.apply(this,arguments);requestAnimationFrame(()=>{document.querySelectorAll('.screen').forEach(x=>x.classList.remove('v14-enter'));const active=document.getElementById(id);if(active){active.classList.add('v14-enter');setTimeout(()=>active.classList.remove('v14-enter'),420);}if(id==='statistics')setTimeout(renderWorldStats,180);if(id==='gameMaster')setTimeout(()=>{patchGMViews();renderGMAssistant();},100);});return result;};wrapped.__v14=true;window.showScreen=wrapped;}}

function init(){addAmbient();enhanceHome();ensureWorldStatsContainers();renderWorldStats();installGMAssistant();patchGMViews();patchTechniqueFx();patchScreens();document.addEventListener('jjk:cloudstats',renderWorldStats);setInterval(()=>{if(document.getElementById('gmViewAssistant')?.classList.contains('active'))renderGMAssistant();},2500);console.info('JJK Cinematic Edition ready',VERSION);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,80),{once:true});else setTimeout(init,80);
})();
