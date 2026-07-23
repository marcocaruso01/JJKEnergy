JJK ENERGY V24 - MOBILE RICOSTRUITO E GAME MASTER FLUIDO

Questa versione ricostruisce l'interfaccia mobile senza modificare contenuti, regole,
personaggi, tecniche, account, stanze o dati Supabase.

MOBILE GIOCATORE
- Barra di navigazione interna e non flottante: Scheda, Tecniche, Risorse, Movimenti.
- Nessun tasto sovrapposto: controlli audio/layout/account nascosti solo durante la partita.
- Pulsante Passa il turno inserito nella barra della scheda.
- Tutte le tecniche sono forzate in una colonna, complete e scorribili.
- Immagini delle tecniche intere con object-fit contain.
- Risorse e pannelli speciali ordinati in griglie a due colonne.
- Cronologia senza scroll annidati.
- Compatibilità con iPhone, Android e orientamento verticale/orizzontale.

GAME MASTER
- Carte giocatore compatte in una colonna su telefono.
- Riepilogo immediato di Vita, Energia/Vigore, EXP e Grado.
- Un solo pulsante Gestisci risorse per giocatore.
- Pannello risorse a comparsa con -5, -1, +1, +5, quantità personalizzata,
  valore esatto e azzeramento.
- Vecchi editor duplicati nascosti per evitare comandi conflittuali.
- Comandi multipli raccolti in un menu richiudibile.
- Tutte le modifiche continuano a passare dalle funzioni Supabase esistenti.

TEST ESEGUITI
- Sintassi di tutti i file JavaScript.
- Layout sintetico iPhone 390x844 senza overflow orizzontale.
- Visualizzazione di tutte le carte tecnica e pulsanti Utilizza.
- Cambio tra Scheda/Tecniche/Risorse/Movimenti.
- Apertura e utilizzo del gestore risorse Game Master.

Non sono richieste nuove query SQL su Supabase.
