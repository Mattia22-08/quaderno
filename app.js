/* Il mio Quaderno — app principale
   Memoria a tre livelli:
   1) ogni lettera viene salvata nel database del dispositivo (IndexedDB) mentre scrivi;
   2) il browser viene pregato di non cancellare mai questi dati (storage persistente);
   3) copia di sicurezza su file (automatica dove il browser lo permette, guidata altrove),
      con cestino e versioni precedenti di ogni capitolo per rimediare agli errori. */
(function () {
  'use strict';

  /* =========================================================
     Utilità
     ========================================================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = (...a) => { clearTimeout(t); return fn(...a); }; d.cancel = () => clearTimeout(t); return d; };
  const num = (n) => Number(n || 0).toLocaleString('it-IT');
  const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`;

  const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    back: I('<path d="M15 18l-6-6 6-6"/>'),
    next: I('<path d="M9 18l6-6-6-6"/>'),
    plus: I('<path d="M12 5v14M5 12h14"/>'),
    more: I('<circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>'),
    search: I('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
    gear: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    save: I('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>'),
    restore: I('<path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 3h14"/>'),
    pdf: I('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
    star: I('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
    trash: I('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    photo: I('<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M21 17l-5-5-9 8"/>'),
    eraser: I('<path d="M20 20H8l-4-4 10-10 6 6-6 6"/><path d="M9 11l6 6"/>'),
    pencil: I('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>'),
    check: I('<path d="M5 12l5 5 9-10"/>'),
    shield: I('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
    warn: I('<path d="M12 8v5M12 17h.01"/><circle cx="12" cy="12" r="9"/>'),
    up: I('<path d="M12 19V5M6 11l6-6 6 6"/>'),
    down: I('<path d="M12 5v14M6 13l6 6 6-6"/>'),
    clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    palette: I('<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5s.8-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.7-4-8.5-9-8.5z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/>'),
    bulb: I('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'),
    share: I('<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>'),
    home: I('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
    book: I('<path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M4 17a3 3 0 0 1 3-3h11"/>')
  };

  const COVERS = [
    { c: '#2D55C8', n: 'Blu inchiostro' }, { c: '#5E8C6A', n: 'Salvia' }, { c: '#C0607A', n: 'Rosa antico' }, { c: '#C8952D', n: 'Ocra' },
    { c: '#1F7A80', n: 'Petrolio' }, { c: '#7A4E8C', n: 'Prugna' }, { c: '#4A5568', n: 'Ardesia' }, { c: '#D9634F', n: 'Corallo' }
  ];
  const HLS = [
    { c: 'yellow', n: 'Giallo', v: 'var(--hl-yellow)' }, { c: 'green', n: 'Verde', v: 'var(--hl-green)' },
    { c: 'pink', n: 'Rosa', v: 'var(--hl-pink)' }, { c: 'blue', n: 'Azzurro', v: 'var(--hl-blue)' }
  ];

  const DAY = 86400000;
  function ago(ts) {
    if (!ts) return 'mai';
    const d = Date.now() - ts;
    if (d < 45000) return 'adesso';
    if (d < 3600000) { const m = Math.round(d / 60000); return m === 1 ? '1 minuto fa' : `${m} minuti fa`; }
    if (d < DAY && new Date(ts).getDate() === new Date().getDate()) { const h = Math.round(d / 3600000); return h === 1 ? "un'ora fa" : `${h} ore fa`; }
    if (d < 2 * DAY) return 'ieri';
    if (d < 7 * DAY) return `${Math.round(d / DAY)} giorni fa`;
    return new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  const longDate = (ts = Date.now()) => new Date(ts).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  /* =========================================================
     Database (IndexedDB) con riserva in memoria
     ========================================================= */
  const DB = {
    db: null,
    mem: null, // usata solo se IndexedDB non è disponibile
    stores: ['notebooks', 'chapters', 'images', 'versions', 'meta'],
    open() {
      return new Promise((resolve) => {
        let req;
        try { req = indexedDB.open('quaderno', 1); } catch (e) { this.useMem(); return resolve(false); }
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('notebooks')) db.createObjectStore('notebooks', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('chapters')) db.createObjectStore('chapters', { keyPath: 'id' }).createIndex('notebookId', 'notebookId');
          if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('versions')) db.createObjectStore('versions', { keyPath: 'id' }).createIndex('chapterId', 'chapterId');
          if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
        };
        req.onsuccess = () => { this.db = req.result; this.db.onversionchange = () => this.db.close(); resolve(true); };
        req.onerror = () => { this.useMem(); resolve(false); };
        req.onblocked = () => {};
      });
    },
    useMem() { this.mem = {}; this.stores.forEach((s) => { this.mem[s] = new Map(); }); },
    tx(store, mode, fn) {
      if (this.mem) return Promise.resolve(fn(null));
      return new Promise((resolve, reject) => {
        const t = this.db.transaction(store, mode);
        const s = t.objectStore(store);
        let result;
        const r = fn(s);
        if (r && 'onsuccess' in r) r.onsuccess = () => { result = r.result; };
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      });
    },
    async get(store, key) { if (this.mem) return this.mem[store].get(key); return this.tx(store, 'readonly', (s) => s.get(key)); },
    async all(store) { if (this.mem) return Array.from(this.mem[store].values()); return this.tx(store, 'readonly', (s) => s.getAll()); },
    async put(store, val) {
      Saver.begin();
      try {
        if (this.mem) { this.mem[store].set(val.id || val.key, val); }
        else await this.tx(store, 'readwrite', (s) => s.put(val));
      } finally { Saver.end(); }
    },
    async del(store, key) { if (this.mem) { this.mem[store].delete(key); return; } return this.tx(store, 'readwrite', (s) => s.delete(key)); },
    async byIndex(store, index, key) {
      if (this.mem) return Array.from(this.mem[store].values()).filter((v) => v[index] === key);
      return this.tx(store, 'readonly', (s) => s.index(index).getAll(key));
    }
  };

  /* Indicatore "Salvato" */
  const Saver = {
    pending: 0,
    begin() { this.pending++; this.paint(); },
    end() { this.pending = Math.max(0, this.pending - 1); setTimeout(() => this.paint(), 250); },
    paint() {
      $$('.save-pill').forEach((el) => {
        const busy = this.pending > 0 || Editor.dirty;
        el.classList.toggle('saving', busy);
        el.textContent = busy ? 'Salvataggio…' : 'Salvato';
      });
    }
  };

  /* =========================================================
     Stato
     ========================================================= */
  const S = {
    profile: { name: '', started: false },
    settings: { size: 'normal', theme: 'auto', guide: true },
    meta: { lastChangeAt: 0, lastBackupAt: 0, backupName: '', tips: {}, pdfMade: {} },
    notebooks: [],
    chapters: [],
    persisted: false,
    fileHandle: null,
    fileAuto: false, // salvataggio automatico su file attivo in questa sessione
    installEvent: null
  };

  const liveNotebooks = () => S.notebooks.filter((n) => !n.deletedAt).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const chaptersOf = (nbId) => S.chapters.filter((c) => c.notebookId === nbId && !c.deletedAt).sort((a, b) => a.order - b.order);
  const nbById = (id) => S.notebooks.find((n) => n.id === id);
  const chById = (id) => S.chapters.find((c) => c.id === id);

  async function loadAll() {
    const [nbs, chs, profile, settings, meta, handle] = await Promise.all([
      DB.all('notebooks'), DB.all('chapters'), DB.get('meta', 'profile'), DB.get('meta', 'settings'), DB.get('meta', 'meta'), DB.get('meta', 'fileHandle')
    ]);
    S.notebooks = nbs || [];
    S.chapters = chs || [];
    if (profile) S.profile = { ...S.profile, ...profile.value };
    if (settings) S.settings = { ...S.settings, ...settings.value };
    if (meta) S.meta = { ...S.meta, ...meta.value };
    if (handle && handle.value) S.fileHandle = handle.value;
    // svuota il cestino più vecchio di 30 giorni
    const old = Date.now() - 30 * DAY;
    for (const c of S.chapters.filter((c) => c.deletedAt && c.deletedAt < old)) await purgeChapter(c.id);
    for (const n of S.notebooks.filter((n) => n.deletedAt && n.deletedAt < old)) await purgeNotebook(n.id);
  }

  const saveMeta = debounce(() => DB.put('meta', { key: 'meta', value: S.meta }), 300);
  const saveProfile = () => DB.put('meta', { key: 'profile', value: S.profile });
  const saveSettings = () => DB.put('meta', { key: 'settings', value: S.settings });

  function touch() {
    S.meta.lastChangeAt = Date.now();
    saveMeta();
    askPersist();
    FileBackup.schedule();
  }

  let persistAsked = false;
  async function askPersist() {
    if (S.persisted || persistAsked || !navigator.storage || !navigator.storage.persist) return;
    persistAsked = true;
    try { S.persisted = await navigator.storage.persisted() || await navigator.storage.persist(); } catch (e) { /* niente */ }
  }

  async function putNotebook(nb) { nb.updatedAt = Date.now(); await DB.put('notebooks', nb); touch(); }
  async function putChapter(ch) {
    ch.updatedAt = Date.now();
    await DB.put('chapters', ch);
    const nb = nbById(ch.notebookId);
    if (nb) { nb.updatedAt = ch.updatedAt; await DB.put('notebooks', nb); }
    touch();
  }

  async function createNotebook(title, color) {
    const nb = { id: uid(), title: title.trim() || 'Nuovo quaderno', color: color || COVERS[S.notebooks.length % COVERS.length].c, createdAt: Date.now(), updatedAt: Date.now() };
    S.notebooks.push(nb);
    await putNotebook(nb);
    return nb;
  }
  async function createChapter(nbId, title) {
    const list = chaptersOf(nbId);
    const ch = { id: uid(), notebookId: nbId, title: title || '', html: '', text: '', order: list.length ? list[list.length - 1].order + 1 : 0, createdAt: Date.now(), updatedAt: Date.now() };
    S.chapters.push(ch);
    await putChapter(ch);
    return ch;
  }
  async function purgeChapter(id) {
    S.chapters = S.chapters.filter((c) => c.id !== id);
    await DB.del('chapters', id);
    const vs = await DB.byIndex('versions', 'chapterId', id);
    for (const v of vs) await DB.del('versions', v.id);
  }
  async function purgeNotebook(id) {
    for (const c of S.chapters.filter((c) => c.notebookId === id)) await purgeChapter(c.id);
    S.notebooks = S.notebooks.filter((n) => n.id !== id);
    await DB.del('notebooks', id);
  }

  /* ---------- contenuto: pulizia, testo, conteggi ---------- */
  const ALLOWED = { P: [], DIV: [], BR: [], MARK: ['data-c'], FIGURE: [], IMG: ['data-id'] };
  function sanitize(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html || '';
    (function walk(node) {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) return;
        if (n.nodeType !== 1) { n.remove(); return; }
        const tag = n.tagName;
        if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META)$/.test(tag)) { n.remove(); return; }
        if (!ALLOWED[tag]) { walk(n); n.replaceWith(...n.childNodes); return; }
        Array.from(n.attributes).forEach((a) => { if (!ALLOWED[tag].includes(a.name)) n.removeAttribute(a.name); });
        if (tag === 'MARK' && !HLS.some((h) => h.c === n.dataset.c)) n.dataset.c = 'yellow';
        if (tag === 'IMG' && !n.dataset.id) { n.remove(); return; }
        walk(n);
      });
    })(tpl.content);
    return tpl.innerHTML;
  }
  function htmlToText(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = (html || '').replace(/<\/(p|div|figure)>/gi, '</$1>\n').replace(/<br\s*\/?>/gi, '\n');
    return tpl.content.textContent.replace(/\n{3,}/g, '\n\n').trim();
  }
  const wordCount = (ch) => ((ch.text || '').match(/[\p{L}\p{N}]+/gu) || []).length;
  const hlCount = (ch) => ((ch.html || '').match(/<mark/g) || []).length;
  const imgIds = (html) => Array.from((html || '').matchAll(/data-id="([^"]+)"/g)).map((m) => m[1]);

  /* ---------- immagini ---------- */
  const imgURLs = new Map();
  async function imageURL(id) {
    if (imgURLs.has(id)) return imgURLs.get(id);
    const rec = await DB.get('images', id);
    if (!rec) return '';
    const url = URL.createObjectURL(rec.blob);
    imgURLs.set(id, url);
    return url;
  }
  function hydrate(root) {
    $$('img[data-id]', root).forEach(async (img) => { if (!img.getAttribute('src')) { const u = await imageURL(img.dataset.id); if (u) img.src = u; else img.alt = 'Foto non trovata'; } });
  }
  async function processPhoto(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const max = 1600;
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const cx = cv.getContext('2d');
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);
      cx.drawImage(img, 0, 0, w, h);
      const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.84));
      const rec = { id: 'img' + uid(), blob, w, h, createdAt: Date.now() };
      await DB.put('images', rec);
      return rec;
    } finally { URL.revokeObjectURL(url); }
  }
  const blobToDataURL = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  async function dataURLToBlob(d) { return (await fetch(d)).blob(); }

  /* =========================================================
     Copia di sicurezza su file
     ========================================================= */
  async function buildBackup() {
    const ids = new Set();
    S.chapters.forEach((c) => imgIds(c.html).forEach((i) => ids.add(i)));
    const images = [];
    for (const id of ids) {
      const rec = await DB.get('images', id);
      if (rec) images.push({ id, w: rec.w, h: rec.h, data: await blobToDataURL(rec.blob) });
    }
    const payload = {
      app: 'il-mio-quaderno', version: 1, exportedAt: Date.now(),
      profile: S.profile, settings: S.settings,
      notebooks: S.notebooks, chapters: S.chapters, images
    };
    return new Blob([JSON.stringify(payload)], { type: 'application/json' });
  }
  // un file nuovo ogni volta, con data e ora nel nome: «Quaderno 2026-11-17 ore 16.30.json»
  const backupFileName = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `Quaderno ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ore ${p(d.getHours())}.${p(d.getMinutes())}.json`;
  };

  function markBackedUp(name) {
    S.meta.lastBackupAt = Date.now();
    if (name) S.meta.backupName = name;
    saveMeta.flush();
    refreshMemory();
  }

  const FileBackup = {
    supported: typeof window.showSaveFilePicker === 'function',
    timer: null,
    schedule() {
      if (!S.fileHandle || !S.fileAuto) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.write(false), 4000);
    },
    async permission(ask) {
      if (!S.fileHandle) return false;
      try {
        const o = { mode: 'readwrite' };
        if ((await S.fileHandle.queryPermission(o)) === 'granted') return true;
        if (ask && (await S.fileHandle.requestPermission(o)) === 'granted') return true;
      } catch (e) { /* niente */ }
      return false;
    },
    async write(ask) {
      if (!(await this.permission(ask))) { S.fileAuto = false; refreshMemory(); return false; }
      try {
        Saver.begin();
        const blob = await buildBackup();
        const w = await S.fileHandle.createWritable();
        await w.write(blob);
        await w.close();
        S.fileAuto = true;
        markBackedUp(S.fileHandle.name);
        return true;
      } catch (e) {
        console.warn(e);
        return false;
      } finally { Saver.end(); }
    },
    async choose() {
      try {
        const h = await window.showSaveFilePicker({ suggestedName: 'Il mio Quaderno - copia di sicurezza.json', types: [{ description: 'Copia del quaderno', accept: { 'application/json': ['.json'] } }] });
        S.fileHandle = h;
        await DB.put('meta', { key: 'fileHandle', value: h });
        S.fileAuto = true;
        return this.write(true);
      } catch (e) { return false; }
    }
  };

  /* Condivide o scarica un file in modo guidato */
  async function deliverFile(blob, name, kind) {
    const file = new File([blob], name, { type: blob.type });
    const canShare = navigator.canShare && navigator.canShare({ files: [file] });
    const isPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return new Promise((resolve) => {
      const steps = kind === 'pdf'
        ? (ios ? ['Tocca «Condividi il PDF».', 'Scegli WhatsApp, Mail, oppure «Salva su File».'] : ['Tocca «Condividi il PDF».', 'Scegli a chi mandarlo, oppure salvalo.'])
        : (ios
          ? (S.meta.iosFolder
            ? ['Tocca «Salva il file».', 'Scegli «Salva su File»: si apre già la cartella «Quaderno».', 'Tocca «Salva». Fatto!']
            : ['Tocca «Salva il file», poi scegli «Salva su File».', 'Tocca «Sul mio iPad» (o «Su iPhone»).', 'Tocca l\'icona della cartella con il «+» e chiamala <strong>Quaderno</strong>.', 'Apri la cartella «Quaderno» e tocca «Salva». Dalla prossima volta si aprirà già lì.'])
          : ['Tocca «Salva il file».', 'Scegli «Drive», «File» o la cartella dove tenerlo.']);
      const buttons = [];
      if (canShare && isPhone) {
        buttons.push({ label: kind === 'pdf' ? 'Condividi il PDF' : 'Salva il file', icon: kind === 'pdf' ? ICON.share : ICON.save, primary: true, keep: true, run: async (close) => {
          try { await navigator.share({ files: [file], title: name }); if (kind !== 'pdf') S.meta.iosFolder = true; close(); resolve(true); }
          catch (e) { if (e && e.name === 'AbortError') toast('Nessun problema, puoi riprovare quando vuoi.'); else { download(blob, name); close(); resolve(true); } }
        } });
        buttons.push({ label: 'Scarica sul dispositivo', run: () => { download(blob, name); resolve(true); } });
      } else {
        buttons.push({ label: kind === 'pdf' ? 'Scarica il PDF' : 'Scarica il file', icon: ICON.save, primary: true, run: () => { download(blob, name); resolve(true); } });
        if (kind === 'pdf') buttons.push({ label: 'Apri il PDF', run: () => { window.open(URL.createObjectURL(blob), '_blank'); resolve(true); } });
      }
      buttons.push({ label: kind === 'pdf' ? 'Annulla' : 'Più tardi', secondary: true, run: () => resolve(false) });
      const list = canShare && isPhone ? steps : [kind === 'pdf' ? 'Tocca «Scarica il PDF»: lo trovi nella cartella Download.' : 'Tocca «Scarica il file»: lo trovi nella cartella Download. Tienilo da parte!'];
      dialog({
        title: kind === 'pdf' ? 'Il tuo PDF è pronto' : 'La copia è pronta',
        body: `<p>${kind === 'pdf' ? `«${esc(name.replace(/\.pdf$/, ''))}» · ${(blob.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : 'Contiene tutti i quaderni, i capitoli e le foto.'}</p><ol class="steps">${list.map((s) => `<li>${s}</li>`).join('')}</ol>`,
        buttons
      });
    });
  }
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }

  async function backupNow() {
    await Editor.flush();
    if (S.fileHandle && FileBackup.supported) {
      const ok = await FileBackup.write(true);
      if (ok) { toast(`Copia salvata nel file «${S.fileHandle.name}»`); return; }
    }
    if (FileBackup.supported) {
      dialog({
        title: 'Salva una copia su file',
        body: '<p>Scegli dove tenere la copia (per esempio nella cartella Documenti). Da quel momento il quaderno la aggiornerà <strong>da solo</strong>, ogni volta che scrivi.</p>',
        buttons: [
          { label: 'Scegli dove salvarla', icon: ICON.save, primary: true, run: async () => { if (await FileBackup.choose()) toast('Fatto! La copia si aggiornerà da sola.'); } },
          { label: 'Annulla', secondary: true }
        ]
      });
      return;
    }
    toast('Preparo la copia…');
    const blob = await buildBackup();
    const ok = await deliverFile(blob, backupFileName(), 'backup');
    if (ok) { markBackedUp(backupFileName()); toast('Copia di sicurezza fatta. Bravissimo lavoro!'); }
  }

  function restoreFromFile(file) {
    const r = new FileReader();
    r.onload = async () => {
      let data;
      try { data = JSON.parse(r.result); } catch (e) { data = null; }
      if (!data || data.app !== 'il-mio-quaderno') { dialog({ title: 'File non valido', body: '<p>Questo file non è una copia del quaderno. Apri la cartella «Quaderno» e scegli il file più recente (il nome contiene data e ora).</p>', buttons: [{ label: 'Ho capito', primary: true }] }); return; }
      const nbs = (data.notebooks || []).filter((n) => !n.deletedAt);
      const chs = (data.chapters || []).filter((c) => !c.deletedAt);
      dialog({
        title: 'Ripristinare questa copia?',
        body: `<p>Copia del ${esc(longDate(data.exportedAt))}: ${plural(nbs.length, 'quaderno', 'quaderni')} e ${plural(chs.length, 'capitolo', 'capitoli')}.</p><p>Niente di quello che hai adesso verrà cancellato: se un capitolo esiste già, tengo la versione più recente.</p>`,
        buttons: [
          { label: 'Sì, ripristina', icon: ICON.restore, primary: true, run: async () => {
            for (const im of data.images || []) { if (!(await DB.get('images', im.id))) await DB.put('images', { id: im.id, w: im.w, h: im.h, blob: await dataURLToBlob(im.data), createdAt: Date.now() }); }
            for (const nb of data.notebooks || []) {
              const cur = nbById(nb.id);
              if (!cur || (nb.updatedAt || 0) > (cur.updatedAt || 0)) { if (cur) Object.assign(cur, nb); else S.notebooks.push(nb); await DB.put('notebooks', nb); }
            }
            for (const ch of data.chapters || []) {
              ch.html = sanitize(ch.html);
              const cur = chById(ch.id);
              if (!cur || (ch.updatedAt || 0) > (cur.updatedAt || 0)) { if (cur) Object.assign(cur, ch); else S.chapters.push(ch); await DB.put('chapters', ch); }
            }
            if (data.profile && data.profile.name && !S.profile.name) { S.profile.name = data.profile.name; }
            S.profile.started = true;
            await saveProfile();
            S.meta.lastBackupAt = Date.now();
            touch();
            toast('Copia ripristinata!');
            go('');
            render();
          } },
          { label: 'Annulla', secondary: true }
        ]
      });
    };
    r.readAsText(file);
  }

  /* =========================================================
     Finestre, notifiche
     ========================================================= */
  let toastTimer;
  function toast(msg, action) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>`;
    if (action) {
      const b = document.createElement('button');
      b.textContent = action.label;
      b.onclick = () => { t.hidden = true; action.run(); };
      t.appendChild(b);
    }
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, action ? 6000 : 3200);
  }

  function dialog({ title, body = '', input, buttons = [{ label: 'Ok', primary: true }], onOpen }) {
    const root = $('#modal-root');
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
      <h2 id="dlg-title">${esc(title)}</h2>${body}
      ${input ? `<input id="dlg-input" class="field" type="text" autocomplete="off" placeholder="${esc(input.placeholder || '')}" value="${esc(input.value || '')}" maxlength="120">` : ''}
      <div class="buttons"></div></div>`;
    const box = $('.buttons', ov);
    const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.className = 'btn wide ' + (b.danger ? 'danger' : b.primary ? '' : 'secondary');
      el.innerHTML = (b.icon || '') + `<span>${esc(b.label)}</span>`;
      el.onclick = async () => {
        const val = input ? $('#dlg-input', ov).value : undefined;
        if (!b.keep) close();
        if (b.run) await b.run(b.keep ? close : val, val);
      };
      box.appendChild(el);
    });
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter' && input) { e.preventDefault(); const p = box.querySelector('.btn:not(.secondary)'); if (p) p.click(); }
    };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    root.appendChild(ov);
    if (input) setTimeout(() => { const f = $('#dlg-input', ov); f.focus(); f.select(); }, 60);
    if (onOpen) onOpen(ov, close);
    return close;
  }

  function menu(title, items) {
    return dialog({
      title,
      body: `<div class="menu-list">${items.map((it, i) => `<button class="menu-item ${it.danger ? 'danger' : ''}" data-i="${i}">${it.icon || ''}<span>${esc(it.label)}</span></button>`).join('')}</div>`,
      buttons: [{ label: 'Chiudi', secondary: true }],
      onOpen: (ov, close) => { $$('.menu-item', ov).forEach((b) => { b.onclick = () => { close(); items[+b.dataset.i].run(); }; }); }
    });
  }

  function confirmBox(title, text, okLabel, run, danger) {
    dialog({ title, body: `<p>${text}</p>`, buttons: [{ label: okLabel, primary: !danger, danger, run }, { label: 'Annulla', secondary: true }] });
  }

  /* =========================================================
     Navigazione
     ========================================================= */
  const trail = [];
  function go(hash) {
    const h = hash ? '#' + hash : '';
    if (location.hash === h || (!hash && !location.hash)) { render(); return; }
    location.hash = h;
  }
  function back(fallback) {
    if (trail.length > 1) history.back();
    else { history.replaceState(null, '', fallback ? '#' + fallback : location.pathname + location.search); trail[trail.length - 1] = fallback || ''; render(); }
  }
  function onRoute() {
    const h = location.hash.slice(1);
    if (trail.length > 1 && trail[trail.length - 2] === h) trail.pop();
    else if (trail[trail.length - 1] !== h) trail.push(h);
    render();
  }

  const app = $('#app');
  async function render() {
    const wroteSomething = !!(Editor.ch && Editor.edited);
    await Editor.flush();
    Editor.detach();
    const h = location.hash.slice(1);
    document.documentElement.dataset.size = S.settings.size;
    if (S.settings.theme === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = S.settings.theme;
    if (!S.profile.started) return viewWelcome();
    if (h.startsWith('q-') && nbById(h.slice(2)) && !nbById(h.slice(2)).deletedAt) viewNotebook(nbById(h.slice(2)));
    else if (h.startsWith('c-') && chById(h.slice(2)) && !chById(h.slice(2)).deletedAt) viewChapter(chById(h.slice(2)));
    else if (h.startsWith('p-') && nbById(h.slice(2))) viewKeypoints(nbById(h.slice(2)));
    else if (h === 'opzioni') viewSettings();
    else if (h === 'cestino') viewTrash();
    else viewHome();
    if (wroteSomething && !h.startsWith('c-')) autoCopyAfterWriting();
    window.scrollTo(0, 0);
    Saver.paint();
  }

  /* Copia automatica: appena si esce da un capitolo in cui si è scritto, la copia nuova è già pronta.
     Su iPad/iPhone basta un tocco per metterla nella cartella «Quaderno» (Apple non permette di farlo senza tocco).
     Sul computer (Chrome/Edge) la copia su file si aggiorna già da sola. */
  function autoCopyAfterWriting() {
    if (FileBackup.supported && S.fileAuto) return;
    // (si arriva qui solo se nel capitolo si è davvero scritto qualcosa)
    if ($('.overlay')) return;
    setTimeout(backupNow, 350);
  }

  function topbar({ backLabel, backTo, title = '', right = '' }) {
    return `<header class="topbar"><div class="topbar-inner">
      ${backLabel != null ? `<button class="back" data-back="${esc(backTo)}">${ICON.back}<span>${esc(backLabel)}</span></button>` : ''}
      <div class="topbar-title">${esc(title)}</div>
      <span class="save-pill">Salvato</span>${right}</div></header>`;
  }
  function wireTopbar() {
    const b = $('[data-back]', app);
    if (b) b.onclick = () => back(b.dataset.back);
  }

  /* =========================================================
     Guida intelligente: suggerisce sempre il prossimo passo
     ========================================================= */
  function guideCard(g) {
    if (!g || !S.settings.guide) return '';
    return `<aside class="guide" data-tip="${esc(g.key || '')}">
      <div class="label">${ICON.bulb}<span>Il quaderno ti suggerisce</span></div>
      <p>${g.text}</p>
      <div class="actions">${g.action ? `<button class="btn" data-guide-go>${g.icon || ''}<span>${esc(g.action)}</span></button>` : ''}
      ${g.key ? '<button class="btn ghost" data-guide-skip>Ho capito</button>' : ''}</div></aside>`;
  }
  function wireGuide(g) {
    if (!g) return;
    const go1 = $('[data-guide-go]', app);
    if (go1) go1.onclick = g.run;
    const skip = $('[data-guide-skip]', app);
    if (skip) skip.onclick = () => { S.meta.tips[g.key] = Date.now(); saveMeta(); skip.closest('.guide').remove(); };
  }
  const tipDone = (k) => !!S.meta.tips[k];
  const totalWords = () => S.chapters.filter((c) => !c.deletedAt).reduce((s, c) => s + wordCount(c), 0);
  const needsBackup = () => {
    if (S.fileAuto) return false;
    if (!S.meta.lastChangeAt || S.meta.lastChangeAt <= S.meta.lastBackupAt) return false;
    if (!S.meta.lastBackupAt) return totalWords() >= 40 || S.chapters.length >= 3;
    return Date.now() - S.meta.lastBackupAt > 3 * DAY;
  };
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function homeGuide() {
    const nbs = liveNotebooks();
    if (!nbs.length) return { text: 'Iniziamo! Crea il tuo primo quaderno: basta dargli un nome, per esempio <strong>«Storia dell\'arte»</strong> o <strong>«Ricette di casa»</strong>.', action: 'Crea il primo quaderno', icon: ICON.plus, run: newNotebookFlow };
    if (needsBackup()) return { text: S.meta.lastBackupAt ? `L'ultima copia su file è di ${ago(S.meta.lastBackupAt)}. Facciamone una nuova, così niente va perso.` : 'Hai scritto tanto! Salva una <strong>copia di sicurezza</strong> su file: così i tuoi appunti restano al sicuro anche se cambi telefono.', action: 'Salva una copia adesso', icon: ICON.save, run: backupNow };
    if (!isStandalone() && !tipDone('install')) {
      if (S.installEvent) return { key: 'install', text: 'Metti il quaderno sulla schermata Home: lo apri con un tocco, come un\'app, anche senza internet.', action: 'Aggiungi alla Home', icon: ICON.home, run: async () => { S.installEvent.prompt(); await S.installEvent.userChoice; S.installEvent = null; render(); } };
      if (isIOS()) return { key: 'install', text: 'Per averlo sempre a portata di mano: tocca il tasto <strong>Condividi</strong> in basso (il quadrato con la freccia), poi <strong>«Aggiungi alla schermata Home»</strong>.' };
    }
    const last = S.chapters.filter((c) => !c.deletedAt && nbById(c.notebookId) && !nbById(c.notebookId).deletedAt).sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (last && Date.now() - last.updatedAt < 14 * DAY) {
      const nb = nbById(last.notebookId);
      return { text: `Riprendi da dove avevi lasciato: <strong>«${esc(last.title || 'Senza titolo')}»</strong> nel quaderno «${esc(nb.title)}».`, action: 'Continua a scrivere', icon: ICON.pencil, run: () => go('c-' + last.id) };
    }
    return { text: 'Apri un quaderno e scegli un capitolo: tutto quello che scrivi si salva da solo, mentre scrivi.' };
  }

  function notebookGuide(nb, chs) {
    if (!chs.length) return { text: 'Un quaderno si divide in <strong>capitoli</strong>, come un libro. Aggiungi il primo: per esempio «Introduzione» o «Lezione 1».', action: 'Aggiungi il primo capitolo', icon: ICON.plus, run: () => newChapterFlow(nb) };
    const empty = chs.find((c) => !c.text && !imgIds(c.html).length);
    const written = chs.filter((c) => wordCount(c) > 20);
    const hl = chs.reduce((s, c) => s + hlCount(c), 0);
    if (!written.length && empty) return { text: `Apri <strong>«${esc(empty.title || 'il capitolo')}»</strong> e inizia a scrivere. Non serve premere «salva»: ci pensa il quaderno.`, action: 'Apri e scrivi', icon: ICON.pencil, run: () => go('c-' + empty.id) };
    if (hl >= 3 && !tipDone('kp-' + nb.id)) return { key: 'kp-' + nb.id, text: `Hai evidenziato ${plural(hl, 'frase', 'frasi')}. Le trovi tutte insieme in <strong>«Punti chiave»</strong>, pronte da ripassare.`, action: 'Vedi i punti chiave', icon: ICON.star, run: () => go('p-' + nb.id) };
    if (written.length >= 2 && !S.meta.pdfMade[nb.id] && !tipDone('pdf-' + nb.id)) return { key: 'pdf-' + nb.id, text: 'Il quaderno sta prendendo forma! Puoi trasformarlo in un <strong>PDF con indice cliccabile</strong> da mandare a chi vuoi.', action: 'Crea il PDF', icon: ICON.pdf, run: () => makePDF(nb) };
    if (written.length && !hl && !tipDone('hl')) return { key: 'hl', text: 'Prova gli <strong>evidenziatori</strong>: dentro un capitolo seleziona qualche parola importante e tocca un colore. Poi le ritrovi in «Punti chiave».' };
    return null;
  }

  /* =========================================================
     Schermata di benvenuto
     ========================================================= */
  function viewWelcome() {
    app.innerHTML = `<main class="welcome">
      <div class="eyebrow">Il mio Quaderno</div>
      <h1>Ciao! Questo è il tuo quaderno digitale.</h1>
      <ul>
        <li><i style="--c:var(--hl-yellow)"></i>Scrivi i tuoi appunti, divisi in capitoli.</li>
        <li><i style="--c:var(--hl-green)"></i>Evidenzia le cose importanti e aggiungi foto.</li>
        <li><i style="--c:var(--hl-pink)"></i>Tutto si salva da solo. Niente va perso.</li>
        <li><i style="--c:var(--hl-blue)"></i>Quando vuoi, lo trasformi in un PDF da condividere.</li>
      </ul>
      <label for="w-name"><p>Come ti chiami?</p></label>
      <input id="w-name" class="field" type="text" autocomplete="given-name" placeholder="Il tuo nome" maxlength="40">
      <button class="btn wide" id="w-go">${ICON.next}<span>Cominciamo</span></button>
      <button class="btn ghost" id="w-restore">${ICON.restore}<span>Ho già una copia del quaderno</span></button>
    </main>`;
    const start = async () => {
      S.profile.name = $('#w-name').value.trim();
      S.profile.started = true;
      await saveProfile();
      askPersist();
      render();
    };
    $('#w-go').onclick = start;
    $('#w-name').onkeydown = (e) => { if (e.key === 'Enter') start(); };
    $('#w-restore').onclick = () => $('#restore-input').click();
  }

  /* =========================================================
     Home
     ========================================================= */
  function greeting() {
    const h = new Date().getHours();
    const g = h < 6 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
    return S.profile.name ? `${g}, ${S.profile.name}` : g;
  }

  function memoryPanel() {
    const auto = S.fileHandle && S.fileAuto;
    const rows = [];
    rows.push({ ok: true, title: 'Salvato su questo dispositivo', sub: S.meta.lastChangeAt ? `Ultima modifica ${ago(S.meta.lastChangeAt)}. Si salva da solo, mentre scrivi.` : 'Si salva da solo, mentre scrivi.' });
    if (DB.mem) rows[0] = { ok: false, title: 'Memoria del browser non disponibile', sub: 'Sei forse in navigazione privata? Salva spesso una copia su file.' };
    if (auto) rows.push({ ok: true, title: 'Copia automatica su file attiva', sub: `File «${esc(S.fileHandle.name)}», aggiornato ${ago(S.meta.lastBackupAt)}.` });
    else if (S.meta.lastBackupAt) rows.push({ ok: !needsBackup(), title: needsBackup() ? 'Copia su file da aggiornare' : 'Copia su file fatta', sub: `Ultima copia ${ago(S.meta.lastBackupAt)}.` });
    else rows.push({ ok: false, title: 'Nessuna copia su file, per ora', sub: 'Una copia ti protegge se cambi telefono o se il browser viene ripulito.' });
    const resume = S.fileHandle && !S.fileAuto && FileBackup.supported;
    return `<section class="memory" aria-labelledby="mem-h">
      <h2 id="mem-h">La memoria del quaderno</h2>
      <div class="memory-rows">${rows.map((r) => `<div class="memory-row"><span class="dot ${r.ok ? '' : 'warn'}">${r.ok ? ICON.check : ICON.warn}</span><div><strong>${r.title}</strong><span>${r.sub}</span></div></div>`).join('')}</div>
      <div class="actions">
        <button class="btn ${needsBackup() || resume ? '' : 'secondary'}" data-act="backup">${ICON.save}<span>${resume ? 'Riattiva la copia automatica' : 'Salva una copia su file'}</span></button>
        <button class="btn secondary" data-act="restore">${ICON.restore}<span>Ripristina una copia</span></button>
      </div></section>`;
  }
  function wireMemory(root) {
    $$('[data-act="backup"]', root).forEach((b) => { b.onclick = backupNow; });
    $$('[data-act="restore"]', root).forEach((b) => { b.onclick = () => $('#restore-input').click(); });
  }
  function refreshMemory() {
    const m = $('.memory', app);
    if (!m) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = memoryPanel();
    m.replaceWith(tmp.firstElementChild);
    wireMemory(app);
  }

  function viewHome() {
    const nbs = liveNotebooks();
    const g = homeGuide();
    app.innerHTML = `${topbar({ title: 'Il mio Quaderno', right: `<button class="icon-btn" id="h-set" aria-label="Impostazioni">${ICON.gear}</button>` })}
    <main class="page">
      <div class="hello"><span class="date">${esc(longDate())}</span><h1>${esc(greeting())}</h1></div>
      ${guideCard(g)}
      ${nbs.length ? `<div class="search">${ICON.search}<input id="h-q" type="search" placeholder="Cerca nei tuoi appunti" aria-label="Cerca nei tuoi appunti" autocomplete="off"></div>` : ''}
      <div id="h-results" class="results" hidden></div>
      <section id="h-shelf" aria-labelledby="shelf-h" style="display:flex;flex-direction:column;gap:14px">
        <div class="section-head"><h2 id="shelf-h">I tuoi quaderni</h2><span>${plural(nbs.length, 'quaderno', 'quaderni')}</span></div>
        <div class="shelf">
          ${nbs.map((nb) => { const chs = chaptersOf(nb.id); return `<button class="cover" style="--cover:${esc(nb.color)}" data-nb="${nb.id}" aria-label="Apri ${esc(nb.title)}">
            <span class="sticker"><strong>${esc(nb.title)}</strong><small>${plural(chs.length, 'capitolo', 'capitoli')}</small></span></button>`; }).join('')}
          <button class="cover-new" id="h-new">${ICON.plus}<span>Nuovo quaderno</span></button>
        </div>
      </section>
      ${memoryPanel()}
    </main>`;
    wireTopbar();
    wireGuide(g);
    wireMemory(app);
    $('#h-set').onclick = () => go('opzioni');
    $('#h-new').onclick = newNotebookFlow;
    $$('[data-nb]', app).forEach((b) => { b.onclick = () => go('q-' + b.dataset.nb); });
    const q = $('#h-q');
    if (q) q.oninput = () => search(q.value);
  }

  function search(q) {
    const box = $('#h-results');
    const shelf = $('#h-shelf');
    q = q.trim().toLowerCase();
    if (q.length < 2) { box.hidden = true; shelf.hidden = false; return; }
    const res = [];
    S.chapters.forEach((c) => {
      const nb = nbById(c.notebookId);
      if (c.deletedAt || !nb || nb.deletedAt) return;
      const text = (c.title + '\n' + (c.text || ''));
      const i = text.toLowerCase().indexOf(q);
      if (i < 0) return;
      const s = Math.max(0, i - 40);
      const snip = (s ? '…' : '') + text.slice(s, i) + '\u0001' + text.slice(i, i + q.length) + '\u0002' + text.slice(i + q.length, i + q.length + 70) + '…';
      res.push({ c, nb, snip });
    });
    S.notebooks.forEach((nb) => { if (!nb.deletedAt && nb.title.toLowerCase().includes(q)) res.unshift({ nb }); });
    box.hidden = false;
    shelf.hidden = true;
    box.innerHTML = res.length ? res.slice(0, 30).map((r) => r.c
      ? `<button class="result" data-c="${r.c.id}"><strong>${esc(r.c.title || 'Senza titolo')}</strong><small>${esc(r.nb.title)}</small><span>${esc(r.snip.replace(/\n/g, ' ')).replace('\u0001', '<mark>').replace('\u0002', '</mark>')}</span></button>`
      : `<button class="result" data-n="${r.nb.id}"><strong>${esc(r.nb.title)}</strong><small>Quaderno</small></button>`).join('')
      : `<div class="empty">Nessun risultato per «${esc(q)}».</div>`;
    $$('[data-c]', box).forEach((b) => { b.onclick = () => go('c-' + b.dataset.c); });
    $$('[data-n]', box).forEach((b) => { b.onclick = () => go('q-' + b.dataset.n); });
  }

  function colorPicker(current) {
    return `<div class="colors" role="group" aria-label="Colore della copertina">${COVERS.map((c) => `<button type="button" style="--c:${c.c}" data-color="${c.c}" aria-label="${c.n}" aria-pressed="${c.c === current}"></button>`).join('')}</div>`;
  }
  function wireColors(ov, onPick) {
    $$('[data-color]', ov).forEach((b) => { b.onclick = () => { $$('[data-color]', ov).forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); onPick(b.dataset.color); }; });
  }

  function newNotebookFlow() {
    let color = COVERS[S.notebooks.length % COVERS.length].c;
    dialog({
      title: 'Nuovo quaderno',
      body: '<p>Come lo vuoi chiamare?</p>',
      input: { placeholder: 'Es. Storia dell\'arte' },
      onOpen: (ov) => {
        const wrap = document.createElement('div');
        wrap.innerHTML = '<p style="margin-bottom:8px">Scegli il colore della copertina</p>' + colorPicker(color);
        $('.buttons', ov).before(wrap);
        wireColors(ov, (c) => { color = c; });
      },
      buttons: [
        { label: 'Crea il quaderno', icon: ICON.check, primary: true, run: async (val) => {
          const nb = await createNotebook(val || 'Nuovo quaderno', color);
          toast(`Quaderno «${nb.title}» creato`);
          go('q-' + nb.id);
        } },
        { label: 'Annulla', secondary: true }
      ]
    });
  }

  /* =========================================================
     Quaderno
     ========================================================= */
  function viewNotebook(nb) {
    const chs = chaptersOf(nb.id);
    const words = chs.reduce((s, c) => s + wordCount(c), 0);
    const hl = chs.reduce((s, c) => s + hlCount(c), 0);
    const g = notebookGuide(nb, chs);
    app.innerHTML = `${topbar({ backLabel: 'Quaderni', backTo: '', right: `<button class="icon-btn" id="n-more" aria-label="Opzioni del quaderno">${ICON.more}</button>` })}
    <main class="page">
      <div class="nb-head"><span class="mini-cover" style="--cover:${esc(nb.color)}"></span>
        <div><h1>${esc(nb.title)}</h1><span>${plural(chs.length, 'capitolo', 'capitoli')} · ${plural(words, 'parola', 'parole')}</span></div></div>
      ${guideCard(g)}
      <div class="quick">
        <button class="btn" id="n-add">${ICON.plus}<span>Nuovo capitolo</span></button>
        <button class="btn secondary" id="n-kp">${ICON.star}<span>Punti chiave${hl ? ` (${hl})` : ''}</span></button>
        <button class="btn secondary" id="n-pdf">${ICON.pdf}<span>Crea PDF</span></button>
      </div>
      <section class="chapters" aria-label="Capitoli">
        ${chs.length ? chs.map((c, i) => {
          const w = wordCount(c), h = hlCount(c), ph = imgIds(c.html).length;
          const snip = (c.text || '').replace(/\s+/g, ' ').slice(0, 140);
          return `<div class="chapter" role="button" tabindex="0" data-ch="${c.id}">
            <span class="num">${i + 1}</span>
            <span class="body"><strong>${esc(c.title || 'Senza titolo')}</strong>
              <span class="snip">${snip ? esc(snip) : 'Ancora da scrivere: tocca per iniziare.'}</span>
              <span class="meta">${w ? `<span class="chip">${plural(w, 'parola', 'parole')}</span>` : ''}${h ? `<span class="chip"><i></i>${num(h)}</span>` : ''}${ph ? `<span class="chip">${plural(ph, 'foto', 'foto')}</span>` : ''}<span class="chip">${esc(ago(c.updatedAt))}</span></span>
            </span>
            <button class="more" data-chmore="${c.id}" aria-label="Opzioni del capitolo">${ICON.more}</button></div>`;
        }).join('') : `<div class="empty"><p>Questo quaderno è ancora vuoto.</p></div>`}
      </section>
    </main>`;
    wireTopbar();
    wireGuide(g);
    $('#n-add').onclick = () => newChapterFlow(nb);
    $('#n-kp').onclick = () => go('p-' + nb.id);
    $('#n-pdf').onclick = () => makePDF(nb);
    $('#n-more').onclick = () => notebookMenu(nb);
    $$('[data-ch]', app).forEach((el) => {
      el.onclick = (e) => { if (e.target.closest('[data-chmore]')) return; go('c-' + el.dataset.ch); };
      el.onkeydown = (e) => { if (e.key === 'Enter') go('c-' + el.dataset.ch); };
    });
    $$('[data-chmore]', app).forEach((b) => { b.onclick = (e) => { e.stopPropagation(); chapterMenu(chById(b.dataset.chmore)); }; });
  }

  function newChapterFlow(nb) {
    const n = chaptersOf(nb.id).length + 1;
    dialog({
      title: `Capitolo ${n}`,
      body: '<p>Dai un titolo al nuovo capitolo. Potrai cambiarlo quando vuoi.</p>',
      input: { placeholder: n === 1 ? 'Es. Introduzione' : `Es. Lezione ${n}` },
      buttons: [
        { label: 'Crea e inizia a scrivere', icon: ICON.pencil, primary: true, run: async (val) => { const ch = await createChapter(nb.id, (val || '').trim() || `Capitolo ${n}`); go('c-' + ch.id); } },
        { label: 'Annulla', secondary: true }
      ]
    });
  }

  function notebookMenu(nb) {
    menu(nb.title, [
      { label: 'Cambia nome', icon: ICON.pencil, run: () => dialog({ title: 'Cambia nome', input: { value: nb.title }, buttons: [{ label: 'Salva', primary: true, icon: ICON.check, run: async (v) => { nb.title = (v || '').trim() || nb.title; await putNotebook(nb); render(); } }, { label: 'Annulla', secondary: true }] }) },
      { label: 'Colore della copertina', icon: ICON.palette, run: () => {
        let color = nb.color;
        dialog({ title: 'Colore della copertina', body: colorPicker(color), onOpen: (ov) => wireColors(ov, (c) => { color = c; }), buttons: [{ label: 'Salva', primary: true, icon: ICON.check, run: async () => { nb.color = color; await putNotebook(nb); render(); } }, { label: 'Annulla', secondary: true }] });
      } },
      { label: 'Crea il PDF da condividere', icon: ICON.pdf, run: () => makePDF(nb) },
      { label: 'Salva una copia su file', icon: ICON.save, run: backupNow },
      { label: 'Sposta nel cestino', icon: ICON.trash, danger: true, run: () => confirmBox('Spostare nel cestino?', `«${esc(nb.title)}» andrà nel cestino. Potrai recuperarlo per 30 giorni da Impostazioni → Cestino.`, 'Sposta nel cestino', async () => {
        nb.deletedAt = Date.now(); await putNotebook(nb); go('');
        toast('Quaderno spostato nel cestino', { label: 'Annulla', run: async () => { delete nb.deletedAt; await putNotebook(nb); go('q-' + nb.id); } });
      }, true) }
    ]);
  }

  async function moveChapter(ch, dir) {
    const list = chaptersOf(ch.notebookId);
    const i = list.indexOf(ch), j = i + dir;
    if (j < 0 || j >= list.length) return;
    const other = list[j];
    [ch.order, other.order] = [other.order, ch.order];
    await DB.put('chapters', other);
    await putChapter(ch);
    render();
  }

  function chapterMenu(ch) {
    const list = chaptersOf(ch.notebookId);
    const i = list.indexOf(ch);
    const items = [];
    if (i > 0) items.push({ label: 'Sposta più su', icon: ICON.up, run: () => moveChapter(ch, -1) });
    if (i < list.length - 1) items.push({ label: 'Sposta più giù', icon: ICON.down, run: () => moveChapter(ch, 1) });
    items.push({ label: 'Versioni precedenti', icon: ICON.clock, run: () => versionsFlow(ch) });
    items.push({ label: 'Sposta nel cestino', icon: ICON.trash, danger: true, run: () => confirmBox('Spostare nel cestino?', `Il capitolo «${esc(ch.title || 'Senza titolo')}» andrà nel cestino. Potrai recuperarlo per 30 giorni.`, 'Sposta nel cestino', async () => {
      await Editor.flush();
      ch.deletedAt = Date.now(); await putChapter(ch);
      const h = location.hash.slice(1);
      if (h === 'c-' + ch.id) back('q-' + ch.notebookId); else render();
      toast('Capitolo spostato nel cestino', { label: 'Annulla', run: async () => { delete ch.deletedAt; await putChapter(ch); render(); } });
    }, true) });
    menu(ch.title || 'Capitolo', items);
  }

  /* ---------- versioni precedenti ---------- */
  async function saveVersion(ch, html, title, at) {
    if (!html && !title) return;
    await DB.put('versions', { id: 'v' + uid(), chapterId: ch.id, html, title, at: at || Date.now() });
    const vs = (await DB.byIndex('versions', 'chapterId', ch.id)).sort((a, b) => b.at - a.at);
    for (const v of vs.slice(20)) await DB.del('versions', v.id);
  }
  async function versionsFlow(ch) {
    await Editor.flush();
    const vs = (await DB.byIndex('versions', 'chapterId', ch.id)).sort((a, b) => b.at - a.at);
    if (!vs.length) { dialog({ title: 'Versioni precedenti', body: '<p>Non ci sono ancora versioni precedenti. Il quaderno ne conserva una ogni volta che riprendi a scrivere un capitolo, così puoi sempre tornare indietro.</p>', buttons: [{ label: 'Ho capito', primary: true }] }); return; }
    menu('Torna a una versione', vs.map((v) => ({
      label: `${new Date(v.at).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${plural((htmlToText(v.html).match(/[\p{L}\p{N}]+/gu) || []).length, 'parola', 'parole')}`,
      icon: ICON.clock,
      run: () => confirmBox('Ripristinare questa versione?', 'Il testo attuale non va perso: lo conservo tra le versioni precedenti.', 'Ripristina', async () => {
        await saveVersion(ch, ch.html, ch.title);
        ch.html = sanitize(v.html); ch.text = htmlToText(ch.html); if (v.title) ch.title = v.title;
        await putChapter(ch);
        toast('Versione ripristinata');
        render();
      })
    })));
  }

  /* =========================================================
     Editor del capitolo
     ========================================================= */
  const Editor = {
    ch: null, el: null, titleEl: null, dirty: false, savedRange: null, versionDone: false, startHTML: '', startTitle: '',
    save: null,
    attach(ch, el, titleEl) {
      this.ch = ch; this.el = el; this.titleEl = titleEl; this.dirty = false; this.versionDone = false; this.edited = false;
      this.startHTML = ch.html; this.startTitle = ch.title;
      this.save = debounce(() => this.commit(), 700);
    },
    detach() { this.ch = null; this.el = null; this.titleEl = null; this.savedRange = null; },
    changed() { this.dirty = true; this.edited = true; Saver.paint(); this.save(); },
    serialize() {
      const c = this.el.cloneNode(true);
      $$('img', c).forEach((i) => { i.removeAttribute('src'); i.removeAttribute('alt'); });
      $$('figure', c).forEach((f) => { f.removeAttribute('contenteditable'); f.classList.remove('selected'); f.removeAttribute('class'); });
      const html = sanitize(c.innerHTML);
      return /^(<p><br><\/p>|\s)*$/.test(html) ? '' : html;
    },
    async commit() {
      if (!this.ch || !this.dirty) return;
      const ch = this.ch;
      const html = this.serialize();
      const title = this.titleEl.value.trim();
      this.dirty = false;
      const prevAt = ch.updatedAt;
      const needVersion = !this.versionDone && (this.startHTML || this.startTitle) && (html !== this.startHTML || title !== this.startTitle);
      ch.html = html; ch.title = title; ch.text = htmlToText(html);
      await putChapter(ch);
      if (needVersion) { this.versionDone = true; await saveVersion(ch, this.startHTML, this.startTitle, prevAt); }
      const foot = $('#e-foot-words');
      if (foot) foot.textContent = `${plural(wordCount(ch), 'parola', 'parole')} · salvato ${ago(ch.updatedAt)}`;
      Saver.paint();
    },
    async flush() { if (this.save && this.dirty) { this.save.cancel(); await this.commit(); } }
  };

  function currentRange() {
    const el = Editor.el;
    if (!el) return null;
    const sel = window.getSelection();
    if (sel.rangeCount) { const r = sel.getRangeAt(0); if (el.contains(r.commonAncestorContainer)) return r; }
    if (Editor.savedRange && el.contains(Editor.savedRange.commonAncestorContainer)) return Editor.savedRange;
    return null;
  }
  document.addEventListener('selectionchange', () => {
    const el = Editor.el;
    if (!el) return;
    const sel = window.getSelection();
    if (sel.rangeCount) { const r = sel.getRangeAt(0); if (el.contains(r.commonAncestorContainer)) Editor.savedRange = r.cloneRange(); }
  });

  function textNodesIn(range) {
    let root = range.commonAncestorContainer;
    if (root.nodeType === 3) return [root];
    const out = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) { if (range.intersectsNode(n) && n.nodeValue.length) out.push(n); }
    return out;
  }
  function liftFromMark(t, root) {
    const mark = t.parentElement && t.parentElement.closest('mark');
    if (!mark || !root.contains(mark)) return;
    const before = document.createRange(); before.setStart(mark, 0); before.setEndBefore(t);
    const fb = before.extractContents();
    const after = document.createRange(); after.setStartAfter(t); after.setEnd(mark, mark.childNodes.length);
    const fa = after.extractContents();
    if (fb.textContent.length) { const m = mark.cloneNode(false); m.appendChild(fb); mark.before(m); }
    if (fa.textContent.length) { const m = mark.cloneNode(false); m.appendChild(fa); mark.after(m); }
    mark.replaceWith(...mark.childNodes);
  }
  function tidyMarks(root) {
    $$('mark', root).forEach((m) => { if (!m.textContent.length) m.remove(); });
    $$('mark', root).forEach((m) => {
      let n = m.nextSibling;
      while (n && n.nodeType === 1 && n.tagName === 'MARK' && n.dataset.c === m.dataset.c) { const nx = n.nextSibling; m.append(...n.childNodes); n.remove(); n = nx; }
    });
    root.normalize();
  }

  /* MAIUSCOLO: trasforma le parole selezionate in maiuscolo (se sono già maiuscole, le riporta in minuscolo) */
  function applyUppercase() {
    const root = Editor.el;
    const r = currentRange();
    if (!r || r.collapsed) {
      toast('Prima seleziona le parole da scrivere in maiuscolo, poi tocca «Maiuscolo».');
      return;
    }
    const sc = r.startContainer, so = r.startOffset, ec = r.endContainer, eo = r.endOffset;
    const nodes = textNodesIn(r).filter((n) => !n.parentElement.closest('figure')).map((n) => {
      const start = n === sc ? so : 0;
      const end = n === ec ? eo : n.length;
      if (start >= end) return null;
      let t = n;
      if (end < t.length) t.splitText(end);
      if (start > 0) t = t.splitText(start);
      return t;
    }).filter(Boolean);
    if (!nodes.length) return;
    const all = nodes.map((t) => t.nodeValue).join('');
    const backToLower = all === all.toLocaleUpperCase('it-IT') && all !== all.toLocaleLowerCase('it-IT');
    nodes.forEach((t) => { t.nodeValue = backToLower ? t.nodeValue.toLocaleLowerCase('it-IT') : t.nodeValue.toLocaleUpperCase('it-IT'); });
    // lascia selezionate le stesse parole, così si vede il risultato (e un secondo tocco torna indietro)
    const last = nodes[nodes.length - 1];
    const nr = document.createRange();
    nr.setStart(nodes[0], 0); nr.setEnd(last, last.length);
    const sel = window.getSelection();
    sel.removeAllRanges();
    try { sel.addRange(nr); } catch (e) { /* niente */ }
    Editor.savedRange = nr.cloneRange();
    Editor.changed();
    toast(backToLower ? 'Riportato in minuscolo' : 'Fatto! Ora è in MAIUSCOLO');
  }

  function applyHighlight(color) {
    const root = Editor.el;
    const r = currentRange();
    if (!r || r.collapsed) {
      toast(color ? 'Prima seleziona le parole da evidenziare, poi tocca il colore.' : 'Seleziona le parole evidenziate da cancellare.');
      return;
    }
    const sc = r.startContainer, so = r.startOffset, ec = r.endContainer, eo = r.endOffset;
    let nodes = textNodesIn(r).filter((n) => !(n.parentNode === root && !n.nodeValue.trim()) && !n.parentElement.closest('figure'));
    nodes = nodes.map((n) => {
      const start = n === sc ? so : 0;
      const end = n === ec ? eo : n.length;
      if (start >= end) return null;
      let t = n;
      if (end < t.length) t.splitText(end);
      if (start > 0) t = t.splitText(start);
      return t;
    }).filter(Boolean);
    let last = null;
    nodes.forEach((t) => {
      liftFromMark(t, root);
      if (color) {
        const m = document.createElement('mark');
        m.dataset.c = color;
        t.replaceWith(m);
        m.appendChild(t);
        last = m;
      } else last = t;
    });
    if (last) {
      const sel = window.getSelection();
      const nr = document.createRange();
      nr.setStartAfter(last); nr.collapse(true);
      tidyMarks(root);
      sel.removeAllRanges();
      try { sel.addRange(nr); } catch (e) { /* niente */ }
    }
    Editor.changed();
    if (color && !tipDone('hl-done')) { S.meta.tips['hl-done'] = Date.now(); S.meta.tips.hl = Date.now(); saveMeta(); toast('Evidenziato! Lo ritrovi anche in «Punti chiave».'); }
  }

  /* tiene tutto il testo dentro paragrafi <p>, senza perdere la posizione del cursore */
  const isInline = (n) => n.nodeType === 3 || (n.nodeType === 1 && /^(MARK|BR|SPAN|B|I|EM|STRONG|U)$/.test(n.tagName));
  function ensureBlocks(root) {
    const loose = Array.from(root.childNodes).some((n) => isInline(n) && !(n.nodeType === 3 && !n.nodeValue.trim()));
    if (!loose) return;
    const sel = window.getSelection();
    const a = sel.rangeCount ? [sel.anchorNode, sel.anchorOffset] : null;
    let p = null;
    Array.from(root.childNodes).forEach((n) => {
      if (isInline(n)) {
        if (!p) { p = document.createElement('p'); root.insertBefore(p, n); }
        p.appendChild(n);
      } else p = null;
    });
    if (a && a[0] && root.contains(a[0])) {
      try {
        const r = document.createRange();
        r.setStart(a[0], Math.min(a[1], a[0].nodeType === 3 ? a[0].length : a[0].childNodes.length));
        r.collapse(true); sel.removeAllRanges(); sel.addRange(r);
      } catch (e) { /* niente */ }
    }
  }
  function markEmpty(root) { root.classList.toggle('is-empty', !root.textContent.trim() && !root.querySelector('img')); }

  function blockOf(node, root) {
    while (node && node.parentNode !== root) node = node.parentNode;
    return node && node.parentNode === root ? node : null;
  }
  async function insertPhoto(file) {
    const root = Editor.el;
    if (!root) return;
    toast('Aggiungo la foto…');
    let rec;
    try { rec = await processPhoto(file); } catch (e) { toast('Non riesco a leggere questa foto. Prova con un\'altra.'); return; }
    const fig = document.createElement('figure');
    fig.contentEditable = 'false';
    const img = document.createElement('img');
    img.dataset.id = rec.id;
    img.src = await imageURL(rec.id);
    img.alt = 'Foto';
    fig.appendChild(img);
    const r = currentRange();
    const blk = r ? blockOf(r.startContainer === root ? root.childNodes[r.startOffset] || root.lastChild : r.startContainer, root) : null;
    if (blk) blk.after(fig); else root.appendChild(fig);
    const p = document.createElement('p');
    p.appendChild(document.createElement('br'));
    if (!fig.nextSibling || fig.nextSibling.tagName === 'FIGURE') fig.after(p);
    const target = fig.nextSibling;
    const nr = document.createRange();
    nr.setStart(target, 0); nr.collapse(true);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(nr);
    wireFigures(root);
    Editor.changed();
    toast('Foto aggiunta');
    fig.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function wireFigures(root) {
    $$('figure', root).forEach((f) => {
      f.contentEditable = 'false';
      const img = $('img', f);
      if (!img || img.dataset.wired) return;
      img.dataset.wired = '1';
      img.onclick = () => openViewer(f);
    });
  }
  function openViewer(fig) {
    const img = $('img', fig);
    const v = document.createElement('div');
    v.className = 'viewer';
    v.innerHTML = `<img src="${esc(img.src)}" alt="Foto ingrandita"><div class="row-actions">
      <button class="btn secondary" data-v="close">${ICON.check}<span>Chiudi</span></button>
      <button class="btn danger" data-v="del">${ICON.trash}<span>Togli la foto</span></button></div>`;
    document.body.appendChild(v);
    $('[data-v="close"]', v).onclick = () => v.remove();
    v.onclick = (e) => { if (e.target === v) v.remove(); };
    $('[data-v="del"]', v).onclick = () => {
      v.remove();
      const next = fig.nextSibling;
      const parent = fig.parentNode;
      fig.remove();
      Editor.changed();
      toast('Foto tolta', { label: 'Annulla', run: () => { parent.insertBefore(fig, next); wireFigures(parent); Editor.changed(); } });
    };
  }

  function viewChapter(ch) {
    const nb = nbById(ch.notebookId);
    const list = chaptersOf(nb.id);
    const i = list.indexOf(ch);
    const prev = list[i - 1], next = list[i + 1];
    const showTip = S.settings.guide && !tipDone('editor');
    app.innerHTML = `${topbar({ backLabel: nb.title, backTo: 'q-' + nb.id, right: `<button class="icon-btn" id="e-more" aria-label="Opzioni del capitolo">${ICON.more}</button>` })}
    <main class="page" style="gap:14px">
      ${showTip ? guideCard({ key: 'editor', text: 'Scrivi liberamente: <strong>si salva tutto da solo</strong>. Per evidenziare, seleziona le parole e tocca un colore qui sotto. Con «Foto» aggiungi grafici, schemi o immagini.' }) : ''}
      <div class="editor-wrap">
        <div class="toolbar" role="toolbar" aria-label="Strumenti">
          <span class="tlabel">Evidenzia</span>
          ${HLS.map((h) => `<button class="swatch" style="--c:${h.v}" data-hl="${h.c}" aria-label="Evidenzia in ${h.n.toLowerCase()}" title="${h.n}"></button>`).join('')}
          <button class="swatch eraser" data-hl="" aria-label="Togli evidenziatura" title="Togli evidenziatura">${ICON.eraser}</button>
          <button class="btn secondary photo caps" id="e-caps" aria-label="Scrivi in maiuscolo le parole selezionate" title="Maiuscolo"><b>AA</b><span>Maiuscolo</span></button>
          <span class="spacer"></span>
          <button class="btn secondary photo" id="e-photo">${ICON.photo}<span>Foto</span></button>
        </div>
        <article class="sheet">
          <div class="eyebrow">Capitolo ${i + 1}</div>
          <input id="e-title" class="title-input" type="text" value="${esc(ch.title)}" placeholder="Titolo del capitolo" aria-label="Titolo del capitolo" maxlength="140">
          <div id="e-content" class="content" contenteditable="true" spellcheck="true" role="textbox" aria-multiline="true" aria-label="Testo del capitolo" data-placeholder="Tocca qui e inizia a scrivere…"></div>
        </article>
      </div>
      <div class="editor-foot"><span id="e-foot-words">${plural(wordCount(ch), 'parola', 'parole')} · salvato ${esc(ago(ch.updatedAt))}</span></div>
      <div class="quick">
        ${prev ? `<button class="btn secondary" data-goch="${prev.id}">${ICON.back}<span>Capitolo ${i}</span></button>` : ''}
        ${next ? `<button class="btn secondary" data-goch="${next.id}"><span>Capitolo ${i + 2}</span>${ICON.next}</button>` : `<button class="btn secondary" id="e-newch">${ICON.plus}<span>Nuovo capitolo</span></button>`}
      </div>
    </main>`;
    wireTopbar();
    if (showTip) wireGuide({ key: 'editor' });
    const content = $('#e-content');
    const title = $('#e-title');
    content.innerHTML = sanitize(ch.html) || '<p><br></p>';
    ensureBlocks(content);
    markEmpty(content);
    hydrate(content);
    wireFigures(content);
    Editor.attach(ch, content, title);
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* niente */ }

    content.addEventListener('input', () => {
      if (!content.firstChild || content.innerHTML === '<br>') {
        content.innerHTML = '<p><br></p>';
        const r = document.createRange(); r.setStart(content.firstChild, 0); r.collapse(true);
        getSelection().removeAllRanges(); getSelection().addRange(r);
      }
      ensureBlocks(content);
      markEmpty(content);
      Editor.changed();
    });
    title.addEventListener('input', () => Editor.changed());
    title.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); content.focus(); } });
    content.addEventListener('blur', () => Editor.flush());
    title.addEventListener('blur', () => Editor.flush());
    content.addEventListener('paste', (e) => {
      const files = Array.from(e.clipboardData.files || []).filter((f) => f.type.startsWith('image/'));
      e.preventDefault();
      if (files.length) { files.forEach(insertPhoto); return; }
      const text = e.clipboardData.getData('text/plain');
      if (text) document.execCommand('insertText', false, text);
    });
    content.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
      if (files.length) { e.preventDefault(); files.forEach(insertPhoto); }
    });
    $$('[data-hl]', app).forEach((b) => {
      b.addEventListener('pointerdown', (e) => e.preventDefault());
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.onclick = () => applyHighlight(b.dataset.hl || null);
    });
    const caps = $('#e-caps');
    caps.addEventListener('pointerdown', (e) => e.preventDefault());
    caps.addEventListener('mousedown', (e) => e.preventDefault());
    caps.onclick = applyUppercase;
    const photo = $('#e-photo');
    photo.addEventListener('pointerdown', (e) => e.preventDefault());
    photo.onclick = () => $('#photo-input').click();
    $('#e-more').onclick = () => chapterMenu(ch);
    $$('[data-goch]', app).forEach((b) => { b.onclick = async () => { await Editor.flush(); history.replaceState(null, '', '#c-' + b.dataset.goch); trail[trail.length - 1] = 'c-' + b.dataset.goch; render(); }; });
    const nw = $('#e-newch');
    if (nw) nw.onclick = async () => { await Editor.flush(); newChapterFlow(nb); };
    if (!ch.title) title.focus();
    else if (!ch.html) content.focus();
  }

  /* =========================================================
     Punti chiave
     ========================================================= */
  function viewKeypoints(nb, filter) {
    const chs = chaptersOf(nb.id);
    const groups = chs.map((c, i) => ({ c, i, list: window.QuadernoPDF ? window.QuadernoPDF.highlightsOf(c.html) : [] })).filter((g) => g.list.length);
    const f = filter || '';
    const total = groups.reduce((s, g) => s + g.list.length, 0);
    app.innerHTML = `${topbar({ backLabel: nb.title, backTo: 'q-' + nb.id })}
    <main class="page">
      <div class="hello"><span class="date">Ripasso</span><h1>Punti chiave</h1></div>
      ${total ? `<p style="margin:0;color:var(--muted)">Tutte le frasi che hai evidenziato in «${esc(nb.title)}». Tocca una frase per aprire il capitolo.</p>
      <div class="filters" role="group" aria-label="Filtra per colore">
        <button class="filter" data-f="" aria-pressed="${!f}">Tutti</button>
        ${HLS.map((h) => `<button class="filter" data-f="${h.c}" style="--c:${h.v}" aria-pressed="${f === h.c}"><i></i>${h.n}</button>`).join('')}
      </div>` : ''}
      <div class="keypoints">${total ? groups.map((g) => {
        const items = g.list.filter((h) => !f || h.c === f);
        if (!items.length) return '';
        return `<section class="kp-group"><h2>${g.i + 1}. ${esc(g.c.title || 'Senza titolo')}</h2>${items.map((h) => `<button class="kp" data-ch="${g.c.id}"><mark data-c="${h.c}">${esc(h.t)}</mark></button>`).join('')}</section>`;
      }).join('') : `<div class="empty"><p>Non hai ancora evidenziato niente.</p><p>Apri un capitolo, seleziona le parole importanti e tocca un colore: compariranno qui, pronte da ripassare.</p>${chs[0] ? `<button class="btn" data-ch="${chs[0].id}">${ICON.pencil}<span>Apri il primo capitolo</span></button>` : ''}</div>`}</div>
    </main>`;
    wireTopbar();
    $$('[data-f]', app).forEach((b) => { b.onclick = () => viewKeypoints(nb, b.dataset.f); });
    $$('[data-ch]', app).forEach((b) => { b.onclick = () => go('c-' + b.dataset.ch); });
    Saver.paint();
  }

  /* =========================================================
     PDF
     ========================================================= */
  async function makePDF(nb) {
    await Editor.flush();
    const chs = chaptersOf(nb.id);
    if (!chs.length) { dialog({ title: 'Il quaderno è vuoto', body: '<p>Aggiungi almeno un capitolo, poi potrai creare il PDF.</p>', buttons: [{ label: 'Aggiungi un capitolo', primary: true, icon: ICON.plus, run: () => newChapterFlow(nb) }, { label: 'Chiudi', secondary: true }] }); return; }
    if (!window.jspdf) { toast('Un attimo, sto ancora preparando lo strumento PDF. Riprova tra poco.'); return; }
    toast('Creo il PDF…');
    try {
      const blob = await window.QuadernoPDF.build({
        notebook: nb, chapters: chs, author: S.profile.name, wordCount,
        dateLabel: new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }),
        getImage: async (id) => {
          const rec = await DB.get('images', id);
          if (!rec) return null;
          return { dataUrl: await blobToDataURL(rec.blob), w: rec.w, h: rec.h };
        }
      });
      S.meta.pdfMade[nb.id] = Date.now();
      saveMeta();
      const name = `${nb.title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'Quaderno'}.pdf`;
      await deliverFile(blob, name, 'pdf');
    } catch (e) {
      console.error(e);
      dialog({ title: 'Il PDF non è riuscito', body: '<p>Qualcosa è andato storto nella creazione del PDF. I tuoi appunti sono al sicuro. Riprova tra un momento.</p>', buttons: [{ label: 'Ho capito', primary: true }] });
    }
  }

  /* =========================================================
     Impostazioni e cestino
     ========================================================= */
  function viewSettings() {
    const seg = (key, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-set="${key}" data-v="${v}" aria-pressed="${S.settings[key] === v}">${l}</button>`).join('')}</div>`;
    const trashCount = S.notebooks.filter((n) => n.deletedAt).length + S.chapters.filter((c) => c.deletedAt).length;
    app.innerHTML = `${topbar({ backLabel: 'Quaderni', backTo: '' })}
    <main class="page">
      <div class="hello"><span class="date">Impostazioni</span><h1>Il tuo quaderno, a modo tuo</h1></div>
      <section class="card"><h2>Il tuo nome</h2><p>Lo uso per salutarti e per firmare i PDF.</p>
        <div class="row-actions"><button class="btn secondary" id="s-name">${ICON.pencil}<span>${esc(S.profile.name || 'Aggiungi il tuo nome')}</span></button></div></section>
      <section class="card"><h2>Grandezza del testo</h2>${seg('size', [['normal', 'Normale'], ['large', 'Grande']])}</section>
      <section class="card"><h2>Aspetto</h2>${seg('theme', [['auto', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro']])}</section>
      <section class="card"><h2>Consigli</h2><p>I foglietti gialli che ti suggeriscono il prossimo passo.</p>${seg('guide', [[true, 'Mostra'], [false, 'Nascondi']])}
        <div class="row-actions"><button class="btn ghost" id="s-tips">Mostra di nuovo tutti i consigli</button></div></section>
      ${memoryPanel()}
      <section class="card"><h2>Cestino</h2><p>${trashCount ? `${plural(trashCount, 'elemento', 'elementi')} da poter recuperare.` : 'Il cestino è vuoto.'} Le cose nel cestino restano 30 giorni.</p>
        <div class="row-actions"><button class="btn secondary" id="s-trash">${ICON.trash}<span>Apri il cestino</span></button></div></section>
      <section class="card"><h2>Mettilo sulla schermata Home</h2>
        <p><strong>iPhone / iPad (Safari):</strong> tocca Condividi, poi «Aggiungi alla schermata Home».</p>
        <p><strong>Android (Chrome):</strong> tocca i tre puntini in alto a destra, poi «Aggiungi a schermata Home» o «Installa app».</p>
        <p><strong>Computer (Chrome o Edge):</strong> tocca l'icona di installazione nella barra degli indirizzi.</p></section>
    </main>`;
    wireTopbar();
    wireMemory(app);
    $$('[data-set]', app).forEach((b) => {
      b.onclick = async () => {
        let v = b.dataset.v;
        if (v === 'true') v = true; if (v === 'false') v = false;
        S.settings[b.dataset.set] = v;
        await saveSettings();
        render();
      };
    });
    $('#s-name').onclick = () => dialog({ title: 'Come ti chiami?', input: { value: S.profile.name, placeholder: 'Il tuo nome' }, buttons: [{ label: 'Salva', primary: true, icon: ICON.check, run: async (v) => { S.profile.name = (v || '').trim(); await saveProfile(); render(); } }, { label: 'Annulla', secondary: true }] });
    $('#s-tips').onclick = () => { S.meta.tips = {}; S.settings.guide = true; saveMeta(); saveSettings(); toast('I consigli torneranno a comparire'); render(); };
    $('#s-trash').onclick = () => go('cestino');
  }

  function viewTrash() {
    const nbs = S.notebooks.filter((n) => n.deletedAt);
    const chs = S.chapters.filter((c) => c.deletedAt);
    const left = (t) => Math.max(0, 30 - Math.floor((Date.now() - t) / DAY));
    const item = (kind, o, sub) => `<div class="trash-item"><div><strong>${esc(o.title || 'Senza titolo')}</strong><small>${sub} · ancora ${left(o.deletedAt)} giorni</small></div>
      <div class="row-actions"><button class="btn secondary" data-restore="${kind}:${o.id}">${ICON.restore}<span>Recupera</span></button><button class="icon-btn" data-purge="${kind}:${o.id}" aria-label="Elimina per sempre">${ICON.trash}</button></div></div>`;
    app.innerHTML = `${topbar({ backLabel: 'Impostazioni', backTo: 'opzioni' })}
    <main class="page">
      <div class="hello"><span class="date">Cestino</span><h1>Recupera quello che hai tolto</h1></div>
      ${nbs.length || chs.length ? `<section class="card">
        ${nbs.map((n) => item('n', n, 'Quaderno')).join('')}
        ${chs.map((c) => { const nb = nbById(c.notebookId); return item('c', c, 'Capitolo di «' + esc(nb ? nb.title : '?') + '»'); }).join('')}
      </section>` : '<div class="empty"><p>Il cestino è vuoto. Ottimo!</p></div>'}
    </main>`;
    wireTopbar();
    $$('[data-restore]', app).forEach((b) => {
      b.onclick = async () => {
        const [k, id] = b.dataset.restore.split(':');
        const o = k === 'n' ? nbById(id) : chById(id);
        delete o.deletedAt;
        if (k === 'n') await putNotebook(o);
        else {
          const nb = nbById(o.notebookId);
          if (nb && nb.deletedAt) { delete nb.deletedAt; await putNotebook(nb); }
          await putChapter(o);
        }
        toast('Recuperato!');
        render();
      };
    });
    $$('[data-purge]', app).forEach((b) => {
      b.onclick = () => confirmBox('Eliminare per sempre?', 'Questa volta non si potrà più recuperare.', 'Elimina per sempre', async () => {
        const [k, id] = b.dataset.purge.split(':');
        if (k === 'n') await purgeNotebook(id); else await purgeChapter(id);
        render();
      }, true);
    });
  }

  /* =========================================================
     Avvio e protezioni all'uscita
     ========================================================= */
  $('#photo-input').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) insertPhoto(f); });
  $('#restore-input').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) restoreFromFile(f); });

  // salva subito quando l'app va in secondo piano o si chiude
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { Editor.flush(); saveMeta.flush(); if (S.fileAuto) FileBackup.write(false); } });
  window.addEventListener('pagehide', () => { Editor.flush(); saveMeta.flush(); });
  window.addEventListener('beforeunload', (e) => {
    Editor.flush();
    if (needsBackupOnExit()) { e.preventDefault(); e.returnValue = ''; return ''; }
  });
  function needsBackupOnExit() {
    // sul computer: se ci sono modifiche non ancora copiate su file, il browser chiede conferma prima di chiudere
    return !S.fileAuto && S.meta.lastChangeAt > S.meta.lastBackupAt && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvent = e; if (!location.hash) render(); });
  window.addEventListener('hashchange', onRoute);
  window.addEventListener('scroll', () => { const t = $('.topbar'); if (t) t.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });

  // scorciatoia da tastiera: Ctrl/Cmd+S salva una copia
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); backupNow(); } });

  async function boot() {
    await DB.open();
    await loadAll();
    if (navigator.storage && navigator.storage.persisted) { try { S.persisted = await navigator.storage.persisted(); } catch (e) { /* niente */ } }
    if (S.fileHandle && FileBackup.supported) S.fileAuto = await FileBackup.permission(false);
    trail.push(location.hash.slice(1));
    render();
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* niente */ }
    }
  }
  boot();
})();
