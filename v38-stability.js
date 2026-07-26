/* JJK Energy V38 - stabilita generale, controlli unificati e schede definitive */
(function(root,factory){
  const api=factory(root||globalThis);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
'use strict';

const VERSION='38.0.0';
const RANK={G4:0,G3:1,G2:2,G1:3,SS:4,SG:5};
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,n(value)));
const rank=id=>RANK[id]??0;

function read(name,fallback=null){
  try{const value=(0,eval)(name);return value===undefined?fallback:value;}
  catch(_){return root[name]===undefined?fallback:root[name];}
}
function write(name,value){
  root[name]=value;root.__jjkV38Value=value;
  try{(0,eval)(name+'=globalThis.__jjkV38Value');}catch(_){}
  delete root.__jjkV38Value;
}
function fn(name){const value=read(name,root[name]);return typeof value==='function'?value:null;}
function setFn(name,value){root[name]=value;root.__jjkV38Fn=value;try{(0,eval)(name+'=globalThis.__jjkV38Fn');}catch(_){}delete root.__jjkV38Fn;}
function esc(value){try{return fn('escapeHtml')?.(value)||String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}catch(_){return String(value??'');}}
const chars=()=>read('characters',root.characters||{});
const cid=()=>read('currentId',null);
const current=()=>read('current',null);
const grade=()=>read('gradeId','G4');
const room=()=>read('roomSession',root.roomSession||null);
const used=()=>Array.isArray(read('used',[]))?read('used',[]):[];

function itadoriBonuses(value){
  const fingers=clamp(value,0,20),out={body:0,life:0,energy:0};
  if(fingers>=4)out.body+=1;
  if(fingers>=8){out.body+=1;out.life+=1;}
  if(fingers>=12){out.body+=1;out.life+=1;out.energy+=2;}
  if(fingers>=16){out.body+=1;out.life+=1;out.energy+=2;}
  if(fingers>=20){out.body+=1;out.life+=1;out.energy+=2;}
  return out;
}
function itadoriMaxLife(fingers=read('itadoriMaxFingers',0)){return 4+itadoriBonuses(fingers).life;}
function itadoriMaxEnergy(g,fingers=read('itadoriMaxFingers',0)){return n(g?.max)+itadoriBonuses(fingers).energy;}

