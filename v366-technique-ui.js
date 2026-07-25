/* JJK Energy V36.6 - selettore diretto post-rework, senza prompt nativi */
(function(){
'use strict';
if(window.__JJK_V366_STARTED__)return;
window.__JJK_V366_STARTED__=true;
const VERSION='36.6.0';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function read(name,fallback=null){try{const value=(0,eval)(name);return value===undefined?fallback:value;}catch(_){return window[name]===undefined?fallback:window[name];}}
const currentId=()=>read('currentId',null);
const current=()=>read('current',null);
const currentLife=()=>Math.max(0,Number(read('life',0))||0);
function copiedSource(){try{return window.getYutaCopiedSource?.()||read('getYutaCopiedSource',null)?.()||null;}catch(_){return null;}}
function techniqueFromButton(button){
 const card=button.closest('.tech-card');
 const ch=current();
 if(!card||!ch)return null;
 const label=(card.querySelector('.tech-name')?.textContent||'').trim();
 if(currentId()==='yuta'&&label.startsWith('Copia:')){
   const src=copiedSource();
   return src?{technique:src.t,sourceId:src.characterId,key:'copia',isCopy:true}:null;
 }
 const technique=(ch.techniques||[]).find(t=>t.name===label);
 return technique?{technique,sourceId:currentId(),key:technique.key,isCopy:false}:null;
}
function specification(info){
 const t=info?.technique,id=info?.sourceId;
 if(!t)return null;
 const base={title:t.name,image:t.image||'',kicker:info.isCopy?'COPIA · SCELTA GUIDATA':'SCELTA GUIDATA'};
 if(t.v27GetoRainbow)return {type:'choice',meta:{...base,description:'Scegli la modalità del Drago Arcobaleno.'},options:[{value:'A',title:'Modalità A · +9 Corpo',text:'Attacco standard del Drago Arcobaleno.',badge:'14 Energia'},{value:'B',title:'Modalità B · +13 Corpo',text:'Versione potenziata.',badge:'14 Energia + 8 Segnalini'}]};
 if(t.v27SukunaReroll)return {type:'choice',meta:{...base,description:'Scegli quale dado rilanciare.'},options:[{value:'6',title:'Rilancia 1d6',text:'Ripeti il tiro a sei facce.',badge:'5 Energia'},{value:'20',title:'Rilancia 1d20',text:'Ripeti il tiro a venti facce.',badge:'10 Energia'}]};
 if(t.v27GetoTamamo)return {type:'number',meta:{...base,description:'Quanti Segni Maledetti sono presenti sulla mappa?'},min:0,max:99,value:0,quick:[0,2,5,10,15,20]};
 if(t.v27JogoHanami)return {type:'dice',meta:{...base,description:'Seleziona il risultato del d6 per il salvataggio di Hanami.'},sides:6,minCount:1,maxCount:1,exactCount:1};
 if(t.v27ItadoriChoso)return {type:'number',meta:{...base,description:'Scegli quanta Vita pagare. Lo stesso valore diventa Corpo monouso.'},min:1,max:Math.max(1,currentLife()),value:1,quick:[1,2,3,4,5,currentLife()]};
 if(t.v27ItadoriBlackFlash||t.itadoriBlackFlash)return {type:'dice',meta:{...base,description:'Aggiungi i risultati in ordine crescente o uguale.'},sides:6,minCount:1,maxCount:12,ascending:true};
 if(t.v27ItadoriSlash||t.dynamicCost)return {type:'dice',meta:{...base,description:'Seleziona il risultato del d24.'},sides:24,minCount:1,maxCount:1,exactCount:1};
 if(id==='sukuna'&&t.key==='solitudine')return {type:'dice',meta:{...base,description:'Seleziona i quattro risultati del d6.'},sides:6,minCount:4,maxCount:4,exactCount:4};
 if(id==='mahito'&&t.key==='perfetta')return {type:'dice',meta:{...base,description:'Seleziona i due dadi del personaggio e poi quello dell’avversario.'},sides:6,minCount:3,maxCount:3,exactCount:3};
 if(id==='yuta'&&t.yutaDomain)return {type:'dice',meta:{...base,description:'Seleziona i cinque risultati del Dominio di Yuta.'},sides:6,minCount:5,maxCount:5,exactCount:5};
 if(info.isCopy&&t.v27JogoDomain)return {type:'number',meta:{...base,description:'Quanti Vulcani sono presenti sulla mappa?'},min:0,max:99,value:0,quick:[0,1,2,3,5,10]};
 return null;
}
function ensureUi(){
 let root=document.getElementById('v366TechniqueUi');
 if(root)return root;
 const style=document.createElement('style');
 style.id='v366TechniqueUiStyle';
 style.textContent=`
 #v366TechniqueUi{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(2,3,9,.9);backdrop-filter:blur(12px)}#v366TechniqueUi.show{display:flex}
 .v366-box{width:min(720px,100%);max-height:92vh;overflow:auto;border:1px solid #66c7ff;border-radius:26px;background:radial-gradient(circle at 15% 0,rgba(50,139,255,.3),transparent 38%),linear-gradient(155deg,#152a4b,#090e19 64%,#080710);box-shadow:0 30px 90px #000b,0 0 45px rgba(48,161,255,.25);color:#fff}
 .v366-head{display:grid;grid-template-columns:88px 1fr auto;gap:14px;align-items:center;padding:19px;border-bottom:1px solid #ffffff1a}.v366-head img{width:88px;height:110px;object-fit:cover;border-radius:15px;border:1px solid #75cbff;background:#05070d}.v366-kicker{font-size:.7rem;font-weight:950;letter-spacing:.14em;color:#83d5ff}.v366-title{margin:5px 0;font-size:clamp(1.3rem,4vw,2rem)}.v366-desc{margin:0;color:#cbdbea;line-height:1.4}.v366-x{align-self:start;width:42px;height:42px;border-radius:13px;border:1px solid #ff6d83;background:#71182b;color:#fff;font-weight:950;cursor:pointer}
 .v366-body{padding:20px}.v366-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:13px}.v366-option{min-height:120px;padding:18px;border-radius:18px;border:1px solid #62c4ff88;background:linear-gradient(145deg,#194e83,#0d1b32);color:#fff;text-align:left;cursor:pointer}.v366-option:nth-child(even){border-color:#d47aff88;background:linear-gradient(145deg,#642a78,#251434)}.v366-option:hover{transform:translateY(-2px);box-shadow:0 0 26px #45baff55}.v366-option strong,.v366-option span,.v366-option b{display:block}.v366-option strong{font-size:1.12rem}.v366-option span{margin-top:7px;color:#d8e7f4}.v366-option b{width:max-content;margin-top:11px;padding:5px 9px;border-radius:999px;background:#ffffff18;font-size:.78rem}
 .v366-number{display:grid;grid-template-columns:58px minmax(120px,1fr) 58px;gap:10px;max-width:430px;margin:auto}.v366-step{height:60px;border-radius:16px;border:1px solid #61c7ff;background:#173f70;color:#fff;font-size:1.55rem;font-weight:950;cursor:pointer}.v366-input{height:76px;border-radius:18px;border:1px solid #79d5ff;background:#07111f;color:#fff;text-align:center;font-size:2rem;font-weight:950}.v366-quick,.v366-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:9px;margin-top:15px}.v366-quick button,.v366-die{min-width:52px;padding:12px;border-radius:13px;border:1px solid #6ccaff77;background:#102d50;color:#fff;font-weight:950;cursor:pointer}.v366-dice{display:grid;grid-template-columns:repeat(auto-fit,minmax(52px,1fr));gap:8px}.v366-die:disabled{opacity:.25;cursor:not-allowed}.v366-picked{min-height:62px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:15px 0;padding:12px;border:1px solid #ffffff1a;border-radius:15px;background:#04081299}.v366-chip{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:linear-gradient(145deg,#3495ed,#173f73);font-weight:950}.v366-empty{color:#9db0c3}.v366-cancel,.v366-confirm{min-height:52px;padding:0 20px;border-radius:15px;color:#fff;font-weight:950;cursor:pointer}.v366-cancel{border:1px solid #aa4357;background:#581624}.v366-confirm{border:1px solid #66caff;background:linear-gradient(135deg,#187bd5,#17477f)}.v366-confirm:disabled{opacity:.35}.v366-hint{text-align:center;color:#c1d3e3}
 @media(max-width:560px){#v366TechniqueUi{padding:7px}.v366-box{border-radius:19px}.v366-head{grid-template-columns:62px 1fr auto;padding:13px;gap:9px}.v366-head img{width:62px;height:80px}.v366-body{padding:14px}.v366-options{grid-template-columns:1fr}.v366-x{width:38px;height:38px}}
 `;
 document.head.appendChild(style);
 root=document.createElement('div');
 root.id='v366TechniqueUi';
 root.innerHTML='<section class="v366-box" role="dialog" aria-modal="true"><header class="v366-head"><img alt=""><div><div class="v366-kicker"></div><h2 class="v366-title"></h2><p class="v366-desc"></p></div><button class="v366-x" type="button">✕</button></header><div class="v366-body"></div></section>';
 document.body.appendChild(root);
 return root;
}
let cancelActive=null;
function openFrame(meta){
 const root=ensureUi();
 if(cancelActive)cancelActive();
 root.classList.add('show');
 document.body.style.overflow='hidden';
 const img=root.querySelector('img');img.src=meta.image||'';img.style.display=meta.image?'block':'none';
 root.querySelector('.v366-kicker').textContent=meta.kicker||'SCELTA GUIDATA';
 root.querySelector('.v366-title').textContent=meta.title||'Tecnica';
 root.querySelector('.v366-desc').textContent=meta.description||'';
 const body=root.querySelector('.v366-body');body.innerHTML='';
 return {root,body,close(){root.classList.remove('show');document.body.style.overflow='';cancelActive=null;}};
}
function bindCancel(frame,resolve){
 const cancel=()=>{frame.close();resolve(null);};cancelActive=cancel;
 frame.root.querySelector('.v366-x').onclick=cancel;
 frame.root.onclick=e=>{if(e.target===frame.root)cancel();};
}
function choose(spec){return new Promise(resolve=>{const frame=openFrame(spec.meta);frame.body.innerHTML='<div class="v366-options">'+spec.options.map(o=>'<button class="v366-option" type="button" data-value="'+esc(o.value)+'"><strong>'+esc(o.title)+'</strong><span>'+esc(o.text)+'</span><b>'+esc(o.badge)+'</b></button>').join('')+'</div>';bindCancel(frame,resolve);frame.body.querySelectorAll('[data-value]').forEach(btn=>btn.onclick=()=>{const value=btn.dataset.value;frame.close();resolve(value);});});}
function chooseNumber(spec){return new Promise(resolve=>{const frame=openFrame(spec.meta);let value=Math.max(spec.min,Math.min(spec.max,Number(spec.value)||spec.min));frame.body.innerHTML='<p class="v366-hint">Scegli il valore con i pulsanti.</p><div class="v366-number"><button class="v366-step" data-step="-1">−</button><input class="v366-input" type="number"><button class="v366-step" data-step="1">+</button></div><div class="v366-quick">'+[...new Set(spec.quick||[])].filter(v=>v>=spec.min&&v<=spec.max).map(v=>'<button type="button" data-quick="'+v+'">'+v+'</button>').join('')+'</div><div class="v366-actions"><button class="v366-cancel" type="button">Annulla</button><button class="v366-confirm" type="button"></button></div>';const input=frame.body.querySelector('.v366-input'),confirm=frame.body.querySelector('.v366-confirm');const update=v=>{value=Math.max(spec.min,Math.min(spec.max,Math.trunc(Number(v)||0)));input.value=value;confirm.textContent='Conferma '+value;};frame.body.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>update(value+Number(b.dataset.step)));frame.body.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>update(Number(b.dataset.quick)));input.oninput=()=>update(input.value);frame.body.querySelector('.v366-cancel').onclick=()=>{frame.close();resolve(null);};confirm.onclick=()=>{frame.close();resolve(String(value));};bindCancel(frame,resolve);update(value);});}
function chooseDice(spec){return new Promise(resolve=>{const frame=openFrame(spec.meta),picked=[];frame.body.innerHTML='<p class="v366-hint">Tocca i risultati nell’ordine in cui sono usciti.</p><div class="v366-dice">'+Array.from({length:spec.sides},(_,i)=>'<button class="v366-die" type="button" data-die="'+(i+1)+'">'+(i+1)+'</button>').join('')+'</div><div class="v366-picked"><span class="v366-empty">Nessun risultato selezionato</span></div><div class="v366-actions"><button class="v366-cancel" type="button">Annulla</button><button class="v366-confirm" type="button" disabled>Conferma</button></div><div class="v366-quick"><button type="button" data-remove>Rimuovi ultimo</button><button type="button" data-clear>Azzera</button></div>';const box=frame.body.querySelector('.v366-picked'),confirm=frame.body.querySelector('.v366-confirm'),dice=[...frame.body.querySelectorAll('[data-die]')];const refresh=()=>{box.innerHTML=picked.length?picked.map(v=>'<span class="v366-chip">'+v+'</span>').join(''):'<span class="v366-empty">Nessun risultato selezionato</span>';const valid=spec.exactCount!=null?picked.length===spec.exactCount:picked.length>=spec.minCount&&picked.length<=spec.maxCount;confirm.disabled=!valid;confirm.textContent=spec.exactCount!=null?'Conferma '+picked.length+' / '+spec.exactCount:'Conferma '+picked.length+' risultati';dice.forEach(btn=>{const v=Number(btn.dataset.die);btn.disabled=picked.length>=spec.maxCount||(spec.ascending&&picked.length&&v<picked[picked.length-1]);});};dice.forEach(btn=>btn.onclick=()=>{if(picked.length<spec.maxCount){picked.push(Number(btn.dataset.die));refresh();}});frame.body.querySelector('[data-remove]').onclick=()=>{picked.pop();refresh();};frame.body.querySelector('[data-clear]').onclick=()=>{picked.length=0;refresh();};frame.body.querySelector('.v366-cancel').onclick=()=>{frame.close();resolve(null);};confirm.onclick=()=>{const value=picked.join(',');frame.close();resolve(value);};bindCancel(frame,resolve);refresh();});}
function requestValue(spec){if(spec.type==='choice')return choose(spec);if(spec.type==='number')return chooseNumber(spec);return chooseDice(spec);}
function execute(info,value){
 const originalPrompt=window.prompt;
 window.prompt=()=>String(value);
 try{
   if(typeof window.useTechnique==='function')return window.useTechnique(info.key);
   const fn=read('useTechnique',null);if(typeof fn==='function')return fn(info.key);
 }finally{window.prompt=originalPrompt;}
}
let busy=false;
window.addEventListener('click',event=>{
 if(busy)return;
 const button=event.target.closest?.('#techGrid .use-btn');
 if(!button)return;
 const info=techniqueFromButton(button),spec=specification(info);
 if(!info||!spec)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 busy=true;
 requestValue(spec).then(value=>{if(value!==null)execute(info,value);}).finally(()=>{busy=false;});
},true);
window.JJKV366={version:VERSION,specification,selfTest(){const geto=read('characters',{})?.geto?.techniques?.find(t=>t.key==='drago');return {loaded:true,version:VERSION,getoRainbow:!!geto?.v27GetoRainbow,ui:!!ensureUi(),capture:true};}};
console.info('JJK Energy V36.6 direct technique UI ready',VERSION);
})();
