JJK ENERGY V15 - ORDINE TURNI AUTOMATICO

NOVITA
- Prima dell'avvio, il Game Master ordina tutti i giocatori presenti.
- L'ordine si modifica con frecce su/giu oppure trascinando le righe su PC.
- Il pulsante Avvia partita resta bloccato finche l'ordine non viene salvato.
- Il primo giocatore viene sbloccato automaticamente all'avvio.
- Quando un giocatore preme Passa il turno, la sua scheda si blocca e la successiva si sblocca.
- Dopo l'ultimo giocatore, il giro ricomincia automaticamente dal primo.
- Il Game Master conserva i comandi manuali Dai turno, Blocca e Sblocca per eventuali eccezioni.
- L'ordine e il turno attuale sono visibili nella lobby e nella dashboard Game Master.

IMPORTANTE - PASSO SUPABASE
Prima di pubblicare e usare questa versione, eseguire una sola volta:
JJK_Supabase_Passo_5_Ordine_Turni_Automatico.sql

Lo script aggiunge la colonna turn_order e aggiorna le funzioni RPC.
Non cancella stanze, partite, statistiche o profili esistenti.
