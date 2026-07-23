JJK ENERGY V2.1 - ACCOUNT REGISTRATI
=====================================

NOVITA
- Accesso obbligatorio con email verificata.
- Username pubblico univoco (3-20 caratteri: lettere minuscole, numeri e underscore).
- Progressione, vittorie, badge e statistiche recuperabili su altri dispositivi.
- Hall of Fame e classifiche basate solo su account registrati.
- Conversione dell'account anonimo esistente senza cambiare auth.uid e senza perdere i progressi gia associati.
- Accesso passwordless tramite link sicuro inviato via email.
- Nome nelle stanze sincronizzato con lo username verificato.
- Pulsante account con logout e collegamento alla progressione.

PRIMA DI PUBBLICARE
1. Supabase > Authentication > Sign In / Providers:
   - Email: ON
   - Confirm email: ON
   - Allow manual linking: ON
   - Anonymous sign-ins: lasciare ON durante la migrazione degli account esistenti.
2. Supabase > Authentication > Sessions:
   - Single session per user: OFF, cosi lo stesso account puo restare aperto su PC e telefono.
3. Supabase > Authentication > URL Configuration:
   - Site URL: il link Netlify principale.
   - Redirect URLs: aggiungere TUTTI i link PC/Mobile, ad esempio https://nome-sito.netlify.app/**
4. Eseguire JJK_Supabase_Passo_7_Account_Registrati.sql.
5. Pubblicare questo ZIP su Netlify subito dopo lo script SQL.

MIGRAZIONE DI CHI HA GIA GIOCATO
- Aprire il sito dallo STESSO dispositivo/browser usato finora.
- Selezionare Crea account / Salva il tuo account.
- Inserire username ed email.
- Confermare il link ricevuto via email.
- L'auth.uid resta lo stesso: partite, tecniche, livello e badge associati vengono conservati.

ACCESSO SU UN ALTRO DISPOSITIVO
- Premere Accedi.
- Inserire la stessa email.
- Aprire il link ricevuto.
- Il profilo cloud e le classifiche vengono recuperati automaticamente.

DOPO LA MIGRAZIONE
- Quando tutti i giocatori abituali hanno convertito il proprio profilo, Anonymous sign-ins puo essere disattivato.
- Non attivare Single session per user se vuoi usare lo stesso account contemporaneamente su piu dispositivi.

NOTE
- Le email non vengono mostrate nelle classifiche.
- Le classifiche mostrano lo username verificato.
- Un account email verificato rende i dati piu affidabili, ma non impedisce in assoluto a una persona di creare piu indirizzi email.
