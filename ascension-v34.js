(function(){
'use strict';
const VERSION='35.0.0';
const CHARS={
  gojo:{color:'#65d6ff',glyph:'無',fx:'infinity',title:'Lo Stregone Più Forte'},
  sukuna:{color:'#ff3e58',glyph:'斬',fx:'slash',title:'Re delle Maledizioni'},
  itadori:{color:'#ff6284',glyph:'拳',fx:'impact',title:'Ricettacolo Indomito'},
  megumi:{color:'#35d9ff',glyph:'影',fx:'shadow',title:'Erede delle Dieci Ombre'},
  geto:{color:'#4be497',glyph:'呪',fx:'orbs',title:'Dominatore degli Spiriti'},
  mahito:{color:'#b15cff',glyph:'魂',fx:'distort',title:'Scultore dell’Anima'},
  jogo:{color:'#ff782f',glyph:'火',fx:'ember',title:'Calamità Vulcanica'},
  toji:{color:'#9b65ff',glyph:'刃',fx:'speed',title:'Assassino degli Stregoni'},
  yuta:{color:'#5c93ff',glyph:'愛',fx:'rika',title:'Stregone di Classe Speciale'}
};
const ui={profileCharacter:'gojo',tech:null,lastScreen:'home',previewFocus:null};
const $=id=>document.getElementById(id);
const q=(sel,root=document)=>root.querySelector(sel);
const qa=(sel,root=document)=>[...root.querySelectorAll(sel)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safe(label,fn){try{return fn();}catch(error){console.error('[V34 '+label+']',error);return null;}}
function getCharacters(){try{return characters||{};}catch(_){return window.characters||{};}}
function getCurrentId(){try{return currentId||null;}catch(_){return null;}}
function getRoom(){try{return roomSession||null;}catch(_){return null;}}
function roomPlayers(){return (getRoom()?.players||[]).filter(p=>!p.isHost);}
function displayName(id){try{return characterDisplayName(id);}catch(_){return getCharacters()[id]?.name||id||'Personaggio';}}
function portrait(id){const c=getCharacters()[id];return c?.portrait||('assets/portraits/'+id+'.webp');}
function motionAllowed(){return !document.documentElement.classList.contains('v34-no-motion')&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}
function localStats(){try{return typeof loadGlobalStats==='function'?loadGlobalStats():{techniques:{},resources:{},selections:{}};}catch(_){return {techniques:{},resources:{},selections:{}};}}
function victories(){try{return typeof loadVictories==='function'?loadVictories():[];}catch(_){return [];}}
function accountName(){return window.JJKAccount?.getUsername?.()||localStorage.getItem('jjk_last_player_name')||'Stregone';}
function progressionHud(){
  const rawLevel=q('#v20HudLevel')?.textContent?.trim()||'';
  const rawTitle=q('#v20HudTitle')?.textContent?.trim()||'';
  const rawMeta=q('#v20HudMeta')?.textContent?.trim()||'';
  const level=parseInt(rawLevel,10);
  const xpMatch=rawMeta.match(/(\d[\d.]*)\s*XP/i);
  const xp=xpMatch?parseInt(xpMatch[1].replace(/\./g,''),10):null;
  const progress=parseFloat(q('#v20HudBar')?.style?.getPropertyValue('--p')||'');
  const validTitle=rawTitle&&!/progressione|sincronizzazione|attivare/i.test(rawTitle);
  return {
    level:Number.isFinite(level)&&level>0?level:null,
    title:validTitle?rawTitle:null,
    xp:Number.isFinite(xp)?xp:null,
    progress:Number.isFinite(progress)?Math.max(0,Math.min(100,progress)):null
  };
}

/* --------------------- Loading screen --------------------- */
function finishLoading(){
  if(typeof window.jjkFinishLoading==='function')return window.jjkFinishLoading();
  const el=$('v34Loading');if(!el||el.classList.contains('is-done'))return;el.classList.add('is-done');setTimeout(()=>el.remove(),850);
}
function initLoading(){
  $('v34LoadingSkip')?.addEventListener('click',finishLoading);
  const min=performance.now()+(motionAllowed()?1500:120);
  const done=()=>setTimeout(finishLoading,Math.max(0,min-performance.now()));
  if(document.readyState==='complete')done();else window.addEventListener('load',done,{once:true});
  setTimeout(finishLoading,3600);
}

/* --------------------- Home AAA --------------------- */
function injectHomeCinema(){
  const home=$('home');if(!home||$('v34HomeCinema'))return;
  const scene=document.createElement('div');scene.id='v34HomeCinema';scene.className='v34-home-cinema';scene.setAttribute('aria-hidden','true');
  scene.innerHTML='<div class="v34-home-rift"></div><div class="v34-home-fighter left" id="v34HomeFighter" style="--fighter-glow:#65d6ff"><img src="'+esc(portrait('gojo'))+'" alt=""></div><div class="v34-home-fighter right" style="--fighter-glow:#ff3e58"><img src="'+esc(portrait('sukuna'))+'" alt=""></div><div class="v34-home-focus"><small>Spotlight roster</small><b id="v34HomeFocusName">Satoru Gojo</b><span id="v34HomeFocusTitle">Lo Stregone Più Forte</span></div>';
  home.insertBefore(scene,home.firstChild);
}
function focusHomeCharacter(id){
  const meta=CHARS[id],character=getCharacters()[id],fighter=$('v34HomeFighter');if(!meta||!character||!fighter)return;
  const image=q('img',fighter);if(image&&image.getAttribute('src')!==portrait(id))image.src=portrait(id);
  fighter.style.setProperty('--fighter-glow',meta.color);
  if($('v34HomeFocusName'))$('v34HomeFocusName').textContent=character.name||displayName(id);
  if($('v34HomeFocusTitle'))$('v34HomeFocusTitle').textContent=meta.title;
  qa('[data-v34-roster]').forEach(button=>button.classList.toggle('is-focused',button.dataset.v34Roster===id));
}
function injectHomeRoster(){
  const card=q('#home .home-card-v2');if(!card)return;
  let roster=q('.v33-home-roster',card);
  if(!roster){
    roster=document.createElement('section');roster.className='v33-home-roster';
    const actions=q('.home-actions-grid',card);actions?.insertAdjacentElement('afterend',roster);
  }
  const chars=getCharacters();
  roster.innerHTML='<div class="v34-home-roster-title"><div><b>Roster rapido</b><span>Seleziona uno stregone</span></div><span>'+Object.keys(chars).length+' combattenti</span></div><div class="v33-roster-strip">'+Object.entries(chars).map(([id,c])=>'<button class="v33-roster-person" type="button" data-v34-roster="'+id+'" aria-label="Apri '+esc(c.name)+'" title="'+esc(CHARS[id]?.title||c.name)+'" style="--char-accent:'+(CHARS[id]?.color||'#65cbff')+';--char-glow:'+(CHARS[id]?.color||'#65cbff')+'55"><img src="'+esc(portrait(id))+'" alt="'+esc(c.name)+'" decoding="async"><span>'+esc(c.name)+'</span></button>').join('')+'</div>';
  if(roster.dataset.v34Bound!=='1'){
    roster.dataset.v34Bound='1';
    roster.addEventListener('click',e=>{const btn=e.target.closest('[data-v34-roster]');if(!btn)return;window.showScreen?.('selection');requestAnimationFrame(()=>window.openCharacterInfo?.(btn.dataset.v34Roster));playUi('confirm');});
    roster.addEventListener('pointerover',e=>{const btn=e.target.closest('[data-v34-roster]');if(btn)focusHomeCharacter(btn.dataset.v34Roster);});
    roster.addEventListener('focusin',e=>{const btn=e.target.closest('[data-v34-roster]');if(btn)focusHomeCharacter(btn.dataset.v34Roster);});
  }
  focusHomeCharacter(qa('[data-v34-roster]')[0]?.dataset.v34Roster||'gojo');
}
function injectProfileButton(){
  const actions=q('#home .home-actions-grid');if(!actions||q('.v34-profile-home-btn',actions))return;
  const btn=document.createElement('button');btn.type='button';btn.className='home-action v34-profile-home-btn';
  btn.innerHTML='<span class="home-action-icon">冠</span><span><b>Profilo stregone</b><small>Livello, titolo, trofei e statistiche personali</small></span>';
  btn.addEventListener('click',openProfile);actions.appendChild(btn);
}
function injectHomeCommand(){
  const card=q('#home .home-card-v2');if(!card)return;
  q('.v33-home-status',card)?.remove();
  let bar=q('.v34-home-command',card);if(!bar){bar=document.createElement('section');bar.className='v34-home-command';const footer=q('.home-footer-line',card);footer?.insertAdjacentElement('beforebegin',bar);}
  bar.innerHTML='<div class="v34-command-card"><small>Profilo</small><b id="v34HomeProfile">@'+esc(accountName())+'</b></div><div class="v34-command-card"><small>Livello</small><b id="v34HomeLevel">'+esc(q('#v20HudLevel')?.textContent||'1')+' · '+esc(q('#v20HudTitle')?.textContent||'Iniziato')+'</b></div><div class="v34-command-card"><small>Stanza</small><b id="v34HomeRoom">Nessuna stanza</b></div><button class="v34-command-card audio" type="button" id="v34HomeAudio"><small>Audio</small><b>Impostazioni sonore</b></button>';
  $('v34HomeAudio')?.addEventListener('click',toggleControlPanel);
  updateHomeCommand();
}
function updateHomeCommand(){
  const room=getRoom();
  if($('v34HomeProfile'))$('v34HomeProfile').textContent='@'+accountName();
  if($('v34HomeLevel')){const ph=progressionHud();$('v34HomeLevel').textContent=(ph.level||1)+' · '+(ph.title||'Iniziato');}
  if($('v34HomeRoom'))$('v34HomeRoom').textContent=room?(room.code||'------')+' · '+({lobby:'Lobby',selection:'Scelta personaggi',playing:'Partita attiva',ended:'Conclusa'}[room.phase]||'Attiva'):'Nessuna stanza';
}

/* --------------------- Auras --------------------- */
function auraMarkup(id){
  const meta=CHARS[id]||CHARS.gojo;let html='<i class="v34-aura-glow"></i>';
  if(!motionAllowed())return html;
  if(meta.fx==='infinity')html+='<i class="v34-aura-orbit"></i><i class="v34-aura-orbit o2"></i><i class="v34-aura-infinity"></i>';
  if(meta.fx==='slash')for(let i=0;i<4;i++)html+='<i class="v34-aura-slash" style="--r:'+(i*35-52)+'deg;--delay:'+(i*.38)+'s"></i>';
  if(meta.fx==='shadow')for(let i=0;i<5;i++)html+='<i class="v34-aura-shadow" style="--x:'+(8+i*20)+'%;--skew:'+(i%2?'-13deg':'13deg')+';--delay:'+(i*.42)+'s"></i>';
  if(meta.fx==='impact')html+='<i class="v34-aura-impact"></i><i class="v34-aura-impact i2"></i><i class="v34-aura-lightning l1"></i><i class="v34-aura-lightning l2"></i>';
  if(meta.fx==='orbs')for(let i=0;i<5;i++)html+='<i class="v34-aura-curse-orb" style="--i:'+i+';--delay:-'+(i*.74)+'s"></i>';
  if(meta.fx==='distort')html+='<i class="v34-aura-distort"></i><i class="v34-aura-distort" style="width:30%;animation-delay:-2s"></i>';
  if(meta.fx==='ember')for(let i=0;i<10;i++)html+='<i class="v34-aura-ember" style="--x:'+(8+i*9)+'%;--dx:'+(i%2?18:-16)+'px;--delay:'+(i*.23)+'s"></i>';
  if(meta.fx==='speed')for(let i=0;i<7;i++)html+='<i class="v34-aura-speed" style="--y:'+(14+i*12)+'%;--delay:'+(i*.22)+'s"></i>';
  if(meta.fx==='rika')html+='<i class="v34-aura-rika"></i><i class="v34-aura-rika-sigil" data-glyph="'+meta.glyph+'"></i><i class="v34-aura-katana"></i>';
  const particleCount=meta.fx==='impact'?10:meta.fx==='ember'?4:6;
  for(let i=0;i<particleCount;i++)html+='<i class="v34-aura-particle" style="--x:'+(10+(i*13)%82)+'%;--y:'+(18+(i*17)%68)+'%;--d:'+(2.5+(i%4)*.55)+'s;--delay:-'+(i*.31)+'s"></i>';
  return html;
}
function applyAura(host,id,force=false){
  if(!host||!id)return;host.classList.add('v34-aura-host');host.dataset.v34Character=id;
  let layer=q(':scope > .v34-aura-layer',host);if(!layer){layer=document.createElement('div');layer.className='v34-aura-layer';layer.setAttribute('aria-hidden','true');host.insertBefore(layer,host.firstChild);}
  const key=id+'|'+(motionAllowed()?'motion':'still');if(!force&&layer.dataset.v34AuraKey===key)return;layer.dataset.v34AuraKey=key;layer.innerHTML=auraMarkup(id);
}
function refreshAuras(force=false){
  const id=getCurrentId();if(id)applyAura(q('#player .hero'),id,force);
  const infoId=(typeof uiInfoCharacterId!=='undefined'&&uiInfoCharacterId)||id||'gojo';applyAura($('characterInfoStage'),infoId,force);
  const draftId=(typeof roomDraftCharacterId!=='undefined'&&roomDraftCharacterId)||id||'gojo';applyAura($('roomDraftStage'),draftId,force);
}

/* --------------------- Technique cinematic --------------------- */
function injectTechniqueCinematic(){
  if($('v34TechniqueCinematic'))return;
  const modal=document.createElement('div');modal.id='v34TechniqueCinematic';modal.setAttribute('aria-hidden','true');
  modal.innerHTML='<div class="v34-tech-backdrop"></div><div class="v34-tech-vignette"></div><div class="v34-tech-fx"></div><section class="v34-tech-card-stage" role="dialog" aria-modal="true" aria-labelledby="v34TechniqueTitle" tabindex="-1"><button class="v34-tech-x v34-tech-close" type="button" aria-label="Chiudi anteprima">✕</button><div class="v34-tech-image"><img alt="Tecnica"></div><div class="v34-tech-copy"><div class="v34-tech-kicker">Apertura tecnica · anteprima sicura</div><h2 id="v34TechniqueTitle">—</h2><div class="v34-tech-character">—</div><div class="v34-tech-meta"></div><p class="v34-tech-description"></p><p class="v34-tech-note"><strong>Nessun consumo:</strong> Vita, Energia, Vigore e risorse speciali restano invariati.</p><button class="v34-tech-close v34-tech-close-main" type="button">Chiudi anteprima</button></div></section>';
  document.body.appendChild(modal);
  const flash=document.createElement('div');flash.id='v34TechniqueUseFlash';flash.className='v34-tech-use-flash';document.body.appendChild(flash);
  modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('.v34-tech-close'))closeTechniquePreview();});
  modal.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeTechniquePreview();return;}
    if(e.key!=='Tab')return;
    const focusable=qa('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',modal);
    if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
}
function availableTechniques(){try{return current?.techniques?.filter(t=>typeof techniqueIsAvailable==='function'?techniqueIsAvailable(t):true)||[];}catch(_){return [];}}
function installTechniquePreviews(){
  const techniques=availableTechniques();
  qa('#techGrid .tech-card:not(.v25-body-card)').forEach((card,index)=>{
    const technique=techniques[index];if(!technique)return;card.dataset.v34TechniqueKey=technique.key;card.classList.add('v34-preview-ready');
    if(q('.v34-preview-btn',card))return;const btn=document.createElement('button');btn.type='button';btn.className='v34-preview-btn';btn.title='Apri anteprima senza consumare risorse';btn.setAttribute('aria-label','Anteprima di '+technique.name+', senza consumare risorse');btn.innerHTML='<span aria-hidden="true">◉</span><b>Anteprima</b>';btn.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();openTechniquePreview(card,technique,getCurrentId());});card.appendChild(btn);
  });
  let infoId=null;try{infoId=uiInfoCharacterId;}catch(_){}
  const infoTechniques=getCharacters()[infoId]?.techniques||[];
  qa('#characterInfoTechniques .info-tech-card').forEach((card,index)=>{
    const technique=infoTechniques[index];if(!technique)return;card.dataset.v34TechniqueKey=technique.key;card.classList.add('v34-preview-ready');
    if(q('.v34-preview-btn',card))return;const btn=document.createElement('button');btn.type='button';btn.className='v34-preview-btn info';btn.setAttribute('aria-label','Anteprima di '+technique.name+', senza consumare risorse');btn.innerHTML='<span aria-hidden="true">◉</span><b>Anteprima</b>';btn.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();openTechniquePreview(card,technique,infoId);});card.appendChild(btn);
  });
}
function openTechniquePreview(card,tech,characterId){
  injectTechniqueCinematic();const modal=$('v34TechniqueCinematic'),id=characterId||getCurrentId()||'gojo',meta=CHARS[id]||CHARS.gojo;
  const img=q('img',card)?.src||tech?.image||portrait(id),name=q('.tech-name,.info-tech-name',card)?.textContent||tech?.name||'Tecnica',cost=q('.tech-cost,.info-tech-cost',card)?.textContent||'Costo variabile',grade=q('.tech-grade-badge,.info-tech-grade',card)?.textContent||tech?.grade||'—';
  const description=tech?.effect||tech?.extra||'Tecnica pronta per essere consultata prima dell’utilizzo reale.';
  q('.v34-tech-backdrop',modal).style.backgroundImage='url("'+img.replace(/"/g,'%22')+'")';q('.v34-tech-image img',modal).src=img;q('.v34-tech-copy h2',modal).textContent=name;q('.v34-tech-character',modal).textContent=displayName(id)+' · '+meta.title;q('.v34-tech-description',modal).textContent=description;q('.v34-tech-meta',modal).innerHTML='<span>Grado '+esc(grade)+'</span><span>'+esc(cost)+'</span><span>Modalità anteprima</span>';
  modal.style.setProperty('--aura',meta.color);modal.dataset.v34Character=id;const fx=q('.v34-tech-fx',modal);fx.innerHTML=motionAllowed()?'<div class="v34-aura-layer">'+auraMarkup(id)+'</div>':'';
  ui.previewFocus=document.activeElement;modal.classList.add('show');modal.setAttribute('aria-hidden','false');document.body.classList.add('v34-preview-open');requestAnimationFrame(()=>q('.v34-tech-card-stage',modal)?.focus());playUi('domain');
}
function closeTechniquePreview(){const modal=$('v34TechniqueCinematic');if(!modal||!modal.classList.contains('show'))return;modal.classList.remove('show');modal.setAttribute('aria-hidden','true');document.body.classList.remove('v34-preview-open');const focus=ui.previewFocus;ui.previewFocus=null;if(focus?.isConnected)focus.focus({preventScroll:true});}
function techniqueUseFlash(card){if(!motionAllowed())return;const id=getCurrentId()||'gojo',flash=$('v34TechniqueUseFlash');if(!flash)return;flash.style.setProperty('--flash',CHARS[id]?.color||'#64cfff');flash.classList.remove('play');void flash.offsetWidth;flash.classList.add('play');setTimeout(()=>flash.classList.remove('play'),720);if(card){card.classList.remove('v34-tech-activated');void card.offsetWidth;card.classList.add('v34-tech-activated');}}
function installTechniqueEffectBridge(){
  const previous=window.playTechniqueEffect;if(typeof previous!=='function'||previous.__v35Bridge)return;
  const wrapped=function(tech){if(!motionAllowed())return;const result=previous.apply(this,arguments);const key=String(tech?.key||''),card=key?qa('#techGrid .tech-card[data-v34-technique-key]').find(el=>el.dataset.v34TechniqueKey===key):null;techniqueUseFlash(card);return result;};
  wrapped.__v35Bridge=true;window.playTechniqueEffect=wrapped;
}