function finalBlueprints(){return {
  jogo:{
    maxLife:8,baseBody:5,coins:0,isJogo:true,lifeEnergyLinked:false,resourceLimit:null,
    innateName:'Natura Vulcanica',
    innateEffect:'Può muoversi liberamente fino a 4 caselle. Non può usare il Fato.',
    grades:[
      {id:'G4',label:'Grado 4',max:10,exp:0},{id:'G3',label:'Grado 3',max:12,exp:7},
      {id:'G2',label:'Grado 2',max:15,exp:16},{id:'G1',label:'Grado 1',max:18,exp:26},
      {id:'SS',label:'Semi Special Grade',max:20,exp:35},{id:'SG',label:'Special Grade',max:23,exp:45}
    ],
    techniques:[
      {key:'insetti',name:'Insetti Ardenti',grade:'G4',cost:5,bonus:4,image:'assets/jogo_g4.png'},
      {key:'vulcani',name:'Vulcani',grade:'G3',cost:8,bonus:6,image:'assets/jogo_sheet.png',v37JogoVolcano:true,v27CostLabel:'Costo: 8 Energia · +6 Corpo',extra:'Crea un Vulcano sulla casella. PVE: i nemici pescati contro Jogo hanno −2 Corpo. PVP: Jogo guadagna Energia quando altri raccolgono EM sulla casella del Vulcano.'},
      {key:'salvataggio_hanami',name:'Salvataggio di Emergenza Hanami',grade:'G2',cost:10,bonus:null,image:'assets/jogo_g2.png',v37JogoHanami:true,v27JogoHanami:true,effect:'Perdi automaticamente lo scontro e tira 1d6. Con 3-6 Hanami ti salva; con 1-2 la mossa fallisce.'},
      {key:'meteora2',name:'Meteora Infuocata',grade:'G1',cost:12,bonus:9,image:'assets/jogo_g1.png',v37JogoMeteor:true,extra:'Ottieni automaticamente 1 Calore, massimo 8. Solo questa tecnica riceve +1 Corpo per ogni Calore già accumulato.'},
      {key:'bara_ferro',name:'(Dominio) Bara della Montagna di Ferro',grade:'SS',cost:18,bonus:15,image:'assets/jogo_sheet.png',v37JogoDomain:true,extra:'Aggiunge +1 Corpo per ogni Vulcano presente, massimo +3. Distrugge una casella trasformandola in Cratere.'},
      {key:'placche_tettoniche',name:'Manipolazione Placche Tettoniche',grade:'SG',cost:0,bonus:null,image:'assets/jogo_sheet.png',v37JogoTectonic:true,effect:'Passiva SG: ogni Vulcano può muoversi fino a 4 caselle. Una volta per turno puoi consumare un Vulcano e trasformare la sua casella in Cratere.'}
    ]
  },
  itadori:{
    name:'Yuji Itadori',baseMaxLife:4,maxLife:4,baseBody:4,coins:1,hasFingers:true,
    innateName:'Richiamo del Ricettacolo Perfetto',
    innateEffect:'Guadagna 1 Dito per ogni mostro abbattuto, fino a 12. Sconfiggere Sukuna concede 5 Dita. Se è adiacente a un giocatore con un Dito viene attirato nella sua casella e ne ruba immediatamente 1.',
    grades:[
      {id:'G4',label:'Grado 4',max:10,exp:0},{id:'G3',label:'Grado 3',max:12,exp:9},
      {id:'G2',label:'Grado 2',max:15,exp:19},{id:'G1',label:'Grado 1',max:18,exp:30},
      {id:'SS',label:'Semi Special Grade',max:20,exp:42},{id:'SG',label:'Special Grade',max:21,exp:50}
    ],
    techniques:[
      {key:'pugno_divergente',name:'Pugno Divergente',grade:'G4',cost:4,bonus:4,image:'assets/itadori_g4.webp'},
      {key:'black_flash_itadori',name:'Black Flash',grade:'G3',cost:0,bonus:null,image:'assets/itadori_g1.webp',v27ItadoriBlackFlash:true,itadoriBlackFlash:true,v27CostLabel:'Costo: somma dei dadi validi',effect:'Continua a lanciare dadi finché ogni risultato è maggiore o uguale al precedente. Se l’Energia non basta, il Corpo diminuisce di 1 per ogni punto mancante.'},
      {key:'manipolazione_sangue',name:'Manipolazione del Sangue',grade:'G2',cost:0,bonus:null,image:'assets/itadori_g3.webp',v37ItadoriBlood:true,v27CostLabel:'1 Vita → 10 Energia',effect:'Una volta per turno, in qualsiasi momento, converti 1 Vita in 10 Energia Maledetta.'},
      {key:'freccia_itadori',name:'Freccia Infuocata',grade:'G1',cost:10,bonus:10,lifeCost:1,image:'assets/itadori_freccia.webp',extra:'Costo aggiuntivo: perdi 1 Vita.'},
      {key:'richiamo_anima_sukuna',name:"(Dominio) Richiamo dell'Anima di Sukuna",grade:'SS',cost:0,bonus:null,image:'assets/itadori_ss.webp',v37ItadoriSoulDomain:true,v27CostLabel:'Costo: risultato d24 · Corpo: d24 limitato dall’EM + 2d6',effect:'Lancia il dado Taglio di Sukuna e 2d6. Il risultato del d24 determina costo e Corpo; se l’Energia non basta, il Corpo del d24 viene ridotto.'},
      {key:'immortalita',name:'Immortalità',grade:'SG',cost:0,bonus:null,image:'assets/itadori_taglio.webp',v37ItadoriImmortality:true,effect:'Passiva, una volta per partita: quando stai per morire recuperi immediatamente tutta la Vita e tutta l’Energia.'}
    ]
  }
};}

