# Il mio Quaderno

Quaderno digitale che si installa sulla schermata Home come un'app e funziona anche senza internet.

## Metterlo online (5 minuti, gratis)

L'app è fatta solo di file, quindi basta un hosting statico. Il più semplice:

1. Vai su **https://app.netlify.com/drop** (serve un account gratuito).
2. Trascina dentro la **cartella `quaderno`** intera.
3. Netlify ti dà un indirizzo tipo `https://nome-a-caso.netlify.app`. In "Site settings" puoi cambiarlo, per esempio in `quaderno-di-maria.netlify.app`.

In alternativa vanno bene GitHub Pages, Cloudflare Pages o Vercel. Serve **https**, altrimenti installazione e funzionamento offline non sono attivi.

## Installarlo sul telefono

- **iPhone/iPad:** apri il link con **Safari**, tocca Condividi e poi «Aggiungi alla schermata Home».
- **Android:** apri il link con **Chrome**, tocca ⋮ e poi «Installa app» (o «Aggiungi a schermata Home»).
- **Computer:** in Chrome o Edge, tocca l'icona di installazione nella barra degli indirizzi.

L'app stessa spiega questi passaggi con i foglietti gialli.

## Come funziona la memoria

1. **Salvataggio continuo:** ogni modifica viene salvata nel database del dispositivo (IndexedDB) mentre si scrive. Non c'è un tasto "salva".
2. **Memoria protetta:** l'app chiede al browser di non cancellare mai i dati (storage persistente).
3. **Copia su file:**
   - Su computer (Chrome/Edge): si sceglie un file una volta sola e la copia si aggiorna da sola. Se ci sono modifiche non copiate, il browser chiede conferma prima di chiudere.
   - Su telefono: il quaderno guida passo passo («Salva su File», Drive…) e ricorda di fare una copia dopo che si è scritto molto o se l'ultima copia ha più di 3 giorni.
   - «Ripristina una copia» unisce la copia a ciò che c'è già, senza cancellare niente. Serve anche per passare a un telefono nuovo.
4. **Cestino** di 30 giorni per quaderni e capitoli eliminati.
5. **Versioni precedenti:** per ogni capitolo vengono conservate fino a 20 versioni, ripristinabili dal menu ⋮.

Nota: nessun browser permette a un sito di salvare un file da solo all'uscita senza che la persona tocchi un pulsante. Per questo la protezione è a più livelli.

## Il PDF intelligente

Da un quaderno, «Crea PDF» produce un PDF con: copertina, **indice cliccabile**, **segnalibri**, capitoli con evidenziature e foto, pagina **Punti chiave** con tutte le frasi evidenziate (ognuna con il link al capitolo), numeri di pagina e il link «Torna all'indice» su ogni pagina. Il testo si può cercare e copiare.

## File

- `index.html`, `styles.css`, `app.js`: l'app
- `pdf.js`: creazione del PDF (usa `vendor/jspdf.umd.min.js`, incluso per l'uso offline)
- `sw.js`, `manifest.webmanifest`, `icons/`: installazione e funzionamento offline
- `fonts/`: caratteri Literata e Atkinson Hyperlegible (pensato per la massima leggibilità), inclusi per l'uso offline

Se modifichi i file, aumenta il numero in `CACHE = 'quaderno-v1'` dentro `sw.js`, così i telefoni scaricano la nuova versione.