/* --------------------- Profile --------------------- */
function injectProfileScreen(){
  if($('v34Profile'))return;
  const main=document.createElement('main');main.id='v34Profile';main.className='screen page v34-profile-screen';
  main.innerHTML='<section class="wrap v34-profile-wrap"><div class="topbar"><button class="back" type="button" id="v34ProfileBack">←</button><h2 class="title">Profilo stregone</h2><button class="gm-room-shortcut" type="button" id="v34ProfileStats">Statistiche complete</button></div><div id="v34ProfileContent"></div></section>';
  document.body.insertBefore(main,$('roomTurnLock')||null);
  $('v34ProfileBack').addEventListener('click',()=>window.showScreen?.('home'));
  $('v34ProfileStats').addEventListener('click',()=>window.openStatistics?.());
}
function profileData(){
  const stats=localStats(),wins=victories(),techs=Object.values(stats.techniques||{}),uses=techs.reduce((s,x)=>s+(Number(x.count)||0),0),resources=Object.values(stats.resources||{}),spent=resources.reduce((s,x)=>s+(Number(x.spent)||0),0),recovered=resources.reduce((s,x)=>s+(Number(x.recovered)||0),0),selections=Object.values(stats.selections||{}).reduce((s,x)=>s+(Number(x)||0),0);
  const cloud=window.jjkCloudStatsState?.personal||{},totals=cloud.totals||{},favorite=cloud.favorite_character||{};
  const progressionPack=window.JJKV20?.getProgression?.()||{},progression=progressionPack.progression||{},achievements=Array.isArray(progressionPack.achievements)?progressionPack.achievements:[];
  const matches=Number(progression.matches??totals.matches??wins.length),cloudWins=Number(progression.wins??totals.wins??wins.length),cloudUses=Number(progression.techniques_used??totals.techniques_used??uses),time=Number(progression.total_play_seconds??totals.total_play_seconds??0);
  const ph=progressionHud(),hudLevel=ph.level,hudTitle=ph.title;
  const fallbackXp=matches*60+cloudWins*120+cloudUses*3+Math.floor(time/60);
  const xp=Number(progression.xp??ph.xp??fallbackXp);const level=Number(progression.level??hudLevel??Math.max(1,Math.floor(Math.sqrt(xp/120))+1));const start=120*(level-1)*(level-1),next=120*level*level,progress=Number.isFinite(Number(progression.progress_percent))?Math.max(0,Math.min(100,Number(progression.progress_percent))):(Number.isFinite(ph.progress)?ph.progress:Math.max(0,Math.min(100,100*(xp-start)/Math.max(1,next-start))));
  const title=progression.title||hudTitle||(level>=20?'Classe Speciale':level>=12?'Stregone d’Elite':level>=7?'Stregone di Grado 1':level>=3?'Apprendista Jujutsu':'Iniziato');
  let favId=favorite.character_id||favorite.id||Object.entries(stats.selections||{}).sort((a,b)=>b[1]-a[1])[0]?.[0]||getCurrentId()||'gojo';if(!getCharacters()[favId])favId='gojo';
  return {stats,wins,uses:cloudUses,spent,recovered,selections,matches,winsCount:cloudWins,time,xp,level,progress,title,favId,achievements,achievementsUnlocked:Number(progression.achievements_unlocked??achievements.filter(a=>a.unlocked).length),achievementsTotal:Number(progression.achievements_total??achievements.length)};
}
function formatTime(s){s=Math.max(0,Math.floor(Number(s)||0));const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h?h+'h '+m+'m':m?m+'m':s+'s';}
function trophiesFor(d){
  if(d.achievements.length){
    return [...d.achievements].sort((a,b)=>Number(b.unlocked)-Number(a.unlocked)||Number(b.progress||0)/Math.max(1,Number(b.threshold||1))-Number(a.progress||0)/Math.max(1,Number(a.threshold||1))).slice(0,9).map(a=>({icon:a.icon||'✦',name:a.name||'Trofeo',desc:a.description||('Progresso '+(a.progress||0)+' / '+(a.threshold||0)),ok:!!a.unlocked}));
  }
  const allChars=Object.keys(getCharacters()).length,unique=Object.keys(d.stats.selections||{}).filter(k=>d.stats.selections[k]>0).length;
  return [
    {icon:'⚔',name:'Primo combattimento',desc:'Completa o registra la prima partita.',ok:d.matches>=1},
    {icon:'冠',name:'Prima vittoria',desc:'Ottieni la prima vittoria ufficiale.',ok:d.winsCount>=1},
    {icon:'術',name:'Maestro delle tecniche',desc:'Utilizza almeno 25 tecniche.',ok:d.uses>=25},
    {icon:'⚡',name:'Energia senza limiti',desc:'Consuma almeno 100 punti risorsa.',ok:d.spent>=100},
    {icon:'人',name:'Conoscitore del roster',desc:'Gioca con tutti i personaggi.',ok:unique>=allChars},
    {icon:'∞',name:'Veterano',desc:'Partecipa ad almeno 20 partite.',ok:d.matches>=20}
  ];
}
function renderProfile(){
  injectProfileScreen();const root=$('v34ProfileContent');if(!root)return;const d=profileData(),chars=getCharacters(),fav=chars[d.favId]||chars.gojo,trophies=trophiesFor(d),unlocked=d.achievementsTotal?d.achievementsUnlocked:trophies.filter(t=>t.ok).length,total=d.achievementsTotal||trophies.length;
  const favRows=Object.entries(d.stats.selections||{}).sort((a,b)=>b[1]-a[1]).slice(0,5);
  root.innerHTML='<section class="v34-profile-hero"><div class="v34-profile-avatar"><img src="'+esc(portrait(d.favId))+'" alt="'+esc(fav?.name||'Personaggio')+'"><div class="v34-profile-level-ring"><small>Livello</small>'+d.level+'</div></div><div><div class="v34-profile-kicker">Identità Jujutsu</div><h1 class="v34-profile-name">@'+esc(accountName())+'</h1><div class="v34-profile-title">'+esc(d.title)+' · Personaggio preferito: '+esc(fav?.name||displayName(d.favId))+'</div><div class="v34-profile-progress-label"><span>'+d.xp+' XP complessivi</span><span>'+Math.round(d.progress)+'% verso il prossimo livello</span></div><div class="v34-profile-progress"><i style="width:'+d.progress+'%"></i></div><div class="v34-profile-actions"><button class="primary" type="button" id="v34OpenProgression">Apri progressione cloud</button><button type="button" id="v34RefreshProfile">Aggiorna profilo</button></div></div><div class="v34-profile-rank"><span>冠</span><b>'+esc(d.title)+'</b><small>'+unlocked+' / '+total+' trofei'+(d.achievementsTotal?' cloud':' locali')+'</small></div></section>'+
  '<section class="v34-profile-kpis"><div class="v34-profile-kpi"><span>Partite</span><b>'+d.matches+'</b></div><div class="v34-profile-kpi"><span>Vittorie</span><b>'+d.winsCount+'</b></div><div class="v34-profile-kpi"><span>Tecniche</span><b>'+d.uses+'</b></div><div class="v34-profile-kpi"><span>Risorsa spesa</span><b>'+d.spent+'</b></div><div class="v34-profile-kpi"><span>Tempo giocato</span><b>'+formatTime(d.time)+'</b></div></section>'+
  '<section class="v34-profile-grid"><article class="v34-profile-panel"><div class="v34-panel-head"><div><span>Collezione personale</span><h3>Trofei e obiettivi</h3></div><small>'+(d.achievementsTotal?'In evidenza dal profilo cloud.':'Obiettivi salvati su questo dispositivo.')+'</small></div><div class="v34-trophy-grid">'+trophies.map(t=>'<div class="v34-trophy '+(t.ok?'':'locked')+'"><span class="v34-trophy-state">'+(t.ok?'Sbloccato':'Bloccato')+'</span><div class="v34-trophy-icon">'+esc(t.icon)+'</div><b>'+esc(t.name)+'</b><small>'+esc(t.desc)+'</small></div>').join('')+'</div></article><article class="v34-profile-panel"><div class="v34-panel-head"><div><span>Affinità</span><h3>Personaggi più utilizzati</h3></div><small>'+d.selections+' selezioni registrate</small></div><div class="v34-favorite-list">'+(favRows.length?favRows.map(([id,count])=>'<div class="v34-favorite-row"><img src="'+esc(portrait(id))+'" alt=""><div><b>'+esc(displayName(id))+'</b><small>'+esc(CHARS[id]?.title||'Combattente Jujutsu')+'</small></div><strong>'+count+'×</strong></div>').join(''):'<div class="stats-empty">Gioca una partita per costruire il tuo profilo.</div>')+'</div></article></section>';
  $('v34OpenProgression')?.addEventListener('click',()=>{window.openStatistics?.();setTimeout(()=>window.setCloudStatsView?.('progression'),100);});$('v34RefreshProfile')?.addEventListener('click',()=>{window.refreshCloudStatistics?.();window.JJKV20?.loadProgression?.();setTimeout(renderProfile,500);});
}
function openProfile(){window.JJKV20?.loadProgression?.(true);renderProfile();window.showScreen?.('v34Profile');setTimeout(renderProfile,500);playUi('confirm');}

