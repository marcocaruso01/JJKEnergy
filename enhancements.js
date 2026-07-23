/* Final stability and feature patch: intentionally uses the original global lexical bindings. */
const MC_PORTRAITS={toji:'assets/portraits/toji.webp',sukuna:'assets/portraits/sukuna.webp',megumi:'assets/portraits/megumi.webp',gojo:'assets/portraits/gojo.webp',geto:'assets/portraits/geto.webp',mahito:'assets/portraits/mahito.webp',itadori:'assets/portraits/itadori.webp',yuta:'assets/portraits/yuta.webp',jogo:'assets/portraits/jogo.webp'};
Object.entries(MC_PORTRAITS).forEach(([id,src])=>{if(characters[id])characters[id].portrait=src;});
function mcPortrait(id){return characters[id]?.portrait||characters[id]?.image||'';}
function roomPeerOptions(){return {debug:1,config:{iceCandidatePoolSize:10,iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']},{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:global.stun.twilio.com:3478'}]}};}
let mcWakeLock=null;
async function mcRequestWakeLock(){try{if('wakeLock' in navigator&&document.visibilityState==='visible'&&!mcWakeLock){mcWakeLock=await navigator.wakeLock.request('screen');mcWakeLock.addEventListener('release',()=>{mcWakeLock=null;});}}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){mcRequestWakeLock();setTimeout(()=>{try{ensureRoomConnectivity();}catch(e){}},180);}});
setInterval(()=>{if(roomSession){try{ensureRoomConnectivity();}catch(e){}}},6000);

function mcResourceEditAllowed(showNotice=true){
 if(!roomSession||roomSession.isHost||roomSession.phase!=='playing')return true;
 const me=getLocalRoomPlayer();
 if(!me)return true;
 if(me.locked){if(showNotice)showModal('Non è il tuo turno','','Il Game Master deve sbloccare la scheda.');return false;}
 if(me.selfManage===false){if(showNotice)showModal('Modifica risorse disattivata','','Puoi usare le tecniche, ma solo il Game Master può modificare EXP, Energia e risorse speciali.');return false;}
 return true;
}
function mcDiscountEnabled(){if(!roomSession||roomSession.isHost||roomSession.phase!=='playing')return false;const me=getLocalRoomPlayer();return !!(me&&me.characterId===currentId&&me.energyDiscount);}
function mcDiscountCost(characterId,cost){const n=Math.max(0,Number(cost)||0);if(!mcDiscountEnabled()||characterId==='toji'||isBossRushFree())return n;return Math.max(0,n-3);}
function mcCurrentPlayerSettings(){return roomSession&&!roomSession.isHost?getLocalRoomPlayer():null;}
function mcUpdatePlayerSettingsBadge(){let el=document.getElementById('mcPlayerSettings');if(!el){el=document.createElement('div');el.id='mcPlayerSettings';el.className='mc-player-settings';document.body.appendChild(el);}const me=mcCurrentPlayerSettings();if(!me||roomSession?.phase!=='playing'||!currentId||me.characterId!==currentId){el.classList.remove('show');return;}const manage=me.selfManage!==false,discount=!!me.energyDiscount;el.classList.add('show');el.innerHTML='<b>Impostazioni del Game Master</b><div class="mc-player-settings-row"><span class="mc-setting-pill '+(me.locked?'turn':'on')+'">'+(me.locked?'Non è il tuo turno':'Turno attivo')+'</span><span class="mc-setting-pill '+(manage?'on':'off')+'">Risorse '+(manage?'ON':'OFF')+'</span><span class="mc-setting-pill '+(discount?'on':'off')+'">Tecniche −3 '+(discount?'ON':'OFF')+'</span></div>';}

function mcWrapResourceFunction(name){const fn=globalThis[name];if(typeof fn!=='function')return;globalThis[name]=function(...args){if(!mcResourceEditAllowed(true))return;return fn.apply(this,args);};}
['gainEnergy','fullEnergy','gainExp','changeCombatBonus','changeLife','changeJogoHeat','changeTojiVigor','fullTojiVigor','changeGetoOneUse','changeTojiCollectedEnergy','changeTokens','toggleMegumiCompanion','changeItadoriFingers','resetItadoriCurrentFingers','changeYutaCopiedResource','resetYutaCopiedResource','convertYutaLifeToEnergy','convertYutaEnergyToLife'].forEach(mcWrapResourceFunction);