function enforceCharacters(){
  const all=chars(),bp=finalBlueprints();
  for(const id of ['jogo','itadori']){
    if(!all[id])continue;
    const image=all[id].image;
    Object.assign(all[id],bp[id]);
    if(image)all[id].image=image;
  }
  if(all.itadori)all.itadori.maxLife=itadoriMaxLife();
  if(cid()==='itadori')write('current',all.itadori);
  if(cid()==='jogo')write('current',all.jogo);
  if(root.JJK_UI_META?.itadori)root.JJK_UI_META.itadori.description='Ricettacolo perfetto: 4 Vita, 4 Corpo, progressione permanente fino a 20 Dita e Immortalità al grado SG.';
  if(root.JJK_UI_META?.jogo)root.JJK_UI_META.jogo.description='Spirito vulcanico: Energia separata dalla Vita, Vulcani, Crateri e Calore esclusivo di Meteora Infuocata.';
}

function techniqueAvailable(t){
  try{return fn('techniqueIsAvailable')?!!fn('techniqueIsAvailable')(t):rank(grade())>=rank(t.grade);}catch(_){return rank(grade())>=rank(t.grade);}
}
function baseBody(){
  if(cid()==='itadori')return 4+itadoriBonuses(read('itadoriMaxFingers',0)).body;
  try{return n(fn('effectiveBaseBody')?.());}catch(_){return n(current()?.baseBody);}
}
function copiedData(){return read('yutaCopiedTechnique',null);}
function copiedSource(){try{return fn('getYutaCopiedSource')?.()||null;}catch(_){return null;}}
function displayedTechnique(t){
  if(cid()==='yuta'&&t.yutaCopy&&copiedData()){
    const src=copiedSource();
    return {name:'Copia: '+(copiedData().techName||src?.t?.name||'Tecnica'),image:copiedData().image||src?.t?.image||t.image};
  }
  return {name:t.name,image:t.image};
}
function lifeCost(t){try{return n(fn('extractTechniqueLifeCost')?.(t));}catch(_){return n(t.lifeCost);}}
function costLabel(t){
  if(cid()==='yuta'&&t.yutaCopy){try{return fn('yutaCopiedCostLabel')?.(copiedData())||'Scegli una tecnica da copiare';}catch(_){return 'Tecnica copiata';}}
  if(t.v27CostLabel)return t.v27CostLabel;
  if(t.dynamicCost)return 'Costo: risultato del dado';
  if(t.itadoriBlackFlash)return 'Costo: somma dei dadi validi';
  const resource=cid()==='toji'?'Vigore':'Energia';
  return 'Costo: '+n(t.cost)+' '+resource+(lifeCost(t)?' + '+lifeCost(t)+' Vita':'');
}
function preview(t){
  const body=baseBody(),combat=n(read('combatBonus',0));
  if(t.dynamicCost||t.itadoriBlackFlash||t.v37ItadoriSoulDomain)return {value:'DADO',note:'Il totale viene calcolato dopo il lancio'};
  if(t.v37JogoHanami||t.v27JogoHanami)return {value:'EFFETTO',note:'Risoluzione tramite dado'};
  if(t.v37ItadoriBlood||t.v37ItadoriImmortality||t.v37JogoTectonic)return {value:'PASSIVA',note:t.effect||'Effetto speciale'};
  if(typeof t.bonus==='number'){
    let bonus=n(t.bonus);
    if(cid()==='jogo'&&t.key==='meteora2')bonus+=clamp(read('jogoHeat',0),0,8);
    if(cid()==='jogo'&&t.key==='bara_ferro')bonus+=Math.min(3,Math.max(0,n(read('jogoVolcanoes',0))));
    return {value:String(body+bonus+combat),note:'Corpo attuale + effetto tecnica'};
  }
  return {value:'EFFETTO',note:t.effect||t.extra||'Tecnica speciale'};
}

