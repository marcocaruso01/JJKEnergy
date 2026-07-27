/* JJK Energy V39.8 - requested Itadori rewrite and energy-capped variable techniques */
(function(root,factory){
  const api=factory(root||globalThis);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
'use strict';

const VERSION='39.8.0';
const RANK={G4:0,G3:1,G2:2,G1:3,SS:4,SG:5};
const num=value=>Number.isFinite(Number(value))?Number(value):0;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,num(value)));

function fingerBonuses(value){
  const fingers=clamp(value,0,20);
  const out={body:0,life:0,energy:0};
  if(fingers>=4)out.body+=1;
  if(fingers>=8){out.body+=1;out.life+=1;}
  if(fingers>=12){out.body+=1;out.life+=1;out.energy+=2;}
  if(fingers>=16){out.body+=1;out.life+=1;out.energy+=2;}
  if(fingers>=20){out.body+=1;out.life+=1;out.energy+=2;}
  return out;
}

function resolveVariableCost(roll,availableEnergy,effectiveCost=roll,free=false){
  const rolled=Math.max(0,Math.trunc(num(roll)));
  const available=Math.max(0,num(availableEnergy));
  const cost=Math.max(0,num(effectiveCost));
  if(free)return {roll:rolled,available,paid:0,body:rolled,missing:0,effectiveCost:cost};
  const paid=Math.min(available,cost);
  const body=Math.min(rolled,available);
  return {roll:rolled,available,paid,body,missing:Math.max(0,rolled-body),effectiveCost:cost};
}

function analyzeBlackFlash(values){
  const rolls=(Array.isArray(values)?values:[]).map(Number);
  if(!rolls.length)return {ok:false,rolls:[],sum:0,error:'empty'};
  if(rolls.some(value=>!Number.isInteger(value)||value<1||value>6))return {ok:false,rolls,sum:0,error:'range'};
  for(let index=1;index<rolls.length;index++){
    if(rolls[index]<rolls[index-1])return {ok:false,rolls,sum:0,error:'order',index};
  }
  return {ok:true,rolls,sum:rolls.reduce((total,value)=>total+value,0),error:null};
}

function itadoriBlueprint(){
  return {
    name:'Yuji Itadori',
    baseMaxLife:4,
    maxLife:4,
    baseBody:4,
    coins:1,
    hasFingers:true,
    innateName:'Richiamo del Ricettacolo Perfetto',
    innateEffect:'Guadagna 1 Dito per ogni mostro abbattuto, fino a 12. Uccidere Sukuna concede 5 Dita. Quando si trova in una casella adiacente a un giocatore che possiede un Dito, viene attirato nella sua casella e ruba immediatamente 1 Dito. Nel mazzo sono presenti 10 Dita.',
    grades:[
      {id:'G4',label:'Grado 4',max:10,exp:0},
      {id:'G3',label:'Grado 3',max:12,exp:9},
      {id:'G2',label:'Grado 2',max:15,exp:19},
      {id:'G1',label:'Grado 1',max:18,exp:30},
      {id:'SS',label:'Semi Special Grade',max:20,exp:42},
      {id:'SG',label:'Special Grade',max:21,exp:50}
    ],
    techniques:[
      {key:'pugno_divergente',name:'Pugno Divergente',grade:'G4',cost:4,bonus:4,image:'assets/itadori_g4.webp'},
      {key:'black_flash_itadori',name:'Black Flash',grade:'G3',cost:0,bonus:null,image:'assets/itadori_g1.webp',itadoriBlackFlash:true,v27ItadoriBlackFlash:true,v392BlackFlash:true,v27CostLabel:'Costo: somma finale dei dadi validi',effect:'Continua a lanciare dadi e a sommarli finché ogni risultato è maggiore o uguale al precedente. Se l’Energia Maledetta non basta, perdi 1 Corpo per ogni punto mancante.'},
      {key:'manipolazione_sangue',name:'Manipolazione del Sangue',grade:'G2',cost:0,bonus:null,image:'assets/itadori_g3.webp',v37ItadoriBlood:true,v392Blood:true,v27CostLabel:'1 Vita → 10 Energia',effect:'Una volta per turno, in qualsiasi momento, puoi convertire 1 Vita in 10 Energia Maledetta.'},
      {key:'freccia_itadori',name:'Freccia Infuocata',grade:'G1',cost:10,bonus:10,lifeCost:1,image:'assets/itadori_freccia.webp',extra:'Costo aggiuntivo: perdi 1 Vita.'},
      {key:'richiamo_anima_sukuna',name:"(Dominio) Richiamo dell'Anima di Sukuna",grade:'SS',cost:0,bonus:null,image:'assets/itadori_ss.webp',v37ItadoriSoulDomain:true,v392Soul:true,v27CostLabel:'Costo: risultato del dado Taglio di Sukuna',effect:'Lancia il dado Taglio di Sukuna e 2 dadi normali. Il costo è uguale al risultato del dado Taglio; se l’Energia Maledetta non basta, il Corpo fornito da quel dado si abbassa all’Energia disponibile.'},
      {key:'immortalita',name:'Immortalità',grade:'SG',cost:0,bonus:null,image:'assets/itadori_taglio.webp',v37ItadoriImmortality:true,v392Immortal:true,effect:'Una volta per partita, quando stai per morire, recuperi immediatamente tutta la Vita e tutta l’Energia Maledetta.'}
    ]
  };
}

