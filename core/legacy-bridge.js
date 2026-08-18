/* JJK 2.0 - legacy bridge lifecycle */
(function(root){
'use strict';
if(root.JJK2LegacyBridge)return;

const VERSION='2.0.0-alpha.3';
let installed=false;
let syncCount=0;
let lastReason='never';
let lastSyncedAt=0;

function refreshCatalog(force=false){
  try{return !!root.JJK2CharacterCatalog?.refreshFromLegacy?.({force});}
  catch(_){return false;}
}

function sync(reason='manual'){
  try{
    const state=root.JJK2GameState?.syncFromLegacy?.(reason)||null;
    syncCount+=1;
    lastReason=reason