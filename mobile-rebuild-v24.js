/* JJK Energy V24 - mobile player e Game Master ricostruiti */
(function(){
'use strict';
const TAB_KEY='jjk_mobile_player_tab_v24';
const TABS=new Set(['sheet','techniques','resources','log']);
let drawerToken='';
let drawerBusy=false;
let techniqueRepairing=false;

function isNarrow(){return window.matchMedia('(max-width:900px)').matches;}
function isMobileMode(){return isNarrow()||document.body.classList.contains('mobile-layout');}
function activeScreenId(){return document.querySelector('.screen.active')?.id||'';}
function getPlayer(){return document.getElementById('player');}
function esc(v){try{return typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}catch(e){return String(v??'');}}
function portrait(id){try{return (typeof mcPortrait==='function'?mcPortrait(id):characters?.[id]?.portrait||characters?.[id]?.image)||'';}catch(e){return '';}}
function charName(id){try{return typeof characterDisplayName==='function'?characterDisplayName(id):(characters?.[id]?.name||'Personaggio');}catch(e){return 'Personaggio';}}

function markMobileState(){
  const mobile=isMobileMode(),screen=activeScreenId();
  document.body.classList.toggle('v24-mobile-ui',mobile);
  document.body.classList.toggle('v24-mobile-player',mobile&&screen==='player');
  document.body.classList.toggle('v24-mobile-gm',mobile&&screen==='gameMaster');
  syncPlayerControl();
  if(mobile&&screen==='gameMaster')decorateGM();
}

function ensurePlayerControl(){
  const player=getPlayer();if(!player)return null;
  let box=document.getElementById('mobileV24PlayerControl');
  if(!box){
    box=document.createElement('section');box.id='mobileV24PlayerControl';box.className='mobile-v24-player-control';
    box.innerHTML='<div id="mobileV24TurnRow" class="mobile-v24-turn-row"><div class="mobile-v24-turn-copy"><b id="mobileV24TurnTitle">Stato del turno</b><small id="mobileV24TurnText">In attesa della stanza</small></div><button id="mobileV24Pass" class="mobile-v24-pass" type="button">Passa il turno</button></div><nav class="mobile-v24-tabs" aria-label="Sezioni della scheda"><button type="button" data-v24-tab="sheet"><span class="ico">⌂</span><span>Scheda</span></button><button type="button" data-v24-tab="techniques"><span class="ico">術</span><span>Tecniche</span><span id="mobileV24TechniqueCount" class="mobile-v24-count">0</span></button><button type="button" data-v24-tab="resources"><span class="ico">✦</span><span>Risorse</span></button><button type="button" data-v24-tab="log"><span class="ico">⌁</span><span>Movimenti</span></button></nav>';
    const topbar=player.querySelector('.topbar');topbar?.insertAdjacentElement('afterend',box);
    box.addEventListener('click',e=>{
      const tab=e.target.closest('[data-v24-tab]');if(tab){setPlayerTab(tab.dataset.v24Tab,true);return;}
      if(e.target.closest('#mobileV24Pass')&&typeof playerPassTurn==='function')playerPassTurn();
    });
  }
  const grade=document.getElementById('gradeRow');grade?.parentElement?.classList.add('v24-grade-block');
  return box;
}

function defaultTab(){
  let saved='';try{saved=localStorage.getItem(TAB_KEY)||'';}catch(e){}if(TABS.has(saved))return saved;
  try{if(roomSession?.phase==='playing'&&!roomSession?.isHost)return 'techniques';}catch(e){}
  return 'sheet';
}
function setPlayerTab(tab,persist){
  if(!TABS.has(tab))tab='sheet';
  const p=getPlayer();if(!p)return;
  p.dataset.v24Panel=tab;
  if(persist)try{localStorage.setItem(TAB_KEY,tab);}catch(e){}
  ensurePlayerControl()?.querySelectorAll('[data-v24-tab]').forEach(b=>b.classList.toggle('active',b.dataset.v24Tab===tab));
  if(tab==='techniques')ensureTechniques();
  if(tab==='log'){const d=document.getElementById('playerMovementDropdown');if(d)d.open=true;}
  if(persist&&isMobileMode()&&activeScreenId()==='player')window.scrollTo({top:0,behavior:'smooth'});
}
function ensureTechniques(){
  const details=document.getElementById('gameMovesDropdown');if(details)details.open=true;
  const grid=document.getElementById('techGrid');if(!grid)return;
  let count=grid.querySelectorAll('.tech-card').length;
  if(!count&&!techniqueRepairing&&typeof renderTechniques==='function'&&typeof current!=='undefined'&&current){
    techniqueRepairing=true;
    try{renderTechniques();}catch(e){}
    setTimeout(()=>{techniqueRepairing=false;ensureTechniques();},40);
    return;
  }
  count=grid.querySelectorAll('.tech-card').length;
  document.getElementById('mobileV24TechniqueCount')?.replaceChildren(document.createTextNode(String(count)));
  const gameCount=document.getElementById('gameMoveCount');if(gameCount)gameCount.textContent=String(count);
  grid.querySelectorAll('.v24-tech-empty').forEach(x=>x.remove());
  if(!count&&typeof current!=='undefined'&&current){const empty=document.createElement('div');empty.className='v24-tech-empty';empty.textContent='Nessuna tecnica disponibile per il grado attuale. Aumenta gli EXP per sbloccare le tecniche successive.';grid.appendChild(empty);}
}
function syncPass(){
  const box=ensurePlayerControl(),row=document.getElementById('mobileV24TurnRow'),btn=document.getElementById('mobileV24Pass');if(!box||!row||!btn)return;
  let me=null;try{me=typeof getLocalRoomPlayer==='function'?getLocalRoomPlayer():null;}catch(e){}
  const playing=!!(typeof roomSession!=='undefined'&&roomSession&&!roomSession.isHost&&roomSession.phase==='playing'&&me);
  row.classList.toggle('show',playing);
  if(!playing)return;
  const locked=!!me.locked;
  btn.disabled=locked;
  btn.textContent=locked?'Turno terminato':'Passa il turno';
  const title=document.getElementById('mobileV24TurnTitle'),text=document.getElementById('mobileV24TurnText');
  if(title)title.textContent=locked?'Non è il tuo turno':'È il tuo turno';
  if(text){let active='';try{active=(roomSession.players||[]).find(p=>!p.isHost&&!p.locked)?.name||'';}catch(e){}text.textContent=locked?(active?'Sta giocando '+active:'Attendi il giocatore successivo'):'Usa le tecniche e poi passa il turno';}
  const original=document.getElementById('passTurnBtn');if(original)original.style.display='none';
}
function syncPlayerControl(){
  const box=ensurePlayerControl();if(!box)return;
  const active=isMobileMode()&&activeScreenId()==='player';
  box.style.display=active?'block':'none';
  if(active){const p=getPlayer();if(!TABS.has(p.dataset.v24Panel))setPlayerTab(defaultTab(),false);else setPlayerTab(p.dataset.v24Panel,false);ensureTechniques();syncPass();}
}

function playerFields(p){
  try{const rows=roomSpecialFieldOptions(p);if(Array.isArray(rows)&&rows.length)return rows;}catch(e){}
  const list=[['life','Vita'],['energy',p?.characterId==='toji'?'Vigore':'Energia'],['exp','EXP'],['combatBonus','Bonus Combattimento']];
  if(p?.characterId==='geto')list.push(['tokens','Segnalini Maledetti'],['getoOneUse','Corpo monouso']);
  if(p?.characterId==='jogo')list.push(['jogoHeat','Calore']);
  if(p?.characterId==='toji')list.push(['tojiCollectedEnergy','Energia raccolta']);
  if(p?.characterId==='itadori')list.push(['itadoriFingers','Dita di Sukuna'],['itadoriOneUse','Corpo Choso']);
  if(p?.characterId==='yuta')list.push(['yutaCopiedTokens','Segnalini copiati'],['yutaCopiedVigor','Vigore copiato'],['yutaCopiedFingers','Dita copiate'],['yutaCopiedHeat','Calore copiato']);
  return list;
}
function fieldValue(p,field){const s=p?.state||{};return Number(s[field])||0;}
function fieldLabel(p,field){return playerFields(p).find(x=>x[0]===field)?.[1]||field;}
function getRoomPlayer(token){try{return typeof roomFindPlayer==='function'?roomFindPlayer(token):null;}catch(e){return null;}}

function ensureDrawer(){
  let d=document.getElementById('mobileV24GMDrawer');if(d)return d;
  d=document.createElement('div');d.id='mobileV24GMDrawer';d.className='mobile-v24-gm-resource-drawer';d.setAttribute('aria-hidden','true');
  d.innerHTML='<section class="mobile-v24-gm-resource-card" role="dialog" aria-modal="true" aria-labelledby="mobileV24GMTitle"><div class="mobile-v24-gm-resource-head"><img id="mobileV24GMAvatar" alt=""><div><h3 id="mobileV24GMTitle">Gestisci risorse</h3><p id="mobileV24GMMeta"></p></div><button class="mobile-v24-gm-close" type="button" aria-label="Chiudi">×</button></div><label class="mobile-v24-gm-field"><span>Risorsa</span><select id="mobileV24GMField"></select></label><div class="mobile-v24-gm-current"><span>Valore attuale</span><b id="mobileV24GMCurrent">0</b></div><div class="mobile-v24-gm-quick"><button class="mobile-v24-gm-minus" data-v24-delta="-5">−5</button><button class="mobile-v24-gm-minus" data-v24-delta="-1">−1</button><button class="mobile-v24-gm-plus" data-v24-delta="1">+1</button><button class="mobile-v24-gm-plus" data-v24-delta="5">+5</button></div><label class="mobile-v24-gm-field"><span>Quantità personalizzata</span><input id="mobileV24GMAmount" type="number" inputmode="numeric" min="1" step="1" value="1"></label><div class="mobile-v24-gm-custom"><button class="mobile-v24-gm-minus" data-v24-op="-1">Leva</button><button class="mobile-v24-gm-plus" data-v24-op="1">Aggiungi</button></div><div class="mobile-v24-gm-exact"><label class="mobile-v24-gm-field"><span>Valore esatto</span><input id="mobileV24GMExact" type="number" inputmode="numeric" min="0" step="1" value="0"></label><button data-v24-exact>Imposta</button><button class="zero" data-v24-zero>Azzera</button></div><div id="mobileV24GMStatus" class="mobile-v24-gm-status" aria-live="polite"></div></section>';
  d.addEventListener('click',async e=>{
    if(e.target===d||e.target.closest('.mobile-v24-gm-close')){closeDrawer();return;}
    const delta=e.target.closest('[data-v24-delta]');if(delta){await applyDelta(Number(delta.dataset.v24Delta));return;}
    const op=e.target.closest('[data-v24-op]');if(op){const n=Math.abs(Math.trunc(Number(document.getElementById('mobileV24GMAmount')?.value)||0));if(!n){drawerStatus('Inserisci una quantità maggiore di zero.');return;}await applyDelta(Number(op.dataset.v24Op)*n);return;}
    if(e.target.closest('[data-v24-exact]')){const p=getRoomPlayer(drawerToken),field=document.getElementById('mobileV24GMField')?.value,target=Math.max(0,Math.trunc(Number(document.getElementById('mobileV24GMExact')?.value)||0));if(p&&field)await applyDelta(target-fieldValue(p,field));return;}
    if(e.target.closest('[data-v24-zero]')){const p=getRoomPlayer(drawerToken),field=document.getElementById('mobileV24GMField')?.value;if(p&&field)await applyDelta(-fieldValue(p,field));}
  });
  d.querySelector('#mobileV24GMField').addEventListener('change',updateDrawer);
  d.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();});
  document.body.appendChild(d);return d;
}
function openDrawer(token){
  drawerToken=String(token||'');const p=getRoomPlayer(drawerToken);if(!p)return;
  const d=ensureDrawer(),sel=d.querySelector('#mobileV24GMField');sel.innerHTML=playerFields(p).map(([v,l])=>'<option value="'+esc(v)+'">'+esc(l)+'</option>').join('');
  d.classList.add('show');d.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';updateDrawer();setTimeout(()=>sel.focus(),40);
}
function closeDrawer(){const d=document.getElementById('mobileV24GMDrawer');d?.classList.remove('show');d?.setAttribute('aria-hidden','true');drawerToken='';document.body.style.overflow='';}
function drawerStatus(text){const el=document.getElementById('mobileV24GMStatus');if(el)el.textContent=text||'';}
function updateDrawer(){
  const p=getRoomPlayer(drawerToken),d=document.getElementById('mobileV24GMDrawer');if(!p||!d?.classList.contains('show'))return;
  const field=d.querySelector('#mobileV24GMField')?.value||playerFields(p)[0]?.[0]||'energy',value=fieldValue(p,field);
  d.querySelector('#mobileV24GMAvatar').src=portrait(p.characterId);d.querySelector('#mobileV24GMTitle').textContent='Risorse · '+(p.name||'Giocatore');d.querySelector('#mobileV24GMMeta').textContent=charName(p.characterId)+' · '+(p.state?.gradeId||'G4');d.querySelector('#mobileV24GMCurrent').textContent=String(value);d.querySelector('#mobileV24GMExact').value=String(value);drawerStatus(fieldLabel(p,field));
}
async function applyDelta(delta){
  if(drawerBusy||!Number.isFinite(delta)||delta===0)return;const p=getRoomPlayer(drawerToken),field=document.getElementById('mobileV24GMField')?.value;if(!p||!field)return;
  const before=fieldValue(p,field),card=document.querySelector('.mobile-v24-gm-resource-card');drawerBusy=true;card?.classList.add('busy');drawerStatus('Aggiornamento in corso…');
  try{await Promise.resolve(window.gmAdjustPlayer?.(p.playerToken,field,delta,true));const afterP=getRoomPlayer(drawerToken),after=fieldValue(afterP||p,field);drawerStatus(fieldLabel(afterP||p,field)+': '+before+' → '+after);}
  catch(e){drawerStatus('Modifica non riuscita. Riprova.');}
  finally{drawerBusy=false;card?.classList.remove('busy');updateDrawer();}
}