/* --------------------- Audio and settings --------------------- */
function playUi(name){try{window.JJKSfx?.play?.(name);}catch(_){}}
function injectControlDock(){
  if($('v34ControlDock'))return;const dock=document.createElement('div');dock.id='v34ControlDock';dock.innerHTML='<section id="v34ControlPanel" class="v34-control-panel" aria-hidden="true"><div class="v34-control-head"><h4>Controlli esperienza</h4><button type="button" id="v34ControlClose" aria-label="Chiudi impostazioni">✕</button></div><div class="v34-setting-row"><div><b>Effetti sonori</b><small>Pulsanti, tecniche e conferme</small></div><button type="button" id="v34SfxSwitch" class="v34-switch" role="switch"><i></i></button></div><div class="v34-setting-row"><div><b>Volume effetti</b><small>Preferenza salvata sul dispositivo</small></div><input id="v34SfxVolume" class="v34-volume" type="range" min="0" max="100" value="80" aria-label="Volume effetti sonori"></div><div class="v34-setting-row"><div><b>Musica dinamica</b><small>Cambia con schermata e personaggio</small></div><button type="button" id="v34MusicSwitch" class="v34-switch" role="switch"><i></i></button></div><div class="v34-setting-row"><div><b>Volume musica</b><small>Preferenza salvata sul dispositivo</small></div><input id="v34MusicVolume" class="v34-volume" type="range" min="0" max="100" value="24" aria-label="Volume musica"></div><div class="v34-setting-row"><div><b>Animazioni</b><small id="v34MotionHint">Aure, transizioni ed effetti</small></div><button type="button" id="v34MotionSwitch" class="v34-switch" role="switch"><i></i></button></div></section><button type="button" id="v34ControlLauncher" class="v34-dock-btn" aria-label="Controlli audio e animazioni" aria-expanded="false">⚙</button>';
  document.body.appendChild(dock);
  $('v34ControlLauncher').addEventListener('click',toggleControlPanel);$('v34ControlClose').addEventListener('click',toggleControlPanel);
  $('v34SfxSwitch').addEventListener('click',()=>{const next=!window.JJKSfx?.isEnabled?.();window.JJKSfx?.setEnabled?.(next);syncControlPanel();if(next)playUi('toggle');});
  $('v34SfxVolume').addEventListener('input',e=>window.JJKSfx?.setVolume?.(Number(e.target.value)/100));
  $('v34MusicSwitch').addEventListener('click',()=>{const next=!window.JJKV20?.isMusicEnabled?.();window.JJKV20?.setMusicEnabled?.(next);setTimeout(syncControlPanel,100);});
  $('v34MusicVolume').addEventListener('input',e=>window.JJKV20?.setMusicVolume?.(Number(e.target.value)/100));
  $('v34MotionSwitch').addEventListener('click',()=>{const wasDisabled=document.documentElement.classList.contains('v34-no-motion');document.documentElement.classList.toggle('v34-no-motion',!wasDisabled);localStorage.setItem('jjk_v34_motion',wasDisabled?'1':'0');qa('#home .home-card-v2,.v14-tilt-card').forEach(el=>{el.style.removeProperty('transform');el.style.removeProperty('--tilt-x');el.style.removeProperty('--tilt-y');el.classList.remove('v14-tilting','v14-tilt');});refreshAuras(true);if(!wasDisabled)closeTechniquePreview();syncControlPanel();});
  if(localStorage.getItem('jjk_v34_motion')==='0')document.documentElement.classList.add('v34-no-motion');syncControlPanel();
}
function toggleControlPanel(){injectControlDock();const panel=$('v34ControlPanel'),open=panel?.classList.toggle('show');panel?.setAttribute('aria-hidden',open?'false':'true');$('v34ControlLauncher')?.setAttribute('aria-expanded',open?'true':'false');syncControlPanel();playUi('toggle');}
function syncControlPanel(){
  const systemReduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,sfx=window.JJKSfx?.isEnabled?.()!==false,music=window.JJKV20?.isMusicEnabled?.()??localStorage.getItem('jjk_v20_music_enabled')==='1',motion=motionAllowed();
  [['v34SfxSwitch',sfx],['v34MusicSwitch',music],['v34MotionSwitch',motion]].forEach(([id,on])=>{const el=$(id);el?.classList.toggle('on',on);el?.setAttribute('aria-checked',on?'true':'false');});
  if($('v34MotionSwitch')){$('v34MotionSwitch').disabled=systemReduced;$('v34MotionSwitch').title=systemReduced?'La riduzione del movimento è attiva nelle impostazioni del sistema.':'';}
  if($('v34MotionHint'))$('v34MotionHint').textContent=systemReduced?'Riduzione movimento richiesta dal sistema':'Aure, transizioni ed effetti';
  if($('v34SfxVolume'))$('v34SfxVolume').value=Math.round((window.JJKSfx?.getVolume?.()??.8)*100);
  if($('v34MusicVolume'))$('v34MusicVolume').value=Math.round((window.JJKV20?.getMusicVolume?.()??.24)*100);
}

