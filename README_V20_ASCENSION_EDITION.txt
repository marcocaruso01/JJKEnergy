JJK ENERGY V2.0 - ASCENSION EDITION
===================================

Questa versione parte dalla V15 con ordine automatico dei turni e mantiene:
- multiplayer Supabase
- Game Master
- Boss Rush
- statistiche globali
- Hall of Fame
- tutte le schede, tecniche e regole esistenti

NOVITA' V2.0
------------
1. Menu Dominio animato disponibile da ogni schermata.
2. Livelli account cloud da 1 a 100.
3. Titoli account progressivi.
4. 15 achievement con badge e ricompense XP.
5. Classifica globale livelli, XP e badge.
6. HUD account sempre visibile.
7. Assistente Game Master con generatore di eventi contestuali opzionali.
8. Regia cinematica aggiuntiva per le tecniche.
9. Musica ambientale dinamica originale generata dal browser.
10. Transizioni, profondita', particelle e animazioni dei dati.

INSTALLAZIONE
-------------
1. Prima di pubblicare il sito, eseguire su Supabase il file:
   JJK_Supabase_Passo_6_Progressione_Achievement.sql
2. Verificare che nei risultati compaiano:
   - account_progression
   - achievement_definitions
   - player_achievements
   - jjk_my_progression
   - jjk_global_level_leaderboard
   - jjk_refresh_progress_for_user
3. Caricare lo ZIP completo su Netlify.
4. Chiudere e riaprire il sito per evitare la cache.

NOTE AUDIO
----------
La musica e gli effetti aggiuntivi sono originali e sintetizzati tramite Web Audio.
Non sono incluse registrazioni, musiche o voci tratte dall'anime.
La musica parte soltanto dopo un gesto dell'utente, come richiesto da Safari/iPhone.

SICUREZZA
---------
Le tabelle di progressione non sono leggibili direttamente dal browser.
I dati vengono forniti tramite funzioni RPC protette e utenti anonimi autenticati.
