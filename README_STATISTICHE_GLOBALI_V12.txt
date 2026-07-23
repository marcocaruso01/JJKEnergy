JJK ENERGY - V12 STATISTICHE GLOBALI SUPABASE

Questa versione collega la pagina Statistiche alle funzioni installate con il Passo 4 di Supabase.

NOVITA PRINCIPALI
- Dashboard globale condivisa tra PC, iPhone e Android.
- Hall of Fame dei giocatori.
- Personaggi piu scelti e piu vincenti.
- Tecniche piu utilizzate.
- Risorse consumate e recuperate.
- Grafico delle partite concluse negli ultimi 30 giorni.
- Statistiche personali legate all'utente anonimo Supabase del dispositivo.
- Archivio globale delle partite concluse.
- Elenco delle partite in corso senza mostrare il codice stanza.
- Aggiornamento automatico tramite global_stats_pulse e Supabase Realtime.
- Registrazione automatica di tecniche e variazioni delle risorse durante le partite online.

PUBBLICAZIONE SU NETLIFY
1. Carica direttamente questo ZIP nello stesso progetto Netlify gia usato.
2. Mantieni invariato il progetto Supabase.
3. Non servono altre query SQL: il Passo 4 deve essere gia stato eseguito.
4. Dopo il deploy chiudi e riapri il sito per evitare la cache del browser.

NOTA
I grafici globali iniziano a popolarsi man mano che vengono concluse nuove partite e usate tecniche nella versione V12.
I codici stanza non vengono mai restituiti dalle funzioni pubbliche delle statistiche.