function renderTechniquesV38(){
  const grid=document.getElementById('techGrid'),ch=current();
  if(!grid||!ch)return;
  grid.innerHTML='';
  ch.techniques.filter(techniqueAvailable).forEach(t=>{
    const display=displayedTechnique(t),card=document.createElement('article'),spent=used().includes(t.key),p=preview(t);
    card.className='tech-card'+(spent?' used':'')+(cid()==='yuta'&&t.yutaKatana&&read('yutaKatanaActive',false)?' yuta-katana-active':'');
    const badge=t.badge||t.grade,badgeClass=t.fingerOnly?'FINGER':t.grade;
    let label='Utilizza';
    if(cid()==='yuta'&&t.yutaKatana)label=read('yutaKatanaActive',false)?'Disattiva combo':'Attiva combo';
    if(cid()==='yuta'&&t.yutaCopy&&!copiedData())label='Scegli tecnica';
    if(cid()==='yuta'&&t.yutaReverse)label='Gestisci conversione';
    card.innerHTML='<div class="tech-grade-badge grade-'+esc(badgeClass)+'">'+esc(badge)+'</div><img src="'+esc(display.image||'')+'" alt="'+esc(display.name)+'"><div class="tech-content"><div class="tech-name">'+esc(display.name)+'</div><div class="tech-cost">'+esc(costLabel(t))+'</div><div class="v38-preview"><small>Totale se usata</small><b>'+esc(p.value)+'</b><span>'+esc(p.note)+'</span></div><button type="button" class="v38-use-btn" data-tech-key="'+esc(t.key)+'" '+(spent?'disabled':'')+'>'+esc(spent?'UTILIZZATA':label)+'</button></div>';
    grid.appendChild(card);
  });
  const count=document.getElementById('gameMoveCount');if(count)count.textContent=String(grid.children.length);
}

function installTechniqueClicks(){
  if(document.documentElement.dataset.v38TechClicks)return;
  document.documentElement.dataset.v38TechClicks='1';
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('#techGrid .v38-use-btn');
    if(!button||button.disabled)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    const key=button.dataset.techKey;
    if(!key)return;
    try{fn('useTechnique')?.(key);}catch(error){console.error('[V38 technique]',key,error);fn('showModal')?.('Errore tecnica','',String(error?.message||error));}
  },true);
}

