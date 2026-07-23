/* JJK Energy · roster 3D e tecniche casuali */
(function(){
'use strict';
const reduced=matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const mobile=matchMedia?.('(max-width:760px)')?.matches;
const DATA={
 gojo:{a:'#65d6ff',b:'#a954ff',moves:[['Bagliore Blu','orb'],['Bagliore Rosso','orb'],['Bagliore Viola','orb domain'],['Infinito','domain']]},
 sukuna:{a:'#ff405b',b:'#ff9b3d',moves:[['Taglio','slash'],['World Slash','slash domain'],['Freccia Infuocata','flame'],['Reliquiario Maledetto','domain']]},
 itadori:{a:'#ff6688',b:'#d91645',moves:[['Pugno Divergente','impact'],['Black Flash','impact domain'],['Freccia Infuocata','flame'],['Santuario Benevolo','domain']]},
 megumi:{a:'#38d9ff',b:'#143e75',moves:[['Cani Divini','shadow'],['Nue','shadow impact'],['Mahoraga','shadow domain'],['Giardino delle Ombre','domain shadow']]},
 geto:{a:'#4be497',b:'#7c54ff',moves:[['Sciame di Maledizioni','orb'],['Drago Arcobaleno','shadow'],['Uzumaki','orb domain'],['Tamamo-no-Mae','domain']]},
 mahito:{a:'#b762ff',b:'#ff5ba8',moves:[['Distorsione Corporea','orb'],['Trasfigurazione Inerte','impact'],['Trasfigurazione Perfetta','impact domain'],['Autoreincarnazione','domain']]},
 jogo:{a:'#ff7a32',b:'#ffd35a',moves:[['Insetti Ardenti','flame'],['Vulcani','flame impact'],['Meteora Infuocata','flame domain'],['Bara della Montagna di Ferro','domain flame']]},
 toji:{a:'#9e68ff',b:'#d5e0ff',moves:[['Velocità Sovrumana','slash'],['Lancia Celeste Invertita','slash impact'],['Potenza Sovrumana','impact'],['Frenesia Omicida','slash domain']]},
 yuta:{a:'#6597ff',b:'#c5d9ff',moves:[['Katana Maledetta','slash'],['Manifestazione di Rika','shadow orb'],['Copia','orb'],['Mondo di Katane','slash domain']]}
};
const ids=Object.keys(DATA),timers=new WeakMap(),last=new Map();
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
function detect(el){const text=((el?.dataset?.r3dCharacter||el?.dataset?.v34Character||el?.dataset?.v34Roster||el?.getAttribute?.('onclick')||'')+' '+(q('img',el)?.src||'')).toLowerCase();return ids.find(id=>text.includes(id))||null;}
function apply(el,id){if(!el||!DATA[id])return;el.dataset.r3dCharacter=id;el.style.setProperty('--r3d-a',DATA[id].a);el.style.setProperty('--r3d-b',DATA[id].b);}
function layer(el){let x=q(':scope>.r3d-fx',el);if(!x){x=document.createElement('div');x.className='r3d-fx';x.setAttribute('aria-hidden','true');el.appendChild(x);}return x;}
function move(id){const pool=DATA[id].moves;let m=pool[Math.floor(Math.random()*pool.length)];if(pool.length>1&&last.get(id)===m[0])m=pool[(pool.indexOf(m)+1)%pool.length];last.set(id,m[0]);return m;}
function fxMarkup(types,name){let h='<i class="r3d-core"></i><i class="r3d-ring"></i>';if(types.includes('slash'))h+='<i class="r3d-slash"></i><i class="r3d-slash b"></i>';if(types.includes('orb'))h+='<i class="r3d-orb"></i>';if(types.includes('flame'))h+='<i class="r3d-flame"></i>';if(types.includes('shadow'))h+='<i class="r3d-shadow"></i>';if(types.includes('impact'))h+='<i class="r3d-impact"></i>';if(types.includes('domain'))h+='<i class="r3d-domain"></i>';for(let i=0;i<(mobile?6:12);i++){h+='<i class="r3d-particle" style="--x:'+(8+Math.random()*84)+'%;--y:'+(10+Math.random()*80)+'%;--dx:'+(Math.random()*180-90)+'px;--dy:'+(Math.random()*180-120)+'px;--d:'+(Math.random()*.2)+'s"></i>';}return h+'<span class="r3d-label"><b>'+name+'</b><small>Tecnica casuale del personaggio</small></span>';}
function play(el){if(reduced||!el?.isConnected)return;const id=detect(el);if(!id)return;apply(el,id);const m=move(id),l=layer(el);l.innerHTML=fxMarkup(m[1],m[0]);el.classList.remove('r3d-playing');void el.offsetWidth;el.classList.add('r3d-playing');clearTimeout(l._t);l._t=setTimeout(()=>{el.classList.remove('r3d-playing');l.innerHTML='';},1800);}
function schedule(el,first){clearTimeout(timers.get(el));if(reduced)return;timers.set(el,setTimeout(()=>{play(el);schedule(el,false);},first?900+Math.random()*1500:6500+Math.random()*6500));}
function tilt(el){if(!el||el.dataset.r3dTilt||mobile||reduced)return;el.dataset.r3dTilt='1';el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.setProperty('--ry',(x*8)+'deg');el.style.setProperty('--rx',(-y*6)+'deg');});el.addEventListener('pointerleave',()=>{el.style.setProperty('--ry','0deg');el.style.setProperty('--rx','0deg');});}
function stage(el,id){if(!el)return;id=id||detect(el);if(!id)return;apply(el,id);el.classList.add('r3d-stage');layer(el);tilt(el);if(!timers.has(el))schedule(el,true);}
function card(el){const id=detect(el);if(!id)return;apply(el,id);el.classList.add('r3d-card');tilt(el);if(!el.dataset.r3dHover){el.dataset.r3dHover='1';el.addEventListener('pointerenter',()=>play(el));el.addEventListener('focusin',()=>play(el));}}
function safe(fn,fallback){try{return fn();}catch(_){return fallback;}}
function refresh(){stage(document.getElementById('characterInfoStage'),safe(()=>uiInfoCharacterId,'gojo'));stage(document.getElementById('roomDraftStage'),safe(()=>roomDraftCharacterId,'gojo'));stage(q('#player .hero'),safe(()=>currentId,null));stage(document.getElementById('v34HomeFighter'),detect(document.getElementById('v34HomeFighter'))||'gojo');stage(q('#v34HomeCinema .v34-home-fighter.right'),'sukuna');qa('[data-v34-roster],.info-character-card,.room-draft-card,.character-card').forEach(card);}
function install(){document.documentElement.classList.add('r3d-enabled');refresh();new MutationObserver(()=>requestAnimationFrame(refresh)).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','data-v34-character']});}
window.JJKRoster3D={refresh,playCharacter(id){const el=document.getElementById('characterInfoStage')||document.getElementById('v34HomeFighter');if(el&&DATA[id]){apply(el,id);play(el);}},data:DATA};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
