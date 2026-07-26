/* JJK Energy V39.1 - cache-safe runtime repair */
(function(root){
'use strict';
if(root.__JJK_V391_INSTALLED__)return;
root.__JJK_V391_INSTALLED__=true;
const VERSION='39.1.0';
const RANK={G4:0,G3:1,G2:2,G1:3,SS:4,SG:5};
const num=value=>Number.isFinite(Number(value))?Number(value):0;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,num(value)));
function read(name,fallback=null){
  try{const value=(0,eval)(name);return value===undefined?fallback:value;}catch(_){return root[name]===undefined?fallback:root[name];}
}
function write(name,value){
  root.__jjkV391Value=value;
  try{(0,eval)(name+'=globalThis.__jjkV391Value');}catch(_){try{root[name]=value;}catch(__){}}
  delete root.__jjkV391Value;
}
function getFunction(name){const value=read(name,root[name]);return typeof value==='function'?value:null;}
function setFunction(name,value){
  root[name]=value;root.__jjkV391Function=value;
  try{(0,eval)(name+'=globalThis.__jjkV391Function');}catch(_){}
  delete root.__jjkV391Function;
}
function itadoriBonuses(maxFingers){
  const fingers=clamp(maxFingers,0,20),out={body:0,life:0,energy:0};
  if(fingers>=4)out.body+=1;
  if(fingers>=8){out.body+=1;out.life+=1;}
  if(fingers>=12){out.body+=1;out.life+=1;out.energy+=2;}
  if(fingers>=16){out.body+=1;out.life+=1;out.energy+=2;}
  if(fingers>=20){out.body+=1;out.life+=1;out.energy+=2;}
  return out;
}
function resolveVariableCost(roll,availableEnergy,bossFree=false){
  const rolled=Math.max(0,Math.trunc(num(roll))),available=Math.max(0,num(availableEnergy));
  const paid=bossFree?0:Math.min(rolled,available);
  return {roll:rolled,paid,body:bossFree?rolled:paid,missing:bossFree?0:Math.max(0,rolled-paid)};
}
function analyzeBlackFlashRolls(values){
  const rolls=(Array.isArray(values)?values:[]).map(Number);
  if(!rolls.length)return {ok:false,error:'empty',rolls:[],sum:0};
  if(rolls.some(value=>!Number.isInteger(value)||value<1||value>6))return {ok:false,error:'range',rolls,sum:0};
  for(let index=1;index<rolls.length;index++)if(rolls[index]<rolls[index-1])return {ok:false,error:'order',rolls,sum:0,index};
  return {ok:true,error:null,rolls,sum:rolls.reduce((total,value)=>total+value,0)};
}
function blueprints(){
  const ids=['G4','G3','G2','G1','SS','SG'];
  const labels=['Grado 4','Grado 3','Grado 2','Grado 1','Semi Special Grade','Special Grade'];
  const grades=rows=>rows.map((row,index)=>({id:ids[index],label:labels[index],exp:row[0],max:row[1]}));
  return {
    jogo:{name:'Jogo',maxLife:8,baseBody:5,coins:0,isJogo:true,lifeEnergyLinked:false,innateName:'Natura Vulcanica',innateEffect:'Può muoversi liberamente fino a 4 caselle. Non può usare il Fato.',grades:grades([[0,10],[7,12],[16,15],[26,18],[35,20],[45,23]]),techniques:[
      {key:'insetti',name:'Insetti Ardenti',grade:'G4',cost:5,bonus:4,image:'assets/jogo_g4.png'},
      {key:'vulcani',name:'Vulcani',grade:'G3',cost:8,bonus:6,image:'assets/jogo_sheet.png',v37JogoVolcano:true,v27CostLabel:'Costo: 8 Energia · +6 Corpo',extra:'Crea un Vulcano. PVE: i nemici pescati contro Jogo hanno −2 Corpo. PVP: Jogo guadagna Energia quando altri raccolgono EM sulla casella del Vulcano.'},
      {key:'salvataggio_hanami',name:'Salvataggio di Emergenza Hanami',grade:'G2',cost:10,bonus:null,image:'assets/jogo_g2.png',v37JogoHanami:true,v27JogoHanami:true,effect:'Perdi automaticamente lo scontro. Con 3-6 Hanami ti salva, ripristina tutta l’Energia e impedisce all’avversario di prendere oggetti, seguaci o Vita; con 1-2 fallisce.'},
      {key:'meteora2',name:'Meteora Infuocata',grade:'G1',cost:12,bonus:9,image:'assets/jogo_g1.png',v37JogoMeteor:true,extra:'Ottieni 1 Calore, massimo 8. Questa tecnica riceve +1 Corpo per ogni punto Calore già accumulato.'},
      {key:'bara_ferro',name:'Bara della Montagna di Ferro',grade:'SS',cost:18,bonus:15,image:'assets/jogo_sheet.png',v37JogoDomain:true,extra:'+1 Corpo per ogni Vulcano presente, massimo +3. Distrugge una casella e la trasforma in Cratere.'},
      {key:'placche_tettoniche',name:'Manipolazione Placche Tettoniche',grade:'SG',cost:0,bonus:null,image:'assets/jogo_sheet.png',v37JogoTectonic:true,effect:'Muovi ogni Vulcano fino a 4 caselle. Una volta per turno puoi consumarne uno per trasformare la sua casella in Cratere.'}
    ]},
    itadori:{name:'Yuji Itadori',baseMaxLife:4,maxLife:4,baseBody:4,coins:1,hasFingers:true,innateName:'Richiamo del Ricettacolo Perfetto',innateEffect:'Guadagna 1 Dito per ogni mostro abbattuto, fino a 12; sconfiggere Sukuna concede 5 Dita; se è adiacente a un giocatore con un Dito viene attirato nella sua casella e ne ruba immediatamente 1.',grades:grades([[0,10],[9,12],[19,15],[30,18],[42,20],[50,21]]),techniques:[
      {key:'pugno_divergente',name:'Pugno Divergente',grade:'G4',cost:4,bonus:4,image:'assets/itadori_g4.webp'},
      {key:'black_flash_itadori',name:'Black Flash',grade:'G3',cost:0,bonus:null,image:'assets/itadori_g1.webp',v27ItadoriBlackFlash:true,itadoriBlackFlash:true,v27CostLabel:'Costo: somma dei dadi validi',effect:'Continua a lanciare dadi finché ogni risultato è maggiore o uguale al precedente. Il costo è la somma; se l’Energia non basta, il Corpo applicato si abbassa all’Energia disponibile.'},
      {key:'manipolazione_sangue',name:'Manipolazione del Sangue',grade:'G2',cost:0,bonus:null,image:'assets/itadori_g3.webp',v37ItadoriBlood:true,v27CostLabel:'1 Vita → 10 Energia',effect:'Una volta per turno, in qualsiasi momento, converti 1 Vita in 10 Energia Maledetta.'},
      {key:'freccia_itadori',name:'Freccia Infuocata',grade:'G1',cost:10,bonus:10,lifeCost:1,image:'assets/itadori_freccia.webp',extra:'Costo aggiuntivo: perdi 1 Vita.'},
      {key:'richiamo_anima_sukuna',name:'Richiamo dell’Anima di Sukuna',grade:'SS',cost:0,bonus:null,image:'assets/itadori_ss.webp',v37ItadoriSoulDomain:true,v27CostLabel:'Costo: risultato d24 · Corpo: d24 limitato dall’EM + 2d6',effect:'Lancia il dado Taglio di Sukuna e 2 dadi normali. Il d24 determina costo e Corpo; se l’Energia non basta, il Corpo del d24 viene ridotto.'},
      {key:'immortalita',name:'Immortalità',grade:'SG',cost:0,bonus:null,image:'assets/itadori_taglio.webp',v37ItadoriImmortality:true,effect:'Una volta per partita, quando stai per morire recuperi immediatamente tutta la Vita e tutta l’Energia.'}
    ]}
  };
}
function characters(){return read('characters',root.characters||{});}
function currentId(){return read('currentId',null);}
function current(){return read('current',null);}
function used(){const value=read('used',[]);return Array.isArray(value)?value:[];}
function applyBlueprints(){
  const roster=characters(),bp=blueprints();
  for(const id of ['jogo','itadori']){
    if(!roster[id])continue;
    const image=roster[id].image;
    Object.assign(roster[id],bp[id]);
    if(image)roster[id].image=image;
  }
  if(roster.itadori){
    const bonus=itadoriBonuses(read('itadoriMaxFingers',0));
    roster.itadori.maxLife=4+bonus.life;
  }
  if(currentId()==='jogo')write('current',roster.jogo);
  if(currentId()==='itadori'){
    write('current',roster.itadori);
    const maxLife=roster.itadori.maxLife;
    if(num(read('life',maxLife))>maxLife)write('life',maxLife);
  }
}
function completeTechnique(technique,before,resolved,total,text){
  const list=used();if(!list.includes(technique.key))list.push(technique.key);write('used',list);
  getFunction('recordTechniqueUse')?.(currentId(),technique,resolved.paid);
  getFunction('addLog')?.('Tecnica utilizzata',technique.name+': '+before+' → '+Math.max(0,num(read('energy',0)))+' Energia. '+text);
  getFunction('saveState')?.();getFunction('renderAll')?.();getFunction('playTechniqueEffect')?.(technique);
  getFunction('showModal')?.(technique.name,total+' Combattimento',text);
}
function executeVariableTechnique(technique,result,label){
  const before=Math.max(0,num(read('energy',0))),boss=!!getFunction('isBossRushFree')?.();
  const resolved=resolveVariableCost(result,before,boss);if(!boss)write('energy',before-resolved.paid);
  const base=num(getFunction('effectiveBaseBody')?.()??current()?.baseBody),extra=num(read('combatBonus',0));
  const total=base+resolved.body+extra;
  const text=label+' '+result+'. Costo richiesto '+result+', Energia pagata '+resolved.paid+'. Corpo applicato '+resolved.body+(resolved.missing?' perché mancavano '+resolved.missing+' Energia':'')+'. Totale: '+base+' + '+resolved.body+' + '+extra+' = '+total+'.';
  completeTechnique(technique,before,resolved,total,text);
}
function patchUseTechnique(){
  const original=getFunction('useTechnique');if(!original||original.__v391)return;
  const wrapped=function(key){
    applyBlueprints();
    const technique=current()?.techniques?.find(item=>item.key===key);
    if(!technique)return original.apply(this,arguments);
    if(used().includes(key))return;
    const allowed=getFunction('roomActionAllowed');if(allowed&&!allowed())return;
    if(technique.dynamicCost){
      const raw=root.prompt('Inserisci il risultato del d24 (1-24):');if(raw===null)return;
      const roll=Number(raw);if(!Number.isInteger(roll)||roll<1||roll>24)return getFunction('showModal')?.('Valore non valido','','Inserisci un numero intero da 1 a 24.');
      return executeVariableTechnique(technique,roll,'Risultato d24');
    }
    if(currentId()==='itadori'&&technique.itadoriBlackFlash){
      const raw=root.prompt('Inserisci i risultati d6 separati da virgola. Ogni risultato deve essere maggiore o uguale al precedente:');if(raw===null)return;
      const analysis=analyzeBlackFlashRolls(raw.split(/[^0-9]+/).filter(Boolean));
      if(!analysis.ok)return getFunction('showModal')?.('Black Flash non valido','',analysis.error==='order'?'Ogni risultato deve essere maggiore o uguale al precedente.':'Inserisci almeno un dado con valori da 1 a 6.');
      return executeVariableTechnique(technique,analysis.sum,'Somma dadi '+analysis.rolls.join(' + ')+' =');
    }
    return original.apply(this,arguments);
  };
  wrapped.__v391=true;wrapped.__v39=true;wrapped.__v37=true;wrapped.__original=original;
  setFunction('useTechnique',wrapped);
}
function patchOpenCharacter(){
  const original=getFunction('openCharacter');if(!original||original.__v391)return;
  const wrapped=function(id){applyBlueprints();const result=original.apply(this,arguments);applyBlueprints();setTimeout(()=>{applyBlueprints();getFunction('renderAll')?.();},0);return result;};
  wrapped.__v391=true;wrapped.__original=original;setFunction('openCharacter',wrapped);
}
function audit(){
  const bp=blueprints(),roster=characters();
  const checks={version:VERSION,variableCost:resolveVariableCost(16,14).body===14,blackFlash:analyzeBlackFlashRolls([1,2,2,6]).sum===11,itadoriLife:roster.itadori?.maxLife===4+itadoriBonuses(read('itadoriMaxFingers',0)).life,itadoriBody:roster.itadori?.baseBody===4,jogoEnergy:roster.jogo?.grades?.map(g=>g.max).join(',')===bp.jogo.grades.map(g=>g.max).join(','),patched:!!getFunction('useTechnique')?.__v391};
  checks.ok=Object.entries(checks).filter(([key])=>!['version','ok'].includes(key)).every(([,value])=>value===true);
  root.JJKV391Audit=checks;console.info('JJK Energy V39.1 audit',checks);return checks;
}
function install(){
  const bind=()=>{applyBlueprints();patchUseTechnique();patchOpenCharacter();};
  bind();setTimeout(bind,100);setTimeout(()=>{bind();getFunction('renderAll')?.();audit();},600);setTimeout(()=>{bind();audit();},1600);
  setInterval(()=>{applyBlueprints();patchUseTechnique();},1500);
}
root.JJKV391={version:VERSION,resolveVariableCost,analyzeBlackFlashRolls,itadoriBonuses,blueprints,audit,install};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(typeof window!=='undefined'?window:globalThis);
