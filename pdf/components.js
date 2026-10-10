/* SSCPC PDF engine - components.
   The reusable building blocks every PDF is made from: page headers and footer,
   reference bar, numbered sections, field panels, tables, cards, stat tiles, callouts,
   signature lines, office box, paragraphs and chat bubbles.
   Everything reads page size, margins, template and colours from the context `x`
   created by SSCPCPdf.create(), so one definition works on A4/A5, portrait/landscape,
   and in the Standard / Print-friendly / Compact templates. */
(function () {
  'use strict';
  const NS = window.SSCPCPdf = window.SSCPCPdf || {};
  const T = () => NS.text;
  const PT = 0.3528; /* mm per point */

  const fill = (d, c) => d.setFillColor(c[0], c[1], c[2]);
  const ink = (d, c) => { d.__ink = c; d.setTextColor(c[0], c[1], c[2]); }; /* remembered so Sinhala/Tamil pictures use the same colour */
  const stroke = (d, c) => d.setDrawColor(c[0], c[1], c[2]);
  const alpha = (d, a) => { try { d.setGState(new d.GState({ opacity: a })); } catch (e) { /* ignore */ } };
  /* body fonts follow the visitor's text-size choice; header fonts stay fixed */
  const font = (x, w, size) => { x.cur.w = w; x.doc.setFont(x.f[w][0], x.f[w][1]); x.doc.setFontSize(size * x.fs); };
  const hfont = (x, w, size) => { x.cur.w = w; x.doc.setFont(x.f[w][0], x.f[w][1]); x.doc.setFontSize(size); };
  /* true when the document is printed in Sinhala or Tamil with the English beneath */
  const bil = x => !!x.lang && x.lang !== 'en';
  const BIL = 3.4; /* extra height (mm) of the small English row under a translated label */
  const lh = (x, size) => size * x.fs * PT * 1.42;

  function tri(x, y, h) { /* the three club colours */
    const d = x.doc, W = x.W;
    fill(d, x.P.red); d.rect(0, y, W * 0.4, h, 'F');
    fill(d, x.P.gold); d.rect(W * 0.4, y, W * 0.3, h, 'F');
    fill(d, x.P.blue); d.rect(W * 0.7, y, W * 0.3, h, 'F');
  }
  /* vector aperture mark, used when the logo image is missing */
  function mark(d, cx, cy, r, col) {
    stroke(d, col); d.setLineWidth(Math.max(0.3, r * 0.1));
    d.circle(cx, cy, r, 'S');
    const pts = [];
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; pts.push([cx + r * 0.46 * Math.cos(a), cy + r * 0.46 * Math.sin(a)]); }
    d.setLineWidth(Math.max(0.25, r * 0.07));
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % 6];
      d.line(p[0], p[1], q[0], q[1]);
      const a = i * Math.PI / 3 + Math.PI / 6;
      d.line(p[0], p[1], cx + r * 0.94 * Math.cos(a), cy + r * 0.94 * Math.sin(a));
    });
  }
  function logo(x, px, py, size, onDark) {
    const d = x.doc;
    if (x.logo) { d.addImage(x.logo, 'PNG', px, py, size, size); return; }
    mark(d, px + size / 2, py + size / 2, size * 0.46, onDark ? x.P.cream : x.P.navy);
  }
  function fitTitle(x, text, size, min, avail) {
    let s = size; hfont(x, 'semi', s);
    while (s > min && T().width(x, text) > avail) { s -= 0.5; hfont(x, 'semi', s); }
    return s;
  }

  /* ---------- page furniture ---------- */
  function firstHeader(x) {
    const d = x.doc, P = x.P, W = x.W, M = x.M, h = x.hdrH, kind = x.T.hdr;
    const title = T().clean(x.title), q = x.hq || null, rsv = q ? q.size + 6 : 0; /* q: QR code at the header's right (see qr.js) */
    const sub = x.cfg.shortName + ' \u00B7 ' + x.cfg.clubName;
    if (kind === 'light') {
      tri(x, 0, 1.2);
      const ls = h * 0.56, ly = (h - ls) / 2 + 0.6;
      logo(x, M, ly, ls, false);
      const tx = M + ls + 6, s = fitTitle(x, title, 18, 11, W - tx - M - rsv);
      ink(d, P.navy); T().put(x, title, tx, h * 0.47 + 1.2);
      hfont(x, 'reg', 7.8); ink(d, P.muted); T().put(x, sub, tx, h * 0.47 + 7.2);
      stroke(d, P.blue); d.setLineWidth(0.6); d.line(M, h - 2.6, W - M, h - 2.6);
      if (q) NS.qrDraw(x, q, W - M - q.size, (h - 2.6 - q.size) / 2 + 0.6, { border: true });
      return;
    }
    fill(d, P.navy); d.rect(0, 0, W, h, 'F');
    tri(x, 0, kind === 'mini' ? 1.2 : 1.6);
    const mini = kind === 'mini';
    if (!mini && !q) { /* soft shutter rings, top right */
      const cx = W - M - h * 0.3, cy = h / 2 + 0.8;
      alpha(d, 0.1); stroke(d, P.sky); d.setLineWidth(0.3);
      [0.18, 0.32, 0.46].forEach(r => d.circle(cx, cy, h * r, 'S'));
      alpha(d, 1);
    }
    const ls = h * (mini ? 0.56 : 0.6), ly = (h + 1.6 - ls) / 2;
    if (x.logo) { fill(d, P.white); alpha(d, 0.1); d.circle(M + ls / 2, ly + ls / 2, ls * 0.62, 'F'); alpha(d, 1); }
    logo(x, M, ly, ls, true);
    const tx = M + ls + (mini ? 5 : 7);
    const s = fitTitle(x, title, mini ? 14 : 21, 11, W - tx - M - rsv);
    ink(d, P.cream);
    if (mini) { T().put(x, title, tx, h / 2 + 2.6); }
    else {
      T().put(x, title, tx, h * 0.5);
      hfont(x, 'reg', 8); ink(d, P.soft); T().put(x, sub, tx, h * 0.5 + 7);
    }
    if (q) NS.qrDraw(x, q, W - M - q.size, (h + 1.6 - q.size) / 2, { border: false });
  }
  function contHeader(x) {
    const d = x.doc, P = x.P, W = x.W, M = x.M, h = 12, light = x.T.hdr === 'light';
    const title = T().clean(x.title);
    if (!light) { fill(d, P.navy); d.rect(0, 0, W, h, 'F'); tri(x, 0, 0.9); }
    else { tri(x, 0, 0.9); stroke(d, P.blue); d.setLineWidth(0.4); d.line(M, h - 0.5, W - M, h - 0.5); }
    logo(x, M, 2.6, 6.6, !light);
    hfont(x, 'bold', 9); ink(d, light ? P.navy : P.cream); T().put(x, x.cfg.shortName, M + 9.5, 7.3);
    hfont(x, 'reg', 7.4); ink(d, light ? P.muted : P.soft); T().put(x, title, W - M, 7.3, { align: 'right' });
    x.contEnd = h;
  }
  function addPage(x) { x.doc.addPage(); contHeader(x); x.y = (x.contEnd || 12) + 10; }
  function ensure(x, h) { if (x.y + h > x.bottom) addPage(x); }

  /* footer on every page: site, email, reference and page x of y */
  function finish(x, opt) {
    const d = x.doc, P = x.P, n = d.getNumberOfPages(), cfg = x.cfg, M = x.M, W = x.W, t = T();
    const o = typeof opt === 'string' ? { left: opt } : (opt || {});
    for (let i = 1; i <= n; i++) {
      d.setPage(i);
      const fy = x.H - 13.5;
      stroke(d, P.line); d.setLineWidth(0.25); d.line(M, fy, W - M, fy);
      hfont(x, 'reg', 7.4); ink(d, P.muted);
      const left = t.clean(o.left != null ? o.left : (cfg.footerText || (cfg.shortName + ' \u00B7 ' + cfg.siteLabel)));
      const right = (o.ref ? 'Ref ' + t.clean(o.ref) + '   \u00B7   ' : '') + 'Page ' + i + ' of ' + n;
      t.put(x, left, M, fy + 4.8);
      t.put(x, right, W - M, fy + 4.8, { align: 'right' });
      if (o.left == null) {
        const mid = t.clean(cfg.email), wl = t.width(x, left), wm = t.width(x, mid), wr = t.width(x, right);
        if (W / 2 - wm / 2 > M + wl + 6 && W / 2 + wm / 2 < W - M - wr - 6) t.put(x, mid, W / 2, fy + 4.8, { align: 'center' });
      }
      tri(x, x.H - 1.6, 1.6);
    }
    return d;
  }

  /* ---------- blocks ---------- */
  function panel(x, px, py, w, h, tint) {
    const d = x.doc, P = x.P;
    if (x.T.fill) { fill(d, tint || P.panel); d.roundedRect(px, py, w, h, 2.6, 2.6, 'F'); }
    else { stroke(d, P.line); d.setLineWidth(0.3); d.roundedRect(px, py, w, h, 2.6, 2.6, 'S'); }
  }

  /* reference bar under the header. o.badge shows the value as a pill. */
  function meta(x, label, value, dateText, o) {
    o = o || {};
    const d = x.doc, P = x.P, t = T(), M = x.M, W = x.W, y = x.y;
    const q = o.qr ? NS.qrPrep(x, o.qr) : null; /* a QR code sits at the right of the bar, beside the badge */
    const h = q ? Math.max(14.4, q.size + 4) : 14.4;
    panel(x, M, y, x.CW, h);
    hfont(x, 'semi', 6.6); ink(d, P.muted);
    const trL = NS.tr(x, label), trD = NS.tr(x, 'Date');
    if (trL) t.put(x, trL + '  /  ' + t.clean(label).toUpperCase(), M + 5, y + 5.1);
    else t.put(x, t.clean(label).toUpperCase(), M + 5, y + 5.1, { charSpace: 0.35 });
    const v = t.clean(value);
    if (o.badge) {
      const pending = /^pending/i.test(v);
      hfont(x, 'bold', 9.6);
      const bw = t.width(x, v) + 8;
      fill(d, pending ? P.amber : P.blue); d.roundedRect(M + 5, y + 6.4, bw, 6.2, 3.1, 3.1, 'F');
      ink(d, pending ? P.amberInk : P.white); t.put(x, v, M + 9, y + 10.6);
    } else {
      hfont(x, 'bold', 10.5); ink(d, P.ink); t.put(x, v, M + 5, y + 11.2);
    }
    hfont(x, 'semi', 6.6); ink(d, P.muted);
    const dl = trD ? trD + '  /  DATE' : 'DATE';
    if (q) { /* date goes under the badge, on the left */
      if (trD) t.put(x, dl, M + 5, y + 18.2); else t.put(x, dl, M + 5, y + 18.2, { charSpace: 0.35 });
      hfont(x, 'bold', 10); ink(d, P.ink); t.put(x, t.clean(dateText), M + 5, y + 23.6);
      hfont(x, 'reg', 7); ink(d, P.muted); t.put(x, t.clean(o.qr.caption || ('Scan the code to visit ' + x.cfg.siteLabel)), M + 5, y + h - 3.6);
      NS.qrDraw(x, q, W - M - 3 - q.size, y + (h - q.size) / 2, { border: true });
    } else {
      if (trD) t.put(x, dl, W - M - 5, y + 5.1, { align: 'right' });
      else t.put(x, 'DATE', W - M - 5, y + 5.1, { align: 'right', charSpace: 0.35 });
      hfont(x, 'bold', 10); ink(d, P.ink); t.put(x, t.clean(dateText), W - M - 5, y + 11.2, { align: 'right' });
    }
    x.y = y + h + (q ? 3.6 : 5.6) * x.sp;
  }

  /* numbered section heading */
  function section(x, title, need) {
    ensure(x, need || 28);
    x.y += 1.4 * x.sp;
    const d = x.doc, P = x.P, t = T(), M = x.M;
    x.secNo++;
    fill(d, P.blue); d.roundedRect(M, x.y - 4, 5.6, 5.6, 1.4, 1.4, 'F');
    hfont(x, 'bold', 8); ink(d, P.white); t.put(x, String(x.secNo), M + 2.8, x.y - 0.1, { align: 'center' });
    const trT = NS.tr(x, title);
    font(x, 'semi', 11.5); ink(d, P.navy); t.put(x, trT || t.clean(title), M + 8.6, x.y + 0.1);
    if (trT) { hfont(x, 'reg', 7.6); ink(d, P.muted); t.put(x, t.clean(title), M + 8.6, x.y + 4.3); x.y += BIL + 0.6; }
    x.y += 4.2 * x.sp + 0.6;
  }

  /* rows: [[label, value, {full:true}], ...]. Short values sit two to a line, long ones
     span the panel. Empty values show a dash so the form structure stays visible. */
  function fields(x, title, rows) {
    const d = x.doc, P = x.P, t = T(), M = x.M, pad = x.T.pad;
    const items = rows.map(r => ({ k: t.clean(r[0]), v: t.clean(r[1]), full: !!(r[2] && r[2].full) }));
    if (!items.some(it => it.v)) return;
    if (title) section(x, title);
    const inner = x.CW - 2 * pad, gut = 8, half = (inner - gut) / 2, L = lh(x, 10), vb0 = 2.5 + L * 0.92 + (bil(x) ? BIL : 0);
    const mk = (it, w) => { font(x, 'reg', 10); const l = it.v ? t.wrap(x, it.v, w) : []; return { it: it, l: l, h: vb0 + (Math.max(1, l.length) - 1) * L + 2.8 * x.sp }; };
    const rowsL = []; let pend = null;
    const push = (a, b) => {
      const A = mk(a, b ? half : (a.full ? inner : half)), B = b ? mk(b, half) : null;
      rowsL.push({ A: A, B: B, h: Math.max(A.h, B ? B.h : 0) });
    };
    items.forEach(it => {
      const short = !it.full && it.v.length <= 30 && it.v.indexOf('\n') < 0;
      if (short) { if (pend) { push(pend, it); pend = null; } else pend = it; }
      else { if (pend) { push(pend, null); pend = null; } push(Object.assign({}, it, { full: true }), null); }
    });
    if (pend) push(pend, null);
    const draw = (c, cx, y) => {
      const en = c.cont ? c.it.k + ' (continued)' : c.it.k, trK = NS.tr(x, c.it.k);
      if (trK) {
        font(x, 'semi', 8); ink(d, P.muted); t.put(x, trK, cx, y + 2.9);
        hfont(x, 'reg', 6.4); ink(d, P.muted); t.put(x, en, cx, y + 2.9 + BIL - 0.1);
      } else { hfont(x, 'semi', 7); x.doc.setFontSize(7 * x.fs); ink(d, P.muted); t.put(x, en, cx, y + 2.6); }
      font(x, 'reg', 10);
      if (!c.l.length) { ink(d, P.muted); t.put(x, '\u2014', cx, y + vb0); }
      else { ink(d, P.ink); c.l.forEach((ln, i) => t.put(x, ln, cx, y + vb0 + i * L)); }
    };
    let i = 0;
    while (i < rowsL.length) {
      const R = rowsL[i];
      ensure(x, Math.min(R.h, vb0 + 2 * L + 2.8 * x.sp) + 2 * pad); /* label + two lines is enough to start a long answer */
      const avail = x.bottom - x.y - 2 * pad;
      if (R.h > avail && !R.B && R.A.l.length > 2) { /* a long answer: continue it on the next page */
        const fit = Math.max(1, Math.floor((avail - vb0 - 2.8 * x.sp) / L) + 1);
        const hd = R.A.l.slice(0, fit), rest = R.A.l.slice(fit);
        const hh = (l) => vb0 + (l.length - 1) * L + 2.8 * x.sp;
        rowsL.splice(i, 1,
          { A: { it: R.A.it, l: hd, h: hh(hd), cont: R.A.cont }, B: null, h: hh(hd) },
          { A: { it: R.A.it, l: rest, h: hh(rest), cont: true }, B: null, h: hh(rest) });
      }
      let j = i, hs = 0;
      while (j < rowsL.length && (j === i || hs + rowsL[j].h <= avail)) { hs += rowsL[j].h; j++; }
      const top = x.y, h = hs + 2 * pad;
      panel(x, M, top, x.CW, h);
      let y = top + pad;
      for (let k = i; k < j; k++) {
        draw(rowsL[k].A, M + pad, y);
        if (rowsL[k].B) draw(rowsL[k].B, M + pad + half + gut, y);
        y += rowsL[k].h;
      }
      x.y = top + h + 2.6 * x.sp; i = j;
    }
    x.y += 1.4 * x.sp;
  }

  /* numbered list in 1-3 columns with light row shading (student names, results...) */
  function table(x, title, list, o) {
    o = o || {};
    const d = x.doc, P = x.P, t = T(), M = x.M;
    const items = (list || []).map(s => t.clean(String(s).replace(/^\s*\d+\.\s*/, ''))).filter(Boolean);
    if (!items.length) return;
    if (title) section(x, title);
    let cols = o.cols || (x.W >= 250 ? 3 : 2); const gap = 6;
    let cw = (x.CW - gap * (cols - 1)) / cols;
    if (cw < 60) { cols = 1; cw = x.CW; }
    const nw = 9, L = lh(x, 9.5), pt = 1.8 * x.sp + 0.4;
    let r = 0;
    for (let i = 0; i < items.length; i += cols, r++) {
      font(x, 'reg', 9.5);
      const cells = items.slice(i, i + cols).map((s, k) => ({ n: i + k + 1, l: t.wrap(x, s, cw - nw - 3) }));
      const lines = Math.max.apply(null, cells.map(c => c.l.length));
      const h = 2 * pt + lines * L;
      ensure(x, h);
      if (r % 2 === 0) { if (x.T.fill) { fill(d, P.panel); d.rect(M, x.y, x.CW, h, 'F'); } }
      if (!x.T.fill) { stroke(d, P.line); d.setLineWidth(0.2); d.line(M, x.y + h, M + x.CW, x.y + h); }
      cells.forEach((c, k) => {
        const cx = M + k * (cw + gap) + 2;
        hfont(x, 'semi', 8); d.setFontSize(8 * x.fs); ink(d, P.blue); t.put(x, String(c.n), cx, x.y + pt + L * 0.78);
        font(x, 'reg', 9.5); ink(d, P.ink);
        c.l.forEach((ln, q) => t.put(x, ln, cx + nw, x.y + pt + L * 0.78 + q * L));
      });
      x.y += h;
    }
    x.y += 5 * x.sp;
  }

  /* cards in 1-3 columns: items = [{n, title, pts:[...]}] (tips sheet).
     Columns drop automatically when the page is too narrow or the cards too tall. */
  function cards(x, items, o) {
    o = o || {};
    const d = x.doc, P = x.P, t = T(), M = x.M, pad = x.T.pad, bw = 6.2, gap = 5, minW = 80;
    let cols = o.cols || (x.W >= 250 ? 3 : 2), cw = (x.CW - gap * (cols - 1)) / cols;
    while (cols > 1 && cw < minW) { cols--; cw = (x.CW - gap * (cols - 1)) / cols; }
    const Lt = lh(x, 10.5), Lp = lh(x, 8.8), pageH = x.H - 19 - 22;
    const meas = it => {
      font(x, 'bold', 10.5); const tl = t.wrap(x, it.title, cw - 2 * pad - bw - 3);
      font(x, 'reg', 8.8); const pl = (it.pts || []).map(p => t.wrap(x, p, cw - 2 * pad - 5));
      const headH = Math.max(bw, tl.length * Lt) + 2.4;
      const body = pl.reduce((s, l) => s + l.length * Lp + 1.4, 0);
      return { it: it, tl: tl, pl: pl, headH: headH, h: pad + headH + body + pad - 1 };
    };
    let ms = items.map(meas);
    if (cols > 1 && ms.some(m => m.h > pageH)) { cols = 1; cw = x.CW; ms = items.map(meas); }
    const head = (m, cx, y) => {
      fill(d, P.blue); d.circle(cx + pad + bw / 2, y + pad + bw / 2, bw / 2, 'F');
      hfont(x, 'bold', 8); ink(d, P.white); t.put(x, String(m.it.n), cx + pad + bw / 2, y + pad + bw / 2 + 1.0, { align: 'center' });
      font(x, 'bold', 10.5); ink(d, P.navy);
      const b0 = y + pad + Math.max(bw / 2 + 1.5, Lt * 0.8);
      m.tl.forEach((ln, q) => t.put(x, ln, cx + pad + bw + 3, b0 + q * Lt));
    };
    const bullet = (lines, cx, yy) => {
      fill(d, P.blue); d.circle(cx + pad + 1, yy + Lp * 0.5, 0.55, 'F');
      font(x, 'reg', 8.8); ink(d, [50, 58, 84]);
      lines.forEach((ln, q) => t.put(x, ln, cx + pad + 5, yy + Lp * 0.78 + q * Lp));
    };
    for (let i = 0; i < ms.length; i += cols) {
      const row = ms.slice(i, i + cols);
      const h = Math.max.apply(null, row.map(m => m.h));
      if (h > pageH) { /* one card taller than a whole page: let it flow, without a box */
        const m = row[0];
        ensure(x, m.headH + pad + Lp * 3);
        head(m, M - pad, x.y - pad); x.y += m.headH;
        m.pl.forEach(lines => { ensure(x, lines.length * Lp + 1.4); bullet(lines, M - pad, x.y); x.y += lines.length * Lp + 1.4; });
        x.y += gap; continue;
      }
      ensure(x, h);
      row.forEach((m, k) => {
        const cx = M + k * (cw + gap), y = x.y;
        panel(x, cx, y, cw, h);
        head(m, cx, y);
        let yy = y + pad + m.headH;
        m.pl.forEach(lines => { bullet(lines, cx, yy); yy += lines.length * Lp + 1.4; });
      });
      x.y += h + gap;
    }
    x.y += 1;
  }

  /* big-number tiles: items = [[label, value], ...] (up to 4) */
  function stats(x, items) {
    const d = x.doc, P = x.P, t = T(), M = x.M, n = Math.min(4, items.length), gap = 5;
    if (!n) return;
    const w = (x.CW - gap * (n - 1)) / n, h = 17 * x.sp + 3;
    ensure(x, h + 4);
    for (let i = 0; i < n; i++) {
      const cx = M + i * (w + gap);
      panel(x, cx, x.y, w, h);
      hfont(x, 'bold', 19); ink(d, P.blue); t.put(x, t.clean(items[i][1]) || '\u2014', cx + 5, x.y + h * 0.56);
      const trS = NS.tr(x, items[i][0]);
      hfont(x, 'semi', 7); ink(d, P.muted); t.put(x, (trS ? trS + '  /  ' : '') + t.clean(items[i][0]), cx + 5, x.y + h - 4);
    }
    x.y += h + 5 * x.sp;
  }

  /* tinted banner with a title and lines (event details) */
  function banner(x, title, lines) {
    const d = x.doc, P = x.P, t = T(), M = x.M, w = x.CW - 13, L = lh(x, 8.8);
    font(x, 'reg', 8.8);
    const ls = []; (Array.isArray(lines) ? lines : [lines]).forEach(s => t.wrap(x, s, w).forEach(l => ls.push(l)));
    const h = (title ? 6 : 0) + ls.length * L + 5;
    ensure(x, h + 3);
    panel(x, M, x.y, x.CW, h, P.tint);
    fill(d, P.blue); d.roundedRect(M, x.y, 1.8, h, 0.9, 0.9, 'F');
    let y = x.y + 5.2;
    if (title) { font(x, 'bold', 10); ink(d, P.navy); t.put(x, t.clean(title), M + 7, y); y += 5.4; }
    font(x, 'reg', 8.8); ink(d, [50, 58, 84]);
    ls.forEach((ln, i) => t.put(x, ln, M + 7, y + i * L));
    x.y += h + 4 * x.sp;
  }

  /* soft callout box. o.title adds a bold first line. */
  function note(x, text, o) {
    o = o || {};
    const d = x.doc, P = x.P, t = T(), M = x.M, L = lh(x, 9), L2 = lh(x, 8.2);
    const trN = NS.tr(x, text), trT = o.title ? NS.tr(x, o.title) : null;
    const q = o.qr ? NS.qrPrep(x, o.qr) : null, tw = x.CW - 14 - (q ? q.size + 5 : 0); /* inline QR on the right */
    font(x, 'reg', 9);
    const lines = t.wrap(x, trN || text, tw);
    font(x, 'reg', 8.2);
    const enLines = trN ? t.wrap(x, text, tw) : [];
    const h = Math.max(lines.length * L + (enLines.length ? enLines.length * L2 + 1.8 : 0) + 5.2 + (o.title ? 5.8 : 0), q ? q.size + 7 : 0);
    ensure(x, h + 2);
    panel(x, M, x.y, x.CW, h);
    fill(d, P.blue); d.roundedRect(M, x.y, 1.8, h, 0.9, 0.9, 'F');
    let y = x.y + 5.2;
    if (o.title) { font(x, 'bold', 9.4); ink(d, P.navy); t.put(x, (trT ? trT + '  /  ' : '') + t.clean(o.title), M + 7, y); y += 5.6; }
    font(x, 'reg', 9); ink(d, P.ink);
    lines.forEach((ln, i) => t.put(x, ln, M + 7, y + i * L));
    if (enLines.length) {
      y += lines.length * L + 1.2;
      font(x, 'reg', 8.2); ink(d, P.muted);
      enLines.forEach((ln, i) => t.put(x, ln, M + 7, y + i * L2));
    }
    if (q) {
      NS.qrDraw(x, q, M + x.CW - q.size - 3.5, x.y + (h - q.size) / 2, { border: true });
      if (o.qr.caption) { font(x, 'reg', 7.6); ink(d, P.muted); t.put(x, t.clean(o.qr.caption), M + 7, x.y + h - 3.6); }
    }
    x.y += h + 4 * x.sp;
  }

  /* signature lines: labels = ['Applicant signature', ...]; o.declaration adds a line above */
  function signatures(x, labels, o) {
    o = o || {};
    const d = x.doc, P = x.P, t = T(), M = x.M, B = bil(x);
    let decl = [], declEn = [];
    const trDecl = o.declaration ? NS.tr(x, o.declaration) : null;
    if (o.declaration) {
      font(x, 'reg', 8.8); decl = t.wrap(x, trDecl || o.declaration, x.CW);
      if (trDecl) { font(x, 'reg', 7.8); declEn = t.wrap(x, o.declaration, x.CW); }
    }
    const L = lh(x, 8.8), L2 = lh(x, 7.8);
    ensure(x, 30 + decl.length * L + declEn.length * L2 + (B ? 8 : 0));
    if (decl.length) {
      font(x, 'reg', 8.8); ink(d, P.muted);
      decl.forEach((ln, i) => t.put(x, ln, M, x.y + i * L)); x.y += decl.length * L + 2;
      if (declEn.length) {
        font(x, 'reg', 7.8);
        declEn.forEach((ln, i) => t.put(x, ln, M, x.y - 1 + i * L2)); x.y += declEn.length * L2;
      }
    }
    const n = labels.length, gap = 8, w = (x.CW - gap * (n - 1)) / n, y = x.y + 11;
    labels.forEach((l, i) => {
      const cx = M + i * (w + gap), trL = NS.tr(x, l);
      stroke(d, P.ink); d.setLineWidth(0.3); d.line(cx, y, cx + w, y);
      if (trL) {
        font(x, 'semi', 7.6); ink(d, P.muted); t.put(x, trL, cx, y + 4.4);
        hfont(x, 'reg', 6); ink(d, P.muted); t.put(x, t.clean(l), cx, y + 4.4 + BIL - 0.2);
      } else { hfont(x, 'semi', 7); d.setFontSize(7 * x.fs); ink(d, P.muted); t.put(x, t.clean(l), cx, y + 4.4); }
    });
    x.y = y + 9 + (B ? BIL : 0);
  }

  /* dashed "for club use" box with write-in lines */
  function officeBox(x, title, labels) {
    const d = x.doc, P = x.P, t = T(), M = x.M, pad = x.T.pad, n = labels.length, gap = 8;
    const B = bil(x), ex = B ? BIL : 0, h = 24 * x.sp + 1 + ex;
    ensure(x, h + 5);
    stroke(d, P.muted); d.setLineWidth(0.3);
    try { d.setLineDashPattern([1.4, 1.4], 0); } catch (e) { /* ignore */ }
    d.roundedRect(M, x.y, x.CW, h, 2.6, 2.6, 'S');
    try { d.setLineDashPattern([], 0); } catch (e) { /* ignore */ }
    hfont(x, 'semi', 6.6); ink(d, P.muted);
    const trB = NS.tr(x, title);
    if (trB) t.put(x, trB + '  /  ' + t.clean(title).toUpperCase(), M + pad, x.y + 6);
    else t.put(x, t.clean(title).toUpperCase(), M + pad, x.y + 6, { charSpace: 0.35 });
    const w = (x.CW - 2 * pad - gap * (n - 1)) / n, ly = x.y + h - 8.4 - ex;
    labels.forEach((l, i) => {
      const cx = M + pad + i * (w + gap);
      stroke(d, P.line); d.setLineWidth(0.3); d.line(cx, ly, cx + w, ly);
      const trL = NS.tr(x, l);
      if (trL) {
        font(x, 'semi', 7.6); ink(d, P.muted); t.put(x, trL, cx, ly + 4.2);
        hfont(x, 'reg', 6); ink(d, P.muted); t.put(x, t.clean(l), cx, ly + 4.2 + BIL - 0.2);
      } else { hfont(x, 'semi', 7); d.setFontSize(7 * x.fs); ink(d, P.muted); t.put(x, t.clean(l), cx, ly + 4.2); }
    });
    x.y += h + 4 * x.sp;
  }

  /* QR code at the bottom-right of the last page (end of the tips sheet), with a short line beside it.
     o: { anchor, size, label, pin } - pin:false puts it straight after the content instead. */
  function qrCorner(x, o) {
    o = o || {};
    const d = x.doc, P = x.P, t = T(), M = x.M, q = NS.qrPrep(x, o);
    if (!q) return;
    if (x.y + 3 + q.size > x.bottom) addPage(x);
    const py = o.pin === false ? x.y + 3 : x.bottom - q.size, px = x.W - M - q.size;
    NS.qrDraw(x, q, px, py, { border: true });
    const tx = px - 5, cy = py + q.size / 2;
    font(x, 'bold', 9.4); ink(d, P.navy); t.put(x, t.clean(o.label || 'Scan to visit the club website'), tx, cy - 1, { align: 'right' });
    font(x, 'reg', 8.2); ink(d, P.muted); t.put(x, t.clean(o.sub || x.cfg.siteLabel), tx, cy + 4, { align: 'right' });
    x.y = Math.max(x.y, py + q.size + 2);
  }

  /* running text (chat, tips) */
  function para(x, text, o) {
    o = o || {};
    const d = x.doc, t = T(), size = o.size || 10, L = o.lh || lh(x, size) * 0.98, cx = o.x || x.M, w = (o.w || x.CW) - (cx - x.M);
    font(x, o.bold ? 'bold' : (o.semi ? 'semi' : 'reg'), size); ink(d, o.color || x.P.ink);
    t.wrap(x, text, w).forEach(ln => { ensure(x, L); t.put(x, ln, cx, x.y); x.y += L; });
    x.y += o.after || 0;
  }

  /* rounded text bubble that can flow over a page break.
     o: {right, fill, bar, color, w, after, avatar:{letter, fill}} */
  function bubble(x, text, o) {
    o = o || {};
    const d = x.doc, P = x.P, t = T(), M = x.M, size = o.size || 9.4, L = lh(x, size), px = 4.6, py = 3.6;
    const av = o.avatar ? 6.4 : 0, ag = o.avatar ? 2.6 : 0, maxw = x.CW - av - ag;
    const w = Math.min(o.w || maxw * 0.86, maxw);
    const bx = o.right ? x.W - M - av - ag - w : M + av + ag, off = o.bar ? 1 : 0;
    font(x, 'reg', size);
    let lines = t.wrap(x, text, w - 2 * px - off), first = true;
    while (lines.length) {
      ensure(x, L + 2 * py + 2);
      const room = Math.floor((x.bottom - x.y - 2 * py) / L), part = lines.slice(0, Math.max(1, room));
      lines = lines.slice(part.length);
      const h = part.length * L + 2 * py;
      fill(d, o.fill || P.panel); d.roundedRect(bx, x.y, w, h, 3.2, 3.2, 'F');
      if (o.bar) { fill(d, o.bar); d.roundedRect(bx, x.y, 1.5, h, 0.75, 0.75, 'F'); }
      if (first && o.avatar) {
        const cx = o.right ? x.W - M - av / 2 : M + av / 2, cy = x.y + av / 2;
        fill(d, o.avatar.fill); d.circle(cx, cy, av / 2, 'F');
        hfont(x, 'bold', 8); ink(d, P.white); t.put(x, o.avatar.letter, cx, cy + 1.1, { align: 'center' });
      }
      font(x, 'reg', size); ink(d, o.color || P.ink);
      part.forEach((ln, i) => t.put(x, ln, bx + px + off, x.y + py + L * 0.78 + i * L));
      x.y += h + (lines.length ? 0 : (o.after == null ? 3 : o.after));
      first = false;
    }
  }
  /* small label above a bubble. o: {right, color, inset} */
  function tag(x, text, o) {
    o = o || {}; ensure(x, 8);
    const t = T(), inset = o.inset || 0;
    hfont(x, 'semi', 6.6); x.doc.setFontSize(6.6 * x.fs); ink(x.doc, o.color || x.P.muted);
    t.put(x, t.clean(text).toUpperCase(), o.right ? x.W - x.M - inset : x.M + inset, x.y + 0.6, { align: o.right ? 'right' : 'left', charSpace: 0.35 });
    x.y += 3.6;
  }

  Object.assign(NS, {
    firstHeader: firstHeader, contHeader: contHeader, addPage: addPage, ensure: ensure, finish: finish,
    meta: meta, section: section, fields: fields, table: table, cards: cards, stats: stats, banner: banner,
    note: note, qrCorner: qrCorner, signatures: signatures, officeBox: officeBox, para: para, bubble: bubble, tag: tag, panel: panel
  });
  NS.C = NS.palette(NS.config()); /* colour names the old kit exposed (K.C.ink, K.C.blue ...) */
})();