/* --------------------- Lobby immersive --------------------- */
function injectLobbyStage(){
  const wrap=q('#rooms .rooms-wrap'),setup=$('roomSetup');if(!wrap||!setup)return;
  q('#v33RoomsHero')?.remove();let stage=$('v34LobbyStage');if(!stage){stage=document.createElement('section');stage.id='v34LobbyStage';stage.className='v34-lobby-stage';wrap.insertBefore(stage,setup);}
  if(stage.dataset.v34Ready!=='1'){stage.dataset.v34Ready='1';stage.innerHTML='<div class="v34-lobby-copy"><div class="v34-lobby-kicker">Connessione Jujutsu</div><h3>Forma la squadra. Scegli il roster. Avvia lo scontro.</h3><p>Codice, fase, connessioni e personaggi scelti vengono aggiornati in tempo reale.</p><div class="v34-lobby-steps"><div class="v34-lobby-step"><span>1</span><b>Entra nella stanza</b><small>Crea o usa il codice del Game Master</small></div><div class="v34-lobby-step"><span>2</span><b>Scegli il personaggio</b><small>Ogni combattente può essere scelto una volta</small></div><div class="v34-lobby-step"><span>3</span><b>Inizia la partita</b><small>Turni e risorse restano sincronizzati</small></div></div></div><aside class="v34-lobby-status"><div class="v34-lobby-status-head"><small>Stato connessione</small><span id="v34LobbyPhase" class="v34-lobby-phase">Offline</span></div><b id="v34LobbyCode" class="v34-lobby-code">OFFLINE</b><p id="v34LobbyState">Nessuna stanza attiva.</p><div id="v34LobbySlots" class="v34-lobby-slots"></div></aside>';}
  updateLobbyStage();
}
function updateLobbyStage(){
  const code=$('v34LobbyCode'),state=$('v34LobbyState'),slots=$('v34LobbySlots'),phase=$('v34LobbyPhase');if(!code||!state||!slots)return;const room=getRoom(),all=room?.players||[],online=all.filter(p=>p.connected!==false).length,max=Math.max(1,Number(room?.maxPlayers)||8),phaseLabel={lobby:'Lobby',selection:'Selezione',playing:'In partita',ended:'Conclusa'};
  if(!room){code.textContent='OFFLINE';state.textContent='Nessuna stanza attiva. Crea una lobby o inserisci un codice.';if(phase)phase.textContent='Offline';}else{code.textContent=room.code||'------';state.textContent=all.length+' / '+max+' slot occupati · '+online+' online';if(phase)phase.textContent=phaseLabel[room.phase]||'Attiva';}
  slots.innerHTML=Array.from({length:max},(_,i)=>{const p=all[i];if(!p)return '<div class="v34-lobby-slot"><span>＋</span><b>Slot '+(i+1)+'</b></div>';return '<div class="v34-lobby-slot ready '+(p.connected===false?'offline':'')+'">'+(p.characterId?'<img src="'+esc(portrait(p.characterId))+'" alt="">':'<span>'+(p.isHost?'GM':'…')+'</span>')+'<b>'+esc(p.name||'Giocatore')+'</b><small>'+(p.isHost?'Game Master':p.characterId?esc(displayName(p.characterId)):'In scelta')+'</small></div>';}).join('');
}