function roomPlayer(id){return (room()?.players||[]).find(p=>String(p.playerToken)===String(id)||String(p.peerId)===String(id));}
function gradeForPlayer(p){const gs=chars()?.[p?.characterId]?.grades||[],xp=n(p?.state?.exp);let g=gs[0]||{id:'G4',max:0,exp:0};gs.forEach(x=>{if(xp>=n(x.exp))g=x;});return g;}
function playerMaxEnergy(p){const g=gradeForPlayer(p);return n(g.max)+(p?.characterId==='itadori'?itadoriBonuses(p?.state?.itadoriMaxFingers).energy:0);}
function playerMaxLife(p){if(p?.characterId==='jogo')return 8;if(p?.characterId==='itadori')return 4+itadoriBonuses(p?.state?.itadoriMaxFingers).life;return Math.max(1,n(p?.state?.maxLife)||n(chars()?.[p?.characterId]?.maxLife)||1);}
function gmOptions(p){
  const out=[['life','Vita'],['energy',p.characterId==='toji'?'Vigore':'Energia'],['exp','EXP'],['combatBonus','Bonus Combattimento']];
  if(p.characterId==='geto')out.push(['tokens','Segnalini Maledetti'],['getoOneUse','Corpo monouso']);
  if(p.characterId==='jogo')out.push(['jogoHeat','Calore'],['jogoVolcanoes','Vulcani'],['jogoCraters','Crateri']);
  if(p.characterId==='toji')out.push(['tojiCollectedEnergy','Energia raccolta']);
  if(p.characterId==='itadori')out.push(['itadoriFingers','Dita attuali']);
  if(p.characterId==='yuta')out.push(['yutaCopiedTokens','Segnalini copiati'],['yutaCopiedVigor','Vigore copiato'],['yutaCopiedFingers','Dita copiate'],['yutaCopiedHeat','Calore copiato']);
  return out;
}
function adjustPlayerState(p,field,delta){
  if(!p?.state)return {changed:false,before:0,after:0};
  const s=p.state,d=Math.trunc(n(delta)),before=n(s[field]);
  if(!d)return {changed:false,before,after:before};
  if(field==='life'){
    const max=playerMaxLife(p);s.maxLife=max;s.life=Math.max(0,n(s.life)+d);
    if(s.life===0){s.life=max;s.energy=playerMaxEnergy(p);s.used=[];}
    if(p.characterId==='jogo')s.jogoLife=s.life;
  }else if(field==='energy'){
    const next=Math.max(0,n(s.energy)+d);s.energy=p.characterId==='toji'?Math.min(playerMaxEnergy(p),next):next;
  }else if(field==='exp'){
    const gs=chars()?.[p.characterId]?.grades||[],max=n(gs[gs.length-1]?.exp),old=s.gradeId||'G4';s.exp=clamp(n(s.exp)+d,0,max);const g=gradeForPlayer(p);s.gradeId=g.id;if(rank(g.id)>rank(old))s.energy=Math.max(n(s.energy),playerMaxEnergy(p));
  }else if(field==='combatBonus')s[field]=clamp(before+d,-99,99);
  else if(['tokens','yutaCopiedTokens','jogoVolcanoes','jogoCraters'].includes(field))s[field]=Math.max(0,before+d);
  else if(['jogoHeat','yutaCopiedHeat'].includes(field))s[field]=clamp(before+d,0,8);
  else if(field==='tojiCollectedEnergy')s[field]=clamp(before+d,0,20);
  else if(field==='getoOneUse')s[field]=clamp(before+d,0,2);
  else if(field==='itadoriFingers'){
    s.itadoriFingers=clamp(before+d,0,20);s.itadoriMaxFingers=Math.max(n(s.itadoriMaxFingers),s.itadoriFingers);s.maxLife=playerMaxLife(p);
  }else if(field==='yutaCopiedFingers'){
    s[field]=clamp(before+d,0,20);s.yutaCopiedMaxFingers=Math.max(n(s.yutaCopiedMaxFingers),s[field]);
  }else if(field==='yutaCopiedVigor')s[field]=Math.max(0,before+d);
  else return {changed:false,before,after:before};
  s.updatedAt=Date.now();return {changed:n(s[field])!==before,before,after:n(s[field])};
}
function sendGmUpdate(p,field,delta,result){
  const nonce='gm38_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);p.pendingGmNonce=nonce;
  try{fn('sendToRoomPlayer')?.(p.playerToken,{type:'gm_command',command:'adjust',field,delta:result.after-result.before,before:result.before,after:result.after,label:new Map(gmOptions(p)).get(field)||field,notice:(new Map(gmOptions(p)).get(field)||field)+': '+result.before+' → '+result.after,state:p.state,nonce});}catch(_){}
  try{fn('persistRoomResumeSession')?.();fn('broadcastRoomState')?.();}catch(_){}
}
function gmAdjustV38(id,field,delta){const p=roomPlayer(id);if(!room()?.isHost||room()?.phase!=='playing'||!p?.state)return;const result=adjustPlayerState(p,field,delta);if(!result.changed){fn('showModal')?.('Nessuna variazione','', 'La risorsa è già al limite.');return;}sendGmUpdate(p,field,delta,result);}
function patchGmCards(){
  if(!room()?.isHost||room()?.phase!=='playing')return;
  document.querySelectorAll('#gmPlayerGrid .gm-player-card').forEach(card=>{
    const p=roomPlayer(card.dataset.playerToken);if(!p)return;
    card.classList.add('v38-gm-card');
    card.querySelector('[data-gm-action="lock"]')?.remove();
    const turn=card.querySelector('[data-gm-action="turn"],[data-v38-action="turn"]');if(turn){turn.dataset.v38Action='turn';turn.removeAttribute('data-gm-action');turn.textContent=p.locked?'Dai turno':'Termina turno';}
    const apply=card.querySelector('[data-gm-action="adjust"],.gm-apply-custom');if(apply){apply.dataset.v38Action='adjust';apply.removeAttribute('data-gm-action');apply.textContent='Applica modifica';}
    ['eye','boss','kick'].forEach(a=>{const b=card.querySelector('[data-gm-action="'+a+'"]');if(b){b.dataset.v38Action=a;b.removeAttribute('data-gm-action');}});
    const select=card.querySelector('.gm-resource-select:not(.gm-operation-select)');if(select){const old=select.value;select.innerHTML=gmOptions(p).map(([v,l])=>'<option value="'+esc(v)+'">'+esc(l)+'</option>').join('');if([...select.options].some(o=>o.value===old))select.value=old;}
    const boxes=card.querySelectorAll('.gm-resource-box');if(p.characterId==='jogo'&&boxes[1]){const max=playerMaxEnergy(p),energy=n(p.state.energy);boxes[1].querySelector('.gm-resource-label').textContent='Energia · separata dalla Vita';boxes[1].querySelector('.gm-resource-value').textContent=energy+' / '+max+(energy>max?' · +'+(energy-max)+' extra':'');}
  });
}
function installGmClicks(){
  if(document.documentElement.dataset.v38GmClicks)return;document.documentElement.dataset.v38GmClicks='1';
  document.addEventListener('click',event=>{
    const card=event.target.closest?.('#gmPlayerGrid .gm-player-card'),button=event.target.closest?.('button');if(!card||!button)return;
    const action=button.dataset.v38Action||button.dataset.gmAction||(button.classList.contains('gm-adjust')?'legacy-adjust':null);if(!action)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();const id=card.dataset.playerToken,p=roomPlayer(id);if(!p)return;
    if(action==='adjust'||action==='legacy-adjust'){
      const field=card.querySelector('.gm-resource-select:not(.gm-operation-select)')?.value||'energy';
      const operation=action==='legacy-adjust'?n(button.dataset.delta)||1:n(card.querySelector('.gm-operation-select')?.value)||1;
      const amount=action==='legacy-adjust'?1:Math.abs(Math.trunc(n(card.querySelector('.gm-resource-amount')?.value)));
      if(!amount){fn('showModal')?.('Quantità non valida','','Inserisci una quantità maggiore di zero.');return;}gmAdjustV38(id,field,operation*amount);return;
    }
    if(action==='turn'){
      if(p.locked)room().players.filter(x=>!x.isHost).forEach(x=>x.locked=x.playerToken!==p.playerToken);else p.locked=true;fn('persistRoomResumeSession')?.();fn('broadcastRoomState')?.();return;
    }
    if(action==='eye')fn('gmToggleEye')?.(id);else if(action==='boss')fn('gmToggleBossRush')?.(id);else if(action==='kick')fn('gmKickPlayer')?.(id);
  },true);
}

