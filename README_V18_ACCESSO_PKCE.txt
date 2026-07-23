JJK ENERGY V18 - ACCESSO ACCOUNT CORRETTO

Correzioni principali:
- client Supabase configurato con flowType PKCE;
- gestione manuale del parametro ?code=... con exchangeCodeForSession;
- supporto di fallback per token_hash/verifyOtp e vecchi hash implicit;
- salvataggio persistente della sessione;
- pulizia automatica dei parametri di autenticazione dall URL;
- feedback visivo durante la verifica;
- messaggi comprensibili per link scaduto, gia usato o aperto in un browser diverso;
- registrazione e conversione dell account anonimo con redirect corretto;
- nessuna nuova query SQL richiesta.

TEST CONSIGLIATO:
1. Pubblica lo ZIP su Netlify.
2. Chiudi le vecchie schede e riapri il sito.
3. Richiedi un nuovo link.
4. Apri il link nello stesso browser/dispositivo che lo ha richiesto.
5. Attendi il messaggio Accesso completato.