/* --------------------- GM redesign --------------------- */
function injectGMSpotlight(){
  const center=q('#gameMaster .gm-command-center');if(!center||$('v34GMSpotlight'))return;const section=document.createElement('section');section.id='v34GMSpotlight';section.className='v34-gm-spotlight';center.insertAdjacentElement('afterend',section);updateGMSpotlight();
}
function updateGMSpotlight(){
  const root=$('v34GMSpotlight');if(!root)return;const room=getRoom(),players=roomPlayers(),activePlayers=players.filter(p=>!p.locked),active=activePlayers[0],critical=players.filter(p=>p.state&&Number(p.state.life)<=2).length,offline=players.filter(p=>p.connected===false).length,ready=players.filter(p=>p.characterId&&p.state).length,events=room?.settings?.events||{},eventLabel=events.boss_rush?.active?'Boss Rush':events.double_exp?.active?'Doppi EXP · '+(events.double_exp.rounds_remaining||0)+' giri':'Nessun evento';
  const activeStatus=activePlayers.length>1?'Anomalia: '+activePlayers.length+' turni attivi':active?esc(displayName(active.characterId))+' · '+esc(active.state?.gradeId||'G4'):'Assegna il turno dalla gestione giocatori';
  const signature=JSON.stringify({active:activePlayers.map(p=>[p.peerId||p.playerToken,p.name,p.characterId,p.state?.gradeId]),critical,offline,ready,eventLabel});
  if(root.dataset.v34Signature===signature)return;root.dataset.v34Signature=signature;
  root.classList.toggle('has-turn-conflict',activePlayers.length>1);
  root.innerHTML='<article class="v34-gm-active"><div class="v34-gm-active-avatar" style="--active-accent:'+(CHARS[active?.characterId]?.color||'#65d6ff')+'">'+(active?.characterId?'<img src="'+esc(portrait(active.characterId))+'" alt="">':'<span>—</span>')+'</div><div><small>'+(activePlayers.length>1?'Controllo turni richiesto':'Turno attivo')+'</small><b>'+(activePlayers.length>1?activePlayers.map(p=>esc(p.name)).join(' · '):(active?esc(active.name):'Nessun giocatore'))+'</b><span>'+activeStatus+'</span></div><button type="button" id="v34GMOpenPlayers">Gestisci</button></article><article class="v34-gm-health"><div class="v34-gm-health-head"><small>Stato della partita</small><b>'+esc(eventLabel)+'</b></div><div class="v34-gm-health-grid"><div><b>'+ready+'</b><span>Pronti</span></div><div><b>'+critical+'</b><span>Vita critica</span></div><div><b>'+offline+'</b><span>Offline</span></div></div></article>';
  $('v34GMOpenPlayers')?.addEventListener('click',()=>window.gmSetView?.('players'));
}

