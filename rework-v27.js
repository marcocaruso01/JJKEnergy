/* JJK Energy V27 - Rework personaggi, Domini e risorse speciali */
(function(){
'use strict';

const VERSION='V27';
const TURN_RESET_KEYS=new Set(['taglio_passiva','sontuosa','tamamo','sciame','manipolazioni_ceneri']);
let jogoVolcanoes=0;
let jogoCraters=0;
let itadoriFingerChoices={'5':null,'10':null,'15':null};

function n(value,fallback=0){const x=Number(value);return Number.isFinite(x)?x:fallback;}
function clamp(value,min,max){return Math.max(min,Math.min(max,n(value)));}
function esc(value){try{return typeof escapeHtml==='function'?escapeHtml(value):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}catch(e){return String(value??'');}}
function getRank(id){try{return n(rank[id]);}catch(e){return ({G4:0,G3:1,G2:2,G1:3,SS:4,SG:5})[id]||0;}}
function bossFree(){try{return !!isBossRushFree();}catch(e){return false;}}
function currentEvents(){try{return roomSession?.settings?.events||{};}catch(e){return {};}}
function anyEventActive(){const e=currentEvents();return !!(e.boss_rush?.active||e.double_exp?.active);}
function discountedCost(id,cost){try{return Math.max(0,n(mcDiscountCost(id,cost)));}catch(e){return Math.max(0,n(cost));}}
function techniqueBy(id,key){return characters[id]?.techniques?.find(t=>t.key===key)||null;}
function localKey(id,suffix){return 'jjk_'+id+'_'+suffix;}
function readJson(key,fallback){try{const raw=localStorage.getItem(key);if(!raw)return fallback;const parsed=JSON.parse(raw);return parsed??fallback;}catch(e){return fallback;}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}
function notify(title,text,color){try{if(typeof showPlayerNotification==='function')showPlayerNotification(title,text,color||'#61c7ff');else showModal(title,'',text);}catch(e){}}

/* ------------------------------------------------------------------
   DATI PERSONAGGI
------------------------------------------------------------------ */
characters.gojo.techniques=[
  {key:'blu',name:'Bagliore Blu',grade:'G4',cost:2,bonus:4,image:'assets/bagliore_blu.webp'},
  {key:'rosso',name:'Bagliore Rosso',grade:'G3',cost:7,bonus:6,image:'assets/bagliore_rosso.webp'},
  {key:'infinito',name:'Infinito',grade:'G2',cost:10,bonus:null,image:'assets/infinito.webp',effect:'L’avversario consuma Energia pari al costo della tecnica scelta. Entrambi portano il Combattimento a 0 e tirano 1d6.'},
  {key:'viola',name:'Bagliore Viola',grade:'G1',cost:12,bonus:12,lifeCost:0,image:'assets/bagliore_viola.webp',extra:'Nessun costo in Vita.'},
  {key:'vuoto',name:'(Dominio) Vuoto Incommensurabile',grade:'SS',cost:15,bonus:15,image:'assets/vuoto_incommensurabile.webp',extra:'Tira 1 dado totale e applica il malus previsto.'}
];

Object.assign(characters.megumi,{
  innateName:'Dieci Ombre',
  innateEffect:'Controlla lo Shikigami e può richiamarlo nella propria casella. Il Dominio teletrasporta immediatamente lo Shikigami.'
});
characters.megumi.techniques=characters.megumi.techniques.map(t=>t.key==='giardino'?{
  ...t,name:'(Dominio) Giardino delle Ombre Chimera',cost:18,bonus:11,v27MegumiDomain:true,
  extra:'Teletrasporta lo Shikigami nella tua casella. Se fai 1 o 2 col dado, perdi 1 Vita.'
}:t);

Object.assign(characters.geto,{
  innateName:'Manipolazione degli Spiriti Maledetti',
  innateEffect:'Accumula Segnalini Maledetti assorbendo maledizioni e li consuma per potenziare le evocazioni più distruttive.'
});
characters.geto.techniques=[
  {key:'centipede',name:'Cursed Centipede',grade:'G4',cost:4,bonus:2,image:'assets/geto_correct_g4.webp'},
  {key:'doppia',name:'Doppia Evocazione',grade:'G3',cost:7,bonus:5,image:'assets/geto_correct_g3.webp',extra:'Evoca 2 maledizioni insieme. Non consuma Segnalini Maledetti.'},
  {key:'tamamo',name:'Tamamo No Mae',grade:'G2',cost:10,bonus:null,image:'assets/geto_scheda.webp',v27GetoTamamo:true,v27CostLabel:'Costo: 10 Energia',effect:'Passiva: assorbi tutti i Segni Maledetti presenti sulla mappa. Dopo l’attivazione salti automaticamente il turno.'},
  {key:'drago',name:'Drago Arcobaleno',grade:'G1',cost:14,bonus:null,image:'assets/geto_correct_g1.webp',v27GetoRainbow:true,v27CostLabel:'A: 14 Energia · +9 Corpo | B: 14 Energia + 8 Segnalini · +13 Corpo',effect:'Scegli una delle due modalità al momento dell’utilizzo.'},
  {key:'sciame',name:'Sciame di Maledizioni',grade:'SS',cost:0,bonus:null,image:'assets/geto_scheda.webp',v27GetoSwarm:true,v27CostLabel:'Costo: 0 Energia',effect:'Passiva: ottieni 10 Segnalini Maledetti e salti automaticamente il turno.'},
  {key:'uzumaki',name:'(Dominio) Uzumaki',grade:'SG',cost:17,bonus:17,image:'assets/geto_correct_sg.webp',tokenCost:10,v27GetoUzumaki:true,v27CostLabel:'Costo: 17 Energia + 10 Segnalini',extra:'Il Corpo monouso non può essere aggiunto a questa tecnica.'}
];

Object.assign(characters.sukuna,{
  innateName:'Santuario e Tecniche del Re delle Maledizioni',
  innateEffect:'Domina tagli, fiamme e rilanci dei dadi. Sontuosa Arroganza non può essere usata durante gli eventi del Game Master o la Boss Rush.'
});
characters.sukuna.techniques=[
  {key:'solitudine',name:'La Solitudine del Più Forte',grade:'G4',cost:0,bonus:null,image:'assets/sukuna_g4.webp',effect:'Durante questo combattimento lancia 4 dadi e scegli quello con il valore più alto.'},
  {key:'taglio_passiva',name:'Taglio',grade:'G3',cost:0,bonus:null,image:'assets/sukuna_g3.webp',effect:'Passiva, una volta per turno: taglia una carta appena pescata e pescane immediatamente una nuova.'},
  {key:'sontuosa',name:'Sontuosa Arroganza',grade:'G2',cost:5,bonus:null,image:'assets/sukuna_g2.webp',v27SukunaReroll:true,v27CostLabel:'Rilancio d6: 5 Energia · Rilancio d20: 10 Energia',effect:'Passiva: paga 5 Energia per rilanciare 1d6 oppure 10 Energia per rilanciare 1d20. Non utilizzabile durante eventi e Boss Rush.'},
  {key:'freccia',name:'Freccia Infuocata',grade:'G1',cost:10,bonus:6,image:'assets/sukuna_g1.webp'},
  {key:'reliquario',name:'(Dominio) Reliquiario Maledetto',grade:'SS',cost:16,bonus:11,image:'assets/sukuna_ss.webp',extra:'I personaggi sulla stessa casella non coinvolti nella battaglia perdono 1 Vita. I personaggi nelle caselle adiacenti tirano 1d6: 1-3 perdono 1 Vita, 4-6 non perdono Vita.'},
  {key:'worldslash',name:'World Slash',grade:'SG',cost:0,bonus:null,image:'assets/sukuna_sg.webp',dynamicCost:true,effect:'Lancia un d24. Il risultato stabilisce sia il costo in Energia sia il Corpo ottenuto dalla tecnica.'}
];

characters.mahito.techniques=characters.mahito.techniques.map(t=>t.key==='autoreincarnazione'?{...t,name:'(Dominio) Autoreincarnazione della Perfezione'}:t);

Object.assign(characters.yuta,{
  innateName:'Rika e Copia',
  innateEffect:'Può combinare la Katana con le tecniche compatibili e copiare integralmente una tecnica del roster.'
});
characters.yuta.techniques=characters.yuta.techniques.map(t=>t.key==='dominio_yuta'?{...t,name:'(Dominio) Mondo di Katane'}:t);

Object.assign(characters.itadori,{
  name:'Yuji Itadori',baseMaxLife:7,maxLife:7,baseBody:6,coins:1,hasFingers:true,
  innateName:'Richiamo del Ricettacolo Perfetto',
  innateEffect:'Quando si trova adiacente a un giocatore che possiede un Dito viene attirato nella sua casella e ruba immediatamente 1 Dito in PVP. Può ingaggiare anche mostri PVE adiacenti alla casella di arrivo. Al grado SG tutte le Dita sigillate tornano in gioco.',
  grades:[
    {id:'G4',label:'Grado 4',max:10,exp:0},{id:'G3',label:'Grado 3',max:12,exp:9},{id:'G2',label:'Grado 2',max:15,exp:19},{id:'G1',label:'Grado 1',max:18,exp:30},{id:'SS',label:'Semi Special Grade',max:20,exp:42},{id:'SG',label:'Special Grade',max:23,exp:50}
  ]
});
characters.itadori.techniques=[
  {key:'pugno_divergente',name:'Pugno Divergente',grade:'G4',cost:4,bonus:4,image:'assets/itadori_g4.webp'},
  {key:'aiuto_choso',name:'Aiuto di Choso',grade:'G3',cost:0,bonus:null,image:'assets/itadori_g3.webp',v27ItadoriChoso:true,v27CostLabel:'Costo: Vita scelta dal giocatore',effect:'Passiva: paga un numero di punti Vita e ottieni lo stesso valore come Corpo monouso.'},
  {key:'black_flash_itadori',name:'Black Flash',grade:'G2',cost:0,bonus:null,image:'assets/itadori_g1.webp',v27ItadoriBlackFlash:true,itadoriBlackFlash:true,v27CostLabel:'Costo: somma finale dei dadi validi',effect:'Continua a lanciare dadi finché ogni risultato è maggiore o uguale al precedente. Il costo è la somma dei risultati. Se l’Energia non basta, perdi 1 Corpo per ogni punto mancante.'},
  {key:'freccia_itadori',name:'Freccia Infuocata',grade:'G1',cost:10,bonus:10,lifeCost:1,image:'assets/itadori_freccia.webp',extra:'Costo aggiuntivo: perdi 1 Vita.'},
  {key:'santuario_benevolo',name:'(Dominio) Santuario Benevolo',grade:'SS',cost:15,bonus:null,image:'assets/itadori_ss.webp',effect:'L’avversario viene immerso nella mente e nel subconscio di Itadori e affronta il primo personaggio in senso antiorario; se non disponibile, il primo in senso orario. Quel personaggio riceve 18 Energia Maledetta per rispondere. In caso di vittoria, Itadori e quel personaggio guadagnano EXP. In caso di sconfitta, solo Itadori perde 1 Vita e non può perdere oggetti o seguaci.'},
  {key:'taglio_itadori',name:'Taglio',grade:'SG',cost:0,bonus:null,image:'assets/itadori_taglio.webp',v27ItadoriSlash:true,dynamicCost:true,v27CostLabel:'Costo: risultato del d24',effect:'Lancia il dado Taglio di Sukuna. Ottieni inoltre +1 Corpo per ogni 2 Dita possedute. Non taglia l’Infinito.'}
];

Object.assign(characters.jogo,{
  maxLife:8,baseBody:5,isJogo:true,
  innateName:'Natura Vulcanica',
  innateEffect:'Può muoversi liberamente fino a 4 caselle e non può usare il Fato.',
  grades:[
    {id:'G4',label:'Grado 4',max:10,exp:0},{id:'G3',label:'Grado 3',max:12,exp:7},{id:'G2',label:'Grado 2',max:15,exp:16},{id:'G1',label:'Grado 1',max:18,exp:26},{id:'SS',label:'Semi Special Grade',max:20,exp:35},{id:'SG',label:'Special Grade',max:23,exp:45}
  ]
});
characters.jogo.techniques=[
  {key:'insetti',name:'Insetti Ardenti',grade:'G4',cost:5,bonus:4,image:'assets/jogo_g4.png'},
  {key:'vulcani',name:'Vulcani',grade:'G3',cost:8,bonus:4,image:'assets/jogo_sheet.png',v27JogoVolcano:true,extra:'Crea un cratere vulcano sulla casella. PVE: i nemici pescati contro Jogo hanno −2 Corpo. PVP: quando altri giocatori raccolgono Energia su quella casella, Jogo guadagna la stessa Energia.'},
  {key:'salvataggio_hanami',name:'Salvataggio di Emergenza Hanami',grade:'G2',cost:10,bonus:null,image:'assets/jogo_g2.png',v27JogoHanami:true,effect:'Perdi automaticamente lo scontro e tira 1d6. Con 3-6 Hanami ti salva: ricarichi tutta l’Energia, l’avversario perde l’Energia consumata e non può prendere oggetti, seguaci o Vita. Con 1-2 la mossa fallisce.'},
  {key:'meteora2',name:'Meteora Infuocata',grade:'G1',cost:12,bonus:9,image:'assets/jogo_g1.png',v27JogoMeteor:true,extra:'Acquisisci 1 Calore, massimo 8. Ogni Calore già accumulato aumenta questa mossa di +1 Corpo.'},
  {key:'bara_ferro',name:'(Dominio) Bara della Montagna di Ferro',grade:'SS',cost:18,bonus:15,image:'assets/jogo_sheet.png',v27JogoDomain:true,extra:'Aggiunge +1 Corpo per ogni Vulcano presente sulla mappa, massimo +3. Incredibile Esplosione Vulcanica distrugge una casella e la trasforma in Cratere. Chi vi atterra perde 1 turno oppure paga 5 Energia.'},
  {key:'manipolazioni_ceneri',name:'Manipolazioni delle Ceneri',grade:'SG',cost:0,bonus:null,image:'assets/jogo_sheet.png',v27JogoAshes:true,effect:'Passiva: quando Jogo raggiunge una casella Cratere recupera 10 Energia Maledetta.'}
];

/* ------------------------------------------------------------------
   BONUS DITA DI ITADORI
------------------------------------------------------------------ */
function normalizeChoices(value){
  const src=value&&typeof value==='object'?value:{};
  return {'5':['energy','life'].includes(src['5'])?src['5']:null,'10':['energy','life'].includes(src['10'])?src['10']:null,'15':['energy','life'].includes(src['15'])?src['15']:null};
}
function loadItadoriChoices(){itadoriFingerChoices=normalizeChoices(readJson(localKey('itadori','v27FingerChoices'),itadoriFingerChoices));return itadoriFingerChoices;}
function itadoriBonuses(choices=itadoriFingerChoices,maxFingers=itadoriMaxFingers){
  const c=normalizeChoices(choices),m=n(maxFingers),out={energy:0,life:0,body:0};
  if(m>=5&&c['5']==='energy')out.energy+=2;if(m>=5&&c['5']==='life')out.life+=2;
  if(m>=10&&c['10']==='energy')out.energy+=2;if(m>=10&&c['10']==='life')out.life+=2;
  if(m>=15){out.body+=1;if(c['15']==='energy')out.energy+=3;if(c['15']==='life'){out.life+=3;out.body+=1;}}
  return out;
}
function dynamicItadoriMaxLife(choices=itadoriFingerChoices,maxFingers=itadoriMaxFingers){return 7+itadoriBonuses(choices,maxFingers).life;}
function applyItadoriCharacterStats(){characters.itadori.maxLife=dynamicItadoriMaxLife();if(currentId==='itadori')current=characters.itadori;}
loadItadoriChoices();applyItadoriCharacterStats();

const baseEffectiveBody=window.effectiveBaseBody;
window.effectiveBaseBody=function(){
  if(currentId==='itadori')return n(current?.baseBody,6)+itadoriBonuses().body;
  return baseEffectiveBody?baseEffectiveBody.apply(this,arguments):n(current?.baseBody);
};
const baseResourceMax=window.resourceMaxForGrade;
window.resourceMaxForGrade=function(g){
  if(currentId==='itadori')return n(g?.max)+itadoriBonuses().energy;
  return baseResourceMax?baseResourceMax.apply(this,arguments):n(g?.max);
};
window.currentGrade=function(){const g=current?.grades?.find(x=>x.id===gradeId)||current?.grades?.[0]||{id:'G4',label:'Grado 4',max:0,exp:0};return {...g,max:resourceMaxForGrade(g)};};

/* ------------------------------------------------------------------
   STATO LOCALE E MULTIPLAYER
------------------------------------------------------------------ */
const baseSaveState=window.saveState;
window.saveState=function(){
  try{
    if(currentId==='jogo'){
      localStorage.setItem(localKey('jogo','jogoVolcanoes'),String(jogoVolcanoes));
      localStorage.setItem(localKey('jogo','jogoCraters'),String(jogoCraters));
    }
    if(currentId==='itadori')writeJson(localKey('itadori','v27FingerChoices'),itadoriFingerChoices);
  }catch(e){}
  return baseSaveState?baseSaveState.apply(this,arguments):undefined;
};

const baseBuildState=window.buildLocalPlayerState;
window.buildLocalPlayerState=function(){
  const state=baseBuildState?baseBuildState.apply(this,arguments):null;
  if(!state)return state;
  if(state.characterId==='jogo'){state.jogoVolcanoes=jogoVolcanoes;state.jogoCraters=jogoCraters;state.maxLife=8;}
  if(state.characterId==='itadori'){state.itadoriFingerChoices={...itadoriFingerChoices};state.maxLife=dynamicItadoriMaxLife();}
  return state;
};

const baseCreateState=window.createInitialRoomPlayerState;
window.createInitialRoomPlayerState=function(characterId){
  const state=baseCreateState?baseCreateState.apply(this,arguments):{};
  if(characterId==='jogo'){state.energy=characters.jogo.grades[0].max;state.jogoLife=characters.jogo.maxLife;state.jogoVolcanoes=0;state.jogoCraters=0;state.maxLife=8;}
  if(characterId==='itadori'){state.itadoriFingerChoices={'5':null,'10':null,'15':null};state.maxLife=7;state.energy=10;}
  return state;
};

const basePersistSnapshot=window.persistRoomSnapshot;
window.persistRoomSnapshot=function(state){
  const out=basePersistSnapshot?basePersistSnapshot.apply(this,arguments):undefined;
  if(state?.characterId==='jogo'){
    localStorage.setItem(localKey('jogo','jogoVolcanoes'),String(clamp(state.jogoVolcanoes,0,99)));
    localStorage.setItem(localKey('jogo','jogoCraters'),String(clamp(state.jogoCraters,0,99)));
  }
  if(state?.characterId==='itadori')writeJson(localKey('itadori','v27FingerChoices'),normalizeChoices(state.itadoriFingerChoices));
  return out;
};

const baseSanitizeState=window.sanitizeRoomState;
window.sanitizeRoomState=function(state,characterId){
  const raw=state||{};
  const clean=baseSanitizeState?baseSanitizeState.apply(this,arguments):JSON.parse(JSON.stringify(raw));
  if(!clean)return clean;
  if(characterId==='jogo'){
    clean.energy=Math.max(0,n(raw.energy,characters.jogo.grades.find(g=>g.id===(raw.gradeId||'G4'))?.max||10));
    clean.life=Math.max(0,n(raw.life,8));clean.jogoLife=clean.life;clean.maxLife=8;
    clean.jogoVolcanoes=clamp(raw.jogoVolcanoes,0,99);clean.jogoCraters=clamp(raw.jogoCraters,0,99);
  }
  if(characterId==='itadori'){
    clean.itadoriFingerChoices=normalizeChoices(raw.itadoriFingerChoices);
    clean.maxLife=dynamicItadoriMaxLife(clean.itadoriFingerChoices,clean.itadoriMaxFingers);
    clean.itadoriOneUse=clamp(raw.itadoriOneUse,0,30);
  }
  return clean;
};

const baseApplySnapshot=window.applyRoomPlayerStateSnapshot;
window.applyRoomPlayerStateSnapshot=function(state,silent){
  if(state?.characterId==='itadori'){
    itadoriFingerChoices=normalizeChoices(state.itadoriFingerChoices);
    characters.itadori.maxLife=dynamicItadoriMaxLife(itadoriFingerChoices,state.itadoriMaxFingers);
  }
  const out=baseApplySnapshot?baseApplySnapshot.apply(this,arguments):undefined;
  if(state?.characterId==='jogo'){
    jogoVolcanoes=clamp(state.jogoVolcanoes,0,99);jogoCraters=clamp(state.jogoCraters,0,99);
    energy=Math.max(0,n(state.energy,10));jogoLife=life;
  }
  if(state?.characterId==='itadori'){
    itadoriFingerChoices=normalizeChoices(state.itadoriFingerChoices);applyItadoriCharacterStats();
  }
  try{renderAll();}catch(e){}
  return out;
};

const baseOpenCharacter=window.openCharacter;
window.openCharacter=function(id,options={}){
  let savedJogoEnergy=null;
  if(id==='itadori'){loadItadoriChoices();applyItadoriCharacterStats();}
  if(id==='jogo'){
    savedJogoEnergy=n(localStorage.getItem(localKey('jogo','energy')),characters.jogo.grades[0].max);
    jogoVolcanoes=clamp(localStorage.getItem(localKey('jogo','jogoVolcanoes')),0,99);
    jogoCraters=clamp(localStorage.getItem(localKey('jogo','jogoCraters')),0,99);
  }
  const out=baseOpenCharacter?baseOpenCharacter.apply(this,arguments):undefined;
  if(id==='jogo'){
    energy=Math.max(0,savedJogoEnergy);jogoLife=life;
    try{saveState();renderAll();}catch(e){}
  }
  if(id==='itadori'){
    applyItadoriCharacterStats();
    try{renderAll();}catch(e){}
  }
  updateV27Panels();
  return out;
};

const baseStartNewGame=window.startNewGame;
window.startNewGame=function(){
  if(typeof roomSession!=='undefined'&&roomSession){showModal('Azione bloccata','','Durante una stanza solo il Game Master può avviare o concludere una partita.');return;}
  const ok=confirm('Vuoi iniziare una nuova partita? Tutti i personaggi torneranno allo stato iniziale e i progressi salvati verranno cancellati.');
  if(!ok)return;
  jogoVolcanoes=0;jogoCraters=0;itadoriFingerChoices={'5':null,'10':null,'15':null};characters.itadori.maxLife=7;
  Object.entries(characters).forEach(([id,ch])=>{
    const prefix='jjk_'+id+'_';
    localStorage.setItem(prefix+'grade','G4');localStorage.setItem(prefix+'exp','0');localStorage.setItem(prefix+'energy',String(ch.grades[0].max));
    localStorage.setItem(prefix+'life',String(ch.maxLife));localStorage.setItem(prefix+'jogoLife',String(ch.maxLife));localStorage.setItem(prefix+'jogoHeat','0');
    localStorage.setItem(prefix+'getoOneUse','0');localStorage.setItem(prefix+'tojiCollectedEnergy','0');localStorage.setItem(prefix+'tokens','0');localStorage.setItem(prefix+'combatBonus','0');
    localStorage.setItem(prefix+'megumiCompanionOn','0');localStorage.setItem(prefix+'itadoriFingers','0');localStorage.setItem(prefix+'itadoriMaxFingers','0');localStorage.setItem(prefix+'itadoriOneUse','0');
    localStorage.setItem(prefix+'yutaKatanaActive','0');localStorage.setItem(prefix+'yutaCopiedTechnique','null');localStorage.setItem(prefix+'yutaCopiedTokens','0');localStorage.setItem(prefix+'yutaCopiedVigor','0');
    localStorage.setItem(prefix+'yutaCopiedFingers','0');localStorage.setItem(prefix+'yutaCopiedMaxFingers','0');localStorage.setItem(prefix+'yutaCopiedHeat','0');localStorage.setItem(prefix+'bossRushActive','0');
    localStorage.setItem(prefix+'used','[]');localStorage.setItem(prefix+'log','[]');localStorage.removeItem('jjk_full_life_start_v2_'+id);
  });
  localStorage.setItem(localKey('jogo','jogoVolcanoes'),'0');localStorage.setItem(localKey('jogo','jogoCraters'),'0');
  writeJson(localKey('itadori','v27FingerChoices'),itadoriFingerChoices);localStorage.removeItem('jjk_geto_tokens_start0_fix');
  currentId=null;current=null;gradeId='G4';energy=0;exp=0;log=[];used=[];tokens=0;combatBonus=0;life=0;jogoLife=8;jogoHeat=0;getoOneUse=0;tojiCollectedEnergy=0;megumiCompanionOn=false;itadoriFingers=0;itadoriMaxFingers=0;itadoriOneUse=0;yutaKatanaActive=false;yutaCopiedTechnique=null;yutaCopiedTokens=0;yutaCopiedVigor=0;yutaCopiedFingers=0;yutaCopiedMaxFingers=0;yutaCopiedHeat=0;bossRushActive=false;
  showModal('Nuova partita','Tutto azzerato','Tutti i personaggi sono tornati al grado G4 con EXP 0, Vita massima, Energia iniziale e risorse speciali azzerate, comprese le scelte permanenti delle Dita di Itadori.');
};

/* Jogo usa Energia separata dalla Vita. */
const baseGainEnergy=window.gainEnergy;
window.gainEnergy=function(value){
  if(currentId!=='jogo')return baseGainEnergy?baseGainEnergy.apply(this,arguments):undefined;
  if(typeof roomActionAllowed==='function'&&!roomActionAllowed())return;
  const before=energy,max=currentGrade().max;energy=Math.max(0,energy+n(value));
  try{recordResourceRecovery(currentId,energy-before);}catch(e){}
  const extra=Math.max(0,energy-max);addLog('Recupero Energia',before+' → '+energy+(extra?' · +'+extra+' oltre il massimo':''));saveState();updateBars();
};
const baseFullEnergy=window.fullEnergy;
window.fullEnergy=function(){
  if(currentId!=='jogo')return baseFullEnergy?baseFullEnergy.apply(this,arguments):undefined;
  if(typeof roomActionAllowed==='function'&&!roomActionAllowed())return;
  const before=energy;energy=Math.max(energy,currentGrade().max);try{recordResourceRecovery(currentId,energy-before);}catch(e){}addLog('FULL Energia',before+' → '+energy);saveState();updateBars();
};
const baseChangeLife=window.changeLife;
window.changeLife=function(value){
  if(currentId!=='jogo')return baseChangeLife?baseChangeLife.apply(this,arguments):undefined;
  if(typeof roomActionAllowed==='function'&&!roomActionAllowed())return;
  const before=life;life=Math.max(0,life+n(value));jogoLife=life;
  if(life===0){life=characters.jogo.maxLife;jogoLife=life;energy=currentGrade().max;used=[];addLog('Personaggio morto','Vita '+before+' → 0. Respawn: Vita '+life+', Energia '+energy+'.');saveState();renderAll();showModal('Sei morto, torni al respawn','Vita ed Energia ripristinate','Jogo mantiene grado ed EXP, ma Vita ed Energia sono risorse separate.');return;}
  addLog('Vita',before+' → '+life);saveState();renderAll();
};
window.applyTechniqueLifeCost=function(amount,techniqueName){
  if(amount&&bossFree())return {respawned:false,text:' Boss Rush: costo Vita annullato.'};
  const cost=Math.max(0,n(amount));if(!cost)return {respawned:false,text:''};
  const before=life;life=Math.max(0,life-cost);if(currentId==='jogo')jogoLife=life;
  if(life>0){addLog('Costo Vita',techniqueName+': '+before+' → '+life+' Vita.');return {respawned:false,text:' Costo Vita: -'+cost+'.'};}
  const max=currentId==='itadori'?dynamicItadoriMaxLife():n(current?.maxLife,1);life=max;used=[];if(currentId==='yuta')yutaKatanaActive=false;if(currentId==='itadori')itadoriOneUse=0;energy=currentGrade().max;if(currentId==='jogo')jogoLife=life;
  addLog('Personaggio morto',techniqueName+': Vita '+before+' → 0. Respawn con Vita '+life+' ed Energia '+energy+'.');
  return {respawned:true,text:' Il costo Vita ti ha portato a 0: sei morto e torni al respawn con Vita ed Energia al massimo.'};
};

const baseChangeJogoHeat=window.changeJogoHeat;
window.changeJogoHeat=function(value){
  if(currentId!=='jogo')return;
  if(getRank(gradeId)<getRank('G1')){showModal('Calore bloccato','','Il Calore si sblocca con Meteora Infuocata al grado G1.');return;}
  if(typeof roomActionAllowed==='function'&&!roomActionAllowed())return;
  const before=jogoHeat;jogoHeat=clamp(jogoHeat+n(value),0,8);addLog('Calore',before+' → '+jogoHeat);saveState();renderHeader();renderTechniques();
};

/* Stato GM e risorse online. */
const baseRoomResourceLabel=window.roomResourceLabel;
window.roomResourceLabel=function(id){if(id==='jogo')return 'Energia';return baseRoomResourceLabel?baseRoomResourceLabel.apply(this,arguments):(id==='toji'?'Vigore':'Energia');};
const baseRoomMax=window.roomStateResourceMax;
window.roomStateResourceMax=function(player){
  const s=player?.state||{},ch=characters[player?.characterId];if(!ch)return baseRoomMax?baseRoomMax.apply(this,arguments):0;
  const g=ch.grades.find(x=>x.id===(s.gradeId||'G4'))||ch.grades[0];
  if(player.characterId==='jogo')return n(g.max);
  if(player.characterId==='itadori')return n(g.max)+itadoriBonuses(s.itadoriFingerChoices,s.itadoriMaxFingers).energy;
  return baseRoomMax?baseRoomMax.apply(this,arguments):n(g.max);
};
const baseAdjustRoom=window.adjustRoomStateObject;
window.adjustRoomStateObject=function(player,field,delta){
  const s=player?.state;if(!s)return baseAdjustRoom?.apply(this,arguments);const d=n(delta);
  if(field==='jogoVolcanoes'){s.jogoVolcanoes=clamp(n(s.jogoVolcanoes)+d,0,99);s.updatedAt=Date.now();return;}
  if(field==='jogoCraters'){s.jogoCraters=clamp(n(s.jogoCraters)+d,0,99);s.updatedAt=Date.now();return;}
  if(player.characterId==='jogo'&&field==='energy'){s.energy=Math.max(0,n(s.energy)+d);s.updatedAt=Date.now();return;}
  if(player.characterId==='jogo'&&field==='life'){
    s.life=Math.max(0,n(s.life)+d);if(s.life===0){s.life=8;s.energy=roomStateResourceMax(player);s.used=[];}s.jogoLife=s.life;s.maxLife=8;s.updatedAt=Date.now();return;
  }
  const out=baseAdjustRoom?baseAdjustRoom.apply(this,arguments):undefined;
  if(player.characterId==='itadori')s.maxLife=dynamicItadoriMaxLife(s.itadoriFingerChoices,s.itadoriMaxFingers);
  return out;
};
const baseRoomOptions=window.roomSpecialFieldOptions;
window.roomSpecialFieldOptions=function(player){
  const list=baseRoomOptions?baseRoomOptions.apply(this,arguments):[];
  if(player?.characterId==='jogo'){
    if(!list.some(x=>x[0]==='jogoVolcanoes'))list.push(['jogoVolcanoes','Vulcani sulla mappa']);
    if(!list.some(x=>x[0]==='jogoCraters'))list.push(['jogoCraters','Caselle Cratere']);
  }
  return list;
};
const baseGmPills=window.gmSpecialPills;
window.gmSpecialPills=function(player){
  let html=baseGmPills?baseGmPills.apply(this,arguments):'';
  if(player?.characterId==='jogo')html+='<span class="gm-special-pill">Vulcani '+esc(player.state?.jogoVolcanoes||0)+'</span><span class="gm-special-pill">Crateri '+esc(player.state?.jogoCraters||0)+'</span>';
  if(player?.characterId==='itadori'){const b=itadoriBonuses(player.state?.itadoriFingerChoices,player.state?.itadoriMaxFingers);html+='<span class="gm-special-pill">Bonus Dita: +'+b.energy+' EM · +'+b.life+' Vita · +'+b.body+' Corpo</span>';}
  return html;
};
const baseGmFieldLabel=window.gmFieldLabelForPlayer;
window.gmFieldLabelForPlayer=function(player,field){if(field==='jogoVolcanoes')return 'Vulcani';if(field==='jogoCraters')return 'Crateri';return baseGmFieldLabel?baseGmFieldLabel.apply(this,arguments):field;};

/* ------------------------------------------------------------------
   INTERFACCIA
------------------------------------------------------------------ */
const baseUiResourceName=window.uiResourceName;
window.uiResourceName=function(id){if(id==='jogo')return 'Energia';return baseUiResourceName?baseUiResourceName.apply(this,arguments):(id==='toji'?'Vigore':'Energia');};
const baseCharacterStats=window.characterInfoStatsHtml;
window.characterInfoStatsHtml=function(id){
  const ch=characters[id];if(!ch)return baseCharacterStats?baseCharacterStats.apply(this,arguments):'';
  const maxExp=ch.grades[ch.grades.length-1]?.exp??0;
  let html='<div class="info-stat-chip">Vita <b>'+esc(id==='itadori'?'7 + bonus Dita':ch.maxLife)+'</b></div><div class="info-stat-chip">Corpo base <b>'+ch.baseBody+'</b></div><div class="info-stat-chip">'+esc(uiResourceName(id))+' iniziale <b>'+ch.grades[0].max+'</b></div><div class="info-stat-chip">Massimo <b>'+ch.grades[ch.grades.length-1].max+'</b></div><div class="info-stat-chip">EXP massimo <b>'+maxExp+'</b></div>';
  if(Number.isFinite(n(ch.coins,NaN)))html+='<div class="info-stat-chip">Monete <b>'+n(ch.coins)+'</b></div>';
  return html;
};
function ensureInfoInnate(){
  const stats=document.getElementById('characterInfoStats');if(!stats)return null;let box=document.getElementById('v27InfoInnate');if(!box){box=document.createElement('div');box.id='v27InfoInnate';box.className='v27-innate-info';stats.insertAdjacentElement('afterend',box);}return box;
}
function ensurePlayerInnate(){
  const side=document.querySelector('#player .panel.side');if(!side)return null;let box=document.getElementById('v27PlayerInnate');if(!box){box=document.createElement('section');box.id='v27PlayerInnate';box.className='v27-player-innate';side.insertBefore(box,side.firstElementChild);}return box;
}
function updateInnatePanels(){
  const info=ensureInfoInnate(),infoId=typeof uiInfoCharacterId!=='undefined'?uiInfoCharacterId:null,infoCh=characters[infoId];if(info)info.innerHTML=infoCh?.innateName?'<span>Tecnica innata</span><b>'+esc(infoCh.innateName)+'</b><p>'+esc(infoCh.innateEffect||'')+'</p>':'';
  const player=ensurePlayerInnate();if(player)player.innerHTML=current?.innateName?'<span>Tecnica innata</span><b>'+esc(current.innateName)+'</b><p>'+esc(current.innateEffect||'')+'</p>':'';
}
const baseRenderInfo=window.renderCharacterInfo;
window.renderCharacterInfo=function(){const out=baseRenderInfo?baseRenderInfo.apply(this,arguments):undefined;updateInnatePanels();return out;};
const baseRenderDraft=window.renderRoomDraftSelection;
window.renderRoomDraftSelection=function(){const out=baseRenderDraft?baseRenderDraft.apply(this,arguments):undefined;try{const id=roomDraftCharacterId,ch=characters[id],el=document.getElementById('roomDraftDescription');if(el&&ch?.innateName)el.textContent=(window.JJK_UI_META?.[id]?.description||'')+' Tecnica innata — '+ch.innateName+': '+ch.innateEffect;}catch(e){}return out;};

function ensureJogoTerrainPanel(){
  const panel=document.getElementById('jogoPanel');if(!panel)return null;let box=document.getElementById('v27JogoTerrain');if(!box){box=document.createElement('div');box.id='v27JogoTerrain';box.className='v27-jogo-terrain';box.innerHTML='<div class="v27-terrain-title">Terreno vulcanico</div><div class="v27-terrain-grid"><div><span>Vulcani</span><b id="v27JogoVolcanoes">0</b><small>Bonus Dominio max 3</small></div><div><span>Crateri</span><b id="v27JogoCraters">0</b><small>Caselle distrutte</small></div></div><div class="v27-terrain-actions"><button type="button" data-v27-terrain="volcano" data-delta="1">+ Vulcano</button><button type="button" data-v27-terrain="volcano" data-delta="-1">− Vulcano</button><button type="button" data-v27-terrain="crater" data-delta="1">+ Cratere</button><button type="button" data-v27-terrain="crater" data-delta="-1">− Cratere</button><button type="button" class="wide" id="v27JogoCollectEnergy">Incassa EM raccolta su un Vulcano</button></div>';panel.appendChild(box);box.addEventListener('click',e=>{const btn=e.target.closest('[data-v27-terrain]');if(btn)changeJogoTerrain(btn.dataset.v27Terrain,n(btn.dataset.delta));if(e.target.closest('#v27JogoCollectEnergy'))jogoCollectCraterEnergy();});}return box;
}
window.changeJogoTerrain=function(kind,delta){
  if(currentId!=='jogo')return;if(typeof roomActionAllowed==='function'&&!roomActionAllowed())return;
  if(kind==='volcano'){const before=jogoVolcanoes;jogoVolcanoes=clamp(jogoVolcanoes+delta,0,99);addLog('Vulcani sulla mappa',before+' → '+jogoVolcanoes);}
  if(kind==='crater'){const before=jogoCraters;jogoCraters=clamp(jogoCraters+delta,0,99);addLog('Caselle Cratere',before+' → '+jogoCraters);}
  saveState();updateJogoPanelV27();renderTechniques();
};
window.jogoCollectCraterEnergy=function(){
  if(currentId!=='jogo'||(typeof roomActionAllowed==='function'&&!roomActionAllowed()))return;const raw=prompt('Quanta Energia ha raccolto l’altro giocatore sulla casella Vulcano?');if(raw===null)return;const parsed=Number(raw),amount=Math.trunc(parsed);if(!Number.isFinite(parsed)||amount<1){showModal('Valore non valido','','Inserisci una quantità maggiore di zero.');return;}gainEnergy(amount);showModal('Natura Vulcanica','+'+amount+' Energia','Jogo guadagna la stessa Energia raccolta sulla casella Vulcano.');
};
function updateJogoPanelV27(){
  const panel=ensureJogoTerrainPanel();if(!panel)return;panel.style.display=currentId==='jogo'?'block':'none';
  const heat=document.getElementById('jogoHeatSection');if(heat)heat.style.display=(currentId==='jogo'&&getRank(gradeId)>=getRank('G1'))?'block':'none';
  const a=document.getElementById('v27JogoVolcanoes'),b=document.getElementById('v27JogoCraters');if(a)a.textContent=jogoVolcanoes;if(b)b.textContent=jogoCraters;
}
function ensureItadoriChoicePanel(){
  const panel=document.getElementById('itadoriFingerPanel');if(!panel)return null;let box=document.getElementById('v27ItadoriChoices');if(!box){box=document.createElement('div');box.id='v27ItadoriChoices';box.className='v27-finger-choices';box.addEventListener('click',e=>{const btn=e.target.closest('[data-v27-finger-choice]');if(btn)chooseItadoriFingerBonus(btn.dataset.milestone,btn.dataset.v27FingerChoice);});panel.appendChild(box);}return box;
}
function choiceLabel(milestone,type){if(milestone==='15')return type==='energy'?'+3 Energia massima':'+3 Vita massima e +1 Corpo aggiuntivo';return type==='energy'?'+2 Energia massima':'+2 Vita massima';}
window.chooseItadoriFingerBonus=function(milestone,type){
  const key=String(milestone);if(currentId!=='itadori'||!['5','10','15'].includes(key)||!['energy','life'].includes(type))return;if(typeof roomActionAllowed==='function'&&!roomActionAllowed())return;
  if(itadoriMaxFingers<n(key)){showModal('Soglia non raggiunta','','Servono '+key+' Dita.');return;}if(itadoriFingerChoices[key]){showModal('Scelta già confermata','','I bonus delle Dita sono permanenti e non possono essere cambiati.');return;}
  const before=itadoriBonuses();itadoriFingerChoices[key]=type;const after=itadoriBonuses();const lifeGain=after.life-before.life,energyGain=after.energy-before.energy;if(lifeGain>0)life+=lifeGain;if(energyGain>0)energy+=energyGain;applyItadoriCharacterStats();addLog('Scelta Dita · '+key,choiceLabel(key,type)+' permanente.');saveState();renderAll();showModal('Bonus permanente scelto',key+' Dita',choiceLabel(key,type)+'.');
};
function updateItadoriChoicesV27(){
  const box=ensureItadoriChoicePanel();if(!box)return;box.style.display=currentId==='itadori'?'grid':'none';if(currentId!=='itadori')return;
  box.innerHTML=['5','10','15'].map(key=>{const reached=itadoriMaxFingers>=n(key),chosen=itadoriFingerChoices[key];return '<section class="v27-choice-row '+(reached?'reached':'locked')+' '+(chosen?'chosen':'')+'"><header><b>'+key+' Dita</b><span>'+(chosen?'Scelto: '+esc(choiceLabel(key,chosen)):(reached?'Scegli il bonus permanente':'Non raggiunto'))+'</span></header><div><button type="button" data-milestone="'+key+'" data-v27-finger-choice="energy" '+(!reached||chosen?'disabled':'')+'>A · '+esc(choiceLabel(key,'energy'))+'</button><button type="button" data-milestone="'+key+'" data-v27-finger-choice="life" '+(!reached||chosen?'disabled':'')+'>B · '+esc(choiceLabel(key,'life'))+'</button></div></section>';}).join('');
}
window.itadoriMilestoneText=function(values){const lines=[];if(values.includes(5))lines.push('5 Dita: scegli +2 Energia massima oppure +2 Vita massima.');if(values.includes(10))lines.push('10 Dita: scegli un secondo bonus da +2 Energia o +2 Vita.');if(values.includes(15))lines.push('15 Dita: +1 Corpo permanente e scegli +3 Energia oppure +3 Vita e +1 Corpo aggiuntivo.');if(values.includes(20))lines.push('20 Dita: vinci la partita.');return lines.join(' ');};
window.changeItadoriFingers=function(value){
  if(currentId!=='itadori'||(typeof roomActionAllowed==='function'&&!roomActionAllowed()))return;const before=itadoriFingers,oldMax=itadoriMaxFingers;itadoriFingers=clamp(itadoriFingers+n(value),0,20);itadoriMaxFingers=Math.max(itadoriMaxFingers,itadoriFingers);const reached=[5,10,15,20].filter(x=>oldMax<x&&itadoriMaxFingers>=x);applyItadoriCharacterStats();addLog('Dita di Sukuna',before+' → '+itadoriFingers+' · massimo raggiunto '+itadoriMaxFingers+'/20.');saveState();renderAll();if(reached.length)showModal(reached.includes(20)?'Vittoria di Itadori':'Risveglio di Sukuna',itadoriMaxFingers+' Dita',itadoriMilestoneText(reached));if(reached.includes(20)){try{notifyRoomVictoryClaim('20 Dita di Sukuna');}catch(e){}}
};
window.resetItadoriCurrentFingers=function(){if(currentId!=='itadori'||(typeof roomActionAllowed==='function'&&!roomActionAllowed()))return;const before=itadoriFingers;itadoriFingers=0;addLog('Dita restituite al mazzo',before+' → 0. I bonus permanenti restano acquisiti.');saveState();renderAll();};
window.updateItadoriFingerPanel=function(){
  const panel=document.getElementById('itadoriFingerPanel');if(!panel)return;const active=currentId==='itadori';panel.classList.toggle('show',active);if(!active)return;const bonuses=itadoriBonuses();document.getElementById('itadoriFingerValue').textContent=itadoriFingers;document.getElementById('itadoriFingerSub').textContent='Massimo raggiunto: '+itadoriMaxFingers+'/20 · Bonus: +'+bonuses.energy+' EM, +'+bonuses.life+' Vita, +'+bonuses.body+' Corpo.';const labels={5:'5<br>Scelta A/B',10:'10<br>Scelta A/B',15:'15<br>+1 Corpo + scelta',20:'20<br>Vittoria'};[5,10,15,20].forEach(v=>{const el=document.getElementById('itadoriMilestone'+v);if(el){el.classList.toggle('active',itadoriMaxFingers>=v);el.innerHTML=labels[v];}});updateItadoriChoicesV27();
};

function updateV27Panels(){
  applyItadoriCharacterStats();updateInnatePanels();updateJogoPanelV27();try{updateItadoriFingerPanel();}catch(e){}
  const choso=document.querySelector('#itadoriChosoPanel .itadori-choso-note');if(choso)choso.textContent='Scegli quanta Vita pagare: ottieni lo stesso valore come Corpo monouso per la prossima tecnica da combattimento.';
  const chosoValue=document.querySelector('#itadoriChosoPanel .itadori-choso-value');if(chosoValue)chosoValue.innerHTML='+<span id="itadoriOneUseValue">'+(currentId==='itadori'?itadoriOneUse:0)+'</span> Corpo';
}

const baseRenderHeader=window.renderHeader;
window.renderHeader=function(){const out=baseRenderHeader?baseRenderHeader.apply(this,arguments):undefined;if(currentId==='itadori'){applyItadoriCharacterStats();const max=document.getElementById('lifeMaxValue');if(max)max.textContent=dynamicItadoriMaxLife();}updateV27Panels();return out;};
const baseUpdateBars=window.updateBars;
window.updateBars=function(){const out=baseUpdateBars?baseUpdateBars.apply(this,arguments):undefined;if(currentId==='jogo'){const actions=document.getElementById('energyActions'),title=document.getElementById('energyActionsTitle'),label=document.getElementById('resourceLabel');if(actions)actions.style.display='grid';if(title){title.style.display='block';title.textContent='Energia';}if(label)label.textContent='Energia Maledetta'+(energy>currentGrade().max?' · EXTRA +'+(energy-currentGrade().max):'');}if(currentId==='itadori'){const max=document.getElementById('lifeMaxValue');if(max)max.textContent=dynamicItadoriMaxLife();}updateV27Panels();return out;};

window.renderGrades=function(){
  const row=document.getElementById('gradeRow');if(!row||!current)return;row.innerHTML='';const online=!!(roomSession&&!roomSession.isHost&&roomSession.phase==='playing');
  current.grades.forEach(g=>{const b=document.createElement('button');b.className='grade-btn'+(g.id===gradeId?' active':'')+(online?' room-grade-locked':'');b.disabled=online;b.innerHTML=g.id+(online?'<span class="grade-lock-hint">EXP</span>':'');b.title=online?'Il grado si sblocca automaticamente con EXP e PVP.':'Imposta manualmente il grado';if(!online)b.onclick=()=>{exp=g.exp;gradeId=g.id;const selectedMax=resourceMaxForGrade(g);energy=currentId==='toji'?selectedMax:Math.max(n(energy),selectedMax);used=[];if(currentId==='yuta')yutaKatanaActive=false;addLog('Grado impostato',g.id+' · EXP '+g.exp);saveState();renderAll();};row.appendChild(b);});
};

/* ------------------------------------------------------------------
   UTILIZZO TECNICHE SPECIALI
------------------------------------------------------------------ */
function payEnergy(baseCost,label){
  const cost=discountedCost(currentId,baseCost);if(bossFree())return {ok:true,cost:0,shownCost:cost,before:energy};
  if(energy<cost){showModal('Energia insufficiente','',label+' richiede '+cost+' Energia Maledetta. Ne possiedi '+energy+'.');addLog('Azione fallita',label+': Energia insufficiente.');return {ok:false,cost,shownCost:cost,before:energy};}
  const before=energy;energy-=cost;return {ok:true,cost,shownCost:cost,before};
}
function finishCustom(t,payment,value,text,options={}){
  if(options.markUsed!==false&&!used.includes(t.key))used.push(t.key);
  try{recordTechniqueUse(currentId,t,payment?.cost||0);}catch(e){}
  addLog(options.logTitle||'Tecnica utilizzata',t.name+': '+(payment?payment.before+' → '+energy+' Energia. ':'')+text);
  saveState();renderAll();try{playTechniqueEffect(t);}catch(e){}showModal(options.modalTitle||t.name,value||'Effetto tecnica',text);
  if(options.skipTurn)setTimeout(()=>skipTurnAfterTechnique(t.name),220);
}
function consumeOneUseBody(includeGeto=true){let extra=0,parts=[];if(currentId==='geto'&&includeGeto&&getoOneUse>0){extra+=getoOneUse;parts.push('Corpo monouso +'+getoOneUse);if(!bossFree())getoOneUse=0;}if(currentId==='itadori'&&itadoriOneUse>0){extra+=itadoriOneUse;parts.push('Choso +'+itadoriOneUse);if(!bossFree())itadoriOneUse=0;}return {extra,parts};}
function skipTurnAfterTechnique(name){
  const boss=!!currentEvents().boss_rush?.active;if(boss){notify(name,'Boss Rush: i turni sono sospesi, quindi il salto turno non viene applicato.','#ffb24b');return;}
  try{const me=getLocalRoomPlayer();if(roomSession&&!roomSession.isHost&&roomSession.phase==='playing'&&me&&!me.locked&&typeof playerPassTurn==='function'){playerPassTurn();return;}}catch(e){}
  notify(name,'Effetto applicato: salta il resto del turno.','#ff9d54');
}
function promptDieList(message){const raw=prompt(message);if(raw===null)return null;return raw.split(/[^0-9]+/).filter(Boolean).map(Number);}

function useSukunaReroll(t){
  if(anyEventActive()||bossFree()){showModal('Tecnica non utilizzabile','','Sontuosa Arroganza non può essere usata durante eventi del Game Master o Boss Rush.');return;}
  const raw=prompt('Scrivi 6 per rilanciare 1d6 oppure 20 per rilanciare 1d20:');if(raw===null)return;const die=Number(raw);if(![6,20].includes(die)){showModal('Scelta non valida','','Inserisci 6 oppure 20.');return;}const base=die===6?5:10,pay=payEnergy(base,t.name);if(!pay.ok)return;finishCustom(t,pay,'Rilancio d'+die,'Hai pagato '+pay.cost+' Energia e puoi rilanciare una volta il d'+die+'.',{markUsed:false});
}
function useGetoTamamo(t){const raw=prompt('Quanti Segni Maledetti sono presenti sulla mappa?');if(raw===null)return;const parsed=Number(raw),amount=Math.trunc(parsed);if(!Number.isFinite(parsed)||amount<0||amount>99){showModal('Valore non valido','','Inserisci un numero da 0 a 99.');return;}const pay=payEnergy(10,t.name);if(!pay.ok)return;const before=tokens;tokens+=amount;finishCustom(t,pay,tokens+' Segnalini','Segnalini Maledetti '+before+' → '+tokens+'. Hai assorbito tutti i '+amount+' Segni presenti sulla mappa e devi saltare il turno.',{skipTurn:true});}
function useGetoSwarm(t){const pay={ok:true,cost:0,before:energy};const before=tokens;tokens+=10;finishCustom(t,pay,tokens+' Segnalini','Segnalini Maledetti '+before+' → '+tokens+' (+10). Devi saltare il turno.',{skipTurn:true});}
function useGetoRainbow(t){
  const raw=prompt('Scegli A oppure B:\nA = 14 Energia, +9 Corpo\nB = 14 Energia + 8 Segnalini, +13 Corpo');if(raw===null)return;const option=String(raw).trim().toUpperCase();if(!['A','B'].includes(option)){showModal('Scelta non valida','','Scrivi A oppure B.');return;}const tokenCost=option==='B'?8:0;if(!bossFree()&&tokens<tokenCost){showModal('Segnalini insufficienti','','L’opzione B richiede 8 Segnalini Maledetti.');return;}const pay=payEnergy(14,t.name);if(!pay.ok)return;const tokenBefore=tokens;if(!bossFree())tokens-=tokenCost;const one=consumeOneUseBody(true),bonus=option==='B'?13:9,total=effectiveBaseBody()+bonus+combatBonus+one.extra;const text='Opzione '+option+': Corpo base '+effectiveBaseBody()+' + bonus tecnica '+bonus+' + bonus Combattimento '+combatBonus+(one.extra?' + '+one.parts.join(' + '):'')+' = '+total+'. Segnalini '+tokenBefore+' → '+tokens+'.'+(bossFree()?' Boss Rush: nessuna risorsa consumata.':'');finishCustom(t,pay,total+' Combattimento',text);}
function useGetoUzumaki(t){if(!bossFree()&&tokens<10){showModal('Segnalini insufficienti','','Uzumaki richiede 10 Segnalini Maledetti.');return;}const pay=payEnergy(17,t.name);if(!pay.ok)return;const before=tokens;if(!bossFree())tokens-=10;const total=effectiveBaseBody()+17+combatBonus;const text='Corpo base '+effectiveBaseBody()+' + Uzumaki 17 + bonus Combattimento '+combatBonus+' = '+total+'. Segnalini '+before+' → '+tokens+'. Il Corpo monouso non viene aggiunto né consumato.'+(bossFree()?' Boss Rush: nessuna risorsa consumata.':'');finishCustom(t,pay,total+' Combattimento',text);}
function useMegumiDomain(t){const pay=payEnergy(18,t.name);if(!pay.ok)return;const total=effectiveBaseBody()+11+combatBonus;megumiCompanionOn=true;const text='Corpo base '+effectiveBaseBody()+' + Dominio 11 + bonus Combattimento '+combatBonus+' = '+total+'. Lo Shikigami viene teletrasportato nella tua casella. Se il dado dà 1-2 perdi 1 Vita.';finishCustom(t,pay,total+' Combattimento',text);}
function useJogoVolcano(t){const pay=payEnergy(8,t.name);if(!pay.ok)return;const total=effectiveBaseBody()+4+combatBonus;const before=jogoVolcanoes;jogoVolcanoes+=1;const text='Corpo base '+effectiveBaseBody()+' + tecnica 4 + bonus Combattimento '+combatBonus+' = '+total+'. Vulcani sulla mappa '+before+' → '+jogoVolcanoes+'. PVE: nemici −2 Corpo. PVP: Jogo incassa l’Energia raccolta dagli altri sulla casella.';finishCustom(t,pay,total+' Combattimento',text);}
function useJogoHanami(t){const pay=payEnergy(10,t.name);if(!pay.ok)return;const raw=prompt('Inserisci il risultato del d6 per il salvataggio di Hanami (1-6):');if(raw===null){if(!bossFree())energy=pay.before;return;}const roll=Number(raw);if(!Number.isInteger(roll)||roll<1||roll>6){if(!bossFree())energy=pay.before;showModal('Dado non valido','','Inserisci un valore da 1 a 6.');return;}let text,value;if(roll>=3){const before=energy;energy=currentGrade().max;text='Risultato '+roll+': Hanami ti salva. Perdi lo scontro, Energia '+before+' → '+energy+'. L’avversario perde l’Energia consumata e non può prendere oggetti, seguaci o Vita.';value='Hanami ti salva';}else{text='Risultato '+roll+': la mossa fallisce. Perdi automaticamente lo scontro e l’Energia spesa resta consumata.';value='Mossa fallita';}finishCustom(t,pay,value,text);}
function useJogoMeteor(t){const pay=payEnergy(12,t.name);if(!pay.ok)return;const heatBefore=jogoHeat,total=effectiveBaseBody()+9+heatBefore+combatBonus;jogoHeat=clamp(jogoHeat+1,0,8);const text='Corpo base '+effectiveBaseBody()+' + Meteora 9 + Calore '+heatBefore+' + bonus Combattimento '+combatBonus+' = '+total+'. Calore '+heatBefore+' → '+jogoHeat+' (massimo 8).';finishCustom(t,pay,total+' Combattimento',text);}
function useJogoDomain(t){const pay=payEnergy(18,t.name);if(!pay.ok)return;const volcanoBonus=Math.min(3,jogoVolcanoes),total=effectiveBaseBody()+15+volcanoBonus+combatBonus,before=jogoCraters;jogoCraters+=1;const text='Corpo base '+effectiveBaseBody()+' + Dominio 15 + Vulcani '+volcanoBonus+' + bonus Combattimento '+combatBonus+' = '+total+'. Crateri '+before+' → '+jogoCraters+'. Scegli una casella da distruggere: chi vi atterra perde 1 turno oppure paga 5 Energia.';finishCustom(t,pay,total+' Combattimento',text);}
function useJogoAshes(t){const before=energy;energy+=10;finishCustom(t,{cost:0,before},'+10 Energia','Jogo raggiunge una casella Cratere: Energia '+before+' → '+energy+'.',{markUsed:true});}
function useItadoriChoso(t){const maxPay=Math.max(1,Math.trunc(life));const raw=prompt('Quanta Vita vuoi pagare? Ottieni lo stesso valore come Corpo monouso. Vita disponibile: '+life);if(raw===null)return;const amount=Math.trunc(n(raw,-1));if(amount<1||amount>maxPay){showModal('Valore non valido','','Inserisci un valore da 1 a '+maxPay+'.');return;}const beforeLife=life;used.push(t.key);try{recordTechniqueUse(currentId,t,0);}catch(e){}const result=applyTechniqueLifeCost(amount,t.name);itadoriOneUse=result.respawned?0:amount;const text='Vita '+beforeLife+' → '+life+'. '+(result.respawned?'Il respawn annulla il bonus.':'Hai preparato +'+amount+' Corpo monouso per la prossima tecnica da combattimento.')+result.text;addLog('Aiuto di Choso',text);saveState();renderAll();playTechniqueEffect(t);showModal(result.respawned?'Sei morto, torni al respawn':t.name,result.respawned?'Bonus annullato':('+'+amount+' Corpo'),text);}
function useItadoriBlackFlash(t){
  const dice=promptDieList('Inserisci in ordine i risultati dei dadi validi, separati da virgola. Ogni risultato deve essere maggiore o uguale al precedente (esempio: 2,2,4,6):');if(dice===null)return;if(!dice.length||dice.some(v=>!Number.isInteger(v)||v<1||v>6)){showModal('Dadi non validi','','Inserisci almeno un risultato da 1 a 6.');return;}for(let i=1;i<dice.length;i++){if(dice[i]<dice[i-1]){showModal('Sequenza non valida','','Il risultato '+dice[i]+' è minore del precedente '+dice[i-1]+'.');return;}}
  const sum=dice.reduce((a,b)=>a+b,0),cost=discountedCost(currentId,sum),before=energy,spent=bossFree()?0:Math.min(energy,cost),missing=bossFree()?0:Math.max(0,cost-energy);if(!bossFree())energy-=spent;const choso=itadoriOneUse,total=Math.max(0,effectiveBaseBody()+sum+combatBonus+choso-missing);if(choso&&!bossFree())itadoriOneUse=0;used.push(t.key);try{recordTechniqueUse(currentId,t,spent);}catch(e){}const text='Dadi validi: '+dice.join(' + ')+' = '+sum+'. Corpo base '+effectiveBaseBody()+' + Black Flash '+sum+' + bonus Combattimento '+combatBonus+(choso?' + Choso '+choso:'')+(missing?' − Corpo per Energia mancante '+missing:'')+' = '+total+'. Energia '+before+' → '+energy+'.';addLog('Tecnica utilizzata',t.name+': '+text);saveState();renderAll();playTechniqueEffect(t);showModal(t.name,total+' Combattimento',text);
}
function useItadoriSlash(t){const raw=prompt('Inserisci il risultato del d24 Taglio di Sukuna (1-24):');if(raw===null)return;const roll=Number(raw);if(!Number.isInteger(roll)||roll<1||roll>24){showModal('Valore non valido','','Inserisci un valore da 1 a 24.');return;}const pay=payEnergy(roll,t.name);if(!pay.ok)return;const fingerBonus=Math.floor(itadoriFingers/2),one=consumeOneUseBody(false),total=effectiveBaseBody()+roll+fingerBonus+combatBonus+one.extra;const text='Corpo base '+effectiveBaseBody()+' + d24 '+roll+' + bonus Dita '+fingerBonus+' + bonus Combattimento '+combatBonus+(one.extra?' + '+one.parts.join(' + '):'')+' = '+total+'. Non taglia l’Infinito.';finishCustom(t,pay,total+' Combattimento',text);}

const baseUseTechnique=window.useTechnique;
window.useTechnique=function(key){
  if(typeof roomActionAllowed==='function'&&!roomActionAllowed())return;const t=current?.techniques?.find(x=>x.key===key);if(!t||used.includes(key))return;
  if(t.v27SukunaReroll)return useSukunaReroll(t);
  if(t.v27GetoTamamo)return useGetoTamamo(t);
  if(t.v27GetoSwarm)return useGetoSwarm(t);
  if(t.v27GetoRainbow)return useGetoRainbow(t);
  if(t.v27GetoUzumaki)return useGetoUzumaki(t);
  if(t.v27MegumiDomain)return useMegumiDomain(t);
  if(t.v27JogoVolcano)return useJogoVolcano(t);
  if(t.v27JogoHanami)return useJogoHanami(t);
  if(t.v27JogoMeteor)return useJogoMeteor(t);
  if(t.v27JogoDomain)return useJogoDomain(t);
  if(t.v27JogoAshes)return useJogoAshes(t);
  if(t.v27ItadoriChoso)return useItadoriChoso(t);
  if(t.v27ItadoriBlackFlash)return useItadoriBlackFlash(t);
  if(t.v27ItadoriSlash)return useItadoriSlash(t);
  return baseUseTechnique?baseUseTechnique.apply(this,arguments):undefined;
};

const basePlayerPassTurn=window.playerPassTurn;
window.playerPassTurn=function(){
  try{used=used.filter(key=>!TURN_RESET_KEYS.has(key));saveState();}catch(e){}
  return basePlayerPassTurn?basePlayerPassTurn.apply(this,arguments):undefined;
};

/* Etichette costi e anteprime dinamiche. */
const baseUiTechniqueCost=window.uiTechniqueCostLabel;
function v27TechniqueCostText(id,t){
  const discountActive=id===currentId&&typeof mcDiscountEnabled==='function'&&mcDiscountEnabled();
  const fixed=cost=>discountActive?Math.max(0,n(cost)-3):n(cost);
  const note=discountActive?' · sconto GM −3':'';
  if(t?.v27SukunaReroll)return 'Rilancio d6: '+fixed(5)+' Energia · Rilancio d20: '+fixed(10)+' Energia'+note;
  if(t?.v27GetoTamamo)return 'Costo: '+fixed(10)+' Energia'+note;
  if(t?.v27GetoRainbow)return 'A: '+fixed(14)+' Energia, +9 Corpo · B: '+fixed(14)+' Energia + 8 Segnalini, +13 Corpo'+note;
  if(t?.v27GetoUzumaki)return 'Costo: '+fixed(17)+' Energia + 10 Segnalini'+note;
  if(t?.v27ItadoriChoso)return 'Costo: Vita scelta dal giocatore';
  if(t?.v27ItadoriBlackFlash)return 'Costo: somma finale dei dadi validi'+note;
  if(t?.v27ItadoriSlash)return 'Costo: risultato del d24'+note;
  if(t?.v27CostLabel)return t.v27CostLabel;
  return baseUiTechniqueCost?baseUiTechniqueCost(id,t):'';
}
window.uiTechniqueCostLabel=function(id,t){return v27TechniqueCostText(id,t);};
const baseRenderTechniques=window.renderTechniques;
window.renderTechniques=function(){
  const out=baseRenderTechniques?baseRenderTechniques.apply(this,arguments):undefined;
  try{
    const available=current.techniques.filter(techniqueIsAvailable),cards=[...document.querySelectorAll('#techGrid .tech-card:not(.v25-body-card)')];
    cards.forEach((card,index)=>{const t=available[index];if(!t)return;const cost=card.querySelector('.tech-cost');if(cost&&t.v27CostLabel)cost.textContent=v27TechniqueCostText(currentId,t);const preview=card.querySelector('.v25-tech-total');if(!preview)return;const body=effectiveBaseBody()+combatBonus,one=(currentId==='itadori'?itadoriOneUse:currentId==='geto'?getoOneUse:0);let main=null,sub=null;
      if(t.v27GetoRainbow){main=(body+9+one)+' / '+(body+13+one);sub='Opzione A / Opzione B';}
      if(t.v27GetoUzumaki){main=String(body+17);sub='Il Corpo monouso non si applica';}
      if(t.v27SukunaReroll){main='Rilancio';sub='d6 per 5 EM · d20 per 10 EM';}
      if(t.key==='taglio_passiva'){main='Effetto';sub='Sostituisci una carta pescata';}
      if(t.v27JogoVolcano){main=String(body+4);sub='Crea 1 Vulcano';}
      if(t.v27JogoHanami){main='Dado 1d6';sub='3-6 salvataggio · 1-2 fallisce';}
      if(t.v27JogoMeteor){main=String(body+9+jogoHeat);sub='Include '+jogoHeat+' Calore attuale';}
      if(t.v27JogoDomain){main=String(body+15+Math.min(3,jogoVolcanoes));sub='Bonus Vulcani +'+Math.min(3,jogoVolcanoes);}
      if(t.v27JogoAshes){main='+10 EM';sub='Quando raggiungi un Cratere';}
      if(t.v27ItadoriChoso){main='Vita = Corpo';sub='Scegli la quantità';}
      if(t.v27ItadoriBlackFlash){main=body+' + dadi';sub='Sequenza crescente o uguale';}
      if(t.v27ItadoriSlash){main=body+' + d24 + '+Math.floor(itadoriFingers/2);sub='+1 Corpo ogni 2 Dita possedute';}
      if(main!==null)preview.innerHTML='<span>Totale se usata</span><b>'+esc(main)+'</b><small>'+esc(sub)+'</small>';
    });
  }catch(e){console.warn('V27 technique labels',e);}
  return out;
};

/* Metadati descrittivi aggiornati. */
try{
  if(window.JJK_UI_META){
    window.JJK_UI_META.jogo.description='Spirito vulcanico mobile: crea Vulcani e Crateri, accumula Calore e recupera Energia dalle ceneri.';
    window.JJK_UI_META.itadori.description='Ricettacolo perfetto con Vita 7 e Corpo 6. Le Dita permettono scelte permanenti e conducono alla vittoria a quota 20.';
    window.JJK_UI_META.sukuna.description='Re delle Maledizioni: taglia carte, rilancia dadi, usa Freccia Infuocata e apre il Reliquiario Maledetto.';
    window.JJK_UI_META.geto.description='Manipolatore di maledizioni: assorbe Segni, genera sciami e converte i Segnalini nell’Uzumaki.';
  }
}catch(e){}

function init(){
  updateV27Panels();try{renderCharacterInfo(uiInfoCharacterId,false);}catch(e){}try{if(currentId)renderAll();}catch(e){}
  setTimeout(()=>{updateV27Panels();try{if(currentId)renderAll();}catch(e){}},300);
  console.info('JJK rework ready',VERSION);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

})();
