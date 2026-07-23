JJK ENERGY V35 · CINEMATIC NEXUS
=================================

Questa cartella contiene la versione corretta e aggiornata del sito.
Per avviarla, apri index.html in un browser moderno oppure pubblica
l’intera cartella su un hosting statico senza modificarne la struttura.

NOVITÀ PRINCIPALI
-----------------

- Home cinematografica stabile, senza il vecchio carosello 3D e senza
  cicli di animazione permanenti legati al carosello.
- Roster rapido con nove personaggi e spotlight comandato dall’utente.
- Nove aure animate differenti: Infinito, Fendenti, Impatto, Ombre,
  Sfere Maledette, Distorsione, Brace, Velocità e Rika/Katana.
- Anteprima cinematografica delle tecniche separata dal loro utilizzo:
  non modifica Vita, Energia, Vigore o risorse speciali.
- Game Master con spotlight del turno, anomalia multi-turno, evento
  corrente, giocatori pronti, vita critica e stato connessioni.
- Profilo Stregone con livello, titolo, XP, trofei, statistiche,
  tempo giocato e personaggi preferiti.
- Lobby online con codice, fase, slot reali, ruoli, personaggi e stato
  online/offline.
- Effetti sonori e musica opzionali con volumi separati e persistenti.
- Animazioni disattivabili; viene rispettata anche la preferenza
  “Riduci movimento” del sistema operativo.
- Caricamento animato saltabile con sblocco automatico di sicurezza.
- Sincronizzazione online più sicura grazie a scritture seriali e
  controllo della versione dello stato giocatore.

PREFERENZE SALVATE
------------------

Le impostazioni audio e animazioni vengono salvate nel localStorage
del browser. La musica parte disattivata e richiede un’interazione
dell’utente, come previsto dai browser moderni.

MULTIPLAYER E PROFILO CLOUD
---------------------------

Il sito conserva l’integrazione Supabase già presente nel progetto.
Per usare account, statistiche, trofei e multiplayer online, il progetto
Supabase deve essere configurato con gli script SQL inclusi nella cartella.
Il Profilo Stregone usa prima i dati ufficiali cloud e ricorre ai dati
locali solo quando la progressione cloud non è disponibile.

FILE DI VERIFICA
----------------

Consulta VERIFICA_V35.txt per l’esito dei controlli eseguiti prima della
creazione dello ZIP.
