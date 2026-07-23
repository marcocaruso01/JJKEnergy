JJK ENERGY - CORREZIONE STANZE SUPABASE S2

Correzione applicata:
- sincronizzato il nuovo oggetto stanza Supabase con la variabile roomSession del sito;
- risolto l'errore "null is not an object (evaluating roomSession.roomId)";
- validata la risposta delle funzioni jjk_create_room e jjk_join_room;
- aggiunta attesa dell'autenticazione anonima prima di creare o entrare in una stanza;
- disattivato l'avvio parallelo del vecchio sistema PeerJS;
- aggiunti recupero sessione, focus, pageshow e riconnessione;
- aggiornato il parametro cache del file multiplayer.

Pubblicazione:
Caricare l'intero ZIP nello stesso progetto Netlify della versione PC.