function read(name,fallback=null){
  try{const value=(0,eval)(name);return value===undefined?fallback:value;}
  catch(_){return root[name]===undefined?fallback:root[name];}
}
function write(name,value){
  root.__v398Value=value;
  try{(0,eval)(name+'=globalThis.__v398Value');}
  catch(_){try{root[name]=value;}catch(__){}}
  delete root.__v398Value;
}
function getfn(name){const value=read(name,root[name]);return typeof value==='function'?value:null;}
function setfn(name,value){
  root[name]=value;
  root.__v398Fn=value;
  try{(0,eval)(name+'=globalThis.__v398Fn');}catch(_){}
  delete root.__v398Fn;
}
function chars(){return read('characters',root.characters||{});}
function cid(){return read('currentId',null);}
function current(){return read('current',null);}
function grade(){return read('gradeId','G4');}
function used(){const value=read('used',[]);return Array.isArray(value)?value:[];}
function roomAllowed(){const fn=getfn('roomActionAllowed');try{return fn?!!fn():true;}catch(_){return true;}}
function bossFree(){const fn=getfn('isBossRushFree');try{return fn?!!fn():false;}catch(_){return false;}}
function baseBody(){return num(getfn('effectiveBaseBody')?.()??current()?.baseBody);}
function combatBonus(){return num(read('combatBonus',0));}
function discountedCost(value){const fn=getfn('mcDiscountCost');try{return Math.max(0,num(fn?fn(cid(),value):value));}catch(_){return Math.max(0,num(value));}}
function saveRender(){try{getfn('saveState')?.();}catch(_){}try{getfn('renderAll')?.();}catch(_){} }
function show(title,value,text){try{getfn('showModal')?.(title,value,text);}catch(_){} }
function log(title,text){try{getfn('addLog')?.(title,text);}catch(_){} }
function play(technique){try{getfn('playTechniqueEffect')?.(technique);}catch(_){} }

let legacyStateCleared=false;
function applyItadori(){
  const all=chars();
  if(!all.itadori)return null;
  const image=all.itadori.image;
  Object.assign(all.itadori,itadoriBlueprint());
  if(image)all.itadori.image=image;
  all.itadori.maxLife=4+fingerBonuses(read('itadoriMaxFingers',0)).life;
  if(cid()==='itadori'){
    write('current',all.itadori);
    write('itadoriOneUse',0);
  }
  if(!legacyStateCleared){
    legacyStateCleared=true;
    try{localStorage.removeItem('jjk_itadori_itadoriOneUse');}catch(_){}
  }
  if(root.JJK_UI_META?.itadori){
    root.JJK_UI_META.itadori.description='Ricettacolo perfetto: 4 Vita, 4 Corpo, 1 Moneta. Ottiene Dita dai mostri, da Sukuna e rubandole per adiacenza; i bonus permanenti crescono a 4, 8, 12, 16 e 20 Dita.';
  }
  return all.itadori;
}

function updateItadoriPanel(){
  if(cid()!=='itadori')return;
  const panel=document.getElementById('v392ItadoriPanel')||document.getElementById('v37ItadoriPanel');
  if(!panel)return;
  const title=panel.querySelector('.v392-title,.v37-panel-title');
  if(title)title.textContent='Dita di Sukuna · Richiamo del Ricettacolo Perfetto';
  const sub=panel.querySelector('.v392-sub');
  if(sub)sub.textContent='1 Dito per mostro abbattuto (massimo 12) · Sukuna sconfitto: +5 · adiacenza a un possessore: attrazione e furto immediato di 1 Dito · 10 Dita nel mazzo.';
  let rules=panel.querySelector('#v398FingerRules');
  const milestones=panel.querySelector('.v392-milestones,.v37-progress');
  if(!rules&&milestones){
    rules=document.createElement('div');
    rules.id='v398FingerRules';
    rules.style.cssText='margin-top:9px;color:#c9b9c5;font-size:.68rem;line-height:1.45';
    milestones.insertAdjacentElement('afterend',rules);
  }
  if(rules)rules.textContent='4: +1 Corpo · 8: +1 Corpo e +1 Vita · 12, 16 e 20: ogni soglia aggiunge +1 Corpo, +1 Vita e +2 EM permanenti.';
}

