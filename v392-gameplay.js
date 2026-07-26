/* JJK Energy V39.2 - authoritative gameplay rules and stable technique dispatch */
(function(root,factory){
  const api=factory(root||globalThis);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
'use strict';
const VERSION='39.2.0';
const RANK={G4:0,G3:1,G2:2,G1:3,SS:4,SG:5};
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,num(v)));
const monsterKey='jjk_itadori_v37_monster_fingers';
const immortalKey='jjk_itadori_v37_immortality_used';
const tojiCombatKey='jjk_toji_force_converted_v392';
function read(name,fallback=null){try{const v=(0,eval)(name);return v===undefined?fallback:v;}catch(_){return root[name]===undefined?fallback:root[name];}}
function write(name,value){root.__v392value=value;try{(0,eval)(name+'=globalThis.__v392value');}catch(_){try{root[name]=value;}catch(__){}}delete root.__v392value;}
function getfn(name){const v=read(name,root[name]);return typeof v==='function'?v:null;}
function setfn(name,value){root[name]=value;root.__v392fn=value;try{(0,eval)(name+'=globalThis.__v392fn');}catch(_){}delete root.__v392fn;}
function storageGet(key,fallback='0'){try{const v=localStorage.getItem(key);return v===null?fallback:v;}catch(_){return fallback;}}
function storageSet(key,value){try{localStorage.setItem(key,String(value));}catch(_){}}
function chars(){return read('characters',root.characters||{});}
function cid(){return read('currentId',null);}
function current(){return read('current',null);}
function grade(){return read('gradeId','G4');}
function used(){const v=read('used',[]);return Array.isArray(v)?v:[];}
function roomAllowed(){const f=getfn('roomActionAllowed');try{return f?!!f():true;}catch(_){return true;}}
function bossFree(){const f=getfn('isBossRushFree');try{return f?!!f():false;}catch(_){return false;}}
function show(title,value,text){getfn('showModal')?.(title,value,text);}
function log(title,text){getfn('addLog')?.(title,text);}
function saveRender(){getfn('saveState')?.();getfn('renderAll')?.();decorate();}
function play(t){getfn('playTechniqueEffect')?.(t);}
function bonuses(fingers){
  const f=clamp(fingers,0,20),out={body:0,life:0,energy:0};
  if(f>=4)out.body++;
  if(f>=8){out.body++;out.life++;}
  if(f>=12){out.body++;out.life++;out.energy+=2;}
  if(f>=16){out.body++;out.life++;out.energy+=2;}
  if(f>=20){out.body++;out.life++;out.energy+=2;}
  return out;
}
function resolveVariableCost(roll,energy,free=false){const r=Math.max(0,Math.trunc(num(roll))),e=Math.max(0,num(energy)),paid=free?0:Math.min(r,e);return{roll:r,paid,body:free?r:paid,missing:free?0:Math.max(0,r-paid)};}
function analyzeBlackFlash(values){
  const rolls=(Array.isArray(values)?values:[]).map(Number);
  if(!rolls.length)return{ok:false,error:'empty',rolls:[],sum:0};
  if(rolls.some(v=>!Number.isInteger(v)||v<1||v>6))return{ok:false,error:'range',rolls,sum:0};
  for(let i=1;i<rolls.length;i++)if(rolls[i]<rolls[i-1])return{ok:false,error:'order',rolls,sum:0,index:i};
  return{ok:true,error:null,rolls,sum:rolls.reduce((a,b)=>a+b,0)};
}
function blueprints(){
  const ids=['G4','G3','G2','G1','SS','SG'],labels=['Grado 4','Grado 3','Grado 2','Grado 1','Semi Special Grade','Special Grade'];
  const grades=rows=>rows.map((x,i)=>({id:ids[i],label:labels[i],exp:x[0],max:x[1]}));
  return{
    jogo:{name:'Jogo',maxLife:8,baseBody:5,coins:0,isJogo:true,lifeEnergyLinked:false,innateName:'Natura Vulcanica',innateEffect:'Può muoversi liberamente fino a 4 caselle. Non può usare il Fato.',grades:grades([[0,10],[7,12],[16,15],[26,18],[35,20],[45,23]]),techniques:[
      {key:'insetti',name:'Insetti Ardenti',grade:'G4',cost:5,bonus:4,image:'assets/jogo_g4.png'},
      {key:'vulcani',name:'Vulcani',grade:'G3',cost:8,bonus:6,image:'assets/jogo_sheet.png',v392JogoVolcano:true,v27CostLabel:'Costo: 8 Energia · +6 Corpo',extra:'Crea 1 Vulcano, fino a un massimo di 3. PVE: nemici −2 Corpo. PVP: Jogo guadagna Energia quando altri raccolgono EM sulla sua casella Vulcano.'},
      {key:'salvataggio_hanami',name:'Salvataggio di Emergenza Hanami',grade:'G2',cost:10,bonus:null,image:'assets/jogo_g2.png',v392JogoHanami:true,effect:'Perdi automaticamente lo scontro e tira 1d6. Con 3-6 Hanami ti salva e ripristina tutta l’Energia; con 1-2 fallisce.'},
      {key:'meteora2',name:'Meteora Infuocata',grade:'G1',cost:12,bonus:9,image:'assets/jogo_g1.png',v392JogoMeteor:true,extra:'Quando la usi ottieni automaticamente +1 Calore, massimo 8. Il nuovo valore Calore si aggiunge soltanto a questa tecnica.'},
      {key:'bara_ferro',name:'Bara della Montagna di Ferro',grade:'SS',cost:18,bonus:15,image:'assets/jogo_sheet.png',v392JogoDomain:true,extra:'Crea automaticamente 1 Cratere. Aggiunge +1 Corpo per ogni Vulcano posseduto, massimo +3.'},
      {key:'placche_tettoniche',name:'Manipolazione Placche Tettoniche',grade:'SG',cost:0,bonus:null,image:'assets/jogo_sheet.png',v392JogoTectonic:true,effect:'Muovi ogni Vulcano fino a 4 caselle. Una volta per turno puoi consumarne uno per creare un Cratere.'}
    ]},
    itadori:{name:'Yuji Itadori',baseMaxLife:4,maxLife:4,baseBody:4,coins:1,hasFingers:true,innateName:'Richiamo del Ricettacolo Perfetto',innateEffect:'Guadagna 1 Dito per ogni mostro abbattuto, fino a 12. Uccidere Sukuna concede 5 Dita. Quando è adiacente a un giocatore con un Dito viene attirato nella sua casella e ruba immediatamente 1 Dito. Nel mazzo sono presenti 10 Dita.',grades:grades([[0,10],[9,12],[19,15],[30,18],[42,20],[50,21]]),techniques:[
      {key:'pugno_divergente',name:'Pugno Divergente',grade:'G4',cost:4,bonus:4,image:'assets/itadori_g4.webp'},
      {key:'black_flash_itadori',name:'Black Flash',grade:'G3',cost:0,bonus:null,image:'assets/itadori_g1.webp',v392BlackFlash:true,itadoriBlackFlash:true,v27CostLabel:'Costo: somma dei dadi validi',effect:'Continua a lanciare dadi finché ogni risultato è maggiore o uguale al precedente. Se l’Energia non basta, perdi 1 Corpo per ogni punto mancante.'},
      {key:'manipolazione_sangue',name:'Manipolazione del Sangue',grade:'G2',cost:0,bonus:null,image:'assets/itadori_g3.webp',v392Blood:true,v27CostLabel:'1 Vita → 10 Energia',effect:'Una volta per turno, in qualsiasi momento, converti 1 Vita in 10 Energia Maledetta.'},
      {key:'freccia_itadori',name:'Freccia Infuocata',grade:'G1',cost:10,bonus:10,lifeCost:1,image:'assets/itadori_freccia.webp',extra:'Costo aggiuntivo: perdi 1 Vita.'},
      {key:'richiamo_anima_sukuna',name:'Richiamo dell’Anima di Sukuna',grade:'SS',cost:0,bonus:null,image:'assets/itadori_ss.webp',v392Soul:true,v27CostLabel:'Costo: d24 · Corpo: d24 limitato dall’EM + 2d6',effect:'Lancia il dado Taglio di Sukuna e 2 dadi normali. Il d24 determina costo e Corpo; se l’Energia non basta, il Corpo del d24 si abbassa.'},
      {key:'immortalita',name:'Immortalità',grade:'SG',cost:0,bonus:null,image:'assets/itadori_taglio.webp',v392Immortal:true,effect:'Una volta per partita, quando stai per morire recuperi immediatamente tutta la Vita e tutta l’Energia.'}
    ]}
  };
}
function applyBlueprints(){
  const all=chars(),bp=blueprints();
  for(const id of ['jogo','itadori'])if(all[id]){const image=all[id].image;Object.assign(all[id],bp[id]);if(image)all[id].image=image;}
  if(all.itadori)all.itadori.maxLife=4+bonuses(read('itadoriMaxFingers',0)).life;
  if(all.toji){const t=all.toji.techniques?.find(x=>x.key==='forza');if(t)t.effect='L’Energia Maledetta raccolta non ha limite. In ogni combattimento puoi convertire al massimo 20 Energia in 2 Gettoni Forza; ogni 10 Energia vale +2 Corpo.';}
  if(cid()==='jogo')write('current',all.jogo);
  if(cid()==='itadori')write('current',all.itadori);
}
function baseBody(){return cid()==='itadori'?4+bonuses(read('itadoriMaxFingers',0)).body:num(getfn('effectiveBaseBody')?.()??current()?.baseBody);}
function gradeObject(){return current()?.grades?.find(g=>g.id===grade())||current()?.grades?.[0]||{max:0};}
function maxEnergy(){const g=gradeObject();return num(g.max)+(cid()==='itadori'?bonuses(read('itadoriMaxFingers',0)).energy:0);}
function mark(t,cost){const list=used();if(!list.includes(t.key))list.push(t.key);write('used',list);getfn('recordTechniqueUse')?.(cid(),t,cost);}
function pay(cost,label){const before=Math.max(0,num(read('energy',0))),free=bossFree();if(!free&&before<cost){show('Energia insufficiente','',label+' richiede '+cost+' Energia Maledetta. Ne possiedi '+before+'.');return null;}if(!free)write('energy',before-cost);return{before,paid:free?0:cost,free};}
function finish(t,payment,total,text){mark(t,payment?.paid||0);log('Tecnica utilizzata',t.name+': '+payment.before+' → '+num(read('energy',0))+' Energia. '+text);saveRender();play(t);show(t.name,total+' Combattimento',text);}
function fixed(t,bodyBonus,lifeCost=0){
  const payment=pay(num(t.cost),t.name);if(!payment)return;
  if(lifeCost&&!payment.free){const beforeLife=num(read('life',0));if(beforeLife<=lifeCost){write('energy',payment.before);show('Vita insufficiente','','Serve più di '+lifeCost+' Vita per usare '+t.name+'.');return;}write('life',beforeLife-lifeCost);}
  const total=baseBody()+bodyBonus+num(read('combatBonus',0));
  finish(t,payment,total,'Corpo base '+baseBody()+' + tecnica '+bodyBonus+' + bonus '+num(read('combatBonus',0))+' = '+total+(lifeCost?' · Costo Vita: '+lifeCost:'')+'.');
}
function jogoVolcanoes(){return clamp(read('jogoVolcanoes',0),0,3);}
function jogoCraters(){return Math.max(0,num(read('jogoCraters',0)));}
function useJogo(t){
  if(t.key==='insetti')return fixed(t,4);
  if(t.v392JogoVolcano){const p=pay(8,t.name);if(!p)return;const before=jogoVolcanoes(),after=Math.min(3,before+1);write('jogoVolcanoes',after);const total=baseBody()+6+num(read('combatBonus',0));return finish(t,p,total,'Corpo base '+baseBody()+' + Vulcani 6 + bonus '+num(read('combatBonus',0))+' = '+total+'. Vulcani '+before+' → '+after+'/3'+(before>=3?' (limite già raggiunto)':'')+'.');}
  if(t.v392JogoHanami){const p=pay(10,t.name);if(!p)return;const raw=root.prompt('Risultato d6 per Hanami (1-6):');if(raw===null){if(!p.free)write('energy',p.before);return;}const roll=Number(raw);if(!Number.isInteger(roll)||roll<1||roll>6){if(!p.free)write('energy',p.before);return show('Dado non valido','','Inserisci un valore da 1 a 6.');}mark(t,p.paid);let text,value;if(roll>=3){write('energy',maxEnergy());value='Hanami ti salva';text='Risultato '+roll+': perdi lo scontro, ma Hanami ti salva e ripristina tutta l’Energia. L’avversario conserva il costo speso e non prende Vita, oggetti o seguaci.';}else{value='Hanami fallisce';text='Risultato '+roll+': perdi lo scontro e l’Energia resta consumata.';}log('Tecnica utilizzata',t.name+': '+text);saveRender();play(t);return show(t.name,value,text);}
  if(t.v392JogoMeteor){const p=pay(12,t.name);if(!p)return;const oldHeat=clamp(read('jogoHeat',0),0,8),newHeat=Math.min(8,oldHeat+1);write('jogoHeat',newHeat);const total=baseBody()+9+newHeat+num(read('combatBonus',0));return finish(t,p,total,'Corpo base '+baseBody()+' + Meteora 9 + nuovo Calore '+newHeat+' + bonus '+num(read('combatBonus',0))+' = '+total+'. Calore '+oldHeat+' → '+newHeat+'/8. Il Calore si applica solo a Meteora Infuocata.');}
  if(t.v392JogoDomain){const p=pay(18,t.name);if(!p)return;const volcanoBonus=Math.min(3,jogoVolcanoes()),before=jogoCraters(),after=before+1;write('jogoCraters',after);const total=baseBody()+15+volcanoBonus+num(read('combatBonus',0));return finish(t,p,total,'Corpo base '+baseBody()+' + Dominio 15 + Vulcani '+volcanoBonus+' + bonus '+num(read('combatBonus',0))+' = '+total+'. Cratere creato automaticamente: '+before+' → '+after+'.');}
  if(t.v392JogoTectonic)return show(t.name,'Passiva SG','Usa il pannello Vulcani: ogni Vulcano può muoversi fino a 4 caselle e una volta per turno puoi consumarne uno per creare un Cratere.');
}
function useBlackFlash(t){
  const raw=root.prompt('Inserisci i risultati dei d6 separati da virgola. Ogni risultato deve essere maggiore o uguale al precedente:');if(raw===null)return;
  const a=analyzeBlackFlash(raw.split(/[^0-9]+/).filter(Boolean));if(!a.ok)return show('Black Flash non valido','',a.error==='order'?'Ogni risultato deve essere maggiore o uguale al precedente.':'Usa valori da 1 a 6.');
  const before=Math.max(0,num(read('energy',0))),resolved=resolveVariableCost(a.sum,before,bossFree());if(!bossFree())write('energy',before-resolved.paid);
  const total=baseBody()+resolved.body+num(read('combatBonus',0)),p={before,paid:resolved.paid};
  finish(t,p,total,'Dadi '+a.rolls.join(' + ')+' = '+a.sum+'. Costo '+a.sum+', pagato '+resolved.paid+'. Corpo dei dadi '+resolved.body+(resolved.missing?' (−'+resolved.missing+' per Energia mancante)':'')+'. Totale '+baseBody()+' + '+resolved.body+' + '+num(read('combatBonus',0))+' = '+total+'.');
}
function useBlood(t){
  if(used().includes(t.key))return show('Già utilizzata','','Manipolazione del Sangue si usa una volta per turno.');
  const beforeLife=num(read('life',0)),beforeEnergy=num(read('energy',0));if(!bossFree()&&beforeLife<=1)return show('Vita insufficiente','','Serve almeno 2 Vita.');
  if(!bossFree())write('life',beforeLife-1);write('energy',beforeEnergy+10);mark(t,0);log('Manipolazione del Sangue','Vita '+beforeLife+' → '+num(read('life',0))+', Energia '+beforeEnergy+' → '+num(read('energy',0))+'.');saveRender();play(t);show(t.name,'+10 Energia',bossFree()?'Boss Rush: costo Vita annullato.':'Hai convertito 1 Vita in 10 Energia Maledetta.');
}
function useSoul(t){
  const raw=root.prompt('Inserisci d24,d6,d6 (esempio 14,5,3):');if(raw===null)return;const vals=raw.split(/[^0-9]+/).filter(Boolean).map(Number);
  if(vals.length!==3||!Number.isInteger(vals[0])||vals[0]<1||vals[0]>24||vals.slice(1).some(v=>!Number.isInteger(v)||v<1||v>6))return show('Dadi non validi','','Inserisci un d24 da 1 a 24 e due d6 da 1 a 6.');
  const before=Math.max(0,num(read('energy',0))),resolved=resolveVariableCost(vals[0],before,bossFree());if(!bossFree())write('energy',before-resolved.paid);const normal=vals[1]+vals[2],total=baseBody()+resolved.body+normal+num(read('combatBonus',0));
  finish(t,{before,paid:resolved.paid},total,'d24 '+vals[0]+': costo pagato '+resolved.paid+', Corpo applicato '+resolved.body+(resolved.missing?' (−'+resolved.missing+' per Energia mancante)':'')+'. 2d6: '+vals[1]+' + '+vals[2]+' = '+normal+'. Totale '+baseBody()+' + '+resolved.body+' + '+normal+' + '+num(read('combatBonus',0))+' = '+total+'.');
}
function useItadori(t){
  if(t.key==='pugno_divergente')return fixed(t,4);
  if(t.v392BlackFlash)return useBlackFlash(t);
  if(t.v392Blood)return useBlood(t);
  if(t.key==='freccia_itadori')return fixed(t,10,1);
  if(t.v392Soul)return useSoul(t);
  if(t.v392Immortal)return show(t.name,storageGet(immortalKey,'0')==='1'?'Già consumata':'Passiva pronta','Si attiva automaticamente una volta per partita quando Itadori sta per morire.');
}
function tojiConverted(){return clamp(storageGet(tojiCombatKey,'0'),0,20);}
function setTojiConverted(v){storageSet(tojiCombatKey,clamp(v,0,20));}
function chooseTojiConversion(){
  const pool=Math.max(0,num(read('tojiCollectedEnergy',0))),remaining=20-tojiConverted(),max=Math.min(remaining,Math.floor(pool/10)*10);if(max<10)return 0;
  const raw=root.prompt('Energia raccolta: '+pool+'. Puoi convertire ancora '+remaining+' in questo combattimento. Inserisci 0, 10'+(max>=20?' o 20':'')+':','0');if(raw===null)return 0;const value=Number(raw);if(![0,10,20].includes(value)||value>max){show('Conversione non valida','','Puoi convertire 0, 10'+(max>=20?' o 20':'')+' Energia.');return null;}return value;
}
function useToji(t){
  if(t.key==='forza')return show(t.name,'Passiva','L’Energia raccolta è illimitata. Puoi convertirne massimo 20 per combattimento: ogni 10 Energia vale +2 Corpo.');
  if(t.key==='mostro')return show(t.name,'Passiva','Ottieni +2 Corpo permanente e +2 Vita massima.');
  const cost=num(t.cost),beforeVigor=Math.max(0,num(read('energy',0)));if(!bossFree()&&beforeVigor<cost)return show('Vigore insufficiente','','Servono '+cost+' punti Vigore.');
  const combat=(typeof t.bonus==='number')||t.key==='lancia';let conversion=0;if(combat&&!bossFree()){conversion=chooseTojiConversion();if(conversion===null)return;}
  if(!bossFree())write('energy',beforeVigor-cost);if(conversion){write('tojiCollectedEnergy',Math.max(0,num(read('tojiCollectedEnergy',0))-conversion));setTojiConverted(tojiConverted()+conversion);}
  const forceBonus=(conversion/10)*2,techBonus=typeof t.bonus==='number'?t.bonus:0,total=baseBody()+techBonus+forceBonus+num(read('combatBonus',0));
  mark(t,bossFree()?0:cost);let text='Corpo base '+baseBody()+' + tecnica '+techBonus+' + Forza Pura '+forceBonus+' + bonus '+num(read('combatBonus',0))+' = '+total+'.';if(conversion)text+=' Convertiti '+conversion+' EM; pool residuo '+num(read('tojiCollectedEnergy',0))+'. Conversione combattimento '+tojiConverted()+'/20.';if(t.key==='lancia')text+=' Annulla l’Infinito o spezza il Dominio avversario.';log('Tecnica utilizzata',t.name+': '+text);saveRender();play(t);show(t.name,total+' Combattimento',text);
}
let legacyUseTechnique=null;
function dispatch(key,args){
  applyBlueprints();if(!roomAllowed())return;const t=current()?.techniques?.find(x=>x.key===key);if(!t)return legacyUseTechnique?.apply(root,args||[key]);if(used().includes(key)&&!t.v392Immortal)return;
  if(cid()==='jogo')return useJogo(t);
  if(cid()==='itadori')return useItadori(t);
  if(cid()==='toji')return useToji(t);
  return legacyUseTechnique?.apply(root,args||[key]);
}
function patchTechniqueFunction(){
  const active=getfn('useTechnique');if(active&&active.__v392)return;
  if(active)legacyUseTechnique=active;
  const wrapped=function(key){return dispatch(key,arguments);};wrapped.__v392=true;wrapped.__v391=true;wrapped.__v39=true;wrapped.__v37=true;setfn('useTechnique',wrapped);
}
function patchCoreFunctions(){
  const eff=getfn('effectiveBaseBody');if(eff&&!eff.__v392){const old=eff;const f=function(){if(cid()==='itadori')return 4+bonuses(read('itadoriMaxFingers',0)).body;return old.apply(this,arguments);};f.__v392=true;setfn('effectiveBaseBody',f);}
  const maxfn=getfn('resourceMaxForGrade');if(maxfn&&!maxfn.__v392){const old=maxfn;const f=function(g){if(cid()==='itadori')return num(g?.max)+bonuses(read('itadoriMaxFingers',0)).energy;return old.apply(this,arguments);};f.__v392=true;setfn('resourceMaxForGrade',f);}
  const changeToji=getfn('changeTojiCollectedEnergy');if(changeToji&&!changeToji.__v392){const f=function(delta){if(cid()!=='toji')return;const before=Math.max(0,num(read('tojiCollectedEnergy',0))),after=Math.max(0,before+num(delta));write('tojiCollectedEnergy',after);log('Energia raccolta da Toji',before+' → '+after+' · nessun limite.');saveRender();};f.__v392=true;setfn('changeTojiCollectedEnergy',f);}
  const newCombat=getfn('newCombat');if(newCombat&&!newCombat.__v392){const old=newCombat;const f=function(){setTojiConverted(0);const out=old.apply(this,arguments);setTimeout(decorate,0);return out;};f.__v392=true;setfn('newCombat',f);}
  const open=getfn('openCharacter');if(open&&!open.__v392){const old=open;const f=function(id){applyBlueprints();const out=old.apply(this,arguments);applyBlueprints();if(id==='toji')setTojiConverted(0);setTimeout(()=>{applyBlueprints();getfn('renderAll')?.();decorate();},0);return out;};f.__v392=true;setfn('openCharacter',f);}
  const render=getfn('renderTechniques');if(render&&!render.__v392){const old=render;const f=function(){const out=old.apply(this,arguments);decorateTechniqueCards();return out;};f.__v392=true;setfn('renderTechniques',f);}
}
function monsterCount(){return clamp(storageGet(monsterKey,'0'),0,12);}
function awardFingers(amount,source,monster=false){
  if(cid()!=='itadori'||!roomAllowed())return;if(monster&&monsterCount()>=12)return show('Limite mostri raggiunto','12 / 12','Hai già ottenuto 12 Dita tramite mostri.');
  const before=clamp(read('itadoriFingers',0),0,20),oldMax=clamp(read('itadoriMaxFingers',0),0,20),after=clamp(before+amount,0,20),newMax=Math.max(oldMax,after),oldB=bonuses(oldMax),newB=bonuses(newMax);
  write('itadoriFingers',after);write('itadoriMaxFingers',newMax);if(monster)storageSet(monsterKey,monsterCount()+1);applyBlueprints();if(newB.life>oldB.life)write('life',num(read('life',0))+newB.life-oldB.life);if(newB.energy>oldB.energy)write('energy',num(read('energy',0))+newB.energy-oldB.energy);log(source,before+' → '+after+' Dita · massimo '+newMax+'/20.');saveRender();const reached=[4,8,12,16,20].filter(v=>oldMax<v&&newMax>=v);if(reached.length)show('Progressione Dita',newMax+' / 20','Bonus permanenti totali: +'+newB.body+' Corpo, +'+newB.life+' Vita, +'+newB.energy+' EM.');
}
function correctFinger(){if(cid()!=='itadori'||!roomAllowed())return;const before=clamp(read('itadoriFingers',0),0,20);if(before<1)return;write('itadoriFingers',before-1);log('Correzione Dita',before+' → '+(before-1)+'. Il massimo storico e i bonus permanenti non cambiano.');saveRender();}
function ensureStyle(){if(document.getElementById('v392Style'))return;const s=document.createElement('style');s.id='v392Style';s.textContent=`
#v392ItadoriPanel,#v392JogoPanel{margin-top:12px;padding:14px;border:1px solid #ffffff20;border-radius:18px;background:linear-gradient(145deg,#17101f,#09070d);box-shadow:0 14px 32px #0005}.v392-title{font-weight:950;letter-spacing:.04em}.v392-sub{margin-top:5px;color:#b9aebe;font-size:.72rem;line-height:1.4}.v392-resource-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.v392-resource{padding:10px;border-radius:13px;border:1px solid #ffffff18;background:#0d0a12;text-align:center}.v392-resource small,.v392-resource b{display:block}.v392-resource small{color:#ae9eb5;font-size:.65rem}.v392-resource b{margin-top:4px;font-size:1.05rem}.v392-milestones{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px}.v392-milestones span{padding:8px 3px;border:1px solid #4a354f;border-radius:10px;text-align:center;font-size:.64rem;background:#100c14}.v392-milestones span.on{border-color:#ff6a4f;background:#4b1b19;color:#ffe0d7;box-shadow:0 0 14px #ff5d4133}.v392-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.v392-actions button{min-height:48px;border-radius:13px;border:1px solid #8f4960;background:linear-gradient(145deg,#7b2139,#2b101b);color:#fff;font-weight:900;cursor:pointer}.v392-actions button:nth-child(2){border-color:#b06738;background:linear-gradient(145deg,#8a421c,#32170d)}.v392-actions button:nth-child(3){border-color:#8350ad;background:linear-gradient(145deg,#5f2689,#21102f)}.v392-actions button:nth-child(4){border-color:#5d6878;background:linear-gradient(145deg,#303b4b,#121821)}#v392JogoPanel{border-color:#d86a344d;background:radial-gradient(circle at top right,#c64c2228,transparent 42%),linear-gradient(145deg,#1b100d,#090707)}#v392JogoPanel .v392-resource b{color:#ff9b55}.v392-lock{opacity:.45;filter:grayscale(.8)}.v392-tech-note{display:block;margin-top:4px;color:#ffbd83;font-weight:800;font-size:.63rem}.toji-energy-actions{grid-template-columns:repeat(4,1fr)!important}.toji-energy-actions .v392-toji-plus10{display:block}@media(max-width:600px){.v392-actions{grid-template-columns:1fr}.v392-milestones{grid-template-columns:repeat(5,minmax(48px,1fr));overflow:auto}}
`;document.head.appendChild(s);}
function ensureItadoriPanel(){
  const host=document.getElementById('itadoriFingerPanel');if(!host)return null;host.querySelectorAll(':scope > *').forEach(el=>{if(el.id!=='v392ItadoriPanel')el.style.display='none';});let box=document.getElementById('v392ItadoriPanel');if(!box){box=document.createElement('section');box.id='v392ItadoriPanel';box.innerHTML='<div class="v392-title">Dita di Sukuna · Ricettacolo Perfetto</div><div class="v392-sub">Le Dita attuali possono cambiare; il massimo raggiunto conserva per sempre i bonus.</div><div class="v392-resource-row"><div class="v392-resource"><small>Dita attuali</small><b data-v392-fingers>0 / 20</b></div><div class="v392-resource"><small>Ottenute dai mostri</small><b data-v392-monsters>0 / 12</b></div></div><div class="v392-milestones">'+[4,8,12,16,20].map(v=>'<span data-v392-milestone="'+v+'">'+v+' Dita</span>').join('')+'</div><div class="v392-sub" data-v392-bonus></div><div class="v392-actions"><button data-v392-monster>Mostro abbattuto<br><small>+1 Dito</small></button><button data-v392-sukuna>Sukuna sconfitto<br><small>+5 Dita</small></button><button data-v392-stolen>Dito rubato<br><small>+1 Dito</small></button><button data-v392-correct>Correggi conteggio<br><small>−1 Dito attuale</small></button></div>';host.appendChild(box);}return box;
}
function ensureJogoPanel(){
  const host=document.getElementById('jogoPanel');if(!host)return null;const old=document.getElementById('v37JogoPanel');if(old)old.style.display='none';const heat=document.getElementById('jogoHeatSection');if(heat)heat.style.display='none';let box=document.getElementById('v392JogoPanel');if(!box){box=document.createElement('section');box.id='v392JogoPanel';box.innerHTML='<div class="v392-title">Nucleo Vulcanico</div><div class="v392-resource-row"><div class="v392-resource" data-v392-volcano-box><small>Vulcani · sblocco G3</small><b data-v392-volcanoes>0 / 3</b></div><div class="v392-resource" data-v392-heat-box><small>Calore · sblocco G1</small><b data-v392-heat>0 / 8</b></div></div><div class="v392-resource-row"><div class="v392-resource"><small>Crateri</small><b data-v392-craters>0</b></div><div class="v392-resource"><small>Bonus Dominio</small><b data-v392-domain>+0 / +3</b></div></div><div class="v392-sub">Il Calore aumenta solo usando Meteora Infuocata e si somma soltanto a quella tecnica. Il Dominio crea automaticamente un Cratere.</div>';host.appendChild(box);}return box;
}
function updatePanels(){
  ensureStyle();const ib=ensureItadoriPanel();if(ib){const active=cid()==='itadori';ib.style.display=active?'block':'none';if(active){const f=clamp(read('itadoriFingers',0),0,20),m=clamp(read('itadoriMaxFingers',0),0,20),b=bonuses(m);ib.querySelector('[data-v392-fingers]').textContent=f+' / 20 · massimo '+m;ib.querySelector('[data-v392-monsters]').textContent=monsterCount()+' / 12';ib.querySelector('[data-v392-bonus]').textContent='Bonus permanenti: +'+b.body+' Corpo · +'+b.life+' Vita · +'+b.energy+' EM';ib.querySelectorAll('[data-v392-milestone]').forEach(x=>x.classList.toggle('on',m>=Number(x.dataset.v392Milestone)));}}
  const jb=ensureJogoPanel();if(jb){const active=cid()==='jogo';jb.style.display=active?'block':'none';if(active){const v=jogoVolcanoes(),h=clamp(read('jogoHeat',0),0,8);jb.querySelector('[data-v392-volcanoes]').textContent=v+' / 3';jb.querySelector('[data-v392-heat]').textContent=h+' / 8';jb.querySelector('[data-v392-craters]').textContent=String(jogoCraters());jb.querySelector('[data-v392-domain]').textContent='+'+Math.min(3,v)+' / +3';jb.querySelector('[data-v392-volcano-box]').classList.toggle('v392-lock',(RANK[grade()]??0)<RANK.G3);jb.querySelector('[data-v392-heat-box]').classList.toggle('v392-lock',(RANK[grade()]??0)<RANK.G1);}}
  const tojiPanel=document.getElementById('tojiEnergyPanel');if(tojiPanel&&cid()==='toji'){const value=document.getElementById('tojiCollectedEnergyValue'),token=document.getElementById('tojiForceTokenValue'),note=tojiPanel.querySelector('.one-use-note'),actions=tojiPanel.querySelector('.toji-energy-actions');if(value)value.textContent=String(Math.max(0,num(read('tojiCollectedEnergy',0))));if(token)token.textContent=Math.min(2,Math.floor(Math.max(0,num(read('tojiCollectedEnergy',0)))/10))+'/2 disponibili';if(note)note.textContent='Raccolta senza limite. In questo combattimento hai convertito '+tojiConverted()+'/20 EM. Ogni 10 EM convertita vale +2 Corpo.';if(actions&&!actions.querySelector('.v392-toji-plus10')){const b=document.createElement('button');b.className='one-use-btn v392-toji-plus10';b.textContent='+10';b.onclick=()=>getfn('changeTojiCollectedEnergy')?.(10);actions.appendChild(b);}}}
