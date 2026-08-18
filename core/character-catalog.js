/* JJK 2.0 - immutable character catalog bridge over V40.4 definitions */
(function(root){
'use strict';
if(root.JJK2CharacterCatalog)return;

const VERSION='2.0.0-alpha.1';
let snapshot=Object.freeze({});
let fingerprint='';
let refreshedAt=0;

function readLegacyCharacters(){
  try{
    const value=(0,eval)('characters');
    if(value&&typeof value==='object')return value;
  }catch(_){ }
  return root.characters&&typeof root.characters==='object'?root.characters:null;
}

function cloneValue(value,seen=new WeakMap()){
  if(value===null||typeof value!=='object')return value;
  if(seen.has(value))return seen.get(value);
  if(Array.isArray(value)){
    const copy=[];
    seen.set(value,copy);
    value.forEach(item=>copy.push(cloneValue(item,seen)));
    return copy;
  }
  if(value instanceof Date)return new Date(value.getTime());
  const copy={};
  seen.set(value,copy);
  Object.keys(value).forEach(key=>{copy[key]=cloneValue(value[key],seen);});
  return copy;
}

function deepFreeze(value,seen=new WeakSet()){
  if(value===null||(typeof value!=='object'&&typeof value!=='function')||seen.has(value))return value;
  seen.add(value);
  Object.getOwnPropertyNames(value).forEach(key=>deepFreeze(value[key],seen));
  return Object.freeze(value);
}

function makeFingerprint(source){
  try{
    return JSON.stringify(Object.entries(source).map(([id,ch])=>[
      id,
      ch?.name||'',
      ch?.maxLife??null,
      ch?.baseBody??null,
      (ch?.grades||[]).map(g=>[g.id,g.exp,g.max]),
      (ch?.techniques||[]).map(t=>[t.key,t.name,t.grade,t.cost,t.tokenCost,t.dynamicCost])
    ]));
  }catch(_){return String(Date.now());}
}

function emit(type,detail){
  try{root.dispatchEvent(new CustomEvent(type,{detail}));}catch(_){ }
}

function refreshFromLegacy(options={}){
  const source=readLegacyCharacters();
  if(!source)return false;
  const nextFingerprint=makeFingerprint(source);
  if(!options.force&&nextFingerprint===fingerprint&&Object.keys(snapshot).length)return true;
  const next={};
  Object.entries(source).forEach(([id,definition])=>{
    const copy=cloneValue(definition);
    if(copy&&typeof copy==='object'&&!Object.prototype.hasOwnProperty.call(copy,'id'))copy.id=id;
    next[id]=deepFreeze(copy);
  });
  snapshot=deepFreeze(next);
  fingerprint=nextFingerprint;
  refreshedAt=Date.now();
  emit('jjk2:catalog-ready',{version:VERSION,count:Object.keys(snapshot).length,refreshedAt});
  return true;
}

function get(id){return id&&Object.prototype.hasOwnProperty.call(snapshot,id)?snapshot[id]:null;}
function has(id){return !!get(id);}
function ids(){return Object.keys(snapshot);}
function list(){return ids().map(id=>snapshot[id]);}
function techniques(id){return get(id)?.techniques||Object.freeze([]);}
function grades(id){return get(id)?.grades||Object.freeze([]);}
function audit(){
  const legacy=readLegacyCharacters();
  const catalogIds=ids();
  return Object.freeze({
    ok:!!legacy&&catalogIds.length>0,
    version:VERSION,
    source:'V40.4 legacy definitions',
    characterCount:catalogIds.length,
    legacyCharacterCount:legacy?Object.keys(legacy).length:0,
    refreshedAt
  });
}

root.JJK2CharacterCatalog=Object.freeze({
  version:VERSION,
  refreshFromLegacy,
  get,
  has,
  ids,
  list,
  techniques,
  grades,
  audit
});

refreshFromLegacy({force:true});
})(window);
