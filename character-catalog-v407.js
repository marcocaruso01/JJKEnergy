/* JJK Energy V40.7 - Character Catalog foundation */
(function(root){
'use strict';
if(root.__JJK_CHARACTER_CATALOG_V407__)return;
root.__JJK_CHARACTER_CATALOG_V407__=true;

const VERSION='40.7.0';

function legacyCharacters(){
  try{
    const value=(0,eval)('characters');
    if(value&&typeof value==='object')return value;
  }catch(_){}
  return root.characters&&typeof root.characters==='object'?root.characters:{};
}
function normalizeId(value){return String(value??'').trim();}
function ids(){return Object.keys(legacyCharacters());}
function has(characterId){return Object.prototype.hasOwnProperty.call(legacyCharacters(),normalizeId(characterId));}
function get(characterId){return legacyCharacters()[normalizeId(characterId)]||null;}
function entries(){return ids().map(characterId=>[characterId,get(characterId)]);}
function legacy(){return legacyCharacters();}
function technique(characterId,techniqueKey){
  const character=get(characterId),key=normalizeId(techniqueKey);
  if(!character||!Array.isArray(character.techniques)||!key)return null;
  return character.techniques.find(item=>normalizeId(item?.key)===key)||null;
}
function grade(characterId,gradeId){
  const character=get(characterId),key=normalizeId(gradeId);
  if(!character||!Array.isArray(character.grades)||!key)return null;
  return character.grades.find(item=>normalizeId(item?.id)===key)||null;
}
function validate(){
  const issues=[];
  for(const [characterId,character] of entries()){
    if(!character||typeof character!=='object'){issues.push(characterId+': character object missing');continue;}
    if(!normalizeId(character.name))issues.push(characterId+': name missing');
    if(!Number.isFinite(Number(character.maxLife)))issues.push(characterId+': maxLife invalid');
    if(!Number.isFinite(Number(character.baseBody)))issues.push(characterId+': baseBody invalid');
    if(!Array.isArray(character.grades)||!character.grades.length)issues.push(characterId+': grades missing');
    else{
      const seen=new Set();
      character.grades.forEach((item,index)=>{
        const key=normalizeId(item?.id);
        if(!key)issues.push(characterId+': grade '+index+' id missing');
        else if(seen.has(key))issues.push(characterId+': duplicate grade '+key);
        else seen.add(key);
      });
    }
    if(!Array.isArray(character.techniques))issues.push(characterId+': techniques missing');
    else{
      const seen=new Set();
      character.techniques.forEach((item,index)=>{
        const key=normalizeId(item?.key);
        if(!key)issues.push(characterId+': technique '+index+' key missing');
        else if(seen.has(key))issues.push(characterId+': duplicate technique '+key);
        else seen.add(key);
        if(!normalizeId(item?.name))issues.push(characterId+': technique '+(key||index)+' name missing');
        if(!normalizeId(item?.grade))issues.push(characterId+': technique '+(key||index)+' grade missing');
      });
    }
  }
  if(!ids().length)issues.push('character catalog is empty');
  return issues;
}
function audit(){
  const list=ids(),issues=validate();
  const techniqueCount=list.reduce((total,characterId)=>total+(get(characterId)?.techniques?.length||0),0);
  const checks={version:VERSION,count:list.length,ids:list,techniqueCount,issues,ok:issues.length===0};
  root.JJKCharacterCatalogAudit=checks;
  return checks;
}

const api=Object.freeze({version:VERSION,ids,has,get,entries,legacy,technique,grade,validate,audit});
root.JJKCharacterCatalog=api;
root.JJKCatalog=api;
try{audit();}catch(error){console.warn('JJK Character Catalog audit failed',error);}
console.info('JJK Energy Character Catalog ready',VERSION);
})(typeof window!=='undefined'?window:globalThis);