function decorateTechniqueCards(){
  const grid=document.getElementById('techGrid');if(!grid||!current())return;const available=(current().techniques||[]).filter(t=>{const f=getfn('techniqueIsAvailable');return f?f(t):(RANK[t.grade]??0)<=(RANK[grade()]??0);});[...grid.querySelectorAll('.tech-card')].forEach((card,i)=>{const t=available[i],cost=card.querySelector('.tech-cost');if(!t||!cost)return;card.dataset.techKey=t.key;if(cid()==='jogo'&&t.key==='vulcani')cost.innerHTML='Costo: 8 EM · +6 Corpo<span class="v392-tech-note">Vulcani '+jogoVolcanoes()+'/3</span>';if(cid()==='jogo'&&t.key==='meteora2'){const next=Math.min(8,clamp(read('jogoHeat',0),0,8)+1);cost.innerHTML='Costo: 12 EM · +9 Corpo<span class="v392-tech-note">Prossimo Calore: +'+next+' · solo questa tecnica</span>';}if(cid()==='jogo'&&t.key==='bara_ferro')cost.innerHTML='Costo: 18 EM · +15 Corpo<span class="v392-tech-note">Bonus Vulcani +'+Math.min(3,jogoVolcanoes())+' · crea 1 Cratere</span>';if(cid()==='itadori'&&t.key==='black_flash_itadori')cost.innerHTML='Costo: somma dei dadi validi<span class="v392-tech-note">Sequenza non decrescente</span>';if(cid()==='itadori'&&t.key==='richiamo_anima_sukuna')cost.innerHTML='Costo: risultato d24<span class="v392-tech-note">Corpo: d24 limitato dall’EM + 2d6</span>';});
}
function decorate(){applyBlueprints();updatePanels();decorateTechniqueCards();}
function installEvents(){if(document.documentElement.dataset.v392Events==='1')return;document.documentElement.dataset.v392Events='1';document.addEventListener('click',e=>{const use=e.target.closest('.use-btn');if(use){const card=use.closest('.tech-card'),key=card?.dataset.techKey;if(key){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();dispatch(key,[key]);return;}}if(e.target.closest('[data-v392-monster]')){awardFingers(1,'Mostro abbattuto',true);return;}if(e.target.closest('[data-v392-sukuna]')){awardFingers(5,'Sukuna sconfitto');return;}if(e.target.closest('[data-v392-stolen]')){awardFingers(1,'Dito rubato');return;}if(e.target.closest('[data-v392-correct]')){correctFinger();return;}},true);}
function patchRoomState(){
  const build=getfn('buildLocalPlayerState');if(build&&!build.__v392){const old=build;const f=function(){const s=old.apply(this,arguments);if(!s)return s;if(s.characterId==='jogo'){s.jogoVolcanoes=jogoVolcanoes();s.jogoCraters=jogoCraters();s.jogoHeat=clamp(read('jogoHeat',0),0,8);}if(s.characterId==='itadori'){s.maxLife=4+bonuses(read('itadoriMaxFingers',0)).life;s.itadoriMonsterFingers=monsterCount();}if(s.characterId==='toji'){s.tojiCollectedEnergy=Math.max(0,num(read('tojiCollectedEnergy',0)));s.tojiForceConvertedThisCombat=tojiConverted();}return s;};f.__v392=true;setfn('buildLocalPlayerState',f);}
  const init=getfn('createInitialRoomPlayerState');if(init&&!init.__v392){const old=init;const f=function(id){const s=old.apply(this,arguments)||{};if(id==='jogo')Object.assign(s,{life:8,maxLife:8,energy:10,jogoHeat:0,jogoVolcanoes:0,jogoCraters:0});if(id==='itadori')Object.assign(s,{life:4,maxLife:4,energy:10,itadoriFingers:0,itadoriMaxFingers:0,itadoriMonsterFingers:0,itadoriImmortalityUsed:false});if(id==='toji')Object.assign(s,{tojiCollectedEnergy:0,tojiForceConvertedThisCombat:0});return s;};f.__v392=true;setfn('createInitialRoomPlayerState',f);}
  const sanitize=getfn('sanitizeRoomState');if(sanitize&&!sanitize.__v392){const old=sanitize;const f=function(state,id){const s=old.apply(this,arguments)||{},raw=state||{};if(id==='jogo'){s.jogoVolcanoes=clamp(raw.jogoVolcanoes,0,3);s.jogoCraters=Math.max(0,num(raw.jogoCraters));s.jogoHeat=clamp(raw.jogoHeat,0,8);}if(id==='itadori'){s.maxLife=4+bonuses(raw.itadoriMaxFingers).life;s.itadoriMonsterFingers=clamp(raw.itadoriMonsterFingers,0,12);}if(id==='toji'){s.tojiCollectedEnergy=Math.max(0,num(raw.tojiCollectedEnergy));s.tojiForceConvertedThisCombat=clamp(raw.tojiForceConvertedThisCombat,0,20);}return s;};f.__v392=true;setfn('sanitizeRoomState',f);}
}
function bind(){applyBlueprints();patchTechniqueFunction();patchCoreFunctions();patchRoomState();installEvents();decorate();}
function audit(){const bp=blueprints(),checks={version:VERSION,jogoHeatOnlyMeteor:bp.jogo.techniques.filter(t=>t.v392JogoMeteor).length===1,volcanoCap:jogoVolcanoes()<=3,domainCrater:!!bp.jogo.techniques.find(t=>t.v392JogoDomain),itadoriStats:bp.itadori.maxLife===4&&bp.itadori.baseBody===4&&bp.itadori.grades.at(-1).max===21,blackFlash:analyzeBlackFlash([1,2,2,6]).sum===11,tojiUnlimited:true,patched:!!getfn('useTechnique')?.__v392};checks.ok=Object.entries(checks).filter(([k])=>!['version','ok'].includes(k)).every(([,v])=>v===true);root.JJKV392Audit=checks;console.info('JJK V39.2 audit',checks);return checks;}
function install(){if(root.__JJK_V392_INSTALLED__)return;root.__JJK_V392_INSTALLED__=true;const start=()=>{bind();setTimeout(bind,100);setTimeout(()=>{bind();getfn('renderAll')?.();decorate();audit();},500);setTimeout(bind,1500);setInterval(()=>{patchTechniqueFunction();applyBlueprints();updatePanels();},900);const observer=new MutationObserver(()=>{clearTimeout(observer._t);observer._t=setTimeout(decorate,30);});observer.observe(document.documentElement,{childList:true,subtree:true});};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();}
return{version:VERSION,bonuses,resolveVariableCost,analyzeBlackFlash,blueprints,install};
});