function decorateTechniqueCards(){
  if(cid()!=='itadori'&&cid()!=='sukuna'&&cid()!=='yuta')return;
  document.querySelectorAll('#techGrid > .tech-card').forEach(card=>{
    const name=(card.querySelector('.tech-name')?.textContent||'').trim().toLowerCase();
    const cost=card.querySelector('.tech-cost');
    if(!cost)return;
    if(name==='world slash')cost.innerHTML='Costo: risultato d24<span class="v392-tech-note">Il Corpo del d24 non può superare l’EM disponibile</span>';
    if(cid()==='itadori'&&name==='black flash')cost.innerHTML='Costo: somma finale dei dadi validi<span class="v392-tech-note">Ogni dado deve essere ≥ al precedente · Corpo limitato dall’EM</span>';
    if(cid()==='itadori'&&name.includes("richiamo dell'anima di sukuna"))cost.innerHTML='Costo: risultato dado Taglio<span class="v392-tech-note">Corpo Taglio limitato dall’EM + 2 dadi normali</span>';
  });
}

function finishDirect(technique,before,resolved,total,text){
  const list=used();
  if(!list.includes(technique.key))list.push(technique.key);
  write('used',list);
  try{getfn('recordTechniqueUse')?.(cid(),technique,resolved.paid);}catch(_){}
  log('Tecnica utilizzata',technique.name+': Energia '+before+' → '+num(read('energy',0))+'. '+text);
  saveRender();play(technique);show(technique.name,total+' Combattimento',text);
}

function finishCopy(card,technique,before,resolved,total,text){
  try{getfn('markYutaCopyUsed')?.(card,technique,resolved.paid);}catch(_){}
  log('Copia: '+technique.name,'Energia '+before+' → '+num(read('energy',0))+'. '+text);
  saveRender();play(technique);show('Copia: '+technique.name,total+' Combattimento',text);
}

function variableResult(roll){
  const before=Math.max(0,num(read('energy',0)));
  const effective=discountedCost(roll);
  const resolved=resolveVariableCost(roll,before,effective,bossFree());
  if(!bossFree())write('energy',before-resolved.paid);
  return {before,effective,resolved};
}

function useVariableTechnique(technique,copyCard=null){
  const raw=root.prompt('Inserisci il risultato del d24 (1-24):');
  if(raw===null)return;
  const roll=Number(raw);
  if(!Number.isInteger(roll)||roll<1||roll>24)return show('Valore non valido','','Inserisci un numero intero da 1 a 24.');
  const {before,effective,resolved}=variableResult(roll);
  let katana=0;
  if(copyCard&&read('yutaKatanaActive',false)){
    const compatible=getfn('yutaKatanaCanCombine');
    if(!compatible||compatible(technique)){
      katana=3;
      if(!bossFree())try{getfn('consumeYutaKatana')?.();}catch(_){}
    }
  }
  const total=baseBody()+resolved.body+combatBonus()+katana;
  const text='d24 '+roll+': Corpo applicato '+resolved.body+(resolved.missing?' (−'+resolved.missing+' perché l’EM disponibile era '+before+')':'')+'. Costo effettivo '+effective+', EM pagata '+resolved.paid+'. Totale '+baseBody()+' + '+resolved.body+' + bonus '+combatBonus()+(katana?' + Katana 3':'')+' = '+total+'.';
  if(copyCard)return finishCopy(copyCard,technique,before,resolved,total,text);
  return finishDirect(technique,before,resolved,total,text);
}

function chooseBlackFlash(){
  const raw=root.prompt('Inserisci i risultati dei d6 separati da virgola. Ogni risultato deve essere maggiore o uguale al precedente:');
  if(raw===null)return null;
  const analysis=analyzeBlackFlash(raw.split(/[^0-9]+/).filter(Boolean));
  if(!analysis.ok){
    show('Black Flash non valido','',analysis.error==='order'?'Ogni risultato deve essere maggiore o uguale al precedente.':'Inserisci risultati da 1 a 6.');
    return null;
  }
  return analysis;
}

