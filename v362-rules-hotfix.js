/* JJK Energy V36.2 - correzioni regole Toji, Yuta e Megumi */
(function(){
'use strict';
const VERSION='36.2.1',R={G4:0,G3:1,G2:2,G1:3,SS:4,SG:5},TOJI_KEY='jjk_toji_v362_active';
const n=v=>Number.isFinite(Number(v))?Number(v):0;
function get(name){try{return window[name]||eval(name);}catch(_){return window[name];}}
function read(name,fallback=null){try{const v=eval(name);return v===undefined?fallback:v;}catch(_){return window[name]===undefined?fallback:window[name];}}
function write(name,value){window.__jjk362=value;try{eval(name+' = window.__jjk362');}catch(_){window[name]=value;}delete window.__jjk362;}
function set(name,fn){window[name]=fn;window.__jjk362=fn;try{eval(name+' = window.__jjk362');}catch(_){}delete window.__jjk362;}
const chars=()=>read('characters',window.characters||{}),cid=()=>read('currentId',null),gid=()=>read('gradeId','G4'),cur=()=>read('current',null);
const bossFree=()=>{try{return !!get('isBossRushFree')?.();}catch(_){return false;}};
const rank=x=>R[x]??0;
function render(){try{get('saveState')?.();}catch(_){}try{get('renderAll')?.();}catch(_){} }
function modal(a,b,c){try{get('showModal')?.(a,b,c);}catch(_){} }
function addLog(a,b){try{get('addLog')?.(a,b);}catch(_){} }
function fx(t){try{get('playTechniqueEffect')?.(t);}catch(_){} }
function wrap(name,flag,factory){const original=get(name);if(typeof original!=='function'||original[flag])return;const next=factory(original);next[flag]=true;set(name,next);}

/* Toji: da SS e SG Vita massima 10, con +2 Vita una sola volta al passaggio. */
function tojiActive(id=cid(),grade=gid()){return id==='toji'&&rank(grade)>=R.SS;}
function fixTojiLocal(save=true){const toji=chars().toji;if(!toji)return false;const active=tojiActive();toji.maxLife=active?10:8;if(cid()==='toji'){
 let life=Math.max(0,n(read('life',active?10:8))),was=localStorage.getItem(TOJI_KEY)==='1';
 if(active&&!was){life=Math.min(10,life+2);localStorage.setItem(TOJI_KEY,'1');}
 if(!active&&was){life=Math.min(8,life);localStorage.setItem(TOJI_KEY,'0');}
 write('life',life);const max=document.getElementById('lifeMaxValue');if(max)max.textContent=active?'10':'8';if(save)try{get('saveState')?.();}catch(_){}
 }return active;}
function fixTojiState(s){if(!s||s.characterId!=='toji')return s;const active=rank(s.gradeId||'G4')>=R.SS,was=!!s.tojiV362Active;let life=Math.max(0,n(s.life));if(active&&!was)life=Math.min(10,life+2);if(!active)life=Math.min(8,life);s.tojiV362Active=active;s.tojiMonsterActive=active;s.maxLife=active?10:8;s.life=life;return s;}
function installToji(){
 ['renderHeader','updateBars','changeLife','applyTechniqueLifeCost'].forEach(name=>wrap(name,'__v362Toji',original=>function(){const out=original.apply(this,arguments);fixTojiLocal(false);return out;}));
 wrap('openCharacter','__v362Toji',original=>function(){const out=original.apply(this,arguments);fixTojiLocal(true);try{get('renderAll')?.();}catch(_){}return out;});
 wrap('syncGrade','__v362Toji',original=>function(){const before=gid(),out=original.apply(this,arguments),after=gid();fixTojiLocal(true);if(cid()==='toji'&&rank(before)<R.SS&&rank(after)>=R.SS)addLog('Mostro Senza Energia Maledetta','Vita massima 10: Toji ottiene immediatamente +2 Vita.');try{get('renderAll')?.();}catch(_){}return out;});
 wrap('startNewGame','__v362Toji',original=>function(){localStorage.setItem(TOJI_KEY,'0');const t=chars().toji;if(t)t.maxLife=8;return original.apply(this,arguments);});
 wrap('buildLocalPlayerState','__v362Toji',original=>function(){fixTojiLocal(false);return fixTojiState(original.apply(this,arguments));});
 wrap('createInitialRoomPlayerState','__v362Toji',original=>function(id){const s=original.apply(this,arguments);if(id==='toji'&&s){s.life=8;s.maxLife=8;s.tojiV362Active=false;s.tojiMonsterActive=false;}return s;});
 wrap('sanitizeRoomState','__v362Toji',original=>function(){return fixTojiState(original.apply(this,arguments));});
 wrap('adjustRoomStateObject','__v362Toji',original=>function(player){const out=original.apply(this,arguments);if(player?.characterId==='toji')fixTojiState(player.state);return out;});
 fixTojiLocal(false);
}

/* Yuta: correzione degli effetti speciali che il motore generico non applicava. */
const copySource=()=>{try{return get('getYutaCopiedSource')?.()||null;}catch(_){return null;}};
const copyUsed=()=>Array.isArray(read('used',[]))&&read('used',[]).includes('copia');
function markCopy(card,t,cost=0){get('markYutaCopyUsed')?.(card,t,cost);}
function copyTamamo(card,src){const raw=prompt('Tira 1d6 per Tamamo-no-Mae e inserisci il risultato (1-6):');if(raw===null)return;const roll=Number(raw);if(!Number.isInteger(roll)||roll<1||roll>6){modal('Dado non valido','','Inserisci un risultato da 1 a 6.');return;}markCopy(card,src.t,0);const before=n(read('yutaCopiedTokens',0)),gain=roll>=5?2:0;write('yutaCopiedTokens',before+gain);const text='Risultato '+roll+'. '+(gain?'Segnalini copiati '+before+' → '+(before+gain)+'.':'Nessun Segnalino ottenuto.');addLog('Copia: '+src.t.name,text);render();fx(src.t);modal('Copia: '+src.t.name,gain?'+2 Segnalini':'Nessun Segnalino',text);}
function copyChoso(card,src){const before=n(read('life',0));markCopy(card,src.t,0);const result=get('applyTechniqueLifeCost')?.(src.t.lifeCost||3,'Copia: '+src.t.name)||{respawned:false,text:''};write('itadoriOneUse',result.respawned?0:3);const text='Vita '+before+' → '+n(read('life',0))+'. '+(result.respawned?'Il respawn annulla il bonus.':'Yuta prepara +3 Corpo per la prossima tecnica da combattimento.');addLog('Copia: '+src.t.name,text);render();fx(src.t);modal('Copia: '+src.t.name,result.respawned?'Bonus annullato':'+3 Corpo pronto',text);}
function copyJogoHeal(card,src){markCopy(card,src.t,0);const before=n(read('life',0)),max=n(cur()?.maxLife||7),after=Math.min(max,before+1);write('life',after);const text='Vita '+before+' → '+after+' / '+max+'. Yuta rinuncia al movimento del turno.';addLog('Copia: '+src.t.name,text);render();fx(src.t);modal('Copia: '+src.t.name,'Vita '+after+' / '+max,text);}
function copiedCombat(src){const t=src?.t,id=src?.characterId;return !!t&&(typeof t.bonus==='number'||t.dynamicCost||t.itadoriBlackFlash||t.convertAllEnergy||t.opponentMalus||(id==='sukuna'&&t.key==='solitudine')||(id==='mahito'&&t.key==='perfetta')||(id==='jogo'&&t.key==='calore')||(id==='megumi'&&t.key==='giardino'));}
function updateYutaNote(){const panel=document.getElementById('yutaPanel');if(!panel)return;let el=document.getElementById('v362YutaChoso');if(!el){el=document.createElement('div');el.id='v362YutaChoso';el.style.cssText='display:none;margin-top:10px;padding:10px;border:1px solid #b23f54;border-radius:12px;background:#3a101bcc;color:#ffd9df;font-weight:900;text-align:center';panel.appendChild(el);}const v=cid()==='yuta'?n(read('itadoriOneUse',0)):0;el.style.display=v?'block':'none';el.textContent=v?'Aiuto di Choso copiato: +'+v+' Corpo pronto':'';}
function installYuta(){
 const megumi=chars().megumi,domain=megumi?.techniques?.find(t=>t.key==='giardino');if(domain)domain.extra='Teletrasporta lo Shikigami nella tua casella e somma automaticamente la sua forza (+3 Corpo). Se fai 1 o 2 col dado, perdi 1 Vita.';
 wrap('executeYutaCopiedTechnique','__v362Copy',original=>function(card){const src=copySource();if(!src||rank(gid())<R.G2)return original.apply(this,arguments);if(src.characterId==='geto'&&src.t.key==='tamamo')return copyTamamo(card,src);if(src.characterId==='itadori'&&src.t.key==='aiuto_choso')return copyChoso(card,src);if(src.characterId==='jogo'&&src.t.key==='inversione')return copyJogoHeal(card,src);
  const before=copyUsed(),pending=n(read('itadoriOneUse',0)),usePending=pending>0&&copiedCombat(src),oldCombat=n(read('combatBonus',0));let oldBonus,oldExtra;if(usePending)write('combatBonus',oldCombat+pending);if(src.characterId==='megumi'&&src.t.key==='giardino'){oldBonus=src.t.bonus;oldExtra=src.t.extra;src.t.bonus=n(src.t.bonus)+3;src.t.extra='Forza Shikigami +3 inclusa. '+(oldExtra||'');}
  let out;try{out=original.apply(this,arguments);}finally{if(usePending)write('combatBonus',oldCombat);if(src.characterId==='megumi'&&src.t.key==='giardino'){src.t.bonus=oldBonus;src.t.extra=oldExtra;}}
  const success=!before&&copyUsed();if(success&&usePending&&!bossFree())write('itadoriOneUse',0);if(success||usePending)render();updateYutaNote();return out;
 });
 wrap('resetYutaCopiedResources','__v362Copy',original=>function(){write('itadoriOneUse',0);const out=original.apply(this,arguments);updateYutaNote();return out;});
 wrap('forgetYutaCopy','__v362Copy',original=>function(){const before=read('yutaCopiedTechnique',null),out=original.apply(this,arguments);if(before&&!read('yutaCopiedTechnique',null)){write('itadoriOneUse',0);render();}updateYutaNote();return out;});
 wrap('updateYutaPanel','__v362Copy',original=>function(){const out=original.apply(this,arguments);updateYutaNote();return out;});
}

/* Megumi: Giardino delle Ombre porta lo Shikigami con sé prima del calcolo. */
function success(key,before){const now=read('used',[]);return Array.isArray(now)&&!before.includes(key)&&now.includes(key);}
function installUseTechnique(){wrap('useTechnique','__v362Rules',original=>function(key){const id=cid(),t=cur()?.techniques?.find(x=>x.key===key),before=Array.isArray(read('used',[]))?[...read('used',[])]:[];
 if(id==='megumi'&&key==='giardino'&&t){const previous=!!read('megumiCompanionOn',false);write('megumiCompanionOn',true);const out=original.apply(this,arguments);if(!success(key,before))write('megumiCompanionOn',previous);else addLog('Giardino delle Ombre Chimera','Lo Shikigami viene teletrasportato: +3 Corpo incluso nel totale del Dominio.');render();return out;}
 if(id==='yuta'&&key!=='copia'&&n(read('itadoriOneUse',0))>0&&(typeof t?.bonus==='number'||t?.yutaOpponentMalus||t?.yutaDomain)){const bonus=n(read('itadoriOneUse',0)),old=n(read('combatBonus',0));write('combatBonus',old+bonus);let out;try{out=original.apply(this,arguments);}finally{write('combatBonus',old);}if(success(key,before)&&!bossFree())write('itadoriOneUse',0);render();updateYutaNote();return out;}
 return original.apply(this,arguments);
 });}
function audit(){const list=[];Object.entries(chars()).forEach(([id,ch])=>{if(id!=='yuta')(ch.techniques||[]).forEach(t=>list.push(id+':'+t.key));});window.JJKYutaCopyAudit={version:VERSION,totalTechniques:list.length,techniques:list,corrected:['geto:tamamo','itadori:aiuto_choso','jogo:inversione','megumi:giardino']};}
function init(){installToji();installYuta();installUseTechnique();audit();updateYutaNote();setInterval(()=>{fixTojiLocal(false);updateYutaNote();},1500);console.info('JJK Energy V36.2 rules ready',window.JJKYutaCopyAudit);}
window.JJKV362={version:VERSION,fixToji:fixTojiLocal,audit};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
