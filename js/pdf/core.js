/* SSCPC PDF engine - core.
   Config + colours, page sizes, templates, fonts and logo loading, the document
   registry, and generate(). Needs jsPDF loaded first.

   Adding a new PDF anywhere on the site = one definition file in js/pdf/docs/:
     SSCPCPdf.register('my-doc', { title, filename(data), build(x, data), sample });
   then SSCPCPdf.generate('my-doc', data) returns { blob, name, doc }.

   If the Poppins fonts cannot be fetched it quietly falls back to Helvetica, and if the
   logo is missing a vector aperture mark is drawn, so a PDF is always produced. */
(function () {
  'use strict';
  const NS = window.SSCPCPdf = window.SSCPCPdf || {};

  /* ---------- config (defaults, overridden by PDF_CONFIG in js/data.js) ---------- */
  const BASE = {
    siteUrl: 'https://sscpc.vercel.app', siteLabel: 'sscpc.vercel.app',
    email: 'sylvestrian.photography@gmail.com',
    clubName: "St. Sylvester's College Photography Club", shortName: 'SSCPC',
    footerText: '', logo: 'images/pdf-logo.png',
    colors: { navy: '#04101E', blue: '#2882E6', maroon: '#7D1526', red: '#8A1228', gold: '#E6B022' },
    defaults: { template: 'standard', pageSize: 'a4', orientation: 'portrait', textSize: 'normal' },
    qr: { enabled: true, size: 28 } /* QR codes: see qr.js */
  };
  function config() {
    const u = (typeof PDF_CONFIG !== 'undefined' && PDF_CONFIG) || {};
    const c = Object.assign({}, BASE, u);
    c.colors = Object.assign({}, BASE.colors, u.colors || {});
    c.defaults = Object.assign({}, BASE.defaults, u.defaults || {});
    c.qr = Object.assign({}, BASE.qr, u.qr || {});
    return c;
  }
  const hex = h => {
    h = String(h || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    const n = parseInt(h, 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  };
  function palette(cfg) {
    const g = k => hex(cfg.colors[k]) || hex(BASE.colors[k]);
    const P = {
      navy: g('navy'), blue: g('blue'), maroon: g('maroon'), red: g('red'), gold: g('gold'),
      ink: [14, 22, 40], muted: [100, 112, 140], panel: [246, 247, 251], line: [221, 227, 238],
      cream: [244, 241, 228], sky: [108, 200, 255], soft: [176, 200, 232], white: [255, 255, 255],
      tint: [233, 242, 252], amber: [255, 244, 214], amberInk: [140, 92, 0]
    };
    P.paper = P.panel; P.rule = P.line; P.yel = P.gold; P.blu = P.blue; /* names the old kit used */
    return P;
  }

  /* ---------- page sizes, templates, options ---------- */
  const SIZES = { a4: [210, 297], a5: [148, 210] };
  const TEMPLATES = {
    standard: { label: 'Standard', hdr: 'navy', hdrH: 36, top: 9, sp: 1, pad: 3.8, fill: true },
    print: { label: 'Print-friendly', hdr: 'light', hdrH: 30, top: 8, sp: 1, pad: 3.6, fill: false },
    compact: { label: 'Compact', hdr: 'mini', hdrH: 23, top: 7, sp: 0.78, pad: 3.0, fill: true }
  };
  const CHOICES = {
    template: Object.keys(TEMPLATES), pageSize: Object.keys(SIZES),
    orientation: ['portrait', 'landscape'], textSize: ['normal', 'large']
  };
  const KEY = 'sscpc-pdf-options';
  function saved() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function valid(o) { /* keep only known values */
    const r = {};
    Object.keys(CHOICES).forEach(k => { if (o && CHOICES[k].indexOf(o[k]) > -1) r[k] = o[k]; });
    return r;
  }
  function resolve(def, opts) {
    return Object.assign({}, config().defaults, valid(def), valid(saved()), valid(opts));
  }
  NS.options = {
    choices: CHOICES, templates: TEMPLATES,
    get: () => resolve(null, null),
    set: patch => {
      const next = Object.assign({}, valid(saved()), valid(patch));
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* private mode: fine */ }
      return resolve(null, null);
    },
    reset: () => { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  };

  /* ---------- assets, fetched once per page visit ---------- */
  const cache = {};
  const url = p => (NS.base || '') + p;
  function toB64(buf) {
    let s = ''; const b = new Uint8Array(buf), n = 0x8000;
    for (let i = 0; i < b.length; i += n) s += String.fromCharCode.apply(null, b.subarray(i, i + n));
    return btoa(s);
  }
  function fontB64(p) {
    if (!cache[p]) cache[p] = fetch(url(p)).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(toB64);
    return cache[p];
  }
  function logoData(path) {
    const k = 'logo:' + path;
    if (!cache[k]) cache[k] = new Promise(res => {
      if (typeof Image === 'undefined') { res(null); return; }
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0); res(c.toDataURL('image/png'));
        } catch (e) { res(null); }
      };
      img.onerror = () => res(null);
      img.src = url(path);
    });
    return cache[k];
  }
  async function loadFonts(doc) {
    try {
      const [r, s, b] = await Promise.all([fontB64('fonts/poppins-regular.ttf'), fontB64('fonts/poppins-semibold.ttf'), fontB64('fonts/poppins-bold.ttf')]);
      doc.addFileToVFS('Poppins-Regular.ttf', r); doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
      doc.addFileToVFS('Poppins-SemiBold.ttf', s); doc.addFont('Poppins-SemiBold.ttf', 'PoppinsSemi', 'normal');
      doc.addFileToVFS('Poppins-Bold.ttf', b); doc.addFont('Poppins-Bold.ttf', 'Poppins', 'bold');
      return { reg: ['Poppins', 'normal'], semi: ['PoppinsSemi', 'normal'], bold: ['Poppins', 'bold'] };
    } catch (e) {
      return { reg: ['helvetica', 'normal'], semi: ['helvetica', 'bold'], bold: ['helvetica', 'bold'] };
    }
  }

  /* ---------- start a document ---------- */
  /* create(title, opts) -> context x. opts: {template, pageSize, orientation, textSize}
     (anything left out comes from the visitor's saved choice, then PDF_CONFIG). */
  async function create(title, opts, lang, headerQr) {
    if (!window.jspdf) throw new Error('jsPDF not loaded');
    const cfg = config(), o = resolve(null, opts), P = palette(cfg), T = TEMPLATES[o.template];
    let pw = SIZES[o.pageSize][0], ph = SIZES[o.pageSize][1];
    if (o.orientation === 'landscape') { const t = pw; pw = ph; ph = t; }
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: [pw, ph], orientation: pw > ph ? 'landscape' : 'portrait', compress: true });
    try { doc.setProperties({ title: String(title), subject: cfg.clubName, author: cfg.shortName, creator: cfg.clubName }); } catch (e) { /* ignore */ }
    const M = pw >= 200 ? 18 : 14;
    const x = {
      doc: doc, title: title, opts: o, lang: lang || 'en', cur: { w: 'reg' }, cfg: cfg, P: P, C: P, T: T,
      W: pw, H: ph, M: M, CW: pw - 2 * M, fs: o.textSize === 'large' ? 1.15 : 1, sp: T.sp,
      hdrH: T.hdrH * Math.max(0.72, Math.min(1, ph / 210)), secNo: 0, y: 0
    };
    x.bottom = ph - 19;
    x.f = await loadFonts(doc);
    x.logo = await logoData(cfg.logo);
    if (headerQr) { /* QR code at the header's right: only when it fits at 22 mm or more */
      const q = NS.qrPrep(x, { anchor: typeof headerQr === 'string' ? headerQr : '', size: Math.min((cfg.qr && cfg.qr.size) || 28, x.hdrH - 4) });
      if (q && q.size <= x.hdrH - 3 && q.size >= 22) x.hq = q;
    }
    NS.firstHeader(x);
    x.y = x.hdrH + T.top;
    return x;
  }

  /* ---------- registry ---------- */
  const REG = {};
  NS.register = (id, def) => { REG[id] = def; return def; };
  NS.get = id => REG[id];
  NS.list = () => Object.keys(REG).map(id => ({ id: id, title: typeof REG[id].title === 'function' ? REG[id].title() : REG[id].title, sample: REG[id].sample }));

  /* generate(id, data, opts) -> { blob, name, doc }.  Rejects if the PDF cannot be built. */
  /* opts may also carry lang: 'en' | 'si' | 'ta'. It only applies to documents registered with
     languages: true (join, register); the header and footer always stay English. */
  const LANGS = ['en', 'si', 'ta'];
  NS.generate = async function (id, data, opts) {
    const def = REG[id];
    if (!def) throw new Error('Unknown PDF: ' + id);
    data = data || {};
    opts = opts || {};
    const lang = def.languages && LANGS.indexOf(opts.lang) > -1 ? opts.lang : 'en';
    /* load the Sinhala/Tamil fonts when the chosen language, or anything the visitor typed, needs them */
    let typed = false;
    try { typed = NS.text.has(JSON.stringify(data)); } catch (e) { /* ignore */ }
    await NS.text.prepare(lang !== 'en' || typed);
    const title = typeof def.title === 'function' ? def.title(data) : def.title;
    const x = await create(title, Object.assign({}, def.options, opts), lang, opts.headerQr != null ? opts.headerQr : def.headerQr);
    await def.build(x, data);
    NS.finish(x, def.footer ? def.footer(data) : undefined);
    const name = def.filename ? def.filename(data) : id + '.pdf';
    return { blob: x.doc.output('blob'), name: name, doc: x.doc, x: x };
  };

  /* Generate and save straight away (used by buttons that need no preview). */
  NS.download = async function (id, data, opts) {
    const def = REG[id];
    const d = data || (def && typeof def.data === 'function' ? def.data() : {});
    const pdf = await NS.generate(id, d, opts);
    pdf.doc.save(pdf.name);
    return pdf;
  };

  /* file-name helper: letters and digits joined by dashes, with a safe fallback */
  NS.slug = (s, fallback) => {
    const t = NS.clean(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return t || fallback || new Date().toISOString().slice(0, 10);
  };

  NS.create = create;
  NS.config = config;
  NS.palette = palette;
  NS.today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
})();
