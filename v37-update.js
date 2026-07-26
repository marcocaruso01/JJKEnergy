/* JJK Energy V37 - Regole variabili, Jogo/Itadori e schede fluide */
(function(root,factory){
  const api=factory(root||globalThis);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
'use strict';

const VERSION='37.0.0';
const RANK={G4:0,G3:1,G2:2,G1:3,SS:4,SG:5};
const KEYS={
  itadoriMonster:'jjk_itadori_v37_monster_fingers',
  itadoriImmortal:'jjk_itadori_v37_immortality_used',
  jogoMoves:'jjk_jogo_v37_volcano_moves',
  jogoEruption:'jjk_jogo_v37_eruption_used',
  yutaVolcanoes:'jjk_yuta_v37_copied_volcanoes',
  yutaCraters:'jjk_yuta_v37_copied_craters',
  yutaImmortal:'jjk_yuta_v37_copied_immortality_ready'
};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const num=value=>Number.isFinite(Number(value))?Number(value):0;
const rankOf=id=>RANK[id]??0;

function itadoriFingerBonuses(maxFingers){
  const fingers=clamp(maxFingers,0,20);
  const out={body:0,life:0,energy:0};
  if(fingers>=4)out.body+=1;
  if(fingers>=8){out.body+=1;out.life+=1;}
  if(fingers>=12){out.body+=1;out.life+=1;out.energy+=2;}
  if(fingers>=16){out.body+=1;out.life+=1;out.energy+=2;}
  if(fingers>=20){out.body+=1;out.life+=1;out.energy+=2;}
  return out;
}
function resolveVariableCost(roll,availableEnergy,effectiveCost=roll,bossFree=false){
  const rolled=Math.max(0,Math.trunc(num(roll)));
  const available=Math.max(0,num(availableEnergy));
  const cost=Math.max(0,num(effectiveCost));
  if(bossFree)return {roll:rolled,paid:0,missing:0,body:rolled,effectiveCost:cost};
  const paid=Math.min(available,cost);
  const missing=Math.max(0,cost-paid);
  return {roll:rolled,paid,missing,body:Math.max(0,rolled-missing),effectiveCost:cost};
}
function blueprints(){
  return {
    jogo:{
      maxLife:8,baseBody:5,coins:0,isJogo:true,lifeEnergyLinked:false,resourceLimit:null,
      innateName:'Natura Vulcanica',
      innateEffect:'Può muoversi liberamente fino a 4 caselle e non può usare il Fato.',
      grades:[
        {id:'G4',label:'Grado 4',max:10,exp:0},{id:'G3',label:'Grado 3',max:12,exp:7},
        {id:'G2',label:'Grado 2',max:15,exp:16},{id:'G1',label:'Grado 1',max:18,exp:26},
        {id:'SS',label:'Semi Special Grade',max:20,exp:35},{id:'SG',label:'Special Grade',max:23,exp:45}
      ],
      techniques:[
        {key:'insetti',name:'Insetti Ardenti',grade:'G4',cost:5,bonus:4,image:'assets/jogo_g4.png'},
        {key:'vulcani',name:'Vulcani',grade:'G3',cost:8,bonus:6,image:'assets/jogo_sheet.png',v37JogoVolcano:true,v27CostLabel:'Costo: 8 Energia · +6 Corpo',extra:'Crea un Vulcano sulla casella. PVE: i nemici pescati contro Jogo hanno −2 Corpo. PVP: Jogo guadagna la stessa Energia raccolta dagli altri sulla casella.'},
        {key:'salvataggio_hanami',name:'Salvataggio di Emergenza Hanami',grade:'G2',cost:10,bonus:null,image:'assets/jogo_g2.png',v37JogoHanami:true,v27JogoHanami:true,effect:'Perdi automaticamente lo scontro e tira 1d6. Con 3-6 Hanami ti salva; con 1-2 la mossa fallisce.'},
        {key:'meteora2',name:'Meteora Infuocata',grade:'G1',cost:12,bonus:9,image:'assets/jogo_g1.png',v37JogoMeteor:true,extra:'Ottieni 1 Calore, massimo 8. Ogni Calore già accumulato aggiunge +1 Corpo a questa tecnica.'},
        {key:'bara_ferro',name:'(Dominio) Bara della Montagna di Ferro',grade:'SS',cost:18,bonus:15,image:'assets/jogo_sheet.png',v37JogoDomain:true,extra:'Aggiunge +1 Corpo per ogni Vulcano presente, massimo +3. Distrugge una casella trasformandola in Cratere.'},
        {key:'placche_tettoniche',name:'Manipolazione Placche Tettoniche',grade:'SG',cost:0,bonus:null,image:'assets/jogo_sheet.png',v37JogoTectonic:true,effect:'Passiva SG: ogni Vulcano può muoversi fino a 4 caselle durante il turno. Una volta per turno puoi consumare un Vulcano per trasformare la sua casella in Cratere.'}
      ]
    },
    itadori:{
      name:'Yuji Itadori',baseMaxLife:4,maxLife:4,baseBody:4,coins:1,hasFingers:true,
      innateName:'Richiamo del Ricettacolo Perfetto',
      innateEffect:'Ottiene 1 Dito per ogni mostro abbattuto, fino a 12; sconfiggere Sukuna concede 5 Dita. Se è adiacente a un giocatore con un Dito viene attirato nella sua casella e ne ruba immediatamente 1.',
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
        {key:'richiamo_anima_sukuna',name:"(Dominio) Richiamo dell'Anima di Sukuna",grade:'SS',cost:0,bonus:null,image:'assets/itadori_ss.webp',v37ItadoriSoulDomain:true,v27CostLabel:'Costo: risultato d24 · Corpo: d24 limitato dall’EM + 2d6',effect:'Lancia il dado Taglio di Sukuna e 2d6. Il risultato del d24 determina costo e Corpo; se l’Energia non basta, quel Corpo viene ridotto.'},
        {key:'immortalita',name:'Immortalità',grade:'SG',cost:0,bonus:null,image:'assets/itadori_taglio.webp',v37ItadoriImmortality:true,effect:'Passiva, una volta per partita: quando stai per morire recuperi immediatamente tutta la Vita e tutta l’Energia.'}
      ]
    }
  };
}

function read(name,fallback=null){try{const value=eval(name);return value===undefined?fallback:value;}catch(_){return root[name]===undefined?fallback:root[name];}}
function write(name,value){root.__jjkV37Value=value;try{eval(name+' = root.__jjkV37Value');}catch(_){root[name]=value;}delete root.__jjkV37Value;}
function getFunction(name){const value=read(name,root[name]);return typeof value==='function'?value:null;}
function setFunction(name,fn){root[name]=fn;root.__jjkV37Fn=fn;try{eval(name+' = root.__jjkV37Fn');}catch(_){}delete root.__jjkV37Fn;}
function wrapFunction(name,flag,factory){const original=getFunction(name);if(!original||original[flag])return false;const wrapped=factory(original);wrapped[flag]=true;wrapped.__v37Original=original;setFunction(name,wrapped);return true;}
function storageGet(key,fallback=0){try{const raw=localStorage.getItem(key);return raw===null?fallback:raw;}catch(_){return fallback;}}
function storageSet(key,value){try{localStorage.setItem(key,String(value));}catch(_){} }
function chars(){return read('characters',root.characters||{});}
function cid(){return read('currentId',null);}
function grade(){return read('gradeId','G4');}
function current(){return read('current',null);}
function room(){return read('roomSession',root.roomSession||null);}
function localPlayer(){try{return getFunction('getLocalRoomPlayer')?.()||null;}catch(_){return null;}}
function bossFree(){try{return !!getFunction('isBossRushFree')?.();}catch(_){return false;}}
function roomAllowed(){try{return getFunction('roomActionAllowed')?!!getFunction('roomActionAllowed')():true;}catch(_){return true;}}
function currentGradeObject(){try{return getFunction('currentGrade')?.()||current()?.grades?.find(g=>g.id===grade())||current()?.grades?.[0];}catch(_){return current()?.grades?.[0];}}
function effectiveBody(){if(cid()==='itadori')return 4+itadoriFingerBonuses(read('itadoriMaxFingers',0)).body;try{return num(getFunction('effectiveBaseBody')?.());}catch(_){return num(current()?.baseBody);}}
function discountedCost(base){try{return Math.max(0,num(getFunction('mcDiscountCost')?.(cid(),base)));}catch(_){return Math.max(0,num(base));}}
function saveRender(){try{getFunction('saveState')?.();}catch(_){}try{getFunction('renderAll')?.();}catch(_){} }
function modal(title,value,text){try{getFunction('showModal')?.(title,value,text);}catch(_){} }
function notify(title,text,color='#62c7ff'){try{if(getFunction('showPlayerNotification'))getFunction('showPlayerNotification')(title,text,color);else modal(title,'',text);}catch(_){modal(title,'',text);} }
function log(title,text){try{getFunction('addLog')?.(title,text);}catch(_){} }
function play(t){try{getFunction('playTechniqueEffect')?.(t);}catch(_){} }
function used(){const value=read('used',[]);return Array.isArray(value)?value:[];}
function markUsed(t,cost=0){const list=used();if(!list.includes(t.key)){list.push(t.key);write('used',list);}try{getFunction('recordTechniqueUse')?.(cid(),t,cost);}catch(_){} }
function markCopyUsed(card,t,cost=0){try{getFunction('markYutaCopyUsed')?.(card,t,cost);}catch(_){} }
function getCopiedSource(){try{return getFunction('getYutaCopiedSource')?.()||null;}catch(_){return null;}}
function finish(t,cost,before,value,text,options={}){
  if(options.copyCard)markCopyUsed(options.copyCard,t,cost);else if(options.mark!==false)markUsed(t,cost);
  log(options.title||'Tecnica utilizzata',t.name+': Energia '+before+' → '+num(read('energy',0))+'. '+text);
  saveRender();play(t);modal(t.name,value,text);
}

let itadoriMonsterFingers=clamp(storageGet(KEYS.itadoriMonster,0),0,12);
let itadoriImmortalityUsed=storageGet(KEYS.itadoriImmortal,'0')==='1';
let jogoMovesUsed=clamp(storageGet(KEYS.jogoMoves,0),0,99);
let jogoEruptionUsed=storageGet(KEYS.jogoEruption,'0')==='1';
let yutaCopiedVolcanoes=clamp(storageGet(KEYS.yutaVolcanoes,0),0,99);
let yutaCopiedCraters=clamp(storageGet(KEYS.yutaCraters,0),0,99);
let yutaCopiedImmortalityReady=storageGet(KEYS.yutaImmortal,'0')==='1';
let lastLocalLocked=null;

function applyCharacters(){
  const all=chars(),bp=blueprints();
  if(all.jogo){const image=all.jogo.image;Object.assign(all.jogo,bp.jogo);if(image)all.jogo.image=image;}
  if(all.itadori){const image=all.itadori.image;Object.assign(all.itadori,bp.itadori);if(image)all.itadori.image=image;all.itadori.maxLife=itadoriMaxLife(read('itadoriMaxFingers',0));}
  if(root.JJK_UI_META){
    if(root.JJK_UI_META.jogo)root.JJK_UI_META.jogo.description='Spirito vulcanico: crea e muove Vulcani, forma Crateri e accumula Calore. Vita ed Energia sono separate.';
    if(root.JJK_UI_META.itadori)root.JJK_UI_META.itadori.description='Ricettacolo perfetto: parte con 4 Vita e 4 Corpo, cresce permanentemente fino a 20 Dita e sblocca Immortalità.';
  }
}
function itadoriMaxLife(maxFingers=read('itadoriMaxFingers',0)){return 4+itadoriFingerBonuses(maxFingers).life;}
function itadoriMaxEnergyForGrade(g,maxFingers=read('itadoriMaxFingers',0)){return num(g?.max)+itadoriFingerBonuses(maxFingers).energy;}
function applyItadoriStats(){
  const ch=chars().itadori;if(!ch)return;
  ch.baseMaxLife=4;ch.baseBody=4;ch.maxLife=itadoriMaxLife();
  if(cid()==='itadori')write('current',ch);
}
function jogoVolcanoes(){return clamp(read('jogoVolcanoes',0),0,99);}
function jogoCraters(){return clamp(read('jogoCraters',0),0,99);}
function setJogoVolcanoes(value){write('jogoVolcanoes',clamp(value,0,99));}
function setJogoCraters(value){write('jogoCraters',clamp(value,0,99));}
function persistV37(){
  storageSet(KEYS.itadoriMonster,itadoriMonsterFingers);
  storageSet(KEYS.itadoriImmortal,itadoriImmortalityUsed?'1':'0');
  storageSet(KEYS.jogoMoves,jogoMovesUsed);
  storageSet(KEYS.jogoEruption,jogoEruptionUsed?'1':'0');
  storageSet(KEYS.yutaVolcanoes,yutaCopiedVolcanoes);
  storageSet(KEYS.yutaCraters,yutaCopiedCraters);
  storageSet(KEYS.yutaImmortal,yutaCopiedImmortalityReady?'1':'0');
}

function awardItadoriFingers(amount,source='Dito ottenuto'){
  if(cid()!=='itadori'||!roomAllowed())return;
  const before=clamp(read('itadoriFingers',0),0,20),oldMax=clamp(read('itadoriMaxFingers',0),0,20),after=clamp(before+amount,0,20),newMax=Math.max(oldMax,after);
  const oldBonus=itadoriFingerBonuses(oldMax),newBonus=itadoriFingerBonuses(newMax);
  write('itadoriFingers',after);write('itadoriMaxFingers',newMax);applyItadoriStats();
  if(newBonus.life>oldBonus.life)write('life',num(read('life',0))+(newBonus.life-oldBonus.life));
  if(newBonus.energy>oldBonus.energy)write('energy',num(read('energy',0))+(newBonus.energy-oldBonus.energy));
  const reached=[4,8,12,16,20].filter(x=>oldMax<x&&newMax>=x);
  log(source,before+' → '+after+' Dita · massimo '+newMax+'/20.');
  saveRender();
  if(reached.length){
    const b=itadoriFingerBonuses(newMax);modal(reached.includes(20)?'20 Dita raggiunte':'Progressione Dita',newMax+' / 20','Bonus permanenti totali: +'+b.body+' Corpo, +'+b.life+' Vita massima, +'+b.energy+' Energia massima.');
    if(reached.includes(20)){try{getFunction('notifyRoomVictoryClaim')?.('20 Dita di Sukuna');}catch(_){} }
  }
}
function correctItadoriFinger(){
  if(cid()!=='itadori'||!roomAllowed())return;
  const currentF=clamp(read('itadoriFingers',0),0,20),maxF=clamp(read('itadoriMaxFingers',0),0,20);
  if(currentF<=0)return;
  const next=currentF-1;write('itadoriFingers',next);
  if(maxF===currentF)write('itadoriMaxFingers',Math.max(0,maxF-1));
  applyItadoriStats();log('Correzione Dita',currentF+' → '+next+'.');saveRender();
}
function awardMonsterFinger(){
  if(itadoriMonsterFingers>=12){modal('Limite mostri raggiunto','12 / 12','Itadori ha già ottenuto il massimo di 12 Dita tramite mostri comuni.');return;}
  itadoriMonsterFingers+=1;persistV37();awardItadoriFingers(1,'Mostro abbattuto');
}
function awardSukunaFingers(){persistV37();awardItadoriFingers(5,'Sukuna sconfitto');}

function triggerItadoriImmortality(reason='Danno letale'){
  if(cid()!=='itadori'||rankOf(grade())<RANK.SG||itadoriImmortalityUsed)return false;
  itadoriImmortalityUsed=true;persistV37();applyItadoriStats();
  write('life',itadoriMaxLife());write('energy',itadoriMaxEnergyForGrade(current()?.grades?.find(g=>g.id===grade())||currentGradeObject()));
  log('Immortalità',reason+': Vita ed Energia completamente ripristinate. Effetto consumato per questa partita.');
  saveRender();notify('Immortalità attivata','Itadori evita la morte e recupera tutta la Vita e tutta l’Energia.','#ff7d5f');
  return true;
}
function triggerYutaCopiedImmortality(reason='Danno letale'){
  if(cid()!=='yuta'||!yutaCopiedImmortalityReady)return false;
  yutaCopiedImmortalityReady=false;persistV37();write('life',num(current()?.maxLife||7));write('energy',num(currentGradeObject()?.max));
  log('Copia: Immortalità',reason+': Vita ed Energia completamente ripristinate.');saveRender();notify('Copia: Immortalità','Yuta evita la morte e recupera tutte le risorse.','#6cbcff');return true;
}
function maybeImmortal(reason){return triggerItadoriImmortality(reason)||triggerYutaCopiedImmortality(reason);}

function payFixed(baseCost,label){
  const before=num(read('energy',0)),cost=discountedCost(baseCost);
  if(bossFree())return {ok:true,before,cost:0,shown:cost};
  if(before<cost){modal('Energia insufficiente','',label+' richiede '+cost+' Energia Maledetta. Ne possiedi '+before+'.');return {ok:false,before,cost,shown:cost};}
  write('energy',before-cost);return {ok:true,before,cost,shown:cost};
}
function useVariableD24(t,roll,copyCard=null){
  const before=num(read('energy',0)),effective=discountedCost(roll),resolved=resolveVariableCost(roll,before,effective,bossFree());
  if(!bossFree())write('energy',before-resolved.paid);
  let extra=0,katana=0;
  if(copyCard&&read('yutaKatanaActive',false)){katana=3;try{if(!bossFree())getFunction('consumeYutaKatana')?.();}catch(_){} }
  const total=effectiveBody()+resolved.body+num(read('combatBonus',0))+extra+katana;
  const text='Dado d24: '+resolved.roll+'. Energia disponibile '+before+', costo effettivo '+resolved.effectiveCost+', Energia pagata '+resolved.paid+'. Il d24 aggiunge '+resolved.body+' Corpo'+(resolved.missing?' perché mancano '+resolved.missing+' Energia':'')+'. Corpo totale: '+effectiveBody()+' + '+resolved.body+' + bonus '+num(read('combatBonus',0))+(katana?' + Katana 3':'')+' = '+total+'.';
  finish(t,resolved.paid,before,total+' Combattimento',text,{copyCard});
}
function useJogoVolcano(t,copyCard=null){
  const pay=payFixed(8,copyCard?'Copia: '+t.name:t.name);if(!pay.ok)return;
  const bonus=6,total=effectiveBody()+bonus+num(read('combatBonus',0));
  if(copyCard)yutaCopiedVolcanoes+=1;else setJogoVolcanoes(jogoVolcanoes()+1);
  persistV37();
  const count=copyCard?yutaCopiedVolcanoes:jogoVolcanoes();
  finish(t,pay.cost,pay.before,total+' Combattimento','Corpo base '+effectiveBody()+' + Vulcani 6 + bonus '+num(read('combatBonus',0))+' = '+total+'. Vulcani presenti: '+count+'. PVE: nemici −2 Corpo. PVP: ottieni la stessa Energia raccolta dagli altri sulla casella.',{copyCard});
}
function useJogoHanami(t,roll,copyCard=null){
  const pay=payFixed(10,copyCard?'Copia: '+t.name:t.name);if(!pay.ok)return;
  let value,text;
  if(roll>=3){const after=num(currentGradeObject()?.max);write('energy',after);value='Hanami ti salva';text='Risultato '+roll+': perdi lo scontro ma Hanami ti salva. Energia ripristinata a '+after+'. L’avversario perde l’Energia consumata e non può prendere oggetti, seguaci o Vita.';}
  else{value='Mossa fallita';text='Risultato '+roll+': perdi automaticamente lo scontro e l’Energia spesa resta consumata.';}
  finish(t,pay.cost,pay.before,value,text,{copyCard});
}
function useJogoMeteor(t,copyCard=null){
  const pay=payFixed(12,copyCard?'Copia: '+t.name:t.name);if(!pay.ok)return;
  const heat=copyCard?clamp(read('yutaCopiedHeat',0),0,8):clamp(read('jogoHeat',0),0,8);
  const total=effectiveBody()+9+heat+num(read('combatBonus',0));
  if(copyCard)write('yutaCopiedHeat',Math.min(8,heat+1));else write('jogoHeat',Math.min(8,heat+1));
  finish(t,pay.cost,pay.before,total+' Combattimento','Corpo base '+effectiveBody()+' + Meteora 9 + Calore '+heat+' + bonus '+num(read('combatBonus',0))+' = '+total+'. Calore '+heat+' → '+Math.min(8,heat+1)+'.',{copyCard});
}
function useJogoDomain(t,copyCard=null){
  const pay=payFixed(18,copyCard?'Copia: '+t.name:t.name);if(!pay.ok)return;
  const volcanoes=copyCard?yutaCopiedVolcanoes:jogoVolcanoes(),bonus=Math.min(3,volcanoes),total=effectiveBody()+15+bonus+num(read('combatBonus',0));
  if(copyCard)yutaCopiedCraters+=1;else setJogoCraters(jogoCraters()+1);persistV37();
  const craters=copyCard?yutaCopiedCraters:jogoCraters();
  finish(t,pay.cost,pay.before,total+' Combattimento','Corpo base '+effectiveBody()+' + Dominio 15 + Vulcani '+bonus+' + bonus '+num(read('combatBonus',0))+' = '+total+'. Una casella scelta viene distrutta e diventa Cratere. Crateri presenti: '+craters+'. Chi vi atterra perde 1 turno; Jogo può assorbirne uno per ottenere 10 Energia e riattivare la casella.',{copyCard});
}
function useBlood(t,copyCard=null){
  if(!bossFree()&&num(read('life',0))<=1){modal('Vita insufficiente','','Serve almeno 2 Vita per convertire 1 Vita senza morire.');return;}
  if(!copyCard&&used().includes(t.key)){modal('Già utilizzata in questo turno','','Manipolazione del Sangue si ripristina all’inizio del prossimo turno.');return;}
  const beforeLife=num(read('life',0)),beforeEnergy=num(read('energy',0));
  if(!bossFree())write('life',beforeLife-1);write('energy',beforeEnergy+10);
  if(copyCard)markCopyUsed(copyCard,t,0);else markUsed(t,0);
  log(copyCard?'Copia: Manipolazione del Sangue':'Manipolazione del Sangue','Vita '+beforeLife+' → '+num(read('life',0))+', Energia '+beforeEnergy+' → '+num(read('energy',0))+'.');saveRender();play(t);modal(t.name,'+10 Energia',bossFree()?'Boss Rush: non hai speso Vita.':'Hai convertito 1 Vita in 10 Energia Maledetta.');
}
function useSoulDomain(t,result,copyCard=null){
  const slash=clamp(result.slash,1,24),dice=(result.dice||[]).slice(0,2).map(v=>clamp(v,1,6));if(dice.length!==2)return;
  const before=num(read('energy',0)),effective=discountedCost(slash),resolved=resolveVariableCost(slash,before,effective,bossFree());
  if(!bossFree())write('energy',before-resolved.paid);
  const normal=dice[0]+dice[1],total=effectiveBody()+resolved.body+normal+num(read('combatBonus',0));
  const text='Dado Taglio d24: '+slash+' → Corpo applicato '+resolved.body+' e costo pagato '+resolved.paid+(resolved.missing?' (riduzione di '+resolved.missing+' per Energia mancante)':'')+'. Dadi normali: '+dice.join(' + ')+' = '+normal+'. Totale: Corpo base '+effectiveBody()+' + d24 '+resolved.body+' + 2d6 '+normal+' + bonus '+num(read('combatBonus',0))+' = '+total+'.';
  finish(t,resolved.paid,before,total+' Combattimento',text,{copyCard});
}
function prepareImmortality(t,copyCard=null){
  if(copyCard){if(yutaCopiedImmortalityReady){modal('Copia già pronta','','Immortalità copiata è già pronta ad attivarsi.');return;}yutaCopiedImmortalityReady=true;persistV37();markCopyUsed(copyCard,t,0);saveRender();modal('Copia: Immortalità','Passiva pronta','Quando Yuta sta per morire recupererà tutta la Vita e tutta l’Energia.');return;}
  modal('Immortalità',itadoriImmortalityUsed?'Già consumata':'Passiva automatica',itadoriImmortalityUsed?'L’effetto è già stato utilizzato in questa partita.':'Non devi attivarla manualmente: scatterà automaticamente quando Itadori sta per morire.');
}

function ensureChoiceUi(){
  let rootEl=document.getElementById('v37RollModal');if(rootEl)return rootEl;
  const style=document.createElement('style');style.id='v37Style';style.textContent=`
  #v37RollModal,#v37SheetsModal{position:fixed;inset:0;z-index:120000;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(2,2,8,.9);backdrop-filter:blur(12px)}#v37RollModal.show,#v37SheetsModal.show{display:flex}
  .v37-roll-box{width:min(720px,100%);max-height:92vh;overflow:auto;border:1px solid #ff6b55;border-radius:25px;background:radial-gradient(circle at 15% 0,rgba(255,91,62,.26),transparent 40%),linear-gradient(150deg,#31151a,#0b0b14 65%);box-shadow:0 30px 90px #000c;color:#fff}.v37-roll-head{display:flex;justify-content:space-between;gap:15px;padding:19px;border-bottom:1px solid #ffffff18}.v37-roll-head small{color:#ff9c73;font-weight:950;letter-spacing:.14em}.v37-roll-head h2{margin:5px 0}.v37-roll-head p{margin:0;color:#cdbdc1}.v37-close{width:42px;height:42px;border-radius:13px;border:1px solid #ff6b75;background:#701927;color:#fff;font-weight:950;cursor:pointer}.v37-roll-body{padding:18px}.v37-roll-group{margin-bottom:17px}.v37-roll-group h3{margin:0 0 9px;font-size:.85rem;color:#ffd1bf}.v37-dice{display:grid;grid-template-columns:repeat(auto-fit,minmax(52px,1fr));gap:8px}.v37-die{padding:12px;border-radius:13px;border:1px solid #ff8b6d77;background:#3c1d27;color:#fff;font-weight:950;cursor:pointer}.v37-die.active{border-color:#fff;background:linear-gradient(145deg,#e9583e,#7d2030);box-shadow:0 0 18px #ff704d66}.v37-roll-summary{padding:13px;border-radius:15px;border:1px solid #ffffff1a;background:#080811;color:#d9cdd0}.v37-roll-actions{display:grid;grid-template-columns:1fr 1.5fr;gap:9px;margin-top:15px}.v37-roll-actions button{min-height:52px;border-radius:15px;color:#fff;font-weight:950;cursor:pointer}.v37-roll-cancel{border:1px solid #9e4051;background:#541522}.v37-roll-confirm{border:1px solid #ff8b6d;background:linear-gradient(135deg,#d9573d,#7c2030)}.v37-roll-confirm:disabled{opacity:.35}
  .v37-sheets-shell{width:min(1180px,98vw);height:min(790px,94vh);display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden;border:1px solid #4ebcff;border-radius:25px;background:linear-gradient(145deg,#111d2d,#090a11);box-shadow:0 30px 90px #000c;color:#fff}.v37-sheets-head{display:flex;justify-content:space-between;align-items:flex-start;gap:15px;padding:18px 20px;border-bottom:1px solid #ffffff18}.v37-sheets-head small{color:#72d1ff;font-weight:950;letter-spacing:.13em}.v37-sheets-head h2{margin:5px 0 2px}.v37-sheets-head p{margin:0;color:#aebdcc}.v37-sheets-layout{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:0}.v37-player-tabs{overflow:auto;padding:12px;border-right:1px solid #ffffff12;background:#070a10}.v37-player-tab{width:100%;display:grid;grid-template-columns:44px 1fr auto;gap:9px;align-items:center;margin-bottom:8px;padding:9px;border-radius:14px;border:1px solid #29394c;background:#0d1420;color:#fff;text-align:left;cursor:pointer}.v37-player-tab.active{border-color:#54c8ff;background:#14334c;box-shadow:0 0 18px #3cbaff33}.v37-player-tab img{width:44px;height:44px;border-radius:12px;object-fit:cover}.v37-player-tab b,.v37-player-tab small{display:block}.v37-player-tab small{margin-top:3px;color:#92a8bb;font-size:.66rem}.v37-player-tab i{width:9px;height:9px;border-radius:50%;background:#778391}.v37-player-tab i.live{background:#51e59b;box-shadow:0 0 12px #51e59b}.v37-sheet-detail{overflow:auto;overscroll-behavior:contain;padding:16px;contain:layout paint}.v37-detail-card{max-width:850px;margin:auto}.v37-detail-hero{display:grid;grid-template-columns:86px 1fr auto;gap:14px;align-items:center;padding:15px;border-radius:19px;border:1px solid #315875;background:linear-gradient(145deg,#172c43,#0d111a)}.v37-detail-hero img{width:86px;height:106px;border-radius:14px;object-fit:cover}.v37-detail-hero h3{margin:4px 0}.v37-detail-hero p{margin:0;color:#a9bdcd}.v37-grade{padding:10px;border-radius:12px;border:1px solid #9064c3;color:#d6b6ff;font-weight:950}.v37-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:11px 0}.v37-stat{padding:12px;border-radius:14px;border:1px solid #29394c;background:#0b111a;text-align:center}.v37-stat small{display:block;color:#8498a9;text-transform:uppercase;font-size:.61rem}.v37-stat b{display:block;margin-top:5px}.v37-techniques{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:9px}.v37-tech{padding:11px;border-radius:14px;border:1px solid #29394c;background:#0b111a;content-visibility:auto;contain-intrinsic-size:90px}.v37-tech header{display:flex;justify-content:space-between;gap:9px}.v37-tech header b{font-size:.78rem}.v37-tech header span{color:#c79bff;font-size:.68rem;font-weight:950}.v37-tech p{margin:7px 0 0;color:#9db0bf;font-size:.69rem;line-height:1.4}.v37-empty{padding:30px;text-align:center;color:#93a5b5}
  .v37-panel{margin-top:12px;padding:12px;border-radius:15px;border:1px solid #ffffff1a;background:#080b12}.v37-panel-title{font-weight:950;margin-bottom:8px}.v37-actions{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.v37-actions button{min-height:42px;border-radius:12px;border:1px solid #497ca0;background:#153652;color:#fff;font-weight:900;cursor:pointer}.v37-progress{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-top:8px}.v37-progress span{padding:7px 4px;border-radius:9px;border:1px solid #3c2f47;background:#100c16;text-align:center;font-size:.62rem}.v37-progress span.on{border-color:#e36043;background:#431c18;color:#ffd2c4}
  #v37BloodNowBtn{position:fixed;left:16px;bottom:96px;z-index:11000;display:none;max-width:260px;padding:11px 14px;border-radius:15px;border:1px solid #e45467;background:linear-gradient(145deg,#7e1d31,#2b101a);color:#fff;text-align:left;box-shadow:0 14px 35px #0008,0 0 20px #d9435c44;cursor:pointer}#v37BloodNowBtn.show{display:block}#v37BloodNowBtn b,#v37BloodNowBtn small{display:block}#v37BloodNowBtn small{margin-top:3px;color:#ffc0ca;font-size:.62rem}
  @media(max-width:720px){.v37-sheets-layout{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}.v37-player-tabs{display:flex;gap:7px;overflow-x:auto;border-right:0;border-bottom:1px solid #ffffff12}.v37-player-tab{flex:0 0 200px;margin:0}.v37-stats{grid-template-columns:repeat(2,1fr)}.v37-detail-hero{grid-template-columns:62px 1fr auto}.v37-detail-hero img{width:62px;height:78px}.v37-roll-actions{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
  rootEl=document.createElement('div');rootEl.id='v37RollModal';rootEl.innerHTML='<section class="v37-roll-box"><header class="v37-roll-head"><div><small>DOMINIO · LANCIO GUIDATO</small><h2>Richiamo dell’Anima di Sukuna</h2><p>Seleziona il d24 e poi i due dadi normali.</p></div><button class="v37-close" type="button">✕</button></header><div class="v37-roll-body"></div></section>';document.body.appendChild(rootEl);return rootEl;
}
function chooseSoulDomain(){
  return new Promise(resolve=>{const modalEl=ensureChoiceUi(),body=modalEl.querySelector('.v37-roll-body');let slash=null,dice=[];modalEl.classList.add('show');document.body.style.overflow='hidden';body.innerHTML='<section class="v37-roll-group"><h3>Dado Taglio di Sukuna · d24</h3><div class="v37-dice" data-slash>'+Array.from({length:24},(_,i)=>'<button class="v37-die" type="button" data-value="'+(i+1)+'">'+(i+1)+'</button>').join('')+'</div></section><section class="v37-roll-group"><h3>Due dadi normali · d6</h3><div class="v37-dice" data-normal>'+Array.from({length:6},(_,i)=>'<button class="v37-die" type="button" data-value="'+(i+1)+'">'+(i+1)+'</button>').join('')+'</div></section><div class="v37-roll-summary">Seleziona 1 risultato d24 e 2 risultati d6.</div><div class="v37-roll-actions"><button class="v37-roll-cancel" type="button">Annulla</button><button class="v37-roll-confirm" type="button" disabled>Conferma</button></div>';const summary=body.querySelector('.v37-roll-summary'),confirm=body.querySelector('.v37-roll-confirm');const refresh=()=>{body.querySelectorAll('[data-slash] .v37-die').forEach(b=>b.classList.toggle('active',Number(b.dataset.value)===slash));body.querySelectorAll('[data-normal] .v37-die').forEach(b=>{const value=Number(b.dataset.value),count=dice.filter(x=>x===value).length;b.classList.toggle('active',count>0);});summary.textContent=slash&&dice.length===2?'d24: '+slash+' · d6: '+dice.join(' + ')+' = '+(dice[0]+dice[1]):'Seleziona 1 risultato d24 e 2 risultati d6.';confirm.disabled=!(slash&&dice.length===2);};const close=value=>{modalEl.classList.remove('show');document.body.style.overflow='';resolve(value);};body.querySelectorAll('[data-slash] .v37-die').forEach(b=>b.onclick=()=>{slash=Number(b.dataset.value);refresh();});body.querySelectorAll('[data-normal] .v37-die').forEach(b=>b.onclick=()=>{if(dice.length<2)dice.push(Number(b.dataset.value));else{dice.shift();dice.push(Number(b.dataset.value));}refresh();});body.querySelector('.v37-roll-cancel').onclick=()=>close(null);confirm.onclick=()=>close({slash,dice:dice.slice()});modalEl.querySelector('.v37-close').onclick=()=>close(null);refresh();});
}

function ensureBloodButton(){
  let button=document.getElementById('v37BloodNowBtn');if(button)return button;
  button=document.createElement('button');button.id='v37BloodNowBtn';button.type='button';button.innerHTML='<b>Manipolazione del Sangue</b><small>1 Vita → 10 Energia · qualsiasi momento</small>';document.body.appendChild(button);return button;
}
function updateBloodButton(){const button=ensureBloodButton(),t=chars().itadori?.techniques?.find(x=>x.v37ItadoriBlood),visible=cid()==='itadori'&&rankOf(grade())>=RANK.G2&&!used().includes('manipolazione_sangue');button.classList.toggle('show',visible);button.disabled=!visible;button.onclick=()=>{if(t)useBlood(t);};}
function ensureItadoriPanel(){
  const panel=document.getElementById('itadoriFingerPanel');if(!panel)return null;
  const old=document.getElementById('v27ItadoriChoices');if(old)old.style.display='none';
  let box=document.getElementById('v37ItadoriPanel');if(box)return box;
  box=document.createElement('section');box.id='v37ItadoriPanel';box.className='v37-panel';box.innerHTML='<div class="v37-panel-title">Progressione Dita V37</div><div id="v37ItadoriSummary"></div><div class="v37-progress">'+[4,8,12,16,20].map(v=>'<span data-finger-milestone="'+v+'">'+v+' Dita</span>').join('')+'</div><div class="v37-actions" style="margin-top:9px"><button data-v37-monster>Mostro sconfitto · +1</button><button data-v37-sukuna>Sukuna sconfitto · +5</button><button data-v37-stolen>Dito rubato · +1</button><button data-v37-correct>Correggi · −1</button></div>';
  panel.appendChild(box);return box;
}
function updateItadoriPanel(){
  const box=ensureItadoriPanel();if(!box)return;box.style.display=cid()==='itadori'?'block':'none';if(cid()!=='itadori')return;
  const max=clamp(read('itadoriMaxFingers',0),0,20),bonus=itadoriFingerBonuses(max),summary=box.querySelector('#v37ItadoriSummary');summary.innerHTML='<b>'+clamp(read('itadoriFingers',0),0,20)+'/20 Dita attuali</b><small style="display:block;margin-top:4px;color:#b8aabf">Mostri comuni: '+itadoriMonsterFingers+'/12 · Bonus permanenti: +'+bonus.body+' Corpo, +'+bonus.life+' Vita, +'+bonus.energy+' EM</small><small style="display:block;margin-top:3px;color:'+(itadoriImmortalityUsed?'#ff8c9b':'#8ee7ba')+'">Immortalità: '+(itadoriImmortalityUsed?'consumata':'disponibile al grado SG')+'</small>';box.querySelectorAll('[data-finger-milestone]').forEach(el=>el.classList.toggle('on',max>=Number(el.dataset.fingerMilestone)));
}
function ensureJogoPanel(){
  const terrain=document.getElementById('v27JogoTerrain')||document.getElementById('jogoPanel');if(!terrain)return null;
  let box=document.getElementById('v37JogoPanel');if(box)return box;
  box=document.createElement('section');box.id='v37JogoPanel';box.className='v37-panel';box.innerHTML='<div class="v37-panel-title">Controllo Vulcani e Crateri</div><div id="v37JogoSummary"></div><div class="v37-actions" style="margin-top:9px"><button data-v37-absorb-crater>Assorbi Cratere · +10 EM</button><button data-v37-move-volcano>Muovi 1 Vulcano · max 4</button><button data-v37-erupt-volcano style="grid-column:1/-1">Fai eruttare 1 Vulcano · crea Cratere</button></div>';
  terrain.appendChild(box);return box;
}
function updateJogoPanel(){const box=ensureJogoPanel();if(!box)return;box.style.display=cid()==='jogo'?'block':'none';if(cid()!=='jogo')return;box.querySelector('#v37JogoSummary').innerHTML='<b>'+jogoVolcanoes()+' Vulcani · '+jogoCraters()+' Crateri</b><small style="display:block;margin-top:4px;color:#b8aabf">Movimenti Vulcano nel turno: '+jogoMovesUsed+'/'+jogoVolcanoes()+' · Eruzione: '+(jogoEruptionUsed?'usata':'disponibile')+'</small>';const sg=rankOf(grade())>=RANK.SG;box.querySelector('[data-v37-move-volcano]').disabled=!sg||jogoMovesUsed>=jogoVolcanoes();box.querySelector('[data-v37-erupt-volcano]').disabled=!sg||jogoEruptionUsed||jogoVolcanoes()<1;box.querySelector('[data-v37-absorb-crater]').disabled=jogoCraters()<1;}
function absorbCrater(){if(cid()!=='jogo'||jogoCraters()<1||!roomAllowed())return;const before=num(read('energy',0));setJogoCraters(jogoCraters()-1);write('energy',before+10);log('Cratere assorbito','Energia '+before+' → '+(before+10)+'. La casella torna attiva.');saveRender();updateJogoPanel();}
function moveVolcano(){if(cid()!=='jogo'||rankOf(grade())<RANK.SG||jogoMovesUsed>=jogoVolcanoes()||!roomAllowed())return;jogoMovesUsed+=1;persistV37();log('Vulcano spostato','Un Vulcano è stato mosso fino a 4 caselle. '+jogoMovesUsed+'/'+jogoVolcanoes()+' Vulcani mossi in questo turno.');saveRender();updateJogoPanel();}
function eruptVolcano(){if(cid()!=='jogo'||rankOf(grade())<RANK.SG||jogoEruptionUsed||jogoVolcanoes()<1||!roomAllowed())return;setJogoVolcanoes(jogoVolcanoes()-1);setJogoCraters(jogoCraters()+1);jogoEruptionUsed=true;persistV37();log('Eruzione vulcanica','1 Vulcano consumato e trasformato in Cratere. Crea un nuovo Vulcano usando la tecnica Vulcani.');saveRender();updateJogoPanel();}

function unlockedTechniquesFor(player){const ch=chars()[player.characterId],g=player.state?.gradeId||'G4';return (ch?.techniques||[]).filter(t=>rankOf(t.grade)<=rankOf(g));}
let sheetsTimer=null,selectedSheet=null,lastSheetSignature='';
function ensureSheetsModal(){
  ensureChoiceUi();let modalEl=document.getElementById('v37SheetsModal');if(modalEl)return modalEl;
  modalEl=document.createElement('div');modalEl.id='v37SheetsModal';modalEl.innerHTML='<section class="v37-sheets-shell"><header class="v37-sheets-head"><div><small>STRATEGIA IN ATTESA</small><h2>Schede degli altri giocatori</h2><p>Aggiornamento fluido in sola lettura. Tecniche e risorse non fanno più scattare la schermata.</p></div><button class="v37-close" type="button">✕</button></header><div class="v37-sheets-layout"><nav class="v37-player-tabs"></nav><main class="v37-sheet-detail"></main></div></section>';document.body.appendChild(modalEl);modalEl.querySelector('.v37-close').onclick=closeSheets;modalEl.addEventListener('click',e=>{if(e.target===modalEl)closeSheets();const tab=e.target.closest('[data-v37-player]');if(tab){selectedSheet=tab.dataset.v37Player;lastSheetSignature='';renderSheets(true);}});return modalEl;
}
function sheetPlayers(){const r=room(),me=localPlayer();return (r?.players||[]).filter(p=>!p.isHost&&p.playerToken!==me?.playerToken&&p.characterId);}
function playerSignature(p){const s=p.state||{};return [p.playerToken,p.connected,p.locked,p.characterId,s.gradeId,s.life,s.maxLife,s.energy,s.exp,s.combatBonus,s.itadoriFingers,s.jogoHeat,s.jogoVolcanoes,s.jogoCraters,JSON.stringify(s.used||[])].join('|');}
function renderSheets(force=false){
  const modalEl=ensureSheetsModal();if(!modalEl.classList.contains('show'))return;
  const players=sheetPlayers();if(!players.length){modalEl.querySelector('.v37-player-tabs').innerHTML='';modalEl.querySelector('.v37-sheet-detail').innerHTML='<div class="v37-empty">Nessun altro giocatore disponibile.</div>';return;}
  if(!selectedSheet||!players.some(p=>String(p.playerToken)===String(selectedSheet)))selectedSheet=String((players.find(p=>!p.locked)||players[0]).playerToken);
  const signature=players.map(playerSignature).join('§')+'#'+selectedSheet;if(!force&&signature===lastSheetSignature)return;lastSheetSignature=signature;
  const tabs=modalEl.querySelector('.v37-player-tabs'),detail=modalEl.querySelector('.v37-sheet-detail'),scroll=detail.scrollTop;
  tabs.innerHTML=players.map(p=>{const ch=chars()[p.characterId];return '<button type="button" class="v37-player-tab '+(String(p.playerToken)===selectedSheet?'active':'')+'" data-v37-player="'+String(p.playerToken).replace(/"/g,'')+'"><img src="'+(ch?.image||'')+'" alt=""><span><b>'+String(p.name||'Giocatore').replace(/[<>]/g,'')+'</b><small>'+String(ch?.name||p.characterId).replace(/[<>]/g,'')+' · '+String(p.state?.gradeId||'G4')+'</small></span><i class="'+(!p.locked?'live':'')+'"></i></button>';}).join('');
  const p=players.find(x=>String(x.playerToken)===selectedSheet)||players[0],s=p.state||{},ch=chars()[p.characterId],tech=unlockedTechniquesFor(p),max=s.maxLife??ch?.maxLife??'—';
  detail.innerHTML='<article class="v37-detail-card"><section class="v37-detail-hero"><img src="'+(ch?.image||'')+'" alt=""><div><small>'+(p.locked?'IN ATTESA':'TURNO ATTIVO')+'</small><h3>'+String(p.name||'Giocatore').replace(/[<>]/g,'')+'</h3><p>'+String(ch?.name||p.characterId).replace(/[<>]/g,'')+'</p></div><span class="v37-grade">'+String(s.gradeId||'G4')+'</span></section><section class="v37-stats"><div class="v37-stat"><small>Vita</small><b>'+String(s.life??'—')+' / '+String(max)+'</b></div><div class="v37-stat"><small>'+(p.characterId==='toji'?'Vigore':'Energia')+'</small><b>'+String(s.energy??'—')+'</b></div><div class="v37-stat"><small>EXP</small><b>'+String(s.exp??0)+'</b></div><div class="v37-stat"><small>Corpo base</small><b>'+String((ch?.baseBody||0)+(p.characterId==='itadori'?itadoriFingerBonuses(s.itadoriMaxFingers).body:0))+'</b></div></section><h3>Tecniche sbloccate · '+tech.length+'</h3><section class="v37-techniques">'+tech.map(t=>'<article class="v37-tech"><header><b>'+String(t.name).replace(/[<>]/g,'')+'</b><span>'+t.grade+'</span></header><p>'+String(t.v27CostLabel||('Costo: '+num(t.cost)+' Energia')).replace(/[<>]/g,'')+'</p><p>'+String(t.effect||t.extra||(t.bonus!=null?'+'+t.bonus+' Corpo':'Effetto speciale')).replace(/[<>]/g,'')+'</p></article>').join('')+'</section></article>';
  requestAnimationFrame(()=>{detail.scrollTop=Math.min(scroll,detail.scrollHeight-detail.clientHeight);});
}
function openSheets(){const modalEl=ensureSheetsModal();document.getElementById('v36OtherSheetsModal')?.classList.remove('show');modalEl.classList.add('show');selectedSheet=null;lastSheetSignature='';renderSheets(true);clearInterval(sheetsTimer);sheetsTimer=setInterval(()=>renderSheets(false),900);}
function closeSheets(){document.getElementById('v37SheetsModal')?.classList.remove('show');clearInterval(sheetsTimer);sheetsTimer=null;}

function resetTurnScoped(){
  if(cid()==='itadori'){const list=used().filter(k=>k!=='manipolazione_sangue');write('used',list);}
  if(cid()==='jogo'){jogoMovesUsed=0;jogoEruptionUsed=false;persistV37();}
  saveRender();
}
function watchTurn(){const r=room(),me=localPlayer();if(!r||r.phase!=='playing'||r.isHost||!me){lastLocalLocked=null;return;}const locked=!!me.locked;if(lastLocalLocked===true&&locked===false)resetTurnScoped();lastLocalLocked=locked;if(!locked)closeSheets();}

function installStateWrappers(){
  wrapFunction('effectiveBaseBody','__v37',original=>function(){if(cid()==='itadori')return 4+itadoriFingerBonuses(read('itadoriMaxFingers',0)).body;return original.apply(this,arguments);});
  wrapFunction('resourceMaxForGrade','__v37',original=>function(g){if(cid()==='itadori')return itadoriMaxEnergyForGrade(g);if(cid()==='jogo')return num(g?.max);return original.apply(this,arguments);});
  wrapFunction('roomStateResourceMax','__v37',original=>function(player){const s=player?.state||{},ch=chars()[player?.characterId],g=ch?.grades?.find(x=>x.id===(s.gradeId||'G4'))||ch?.grades?.[0];if(player?.characterId==='itadori')return itadoriMaxEnergyForGrade(g,s.itadoriMaxFingers);if(player?.characterId==='jogo')return num(g?.max);return original.apply(this,arguments);});
  wrapFunction('saveState','__v37',original=>function(){persistV37();applyItadoriStats();return original.apply(this,arguments);});
  wrapFunction('buildLocalPlayerState','__v37',original=>function(){const state=original.apply(this,arguments);if(!state)return state;if(state.characterId==='jogo'){state.life=num(read('life',8));state.maxLife=8;state.energy=num(read('energy',10));state.jogoLife=state.life;state.jogoVolcanoes=jogoVolcanoes();state.jogoCraters=jogoCraters();state.jogoVolcanoMovesUsed=jogoMovesUsed;state.jogoEruptionUsed=jogoEruptionUsed;}if(state.characterId==='itadori'){state.life=num(read('life',4));state.maxLife=itadoriMaxLife();state.energy=num(read('energy',10));state.itadoriMonsterFingers=itadoriMonsterFingers;state.itadoriImmortalityUsed=itadoriImmortalityUsed;delete state.itadoriFingerChoices;}if(state.characterId==='yuta'){state.yutaCopiedVolcanoes=yutaCopiedVolcanoes;state.yutaCopiedCraters=yutaCopiedCraters;state.yutaCopiedImmortalityReady=yutaCopiedImmortalityReady;}return state;});
  wrapFunction('createInitialRoomPlayerState','__v37',original=>function(characterId){const state=original.apply(this,arguments)||{};if(characterId==='jogo')Object.assign(state,{life:8,maxLife:8,energy:10,jogoLife:8,jogoHeat:0,jogoVolcanoes:0,jogoCraters:0,jogoVolcanoMovesUsed:0,jogoEruptionUsed:false});if(characterId==='itadori')Object.assign(state,{life:4,maxLife:4,energy:10,itadoriFingers:0,itadoriMaxFingers:0,itadoriMonsterFingers:0,itadoriImmortalityUsed:false});return state;});
  wrapFunction('sanitizeRoomState','__v37',original=>function(state,characterId){const clean=original.apply(this,arguments)||{};const raw=state||{};if(characterId==='jogo')Object.assign(clean,{life:Math.max(0,num(raw.life??8)),maxLife:8,energy:Math.max(0,num(raw.energy??10)),jogoLife:Math.max(0,num(raw.life??8)),jogoVolcanoes:clamp(raw.jogoVolcanoes,0,99),jogoCraters:clamp(raw.jogoCraters,0,99),jogoVolcanoMovesUsed:clamp(raw.jogoVolcanoMovesUsed,0,99),jogoEruptionUsed:!!raw.jogoEruptionUsed});if(characterId==='itadori')Object.assign(clean,{maxLife:itadoriMaxLife(raw.itadoriMaxFingers),itadoriMonsterFingers:clamp(raw.itadoriMonsterFingers,0,12),itadoriImmortalityUsed:!!raw.itadoriImmortalityUsed});if(characterId==='yuta')Object.assign(clean,{yutaCopiedVolcanoes:clamp(raw.yutaCopiedVolcanoes,0,99),yutaCopiedCraters:clamp(raw.yutaCopiedCraters,0,99),yutaCopiedImmortalityReady:!!raw.yutaCopiedImmortalityReady});return clean;});
  wrapFunction('applyRoomPlayerStateSnapshot','__v37',original=>function(state){if(state?.characterId==='itadori'){itadoriMonsterFingers=clamp(state.itadoriMonsterFingers,0,12);itadoriImmortalityUsed=!!state.itadoriImmortalityUsed;}if(state?.characterId==='jogo'){jogoMovesUsed=clamp(state.jogoVolcanoMovesUsed,0,99);jogoEruptionUsed=!!state.jogoEruptionUsed;}if(state?.characterId==='yuta'){yutaCopiedVolcanoes=clamp(state.yutaCopiedVolcanoes,0,99);yutaCopiedCraters=clamp(state.yutaCopiedCraters,0,99);yutaCopiedImmortalityReady=!!state.yutaCopiedImmortalityReady;}const out=original.apply(this,arguments);applyCharacters();applyItadoriStats();updatePanels();return out;});
  wrapFunction('openCharacter','__v37',original=>function(id){const out=original.apply(this,arguments);applyCharacters();if(id==='itadori'){itadoriMonsterFingers=clamp(storageGet(KEYS.itadoriMonster,0),0,12);itadoriImmortalityUsed=storageGet(KEYS.itadoriImmortal,'0')==='1';applyItadoriStats();}if(id==='jogo'){jogoMovesUsed=clamp(storageGet(KEYS.jogoMoves,0),0,99);jogoEruptionUsed=storageGet(KEYS.jogoEruption,'0')==='1';}setTimeout(()=>{updatePanels();try{getFunction('renderAll')?.();}catch(_){}},0);return out;});
  wrapFunction('startNewGame','__v37',original=>function(){let confirmed=false;const oldConfirm=root.confirm;root.confirm=function(message){const answer=oldConfirm?oldConfirm.call(root,message):true;confirmed=!!answer;return answer;};let out;try{out=original.apply(this,arguments);}finally{root.confirm=oldConfirm;}if(confirmed){itadoriMonsterFingers=0;itadoriImmortalityUsed=false;jogoMovesUsed=0;jogoEruptionUsed=false;yutaCopiedVolcanoes=0;yutaCopiedCraters=0;yutaCopiedImmortalityReady=false;Object.values(KEYS).forEach(key=>storageSet(key,0));applyCharacters();applyItadoriStats();}return out;});
  wrapFunction('changeLife','__v37',original=>function(delta){const before=num(read('life',0));if((cid()==='itadori'||cid()==='yuta')&&num(delta)<0&&before+num(delta)<=0&&maybeImmortal('Vita '+before+' → 0'))return;return original.apply(this,arguments);});
  wrapFunction('applyTechniqueLifeCost','__v37',original=>function(amount,name){const before=num(read('life',0));if((cid()==='itadori'||cid()==='yuta')&&num(amount)>0&&before-num(amount)<=0&&maybeImmortal(name||'Costo Vita'))return {respawned:false,immortality:true,text:' Immortalità ha annullato la morte e ripristinato tutte le risorse.'};return original.apply(this,arguments);});
  wrapFunction('adjustRoomStateObject','__v37',original=>function(player,field,delta){const s=player?.state||{};if(player?.characterId==='jogo'){if(field==='energy'){s.energy=Math.max(0,num(s.energy)+num(delta));s.updatedAt=Date.now();return;}if(field==='life'){const next=Math.max(0,num(s.life)+num(delta));if(next===0){s.life=8;s.energy=num(chars().jogo.grades.find(g=>g.id===(s.gradeId||'G4'))?.max||10);s.used=[];}else s.life=next;s.jogoLife=s.life;s.maxLife=8;s.updatedAt=Date.now();return;}}if(player?.characterId==='itadori'&&field==='life'&&num(s.life)+num(delta)<=0&&rankOf(s.gradeId)>=RANK.SG&&!s.itadoriImmortalityUsed){s.itadoriImmortalityUsed=true;s.maxLife=itadoriMaxLife(s.itadoriMaxFingers);s.life=s.maxLife;s.energy=itadoriMaxEnergyForGrade(chars().itadori.grades.find(g=>g.id===(s.gradeId||'G4')),s.itadoriMaxFingers);s.updatedAt=Date.now();return;}const out=original.apply(this,arguments);if(player?.characterId==='itadori'){s.maxLife=itadoriMaxLife(s.itadoriMaxFingers);}return out;});
  wrapFunction('resetYutaCopiedResources','__v37',original=>function(){yutaCopiedVolcanoes=0;yutaCopiedCraters=0;yutaCopiedImmortalityReady=false;persistV37();return original.apply(this,arguments);});
}

function installTechniqueWrappers(){
  wrapFunction('useTechnique','__v37',original=>function(key){
    const t=current()?.techniques?.find(x=>x.key===key);if(!t)return original.apply(this,arguments);
    if(t.v37JogoVolcano)return useJogoVolcano(t);
    if(t.v37JogoHanami){const raw=prompt('Inserisci il risultato del d6 (1-6):');if(raw===null)return;const roll=Number(raw);if(!Number.isInteger(roll)||roll<1||roll>6){modal('Dado non valido','','Scegli un valore da 1 a 6.');return;}return useJogoHanami(t,roll);}
    if(t.v37JogoMeteor)return useJogoMeteor(t);
    if(t.v37JogoDomain)return useJogoDomain(t);
    if(t.v37JogoTectonic){modal(t.name,'Passiva SG','Usa i controlli Vulcani nel pannello: ogni Vulcano può muoversi fino a 4 caselle e una volta per turno puoi trasformarne uno in Cratere.');return;}
    if(t.v37ItadoriBlood)return useBlood(t);
    if(t.v37ItadoriSoulDomain){chooseSoulDomain().then(result=>{if(result)useSoulDomain(t,result);});return;}
    if(t.v37ItadoriImmortality)return prepareImmortality(t);
    if(t.dynamicCost){const raw=prompt('Inserisci il risultato del d24 (1-24):');if(raw===null)return;const roll=Number(raw);if(!Number.isInteger(roll)||roll<1||roll>24){modal('Valore non valido','','Scegli un risultato da 1 a 24.');return;}return useVariableD24(t,roll);}
    return original.apply(this,arguments);
  });
  wrapFunction('executeYutaCopiedTechnique','__v37',original=>function(card){
    const src=getCopiedSource(),t=src?.t;if(!t)return original.apply(this,arguments);
    if(t.v37JogoVolcano)return useJogoVolcano(t,card);
    if(t.v37JogoHanami){const raw=prompt('Inserisci il risultato del d6 (1-6):');if(raw===null)return;const roll=Number(raw);if(!Number.isInteger(roll)||roll<1||roll>6){modal('Dado non valido','','Scegli un valore da 1 a 6.');return;}return useJogoHanami(t,roll,card);}
    if(t.v37JogoMeteor)return useJogoMeteor(t,card);
    if(t.v37JogoDomain)return useJogoDomain(t,card);
    if(t.v37JogoTectonic){modal('Copia: '+t.name,'Effetto disponibile','Yuta può gestire i Vulcani copiati con le stesse regole di movimento ed eruzione.');markCopyUsed(card,t,0);saveRender();return;}
    if(t.v37ItadoriBlood)return useBlood(t,card);
    if(t.v37ItadoriSoulDomain){chooseSoulDomain().then(result=>{if(result)useSoulDomain(t,result,card);});return;}
    if(t.v37ItadoriImmortality)return prepareImmortality(t,card);
    if(t.dynamicCost){const raw=prompt('Inserisci il risultato del d24 (1-24):');if(raw===null)return;const roll=Number(raw);if(!Number.isInteger(roll)||roll<1||roll>24){modal('Valore non valido','','Scegli un risultato da 1 a 24.');return;}return useVariableD24(t,roll,card);}
    return original.apply(this,arguments);
  });
}

function updatePanels(){applyCharacters();applyItadoriStats();updateItadoriPanel();updateJogoPanel();updateBloodButton();document.querySelectorAll('.v36-jogo-quick').forEach(panel=>{const b=panel.querySelector('b'),small=panel.querySelector('small');if(b)b.textContent='🔥 Jogo · Energia Maledetta';if(small)small.textContent='Risorsa separata dalla Vita · massimo del grado';});}
function installEvents(){
  if(document.documentElement.dataset.v37Events==='1')return;document.documentElement.dataset.v37Events='1';
  document.addEventListener('click',event=>{
    if(event.target.closest('#v36OtherSheetsBtn')){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openSheets();return;}
    if(event.target.closest('[data-v37-monster]')){awardMonsterFinger();return;}
    if(event.target.closest('[data-v37-sukuna]')){awardSukunaFingers();return;}
    if(event.target.closest('[data-v37-stolen]')){awardItadoriFingers(1,'Dito rubato');return;}
    if(event.target.closest('[data-v37-correct]')){correctItadoriFinger();return;}
    if(event.target.closest('[data-v37-absorb-crater]')){absorbCrater();return;}
    if(event.target.closest('[data-v37-move-volcano]')){moveVolcano();return;}
    if(event.target.closest('[data-v37-erupt-volcano]')){eruptVolcano();return;}
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeSheets();document.getElementById('v37RollModal')?.classList.remove('show');}});
}
function verifyRuntime(){
  const bp=blueprints(),checks={
    version:VERSION,
    variableCostCap:resolveVariableCost(16,14,16,false).body===14,
    itadoriLife:bp.itadori.maxLife===4,
    itadoriBody:bp.itadori.baseBody===4,
    itadoriSgEnergy:bp.itadori.grades.find(g=>g.id==='SG').max===21,
    jogoVolcanoBonus:bp.jogo.techniques.find(t=>t.key==='vulcani').bonus===6,
    jogoEnergySeparate:bp.jogo.lifeEnergyLinked===false,
    sheetsCapture:document.documentElement.dataset.v37Events==='1'
  };
  checks.ok=Object.entries(checks).filter(([k])=>!['version','ok'].includes(k)).every(([,v])=>v===true);
  root.JJKV37RuntimeChecks=checks;console.info('JJK Energy V37 checks',checks);return checks;
}
function bindAll(){applyCharacters();installStateWrappers();installTechniqueWrappers();installEvents();updatePanels();}
function install(){
  if(root.__JJK_V37_INSTALLED__)return;root.__JJK_V37_INSTALLED__=true;
  const start=()=>{bindAll();setTimeout(()=>{bindAll();try{getFunction('renderAll')?.();}catch(_){}},350);setTimeout(bindAll,1200);setTimeout(()=>verifyRuntime(),1600);setInterval(()=>{bindAll();watchTurn();updatePanels();},1300);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}

return {version:VERSION,itadoriFingerBonuses,resolveVariableCost,blueprints,install};
});
