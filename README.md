# JJK Energy V35 · Cinematic Nexus

Companion web cinematografica per gestire personaggi, tecniche, risorse,
turni, profilo Stregone e partite online.

## Funzioni principali

- Home in stile videogioco AAA senza carosello 3D permanente.
- Nove personaggi con aure animate differenti.
- Anteprime cinematiche delle tecniche senza consumo di risorse.
- Dashboard Game Master con spotlight del turno e stato partita.
- Profilo Stregone con livello, XP, titoli, trofei e statistiche.
- Lobby Supabase con codice, fase, giocatori e stato connessioni.
- Musica ed effetti sonori opzionali con volumi persistenti.
- Animazioni disattivabili e supporto a `prefers-reduced-motion`.
- Schermata di caricamento saltabile con sblocco automatico.

## Avvio

Il progetto è un sito statico. Apri `index.html` oppure servi la cartella
con un server HTTP locale.

```bash
python3 -m http.server 8000
```

Poi visita `http://localhost:8000`.

## Configurazione cloud

Account, statistiche e multiplayer richiedono un progetto Supabase
configurato con gli script SQL inclusi nella repository. Consulta:

- `README_SUPABASE.txt`
- `README_CORREZIONE_STANZE_SUPABASE.txt`
- `README_V35_CINEMATIC_NEXUS.txt`

## Verifica

I controlli eseguiti prima della pubblicazione sono documentati in
`VERIFICA_V35.txt`.