function useBlackFlash(technique,copyCard=null){
  const analysis=chooseBlackFlash();
  if(!analysis)return;
  const {before,effective,resolved}=variableResult(analysis.sum);
  let katana=0;
  if(copyCard&&read('yutaKatanaActive',false)){
    const compatible=getfn('yutaKatanaCanCombine');
    if(!compatible||compatible(technique)){
      katana=3;
      if(!bossFree())try{getfn('consumeYutaKatana')?.();}catch(_){}
    }
  }
  const total=baseBody()+resolved.body+combatBonus()+katana;
  const text='Dadi validi '+analysis.rolls.join(' + ')+' = '+analysis.sum+'. Corpo dei dadi '+resolved.body+(resolved.missing?' (−'+resolved.missing+' perché l’EM disponibile era '+before+')':'')+'. Costo effettivo '+effective+', EM pagata '+resolved.paid+'. Totale '+baseBody()+' + '+resolved.body+' + bonus '+combatBonus()+(katana?' + Katana 3':'')+' = '+total+'.';
  if(copyCard)return finishCopy(copyCard,technique,before,resolved,total,text);
  return finishDirect(technique,before,resolved,total,text);
}

function chooseSoulDice(){
  const raw=root.prompt('Inserisci dado Taglio di Sukuna, dado normale, dado normale (esempio 16,5,3):');
  if(raw===null)return null;
  const values=raw.split(/[^0-9]+/).filter(Boolean).map(Number);
  if(values.length!==3||!Number.isInteger(values[0])||values[0]<1||values[0]>24||values.slice(1).some(value=>!Number.isInteger(value)||value<1||value>6)){
    show('Dadi non validi','','Inserisci un risultato da 1 a 24 per il dado Taglio e due risultati da 1 a 6.');
    return null;
  }
  return {slash:values[0],dice:values.slice(1)};
}

function useSoulDomain(technique,copyCard=null){
  const result=chooseSoulDice();
  if(!result)return;
  const {before,effective,resolved}=variableResult(result.slash);
  const normal=result.dice[0]+result.dice[1];
  const total=baseBody()+resolved.body+normal+combatBonus();
  const text='Dado Taglio '+result.slash+': Corpo applicato '+resolved.body+(resolved.missing?' (−'+resolved.missing+' perché l’EM disponibile era '+before+')':'')+', costo effettivo '+effective+', EM pagata '+resolved.paid+'. Dadi normali '+result.dice.join(' + ')+' = '+normal+'. Totale '+baseBody()+' + '+resolved.body+' + '+normal+' + bonus '+combatBonus()+' = '+total+'.';
  if(copyCard)return finishCopy(copyCard,technique,before,resolved,total,text);
  return finishDirect(technique,before,resolved,total,text);
}

function patchUseTechnique(){
  const active=getfn('useTechnique');
  if(!active||active.__v398)return;
  const original=active;
  const wrapped=function(key){
    applyItadori();
    const technique=current()?.techniques?.find(item=>String(item.key)===String(key));
    if(!technique)return original.apply(this,arguments);
    if(!roomAllowed())return;
    if(used().includes(technique.key)&&technique.key!=='immortalita')return;
    if(technique.dynamicCost)return useVariableTechnique(technique);
    if(cid()==='itadori'&&technique.key==='black_flash_itadori')return useBlackFlash(technique);
    if(cid()==='itadori'&&technique.key==='richiamo_anima_sukuna')return useSoulDomain(technique);
    return original.apply(this,arguments);
  };
  wrapped.__v398=true;
  wrapped.__v392=true;
  if(active.__v37)wrapped.__v37=true;
  setfn('useTechnique',wrapped);
}

function patchCopiedTechnique(){
  const active=getfn('executeYutaCopiedTechnique');
  if(!active||active.__v398||!active.__v37)return;
  const original=active;
  const wrapped=function(card){
    const source=getfn('getYutaCopiedSource')?.();
    const technique=source?.t;
    if(!technique)return original.apply(this,arguments);
    if(technique.dynamicCost)return useVariableTechnique(technique,card);
    if(technique.itadoriBlackFlash||technique.v392BlackFlash||technique.key==='black_flash_itadori')return useBlackFlash(technique,card);
    if(technique.v392Soul||technique.v37ItadoriSoulDomain||technique.key==='richiamo_anima_sukuna')return useSoulDomain(technique,card);
    return original.apply(this,arguments);
  };
  wrapped.__v398=true;
  wrapped.__v37=true;
  setfn('executeYutaCopiedTechnique',wrapped);
}

function wrapCore(name,factory){
  const active=getfn(name);
  if(!active||active.__v398)return;
  const wrapped=factory(active);
  wrapped.__v398=true;
  wrapped.__v392=true;
  if(active.__v37)wrapped.__v37=true;
  setfn(name,wrapped);
}

