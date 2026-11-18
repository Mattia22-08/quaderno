/* Il mio Quaderno — creazione del "PDF intelligente"
   Copertina, indice cliccabile, segnalibri, capitoli con evidenziature e foto,
   pagina "Punti chiave" con tutte le frasi evidenziate, numeri di pagina e link "torna all'indice". */
(function () {
  'use strict';

  const PAGE = { w: 210, h: 297 };
  const M = { l: 22, r: 22, t: 26, b: 24 };
  const CW = PAGE.w - M.l - M.r;
  const PT = 0.3528; // 1pt in mm
  const INK = [27, 36, 51];
  const MUTED = [91, 101, 118];
  const LINE = [220, 226, 233];
  const HL = { yellow: [255, 228, 92], green: [168, 238, 140], pink: [255, 179, 214], blue: [155, 215, 255] };

  const MAP = {
    '‘': "'", '’': "'", '‚': "'", '′': "'", '“': '"', '”': '"', '„': '"', '″': '"',
    '–': '-', '—': '-', '…': '...', '•': '-', '€': 'EUR', ' ': ' ', '​': '', '→': '->'
  };
  function clean(s) {
    return String(s || '')
      .replace(/[‘’‚′“”„″–—…•€ ​→]/g, (c) => MAP[c])
      .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, '');
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return [45, 85, 200];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /* ---------- lettura del contenuto del capitolo ---------- */
  const BLOCK = /^(P|DIV|FIGURE|H1|H2|H3|UL|OL|LI|BLOCKQUOTE)$/;
  function parseBlocks(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html || '';
    const blocks = [];
    let current = null;
    const flush = () => { if (current && current.runs.some((r) => r.t.trim())) blocks.push(current); current = null; };
    const addRun = (t, c) => {
      if (!current) current = { type: 'p', runs: [] };
      current.runs.push({ t, c });
    };
    function inline(node, color) {
      if (node.nodeType === 3) { addRun(node.nodeValue.replace(/\s+/g, ' '), color); return; }
      if (node.nodeType !== 1) return;
      const tag = node.tagName;
      if (tag === 'BR') { addRun('\n', null); return; }
      if (tag === 'IMG') { flush(); if (node.dataset.id) blocks.push({ type: 'img', id: node.dataset.id }); return; }
      if (BLOCK.test(tag)) { flush(); node.childNodes.forEach((n) => inline(n, color)); flush(); return; }
      const c = tag === 'MARK' ? (node.dataset.c || 'yellow') : color;
      node.childNodes.forEach((n) => inline(n, c));
    }
    tpl.content.childNodes.forEach((n) => inline(n, null));
    flush();
    return blocks;
  }

  function highlightsOf(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html || '';
    const out = [];
    tpl.content.querySelectorAll('mark').forEach((m) => {
      const t = m.textContent.replace(/\s+/g, ' ').trim();
      if (!t) return;
      const prev = out[out.length - 1];
      // unisce pezzi contigui dello stesso colore
      if (prev && prev.el && prev.el.nextSibling === m && prev.c === (m.dataset.c || 'yellow')) { prev.t += ' ' + t; prev.el = m; return; }
      out.push({ t, c: m.dataset.c || 'yellow', el: m });
    });
    return out.map(({ t, c }) => ({ t, c }));
  }

  /* ---------- impaginazione ---------- */
  async function build(opts) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const nb = opts.notebook;
    const chapters = opts.chapters;
    const coverRgb = hexToRgb(nb.color);
    let y = M.t;

    const kpChapters = chapters.map((ch) => ({ ch, list: highlightsOf(ch.html) })).filter((x) => x.list.length);

    doc.setProperties({
      title: clean(nb.title),
      subject: 'Quaderno digitale',
      author: clean(opts.author || ''),
      keywords: chapters.map((c) => clean(c.title)).join(', '),
      creator: 'Il mio Quaderno'
    });

    // --- 1. copertina ---
    doc.setFillColor(...coverRgb);
    doc.rect(0, 0, PAGE.w, 190, 'F');
    doc.setFillColor(0, 0, 0);
    doc.setGState(new doc.GState({ opacity: 0.18 }));
    doc.rect(0, 0, 12, 190, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
    doc.setFillColor(255, 253, 247);
    doc.roundedRect(M.l + 6, 70, CW - 12, 70, 3, 3, 'F');
    doc.setTextColor(...INK);
    doc.setFont('times', 'bold');
    let fs = 34;
    let titleLines;
    do { doc.setFontSize(fs); titleLines = doc.splitTextToSize(clean(nb.title) || 'Quaderno', CW - 32); fs -= 2; } while (titleLines.length > 2 && fs > 18);
    const tH = titleLines.length * (fs + 2) * PT * 1.2;
    doc.text(titleLines, PAGE.w / 2, 105 - tH / 2 + (fs + 2) * PT, { align: 'center', lineHeightFactor: 1.2 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...MUTED);
    const words = chapters.reduce((s, c) => s + (opts.wordCount ? opts.wordCount(c) : 0), 0);
    doc.text(`${chapters.length} ${chapters.length === 1 ? 'capitolo' : 'capitoli'}  -  ${words.toLocaleString('it-IT')} parole`, PAGE.w / 2, 130, { align: 'center' });
    doc.setTextColor(...INK);
    doc.setFontSize(13);
    if (opts.author) doc.text(clean('Appunti di ' + opts.author), M.l, 215);
    doc.setTextColor(...MUTED);
    doc.setFontSize(11);
    doc.text(clean(opts.dateLabel || ''), M.l, 223);
    doc.setDrawColor(...LINE);
    doc.line(M.l, 236, PAGE.w - M.r, 236);
    doc.setFontSize(9.5);
    const hint = 'Questo PDF è interattivo: tocca un titolo nell\'indice per andare al capitolo, e "Torna all\'indice" in fondo a ogni pagina per tornare qui.';
    doc.text(doc.splitTextToSize(hint, CW), M.l, 244);

    // --- 2. pagine riservate all'indice ---
    const entries = chapters.length + (kpChapters.length ? 1 : 0);
    const perPage = 24;
    const indexPages = Math.max(1, Math.ceil(entries / perPage));
    for (let i = 0; i < indexPages; i++) doc.addPage();
    const firstIndexPage = 2;

    const newPage = () => { doc.addPage(); y = M.t; };
    const space = (h) => { if (y + h > PAGE.h - M.b) newPage(); };
    const pageNo = () => doc.internal.getCurrentPageInfo().pageNumber;

    // disegna un paragrafo con evidenziature
    function paragraph(runs, size, opt = {}) {
      const lh = size * PT * 1.55;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(size);
      // spezza in parole mantenendo il colore
      const tokens = [];
      runs.forEach((r) => {
        const text = clean(r.t);
        text.split(/(\n| +)/).forEach((tk) => { if (tk) tokens.push({ t: tk, c: r.c }); });
      });
      const lines = [];
      let line = [];
      let w = 0;
      const pushLine = () => {
        while (line.length && /^ +$/.test(line[line.length - 1].t)) line.pop();
        lines.push(line); line = []; w = 0;
      };
      tokens.forEach((tk) => {
        if (tk.t === '\n') { pushLine(); return; }
        const isSpace = /^ +$/.test(tk.t);
        if (isSpace && !line.length) return;
        let tw = doc.getTextWidth(isSpace ? ' ' : tk.t);
        if (isSpace) tk = { t: ' ', c: tk.c };
        if (!isSpace && w + tw > CW - (opt.indent || 0) && line.length) pushLine();
        if (!isSpace && tw > CW - (opt.indent || 0)) {
          // parola lunghissima: la spezza a caratteri
          let chunk = '';
          for (const ch of tk.t) {
            if (doc.getTextWidth(chunk + ch) > CW - (opt.indent || 0)) { line.push({ t: chunk, c: tk.c, w: doc.getTextWidth(chunk) }); pushLine(); chunk = ''; }
            chunk += ch;
          }
          tk = { t: chunk, c: tk.c }; tw = doc.getTextWidth(chunk);
        }
        line.push({ t: tk.t, c: tk.c, w: tw });
        w += tw;
      });
      if (line.length) pushLine();

      lines.forEach((ln) => {
        space(lh);
        let x = M.l + (opt.indent || 0);
        const base = y + size * PT * 1.0;
        // unisce i pezzi dello stesso colore per avere evidenziature continue
        const segs = [];
        ln.forEach((p) => {
          const last = segs[segs.length - 1];
          if (last && last.c === p.c) { last.t += p.t; last.w += p.w; } else segs.push({ ...p });
        });
        segs.forEach((s) => {
          if (s.c && HL[s.c]) {
            doc.setFillColor(...HL[s.c]);
            doc.roundedRect(x - 0.4, y + 0.2, s.w + 0.8, size * PT * 1.32, 0.8, 0.8, 'F');
          }
          doc.setTextColor(...INK);
          doc.text(s.t, x, base);
          x += s.w;
        });
        y += lh;
      });
      y += size * PT * 0.7;
    }

    function heading(eyebrow, title) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...coverRgb);
      doc.text(clean(eyebrow).toUpperCase(), M.l, y + 3, { charSpace: 0.6 });
      y += 9;
      doc.setFont('times', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(clean(title) || 'Senza titolo', CW);
      doc.text(lines, M.l, y + 7, { lineHeightFactor: 1.2 });
      y += lines.length * 24 * PT * 1.2 + 6;
      doc.setDrawColor(...coverRgb);
      doc.setLineWidth(0.6);
      doc.line(M.l, y, M.l + 24, y);
      doc.setLineWidth(0.2);
      y += 9;
    }

    async function image(id) {
      const img = await opts.getImage(id);
      if (!img) return;
      let w = CW;
      let h = (img.h / img.w) * w;
      const maxH = 120;
      if (h > maxH) { h = maxH; w = (img.w / img.h) * h; }
      space(h + 6);
      doc.addImage(img.dataUrl, 'JPEG', M.l + (CW - w) / 2, y + 1, w, h, undefined, 'FAST');
      y += h + 7;
    }

    // --- 3. capitoli ---
    const chapterPages = [];
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      newPage();
      chapterPages.push(pageNo());
      heading(`Capitolo ${i + 1}`, ch.title);
      const blocks = parseBlocks(ch.html);
      if (!blocks.length) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(11); doc.setTextColor(...MUTED);
        doc.text('Capitolo ancora da scrivere.', M.l, y + 4); y += 10;
      }
      for (const b of blocks) {
        if (b.type === 'img') await image(b.id);
        else paragraph(b.runs, 11.5);
      }
    }

    // --- 4. punti chiave ---
    let kpPage = null;
    if (kpChapters.length) {
      newPage();
      kpPage = pageNo();
      heading('Ripasso', 'Punti chiave');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...MUTED);
      doc.text('Tutte le frasi evidenziate, capitolo per capitolo.', M.l, y); y += 9;
      kpChapters.forEach(({ ch, list }) => {
        const idx = chapters.indexOf(ch);
        space(20);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...INK);
        const label = clean(`${idx + 1}. ${ch.title || 'Senza titolo'}`);
        doc.text(label, M.l, y + 4);
        const lw = doc.getTextWidth(label);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...coverRgb);
        const go = `vai a pag. ${chapterPages[idx]}`;
        doc.textWithLink(go, M.l + lw + 4, y + 4, { pageNumber: chapterPages[idx] });
        y += 9;
        list.forEach((h) => {
          space(10);
          doc.setFillColor(...(HL[h.c] || HL.yellow));
          doc.circle(M.l + 1.6, y + 2.8, 1.4, 'F');
          paragraph([{ t: h.t, c: h.c }], 11, { indent: 6 });
        });
        y += 3;
      });
    }

    // --- 5. indice (nelle pagine riservate) ---
    const idxEntries = chapters.map((ch, i) => ({ n: String(i + 1), t: ch.title || 'Senza titolo', p: chapterPages[i] }));
    if (kpPage) idxEntries.push({ n: '*', t: 'Punti chiave (tutti gli evidenziati)', p: kpPage });
    for (let p = 0; p < indexPages; p++) {
      doc.setPage(firstIndexPage + p);
      y = M.t;
      if (p === 0) heading('Indice', nb.title);
      idxEntries.slice(p * perPage, (p + 1) * perPage).forEach((e) => {
        const rowH = 9.2;
        doc.setFont('times', 'normal'); doc.setFontSize(15); doc.setTextColor(...coverRgb);
        doc.text(e.n, M.l, y + 6);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(...INK);
        let title = clean(e.t);
        while (doc.getTextWidth(title) > CW - 40 && title.length > 4) title = title.slice(0, -2);
        if (title !== clean(e.t)) title = title.trim() + '...';
        doc.text(title, M.l + 12, y + 6);
        const tw = doc.getTextWidth(title);
        doc.setTextColor(...MUTED);
        doc.text(String(e.p), PAGE.w - M.r, y + 6, { align: 'right' });
        const pw = doc.getTextWidth(String(e.p));
        doc.setDrawColor(...LINE);
        doc.setLineDashPattern([0.4, 1.2], 0);
        doc.line(M.l + 14 + tw, y + 5.6, PAGE.w - M.r - pw - 2, y + 5.6);
        doc.setLineDashPattern([], 0);
        doc.link(M.l, y, CW, rowH, { pageNumber: e.p });
        y += rowH + 2;
      });
    }

    // --- 6. piè di pagina e segnalibri ---
    const total = doc.internal.getNumberOfPages();
    for (let p = 2; p <= total; p++) {
      doc.setPage(p);
      doc.setDrawColor(...LINE);
      doc.line(M.l, PAGE.h - 15, PAGE.w - M.r, PAGE.h - 15);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
      let t = clean(nb.title);
      if (t.length > 50) t = t.slice(0, 48) + '...';
      doc.text(t, M.l, PAGE.h - 10);
      doc.text(`Pagina ${p} di ${total}`, PAGE.w - M.r, PAGE.h - 10, { align: 'right' });
      if (p > firstIndexPage + indexPages - 1) {
        doc.setTextColor(...coverRgb);
        doc.textWithLink("Torna all'indice", PAGE.w / 2, PAGE.h - 10, { pageNumber: firstIndexPage, align: 'center' });
        doc.link(PAGE.w / 2 - 15, PAGE.h - 14, 30, 6, { pageNumber: firstIndexPage });
      }
    }
    if (doc.outline) {
      doc.outline.add(null, 'Copertina', { pageNumber: 1 });
      doc.outline.add(null, 'Indice', { pageNumber: firstIndexPage });
      chapters.forEach((ch, i) => doc.outline.add(null, clean(`${i + 1}. ${ch.title || 'Senza titolo'}`), { pageNumber: chapterPages[i] }));
      if (kpPage) doc.outline.add(null, 'Punti chiave', { pageNumber: kpPage });
    }
    return doc.output('blob');
  }

  window.QuadernoPDF = {
    build: async (opts) => {
      if (!window.jspdf) throw new Error('Il modulo PDF non è ancora caricato.');
      return build(opts);
    },
    highlightsOf
  };
})();
