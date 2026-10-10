/* SSCPC PDF engine - QR codes.
   Draws a QR code as sharp vector squares (no picture), using the bundled encoder in
   js/vendor/qrcode.js. Defaults (change in PDF_CONFIG.qr in js/data.js):
     size 28 mm (never below 22 mm), dark modules on a white square, 4-module quiet zone
     (the white margin is part of the size), error correction M, no logo on top.
   The code links to PDF_CONFIG.siteUrl, with an optional page anchor, e.g. anchor 'join' gives
   https://sscpc.vercel.app/#join

   Used by the components in components.js:
     NS.meta(x, ..., { qr: { anchor } })      beside the membership badge
     NS.note(x, text, { qr: { anchor } })     inline inside a callout
     NS.qrCorner(x, { anchor })               bottom-right of the last page
     header-right: set headerQr on a document definition (true or an anchor)
   o.query adds a link parameter, e.g. query 'assistant=1' gives https://sscpc.vercel.app/?assistant=1
   (the site opens the AI assistant for that link, see js/chatbot.js).
   If the encoder is missing or fails, the PDF is simply made without the QR code. */
(function () {
  'use strict';
  const NS = window.SSCPCPdf = window.SSCPCPdf || {};
  const QUIET = 4;       /* quiet zone, in modules */
  const MIN_SIZE = 22;   /* mm: below this a printed code gets unreliable */
  const MAX_MODULE_MIN = 0.5; /* mm: smallest module we will print */
  const cache = {};

  /* module grid for a text, or null: { n, rows: [[bool]] } */
  function matrix(text) {
    if (cache[text] !== undefined) return cache[text];
    let m = null;
    try {
      const Q = window.SSCPCQRCode;
      if (Q) {
        const q = new Q(0, 0); /* 0 = smallest version that fits, 0 = error correction M */
        q.addData(String(text));
        q.make();
        const n = q.getModuleCount(), rows = [];
        for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) row.push(!!q.isDark(r, c)); rows.push(row); }
        m = { n: n, rows: rows };
      }
    } catch (e) { m = null; }
    cache[text] = m;
    return m;
  }
  NS.qrMatrix = matrix;

  /* the link a code points to */
  NS.qrUrl = function (x, anchor, query) {
    const base = String((x && x.cfg && x.cfg.siteUrl) || 'https://sscpc.vercel.app').replace(/\/+$/, '');
    return base + '/' + (query ? '?' + String(query).replace(/^\?/, '') : '') + (anchor ? '#' + String(anchor).replace(/^#/, '') : '');
  };

  /* work out a code before laying out: { url, size, m } or null. o: { anchor, url, size }.
     size is the whole white square in mm, quiet zone included. */
  NS.qrPrep = function (x, o) {
    o = o || {};
    const cfg = (x.cfg && x.cfg.qr) || {};
    if (cfg.enabled === false) return null;
    const url = o.url || NS.qrUrl(x, o.anchor, o.query);
    const m = matrix(url);
    if (!m) return null;
    let size = Math.max(MIN_SIZE, Math.min(40, Number(o.size || cfg.size) || 28));
    size = Math.max(size, (m.n + 2 * QUIET) * MAX_MODULE_MIN); /* long link: grow rather than shrink the modules */
    return { url: url, size: size, m: m };
  };

  /* draw it at (px, py): the white square is size x size mm. Returns true when drawn. */
  NS.qrDraw = function (x, q, px, py, o) {
    if (!q || !q.m) return false;
    o = o || {};
    const d = x.doc, u = q.size / (q.m.n + 2 * QUIET);
    d.setFillColor(255, 255, 255);
    d.rect(px, py, q.size, q.size, 'F');
    if (o.border !== false) { d.setDrawColor(221, 227, 238); d.setLineWidth(0.2); d.rect(px, py, q.size, q.size, 'S'); }
    d.setFillColor(4, 16, 30);
    for (let r = 0; r < q.m.n; r++) {
      const row = q.m.rows[r];
      let c = 0;
      while (c < q.m.n) {
        if (!row[c]) { c++; continue; }
        let e = c; while (e < q.m.n && row[e]) e++;
        /* one rectangle per run of dark modules; a hair of overlap hides viewer seams */
        d.rect(px + (c + QUIET) * u, py + (r + QUIET) * u, (e - c) * u, u + 0.012, 'F');
        c = e;
      }
    }
    return true;
  };
})();