/* --------------------- Value animations --------------------- */
function observeValues(){
  ['lifeValue','energyValue','expValue','combatBonusValue','gmPlayerCount','gmGameTimer'].forEach(id=>{const el=$(id);if(!el||el.dataset.v34Observed)return;el.dataset.v34Observed='1';new MutationObserver(()=>{el.classList.remove('v34-value-pop');void el.offsetWidth;el.classList.add('v34-value-pop');}).observe(el,{childList:true,characterData:true,subtree:true});});
}

/* --------------------- Wrappers --------------------- */
function wrap(name,after){
  const previous=window[name];if(typeof previous!=='function'||previous.__v34Wrapped)return;
  const wrapped=function(){const result=previous.apply(this,arguments);safe(name,()=>after.apply(this,arguments));return result;};wrapped.__v34Wrapped=true;window[name]=wrapped;
}
function installWrappers(){
  wrap('showScreen',function(id){ui.lastScreen=id;setTimeout(()=>{if(id==='home')updateHomeCommand();if(id==='v34Profile')renderProfile();if(id==='rooms'){injectLobbyStage();updateLobbyStage();}if(id==='gameMaster'){injectGMSpotlight();updateGMSpotlight();}if(id==='selection'||id==='player')installTechniquePreviews();refreshAuras();observeValues();},30);});
  wrap('renderTechniques',function(){installTechniquePreviews();refreshAuras();});
  wrap('renderCharacterInfo',function(){setTimeout(()=>{refreshAuras();installTechniquePreviews();},0);});
  wrap('renderRoomDraftSelection',function(){setTimeout(refreshAuras,0);});
  wrap('openCharacter',function(){setTimeout(()=>{refreshAuras();installTechniquePreviews();},20);});
  wrap('renderRoomUI',function(){updateLobbyStage();updateHomeCommand();});
  wrap('renderGMDashboard',function(){updateGMSpotlight();updateHomeCommand();});
}