const mcBaseRenderCharacterInfo=renderCharacterInfo;
renderCharacterInfo=function(id=uiInfoCharacterId,animate=true){mcBaseRenderCharacterInfo(id,animate);if(!characters[id])return;const main=document.getElementById('characterInfoImage');if(main)main.src=mcPortrait(id);document.querySelectorAll('#characterInfoRail .info-character-card').forEach((btn,index)=>{const cid=Object.keys(characters)[index];const img=btn.querySelector('img');if(img&&cid)img.src=mcPortrait(cid);});};
const mcBaseRenderRoomDraftSelection=renderRoomDraftSelection;
renderRoomDraftSelection=function(animate=false){mcBaseRenderRoomDraftSelection(animate);if(!roomSession)return;const id=roomDraftCharacterId;if(id&&characters[id]){const main=document.getElementById('roomDraftImage');if(main)main.src=mcPortrait(id);}document.querySelectorAll('#roomDraftRail .room-draft-card').forEach((btn,index)=>{const cid=Object.keys(characters)[index];const img=btn.querySelector('img');if(img&&cid)img.src=mcPortrait(cid);});document.querySelectorAll('#roomDraftRoster .room-draft-player').forEach((row,index)=>{const p=(roomSession.players||[])[index],img=row.querySelector('img');if(img&&p?.characterId)img.src=mcPortrait(p.characterId);});};

