/* JJK Energy - SFX sintetici leggeri + predisposizione voci personaggio */
(function(){
'use strict';
const STORAGE_KEY='jjk_sfx_enabled_v1';
const VOLUME_KEY='jjk_sfx_volume_v1';
function storageGet(key){try{return localStorage.getItem(key);}catch(e){return null;}}
function storageSet(key,value){try{localStorage.setItem(key,value);}catch(e){}}
let enabled=storageGet(STORAGE_KEY)!=='0';
const rawSavedVolume=storageGet(VOLUME_KEY),savedVolume=rawSavedVolume===null?NaN:Number(rawSavedVolume);
let volume=Number.isFinite(savedVolume)?Math.max(0,Math.min(1,savedVolume)):.8;
let ctx=null,lastAt=0;
function audioContext(){
  if(ctx)return ctx;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return null;
  ctx=new AC();
  return ctx;
}
function resume(){const c=audioContext();if(c&&c.state==='suspended')return c.resume().catch(()=>{});return Promise.resolve();}
function tone({from=260,to=from,duration=.055,type='sine',gain=.035,delay=0}={}){
  if(!enabled)return;
  const c=audioContext();if(!c)return;
  const start=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();
  o.type=type;o.frequency.setValueAtTime(Math.max(30,from),start);o.frequency.exponentialRampToValueAtTime(Math.max(30,to),start+duration);
  g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.0001,gain*volume),start+.008);g.gain.exponentialRampToValueAtTime(.0001,start+duration);
  o.connect(g).connect(c.destination);o.start(start);o.stop(start+duration+.015);
}
function noise(duration=.07,gain=.02,delay=0){
  if(!enabled)return;const c=audioContext();if(!c)return;
  const length=Math.max(1,Math.floor(c.sampleRate*duration)),buffer=c.createBuffer(1,length,c.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
  const src=c.createBufferSource(),g=c.createGain(),filter=c.createBiquadFilter();src.buffer=buffer;filter.type='bandpass';filter.frequency.value=950;filter.Q.value=.65;g.gain.value=gain*volume;src.connect(filter).connect(g).connect(c.destination);src.start(c.currentTime+delay);
}
const sounds={
  click(){tone({from:290,to:350,duration:.045,type:'triangle',gain:.026});},
  nav(){tone({from:360,to:470,duration:.06,type:'sine',gain:.03});},
  confirm(){tone({from:410,to:510,duration:.075,type:'sine',gain:.032});tone({from:610,to:760,duration:.09,type:'triangle',gain:.022,delay:.045});},
  danger(){tone({from:205,to:105,duration:.11,type:'sawtooth',gain:.022});},
  toggle(){tone({from:500,to:640,duration:.055,type:'triangle',gain:.027});},
  technique(){noise(.075,.018);tone({from:115,to:250,duration:.1,type:'sawtooth',gain:.022});tone({from:430,to:720,duration:.13,type:'sine',gain:.025,delay:.018});},
  energy(){tone({from:160,to:720,duration:.18,type:'sine',gain:.026});tone({from:420,to:980,duration:.13,type:'triangle',gain:.018,delay:.04});},
  slash(){noise(.055,.024);tone({from:980,to:160,duration:.13,type:'sawtooth',gain:.018});},
  impact(){noise(.11,.03);tone({from:105,to:52,duration:.18,type:'square',gain:.022});},
  fire(){noise(.16,.028);tone({from:180,to:70,duration:.2,type:'sawtooth',gain:.024});},
  shadow(){tone({from:115,to:185,duration:.22,type:'sine',gain:.024});tone({from:245,to:120,duration:.18,type:'triangle',gain:.014,delay:.03});},
  distort(){tone({from:260,to:85,duration:.22,type:'sawtooth',gain:.018});tone({from:310,to:570,duration:.17,type:'sine',gain:.015,delay:.025});},
  dragon(){noise(.13,.022);tone({from:95,to:310,duration:.24,type:'sawtooth',gain:.022});},
  domain(){tone({from:68,to:120,duration:.28,type:'sine',gain:.03});tone({from:320,to:960,duration:.24,type:'triangle',gain:.018,delay:.04});}
};
function classify(button){
  const text=(button.textContent||'').trim().toLowerCase();
  const cls=button.className||'';
  if(button.classList.contains('jjk-audio-toggle'))return 'none';
  if(button.classList.contains('use-btn')||/utilizza|usa da sola|attiva katana/.test(text))return 'technique';
  if(/danger|reset|kick|delete/.test(cls)||/espelli|cancella|elimina|esci dalla stanza|fine partita/.test(text))return 'danger';
  if(/primary|save|victory|confirm|apply/.test(cls)||/salva|conferma|crea stanza|genera codice|partecipa|avvia partita|inizia partita|applica/.test(text))return 'confirm';
  if(/back|arrow|tab|home-action|character-card|room-draft-card|info-character-card|cloud-stats-tab/.test(cls)||text==='←'||text==='→')return 'nav';
  if(/toggle|switch/.test(cls)||button.getAttribute('role')==='switch')return 'toggle';
  return 'click';
}
function play(kind='click'){
  if(!enabled||kind==='none')return;
  const now=performance.now();if(now-lastAt<26&&kind==='click')return;lastAt=now;
  resume().then(()=>{(sounds[kind]||sounds.click)();});
}
function updateToggle(){
  const btn=document.getElementById('jjkAudioToggle');if(!btn)return;
  btn.classList.toggle('muted',!enabled);btn.setAttribute('aria-pressed',enabled?'true':'false');btn.title=enabled?'Disattiva effetti sonori':'Attiva effetti sonori';
  const icon=btn.querySelector('.jjk-audio-toggle-icon'),status=btn.querySelector('small');if(icon)icon.textContent=enabled?'🔊':'🔇';if(status)status.textContent=enabled?'Suoni attivi':'Suoni disattivati';
}
function toggle(){enabled=!enabled;storageSet(STORAGE_KEY,enabled?'1':'0');if(enabled){resume().then(()=>sounds.toggle());}updateToggle();}
function install(){
  if(!document.getElementById('jjkAudioToggle')){
    const btn=document.createElement('button');btn.id='jjkAudioToggle';btn.className='jjk-audio-toggle';btn.type='button';btn.setAttribute('aria-label','Attiva o disattiva gli effetti sonori');btn.innerHTML='<span class="jjk-audio-toggle-icon">🔊</span><span class="jjk-audio-toggle-copy"><b>Audio</b><small>Suoni attivi</small></span>';btn.addEventListener('click',e=>{e.stopPropagation();toggle();});document.body.appendChild(btn);
  }
  updateToggle();
  document.addEventListener('click',event=>{
    const button=event.target.closest('button,[role="button"]');if(!button||button.disabled||button.id==='jjkAudioToggle')return;
    play(classify(button));button.classList.remove('jjk-sfx-pulse');void button.offsetWidth;button.classList.add('jjk-sfx-pulse');setTimeout(()=>button.classList.remove('jjk-sfx-pulse'),220);
  },true);
}
window.JJKSfx={
  play,
  setEnabled(value){enabled=!!value;storageSet(STORAGE_KEY,enabled?'1':'0');updateToggle();},
  isEnabled(){return enabled;},
  setVolume(value){const next=Number(value);volume=Number.isFinite(next)?Math.max(0,Math.min(1,next)):volume;storageSet(VOLUME_KEY,String(volume));},
  getVolume(){return volume;}
};

/* Predisposizione per una futura libreria di voci autorizzate. Nessuna voce dell'anime è inclusa. */
const voiceRegistry=new Map();let activeVoice=null;
window.JJKVoice={
  register(characterId,context,src){if(!characterId||!context||!src)return;voiceRegistry.set(characterId+':'+context,src);},
  has(characterId,context='select'){return voiceRegistry.has(characterId+':'+context);},
  play(characterId,context='select'){
    const src=voiceRegistry.get(characterId+':'+context);if(!src)return false;
    try{activeVoice?.pause();activeVoice=new Audio(src);activeVoice.volume=.72*volume;activeVoice.play().catch(()=>{});return true;}catch(e){return false;}
  },
  stop(){try{activeVoice?.pause();}catch(e){}activeVoice=null;}
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();

/* Caricamento del roster 3D cinematografico. */
(function(){
  if(document.querySelector('[data-jjk-roster-3d-loader]'))return;
  const style=document.createElement('link');
  style.rel='stylesheet';
  style.href='roster-3d.css?v=20260723r3d1';
  style.dataset.jjkRoster3dLoader='style';
  document.head.appendChild(style);
  const script=document.createElement('script');
  script.src='roster-3d.js?v=20260723r3d1';
  script.defer=true;
  script.dataset.jjkRoster3dLoader='script';
  document.head.appendChild(script);
})();
