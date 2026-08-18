/* JJK 2.0 - opt-in Battle Lab preview. Activated only with ?jjk2battle=1 */
(function(root){
'use strict';
if(root.JJK2BattleSimulator)return;

const VERSION='2.0.0-alpha.1';
const ENABLED=new URLSearchParams(root.location.search).get('jjk2battle')==='1';
let mounted=false;
let selectedA='gojo';
let selectedB='sukuna';
let gradeA='G4';
let gradeB='G4';

function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function clamp(value,min,max){const n=Number(value);return Math.max(min,Math.min(max,Number.isFinite(n)?n:min));}
function pct(current,max){return max>0?clamp((current/max)*100,0,100):0;}
function catalog(){return root.JJK2CharacterCatalog;}
function engine(){return root.JJK2BattleEngine;}
function rules(){return root.JJK2BattleRules;}

function ensureStyle(){
  if(document.getElementById('jjk2BattleLabStyle'))return;
  const style=document.createElement('style');
  style.id='jjk2BattleLabStyle';
  style.textContent=`
  #jjk2BattleLab{position:fixed;inset:0;z-index:2147483000;background:radial-gradient(circle at 50% -20%,#502477 0,#140d20 34%,#07050b 78%);color:#fff;font-family:Inter,Arial,sans-serif;overflow:auto}
  #jjk2BattleLab *{box-sizing:border-box}
  .jjk2-lab-shell{min-height:100%;width:min(1400px,100%);margin:auto;padding:18px}
  .jjk2-lab-top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:14px}.jjk2-lab-kicker{font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:#bfa8d7;font-weight:900}.jjk2-lab-title{font-size:clamp(1.7rem,5vw,3.2rem);font-weight:1000;margin:2px 0}.jjk2-lab-sub{color:#baaeca;max-width:760px}
  .jjk2-lab-close,.jjk2-lab-btn{border:1px solid #ffffff24;background:linear-gradient(135deg,#82264a,#43142b);color:#fff;border-radius:14px;padding:11px 15px;font-weight:900;cursor:pointer}.jjk2-lab-btn.alt{background:#20152c}.jjk2-lab-btn:disabled{opacity:.38;cursor:not-allowed}
  .jjk2-setup{display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:stretch}.jjk2-pick{background:#120d19;border:1px solid #392b48;border-radius:22px;padding:16px}.jjk2-pick img{width:100%;height:260px;object-fit:cover;border-radius:16px;border:1px solid #ffffff18}.jjk2-pick label{display:block;margin-top:10px;color:#cfc1dc;font-size:.78rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.jjk2-pick select{width:100%;margin-top:5px;padding:12px;border-radius:12px;border:1px solid #49375e;background:#0c0911;color:#fff;font-weight:800}.jjk2-vs{display:grid;place-items:center;font-size:2rem;font-weight:1000;color:#f6cf63;text-shadow:0 0 22px #f6cf6366}.jjk2-start-row{text-align:center;margin:16px 0}.jjk2-start{min-width:240px;font-size:1.05rem;padding:14px 20px}
  .jjk2-arena{display:none}.jjk2-arena.show{display:block}.jjk2-field{position:relative;min-height:420px;border:1px solid #4b3760;border-radius:28px;overflow:hidden;background:linear-gradient(#44296d55,#0b0710dd),radial-gradient(circle at 50% 92%,#9445ff33,transparent 35%)}.jjk2-turn-banner{position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:5;border:1px solid #ffffff20;background:#0b0710dd;border-radius:999px;padding:9px 16px;font-size:.78rem;font-weight:1000;letter-spacing:.08em;text-transform:uppercase}.jjk2-fighters{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:end;min-height:420px;padding:54px 24px 22px}.jjk2-fighter{display:grid;grid-template-columns:minmax(110px,230px) minmax(160px,1fr);gap:14px;align-items:end}.jjk2-fighter.b{direction:rtl}.jjk2-fighter.b>*{direction:ltr}.jjk2-sprite{width:100%;height:300px;object-fit:contain;filter:drop-shadow(0 18px 22px #000a)}.jjk2-card{background:#0a0710df;border:1px solid #ffffff20;border-radius:18px;padding:13px;backdrop-filter:blur(8px)}.jjk2-name{font-size:1.28rem;font-weight:1000}.jjk2-meta{color:#baaeca;font-size:.78rem;margin-bottom:9px}.jjk2-bar-label{display:flex;justify-content:space-between;font-size:.72rem;font-weight:900;margin:7px 0 4px}.jjk2-bar{height:10px;border-radius:999px;background:#ffffff13;overflow:hidden;border:1px solid #ffffff12}.jjk2-fill{height:100%;background:linear-gradient(90deg,#ff4868,#ff9b5e)}.jjk2-fill.energy{background:linear-gradient(90deg,#238eff,#8ed6ff)}
  .jjk2-controls{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}.jjk2-tech-panel,.jjk2-log-panel,.jjk2-resolution{background:#100b17;border:1px solid #382a46;border-radius:20px;padding:14px}.jjk2-panel-title{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px;font-weight:1000}.jjk2-tech-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.jjk2-tech{display:grid;grid-template-columns:52px 1fr;gap:9px;align-items:center;text-align:left;border:1px solid #453257;background:#181020;color:#fff;border-radius:14px;padding:8px;cursor:pointer}.jjk2-tech img{width:52px;height:52px;object-fit:cover;border-radius:10px}.jjk2-tech b{display:block;font-size:.86rem}.jjk2-tech small{color:#bcaecd}.jjk2-tech.used,.jjk2-tech:disabled{opacity:.38;cursor:not-allowed}.jjk2-special{display:inline-block;margin-top:3px;color:#f6cf63;font-size:.66rem;font-weight:900}.jjk2-log{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px;max-height:245px;overflow:auto}.jjk2-log li{background:#0a0710;border:1px solid #ffffff12;border-radius:12px;padding:9px;font-size:.78rem;color:#d8cfe0}.jjk2-resolution{margin-top:16px}.jjk2-resolution-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.jjk2-resolution label{font-size:.72rem;color:#c3b4cf;font-weight:900}.jjk2-resolution input,.jjk2-resolution select{width:100%;margin-top:4px;padding:10px;border-radius:10px;border:1px solid #49375e;background:#09070d;color:#fff}.jjk2-resolution-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.jjk2-note{font-size:.72rem;color:#a99bb5;margin-top:8px}
  @media(max-width:850px){.jjk2-setup{grid-template-columns:1fr}.jjk2-vs{min-height:45px}.jjk2-fighters{grid-template-columns:1fr;align-items:stretch;padding-top:58px}.jjk2-fighter,.jjk2-fighter.b{direction:ltr;grid-template-columns:110px 1fr}.jjk2-sprite{height:170px}.jjk2-controls{grid-template-columns:1fr}.jjk2-tech-grid{grid-template-columns:1fr}.jjk2-field{min-height:0}.jjk2-fighters{min-height:0}.jjk2-pick img{height:180px}}
  `;
  document.head.appendChild(style);
}

function characterOptions(selected){return catalog().ids().map(id=>{const ch=catalog().get(id);return `<option value="${esc(id)}" ${id===selected?'selected':''}>${esc(ch?.name||id)}</option>`;}).join('');}
function gradeOptions(characterId,selected){const ch=catalog().get(characterId);return (ch?.grades||[]).map(g=>`<option value="${esc(g.id)}" ${g.id===selected?'selected':''}>${esc(g.id)} · ${esc(g.label||g.id)}</option>`).join('');}
function pickHtml(side,id,grade){const ch=catalog().get(id);return `<section class="jjk2-pick" data-pick="${side}"><img src="${esc(ch?.image||'')}" alt="${esc(ch?.name||id)}"><label>Combattente ${side}</label><select data-character="${side}">${characterOptions(id)}</select><label>Grado</label><select data-grade="${side}">${gradeOptions(id,grade)}</select></section>`;}

function mount(){
  if(!ENABLED||mounted)return false;
  if(!catalog()?.audit?.().ok||!engine()?.audit?.().ok)return false;
  mounted=true;ensureStyle();
  const rootEl=document.createElement('div');rootEl.id='jjk2BattleLab';
  rootEl.innerHTML=`<div class="jjk2-lab-shell"><header class="jjk2-lab-top"><div><div class="jjk2-lab-kicker">JJK 2.0 · Preview sperimentale</div><div class="jjk2-lab-title">Battle Lab</div><div class="jjk2-lab-sub">Arena isolata: non modifica i salvataggi, la stanza o le risorse della V40.4.</div></div><button class="jjk2-lab-close" type="button">Chiudi Battle Lab</button></header><div class="jjk2-setup">${pickHtml('A',selectedA,gradeA)}<div class="jjk2-vs">VS</div>${pickHtml('B',selectedB,gradeB)}</div><div class="jjk2-start-row"><button class="jjk2-lab-btn jjk2-start" type="button">Avvia combattimento</button></div><section class="jjk2-arena" aria-live="polite"></section></div>`;
  document.body.appendChild(rootEl);
  bindSetup(rootEl);return true;
}

function bindSetup(rootEl){
  rootEl.querySelector('.jjk2-lab-close').addEventListener('click',()=>{rootEl.remove();mounted=false;engine().clear();});
  rootEl.querySelectorAll('[data-character]').forEach(select=>select.addEventListener('change',()=>{
    const side=select.dataset.character;if(side==='A')selectedA=select.value;else selectedB=select.value;
    const pick=rootEl.querySelector(`[data-pick="${side}"]`),ch=catalog().get(select.value);pick.querySelector('img').src=ch?.image||'';const gradeSelect=pick.querySelector(`[data-grade="${side}"]`);gradeSelect.innerHTML=gradeOptions(select.value,'G4');if(side==='A')gradeA=gradeSelect.value;else gradeB=gradeSelect.value;
  }));
  rootEl.querySelectorAll('[data-grade]').forEach(select=>select.addEventListener('change',()=>{if(select.dataset.grade==='A')gradeA=select.value;else gradeB=select.value;}));
  rootEl.querySelector('.jjk2-start').addEventListener('click',()=>{engine().start({fighterA:{characterId:selectedA,gradeId:gradeA},fighterB:{characterId:selectedB,gradeId:gradeB},mode:'battle-lab'});renderArena();});
}

function fighterCard(side,fighter){return `<div class="jjk2-fighter ${side==='B'?'b':''}"><img class="jjk2-sprite" src="${esc(fighter.image||'')}" alt="${esc(fighter.name)}"><div class="jjk2-card"><div class="jjk2-name">${esc(fighter.name)}</div><div class="jjk2-meta">${esc(fighter.gradeId)} · Corpo ${esc(fighter.body?.base||0)}</div><div class="jjk2-bar-label"><span>Vita</span><span>${fighter.life.current} / ${fighter.life.max}</span></div><div class="jjk2-bar"><div class="jjk2-fill" style="width:${pct(fighter.life.current,fighter.life.max)}%"></div></div><div class="jjk2-bar-label"><span>${fighter.energy.kind==='vigor'?'Vigore':'Energia'}</span><span>${fighter.energy.current} / ${fighter.energy.max}</span></div><div class="jjk2-bar"><div class="jjk2-fill energy" style="width:${pct(fighter.energy.current,fighter.energy.max)}%"></div></div></div></div>`;}

function techHtml(side){const battle=engine().get(),fighter=battle.fighters[side],definition=catalog().get(fighter.characterId);return (definition.techniques||[]).filter(t=>rules().gradeUnlocked(fighter.gradeId,t.grade)).map(t=>{const n=rules().normalizeTechnique(fighter,t),used=fighter.usedTechniqueKeys.includes(t.key),disabled=side!==battle.activeFighter||!n.available;const cost=n.energyCost?.known?n.energyCost.value:'?';return `<button class="jjk2-tech ${used?'used':''}" type="button" data-tech-side="${side}" data-tech="${esc(t.key)}" ${disabled?'disabled':''}><img src="${esc(t.image||fighter.image||'')}" alt=""><span><b>${esc(t.name)}</b><small>${esc(t.grade)} · costo ${esc(cost)}</small>${n.requiresSpecialResolution?'<span class="jjk2-special">RISOLUZIONE SPECIALE</span>':''}</span></button>`;}).join('')||'<div class="jjk2-note">Nessuna tecnica disponibile.</div>';}

function logHtml(){const history=engine().get()?.history||[];return history.slice().reverse().map(item=>{if(item.type==='battle-start')return `<li><b>Inizio</b><br>${esc(item.text)}</li>`;if(item.type==='technique-committed')return `<li><b>${esc(item.side)} · ${esc(item.techniqueName)}</b><br>Combattimento: ${item.combatScore??'speciale'}${item.special?' · effetto da risolvere':''}</li>`;if(item.type==='round-resolved')return `<li><b>Round risolto</b><br>Vita persa A ${item.lifeLoss?.A||0} · B ${item.lifeLoss?.B||0}${item.note?' · '+esc(item.note):''}</li>`;return `<li>${esc(item.type||'evento')}</li>`;}).join('');}

function renderArena(){
  const lab=document.getElementById('jjk2BattleLab'),arena=lab?.querySelector('.jjk2-arena'),battle=engine().get();if(!arena||!battle)return;
  const active=battle.fighters[battle.activeFighter];arena.classList.add('show');arena.innerHTML=`<div class="jjk2-field"><div class="jjk2-turn-banner">Turno ${battle.turn} · ${esc(active.name)}</div><div class="jjk2-fighters">${fighterCard('A',battle.fighters.A)}${fighterCard('B',battle.fighters.B)}</div></div><div class="jjk2-controls"><section class="jjk2-tech-panel"><div class="jjk2-panel-title"><span>Tecniche A</span><small>${battle.activeFighter==='A'?'TURNO ATTIVO':'in attesa'}</small></div><div class="jjk2-tech-grid">${techHtml('A')}</div></section><section class="jjk2-tech-panel"><div class="jjk2-panel-title"><span>Tecniche B</span><small>${battle.activeFighter==='B'?'TURNO ATTIVO':'in attesa'}</small></div><div class="jjk2-tech-grid">${techHtml('B')}</div></section></div><section class="jjk2-resolution"><div class="jjk2-panel-title"><span>Risoluzione manuale del round</span><small>nessuna regola danno inventata</small></div><div class="jjk2-resolution-grid"><label>Vita persa A<input type="number" min="0" step="1" value="0" data-loss="A"></label><label>Vita persa B<input type="number" min="0" step="1" value="0" data-loss="B"></label><label>Vincitore<select data-winner><option value="">Nessuno / pareggio</option><option value="A">A</option><option value="B">B</option></select></label><label>Nota<input type="text" data-note placeholder="Es. tiro dadi, dominio, effetto..."></label></div><div class="jjk2-resolution-actions"><button class="jjk2-lab-btn" type="button" data-resolve>Risolvi round</button><button class="jjk2-lab-btn alt" type="button" data-new-combat>Nuovo combattimento tecniche</button><button class="jjk2-lab-btn alt" type="button" data-back-setup>Torna alla selezione</button></div><div class="jjk2-note">Questa preview non applica automaticamente danni o effetti speciali: registra tecniche, costi e punteggi senza alterare la V40.4.</div></section><section class="jjk2-log-panel" style="margin-top:16px"><div class="jjk2-panel-title">Log Battle Lab</div><ul class="jjk2-log">${logHtml()}</ul></section>`;
  bindArena(arena);
}

function bindArena(arena){
  arena.querySelectorAll('[data-tech]').forEach(btn=>btn.addEventListener('click',()=>{
    const side=btn.dataset.techSide,key=btn.dataset.tech;let inputs={};const preview=engine().preview(side,key);
    if(preview?.technique?.dynamicCost){const raw=root.prompt('Inserisci il costo/risultato richiesto dalla tecnica dinamica:');if(raw===null)return;const value=Number(raw);if(!Number.isFinite(value)||value<0)return;inputs={energyCost:value,roll:value};}
    const result=engine().commitTechnique(side,key,inputs);if(!result.ok){root.alert('Tecnica non disponibile: '+result.reason);return;}engine().switchTurn();renderArena();
  }));
  arena.querySelector('[data-resolve]')?.addEventListener('click',()=>{const lossA=Number(arena.querySelector('[data-loss="A"]')?.value)||0,lossB=Number(arena.querySelector('[data-loss="B"]')?.value)||0,winner=arena.querySelector('[data-winner]')?.value||null,note=arena.querySelector('[data-note]')?.value||'';engine().resolveRound({winnerSide:winner,lifeLoss:{A:lossA,B:lossB},note});renderArena();});
  arena.querySelector('[data-new-combat]')?.addEventListener('click',()=>{engine().resetCombat('A');engine().resetCombat('B');renderArena();});
  arena.querySelector('[data-back-setup]')?.addEventListener('click',()=>{engine().clear();arena.classList.remove('show');arena.innerHTML='';document.querySelector('.jjk2-setup')?.scrollIntoView({behavior:'smooth',block:'start'});});
}

function audit(){return Object.freeze({ok:!ENABLED||mounted,version:VERSION,enabled:ENABLED,mounted,writesLegacy:false});}
root.JJK2BattleSimulator=Object.freeze({version:VERSION,enabled:ENABLED,mount,audit});

if(ENABLED){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,80),{once:true});else setTimeout(mount,80);}
})(window);
