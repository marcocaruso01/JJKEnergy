/* JJK Energy V14 - Cinematic Edition
   Effetti visuali leggeri, transizioni, profondità e nuove animazioni tecniche. */
(function(){
'use strict';
const systemReduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const mobile=/Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)||window.innerWidth<720;
function motionAllowed(){return !systemReduced&&!document.documentElement.classList.contains('v34-no-motion');}

function esc(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function getCurrentId(){try{return currentId||'gojo';}catch(e){return window.currentId||'gojo';}}
function getMeta(id){try{return uiCharacterMeta(id);}catch(e){return window.JJK_UI_META?.[id]||{color:'#54bfff',role:'Combattente'};}}
function getTechniqueKey(t){return String(t?.key||'tecnica').toLowerCase().replace(/[^a-z0-9_]+/g,'_');}

function installAmbient(){
  if(!motionAllowed()||document.getElementById('v14AmbientField'))return;
  const field=document.createElement('div');field.id='v14AmbientField';field.setAttribute('aria-hidden','true');
  const colors=['#5ed8ff','#a76cff','#ff5f86','#ffd46a','#55efa6'];
  const count=mobile?8:15;
  for(let i=0;i<count;i++){
    const p=document.createElement('i');p.className='v14-ambient-orb';
    p.style.setProperty('--x',(4+Math.random()*92)+'%');p.style.setProperty('--y',(4+Math.random()*92)+'%');
    p.style.setProperty('--s',(18+Math.random()*(mobile?42:72))+'px');p.style.setProperty('--b',(3+Math.random()*9)+'px');
    p.style.setProperty('--c',colors[i%colors.length]);p.style.setProperty('--d',(5+Math.random()*7)+'s');p.style.setProperty('--delay',(-Math.random()*8)+'s');
    field.appendChild(p);
  }
  document.body.appendChild(field);
}

function installPointerAura(){
  if(mobile||systemReduced)return;
  document.addEventListener('pointermove',e=>{
    if(!motionAllowed())return;
    document.body.style.setProperty('--v14-mx',e.clientX+'px');
    document.body.style.setProperty('--v14-my',e.clientY+'px');
  },{passive:true});
}

function installRipples(){
  document.addEventListener('pointerdown',event=>{
    if(!motionAllowed())return;
    const target=event.target.closest('button,.home-action,.cloud-stats-tab,.info-character-card,.room-draft-card');
    if(!target||target.disabled)return;
    const rect=target.getBoundingClientRect(),r=document.createElement('span');r.className='v14-ripple';
    r.style.left=(event.clientX-rect.left)+'px';r.style.top=(event.clientY-rect.top)+'px';target.appendChild(r);setTimeout(()=>r.remove(),620);
  },true);
}

function installPageTransitions(){
  let base=null;
  try{base=showScreen;}catch(e){base=window.showScreen;}
  if(typeof base!=='function'||base.__v14Wrapped)return;
  const wrapped=function(id){
    const out=base.apply(this,arguments);
    requestAnimationFrame(()=>{
      const screen=document.getElementById(id);if(!screen||!motionAllowed())return;
      screen.classList.remove('v14-screen-enter');void screen.offsetWidth;screen.classList.add('v14-screen-enter');
      setTimeout(()=>screen.classList.remove('v14-screen-enter'),430);
    });
    return out;
  };
  wrapped.__v14Wrapped=true;
  try{showScreen=wrapped;}catch(e){window.showScreen=wrapped;}
}

function tiltTargets(){return document.querySelectorAll('.home-action,.cloud-kpi,.cloud-chart-card,.gm-summary-card,.gm-ai-summary-card');}
function installTilt(){
  if(mobile||systemReduced)return;
  const bind=el=>{
    if(el.dataset.v14Tilt==='1')return;el.dataset.v14Tilt='1';el.classList.add('v14-tilt-card');
    el.addEventListener('pointermove',e=>{
      if(!motionAllowed()){el.classList.remove('v14-tilting');el.style.transform='';return;}
      const rect=el.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width-.5,y=(e.clientY-rect.top)/rect.height-.5;
      el.classList.add('v14-tilting');el.style.transform='perspective(760px) rotateX('+(-y*4.2)+'deg) rotateY('+(x*5.2)+'deg) translateY(-2px)';
    },{passive:true});
    el.addEventListener('pointerleave',()=>{el.classList.remove('v14-tilting');el.style.transform='';},{passive:true});
  };
  tiltTargets().forEach(bind);
  const obs=new MutationObserver(()=>tiltTargets().forEach(bind));obs.observe(document.body,{subtree:true,childList:true});
}

function installValuePop(){
  const animate=el=>{if(!motionAllowed())return;el.classList.remove('v14-value-pop');void el.offsetWidth;el.classList.add('v14-value-pop');setTimeout(()=>el.classList.remove('v14-value-pop'),470);};
  const obs=new MutationObserver(records=>{
    records.forEach(r=>{const el=r.target.nodeType===3?r.target.parentElement:r.target;if(el?.matches?.('.cloud-kpi-value,.gm-summary-value,.cloud-personal-kpi b,.cloud-character-stat b'))animate(el);});
  });
  obs.observe(document.body,{subtree:true,childList:true,characterData:true});
}

function add(parent,cls,style){const el=document.createElement('i');el.className=cls;if(style)el.setAttribute('style',style);parent.appendChild(el);return el;}
function particle(parent,color,count){
  for(let i=0;i<count;i++){
    const p=add(parent,'v14-fx-particle');
    p.style.setProperty('--fx',color);p.style.setProperty('--s',(3+Math.random()*7)+'px');p.style.setProperty('--d',(0.72+Math.random()*.42)+'s');
    p.style.setProperty('--delay',(Math.random()*.16)+'s');p.style.setProperty('--dx',(Math.random()*520-260)+'px');p.style.setProperty('--dy',(Math.random()*420-210)+'px');
  }
}
function commonFx(layer,id,t){
  const meta=getMeta(id),color=meta.color||'#54bfff',key=getTechniqueKey(t),name=t?.name||'Tecnica';
  layer.style.setProperty('--fx',color);layer.style.setProperty('--fx2',id==='gojo'?'#a64cff':color);
  layer.className='show v14-cinematic-fx v14-char-'+id+' v14-tech-'+key;
  layer.innerHTML='<div class="v14-fx-vignette"></div><div class="v14-fx-scan"></div><div class="v14-fx-title"><small>'+esc(meta.role||id)+'</small><b>'+esc(name)+'</b></div>';
  return {color,key,name};
}
function gojoFx(layer,t,ctx){
  if(ctx.key==='viola'){
    add(layer,'v14-gojo-orb blue');add(layer,'v14-gojo-orb red');add(layer,'v14-gojo-purple');
    for(let i=0;i<3;i++)add(layer,'v14-space-ring','--delay:'+(i*.08)+'s');
  }else if(ctx.key==='rosso'){
    add(layer,'v14-gojo-orb red single');for(let i=0;i<3;i++)add(layer,'v14-space-ring','--delay:'+(i*.08)+'s');
  }else if(ctx.key==='blu'){
    add(layer,'v14-gojo-orb blue single');for(let i=0;i<2;i++)add(layer,'v14-space-ring','--delay:'+(i*.1)+'s');
  }else{
    for(let i=0;i<5;i++)add(layer,'v14-space-ring','--delay:'+(i*.07)+'s');
    add(layer,'v14-gojo-orb blue single');
  }
}
function sukunaFx(layer,t,ctx){
  const n=ctx.key==='worldslash'?7:4;for(let i=0;i<n;i++)add(layer,'v14-slash','--r:'+(i%2?(-48+i*11):(31-i*9))+'deg;--delay:'+(i*.045)+'s');
  if(/reliquario|worldslash|freccia/.test(ctx.key))add(layer,'v14-shrine');
}
function megumiFx(layer){
  const n=mobile?4:8;for(let i=0;i<n;i++)add(layer,'v14-shadow-pillar','--x:'+(8+i*(84/(n-1)))+'%;--skew:'+(i%2?'-11deg':'10deg')+';--delay:'+(i*.035)+'s');
  add(layer,'v14-wolf-eyes');
}
function getoFx(layer){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 900 500');svg.setAttribute('class','v14-dragon-svg');
  const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','M20 330 C120 70 245 470 350 205 S545 55 590 275 S770 435 875 105');path.setAttribute('class','v14-dragon-path');
  const aura=document.createElementNS(svg.namespaceURI,'path');aura.setAttribute('d','M20 330 C120 70 245 470 350 205 S545 55 590 275 S770 435 875 105');aura.setAttribute('class','v14-dragon-aura');
  svg.append(path,aura);layer.appendChild(svg);
}
function mahitoFx(layer){for(let i=0;i<4;i++)add(layer,'v14-soul-blob','--r:'+(-42+i*29)+'deg;--delay:'+(i*.055)+'s');}
function jogoFx(layer){add(layer,'v14-volcano');const n=mobile?10:20;for(let i=0;i<n;i++)add(layer,'v14-ember','--x:'+(20+Math.random()*60)+'%;--y:'+(48+Math.random()*32)+'%;--dx:'+(Math.random()*120-60)+'px;--delay:'+(Math.random()*.18)+'s');}
function tojiFx(layer){const n=mobile?7:12;for(let i=0;i<n;i++)add(layer,'v14-crack','--r:'+(i*(360/n)-180)+'deg;--delay:'+(i*.018)+'s');for(let i=0;i<(mobile?8:15);i++)add(layer,'v14-dust','--s:'+(5+Math.random()*14)+'px;--dx:'+(Math.random()*400-200)+'px;--dy:'+(Math.random()*220-100)+'px;--delay:'+(Math.random()*.14)+'s');}
function itadoriFx(layer){add(layer,'v14-impact-core');const n=mobile?5:9;for(let i=0;i<n;i++)add(layer,'v14-lightning','--r:'+(i*(360/n)-180)+'deg;--delay:'+(i*.025)+'s');}
function yutaFx(layer,t,ctx){add(layer,'v14-rika');const n=/katana|copia/.test(ctx.key)?5:3;for(let i=0;i<n;i++)add(layer,'v14-slash','--r:'+(-28+i*12)+'deg;--delay:'+(i*.045)+'s');}

function isStrong(id,key,name){return /viola|vuoto|worldslash|reliquario|uzumaki|frenesia|black_flash|risveglio|dominio|mahoraga|meteora2|autoreincarnazione/.test(key+' '+String(name).toLowerCase());}
function installCinematicTechniqueFx(){
  let layer=document.getElementById('v14CinematicFx');if(!layer){layer=document.createElement('div');layer.id='v14CinematicFx';layer.setAttribute('aria-hidden','true');document.body.appendChild(layer);}
  const cinematic=function(t){
    if(!motionAllowed())return;
    const id=getCurrentId(),ctx=commonFx(layer,id,t),strong=isStrong(id,ctx.key,ctx.name);
    if(id==='gojo')gojoFx(layer,t,ctx);
    else if(id==='sukuna')sukunaFx(layer,t,ctx);
    else if(id==='megumi')megumiFx(layer,t,ctx);
    else if(id==='geto')getoFx(layer,t,ctx);
    else if(id==='mahito')mahitoFx(layer,t,ctx);
    else if(id==='jogo')jogoFx(layer,t,ctx);
    else if(id==='toji')tojiFx(layer,t,ctx);
    else if(id==='itadori')itadoriFx(layer,t,ctx);
    else if(id==='yuta')yutaFx(layer,t,ctx);
    particle(layer,ctx.color,mobile?6:12);
    if(strong&&!mobile){document.body.classList.remove('v14-screen-shake');void document.body.offsetWidth;document.body.classList.add('v14-screen-shake');setTimeout(()=>document.body.classList.remove('v14-screen-shake'),380);}
    if(strong&&navigator.vibrate&&mobile){try{navigator.vibrate([18,24,22]);}catch(e){}}
    clearTimeout(cinematic._timer);cinematic._timer=setTimeout(()=>{layer.className='';layer.innerHTML='';},strong?1480:1250);
  };
  try{playTechniqueEffect=cinematic;}catch(e){window.playTechniqueEffect=cinematic;}
}

function init(){installAmbient();installPointerAura();installRipples();installPageTransitions();installTilt();installValuePop();installCinematicTechniqueFx();document.body.classList.add('v14-cinematic-ready');}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
