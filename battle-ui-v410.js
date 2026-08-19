/* JJK Energy V41.0 - practice battle UI */
(function(root){
'use strict';
if(root.__JJK_BATTLE_UI_V410__)return;
root.__JJK_BATTLE_UI_V410__=true;

const VERSION='41.0.0';
const practice=root.JJKPracticeBattle;
const catalog=root.JJKCharacterCatalog;
if(!practice||!catalog)throw new Error('JJK Battle UI requires Practice Battle and Character Catalog');

let session=null,activeSide='player',lastMessage='Scegli una tecnica per iniziare lo scontro.';
const $=selector=>document.querySelector(selector);
const byId=id=>document.getElementById(id);
function showScreenSafe(id){
  try{const fn=(0,eval)('showScreen');if(typeof fn==='function'){fn(id);return;}}catch(_){}
  document.querySelectorAll('.screen').forEach(node=>node.classList.remove('active'));
  byId(id)?.classList.add('active');
}
function pct(value,max){return max>0?Math.max(0,Math.min(100,(Number(value)||0)*100/max)):0;}
function resourceText(fighter){return fighter.resource.current+' / '+fighter.resource.max;}
function blockerText(view){
  const map={locked:'Bloccata',used:'Già usata','insufficient-energy':'Energia insufficiente','insufficient-vigor':'Vigore insufficiente','insufficient-tokens':'Segnalini insufficienti'};
  return (view.blockers||[]).map(item=>map[item]||item).join(' · ');
}
function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}

function injectStyle(){
  if(byId('jjkBattleV410Style'))return;
  const style=document.createElement('style');style.id='jjkBattleV410Style';
  style.textContent=`
.jjk-battle-screen{position:relative;flex-direction:column;min-height:100vh;overflow:hidden;background:radial-gradient(circle at 50% -10%,rgba(88,59,150,.38),transparent 34%),linear-gradient(180deg,#07050c,#0d0813 52%,#050407);color:#fff}
.jjk-battle-screen:before{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 25%,rgba(94,190,255,.06) 46%,transparent 67%);animation:jjkBattleSweep 9s ease-in-out infinite alternate}
.jjk-battle-shell{position:relative;z-index:1;width:min(1420px,100%);margin:0 auto;padding:14px 16px 24px;display:flex;flex-direction:column;gap:12px;min-height:100vh}
.jjk-battle-top{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center}.jjk-battle-back,.jjk-battle-ghost{border:1px solid rgba(255,255,255,.16);background:rgba(19,13,27,.88);color:#fff;border-radius:14px;padding:10px 14px;font-weight:900;cursor:pointer}.jjk-battle-title{text-align:center}.jjk-battle-title b{display:block;font-size:1.05rem;letter-spacing:.16em;text-transform:uppercase}.jjk-battle-title small{color:#a9a0b2}
.jjk-battle-setup{margin:auto;width:min(1020px,100%);padding:22px;border:1px solid rgba(126,91,177,.45);border-radius:26px;background:linear-gradient(145deg,rgba(24,16,34,.95),rgba(8,6,12,.96));box-shadow:0 24px 70px rgba(0,0,0,.42)}
.jjk-battle-setup h2{text-align:center;margin:0 0 6px;font-size:clamp(1.6rem,4vw,2.35rem)}.jjk-battle-setup>p{text-align:center;color:#b9adbf;margin:0 auto 20px;max-width:680px;line-height:1.5}
.jjk-battle-pickers{display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:stretch}.jjk-battle-picker{padding:16px;border:1px solid #3f3150;border-radius:20px;background:#0d0913}.jjk-battle-picker label{display:block;margin-bottom:8px;color:#bcaed0;font-size:.75rem;text-transform:uppercase;letter-spacing:.09em;font-weight:900}.jjk-battle-picker select{width:100%;padding:12px;border-radius:12px;border:1px solid #59436d;background:#171020;color:#fff;font-weight:800;margin-bottom:11px}.jjk-battle-vs{display:grid;place-items:center;font-size:1.5rem;font-weight:950;color:#ff5b7e;text-shadow:0 0 18px rgba(255,67,113,.55)}
.jjk-battle-launch{display:block;width:min(520px,100%);margin:18px auto 0;padding:15px;border:1px solid #ff7191;border-radius:16px;background:linear-gradient(135deg,#b51d47,#571225);color:#fff;font-weight:950;font-size:1rem;cursor:pointer;box-shadow:0 0 28px rgba(255,53,102,.22)}
.jjk-battle-stage{display:none;flex:1;min-height:0;grid-template-rows:minmax(410px,1fr) auto;gap:10px}.jjk-battle-stage.show{display:grid}
.jjk-battle-arena{position:relative;min-height:410px;overflow:hidden;border:1px solid rgba(112,78,144,.54);border-radius:28px;background:radial-gradient(ellipse at 50% 82%,rgba(109,64,155,.26),transparent 42%),linear-gradient(180deg,#160d24 0 46%,#0d1018 46% 100%);box-shadow:inset 0 0 70px rgba(0,0,0,.45),0 24px 70px rgba(0,0,0,.3)}
.jjk-battle-arena:before{content:'';position:absolute;left:-10%;right:-10%;bottom:-28%;height:62%;border-radius:50%;border:1px solid rgba(129,99,170,.4);background:repeating-radial-gradient(ellipse at center,rgba(108,79,140,.16) 0 2px,transparent 3px 42px);transform:perspective(500px) rotateX(64deg);box-shadow:0 0 70px rgba(104,63,160,.22)}
.jjk-battle-hud{position:absolute;z-index:5;width:min(390px,43%);padding:12px 14px;border:1px solid rgba(255,255,255,.16);border-radius:18px;background:rgba(8,7,12,.88);backdrop-filter:blur(8px);box-shadow:0 16px 32px rgba(0,0,0,.3)}.jjk-battle-hud.opponent{top:18px;left:20px}.jjk-battle-hud.player{right:20px;bottom:18px}.jjk-battle-hud-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.jjk-battle-hud-name{font-size:1rem;font-weight:950}.jjk-battle-grade{padding:4px 7px;border-radius:999px;background:#30203d;color:#dac8ed;font-size:.65rem;font-weight:900}.jjk-battle-statline{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin-top:8px;font-size:.68rem;color:#c4b8cd}.jjk-battle-bar{height:8px;border-radius:999px;background:#271b2f;overflow:hidden;border:1px solid #4d3859}.jjk-battle-fill{height:100%;transition:width .25s ease}.jjk-battle-fill.life{background:linear-gradient(90deg,#d51f47,#ff6683)}.jjk-battle-fill.resource{background:linear-gradient(90deg,#2867dc,#58d2ff)}
.jjk-battle-fighter{position:absolute;z-index:3;width:min(330px,31vw);height:min(355px,50vh);display:flex;align-items:flex-end;justify-content:center;filter:drop-shadow(0 18px 20px rgba(0,0,0,.55));transition:transform .2s ease,filter .2s ease}.jjk-battle-fighter img{max-width:100%;max-height:100%;object-fit:contain;border-radius:24px;mask-image:linear-gradient(to bottom,#000 78%,transparent 100%)}.jjk-battle-fighter.opponent{right:11%;top:7%}.jjk-battle-fighter.opponent img{transform:scaleX(-1)}.jjk-battle-fighter.player{left:10%;bottom:3%}.jjk-battle-fighter.attack{animation:jjkBattleAttack .38s ease}.jjk-battle-fighter.hit{animation:jjkBattleHit .34s ease}
.jjk-battle-round{position:absolute;z-index:6;left:50%;top:18px;transform:translateX(-50%);padding:7px 13px;border-radius:999px;background:rgba(12,8,17,.82);border:1px solid rgba(255,255,255,.13);font-size:.7rem;font-weight:900;color:#d7cce2}.jjk-battle-result{position:absolute;z-index:7;left:50%;top:50%;transform:translate(-50%,-50%);max-width:76%;padding:11px 18px;border-radius:16px;background:rgba(5,4,8,.88);border:1px solid rgba(255,218,99,.45);color:#ffe783;font-weight:950;text-align:center;box-shadow:0 0 30px rgba(255,206,70,.12)}
.jjk-battle-console{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,34%);gap:10px}.jjk-battle-command,.jjk-battle-logbox{border:1px solid #3e3049;border-radius:20px;background:linear-gradient(145deg,#15101c,#09070d);padding:13px;min-height:190px}.jjk-battle-side-tabs{display:flex;gap:8px;margin-bottom:10px}.jjk-battle-side-tab{flex:1;padding:9px;border-radius:12px;border:1px solid #4c395c;background:#1b1323;color:#cdbbd8;font-weight:900;cursor:pointer}.jjk-battle-side-tab.active{border-color:#5dc6ff;color:#fff;background:linear-gradient(135deg,#155a91,#372251);box-shadow:0 0 18px rgba(54,174,255,.18)}
.jjk-battle-techniques{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.jjk-battle-tech{position:relative;min-height:76px;padding:10px;text-align:left;border-radius:13px;border:1px solid #493754;background:#100b16;color:#fff;cursor:pointer;overflow:hidden}.jjk-battle-tech b{display:block;font-size:.78rem;line-height:1.15}.jjk-battle-tech small{display:block;color:#bcaec5;font-size:.64rem;margin-top:5px}.jjk-battle-tech.ready:hover{border-color:#55c9ff;box-shadow:0 0 18px rgba(72,190,255,.22)}.jjk-battle-tech.blocked{opacity:.45;cursor:not-allowed}.jjk-battle-tech.special:after{content:'SPECIALE';position:absolute;right:6px;top:6px;padding:3px 5px;border-radius:999px;background:#5d274f;color:#ffc6e7;font-size:.52rem;font-weight:950}
.jjk-battle-message{min-height:54px;padding:10px 12px;border-radius:13px;background:#0b0810;border:1px solid #30243a;color:#ddd2e2;font-size:.78rem;line-height:1.4}.jjk-battle-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.jjk-battle-actions button{padding:10px;border-radius:12px;border:1px solid #554064;background:#20152a;color:#fff;font-weight:900;cursor:pointer}.jjk-battle-actions button.primary-action{border-color:#7e5cff;background:linear-gradient(135deg,#6742a8,#27133f)}
.jjk-battle-home-action{--home-accent:#ff5d88}.jjk-battle-home-action .home-action-icon{color:#ff6a93;border-color:#ff6a93}
@keyframes jjkBattleSweep{from{transform:translateX(-4%)}to{transform:translateX(4%)}}@keyframes jjkBattleAttack{0%,100%{transform:none}45%{transform:translateX(34px) scale(1.04)}}@keyframes jjkBattleHit{0%,100%{transform:none}30%{transform:translateX(-12px) rotate(-2deg)}60%{transform:translateX(10px) rotate(2deg)}}
@media(max-width:820px){.jjk-battle-shell{padding:10px}.jjk-battle-pickers{grid-template-columns:1fr}.jjk-battle-vs{min-height:30px}.jjk-battle-stage{grid-template-rows:460px auto}.jjk-battle-console{grid-template-columns:1fr}.jjk-battle-techniques{grid-template-columns:repeat(2,minmax(0,1fr))}.jjk-battle-hud{width:68%}.jjk-battle-hud.opponent{left:10px;top:48px}.jjk-battle-hud.player{right:10px;bottom:12px}.jjk-battle-fighter{width:42vw;height:250px}.jjk-battle-fighter.opponent{right:2%;top:14%}.jjk-battle-fighter.player{left:1%;bottom:7%}}
@media(max-width:520px){.jjk-battle-title small{display:none}.jjk-battle-top{grid-template-columns:auto 1fr}.jjk-battle-top>.jjk-battle-ghost{display:none}.jjk-battle-stage{grid-template-rows:430px auto}.jjk-battle-hud{width:74%;padding:9px 10px}.jjk-battle-hud-name{font-size:.82rem}.jjk-battle-fighter{width:48vw;height:220px}.jjk-battle-techniques{grid-template-columns:1fr 1fr}.jjk-battle-tech{min-height:70px}.jjk-battle-result{max-width:90%;width:90%}}
@media(prefers-reduced-motion:reduce){.jjk-battle-screen:before,.jjk-battle-fighter.attack,.jjk-battle-fighter.hit{animation:none!important}}
`;
  document.head.appendChild(style);
}
function ensureHomeAction(){
  if(byId('jjkBattlePracticeHome'))return;
  const grid=$('.home-actions-grid');if(!grid)return;
  const button=document.createElement('button');button.id='jjkBattlePracticeHome';button.type='button';button.className='home-action jjk-battle-home-action';
  button.innerHTML='<span class="home-action-icon">戦</span><span><b>Battaglia di prova</b><small>Prova personaggi e tecniche in un’arena 2D</small></span>';
  button.addEventListener('click',open);grid.insertBefore(button,grid.children[1]||null);
}
function screenMarkup(){return `
<section id="battlePractice" class="screen jjk-battle-screen" data-testid="battle-practice-screen">
  <div class="jjk-battle-shell">
    <header class="jjk-battle-top"><button class="jjk-battle-back" data-action="back">← Home</button><div class="jjk-battle-title"><b>JJK Battle Lab</b><small>V41.0 · modalità prova isolata</small></div><button class="jjk-battle-ghost" data-action="setup">Cambia combattenti</button></header>
    <div class="jjk-battle-setup" data-view="setup">
      <h2>Prepara lo scontro</h2><p>Scegli i due personaggi e il loro grado. La prova usa memoria temporanea e non modifica la partita reale.</p>
      <div class="jjk-battle-pickers"><div class="jjk-battle-picker"><label for="jjkBattlePlayerCharacter">Il tuo personaggio</label><select id="jjkBattlePlayerCharacter"></select><label for="jjkBattlePlayerGrade">Grado</label><select id="jjkBattlePlayerGrade"></select></div><div class="jjk-battle-vs">VS</div><div class="jjk-battle-picker"><label for="jjkBattleOpponentCharacter">Avversario</label><select id="jjkBattleOpponentCharacter"></select><label for="jjkBattleOpponentGrade">Grado</label><select id="jjkBattleOpponentGrade"></select></div></div>
      <button class="jjk-battle-launch" data-action="launch" data-testid="battle-launch">Inizia battaglia di prova</button>
    </div>
    <div class="jjk-battle-stage" data-view="stage">
      <div class="jjk-battle-arena" data-testid="battle-arena"><div class="jjk-battle-round" id="jjkBattleRound"></div><div class="jjk-battle-result" id="jjkBattleResult"></div><div id="jjkBattleOpponentHud" class="jjk-battle-hud opponent"></div><div id="jjkBattlePlayerHud" class="jjk-battle-hud player"></div><div id="jjkBattleOpponentFighter" class="jjk-battle-fighter opponent"><img alt=""></div><div id="jjkBattlePlayerFighter" class="jjk-battle-fighter player"><img alt=""></div></div>
      <div class="jjk-battle-console"><section class="jjk-battle-command"><div class="jjk-battle-side-tabs"><button class="jjk-battle-side-tab active" data-side="player">Tu</button><button class="jjk-battle-side-tab" data-side="opponent">Avversario</button></div><div id="jjkBattleTechniques" class="jjk-battle-techniques" data-testid="battle-techniques"></div></section><aside class="jjk-battle-logbox"><div id="jjkBattleMessage" class="jjk-battle-message"></div><div class="jjk-battle-actions"><button class="primary-action" data-action="new-round">Nuovo scontro</button><button data-action="reset">Reset prova</button></div></aside></div>
    </div>
  </div>
</section>`;}
function ensureScreen(){
  if(byId('battlePractice'))return;
  document.body.insertAdjacentHTML('beforeend',screenMarkup());
  const screen=byId('battlePractice');
  screen.addEventListener('click',event=>{
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(action==='back')close();if(action==='setup')showSetup();if(action==='launch')launch();if(action==='new-round'&&session){session.newRound();lastMessage='Nuovo scontro: le tecniche sono di nuovo disponibili.';render();}if(action==='reset'&&session){session.reset();lastMessage='Prova ripristinata ai valori iniziali.';render();}
    const side=event.target.closest('[data-side]')?.dataset.side;if(side){activeSide=side;render();}
    const tech=event.target.closest('[data-tech-key]');if(tech&&!tech.disabled)useTechnique(tech.dataset.techKey);
  });
  byId('jjkBattlePlayerCharacter').addEventListener('change',()=>populateGrades('player'));
  byId('jjkBattleOpponentCharacter').addEventListener('change',()=>populateGrades('opponent'));
  populateCharacters();
}
function populateCharacters(){
  const ids=catalog.ids(),state=root.JJKGameState;
  const current=state?.get?.('currentId');
  const player=byId('jjkBattlePlayerCharacter'),opponent=byId('jjkBattleOpponentCharacter');
  const options=ids.map(id=>'<option value="'+escapeHtml(id)+'">'+escapeHtml(catalog.get(id)?.name||id)+'</option>').join('');
  player.innerHTML=options;opponent.innerHTML=options;
  player.value=current&&ids.includes(current)?current:(ids[0]||'');
  opponent.value=ids.find(id=>id!==player.value)||ids[0]||'';
  populateGrades('player');populateGrades('opponent');
}
function populateGrades(side){
  const charSelect=byId(side==='player'?'jjkBattlePlayerCharacter':'jjkBattleOpponentCharacter'),gradeSelect=byId(side==='player'?'jjkBattlePlayerGrade':'jjkBattleOpponentGrade');
  const character=catalog.get(charSelect.value);gradeSelect.innerHTML=(character?.grades||[]).map(item=>'<option value="'+escapeHtml(item.id)+'">'+escapeHtml(item.label||item.id)+'</option>').join('');
}
function launch(){
  const playerId=byId('jjkBattlePlayerCharacter').value,opponentId=byId('jjkBattleOpponentCharacter').value;
  const playerGrade=byId('jjkBattlePlayerGrade').value,opponentGrade=byId('jjkBattleOpponentGrade').value;
  if(!playerId||!opponentId)return;
  session=practice.createSession(playerId,opponentId,{player:{gradeId:playerGrade},opponent:{gradeId:opponentGrade}});activeSide='player';lastMessage='Battaglia pronta. Scegli una tecnica; poi passa al lato avversario per confrontare i valori.';
  $('[data-view="setup"]').style.display='none';$('[data-view="stage"]').classList.add('show');render();
}
function showSetup(){
  session=null;$('[data-view="setup"]').style.display='block';$('[data-view="stage"]').classList.remove('show');populateCharacters();
}
function hudMarkup(fighter){
  return '<div class="jjk-battle-hud-head"><span class="jjk-battle-hud-name">'+escapeHtml(fighter.name)+'</span><span class="jjk-battle-grade">'+escapeHtml(fighter.gradeId)+'</span></div>'+`<div class="jjk-battle-statline"><span>VITA</span><span class="jjk-battle-bar"><span class="jjk-battle-fill life" style="display:block;width:${pct(fighter.life,fighter.maxLife)}%"></span></span><b>${fighter.life}/${fighter.maxLife}</b></div>`+`<div class="jjk-battle-statline"><span>${escapeHtml(fighter.resource.kind==='vigor'?'VIGORE':'ENERGIA')}</span><span class="jjk-battle-bar"><span class="jjk-battle-fill resource" style="display:block;width:${pct(fighter.resource.current,fighter.resource.max)}%"></span></span><b>${escapeHtml(resourceText(fighter))}</b></div>`+'<div class="jjk-battle-statline"><span>CORPO</span><span></span><b>'+fighter.body+'</b></div>';
}
function renderTechniques(fighter){
  const container=byId('jjkBattleTechniques');container.innerHTML='';
  fighter.techniques.forEach(view=>{
    const source=catalog.technique(fighter.characterId,view.key),support=practice.techniqueSupport(source),button=document.createElement('button');
    button.type='button';button.dataset.techKey=view.key;button.className='jjk-battle-tech '+(view.ready?'ready':'blocked')+(support.supported?'':' special');button.disabled=!view.ready;
    const cost=view.cost===null?'variabile':view.cost+' '+(fighter.resource.kind==='vigor'?'Vigore':'EM');
    const status=view.ready?(support.supported?'Pronta':'Regola speciale'):blockerText(view);
    button.innerHTML='<b>'+escapeHtml(view.name)+'</b><small>'+escapeHtml(view.badge)+' · '+escapeHtml(cost)+'</small><small>'+escapeHtml(status)+'</small>';
    container.appendChild(button);
  });
}
function comparisonText(shot){
  const comparison=shot.round.comparison;if(!comparison.ready)return 'Round '+shot.round.number+' · in attesa delle due tecniche';
  if(comparison.tie)return 'PARITÀ · '+shot.round.actions.player.score+' — '+shot.round.actions.opponent.score;
  const winner=comparison.winner==='player'?shot.player.name:shot.opponent.name;
  return winner+' avanti di '+comparison.margin+' Combattimento';
}
function render(){
  if(!session)return;const shot=session.snapshot();
  byId('jjkBattlePlayerHud').innerHTML=hudMarkup(shot.player);byId('jjkBattleOpponentHud').innerHTML=hudMarkup(shot.opponent);
  const pImg=byId('jjkBattlePlayerFighter').querySelector('img'),oImg=byId('jjkBattleOpponentFighter').querySelector('img');pImg.src=shot.player.image;pImg.alt=shot.player.name;oImg.src=shot.opponent.image;oImg.alt=shot.opponent.name;
  byId('jjkBattleRound').textContent='SCONTRO '+shot.round.number;byId('jjkBattleResult').textContent=comparisonText(shot);byId('jjkBattleMessage').textContent=lastMessage;
  document.querySelectorAll('#battlePractice [data-side]').forEach(button=>button.classList.toggle('active',button.dataset.side===activeSide));
  renderTechniques(activeSide==='player'?shot.player:shot.opponent);
  byId('battlePractice').dataset.sessionId=shot.id;
}
function useTechnique(key){
  if(!session)return;const result=session.useTechnique(activeSide,key);
  lastMessage=result.message||result.action?.techniqueName||'Azione completata.';
  if(result.ok){
    const attacker=byId(activeSide==='player'?'jjkBattlePlayerFighter':'jjkBattleOpponentFighter'),target=byId(activeSide==='player'?'jjkBattleOpponentFighter':'jjkBattlePlayerFighter');
    attacker.classList.remove('attack');target.classList.remove('hit');void attacker.offsetWidth;attacker.classList.add('attack');target.classList.add('hit');setTimeout(()=>{attacker.classList.remove('attack');target.classList.remove('hit');},420);
    try{root.JJKSfx?.play?.('technique');}catch(_){}
    const score=result.action?.score;lastMessage=result.action.techniqueName+(Number.isFinite(score)?' → '+score+' Combattimento.':' utilizzata.')+(result.action.note?' '+result.action.note:'');
  }else if(result.reason==='special-technique'){try{root.JJKSfx?.play?.('danger');}catch(_){} }
  render();
}
function open(){ensureScreen();showScreenSafe('battlePractice');showSetup();}
function close(){session=null;showScreenSafe('home');}
function audit(){
  const issues=[];if(!byId('battlePractice'))issues.push('battle practice screen missing');if(!byId('jjkBattlePracticeHome'))issues.push('battle practice home action missing');if(practice.audit?.().ok!==true)issues.push('practice controller audit failed');
  const checks={version:VERSION,issues,ok:issues.length===0};root.JJKBattleUIAudit=checks;return checks;
}
function boot(){injectStyle();ensureScreen();ensureHomeAction();let checks=null;try{checks=audit();}catch(error){console.warn('JJK Battle UI audit failed',error);}try{root.dispatchEvent(new CustomEvent('jjk:battle-ui-ready',{detail:{version:VERSION,ok:!!checks?.ok}}));}catch(_){} }
const api=Object.freeze({version:VERSION,open,close,showSetup,launch,render,audit,getSession:()=>session});root.JJKBattleUI=api;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
console.info('JJK Energy Battle UI ready',VERSION);
})(typeof window!=='undefined'?window:globalThis);