/* --------------------- Update card and diagnostics --------------------- */
function injectUpdateCard(){
  const wrap=q('#updates .updates-wrap'),top=q('#updates .topbar');if(!wrap||!top||$('v34UpdateCard'))return;const card=document.createElement('div');card.id='v34UpdateCard';card.className='updates-card';card.innerHTML='<div class="update-version">V35 · Cinematic Nexus</div><h3>Esperienza cinematografica, stabile e più leggera</h3><p>Home AAA senza carosello 3D in background, nove aure realmente distinte, anteprime tecniche sicure, profilo collegato alla progressione cloud, spotlight Game Master, lobby immersiva, volumi separati e animazioni disattivabili anche a livello logico.</p>';top.insertAdjacentElement('afterend',card);
}
function health(){return {version:VERSION,screen:q('.screen.active')?.id||null,overflow:document.documentElement.scrollWidth>innerWidth+3,missingImages:qa('img').filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.getAttribute('src')).filter(Boolean),systems:{characters:Object.keys(getCharacters()).length,room:!!getRoom(),profile:!!$('v34Profile'),cinematic:!!$('v34TechniqueCinematic'),audio:!!window.JJKSfx}};}

function init(){
  document.title='JJK Energy V35 · Cinematic Nexus';
  [initLoading,injectHomeCinema,injectHomeRoster,injectProfileButton,injectHomeCommand,injectProfileScreen,injectTechniqueCinematic,injectControlDock,injectLobbyStage,injectGMSpotlight,injectUpdateCard,installTechniqueEffectBridge,installWrappers,refreshAuras,installTechniquePreviews,observeValues].forEach(fn=>safe(fn.name,fn));
  setTimeout(()=>{safe('lateRefresh',()=>{injectHomeRoster();injectHomeCommand();refreshAuras();installTechniquePreviews();updateLobbyStage();updateGMSpotlight();syncControlPanel();renderProfile();});},900);
  window.addEventListener('jjk-account-ready',()=>{updateHomeCommand();renderProfile();});window.addEventListener('jjk-account-changed',()=>{updateHomeCommand();renderProfile();});window.addEventListener('jjk:cloudstats',()=>renderProfile());
  window.JJKV34={version:VERSION,health,openProfile,renderProfile,openTechniquePreview,toggleControls:toggleControlPanel,refreshAuras};
  window.JJKV35=window.JJKV34;
  console.info('JJK Energy V35 Cinematic Nexus ready',VERSION);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