function createSummary(card,p){
  let s=card.querySelector('.v24-gm-summary');if(s)return s;
  const st=p.state||{},max=(()=>{try{return roomStateResourceMax(p);}catch(e){return '—';}})();
  s=document.createElement('div');s.className='v24-gm-summary';s.innerHTML='<div><span>Vita</span><b>'+(st.life??0)+' / '+(st.maxLife??characters?.[p.characterId]?.maxLife??'—')+'</b></div><div><span>'+esc((()=>{try{return roomResourceLabel(p.characterId);}catch(e){return 'Energia';}})())+'</span><b>'+(st.energy??0)+' / '+esc(String(max))+'</b></div><div><span>EXP</span><b>'+(st.exp??0)+'</b></div><div><span>Grado</span><b>'+esc(st.gradeId||'G4')+'</b></div>';
  const head=card.querySelector('.mc-gm-head,.gm-player-head');head?.insertAdjacentElement('afterend',s);return s;
}
function decorateGM(){
  const grid=document.getElementById('gmPlayerGrid');if(!grid)return;
  grid.querySelectorAll('[data-player-token]').forEach(card=>{
    const p=getRoomPlayer(card.dataset.playerToken);if(!p)return;card.classList.add('v24-gm-card');createSummary(card,p);
    if(!card.querySelector('.v24-open-resources')){const b=document.createElement('button');b.type='button';b.className='v24-open-resources';b.dataset.v24Resources=card.dataset.playerToken;b.innerHTML='Gestisci risorse<small>Vita, Energia, EXP e risorse speciali</small>';card.querySelector('.v24-gm-summary')?.insertAdjacentElement('afterend',b);}
  });
  if(grid.dataset.v24Bound!=='1'){grid.dataset.v24Bound='1';grid.addEventListener('click',e=>{const b=e.target.closest('[data-v24-resources]');if(!b)return;e.preventDefault();e.stopPropagation();openDrawer(b.dataset.v24Resources);},true);}
  compactGroupControls();if(drawerToken)updateDrawer();
}
function compactGroupControls(){
  const bar=document.querySelector('#gmViewPlayers .gm-control-bar');if(!bar||bar.closest('.v24-group-commands'))return;
  const d=document.createElement('details');d.className='v24-group-commands';d.innerHTML='<summary>Comandi multipli · selezionati o tutti</summary>';
  bar.parentNode.insertBefore(d,bar);d.appendChild(bar);
}

