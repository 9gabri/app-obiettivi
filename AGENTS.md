# Istruzioni progetto

## Descrizione progetto

Questo progetto e' una PWA mobile-first per gestire attivita giornaliere, categorie, attivita ricorrenti, obiettivi a lungo termine e dashboard settimanale/mensile.

L'app e' statica e non usa backend, database, login, notifiche o librerie esterne.

I dati sono salvati nel browser tramite `localStorage`.

## Stack

- HTML
- CSS
- JavaScript puro
- `manifest.json`
- service worker `sw.js`
- GitHub Pages

## Regole fondamentali

- Non cambiare `localStorage` o struttura dati senza piano e conferma.
- Non modificare `manifest.json` o `icons/` salvo richiesta esplicita.
- Se cambiano file statici, incrementare `CACHE_NAME` in `sw.js`.
- Non usare librerie esterne.
- Non aggiungere backend, database, login, notifiche o sincronizzazione senza richiesta esplicita.
- Non fare commit senza test e conferma.
- Non fare push senza conferma.
- Mantenere l'app mobile-first, semplice e pulita.

## Funzioni attuali

- Vista Giornata.
- Vista Obiettivi a lungo termine.
- Vista Dashboard.
- Attivita singole.
- Categorie: Fisico, Studio, Lavoro, Altro.
- Attivita ricorrenti.
- Eliminazione ricorrenza: solo questo giorno / tutta la serie.
- Obiettivi a lungo termine collegabili alle attivita.
- Dashboard settimanale e mensile.
- PWA installabile.
- Restyling dark premium.

## Comandi di controllo

```powershell
node --check script.js
node --check sw.js
git status
```
