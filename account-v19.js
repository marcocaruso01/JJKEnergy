/* JJK Energy V19 - Account classico con nickname e password
   - Nessun Magic Link, OTP o email di conferma.
   - Il giocatore vede solo nickname e password.
   - Supabase Auth usa internamente un indirizzo tecnico deterministico,
     mai mostrato e mai usato per inviare messaggi.
   - La sessione resta disponibile su PC, iPhone e Android.
*/
(function(){
'use strict';

const SUPABASE_URL='https://yadsmiwjoyaiemlzkomd.supabase.co';
const SUPABASE_KEY='sb_publishable_x6ESBbVZ_IhmfnePfN8tDQ_ADAcpuJ6';
const AUTH_READY_EVENT='jjk-account-ready';
const AUTH_CHANGED_EVENT='jjk-account-changed';
const TECHNICAL_EMAIL_DOMAIN='accounts.jjkenergy.example.com';
const MIN_PASSWORD_LENGTH=8;

let client=null;
let currentSession=null;
let currentUser=null;
let accountStatus=null;
let initPromise=null;
let ready=false;
let sessionTask=Promise.resolve();
let accountWaiters=[];
let noteTimer=null;
let suppressSignedOutUntil=0;

function normalizeUsername(value){return String(value||'').trim().toLowerCase();}
function validUsername(value){return /^[a-z0-9_]{3,20}$/.test(normalizeUsername(value));}
function validPassword(value){return typeof value==='string'&&value.length>=MIN_PASSWORD_LENGTH&&value.length<=72;}
function technicalEmail(username){return normalizeUsername(username)+'@'+TECHNICAL_EMAIL_DOMAIN;}
function loginEmail(value){const raw=String(value||'').trim().toLowerCase();return raw.includes('@')?raw:technicalEmail(raw);}
function usernameFromUser(user){
  const meta=user?.user_metadata||{};
  const preferred=normalizeUsername(meta.account_tag||meta.username||meta.display_name||meta.username_pending||'');
  if(validUsername(preferred))return preferred;
  const email=String(user?.email||'').toLowerCase();
  if(email.endsWith('@'+TECHNICAL_EMAIL_DOMAIN)){
    const local=normalizeUsername(email.split('@')[0]);
    if(validUsername(local))return local;
  }
  return '';
}
function cleanupLegacyAuthUrl(){
  try{
    const url=new URL(location.href);
    ['code','token_hash','type','error','error_code','error_description','access_token','refresh_token','expires_in','expires_at','provider_token','provider_refresh_token','auth_callback'].forEach(key=>url.searchParams.delete(key));
    if(/access_token=|refresh_token=|error=|token_hash=/.test(url.hash||''))url.hash='';
    history.replaceState({},document.title,url.pathname+(url.searchParams.toString()?'?'+url.searchParams.toString():'')+url.hash);
  }catch(error){console.warn('Pulizia URL auth:',error);}
}
function isVerifiedProfile(status=accountStatus){return !!status?.profile_verified&&!!status?.username;}
function notify(text,color='#61c7ff',duration=4200){
  let el=document.getElementById('v21AuthNote');
  if(!el){el=document.createElement('div');el.id='v21AuthNote';el.className='v21-auth-note';document.body.appendChild(el);}
  clearTimeout(noteTimer);
  el.style.setProperty('--note-color',color);
  el.textContent=text;
  requestAnimationFrame(()=>el.classList.add('show'));
  noteTimer=setTimeout(()=>el.classList.remove('show'),duration);
}
function setMessage(type,text){
  const error=document.getElementById('v21AuthError');
  const success=document.getElementById('v21AuthSuccess');
  if(error){error.textContent=type==='error'?text:'';error.classList.toggle('show',type==='error'&&!!text);}
  if(success){success.textContent=type==='success'?text:'';success.classList.toggle('show',type==='success'&&!!text);}
}
function setBusy(value,label){
  document.querySelectorAll('.v21-auth-btn').forEach(button=>{
    button.disabled=!!value;
    if(value&&button.dataset.defaultLabel===undefined)button.dataset.defaultLabel=button.textContent;
    if(!value&&button.dataset.defaultLabel!==undefined)button.textContent=button.dataset.defaultLabel;
  });
  const active=document.querySelector('.v21-auth-view.active .v21-auth-btn');
  if(value&&active&&label)active.textContent=label;
}
function rpc(name,args={}){
  return client.rpc(name,args).then(({data,error})=>{
    if(error)throw error;
    if(typeof data==='string'){try{return JSON.parse(data);}catch(_){return data;}}
    return data;
  });
}
function cleanError(error){
  const raw=String(error?.message||error||'Errore sconosciuto');
  if(/USERNAME_TAKEN|ACCOUNT_TAG_TAKEN/i.test(raw))return 'Questo nickname è già utilizzato. Scegline un altro.';
  if(/ACCOUNT_TAG_LOCKED/i.test(raw))return 'Il nickname dell’account è definitivo e non può essere cambiato.';
  if(/INVALID_USERNAME|INVALID_ACCOUNT_TAG/i.test(raw))return 'Il nickname deve contenere 3-20 caratteri: lettere minuscole, numeri o underscore.';
  if(/EMAIL_VERIFICATION_REQUIRED|EMAIL_NOT_VERIFIED|EMAIL_CONFIRMATION_STILL_ENABLED|email.*not.*confirmed/i.test(raw))return 'Su Supabase è ancora attiva la conferma email. Disattiva “Confirm email”, salva e riprova.';
  if(/ACCOUNT_PROFILE_REQUIRED/i.test(raw))return 'Completa il profilo prima di entrare in una stanza.';
  if(/Invalid login credentials|invalid_credentials/i.test(raw))return 'Nickname o password non corretti.';
  if(/User already registered|already.*registered|already exists/i.test(raw))return 'Questo nickname è già registrato. Usa la sezione Accedi.';
  if(/Password should be at least|password.*short|weak password/i.test(raw))return 'La password deve contenere almeno '+MIN_PASSWORD_LENGTH+' caratteri.';
  if(/signup.*disabled|Signups not allowed/i.test(raw))return 'La creazione di nuovi account è disattivata su Supabase.';
  if(/rate limit|too many requests|over_request_rate_limit/i.test(raw))return 'Troppi tentativi ravvicinati. Attendi un minuto e riprova.';
  if(/Failed to fetch|network|NetworkError/i.test(raw))return 'Connessione non disponibile. Controlla Internet e riprova.';
  return raw;
}

function passwordField(id,label,autocomplete){
  return '<label class="v21-auth-field"><span>'+label+'</span><div class="v19-password-wrap"><input id="'+id+'" type="password" autocomplete="'+autocomplete+'" minlength="'+MIN_PASSWORD_LENGTH+'" maxlength="72" placeholder="Almeno '+MIN_PASSWORD_LENGTH+' caratteri" required><button type="button" class="v19-password-toggle" data-password-target="'+id+'" aria-label="Mostra password">👁</button></div></label>';
}
function injectUi(){
  if(document.getElementById('v21AuthGate'))return;
  const gate=document.createElement('div');
  gate.id='v21AuthGate';
  gate.className='v21-auth-gate';
  gate.setAttribute('aria-live','polite');
  gate.innerHTML=
    '<div class="v21-auth-bg" aria-hidden="true"><div class="v21-auth-ring"></div>'+Array.from({length:12},(_,index)=>'<i class="v21-auth-particle" style="--x:'+(6+(index*8)%90)+'%;--y:'+(10+(index*17)%80)+'%;--d:'+(4.8+(index%4)*.7)+'s;--delay:-'+(index*.45)+'s;--c:'+(index%3===0?'#ff5577':index%3===1?'#61c7ff':'#9b65ff')+'"></i>').join('')+'</div>'+ 
    '<section class="v21-auth-shell">'+
      '<div class="v21-auth-art">'+
        '<div class="v21-auth-brand"><span class="v21-auth-mark">呪</span><div><b>JJK ENERGY</b><small>Account cloud protetto</small></div></div>'+ 
        '<div class="v21-auth-art-copy"><span>Progressi permanenti</span><h2>Il tuo stregone.<br>Su ogni dispositivo.</h2><p>Crea un account con nickname e password. Nessun link, nessuna email da aspettare: ritroverai progressi, vittorie e badge su PC e telefono.</p>'+ 
          '<div class="v21-auth-benefits"><div class="v21-auth-benefit"><i>∞</i><div><b>Progressione cloud</b><small>Livello e achievement sempre recuperabili</small></div></div><div class="v21-auth-benefit"><i>冠</i><div><b>Classifiche affidabili</b><small>Un nickname univoco per ogni account</small></div></div><div class="v21-auth-benefit"><i>結</i><div><b>Accesso immediato</b><small>Niente Magic Link, OTP o SMTP</small></div></div></div>'+ 
        '</div>'+ 
      '</div>'+ 
      '<div class="v21-auth-panel">'+
        '<div class="v21-auth-kicker">Identità Jujutsu</div><h1 id="v21AuthTitle" class="v21-auth-title">Accedi al tuo account</h1><p id="v21AuthSubtitle" class="v21-auth-sub">Inserisci nickname e password per recuperare il tuo profilo cloud.</p>'+ 
        '<div id="v21AuthTabs" class="v21-auth-tabs"><button type="button" class="v21-auth-tab active" data-auth-tab="login">Accedi</button><button type="button" class="v21-auth-tab" data-auth-tab="register">Crea account</button></div>'+ 
        '<div id="v21AuthError" class="v21-auth-error"></div><div id="v21AuthSuccess" class="v21-auth-success"></div>'+ 
        '<div class="v21-auth-view active" data-auth-view="login"><form id="v21LoginForm" class="v21-auth-form"><label class="v21-auth-field"><span>Nickname</span><input id="v21LoginUsername" type="text" inputmode="text" autocomplete="username" maxlength="20" autocapitalize="none" spellcheck="false" placeholder="es. marco_caruso" required></label>'+passwordField('v21LoginPassword','Password','current-password')+'<button class="v21-auth-btn" type="submit">Accedi</button><div class="v21-auth-hint">Usa le stesse credenziali su qualsiasi dispositivo. La password non viene mai salvata nel sito.</div></form></div>'+ 
        '<div class="v21-auth-view" data-auth-view="register"><form id="v21RegisterForm" class="v21-auth-form"><label class="v21-auth-field"><span>Nickname pubblico</span><input id="v21RegisterUsername" type="text" inputmode="text" autocomplete="username" maxlength="20" autocapitalize="none" spellcheck="false" placeholder="es. stregone_01" required></label>'+passwordField('v21RegisterPassword','Password','new-password')+passwordField('v21RegisterPasswordConfirm','Conferma password','new-password')+'<button class="v21-auth-btn" type="submit">Crea account</button><div class="v19-auth-warning"><b>Conserva bene la password.</b> Senza email non è disponibile il recupero automatico dell’account.</div></form></div>'+ 
        '<div id="v21ProfileOnly" class="v21-auth-profile-only"><form id="v21ProfileForm" class="v21-auth-form"><label class="v21-auth-field"><span>Scegli il nickname definitivo</span><input id="v21ProfileUsername" type="text" maxlength="20" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="es. stregone_01" required></label><button class="v21-auth-btn" type="submit">Completa il profilo</button></form></div>'+ 
      '</div>'+ 
    '</section>';
  document.body.appendChild(gate);

  const chip=document.createElement('button');
  chip.id='v21AccountChip';chip.className='v21-account-chip';chip.type='button';
  chip.innerHTML='<span id="v21AccountAvatar" class="v21-account-avatar">?</span><span class="v21-account-copy"><b id="v21AccountName">Account</b><small id="v21AccountMeta">Nickname + password</small></span>';
  document.body.appendChild(chip);

  const modal=document.createElement('div');
  modal.id='v21AccountModal';modal.className='v21-account-modal';
  modal.innerHTML='<section class="v21-account-card"><div class="v21-account-card-head"><div><div class="v21-auth-kicker">Profilo cloud</div><h3 id="v21AccountModalName">Account</h3><p>Il profilo viene recuperato su ogni dispositivo con nickname e password.</p></div><button class="v21-account-close" type="button" data-account-close>✕</button></div><div class="v21-account-stats"><div class="v21-account-stat"><span>Nickname</span><b id="v21AccountUsername">—</b></div><div class="v21-account-stat"><span>Metodo</span><b>Nickname + password</b></div><div class="v21-account-stat"><span>Sincronizzazione</span><b>Supabase Cloud</b></div><div class="v21-account-stat"><span>Recupero password</span><b>Non disponibile</b></div></div><div class="v21-account-actions"><button class="v21-auth-btn alt" type="button" data-account-password>Cambia password</button><button class="v21-auth-btn alt" type="button" data-account-progress>Apri progressione</button><button class="v21-auth-btn v21-account-danger" type="button" data-account-logout>Esci dall’account</button></div></section>';
  document.body.appendChild(modal);

  gate.addEventListener('click',event=>{
    const tab=event.target.closest('[data-auth-tab]');if(tab)switchTab(tab.dataset.authTab);
    const toggle=event.target.closest('[data-password-target]');if(toggle)togglePassword(toggle);
  });
  document.getElementById('v21LoginForm').addEventListener('submit',onLoginSubmit);
  document.getElementById('v21RegisterForm').addEventListener('submit',onRegisterSubmit);
  document.getElementById('v21ProfileForm').addEventListener('submit',onProfileSubmit);
  chip.addEventListener('click',()=>modal.classList.add('show'));
  modal.addEventListener('click',event=>{
    if(event.target===modal||event.target.closest('[data-account-close]'))modal.classList.remove('show');
    if(event.target.closest('[data-account-progress]')){modal.classList.remove('show');window.openStatistics?.();setTimeout(()=>window.setCloudStatsView?.('progression'),120);}
    if(event.target.closest('[data-account-password]'))changePassword();
    if(event.target.closest('[data-account-logout]'))logout();
  });
  const saved=normalizeUsername(localStorage.getItem('jjk_v19_last_username')||'');
  if(validUsername(saved))document.getElementById('v21LoginUsername').value=saved;
}
function togglePassword(button){
  const input=document.getElementById(button.dataset.passwordTarget);if(!input)return;
  const visible=input.type==='text';input.type=visible?'password':'text';button.textContent=visible?'👁':'🙈';button.setAttribute('aria-label',visible?'Mostra password':'Nascondi password');
}
function switchTab(tab){
  document.querySelectorAll('.v21-auth-tab').forEach(button=>button.classList.toggle('active',button.dataset.authTab===tab));
  document.querySelectorAll('.v21-auth-view').forEach(view=>view.classList.toggle('active',view.dataset.authView===tab));
  document.getElementById('v21ProfileOnly')?.classList.remove('show');
  document.getElementById('v21AuthTabs').style.display='grid';
  setMessage('','');
  const title=document.getElementById('v21AuthTitle');
  const subtitle=document.getElementById('v21AuthSubtitle');
  if(tab==='register'){
    title.textContent='Crea il tuo account';
    subtitle.textContent='Scegli un nickname univoco e una password. Entrerai subito, senza email.';
  }else{
    title.textContent='Accedi al tuo account';
    subtitle.textContent='Inserisci nickname e password per recuperare il tuo profilo cloud.';
  }
}
function showGate(mode='login'){
  const gate=document.getElementById('v21AuthGate');if(!gate)return;
  ready=false;
  gate.classList.add('show');
  document.body.classList.add('v21-auth-locked');
  document.getElementById('v21AccountChip')?.classList.remove('show');
  if(mode==='profile'){
    document.getElementById('v21AuthTabs').style.display='none';
    document.querySelectorAll('.v21-auth-view').forEach(view=>view.classList.remove('active'));
    document.getElementById('v21ProfileOnly').classList.add('show');
    document.getElementById('v21AuthTitle').textContent='Completa il profilo';
    document.getElementById('v21AuthSubtitle').textContent='Scegli il nickname univoco da mostrare nelle classifiche.';
    document.getElementById('v21ProfileUsername').value=usernameFromUser(currentUser);
  }else switchTab(mode);
}
function hideGate(){document.getElementById('v21AuthGate')?.classList.remove('show');document.body.classList.remove('v21-auth-locked');updateAccountChip();}

async function checkUsername(username){
  const normalized=normalizeUsername(username);
  if(!validUsername(normalized))throw new Error('INVALID_ACCOUNT_TAG');
  const available=await rpc('jjk_account_tag_available',{p_account_tag:normalized});
  if(!available)throw new Error('ACCOUNT_TAG_TAKEN');
  return normalized;
}
async function onLoginSubmit(event){
  event.preventDefault();setMessage('','');
  const username=normalizeUsername(document.getElementById('v21LoginUsername').value);
  const password=String(document.getElementById('v21LoginPassword').value||'');
  if(!validUsername(username)){setMessage('error','Inserisci un nickname valido: 3-20 caratteri, lettere minuscole, numeri o underscore.');return;}
  if(!validPassword(password)){setMessage('error','La password deve contenere almeno '+MIN_PASSWORD_LENGTH+' caratteri.');return;}
  setBusy(true,'Accesso…');
  try{
    if(currentSession){suppressSignedOutUntil=Date.now()+2500;await client.auth.signOut({scope:'local'});}
    const {data,error}=await client.auth.signInWithPassword({email:loginEmail(username),password});
    if(error)throw error;
    if(!data?.session)throw new Error('SESSION_NOT_CREATED');
    localStorage.setItem('jjk_v19_last_username',username);
    await handleSession(data.session,'SIGNED_IN');
    setMessage('success','Accesso completato.');
    notify('Bentornato, @'+username,'#5be0a0');
  }catch(error){setMessage('error',cleanError(error));}finally{setBusy(false);}
}
async function onRegisterSubmit(event){
  event.preventDefault();setMessage('','');
  const raw=document.getElementById('v21RegisterUsername').value;
  const password=String(document.getElementById('v21RegisterPassword').value||'');
  const confirmPassword=String(document.getElementById('v21RegisterPasswordConfirm').value||'');
  if(!validPassword(password)){setMessage('error','La password deve contenere almeno '+MIN_PASSWORD_LENGTH+' caratteri.');return;}
  if(password!==confirmPassword){setMessage('error','Le due password non coincidono.');return;}
  setBusy(true,'Creazione account…');
  try{
    const username=await checkUsername(raw);
    if(currentSession){suppressSignedOutUntil=Date.now()+2500;await client.auth.signOut({scope:'local'});}
    const {data,error}=await client.auth.signUp({
      email:technicalEmail(username),
      password,
      options:{data:{username,account_tag:username,display_name:username,login_kind:'nickname_password'}}
    });
    if(error)throw error;
    if(!data?.session){
      throw new Error('EMAIL_CONFIRMATION_STILL_ENABLED');
    }
    localStorage.setItem('jjk_v19_last_username',username);
    await handleSession(data.session,'SIGNED_UP');
    if(!ready)await finalizeProfile(username);
    setMessage('success','Account creato. Sei già connesso.');
    notify('Account creato: @'+username,'#5be0a0');
  }catch(error){setMessage('error',cleanError(error));}finally{setBusy(false);}
}
async function onProfileSubmit(event){
  event.preventDefault();setMessage('','');setBusy(true,'Salvataggio…');
  try{
    const username=normalizeUsername(document.getElementById('v21ProfileUsername').value);
    if(!validUsername(username))throw new Error('INVALID_ACCOUNT_TAG');
    const result=await rpc('jjk_set_registered_profile',{p_account_tag:username,p_display_name:username});
    accountStatus=profileResultToStatus(result,username);
    await markReady();
  }catch(error){setMessage('error',cleanError(error));}finally{setBusy(false);}
}
function profileResultToStatus(result,fallback){
  const username=normalizeUsername(result?.account_tag||fallback||'');
  return {authenticated:true,permanent:true,profile_verified:validUsername(username),username,account_tag:username,display_name:result?.display_name||username,registered_at:result?.registered_at||null};
}
async function finalizeProfile(username){
  const normalized=normalizeUsername(username||usernameFromUser(currentUser));
  if(!validUsername(normalized)){showGate('profile');return false;}
  const result=await rpc('jjk_set_registered_profile',{p_account_tag:normalized,p_display_name:normalized});
  accountStatus=profileResultToStatus(result,normalized);
  try{await client.auth.updateUser({data:{username:normalized,account_tag:normalized,display_name:normalized,login_kind:'nickname_password'}});}catch(error){console.warn('Aggiornamento metadata:',error);}
  await markReady();return true;
}
async function fetchStatus(){
  if(!currentSession)return {authenticated:false,permanent:false,profile_verified:false};
  if(currentUser?.is_anonymous)return {authenticated:true,permanent:false,profile_verified:false};
  try{
    const profile=await rpc('jjk_my_account_profile');
    const username=normalizeUsername(profile?.account_tag||'');
    return {authenticated:true,permanent:true,profile_verified:validUsername(username),username,account_tag:username,display_name:profile?.display_name||username,registered_at:profile?.registered_at||null};
  }catch(error){console.warn('Profilo account:',error);return {authenticated:true,permanent:true,profile_verified:false};}
}
async function processSession(session,event='SESSION'){
  currentSession=session||null;
  currentUser=session?.user||null;
  window.jjkAccountUser=currentUser;
  window.jjkAccountSession=currentSession;
  if(!currentSession){accountStatus=null;ready=false;showGate('login');dispatchChanged(event);return;}
  if(currentUser?.is_anonymous){accountStatus={authenticated:true,permanent:false,profile_verified:false};ready=false;showGate('register');dispatchChanged(event);return;}
  accountStatus=await fetchStatus();
  if(!isVerifiedProfile(accountStatus)){
    const fallback=usernameFromUser(currentUser);
    if(validUsername(fallback)){
      try{await finalizeProfile(fallback);dispatchChanged(event);return;}catch(error){console.warn('Completamento automatico profilo:',error);}
    }
    ready=false;showGate('profile');dispatchChanged(event);return;
  }
  await markReady();dispatchChanged(event);
}
function handleSession(session,event='SESSION'){
  sessionTask=sessionTask.then(()=>processSession(session,event)).catch(error=>{
    console.error('Gestione sessione:',error);
    ready=false;showGate('login');setMessage('error',cleanError(error));
  });
  return sessionTask;
}
async function markReady(){
  ready=true;hideGate();applyIdentityToForms();updateAccountChip();
  try{await rpc('jjk_set_profile_name',{p_display_name:accountStatus?.display_name||accountStatus?.username||''});}catch(_){ }
  const payload={client,user:currentUser,session:currentSession,status:accountStatus,username:accountStatus?.username};
  accountWaiters.splice(0).forEach(({resolve})=>resolve(payload));
  window.dispatchEvent(new CustomEvent(AUTH_READY_EVENT,{detail:payload}));
}
function dispatchChanged(event){window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT,{detail:{event,user:currentUser,session:currentSession,status:accountStatus,ready}}));}
function applyIdentityToForms(){
  const username=accountStatus?.username;if(!username)return;
  ['hostPlayerName','joinPlayerName'].forEach(id=>{const input=document.getElementById(id);if(input){input.value=username;input.readOnly=true;input.title='Il nome nella stanza coincide con il nickname dell’account.';}});
  localStorage.setItem('jjk_last_player_name',username);
}
function updateAccountChip(){
  const chip=document.getElementById('v21AccountChip');if(!chip)return;
  if(!ready||!accountStatus?.username){chip.classList.remove('show');return;}
  const username=accountStatus.username;
  chip.classList.add('show');
  document.getElementById('v21AccountAvatar').textContent=username.slice(0,1).toUpperCase();
  document.getElementById('v21AccountName').textContent='@'+username;
  document.getElementById('v21AccountMeta').textContent='Account cloud · password';
  document.getElementById('v21AccountModalName').textContent='@'+username;
  document.getElementById('v21AccountUsername').textContent=username;
}
async function changePassword(){
  const first=prompt('Inserisci la nuova password (almeno '+MIN_PASSWORD_LENGTH+' caratteri):');
  if(first===null)return;
  if(!validPassword(first)){notify('La password è troppo corta.','#ff5f7d');return;}
  const second=prompt('Ripeti la nuova password:');
  if(first!==second){notify('Le password non coincidono.','#ff5f7d');return;}
  try{
    const {error}=await client.auth.updateUser({password:first});
    if(error)throw error;
    notify('Password aggiornata.','#5be0a0');
  }catch(error){notify(cleanError(error),'#ff5f7d',6500);}
}
async function logout(){
  if(!confirm('Uscire dall’account su questo dispositivo? I progressi restano salvati nel cloud.'))return;
  try{if(window.jjkGetRoomSession?.()?.roomId)await window.leaveRoom?.(true);}catch(_){ }
  ready=false;accountStatus=null;
  await client.auth.signOut({scope:'local'});
  document.getElementById('v21AccountModal')?.classList.remove('show');
  showGate('login');
}
async function ensureAuthenticated(){
  await init();
  if(ready&&currentUser&&accountStatus?.username)return {client,user:currentUser,session:currentSession,status:accountStatus,username:accountStatus.username};
  return new Promise((resolve,reject)=>{accountWaiters.push({resolve,reject});showGate(currentUser?.is_anonymous?'register':'login');});
}
async function init(){
  if(initPromise)return initPromise;
  initPromise=(async()=>{
    injectUi();cleanupLegacyAuthUrl();
    if(!window.supabase?.createClient)throw new Error('Libreria Supabase non caricata.');
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}});
    window.jjkAccountClient=client;
    client.auth.onAuthStateChange((event,session)=>{if(event==='INITIAL_SESSION')return;if(event==='SIGNED_OUT'&&Date.now()<suppressSignedOutUntil)return;setTimeout(()=>handleSession(session,event),0);});
    const {data,error}=await client.auth.getSession();
    if(error)console.warn(error);
    await handleSession(data?.session||null,'INITIAL_SESSION');
    const observer=new MutationObserver(()=>{if(ready)applyIdentityToForms();});
    observer.observe(document.body,{childList:true,subtree:true});
  })();
  return initPromise;
}

window.JJKAccount={
  init,
  ensureAuthenticated,
  authRedirectUrl:()=>location.origin+location.pathname,
  getClient:()=>client,
  getUser:()=>currentUser,
  getSession:()=>currentSession,
  getStatus:()=>accountStatus,
  getUsername:()=>accountStatus?.username||null,
  isReady:()=>ready,
  open:()=>document.getElementById('v21AccountModal')?.classList.add('show'),
  logout,
  changePassword
};
window.jjkEnsureRegisteredAccount=ensureAuthenticated;

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>init().catch(error=>{console.error(error);injectUi();showGate('login');setMessage('error',cleanError(error));}),{once:true});
}else{
  init().catch(error=>{console.error(error);injectUi();showGate('login');setMessage('error',cleanError(error));});
}
})();
