'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const button={id:'v36OtherSheetsBtn',setAttribute(){}};
const context={
  console,
  prompt:()=> '16',
  setTimeout:()=>0,
  clearTimeout:()=>{},
  MutationObserver:class{observe(){}},
  document:{
    readyState:'complete',
    documentElement:{dataset:{}},
    body:{style:{},appendChild(){}},
    head:{appendChild(){}},
    addEventListener(){},
    createElement(){return {id:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},appendChild(){},addEventListener(){},querySelector(){return null;},innerHTML:''};},
    getElementById(id){if(id==='v36OtherSheetsBtn'&&button.id==='v36OtherSheetsBtn')return button;if(id==='v39OtherSheetsBtn'&&button.id==='v39OtherSheetsBtn')return button;return null;}
  }
};
context.window=context;
context.globalThis=context;
vm.createContext(context);
vm.runInContext(`
let characters={
  jogo:{image:'jogo.png'},
  itadori:{image:'itadori.webp'},
  sukuna:{name:'Sukuna',baseBody:10,techniques:[{key:'worldslash',name:'World Slash',dynamicCost:true}]}
};
let currentId='sukuna';
let current=characters.sukuna;
let energy=14;
let used=[];
let combatBonus=0;
let roomSession=null;
let modalResult=null;
function useTechnique(){throw new Error('legacy dynamic handler was called');}
function roomActionAllowed(){return true;}
function isBossRushFree(){return false;}
function effectiveBaseBody(){return 10;}
function recordTechniqueUse(){}
function addLog(){}
function saveState(){}
function renderAll(){}
function playTechniqueEffect(){}
function showModal(title,value,text){modalResult={title,value,text};}
function getLocalRoomPlayer(){return null;}
`,context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','v39-stable.js'),'utf8'),context,{filename:'v39-stable.js'});
const state=vm.runInContext(`useTechnique('worldslash');({energy,used,modalResult,patched:useTechnique.__v39})`,context);
assert.equal(state.energy,0);
assert.deepEqual(Array.from(state.used),['worldslash']);
assert.equal(state.modalResult.value,'24 Combattimento');
assert.match(state.modalResult.text,/Corpo applicato 14/);
assert.equal(state.patched,true);
assert.equal(button.id,'v39OtherSheetsBtn');
console.log('V39 browser smoke test passed');