function patchCore(){
  wrapCore('effectiveBaseBody',original=>function(){
    if(cid()==='itadori')return 4+fingerBonuses(read('itadoriMaxFingers',0)).body;
    return original.apply(this,arguments);
  });
  wrapCore('resourceMaxForGrade',original=>function(selectedGrade){
    if(cid()==='itadori')return num(selectedGrade?.max)+fingerBonuses(read('itadoriMaxFingers',0)).energy;
    return original.apply(this,arguments);
  });
  wrapCore('roomStateResourceMax',original=>function(player){
    if(player?.characterId==='itadori'){
      const state=player.state||{};
      const character=chars().itadori;
      const selected=character?.grades?.find(item=>item.id===(state.gradeId||'G4'))||character?.grades?.[0];
      return num(selected?.max)+fingerBonuses(state.itadoriMaxFingers).energy;
    }
    return original.apply(this,arguments);
  });
  wrapCore('createInitialRoomPlayerState',original=>function(characterId){
    const state=original.apply(this,arguments)||{};
    if(characterId==='itadori')Object.assign(state,{life:4,maxLife:4,energy:10,itadoriFingers:0,itadoriMaxFingers:0,itadoriMonsterFingers:0,itadoriImmortalityUsed:false});
    return state;
  });
  wrapCore('sanitizeRoomState',original=>function(state,characterId){
    const clean=original.apply(this,arguments)||{};
    if(characterId==='itadori')clean.maxLife=4+fingerBonuses(state?.itadoriMaxFingers).life;
    return clean;
  });
  wrapCore('buildLocalPlayerState',original=>function(){
    const state=original.apply(this,arguments);
    if(state?.characterId==='itadori'){
      state.maxLife=4+fingerBonuses(state.itadoriMaxFingers).life;
      delete state.itadoriOneUse;
    }
    return state;
  });
  ['renderAll','renderHeader','renderGrades','renderTechniques'].forEach(name=>wrapCore(name,original=>function(){
    applyItadori();
    const output=original.apply(this,arguments);
    updateItadoriPanel();decorateTechniqueCards();
    return output;
  }));
  wrapCore('openCharacter',original=>function(id){
    applyItadori();
    const output=original.apply(this,arguments);
    applyItadori();
    if(id==='itadori'){
      write('itadoriOneUse',0);
      setTimeout(()=>{try{getfn('renderAll')?.();}catch(_){}},0);
    }
    return output;
  });
}

function audit(){
  const blueprint=itadoriBlueprint();
  const checks={
    version:VERSION,
    worldSlashCap:resolveVariableCost(16,14,16,false).body===14,
    discountedCostIndependent:resolveVariableCost(16,14,13,false).body===14&&resolveVariableCost(16,14,13,false).paid===13,
    itadoriStats:blueprint.maxLife===4&&blueprint.baseBody===4&&blueprint.coins===1,
    itadoriProgression:JSON.stringify(fingerBonuses(20))===JSON.stringify({body:5,life:4,energy:6}),
    itadoriGrades:blueprint.grades.map(item=>item.exp).join(',')==='0,9,19,30,42,50'&&blueprint.grades.map(item=>item.max).join(',')==='10,12,15,18,20,21',
    itadoriTechniques:blueprint.techniques.map(item=>item.key).join(',')==='pugno_divergente,black_flash_itadori,manipolazione_sangue,freccia_itadori,richiamo_anima_sukuna,immortalita'
  };
  checks.ok=Object.entries(checks).filter(([key])=>!['version','ok'].includes(key)).every(([,value])=>value===true);
  root.JJKV398Audit=checks;
  return checks;
}

function bind(){applyItadori();patchCore();patchUseTechnique();patchCopiedTechnique();updateItadoriPanel();decorateTechniqueCards();}
function install(){
  if(root.__JJK_V398_INSTALLED__)return;
  root.__JJK_V398_INSTALLED__=true;
  const wait=attempt=>{
    if(!root.__JJK_V392_INSTALLED__&&attempt<80){setTimeout(()=>wait(attempt+1),50);return;}
    bind();
    setTimeout(bind,200);
    setTimeout(bind,700);
    setTimeout(()=>{bind();audit();},1700);
    setInterval(bind,750);
    console.info('JJK Energy V39.8 requested rules ready',VERSION);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>wait(0),{once:true});else wait(0);
}

return {version:VERSION,fingerBonuses,resolveVariableCost,analyzeBlackFlash,itadoriBlueprint,install,audit};
});