function wrap(name,after){const base=window[name];if(typeof base!=='function'||base.__v24)return;const fn=function(){const out=base.apply(this,arguments);setTimeout(after,0);return out;};fn.__v24=true;window[name]=fn;}
function installWrappers(){
  wrap('showScreen',markMobileState);
  wrap('renderTechniques',()=>{ensureTechniques();syncPlayerControl();});
  wrap('updatePassTurnButton',syncPass);
  wrap('applyRoomTurnLock',()=>{syncPass();markMobileState();});
  wrap('renderGMDashboard',()=>{decorateGM();markMobileState();});
  wrap('openGMDashboard',()=>{decorateGM();markMobileState();});
}
function init(){
  ensurePlayerControl();ensureDrawer();installWrappers();markMobileState();ensureTechniques();decorateGM();
  window.addEventListener('resize',()=>setTimeout(markMobileState,70));
  window.addEventListener('orientationchange',()=>setTimeout(markMobileState,180));
  window.addEventListener('jjk-layout-changed',()=>setTimeout(markMobileState,0));
  const screens=document.querySelectorAll('.screen');screens.forEach(s=>new MutationObserver(markMobileState).observe(s,{attributes:true,attributeFilter:['class']}));
  const grid=document.getElementById('techGrid');if(grid)new MutationObserver(()=>{ensureTechniques();syncPlayerControl();}).observe(grid,{childList:true,subtree:false});
  const pass=document.getElementById('passTurnBtn');if(pass)new MutationObserver(syncPass).observe(pass,{attributes:true,childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
