/* JJK Energy V25 - velocita partita, PVP e Game Master fluido */
(function(){
'use strict';

const VERSION='V25';
const PVP_FIELD='pvpPoints';
const PVP_MAX=2;
let gmRenderQueued=false;
let gmLastSignature='';
let gmAdjustBusy=new Set();

function safeText(v){
  try{return typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  catch(e){return String(v??'');}
}
function getRoom(){try{return roomSession||null;}catch(e){return window.roomSession||null;}}
function getCharacter(id){try{return characters?.[id]||null;}catch(e){return null;}}
function getRank(id){try{return Number(rank?.[id]??0);}catch(e){return ({G4:0,G3:1,G2:2,G1:3,SS:4,SG:5})[id]||0;}}
function pvpStorageKey(id){return 'jjk_'+String(id||'unknown')+'_pvpPoints';}
function clampPvp(value){return Math.max(0,Math.min(PVP_MAX,Math.trunc(Number(value)||0)));}
function getLocalPvp(id){
  const characterId=id||(()=>{try{return currentId;}catch(e){return null;}})();
  if(!characterId)return 0;
  try{
    const room=getRoom();
    const me=typeof getLocalRoomPlayer==='function'?getLocalRoomPlayer():null;
    if(room?.phase==='playing'&&me?.characterId===characterId&&me?.state?.pvpPoints!==undefined)return clampPvp(me.state.pvpPoints);
  }catch(e){}
  try{return clampPvp(localStorage.getItem(pvpStorageKey(characterId)));}catch(e){return 0;}
}
function setLocalPvp(id,value){
  if(!id)return;
  const n=clampPvp(value);
  try{localStorage.setItem(pvpStorageKey(id),String(n));}catch(e){}
  window.jjkPvpPoints=n;
}
function pvpRulesActive(){
  const r=getRoom();
  return !!(r&&r.phase==='playing');
}
function gradeByExpAndPvp(ch,expValue,pvpValue,enforce=true){
  if(!ch?.grades?.length)return null;
  let result=ch.grades[0];
  ch.grades.forEach(g=>{if(Number(expValue)>=Number(g.exp))result=g;});
  if(!enforce)return result;
  const pvp=clampPvp(pvpValue);
  if(getRank(result.id)>=getRank('SG')&&pvp<2)return ch.grades.find(g=>g.id===(pvp>=1?'SS':'G1'))||result;
  if(getRank(result.id)>=getRank('SS')&&pvp<1)return ch.grades.find(g=>g.id==='G1')||result;
  return result;
}
function pvpGateMessage(ch,expValue,pvpValue){
  if(!ch)return '';
  const pvp=clampPvp(pvpValue);
  const ss=ch.grades.find(g=>g.id==='SS');
  const sg=ch.grades.find(g=>g.id==='SG');
  if(sg&&Number(expValue)>=Number(sg.exp)&&pvp<2)return 'SG bloccato: servono 2 punti PVP totali.';
  if(ss&&Number(expValue)>=Number(ss.exp)&&pvp<1)return 'SS bloccato: serve 1 punto PVP.';
  if(getRank(gradeByExpAndPvp(ch,expValue,pvp,false)?.id)>=getRank('G1'))return 'PVP '+pvp+' / 2 · 1 per SS, 2 totali per SG.';
  return 'I punti PVP si attivano al Grado 1.';
}
function maybeNotifyPvpUnlocked(){
  let id=null,g='G4';
  try{id=currentId;g=gradeId;}catch(e){}
  const room=getRoom();
  if(!id||!room||room.phase!=='playing'||room.isHost||getRank(g)<getRank('G1'))return;
  const key='jjk_pvp_unlocked_notice_'+(room.roomId||room.code||'room')+'_'+id;
  try{if(localStorage.getItem(key)==='1')return;localStorage.setItem(key,'1');}catch(e){}
  const title='PVP sbloccato';
  const text='Da ora servono 1 punto PVP per passare a SS e 2 punti PVP totali per raggiungere SG.';
  try{if(typeof showPlayerNotification==='function')showPlayerNotification(title,text,'#ffb52e');else showModal(title,'Grado 1 raggiunto',text);}catch(e){}
}

/* ---------- Progressione PVP ---------- */
const originalGradeFromExp=window.gradeFromExp;
window.gradeFromExp=function(){
  try{return gradeByExpAndPvp(current,exp,getLocalPvp(currentId),pvpRulesActive());}
  catch(e){return originalGradeFromExp?originalGradeFromExp():null;}
};
window.syncGrade=function(showPromotion){
  if(!current)return;
  const old=gradeId;
  const pvp=getLocalPvp(currentId);
  const next=gradeByExpAndPvp(current,exp,pvp,pvpRulesActive())||current.grades[0];
  gradeId=next.id;
  const nextMax=resourceMaxForGrade(next);
  const promoted=getRank(gradeId)>getRank(old);
  const demoted=getRank(gradeId)<getRank(old);
  if(promoted){
    if(currentId==='toji')energy=nextMax;
    else energy=Math.max(Number(energy)||0,nextMax);
    used=[];
    if(currentId==='yuta')yutaKatanaActive=false;
    addLog('Promozione automatica',old+' → '+gradeId+'. Energia '+(energy>nextMax?'extra conservata: '+energy+' / '+nextMax:'ripristinata a '+nextMax)+'.');
    if(showPromotion)showModal('Promozione',gradeId,'Nuovo grado raggiunto.');
  }else if(demoted){
    addLog('Grado aggiornato',old+' → '+gradeId+' per i requisiti PVP.');
  }
  if(currentId==='toji')energy=Math.min(Number(energy)||0,nextMax);
  energy=Math.max(0,Number(energy)||0);
  const raw=gradeByExpAndPvp(current,exp,pvp,false);
  if(showPromotion&&pvpRulesActive()&&raw&&getRank(raw.id)>getRank(gradeId)){
    const msg=pvpGateMessage(current,exp,pvp);
    try{if(typeof showPlayerNotification==='function')showPlayerNotification('Promozione in attesa',msg,'#ffad2f');else showModal('Promozione in attesa','PVP richiesto',msg);}catch(e){}
  }
  saveState();
  updatePlayerPvpPanel();
  maybeNotifyPvpUnlocked();
};

function wrapBefore(name,before){
  const base=window[name];if(typeof base!=='function'||base.__v25before)return;
  const fn=function(){before.apply(this,arguments);return base.apply(this,arguments);};fn.__v25before=true;window[name]=fn;
}
function wrapAfter(name,after){
  const base=window[name];if(typeof base!=='function'||base.__v25after)return;
  const fn=function(){const out=base.apply(this,arguments);after.apply(this,arguments);return out;};fn.__v25after=true;window[name]=fn;
}

const originalSaveState=window.saveState;
window.saveState=function(){
  try{if(currentId)setLocalPvp(currentId,getLocalPvp(currentId));}catch(e){}
  return originalSaveState?originalSaveState.apply(this,arguments):undefined;
};
const originalBuildLocalPlayerState=window.buildLocalPlayerState;
window.buildLocalPlayerState=function(){
  const state=originalBuildLocalPlayerState?originalBuildLocalPlayerState.apply(this,arguments):null;
  if(state)state.pvpPoints=getLocalPvp(state.characterId);
  return state;
};
const originalCreateInitialRoomPlayerState=window.createInitialRoomPlayerState;
window.createInitialRoomPlayerState=function(characterId){
  const state=originalCreateInitialRoomPlayerState?originalCreateInitialRoomPlayerState.apply(this,arguments):{};
  state.pvpPoints=0;
  return state;
};
const originalPersistRoomSnapshot=window.persistRoomSnapshot;
window.persistRoomSnapshot=function(state){
  const out=originalPersistRoomSnapshot?originalPersistRoomSnapshot.apply(this,arguments):undefined;
  if(state?.characterId)setLocalPvp(state.characterId,state.pvpPoints||0);
  return out;
};
const originalRoomSpecialFieldOptions=window.roomSpecialFieldOptions;
window.roomSpecialFieldOptions=function(p){
  const list=originalRoomSpecialFieldOptions?originalRoomSpecialFieldOptions.apply(this,arguments):[];
  if(!list.some(x=>x[0]===PVP_FIELD))list.push([PVP_FIELD,'Punti PVP']);
  return list;
};
const originalAdjustRoomStateObject=window.adjustRoomStateObject;
window.adjustRoomStateObject=function(p,field,delta){
  const s=p?.state,ch=getCharacter(p?.characterId);
  if(!s||!ch)return originalAdjustRoomStateObject?.apply(this,arguments);
  if(field!=='exp'&&field!==PVP_FIELD)return originalAdjustRoomStateObject?.apply(this,arguments);
  const oldGrade=s.gradeId||'G4';
  if(field==='exp'){
    const maxExp=Number(ch.grades[ch.grades.length-1]?.exp)||0;
    s.exp=Math.max(0,Math.min(maxExp,(Number(s.exp)||0)+(Number(delta)||0)));
  }else{
    s.pvpPoints=clampPvp((Number(s.pvpPoints)||0)+(Number(delta)||0));
  }
  const next=gradeByExpAndPvp(ch,s.exp||0,s.pvpPoints||0,true)||ch.grades[0];
  s.gradeId=next.id;
  if(getRank(next.id)>getRank(oldGrade)){
    const promotedMax=typeof roomStateResourceMax==='function'?roomStateResourceMax({...p,state:s}):Number(next.max)||0;
    s.energy=p.characterId==='toji'?promotedMax:Math.max(Number(s.energy)||0,promotedMax);
    s.used=[];
  }else if(p.characterId==='toji'){
    const max=typeof roomStateResourceMax==='function'?roomStateResourceMax({...p,state:s}):Number(next.max)||0;
    s.energy=Math.min(Number(s.energy)||0,max);
  }
  s.updatedAt=Date.now();
};

/* ---------- Pannello giocatore PVP ---------- */
function ensurePlayerPvpPanel(){
  const gradeRow=document.getElementById('gradeRow');if(!gradeRow)return null;
  let panel=document.getElementById('v25PlayerPvpPanel');
  if(!panel){
    panel=document.createElement('div');panel.id='v25PlayerPvpPanel';panel.className='v25-player-pvp-panel';
    panel.innerHTML='<div class="v25-pvp-icon">⚔</div><div><b id="v25PvpTitle">Punti PVP</b><small id="v25PvpText">Si attivano al Grado 1.</small></div><strong id="v25PvpValue">0 / 2</strong>';
    gradeRow.parentElement?.insertAdjacentElement('afterend',panel);
  }
  return panel;
}
function updatePlayerPvpPanel(){
  const panel=ensurePlayerPvpPanel();if(!panel)return;
  let id=null,ch=null,g='G4',xp=0;
  try{id=currentId;ch=current;g=gradeId;xp=exp;}catch(e){}
  if(!id||!ch){panel.style.display='none';return;}
  panel.style.display='grid';
  const points=getLocalPvp(id),active=getRank(g)>=getRank('G1')||Number(xp)>=Number(ch.grades.find(x=>x.id==='G1')?.exp||Infinity);
  panel.classList.toggle('active',active);panel.classList.toggle('gated',pvpGateMessage(ch,xp,points).includes('bloccato'));
  document.getElementById('v25PvpValue').textContent=points+' / 2';
  document.getElementById('v25PvpText').textContent=pvpGateMessage(ch,xp,points);
}

/* ---------- Corpo e totale delle tecniche ---------- */
function currentBodyWithoutTechnique(){
  let value=0;
  try{value=Number(effectiveBaseBody())||0;}catch(e){try{value=Number(current?.baseBody)||0;}catch(_){} }
  try{value+=Number(combatBonus)||0;}catch(e){}
  try{if(currentId==='megumi'&&megumiCompanionOn)value+=Number(getMegumiCompanionBonus())||0;}catch(e){}
  return value;
}
function techniqueActualSource(t){
  try{if(currentId==='yuta'&&t?.yutaCopy&&yutaCopiedTechnique){const src=getYutaCopiedSource();if(src?.t)return src.t;}}catch(e){}
  return t;
}
function additionalOneUse(t){
  let n=0,notes=[];
  try{if(currentId==='geto'&&getoOneUse>0){n+=Number(getoOneUse)||0;notes.push('Corpo monouso');}}catch(e){}
  try{if(currentId==='itadori'&&itadoriOneUse>0){n+=Number(itadoriOneUse)||0;notes.push('Choso');}}catch(e){}
  try{if(currentId==='yuta'&&yutaKatanaActive&&typeof yutaKatanaCanCombine==='function'&&yutaKatanaCanCombine(t)){n+=3;notes.push('Katana');}}catch(e){}
  let optional=0;
  try{if(currentId==='toji'&&getRank(gradeId)>=getRank('G3'))optional=Math.min(2,Math.floor((Number(tojiCollectedEnergy)||0)/10))*2;}catch(e){}
  return {n,notes,optional};
}
function previewTechnique(t){
  const source=techniqueActualSource(t),body=currentBodyWithoutTechnique(),extra=additionalOneUse(t);
  if(!source)return {main:'Effetto',sub:'Tecnica non disponibile'};
  if(source.instantWin)return {main:'Vittoria',sub:'Effetto immediato'};
  if(source.itadoriBlackFlash)return {main:body+' + dadi',sub:'Il risultato inserito si somma al Corpo'};
  if(source.dynamicCost)return {main:body+' + d24',sub:'Il risultato del d24 si somma al Corpo'};
  if(source.convertAllEnergy){let total=body;try{total+=Number(energy)||0;}catch(e){}total+=extra.n;return {main:String(total),sub:'Corpo + tutta l’Energia attuale'};}
  if(source.yutaDomain)return {main:body+' + dadi',sub:'Bonus Dominio massimo +15'};
  if(typeof source.bonus==='number'){
    const total=body+Number(source.bonus)+extra.n+extra.optional;
    const notes=[];
    if(extra.notes.length)notes.push(extra.notes.join(' + '));
    if(extra.optional)notes.push('+'+extra.optional+' Punti Forza opzionali');
    if(source.opponentMalus)notes.push('avversario −'+source.opponentMalus);
    return {main:String(total),sub:notes.length?notes.join(' · '):'Totale Combattimento se utilizzata'};
  }
  if(source.opponentMalus)return {main:String(body+extra.n+extra.optional),sub:'Avversario −'+source.opponentMalus+' Corpo'};
  return {main:String(body+extra.n+extra.optional),sub:'Corpo attuale + effetto della tecnica'};
}
window.v25ShowBody=function(){
  const total=currentBodyWithoutTechnique();
  const parts=[];
  try{parts.push('Corpo base effettivo '+effectiveBaseBody());}catch(e){}
  try{if(combatBonus)parts.push('bonus Combattimento '+(combatBonus>=0?'+':'')+combatBonus);}catch(e){}
  try{if(currentId==='megumi'&&megumiCompanionOn)parts.push('Shikigami +'+getMegumiCompanionBonus());}catch(e){}
  showModal('Corpo',total+' Corpo',parts.join(' · ')||'Valore del personaggio senza usare tecniche.');
};
function ensureTechniqueToolbar(){
  const grid=document.getElementById('techGrid');if(!grid)return;
  let tools=document.getElementById('v25TechniqueTools');
  if(!tools){
    tools=document.createElement('div');tools.id='v25TechniqueTools';tools.className='v25-technique-tools';
    tools.innerHTML='<div><b>Gestione combattimento</b><small>Ripristina tutte le tecniche usate.</small></div><button type="button" onclick="newCombat()">↻ Nuovo combattimento</button>';
    grid.parentElement?.insertBefore(tools,grid);
  }
}
function createBodyCard(){
  const card=document.createElement('article');card.className='tech-card v25-body-card';
  let image='';try{image=current?.image||'';}catch(e){}
  const total=currentBodyWithoutTechnique();
  card.innerHTML='<div class="tech-grade-badge grade-G4">CORPO</div><img src="'+safeText(image)+'" alt="Corpo"><div class="tech-content"><div class="tech-name">Corpo</div><div class="tech-cost">Nessun costo · nessuna tecnica</div><div class="v25-tech-total"><span>Valore attuale</span><b>'+total+'</b><small>Combattimento senza tecniche</small></div><button class="use-btn" type="button" onclick="v25ShowBody()">Mostra Corpo</button></div>';
  return card;
}
function decorateTechniqueCards(){
  const grid=document.getElementById('techGrid');if(!grid)return;
  ensureTechniqueToolbar();
  grid.querySelectorAll('.v25-body-card').forEach(x=>x.remove());
  let available=[];try{available=current?.techniques?.filter(techniqueIsAvailable)||[];}catch(e){}
  const cards=Array.from(grid.querySelectorAll('.tech-card:not(.v25-body-card)'));
  cards.forEach((card,index)=>{
    const t=available[index];if(!t)return;
    const preview=previewTechnique(t);
    let box=card.querySelector('.v25-tech-total');
    if(!box){box=document.createElement('div');box.className='v25-tech-total';card.querySelector('.tech-content')?.insertBefore(box,card.querySelector('.use-btn'));}
    box.innerHTML='<span>Totale se usata</span><b>'+safeText(preview.main)+'</b><small>'+safeText(preview.sub)+'</small>';
  });
  grid.insertBefore(createBodyCard(),grid.firstChild);
  const count=document.getElementById('mobileV24TechniqueCount');if(count)count.textContent=String(cards.length+1);
  const gameCount=document.getElementById('gameMoveCount');if(gameCount)gameCount.textContent=String(cards.length+1);
}

/* ---------- -1 risorsa rapido ---------- */
function ensureQuickResourceMinus(){
  const energyValue=document.getElementById('energyValue');const stat=energyValue?.closest('.stats>div');if(!stat)return;
  let btn=document.getElementById('v25QuickMinusResource');
  if(!btn){
    btn=document.createElement('button');btn.id='v25QuickMinusResource';btn.type='button';btn.className='v25-quick-resource-minus';btn.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      try{if(typeof roomActionAllowed==='function'&&!roomActionAllowed())return;}catch(_){}
      try{
        if(currentId==='toji')changeTojiVigor(-1);
        else gainEnergy(-1);
      }catch(err){}
    });
    stat.appendChild(btn);
  }
  let label='−1 Energia';try{if(currentId==='toji')label='−1 Vigore';}catch(e){}
  btn.textContent=label;btn.setAttribute('aria-label',label);
}

/* ---------- Schermata turno bloccato con statistiche ---------- */
function ensureLockStats(){
  const box=document.querySelector('#roomTurnLock .room-turn-lock-box');if(!box)return null;
  let stats=document.getElementById('v25LockedStats');
  if(!stats){
    stats=document.createElement('div');stats.id='v25LockedStats';stats.className='v25-locked-stats';
    stats.innerHTML='<div><span>Vita</span><b id="v25LockedLife">—</b></div><div><span id="v25LockedResourceLabel">Energia</span><b id="v25LockedEnergy">—</b></div><div><span>EXP</span><b id="v25LockedExp">—</b></div>';
    box.appendChild(stats);
    const note=document.createElement('small');note.className='v25-lock-note';note.textContent='Puoi controllare lo stato del personaggio, ma non modificare le risorse finché il turno non viene sbloccato.';box.appendChild(note);
  }
  return stats;
}
function updateLockedStats(){
  const stats=ensureLockStats();if(!stats)return;
  let l='—',e='—',em='—',x='—',xm='—',label='Energia';
  try{l=life;const g=currentGrade();e=energy;em=g.max;x=exp;xm=current.grades[current.grades.length-1].exp;label=currentId==='toji'?'Vigore':'Energia';}catch(err){}
  document.getElementById('v25LockedLife').textContent=l;
  document.getElementById('v25LockedEnergy').textContent=e+' / '+em;
  document.getElementById('v25LockedExp').textContent=x+' / '+xm;
  document.getElementById('v25LockedResourceLabel').textContent=label;
  try{const active=getRoom()?.players?.find(p=>!p.isHost&&!p.locked);const text=document.querySelector('#roomTurnLock .room-turn-lock-text');if(text)text.textContent=active?'Ora sta giocando '+active.name+'. La tua scheda resta in sola lettura.':'La tua scheda è in sola lettura finché il Game Master non assegna il turno.';}catch(e){}
}

/* ---------- Game Master fluido ---------- */
function playerAccent(id){try{return uiCharacterMeta(id)?.color||'#63c6ff';}catch(e){return '#63c6ff';}}
function playerResourceLabel(id){try{return roomResourceLabel(id);}catch(e){return id==='toji'?'Vigore':'Energia';}}
function playerResourceMax(p){try{return roomStateResourceMax(p);}catch(e){return '—';}}
function pvpStatusForPlayer(p){
  const s=p?.state||{},ch=getCharacter(p?.characterId),points=clampPvp(s.pvpPoints||0);
  return {points,text:pvpGateMessage(ch,s.exp||0,points),gated:!!ch&&pvpGateMessage(ch,s.exp||0,points).includes('bloccato')};
}
function gmSignature(players){
  const select=(()=>{try{return Array.from(gmSelectedPlayers||[]).sort();}catch(e){return [];}})();
  return JSON.stringify({view:typeof gmUiView!=='undefined'?gmUiView:'players',search:typeof gmUiSearch!=='undefined'?gmUiSearch:'',status:typeof gmUiStatus!=='undefined'?gmUiStatus:'all',select,players:players.map(p=>({id:p.playerToken,n:p.name,c:p.characterId,l:p.locked,o:p.connected,e:p.hasEye,b:p.bossRush,d:p.energyDiscount,m:p.selfManage,t:p.turnOrder,s:p.state&&{u:p.state.updatedAt,g:p.state.gradeId,e:p.state.energy,x:p.state.exp,l:p.state.life,p:p.state.pvpPoints,cb:p.state.combatBonus,tok:p.state.tokens,h:p.state.jogoHeat,f:p.state.itadoriFingers}}))});
}
function renderGmCard(p){
  const s=p.state||{},ch=getCharacter(p.characterId),accent=playerAccent(p.characterId),pvp=pvpStatusForPlayer(p);
  const selected=(()=>{try{return gmSelectedPlayers.has(p.playerToken);}catch(e){return false;}})();
  const high=getRank(s.gradeId||'G4')>=getRank('G1');
  const special=(()=>{try{return gmSpecialPills(p);}catch(e){return ''}})();
  return '<article class="gm-player-card gm-card-v3 v25-gm-card '+(p.locked?'locked':'unlocked')+' '+(p.connected===false?'disconnected':'')+' '+(high?'v25-grade-fluo ':'')+(p.hasEye?'v25-eye-player ':'')+'" style="--v25-accent:'+accent+'" data-player-token="'+safeText(p.playerToken)+'">'+
    '<header class="gm-player-head"><label class="gm-select-wrap"><input class="gm-select-player" type="checkbox" '+(selected?'checked':'')+'></label><div class="v25-avatar-shell"><img class="gm-player-avatar" src="'+safeText(ch?.image||'')+'" alt=""></div><div class="gm-player-main"><div class="gm-player-name '+(p.hasEye?'v25-eye-name':'')+'">'+safeText(p.name)+'</div><div class="gm-player-char">'+safeText(ch?.name||'Nessun personaggio')+'</div><div class="gm-player-status-row"><span class="gm-mini-badge '+(p.connected===false?'offline':'online')+'">'+(p.connected===false?'Riconnessione':'Online')+'</span><span class="gm-mini-badge eye">👁 '+(p.hasEye?'Sì':'No')+'</span><span class="gm-mini-badge v25-pvp-badge '+(pvp.gated?'gated':'')+'">PVP '+pvp.points+'/2</span>'+(p.bossRush?'<span class="gm-mini-badge boss">Boss Rush</span>':'')+'</div></div><span class="gm-lock-badge '+(p.locked?'':'open')+'">'+(p.locked?'BLOCCATO':'TURNO')+'</span></header>'+
    '<div class="v24-gm-summary v25-gm-summary"><div><span>Vita</span><b>'+(s.life??'—')+' / '+(s.maxLife??ch?.maxLife??'—')+'</b></div><div class="v25-resource-cell"><span>'+safeText(playerResourceLabel(p.characterId))+'</span><b>'+(s.energy??'—')+' / '+safeText(playerResourceMax(p))+'</b><button type="button" class="v25-gm-energy-minus" data-v25-energy-minus="'+safeText(p.playerToken)+'">−1</button></div><div><span>EXP</span><b>'+(s.exp??0)+'</b></div><div><span>Grado</span><b>'+(s.gradeId||'G4')+'</b></div><div class="v25-pvp-cell"><span>Punti PVP</span><b>'+pvp.points+' / 2</b><small>'+safeText(pvp.text)+'</small></div></div>'+
    '<div class="v25-gm-core-actions"><button type="button" class="v24-open-resources v25-resource-open" data-v24-resources="'+safeText(p.playerToken)+'"><span><b>Gestisci risorse</b><small>Quantità, valore esatto e risorse speciali</small></span><strong>›</strong></button><button type="button" class="v26-discount-toggle '+(p.energyDiscount?'on':'off')+'" data-v26-discount="'+safeText(p.playerToken)+'"><span><b>Sconto tecniche −3</b><small>Riduce di 3 il costo in Energia delle tecniche.</small></span><strong>'+(p.energyDiscount?'ON':'OFF')+'</strong></button><div class="v25-pvp-controls"><button type="button" data-v25-pvp="-1" data-player="'+safeText(p.playerToken)+'">−1 PVP</button><button type="button" data-v25-pvp="1" data-player="'+safeText(p.playerToken)+'">+1 PVP</button></div></div>'+
    '<div class="gm-quick-actions v25-gm-quick"><button class="gm-btn unlock" data-gm-action="turn">Dai turno</button><button class="gm-btn lock" data-gm-action="lock">'+(p.locked?'Sblocca':'Blocca')+'</button><button class="gm-btn '+(p.hasEye?'eye-on':'')+'" data-gm-action="eye">👁 '+(p.hasEye?'SÌ':'NO')+'</button><button class="gm-btn '+(p.bossRush?'boss-on':'boss-off')+'" data-gm-action="boss">Boss '+(p.bossRush?'ON':'OFF')+'</button></div>'+
    '<details class="v25-special-details"><summary>Risorse speciali</summary><div class="gm-special-list">'+special+'</div></details><div class="gm-kick-zone"><button class="gm-btn gm-kick-btn" data-gm-action="kick">Espelli dalla stanza</button></div></article>';
}
function renderGMNow(){
  const room=getRoom();if(!room?.isHost||room.phase!=='playing')return;
  const all=(room.players||[]).filter(p=>!p.isHost),visible=all.filter(p=>{try{return gmPlayerPassesUiFilter(p);}catch(e){return true;}}),boss=all.find(p=>p.bossRush),active=all.filter(p=>!p.locked);
  const code=document.getElementById('gmRoomCode'),count=document.getElementById('gmPlayerCount'),turn=document.getElementById('gmActiveTurn'),bossEl=document.getElementById('gmBossRushPlayer');
  if(code)code.textContent=room.code||'—';if(count)count.textContent=String(all.length);if(turn)turn.textContent=active.length?active.map(p=>p.name).join(', '):'Nessuno';if(bossEl)bossEl.textContent=boss?boss.name:'Disattivata';
  try{updateGMClock();}catch(e){}
  const signature=gmSignature(visible),grid=document.getElementById('gmPlayerGrid');
  if(grid&&signature!==gmLastSignature){
    gmLastSignature=signature;
    grid.innerHTML=visible.map(renderGmCard).join('')||'<div class="stats-empty">Nessun giocatore corrisponde ai filtri.</div>';
  }
  const logs=[];all.forEach(p=>(p.state?.log||[]).forEach(x=>logs.push({...x,playerName:p.name,characterName:(()=>{try{return characterDisplayName(p.characterId);}catch(e){return p.characterId||'';}})()})));logs.sort((a,b)=>(b.ts||0)-(a.ts||0));
  const feed=document.getElementById('gmMovementFeed');if(feed){const feedSig=logs.slice(0,160).map(x=>(x.ts||0)+x.playerName+x.title).join('|');if(feed.dataset.v25Sig!==feedSig){feed.dataset.v25Sig=feedSig;feed.innerHTML=logs.length?logs.slice(0,160).map(x=>'<div class="gm-feed-item"><strong>'+safeText(x.playerName)+' · '+safeText(x.title)+'</strong><div>'+safeText(x.detail||'')+'</div><div class="gm-feed-meta">'+safeText(x.characterName)+' · '+safeText(x.time||'')+'</div></div>').join(''):'<div class="stats-empty">Nessun movimento registrato.</div>';}}
  const winner=document.getElementById('gmWinnerSelect');if(winner){const old=winner.value,options='<option value="">Seleziona il vincitore</option>'+all.filter(p=>p.characterId).map(p=>'<option value="'+safeText(p.playerToken)+'">'+safeText(p.name)+' · '+safeText(getCharacter(p.characterId)?.name||p.characterId)+'</option>').join('');if(winner.dataset.v25Options!==options){winner.dataset.v25Options=options;winner.innerHTML=options;if(old)winner.value=old;}}
  try{initGMDelegation();}catch(e){}
}
window.renderGMDashboard=function(force){
  if(force)gmLastSignature='';
  if(gmRenderQueued)return;
  gmRenderQueued=true;
  requestAnimationFrame(()=>{gmRenderQueued=false;renderGMNow();});
};
async function gmQuickAdjust(id,field,delta,button){
  const key=id+'|'+field;if(gmAdjustBusy.has(key))return;gmAdjustBusy.add(key);button?.classList.add('busy');button&&(button.disabled=true);
  try{await Promise.resolve(gmAdjustPlayer(id,field,delta,true));gmLastSignature='';window.renderGMDashboard(true);}
  finally{gmAdjustBusy.delete(key);button?.classList.remove('busy');button&&(button.disabled=false);}
}
function bindGMFastControls(){
  const grid=document.getElementById('gmPlayerGrid');if(!grid||grid.dataset.v25FastBound==='1')return;grid.dataset.v25FastBound='1';
  grid.addEventListener('click',e=>{
    const minus=e.target.closest('[data-v25-energy-minus]');if(minus){e.preventDefault();e.stopPropagation();gmQuickAdjust(minus.dataset.v25EnergyMinus,'energy',-1,minus);return;}
    const pvp=e.target.closest('[data-v25-pvp]');if(pvp){e.preventDefault();e.stopPropagation();gmQuickAdjust(pvp.dataset.player,PVP_FIELD,Number(pvp.dataset.v25Pvp)||0,pvp);return;}
    const discount=e.target.closest('[data-v26-discount]');if(discount){e.preventDefault();e.stopPropagation();discount.disabled=true;Promise.resolve(gmToggleEnergyDiscount(discount.dataset.v26Discount)).finally(()=>{discount.disabled=false;gmLastSignature='';window.renderGMDashboard(true);});}
  },true);
}

/* ---------- Aggiornamenti UI ---------- */
function refreshV25(){
  updatePlayerPvpPanel();
  ensureQuickResourceMinus();
  decorateTechniqueCards();
  updateLockedStats();
  bindGMFastControls();
}
wrapAfter('renderTechniques',decorateTechniqueCards);
wrapAfter('renderHeader',()=>{updatePlayerPvpPanel();decorateTechniqueCards();ensureQuickResourceMinus();});
wrapAfter('updateBars',()=>{updatePlayerPvpPanel();decorateTechniqueCards();ensureQuickResourceMinus();updateLockedStats();});
wrapAfter('renderAll',refreshV25);
wrapAfter('applyRoomTurnLock',()=>{updateLockedStats();maybeNotifyPvpUnlocked();});
wrapAfter('openCharacter',()=>{updatePlayerPvpPanel();maybeNotifyPvpUnlocked();});
wrapAfter('changeCombatBonus',decorateTechniqueCards);
wrapAfter('toggleMegumiCompanion',decorateTechniqueCards);
wrapAfter('changeJogoHeat',decorateTechniqueCards);
wrapAfter('changeGetoOneUse',decorateTechniqueCards);
wrapAfter('changeTojiCollectedEnergy',decorateTechniqueCards);
wrapAfter('changeItadoriFingers',decorateTechniqueCards);
wrapAfter('changeYutaCopiedResource',decorateTechniqueCards);
wrapAfter('forgetYutaCopy',decorateTechniqueCards);
wrapAfter('newCombat',decorateTechniqueCards);

function init(){
  ensurePlayerPvpPanel();ensureQuickResourceMinus();ensureLockStats();ensureTechniqueToolbar();decorateTechniqueCards();updateLockedStats();bindGMFastControls();
  const gmGrid=document.getElementById('gmPlayerGrid');if(gmGrid)new MutationObserver(bindGMFastControls).observe(gmGrid,{childList:true});
  window.addEventListener('resize',()=>setTimeout(refreshV25,80));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(refreshV25,80);});
  setInterval(()=>{const room=getRoom();if(room?.isHost&&room.phase==='playing'&&document.getElementById('gameMaster')?.classList.contains('active'))window.renderGMDashboard();},900);
  setTimeout(refreshV25,250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