function removeObsoleteUi(){
  const oldFinger=document.getElementById('itadoriFingerPanel');if(oldFinger){oldFinger.querySelector('.itadori-finger-actions')?.setAttribute('hidden','');oldFinger.querySelector('.itadori-milestones')?.setAttribute('hidden','');}
  document.getElementById('itadoriChosoPanel')?.setAttribute('hidden','');
  document.getElementById('v27ItadoriChoices')?.setAttribute('hidden','');
  const heat=document.getElementById('jogoHeatSection');if(heat){heat.querySelector('.jogo-actions')?.setAttribute('hidden','');}
}
function installStyles(){if(document.getElementById('v38Style'))return;const style=document.createElement('style');style.id='v38Style';style.textContent=`
.v38-use-btn{width:100%;min-height:42px;margin-top:10px;border:1px solid rgba(86,194,255,.62);border-radius:12px;background:linear-gradient(135deg,#167bd2,#173e72);color:#fff;font-weight:900;cursor:pointer}.v38-use-btn:disabled{opacity:.34;cursor:not-allowed}.v38-preview{display:grid;grid-template-columns:1fr auto;gap:3px 10px;margin-top:10px;padding:10px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(3,10,18,.55)}.v38-preview small{color:#8ea5b8;text-transform:uppercase;font-size:.58rem}.v38-preview b{font-size:1.1rem}.v38-preview span{grid-column:1/-1;color:#91a8b9;font-size:.62rem}.v38-gm-card .gm-resource-editor{gap:8px}.v38-gm-card .gm-btn{white-space:normal;line-height:1.15}#jogoHeatSection .jogo-actions{display:none!important}#jogoHeatSection .jogo-title::after{content:' · automatico';color:#ffae70;font-size:.7em}#itadoriChosoPanel,[hidden]{display:none!important}`;document.head.appendChild(style);}

