/* JJK Energy V36.2 - Toji, Copia di Yuta e Dominio di Megumi */
(function(){
'use strict';

const VERSION='36.2.0';
const RANK={G4:0,G3:1,G2:2,G1:3,SS:4,SG:5};
const TOJI_LOCAL_KEY='jjk_toji_v362_life_granted';
const TOJI_REPAIR_KEY='jjk_toji_v362_repair_done';

function num(value){const n=Number(value);return Number.isFinite(n)?n:0;}
function getGlobal(name){try{return window[name]||eval(name);}catch(_){return window[name];}}
function setGlobal(name,value){window[name]=value;window.__jjkV362Value=value;try{eval(name+' = window.__jjkV362Value');}catch(_){}delete window.__jjkV362Value;}
function read(name,fallback=null){try{const value=eval(name);return value===undefined?fallback:value;}catch(_){return window[name]===undefined?fallback:window[name];}}
function write(name,value){window.__jjkV362Value=value;try{eval(name+' = window.__jjkV362Value');}catch(_){window[name]=value;}delete window.__jjkV362Value;}
function chars(){return read('characters',window.characters||{});}
function currentId(){return read('currentId',null);}
function gradeId(){return read('gradeId','G4');}
function currentCharacter(){return read('current',null);}
function isBossFree(){try{return !!getGlobal('isBossRushFree')?.();}catch(_){return false;}}
function saveAndRender(){try{getGlobal('saveState')?.();}catch(_){}try{getGlobal('renderAll')?.();}catch(_){} }
function show(title,value,text){try{getGlobal('showModal')?.(title,value,text);}catch(_){} }
function log(title,text){try{getGlobal('addLog')?.(title,text);}catch(_){} }
function play(technique){try{getGlobal('playTechniqueEffect')?.(technique);}catch(_){} }
function rankOf(value){return RANK[value]??0;}

/* =========================================================
   TOJI: 10 VITA DAL GRADO SS IN POI
   ========================================================= */
function tojiActive(id=currentId(),grade=gradeId()){return id==='toji'&&rankOf(grade)>=RANK.SS;}
function updateTojiLifeDom(active){const max=active?10:8;const maxEl=document.getElementById('lifeMaxValue');if(maxEl&&currentId()==='toji')maxEl.textContent=String(max);}
function applyLocalTojiFix(options={}){
  const toji=chars().toji;if(!toji)return false;
  const active=tojiActive();
  toji.maxLife=active?10:8;
  if(currentId()!=='toji'){updateTojiLifeDom(active);return active;}

  let life=Math.max(0,num(read('life',toji.maxLife)));
  const granted=localStorage.getItem(TOJI_LOCAL_KEY)==='1';
  if(active){
    if(!granted){life=Math.min(10,life+2);localStorage.setItem(TOJI_LOCAL_KEY,'1');}
    if(life===8&&localStorage.getItem(TOJI_REPAIR_KEY)!=='1'){
      life=10;
      localStorage.setItem(TOJI_REPAIR_KEY,'1');
    }
  }else{
    life=Math.min(8,life);
    localStorage.setItem(TOJI_LOCAL_KEY,'0');
    localStorage.removeItem(TOJI_REPAIR_KEY);
  }
  write('life',life);
  updateTojiLifeDom(active);
  if(options.save!==false){try{getGlobal('saveState')?.();}catch(_){} }
  return active;
}
function normalizeTojiState(state){
  if(!state||state.characterId!=='toji')return state;
  const active=rankOf(state.gradeId||'G4')>=RANK.SS;
  const wasActive=state.tojiMonsterActive===true;
  const oldMax=num(state.maxLife||8);
  let life=Math.max(0,num(state.life));
  if(active){
    if(!state.tojiLifeV362Granted&&!wasActive)life=Math.min(10,life+2);
    else if(!state.tojiLifeV362Granted&&oldMax<10)life=Math.min(10,life+2);
    state.tojiLifeV362Granted=true;
    state.tojiMonsterActive=true;
    state.maxLife=10;
  }else{
    state.tojiLifeV362Granted=false;
    state.tojiMonsterActive=false;
    state.maxLife=8;
    life=Math.min(8,life);
  }
  state.life=life;
  return state;
}
function installTojiFix(){
  const wrapAfter=name=>{const original=getGlobal(name);if(typeof original!=='function'||original.__v362Toji)return;const wrapped=function(){const out=original.apply(this,arguments);applyLocalTojiFix({save:false});return out;};wrapped.__v362Toji=true;setGlobal(name,wrapped);};
  ['renderHeader','updateBars','changeLife','applyTechniqueLifeCost'].forEach(wrapAfter);

  const open=getGlobal('openCharacter');if(typeof open==='function'&&!open.__v362Toji){const wrapped=function(){const out=open.apply(this,arguments);applyLocalTojiFix({save:true});try{getGlobal('renderAll')?.();}catch(_){}return out;};wrapped.__v362Toji=true;setGlobal('openCharacter',wrapped);}
  const sync=getGlobal('syncGrade');if(typeof sync==='function'&&!sync.__v362Toji){const wrapped=function(){const before=gradeId(),out=sync.apply(this,arguments),after=gradeId();const active=applyLocalTojiFix({save:true});if(currentId()==='toji'&&rankOf(before)<RANK.SS&&rankOf(after)>=RANK.SS&&active)log('Mostro Senza Energia Maledetta','Vita massima aumentata definitivamente a 10 finché Toji resta SS o SG.');try{getGlobal('renderAll')?.();}catch(_){}return out;};wrapped.__v362Toji=true;setGlobal('syncGrade',wrapped);}
  const start=getGlobal('startNewGame');if(typeof start==='function'&&!start.__v362Toji){const wrapped=function(){const toji=chars().toji;if(toji)toji.maxLife=8;localStorage.setItem(TOJI_LOCAL_KEY,'0');localStorage.removeItem(TOJI_REPAIR_KEY);return start.apply(this,arguments);};wrapped.__v362Toji=true;setGlobal('startNewGame',wrapped);}
  const build=getGlobal('buildLocalPlayerState');if(typeof build==='function'&&!build.__v362Toji){const wrapped=function(){applyLocalTojiFix({save:false});const state=build.apply(this,arguments);if(state?.characterId==='toji'){normalizeTojiState(state);state.tojiLifeV362Granted=localStorage.getItem(TOJI_LOCAL_KEY)==='1';}return state;};wrapped.__v362Toji=true;setGlobal('buildLocalPlayerState',wrapped);}
  const initial=getGlobal('createInitialRoomPlayerState');if(typeof initial==='function'&&!initial.__v362Toji){const wrapped=function(characterId){const state=initial.apply(this,arguments);if(characterId==='toji'&&state){state.life=8;state.maxLife=8;state.tojiMonsterActive=false;state.tojiLifeV362Granted=false;}return state;};wrapped.__v362Toji=true;setGlobal('createInitialRoomPlayerState',wrapped);}
  const sanitize=getGlobal('sanitizeRoomState');if(typeof sanitize==='function'&&!sanitize.__v362Toji){const wrapped=function(){const state=sanitize.apply(this,arguments);return normalizeTojiState(state);};wrapped.__v362Toji=true;setGlobal('sanitizeRoomState',wrapped);}
  const adjust=getGlobal('adjustRoomStateObject');if(typeof adjust==='function'&&!adjust.__v362Toji){const wrapped=function(player){const out=adjust.apply(this,arguments);if(player?.characterId==='toji')normalizeTojiState(player.state);return out;};wrapped.__v362Toji=true;setGlobal('adjustRoomStateObject',wrapped);}
  applyLocalTojiFix({save:false});
}

/* =========================================================
   YUTA: COMPATIBILITA COMPLETA DELLA TECNICA COPIA
   ========================================================= */
function copiedSource(){try{return getGlobal('getYutaCopiedSource')?.()||null;}catch(_){return null;}}
function copiedUsedBefore(){const used=read('used',[]);return Array.isArray(used)&&used.includes('copia');}
function copiedUsedAfter(before){return !before&&copiedUsedBefore();}
function isCopiedCombat(src){
  const t=src?.t,id=src?.characterId;if(!t)return false;
  return typeof t.bonus==='number'||!!t.dynamicCost||!!t.itadoriBlackFlash||!!t.convertAllEnergy||!!t.opponentMalus||(id==='sukuna'&&t.key==='solitudine')||(id==='mahito'&&t.key==='perfetta')||(id==='jogo'&&t.key==='calore')||(id==='megumi'&&t.key==='giardino');
}
function consumeCopiedChosoBonusOnSuccess(success,bossFree){if(success&&!bossFree&&num(read('itadoriOneUse',0))>0)write('itadoriOneUse',0);}
function handleCopiedTamamo(copyCard,src){
  const raw=prompt('Tira 1d6 per Tamamo-no-Mae e inserisci il risultato (1-6):');if(raw===null)return true;
  const roll=Number(raw);if(!Number.isInteger(roll)||roll<1||roll>6){show('Dado non valido','','Inserisci un risultato da 1 a 6.');return true;}
  getGlobal('markYutaCopyUsed')?.(copyCard,src.t,0);
  const before=num(read('yutaCopiedTokens',0)),gain=roll>=5?2:0;write('yutaCopiedTokens',before+gain);
  const text='Risultato '+roll+'. '+(gain?'Ottieni 2 Segnalini Maledetti copiati: '+before+' → '+(before+gain)+'.':'Con 1-4 non ottieni Segnalini.');
  log('Copia: '+src.t.name,text);saveAndRender();play(src.t);show('Copia: '+src.t.name,gain?'+2 Segnalini':'Nessun Segnalino',text);return true;
}
function handleCopiedChoso(copyCard,src){
  const bossFree=isBossFree(),beforeLife=num(read('life',0));
  getGlobal('markYutaCopyUsed')?.(copyCard,src.t,0);
  const result=getGlobal('applyTechniqueLifeCost')?.(src.t.lifeCost||3,'Copia: '+src.t.name)||{respawned:false,text:''};
  write('itadoriOneUse',result.respawned?0:3);
  const now=num(read('life',0));
  const text='Vita '+beforeLife+' → '+now+'. '+(result.respawned?'Il respawn annulla il bonus.':'Yuta prepara +3 Corpo monouso per la prossima tecnica da combattimento.')+(bossFree?' Boss Rush: il costo Vita è annullato.':'');
  log('Copia: '+src.t.name,text);saveAndRender();play(src.t);show(result.respawned?'Sei morto, torni al respawn':'Copia: '+src.t.name,result.respawned?'Bonus annullato':'+3 Corpo pronto',text);return true;
}
function handleCopiedJogoHeal(copyCard,src){
  getGlobal('markYutaCopyUsed')?.(copyCard,src.t,0);
  const before=num(read('life',0)),max=num(currentCharacter()?.maxLife||7),after=Math.min(max,before+1);write('life',after);
  const text='Vita '+before+' → '+after+' / '+max+'. Yuta copia il recupero di Jogo senza superare la propria Vita massima e rinuncia al movimento del turno.';
  log('Copia: '+src.t.name,text);saveAndRender();play(src.t);show('Copia: '+src.t.name,'Vita '+after+' / '+max,text);return true;
}
function updateYutaPendingUi(){
  const panel=document.getElementById('yutaPanel');if(!panel)return;
  let note=document.getElementById('v362YutaCopiedChoso');
  if(!note){note=document.createElement('div');note.id='v362YutaCopiedChoso';note.style.cssText='display:none;margin-top:10px;padding:10px 12px;border:1px solid #b23f54;border-radius:12px;background:#3a101bcc;color:#ffd9df;font-weight:900;text-align:center';panel.appendChild(note);}
  const pending=currentId()==='yuta'?num(read('itadoriOneUse',0)):0;note.style.display=pending>0?'block':'none';note.textContent=pending>0?'Aiuto di Choso copiato: +'+pending+' Corpo pronto per la prossima tecnica da combattimento':'';
}
function installYutaCopyFix(){
  const charsMap=chars();
  if(charsMap.megumi){const domain=charsMap.megumi.techniques?.find(t=>t.key==='giardino');if(domain)domain.extra='Teletrasporta lo Shikigami nella tua casella e somma automaticamente la sua forza (+3 Corpo dal G3 in poi). Se fai 1 o 2 col dado, perdi 1 Vita.';}

  const execute=getGlobal('executeYutaCopiedTechnique');
  if(typeof execute==='function'&&!execute.__v362Copy){
    const wrapped=function(copyCard){
      if(rankOf(gradeId())<RANK.G2)return execute.apply(this,arguments);
      const src=copiedSource();if(!src)return execute.apply(this,arguments);
      if(src.characterId==='geto'&&src.t.key==='tamamo')return handleCopiedTamamo(copyCard,src);
      if(src.characterId==='itadori'&&src.t.key==='aiuto_choso')return handleCopiedChoso(copyCard,src);
      if(src.characterId==='jogo'&&src.t.key==='inversione')return handleCopiedJogoHeal(copyCard,src);

      const pending=num(read('itadoriOneUse',0));
      const usePending=pending>0&&isCopiedCombat(src);
      const oldCombat=num(read('combatBonus',0));
      const before=copiedUsedBefore();
      const bossFree=isBossFree();
      let oldBonus,oldExtra;
      if(usePending)write('combatBonus',oldCombat+pending);
      if(src.characterId==='megumi'&&src.t.key==='giardino'){
        oldBonus=src.t.bonus;oldExtra=src.t.extra;
        src.t.bonus=num(src.t.bonus)+3;
        src.t.extra='Bonus Dominio '+oldBonus+' + forza dello Shikigami 3. '+(oldExtra||'');
      }
      let out;
      try{out=execute.apply(this,arguments);}finally{
        if(src.characterId==='megumi'&&src.t.key==='giardino'){src.t.bonus=oldBonus;src.t.extra=oldExtra;}
        if(usePending)write('combatBonus',oldCombat);
      }
      const success=copiedUsedAfter(before);
      consumeCopiedChosoBonusOnSuccess(success,bossFree);
      if(usePending||success){try{getGlobal('saveState')?.();getGlobal('renderAll')?.();}catch(_){} }
      updateYutaPendingUi();
      return out;
    };
    wrapped.__v362Copy=true;setGlobal('executeYutaCopiedTechnique',wrapped);
  }

  const reset=getGlobal('resetYutaCopiedResources');if(typeof reset==='function'&&!reset.__v362Copy){const wrapped=function(){write('itadoriOneUse',0);const out=reset.apply(this,arguments);updateYutaPendingUi();return out;};wrapped.__v362Copy=true;setGlobal('resetYutaCopiedResources',wrapped);}
  const forget=getGlobal('forgetYutaCopy');if(typeof forget==='function'&&!forget.__v362Copy){const wrapped=function(){const before=read('yutaCopiedTechnique',null),out=forget.apply(this,arguments);if(before&&!read('yutaCopiedTechnique',null)){write('itadoriOneUse',0);saveAndRender();}updateYutaPendingUi();return out;};wrapped.__v362Copy=true;setGlobal('forgetYutaCopy',wrapped);}
  const panel=getGlobal('updateYutaPanel');if(typeof panel==='function'&&!panel.__v362Copy){const wrapped=function(){const out=panel.apply(this,arguments);updateYutaPendingUi();return out;};wrapped.__v362Copy=true;setGlobal('updateYutaPanel',wrapped);}
}

/* =========================================================
   MEGUMI: IL DOMINIO INCLUDE SEMPRE LO SHIKIGAMI
   ========================================================= */
function techniqueSucceeded(key,beforeUsed){const now=read('used',[]);return !beforeUsed.includes(key)&&Array.isArray(now)&&now.includes(key);}
function isYutaOwnCombat(t){return !!t&&(typeof t.bonus==='number'||!!t.yutaOpponentMalus||!!t.yutaDomain);}
function installUseTechniqueFix(){
  const original=getGlobal('useTechnique');if(typeof original!=='function'||original.__v362Rules)return;
  const wrapped=function(key){
    const id=currentId(),current=currentCharacter(),t=current?.techniques?.find(x=>x.key===key),beforeUsed=Array.isArray(read('used',[]))?[...read('used',[])]:[];

    if(id==='megumi'&&key==='giardino'&&t){
      const bossFree=isBossFree(),cost=getGlobal('mcDiscountCost')?.('megumi',num(t.cost))??num(t.cost),en=num(read('energy',0));
      if(!bossFree&&en<cost)return original.apply(this,arguments);
      const previous=!!read('megumiCompanionOn',false);write('megumiCompanionOn',true);
      const out=original.apply(this,arguments);
      if(!techniqueSucceeded(key,beforeUsed))write('megumiCompanionOn',previous);
      else log('Giardino delle Ombre Chimera','Lo Shikigami viene teletrasportato nella casella di Megumi: la sua forza +3 è inclusa automaticamente nel totale.');
      saveAndRender();return out;
    }

    if(id==='yuta'&&key!=='copia'&&num(read('itadoriOneUse',0))>0&&isYutaOwnCombat(t)){
      const pending=num(read('itadoriOneUse',0)),oldCombat=num(read('combatBonus',0)),bossFree=isBossFree();
      write('combatBonus',oldCombat+pending);
      let out;try{out=original.apply(this,arguments);}finally{write('combatBonus',oldCombat);}
      const success=techniqueSucceeded(key,beforeUsed);if(success&&!bossFree)write('itadoriOneUse',0);
      saveAndRender();updateYutaPendingUi();return out;
    }

    return original.apply(this,arguments);
  };
  wrapped.__v362Rules=true;setGlobal('useTechnique',wrapped);
}

function auditYutaCopy(){
  const map=chars(),rows=[];
  Object.entries(map).forEach(([characterId,ch])=>{if(characterId==='yuta')return;(ch.techniques||[]).forEach(t=>rows.push(characterId+':'+t.key));});
  window.JJKYutaCopyAudit={version:VERSION,totalTechniques:rows.length,techniques:rows,specialFixes:['geto:tamamo','itadori:aiuto_choso','jogo:inversione','megumi:giardino','sukuna:solitudine','mahito:perfetta','itadori:black_flash_itadori','sukuna:worldslash','itadori:taglio_itadori','itadori:risveglio_totale']};
}
function init(){
  installTojiFix();
  installYutaCopyFix();
  installUseTechniqueFix();
  auditYutaCopy();
  updateYutaPendingUi();
  setInterval(()=>{applyLocalTojiFix({save:false});updateYutaPendingUi();},1500);
  console.info('JJK Energy V36.2 rules hotfix ready',VERSION,window.JJKYutaCopyAudit);
}

window.JJKV362={version:VERSION,applyTojiFix:applyLocalTojiFix,auditYutaCopy};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
