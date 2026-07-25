/* JJK Energy V36.5 - rebind tardivo dei selettori grafici */
(function(){
'use strict';
const VERSION='36.5.0';
function read(name,fallback=null){try{const value=eval(name);return value===undefined?fallback:value;}catch(_){return window[name]===undefined?fallback:window[name];}}
const currentId=()=>read('currentId',null);
const current=()=>read('current',null);
const currentLife=()=>Math.max(0,Number(read('life',0))||0);
function copiedSource(){try{return window.getYutaCopiedSource?.()||null;}catch(_){return null;}}
function finalReworkReady(){try{return !!read('characters',{})?.geto?.techniques?.some(t=>t.v27GetoRainbow);}catch(_){return false;}}
function meta(t,kicker,description){return {title:t?.name||'Tecnica',image:t?.image||'',kicker,description};}
function selector(id,t,isCopy){
 if(!t)return null;
 const kicker=isCopy?'COPIA · SELEZIONE GUIDATA':'SELEZIONE GUIDATA';
 if(t.v27GetoRainbow)return {kind:'choice',meta:meta(t,kicker,'Scegli la modalità del Drago Arcobaleno.'),options:[{value:'A',title:'Modalità A · +9 Corpo',text:'Attacco standard del Drago Arcobaleno.',badge:'14 Energia'},{value:'B',title:'Modalità B · +13 Corpo',text:'Versione potenziata con Segnalini Maledetti.',badge:'14 Energia + 8 Segnalini'}]};
 if(t.v27SukunaReroll)return {kind:'choice',meta:meta(t,kicker,'Scegli quale dado rilanciare.'),options:[{value:'6',title:'Rilancia 1d6',text:'Ripeti un tiro a sei facce.',badge:'5 Energia'},{value:'20',title:'Rilancia 1d20',text:'Ripeti un tiro a venti facce.',badge:'10 Energia'}]};
 if(t.v27GetoTamamo)return {kind:'number',meta:meta(t,kicker,'Quanti Segni Maledetti sono presenti sulla mappa?'),config:{min:0,max:99,value:0,quick:[0,2,5,10,15,20]}};
 if(t.v27JogoHanami)return {kind:'dice',meta:meta(t,kicker,'Seleziona il risultato del d6 per il salvataggio di Hanami.'),config:{sides:6,minCount:1,maxCount:1,exactCount:1}};
 if(t.v27ItadoriChoso)return {kind:'number',meta:meta(t,kicker,'Scegli quanta Vita pagare. Lo stesso valore diventa Corpo monouso.'),config:{min:1,max:Math.max(1,currentLife()),value:1,quick:[1,2,3,4,5,currentLife()]}};
 if(t.v27ItadoriBlackFlash||t.itadoriBlackFlash)return {kind:'dice',meta:meta(t,kicker,'Aggiungi i risultati in ordine. Ogni dado deve essere maggiore o uguale al precedente.'),config:{sides:6,minCount:1,maxCount:12,ascending:true}};
 if(t.v27ItadoriSlash||t.dynamicCost)return {kind:'dice',meta:meta(t,kicker,'Seleziona il risultato del d24.'),config:{sides:24,minCount:1,maxCount:1,exactCount:1}};
 if(id==='sukuna'&&t.key==='solitudine')return {kind:'dice',meta:meta(t,kicker,'Seleziona i quattro risultati del d6. Verrà usato il più alto.'),config:{sides:6,minCount:4,maxCount:4,exactCount:4}};
 if(id==='mahito'&&t.key==='perfetta')return {kind:'dice',meta:meta(t,kicker,'Seleziona prima i due dadi del personaggio e poi il dado dell’avversario.'),config:{sides:6,minCount:3,maxCount:3,exactCount:3}};
 if(id==='yuta'&&t.yutaDomain)return {kind:'dice',meta:meta(t,kicker,'Seleziona i cinque risultati del Dominio di Yuta.'),config:{sides:6,minCount:5,maxCount:5,exactCount:5}};
 if(isCopy&&t.v27JogoDomain)return {kind:'number',meta:meta(t,kicker,'Quanti Vulcani sono presenti sulla mappa?'),config:{min:0,max:99,value:0,quick:[0,1,2,3,5,10]}};
 return null;
}
async function collect(spec){const ui=window.JJKV364;if(!ui||!spec)return null;if(spec.kind==='choice')return ui.choose(spec.meta,spec.options);if(spec.kind==='number')return ui.chooseNumber(spec.meta,spec.config);if(spec.kind==='dice')return ui.chooseDice(spec.meta,spec.config);return null;}
function runWithPrompt(original,context,args,value){const previous=window.prompt;window.prompt=()=>String(value);try{return original.apply(context,args);}finally{window.prompt=previous;}}
function bindUseTechnique(){
 const original=window.useTechnique;
 if(typeof original!=='function'||original.__v365Pretty)return;
 const wrapped=function(key){
   const t=current()?.techniques?.find(x=>x.key===key),spec=selector(currentId(),t,false);
   if(!spec)return original.apply(this,arguments);
   const context=this,args=arguments;
   collect(spec).then(value=>{if(value!==null)runWithPrompt(original,context,args,value);});
 };
 wrapped.__v365Pretty=true;wrapped.__v365Original=original;window.useTechnique=wrapped;
}
function bindCopiedTechnique(){
 const original=window.executeYutaCopiedTechnique;
 if(typeof original!=='function'||original.__v365Pretty)return;
 const wrapped=function(card){
   const src=copiedSource();
   if(!src||src.t?.v27GetoRainbow)return original.apply(this,arguments);
   const spec=selector(src.characterId,src.t,true);
   if(!spec)return original.apply(this,arguments);
   const context=this,args=arguments;
   collect(spec).then(value=>{if(value!==null)runWithPrompt(original,context,args,value);});
 };
 wrapped.__v365Pretty=true;wrapped.__v365Original=original;window.executeYutaCopiedTechnique=wrapped;
}
function bind(){if(!window.JJKV364||!finalReworkReady())return;bindUseTechnique();bindCopiedTechnique();window.JJKV365={version:VERSION,rebind:bind};}
setTimeout(bind,0);setTimeout(bind,400);setTimeout(bind,1000);setInterval(bind,1200);
console.info('JJK Energy V36.5 late selector binder loaded');
})();