function wrapStateFunctions(){
  const baseCreate=fn('createInitialRoomPlayerState');if(baseCreate&&!baseCreate.__v38){const wrapped=function(id){enforceCharacters();const s=baseCreate.apply(this,arguments)||{};if(id==='itadori'){s.life=4;s.maxLife=4;s.energy=10;s.exp=0;s.gradeId='G4';s.itadoriFingers=0;s.itadoriMaxFingers=0;s.itadoriImmortalityUsed=false;}if(id==='jogo'){s.life=8;s.maxLife=8;s.energy=10;s.jogoLife=8;s.jogoHeat=0;s.jogoVolcanoes=0;s.jogoCraters=0;}return s;};wrapped.__v38=true;setFn('createInitialRoomPlayerState',wrapped);}
  const baseSanitize=fn('sanitizeRoomState');if(baseSanitize&&!baseSanitize.__v38){const wrapped=function(state,id){enforceCharacters();const clean=baseSanitize.apply(this,arguments);if(!clean)return clean;const raw=state||{};if(id==='itadori'){clean.itadoriFingers=clamp(raw.itadoriFingers,0,20);clean.itadoriMaxFingers=Math.max(clean.itadoriFingers,clamp(raw.itadoriMaxFingers,0,20));clean.maxLife=4+itadoriBonuses(clean.itadoriMaxFingers).life;clean.life=Math.max(0,n(raw.life));clean.energy=Math.max(0,n(raw.energy));}if(id==='jogo'){clean.maxLife=8;clean.life=Math.max(0,n(raw.life));clean.jogoLife=clean.life;clean.energy=Math.max(0,n(raw.energy));clean.jogoHeat=clamp(raw.jogoHeat,0,8);clean.jogoVolcanoes=Math.max(0,n(raw.jogoVolcanoes));clean.jogoCraters=Math.max(0,n(raw.jogoCraters));}return clean;};wrapped.__v38=true;setFn('sanitizeRoomState',wrapped);}
}

function audit(){
  const all=chars(),issues=[];
  if(all.itadori?.maxLife!==itadoriMaxLife())issues.push('Itadori maxLife non sincronizzata');
  const expected=['pugno_divergente','black_flash_itadori','manipolazione_sangue','freccia_itadori','richiamo_anima_sukuna','immortalita'];
  if(expected.some((k,i)=>all.itadori?.techniques?.[i]?.key!==k))issues.push('Tecniche Itadori non definitive');
  if(all.jogo?.techniques?.find(t=>t.key==='vulcani')?.bonus!==6)issues.push('Vulcani non vale +6');
  const buttons=[...document.querySelectorAll('#techGrid .v38-use-btn')];
  if(document.getElementById('techGrid')&&current()&&buttons.length!==current().techniques.filter(techniqueAvailable).length)issues.push('Numero pulsanti tecniche non coerente');
  const result={version:VERSION,ok:issues.length===0,issues,itadori:{life:all.itadori?.maxLife,body:all.itadori?.baseBody,techniques:all.itadori?.techniques?.map(t=>t.key)},jogo:{life:all.jogo?.maxLife,body:all.jogo?.baseBody},buttons:buttons.length};
  root.JJKV38Audit=result;return result;
}

function refresh(){enforceCharacters();removeObsoleteUi();renderTechniquesV38();patchGmCards();}
function install(){
  if(root.__JJK_V38__)return;root.__JJK_V38__=true;
  installStyles();installTechniqueClicks();installGmClicks();wrapStateFunctions();
  enforceCharacters();setFn('renderTechniques',renderTechniquesV38);setFn('gmAdjustPlayer',gmAdjustV38);
  const baseRenderAll=fn('renderAll');if(baseRenderAll&&!baseRenderAll.__v38){const wrapped=function(){const result=baseRenderAll.apply(this,arguments);setTimeout(refresh,0);return result;};wrapped.__v38=true;setFn('renderAll',wrapped);}
  const baseOpen=fn('openCharacter');if(baseOpen&&!baseOpen.__v38){const wrapped=function(id){enforceCharacters();const result=baseOpen.apply(this,arguments);enforceCharacters();setTimeout(refresh,0);return result;};wrapped.__v38=true;setFn('openCharacter',wrapped);}
  const baseGm=fn('renderGMDashboard');if(baseGm&&!baseGm.__v38){const wrapped=function(){const result=baseGm.apply(this,arguments);setTimeout(patchGmCards,0);return result;};wrapped.__v38=true;setFn('renderGMDashboard',wrapped);}
  refresh();setTimeout(refresh,300);setTimeout(()=>{refresh();console.info('JJK Energy V38 audit',audit());},1200);
  root.JJKV38={version:VERSION,audit,refresh,enforceCharacters,itadoriBonuses,adjustPlayerState,renderTechniques:renderTechniquesV38};
}

return{version:VERSION,install,itadoriBonuses,finalBlueprints,adjustPlayerState};
});
