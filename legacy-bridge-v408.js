/* JJK Energy V40.8 - legacy state bridge */
(function(root){
'use strict';
if(root.__JJK_LEGACY_BRIDGE_V408__)return;
root.__JJK_LEGACY_BRIDGE_V408__=true;

const VERSION='40.8.0';
const FIELDS=Object.freeze([
  'currentId','current','gradeId','energy','exp','log','used','tokens','combatBonus','life',
  'jogoLife','jogoHeat','getoOneUse','tojiCollectedEnergy','megumiCompanionOn','itadoriFingers',
  'itadoriMaxFingers','itadoriOneUse','yutaKatanaActive','yutaCopiedTechnique','yutaCopiedTokens',
  'yutaCopiedVigor','yutaCopiedFingers','yutaCopiedMaxFingers','yutaCopiedHeat','bossRushActive'
]);
const FIELD_SET=new Set(FIELDS);

function assertField(name){
  if(!FIELD_SET.has(name))throw new Error('Unknown JJK legacy state field: '+name);
}
function read(name){
  assertField(name);
  try{return (0,eval)(name);}catch(error){
    if(Object.prototype.hasOwnProperty.call(root,name))return root[name];
    throw error;
  }
}
function write(name,value){
  assertField(name);
  const slot='__JJK_V408_LEGACY_WRITE__';
  root[slot]=value;
  try{
    (0,eval)(name+'=globalThis.'+slot);
    return read(name);
  }finally{
    try{delete root[slot];}catch(_){}
  }
}
function readAll(){
  const out={};
  FIELDS.forEach(name=>{out[name]=read(name);});
  return out;
}
function resolveFunction(name){
  try{
    const value=(0,eval)(String(name));
    if(typeof value==='function')return value;
  }catch(_){}
  return typeof root[name]==='function'?root[name]:null;
}
function invoke(name){
  const fn=resolveFunction(name);
  if(!fn)throw new Error('JJK legacy function is unavailable: '+name);
  return fn.apply(root,Array.prototype.slice.call(arguments,1));
}
function audit(){
  const issues=[];
  const values={};
  for(const name of FIELDS){
    try{values[name]=read(name);}catch(error){issues.push(name+': unreadable');}
  }
  const characterId=values.currentId;
  if(characterId&&root.JJKCharacterCatalog){
    const catalogCharacter=root.JJKCharacterCatalog.get(characterId);
    if(!catalogCharacter)issues.push('currentId is missing from Character Catalog: '+characterId);
    else if(values.current!==catalogCharacter)issues.push('current character identity diverged from Character Catalog');
  }
  const checks={version:VERSION,fieldCount:FIELDS.length,fields:[...FIELDS],issues,ok:issues.length===0};
  root.JJKLegacyBridgeAudit=checks;
  return checks;
}

const api=Object.freeze({version:VERSION,fields:FIELDS,read,write,readAll,resolveFunction,invoke,audit});
root.JJKLegacyBridge=api;
try{root.dispatchEvent(new CustomEvent('jjk:legacy-bridge-ready',{detail:{version:VERSION,fieldCount:FIELDS.length}}));}catch(_){}
console.info('JJK Energy Legacy Bridge ready',VERSION);
})(typeof window!=='undefined'?window:globalThis);
