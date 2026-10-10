/* SSCPC PDF engine - text layer.
   Every piece of text in a PDF is measured, wrapped and drawn through this file.

   Latin text is drawn by jsPDF itself (selectable text, Poppins/Helvetica).

   Sinhala and Tamil need "shaping" (letters join, vowel signs move around), which jsPDF
   cannot do. So any line that contains Sinhala or Tamil is drawn by the browser onto a
   small transparent picture (canvas) and placed in the PDF as an image. The browser does
   the shaping, so the result is always correct. Those lines are pictures, so they cannot be
   selected or searched in the PDF, but they print and read perfectly.

   Fonts: fonts/abhayalibre.ttf (Sinhala) and fonts/notosanstamil-*.ttf (Tamil) are loaded
   on demand by SSCPCPdf.text.prepare() (called by generate()). If a font file cannot be
   loaded, the browser's own Sinhala/Tamil font is used instead.

   Load order: text.js, i18n.js, core.js, components.js, ui.js, docs/*.js, ../pdf-kit.js */
(function () {
  'use strict';
  const NS = window.SSCPCPdf = window.SSCPCPdf || {};
  const PT = 0.3528;   /* mm per point */
  const PXMM = 12;     /* picture resolution: pixels per mm (about 300 dpi) */

  /* Same cleaning rules the old kit used (smart quotes and dashes become plain ones,
     bullets become a dash), but Sinhala, Tamil and the joiner marks are now kept.
     Anything else outside Latin-1 becomes "?". */
  const clean = v => String(v == null ? '' : v)
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-').replace(/…/g, '...').replace(/•/g, '-')
    .replace(/[^\x20-\x7E -ÿ஀-௿඀-෿‌‍\n]/g, '?').trim();

  const INDIC = /[஀-௿඀-෿]/;
  const has = s => INDIC.test(String(s));
  NS.hasIndic = has;

  /* ---------- fonts ---------- */
  const FONTS = [
    { family: 'SSCPC Latin', file: 'fonts/poppins-regular.ttf', weight: '400' },
    { family: 'SSCPC Latin', file: 'fonts/poppins-semibold.ttf', weight: '600' },
    { family: 'SSCPC Latin', file: 'fonts/poppins-bold.ttf', weight: '700' },
    { family: 'SSCPC Sinhala', file: 'fonts/abhayalibre.ttf', weight: '400' },
    { family: 'SSCPC Tamil', file: 'fonts/notosanstamil-regular.ttf', weight: '400' },
    { family: 'SSCPC Tamil', file: 'fonts/notosanstamil-bold.ttf', weight: '700' }
  ];
  const STACK = '"SSCPC Latin","SSCPC Sinhala","SSCPC Tamil","Noto Sans Sinhala","Noto Sans Tamil","Iskoola Pota","Nirmala UI","Latha","Poppins",sans-serif';
  let fontsReady = null;
  function loadFonts() {
    if (fontsReady) return fontsReady;
    fontsReady = Promise.all(FONTS.map(f => {
      try {
        const face = new FontFace(f.family, 'url("' + encodeURI((NS.base || '') + f.file) + '")', { weight: f.weight });
        return face.load().then(ff => { document.fonts.add(ff); }).catch(() => { /* use the browser's own font */ });
      } catch (e) { return Promise.resolve(); }
    })).then(() => { try { return document.fonts.ready; } catch (e) { /* ignore */ } });
    return fontsReady;
  }
  /* Call before building: loads the Sinhala/Tamil fonts when the PDF needs them. */
  function prepare(needed) {
    if (!needed || typeof FontFace === 'undefined' || typeof document === 'undefined') return Promise.resolve();
    return loadFonts();
  }

  /* ---------- measuring ---------- */
  let cv = null, cx = null;
  function ctx() {
    if (!cx) { cv = document.createElement('canvas'); cx = cv.getContext('2d'); }
    return cx;
  }
  const WEIGHT = { reg: 400, semi: 600, bold: 700 };
  /* the font the context x is currently using, as a canvas font string at picture scale */
  const SINHALA = /[\u0D80-\u0DFF]/;
  function setCanvasFont(x, scale, str) {
    const pt = x.doc.getFontSize(), w = WEIGHT[(x.cur && x.cur.w) || 'reg'] || 400;
    /* Abhaya Libre's Sinhala letters are small for their size, so they are drawn a little larger */
    const k = SINHALA.test(str) ? 1.12 : 1;
    ctx().font = w + ' ' + (pt * k * PT * scale) + 'px ' + STACK;
    return pt * k;
  }
  /* width in mm of a string in the current font */
  function width(x, str) {
    str = String(str);
    if (!has(str)) return x.doc.getTextWidth(str);
    setCanvasFont(x, PXMM, str);
    return ctx().measureText(str).width / PXMM;
  }
  function pieces(word) { /* split a long word into letters (whole Sinhala/Tamil letters, not code units) */
    try { if (typeof Intl !== 'undefined' && Intl.Segmenter) return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word), s => s.segment); } catch (e) { /* ignore */ }
    return Array.from(word);
  }
  /* wrap a string that contains Sinhala/Tamil into lines no wider than w (mm) */
  function wrapIndic(x, str, w) {
    const out = [], m = s => width(x, s);
    String(str).split('\n').forEach(par => {
      let cur = '';
      par.split(/ +/).forEach(word => {
        if (!word) return;
        const test = cur ? cur + ' ' + word : word;
        if (m(test) <= w) { cur = test; return; }
        if (cur) { out.push(cur); cur = ''; }
        if (m(word) <= w) { cur = word; return; }
        let part = '';
        pieces(word).forEach(ch => {
          if (part && m(part + ch) > w) { out.push(part); part = ch; } else part += ch;
        });
        cur = part;
      });
      out.push(cur);
    });
    return out;
  }
  const wrap = (x, str, w) => {
    const s = clean(str);
    return has(s) ? wrapIndic(x, s, w) : x.doc.splitTextToSize(s, w);
  };

  /* ---------- drawing ---------- */
  const pics = {};
  /* Draw text that has already been cleaned. o: {align, charSpace} */
  const put = (x, str, px, py, o) => {
    str = String(str);
    if (!has(str)) { x.doc.text(str, px, py, o); return; }
    o = o || {};
    const pt = setCanvasFont(x, PXMM, str), font = ctx().font, col = x.doc.__ink || [0, 0, 0];
    const wmm = ctx().measureText(str).width / PXMM, em = pt * PT;
    const padPx = Math.ceil(em * 0.12 * PXMM), up = em * 1.3, down = em * 0.7;
    const cw = Math.ceil(wmm * PXMM) + 2 * padPx, ch = Math.ceil((up + down) * PXMM);
    const key = font + '|' + col.join(',') + '|' + str;
    if (!pics[key]) {
      cv.width = cw; cv.height = ch;
      const c = ctx();
      c.clearRect(0, 0, cw, ch);
      c.font = font; c.textBaseline = 'alphabetic'; c.fillStyle = 'rgb(' + col.join(',') + ')';
      c.fillText(str, padPx, Math.round(up * PXMM));
      pics[key] = cv.toDataURL('image/png');
    }
    let left = px - padPx / PXMM;
    if (o.align === 'right') left -= wmm; else if (o.align === 'center') left -= wmm / 2;
    x.doc.addImage(pics[key], 'PNG', left, py - up, cw / PXMM, ch / PXMM, key, 'FAST');
  };

  NS.text = { clean: clean, wrap: wrap, width: width, put: put, has: has, prepare: prepare };
  NS.clean = clean;
})();