function mcAddFx(root,cls,style=''){const el=document.createElement('i');el.className=cls;if(style)el.setAttribute('style',style);root.appendChild(el);}
spawnCharacterSceneFx=function(root,id){if(!root||document.documentElement.classList.contains('v34-no-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches){if(root)root.innerHTML='';return;}root.innerHTML='';root.style.setProperty('--character-accent',uiCharacterMeta(id).color);switch(id){case'mahito':mcAddFx(root,'char-fx-distort','--r:-15deg');mcAddFx(root,'char-fx-distort','--r:23deg;animation-delay:.05s');break;case'sukuna':mcAddFx(root,'char-fx-slash','--r:-34deg');mcAddFx(root,'char-fx-slash','--r:25deg');mcAddFx(root,'char-fx-slash','--r:84deg');break;case'gojo':mcAddFx(root,'char-fx-blue-ball');mcAddFx(root,'char-fx-ring');break;case'itadori':mcAddFx(root,'char-fx-red-punch');mcAddFx(root,'char-fx-impact');break;case'yuta':mcAddFx(root,'char-fx-katana','--r:-18deg');mcAddFx(root,'char-fx-katana','--r:-8deg;animation-delay:.05s');break;case'jogo':mcAddFx(root,'char-fx-volcano');break;case'geto':mcAddFx(root,'char-fx-dragon','--r:-5deg');mcAddFx(root,'char-fx-dragon','--r:10deg;animation-delay:.07s');break;case'toji':mcAddFx(root,'char-fx-crack','--r:-18deg');mcAddFx(root,'char-fx-crack','--r:14deg');break;case'megumi':mcAddFx(root,'char-fx-light-glow');mcAddFx(root,'char-fx-shadow','--x:32%;--skew:-10deg');mcAddFx(root,'char-fx-shadow','--x:68%;--skew:10deg');break;default:mcAddFx(root,'char-fx-ring');}
 const n=innerWidth<620?5:9;for(let i=0;i<n;i++){const x=15+Math.random()*70,y=18+Math.random()*64,dx=Math.round(Math.random()*180-90),dy=Math.round(Math.random()*180-90);mcAddFx(root,'char-fx-particle','--x:'+x+'%;--y:'+y+'%;--dx:'+dx+'px;--dy:'+dy+'px;animation-delay:'+(Math.random()*.08)+'s');}setTimeout(()=>{root.innerHTML='';},900);};
playTechniqueEffect=function(t){if(document.documentElement.classList.contains('v34-no-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches)return;let layer=document.getElementById('mcTechFx');if(!layer){layer=document.createElement('div');layer.id='mcTechFx';layer.className='mc-tech-fx';layer.innerHTML='<div class="mc-tech-flash"></div><div class="character-scene-fx"></div>';document.body.appendChild(layer);}layer.style.setProperty('--character-accent',TECH_FX_COLORS[currentId]||uiCharacterMeta(currentId).color);const root=layer.querySelector('.character-scene-fx');spawnCharacterSceneFx(root,currentId);layer.classList.remove('show');void layer.offsetWidth;layer.classList.add('show');clearTimeout(playTechniqueEffect._t);playTechniqueEffect._t=setTimeout(()=>layer.classList.remove('show'),950);};

function mcTechniqueCostLabel(t){const resource=currentId==='toji'?'Vigore':'Energia';if(t.itadoriBlackFlash)return 'Costo: risultato dadi'+(mcDiscountEnabled()?' <span class="mc-discount-note">−3 Energia</span>':'');if(t.dynamicCost)return 'Costo: risultato d24'+(mcDiscountEnabled()?' <span class="mc-discount-note">−3 Energia</span>':'');const lifeCost=extractTechniqueLifeCost(t);if(lifeCost&&Number(t.cost||0)===0)return 'Costo: '+lifeCost+' Vita';const discounted=mcDiscountCost(currentId,t.cost);return 'Costo: '+discounted+' '+resource+(lifeCost?' + '+lifeCost+' Vita':'')+(discounted!==Number(t.cost||0)?' <span class="mc-discount-note">GM −3</span>':'');}
const mcBaseRenderTechniques=renderTechniques;
renderTechniques=function(){mcBaseRenderTechniques();document.querySelectorAll('#techGrid .tech-card').forEach((card,index)=>{const list=current.techniques.filter(techniqueIsAvailable),t=list[index];if(!t)return;const cost=card.querySelector('.tech-cost');if(currentId==='yuta'&&t.yutaCopy&&yutaCopiedTechnique){const src=getYutaCopiedSource();if(src&&src.characterId!=='toji'&&src.characterId!=='jogo'&&mcDiscountEnabled()){const c=mcDiscountCost(src.characterId,src.t.cost||0);cost.innerHTML=(src.t.dynamicCost?'Costo dinamico':'Costo: '+c+' Energia')+' <span class="mc-discount-note">GM −3</span> · copia 100%';}}else cost.innerHTML=mcTechniqueCostLabel(t);});};

function mcRunWithDiscount(characterId,fn){return fn();}
const mcBaseUseTechnique=useTechnique;
useTechnique=function(k){const t=current?.techniques?.find(x=>x.key===k);if(!t)return;return mcRunWithDiscount(currentId,()=>mcBaseUseTechnique(k));};
const mcBaseExecuteYutaCopiedTechnique=executeYutaCopiedTechnique;
executeYutaCopiedTechnique=function(copyCard){const src=getYutaCopiedSource();return mcRunWithDiscount(src?.characterId||'yuta',()=>mcBaseExecuteYutaCopiedTechnique(copyCard));};

function mcFieldList(p){const list=[['life','Vita'],['energy',roomResourceLabel(p.characterId)],['exp','EXP'],['combatBonus','Bonus Combattimento']];if(p.characterId==='geto')list.push(['tokens','Segnalini Maledetti'],['getoOneUse','Corpo monouso']);if(p.characterId==='jogo')list.push(['jogoHeat','Calore']);if(p.characterId==='toji')list.push(['tojiCollectedEnergy','Energia raccolta']);if(p.characterId==='itadori')list.push(['itadoriFingers','Dita di Sukuna'],['itadoriOneUse','Corpo Choso']);if(p.characterId==='yuta')list.push(['yutaCopiedTokens','Segnalini copiati'],['yutaCopiedVigor','Vigore copiato'],['yutaCopiedFingers','Dita copiate'],['yutaCopiedHeat','Calore copiato']);return list;}
function mcFieldValue(p,field){const s=p.state||{};return field==='energy'?(s.energy??0):(s[field]??0);}
function mcRenderResourceRows(p){return mcFieldList(p).map(([field,label])=>'<div class="mc-resource-row"><div class="mc-resource-top"><b>'+escapeHtml(label)+'</b><span>'+escapeHtml(String(mcFieldValue(p,field)))+'</span></div><div class="mc-resource-controls"><input type="number" inputmode="numeric" min="1" step="1" value="1" data-mc-amount="'+field+'"><button class="sub" data-mc-adjust="'+field+'" data-sign="-1">Leva</button><button class="add" data-mc-adjust="'+field+'" data-sign="1">Aggiungi</button></div></div>').join('');}
function gmToggleSelfManage(id){const p=roomFindPlayer(id);if(!p||p.isHost)return;p.selfManage=!(p.selfManage!==false);sendToRoomPlayer(p.playerToken,{type:'gm_command',command:'player_settings',selfManage:p.selfManage,energyDiscount:!!p.energyDiscount,message:'Modifica autonoma risorse '+(p.selfManage?'attivata':'disattivata')+'.'});persistRoomResumeSession();broadcastRoomState();}
function gmToggleEnergyDiscount(id){const p=roomFindPlayer(id);if(!p||p.isHost)return;p.energyDiscount=!p.energyDiscount;sendToRoomPlayer(p.playerToken,{type:'gm_command',command:'player_settings',selfManage:p.selfManage!==false,energyDiscount:p.energyDiscount,message:'Sconto tecniche −3 Energia '+(p.energyDiscount?'attivato':'disattivato')+'.'});persistRoomResumeSession();broadcastRoomState();}
const mcBaseApplyGMCommand=applyGMCommand;
applyGMCommand=function(data){if(data?.command==='player_settings'){const me=getLocalRoomPlayer();if(me){me.selfManage=data.selfManage!==false;me.energyDiscount=!!data.energyDiscount;}showPlayerNotification('Impostazioni Game Master',data.message||'Impostazioni aggiornate.','#62c7ff');renderTechniques();mcUpdatePlayerSettingsBadge();return;}return mcBaseApplyGMCommand(data);};

let mcGroupScope='selected';
function mcRenderGroupPanel(){const old=document.querySelector('.gm-batch-editor');if(!old)return;old.outerHTML='<div id="mcGroupPanel" class="mc-group-panel"><div class="mc-group-targets"><button class="active" data-mc-group-scope="selected">Giocatori selezionati</button><button data-mc-group-scope="all">Tutti i giocatori</button></div><div class="mc-group-resources">'+[['energy','Energia / Vigore'],['life','Vita'],['exp','EXP'],['combatBonus','Bonus Combattimento']].map(([f,l])=>'<div class="mc-resource-row"><div class="mc-resource-top"><b>'+l+'</b></div><div class="mc-resource-controls"><input type="number" inputmode="numeric" min="1" step="1" value="1" data-mc-group-amount="'+f+'"><button class="sub" data-mc-group-adjust="'+f+'" data-sign="-1">Leva</button><button class="add" data-mc-group-adjust="'+f+'" data-sign="1">Aggiungi</button></div></div>').join('')+'</div></div>';}

renderGMDashboard=function(){if(!roomSession?.isHost||roomSession.phase!=='playing')return;const all=roomSession.players.filter(p=>!p.isHost),players=all.filter(gmPlayerPassesUiFilter),boss=all.find(p=>p.bossRush);document.getElementById('gmRoomCode').textContent=roomSession.code;document.getElementById('gmPlayerCount').textContent=all.length;updateGMClock();const active=all.filter(p=>!p.locked);document.getElementById('gmActiveTurn').textContent=active.length?active.map(p=>p.name).join(', '):'Nessuno';document.getElementById('gmBossRushPlayer').textContent=boss?boss.name:'Disattivata';const grid=document.getElementById('gmPlayerGrid');if(grid){grid.innerHTML='<div class="mc-gm-grid">'+(players.map(p=>{const s=p.state||{},ch=characters[p.characterId],manage=p.selfManage!==false,discount=!!p.energyDiscount,checked=gmSelectedPlayers.has(p.playerToken)?'checked':'';return '<article class="mc-gm-card '+(p.locked?'locked':'active-turn')+'" data-player-token="'+escapeHtml(p.playerToken)+'"><div class="mc-gm-head"><div class="mc-gm-user"><input class="gm-select-player" type="checkbox" '+checked+'><img src="'+mcPortrait(p.characterId)+'"><div><strong>'+escapeHtml(p.name)+'</strong><small>'+escapeHtml(ch?.name||'Nessun personaggio')+' · '+escapeHtml(s.gradeId||'G4')+'</small></div></div><div class="mc-gm-badges"><span class="mc-gm-badge '+(p.connected===false?'bad':'good')+'">'+(p.connected===false?'Riconnessione':'Online')+'</span><span class="mc-gm-badge '+(p.locked?'warn':'good')+'">'+(p.locked?'Bloccato':'Turno attivo')+'</span><span class="mc-gm-badge '+(manage?'good':'bad')+'">Risorse '+(manage?'ON':'OFF')+'</span><span class="mc-gm-badge '+(discount?'good':'')+'">−3 Energia '+(discount?'ON':'OFF')+'</span></div></div><div class="mc-gm-resources">'+mcRenderResourceRows(p)+'</div><div class="mc-gm-toggle-grid"><button class="mc-gm-toggle" data-mc-toggle="manage"><span><b>Modifica risorse</b><small>Permetti o blocca EXP, Energia e risorse speciali.</small></span><span class="mc-toggle-state '+(manage?'on':'off')+'">'+(manage?'ON':'OFF')+'</span></button><button class="mc-gm-toggle" data-mc-toggle="discount"><span><b>Sconto tecniche</b><small>Le tecniche costano 3 Energia in meno.</small></span><span class="mc-toggle-state '+(discount?'on':'off')+'">'+(discount?'ON':'OFF')+'</span></button></div><div class="mc-gm-actions"><button class="turn" data-mc-action="turn">Dai turno</button><button data-mc-action="lock">'+(p.locked?'Sblocca':'Blocca')+'</button><button data-mc-action="eye">👁 Occhio: '+(p.hasEye?'SÌ':'NO')+'</button><button data-mc-action="boss">Boss Rush: '+(p.bossRush?'ON':'OFF')+'</button><button class="kick" data-mc-action="kick">Espelli</button></div><div class="gm-special-list" style="margin-top:10px">'+gmSpecialPills(p)+'</div></article>';}).join('')||'<div class="stats-empty">Nessun giocatore corrisponde ai filtri.</div>')+'</div>';}
 const logs=[];all.forEach(p=>(p.state?.log||[]).forEach(x=>logs.push({...x,playerName:p.name,characterName:characterDisplayName(p.characterId)})));logs.sort((a,b)=>(b.ts||0)-(a.ts||0));const feed=document.getElementById('gmMovementFeed');if(feed)feed.innerHTML=logs.length?logs.slice(0,160).map(x=>'<div class="gm-feed-item"><strong>'+escapeHtml(x.playerName)+' · '+escapeHtml(x.title)+'</strong><div>'+escapeHtml(x.detail||'')+'</div><div class="gm-feed-meta">'+escapeHtml(x.characterName)+' · '+escapeHtml(x.time||'')+'</div></div>').join(''):'<div class="stats-empty">Nessun movimento registrato.</div>';const select=document.getElementById('gmWinnerSelect');if(select){const old=select.value;select.innerHTML='<option value="">Seleziona il vincitore</option>'+all.filter(p=>p.characterId).map(p=>'<option value="'+escapeHtml(p.playerToken)+'">'+escapeHtml(p.name)+' · '+escapeHtml(characterDisplayName(p.characterId))+'</option>').join('');if(old)select.value=old;}mcBindGMEvents();};
function mcBindGMEvents(){const grid=document.getElementById('gmPlayerGrid');if(grid&&grid.dataset.mcFinalBound!=='1'){grid.dataset.mcFinalBound='1';grid.addEventListener('change',e=>{const card=e.target.closest('[data-player-token]');if(card&&e.target.classList.contains('gm-select-player'))gmToggleSelection(card.dataset.playerToken,e.target.checked);});grid.addEventListener('click',e=>{const card=e.target.closest('[data-player-token]'),btn=e.target.closest('button');if(!card||!btn)return;const id=card.dataset.playerToken;if(btn.dataset.mcAdjust){const input=card.querySelector('[data-mc-amount="'+btn.dataset.mcAdjust+'"]'),amount=Math.abs(Math.trunc(Number(input?.value)||0));if(!amount){showModal('Quantità non valida','','Inserisci un numero maggiore di zero.');return;}gmAdjustPlayer(id,btn.dataset.mcAdjust,(Number(btn.dataset.sign)||1)*amount);return;}if(btn.dataset.mcToggle==='manage')return gmToggleSelfManage(id);if(btn.dataset.mcToggle==='discount')return gmToggleEnergyDiscount(id);if(btn.dataset.mcAction==='turn')return gmGiveTurn(id);if(btn.dataset.mcAction==='lock')return gmTogglePlayerLock(id);if(btn.dataset.mcAction==='eye')return gmToggleEye(id);if(btn.dataset.mcAction==='boss')return gmToggleBossRush(id);if(btn.dataset.mcAction==='kick')return gmKickPlayer(id);});}
 const group=document.getElementById('mcGroupPanel');if(group&&group.dataset.bound!=='1'){group.dataset.bound='1';group.addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;if(btn.dataset.mcGroupScope){mcGroupScope=btn.dataset.mcGroupScope;group.querySelectorAll('[data-mc-group-scope]').forEach(b=>b.classList.toggle('active',b===btn));return;}if(btn.dataset.mcGroupAdjust){const input=group.querySelector('[data-mc-group-amount="'+btn.dataset.mcGroupAdjust+'"]'),amount=Math.abs(Math.trunc(Number(input?.value)||0));if(!amount){showModal('Quantità non valida','','Inserisci un numero maggiore di zero.');return;}const ids=gmTargetIds(mcGroupScope);if(!ids.length){showModal('Nessun giocatore selezionato','','Seleziona almeno un giocatore oppure scegli Tutti.');return;}ids.forEach(id=>gmAdjustPlayer(id,btn.dataset.mcGroupAdjust,(Number(btn.dataset.sign)||1)*amount,false,false));persistRoomResumeSession();broadcastRoomState();renderGMDashboard();}});}}

const mcBaseApplyRoomTurnLock=applyRoomTurnLock;applyRoomTurnLock=function(){mcBaseApplyRoomTurnLock();mcUpdatePlayerSettingsBadge();if(currentId)renderTechniques();};
const mcBaseShowScreen=showScreen;showScreen=function(id){mcBaseShowScreen(id);setTimeout(()=>{if(id==='selection')renderCharacterInfo(uiInfoCharacterId,false);if(id==='roomCharacterSelect')renderRoomDraftSelection(false);if(id==='gameMaster'){mcRenderGroupPanel();mcBindGMEvents();renderGMDashboard();}mcUpdatePlayerSettingsBadge();},0);};
const mcBaseOpenGM=openGMDashboard;openGMDashboard=function(){mcBaseOpenGM();setTimeout(()=>{mcRenderGroupPanel();mcBindGMEvents();renderGMDashboard();},0);};
const mcBaseHandleGuest=handleGuestRoomMessage;handleGuestRoomMessage=function(data){mcBaseHandleGuest(data);if(data?.type==='room_state'||data?.type==='selection_result')setTimeout(()=>{mcUpdatePlayerSettingsBadge();if(roomSession?.phase==='selection')renderRoomDraftSelection(false);if(currentId)renderTechniques();},0);};
setTimeout(()=>{mcRenderGroupPanel();mcBindGMEvents();renderCharacterInfo(uiInfoCharacterId,false);mcUpdatePlayerSettingsBadge();},420);
/* ===== HOME CLAMOROSA + VITA TEMPORANEA ===== */
(function(){
 const homeCast=[
  {id:'gojo',name:'Gojo',portrait:'assets/portraits/gojo.webp',color:'#4aaeff',power:'Infinito · Sfera Blu'},
  {id:'sukuna',name:'Sukuna',portrait:'assets/portraits/sukuna.webp',color:'#ef3551',power:'Taglio del Re delle Maledizioni'},
  {id:'megumi',name:'Megumi',portrait:'assets/portraits/megumi.webp',color:'#2ed8ff',power:'Dieci Ombre · Shikigami'},
  {id:'geto',name:'Geto',portrait:'assets/portraits/geto.webp',color:'#35d17f',power:'Manipolazione degli Spiriti'},
  {id:'mahito',name:'Mahito',portrait:'assets/portraits/mahito.webp',color:'#a64cff',power:'Trasfigurazione dell’Anima'},
  {id:'jogo',name:'Jogo',portrait:'assets/portraits/jogo.webp',color:'#dc6d20',power:'Eruzione Vulcanica'},
  {id:'toji',name:'Toji',portrait:'assets/portraits/toji.webp',color:'#9b4dff',power:'Forza Bruta · Restrizione Celeste'},
  {id:'itadori',name:'Itadori',portrait:'assets/portraits/itadori.webp',color:'#ff557b',power:'Black Flash · Pugno Elettrico'},
  {id:'yuta',name:'Yuta',portrait:'assets/portraits/yuta.webp',color:'#3b7ee8',power:'Rika · Katana Maledetta'}
 ];
 let homeCastIndex=0,homeTimer=null;
 function setHomeCharacter(el,nameEl,data,side){
  if(!el)return;
  const parent=el.closest('.home-character');
  parent?.classList.add('switching');
  setTimeout(()=>{
   el.src=data.portrait;el.alt=data.name;
   if(nameEl)nameEl.textContent=data.name;
   if(parent)parent.style.setProperty('--home-char-color',data.color);
   parent?.classList.remove('switching');
  },240);
 }
 function rotateHomeCast(){
  const left=homeCast[homeCastIndex%homeCast.length],right=homeCast[(homeCastIndex+1)%homeCast.length];
  setHomeCharacter(document.getElementById('homeCharacterLeft'),document.getElementById('homeCharacterLeftName'),left,'left');
  setHomeCharacter(document.getElementById('homeCharacterRight'),document.getElementById('homeCharacterRightName'),right,'right');
  const label=document.getElementById('homeFeaturedPower');if(label)label.textContent=left.power+'  ×  '+right.power;
  const fx=document.getElementById('homePowerFx');if(fx)fx.style.setProperty('--power-color',left.color);
  homeCastIndex=(homeCastIndex+2)%homeCast.length;
 }
 function startHomeCinema(){
  clearInterval(homeTimer);
  if(!document.getElementById('homeCharacterLeft'))return;
  rotateHomeCast();
  if(!document.documentElement.classList.contains('v34-no-motion')&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)homeTimer=setInterval(rotateHomeCast,4300);
 }
 function updateOverMaxLifeUi(){
  if(typeof current==='undefined'||!current)return;
  const badge=document.getElementById('lifeOverMaxBadge'),widget=document.querySelector('.life-widget');
  const over=Number(life)>Number(current.maxLife);
  badge?.classList.toggle('show',over);widget?.classList.toggle('over-max',over);
  if(badge&&over)badge.textContent='+'+(life-current.maxLife)+' Vita temporanea';
 }
 const baseUpdateBars=window.updateBars;
 if(typeof baseUpdateBars==='function')window.updateBars=function(){const out=baseUpdateBars.apply(this,arguments);updateOverMaxLifeUi();return out;};
 const baseRenderAll=window.renderAll;
 if(typeof baseRenderAll==='function')window.renderAll=function(){const out=baseRenderAll.apply(this,arguments);updateOverMaxLifeUi();return out;};
 const baseShowScreen=window.showScreen;
 if(typeof baseShowScreen==='function')window.showScreen=function(id){const out=baseShowScreen.apply(this,arguments);if(id==='home')setTimeout(startHomeCinema,30);return out;};
 let homeTiltRaf=0,homeTiltEvent=null;
 document.addEventListener('pointermove',e=>{
  homeTiltEvent=e;
  if(homeTiltRaf)return;
  homeTiltRaf=requestAnimationFrame(()=>{
   homeTiltRaf=0;
   const card=document.querySelector('#home.active .home-card-v2'),event=homeTiltEvent;
   if(!card||!event||window.innerWidth<760||document.documentElement.classList.contains('v34-no-motion')||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){if(card)card.style.transform='';return;}
   const x=(event.clientX/window.innerWidth-.5)*3.2,y=(event.clientY/window.innerHeight-.5)*-2.2;
   card.style.transform='translate3d(0,-4px,0) rotateY('+x+'deg) rotateX('+y+'deg)';
  });
 },{passive:true});
 document.addEventListener('mouseleave',()=>{const card=document.querySelector('.home-card-v2');if(card)card.style.transform='';});
 setTimeout(()=>{startHomeCinema();updateOverMaxLifeUi();},250);
})();


/* ===== REFINEMENT: DROPDOWN COUNTS + 2.5D TILT ===== */
(function(){
  function updateMoveCounters(){
    const gameCount=document.getElementById('gameMoveCount');
    if(gameCount)gameCount.textContent=document.querySelectorAll('#techGrid .tech-card').length;
    const infoCount=document.getElementById('infoMoveCount');
    if(infoCount)infoCount.textContent=document.querySelectorAll('#characterInfoTechniques .info-tech-card').length;
  }
  const baseRenderTechniques=window.renderTechniques;
  if(typeof baseRenderTechniques==='function')window.renderTechniques=function(){const out=baseRenderTechniques.apply(this,arguments);requestAnimationFrame(updateMoveCounters);return out;};
  const baseRenderCharacterInfo=window.renderCharacterInfo;
  if(typeof baseRenderCharacterInfo==='function')window.renderCharacterInfo=function(){const out=baseRenderCharacterInfo.apply(this,arguments);requestAnimationFrame(updateMoveCounters);return out;};
  document.querySelectorAll('.character-info-image-wrap img,.room-draft-portrait img').forEach(img=>{img.decoding='async';});
  setTimeout(updateMoveCounters,400);
})();
