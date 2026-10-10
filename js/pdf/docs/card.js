/* PDF: SSCPC membership card.
   Data: { name, grade, ref, photo }   (photo = optional JPEG/PNG data URL of the member's face)   (ref = the membership number, e.g. "SSCPC 007")
   Page size is exactly a bank-card (ID-1): 85.60 x 53.98 mm, corner radius 3.18 mm
   (the standard allows 2.88 to 3.48 mm). Two pages: 1 = front, 2 = back. The rounded card is drawn on a
   white page the same size as the card, so it can be printed on card stock and cut or die-cut as is.
   The code on the front opens the About page of the site. English only. */
(function () {
  'use strict';
  const NS = window.SSCPCPdf;
  const CW = 85.6, CH = 53.98, R = 3.18;

  function style(x, w, size, col, spaced) {
    const d = x.doc;
    x.cur.w = w; d.setFont(x.f[w][0], x.f[w][1]); d.setFontSize(size);
    d.setTextColor(col[0], col[1], col[2]); d.__ink = col;
  }
  const put = (x, s, px, py, o) => NS.text.put(x, NS.text.clean(s), px, py, o);
  const alpha = (d, a) => { try { d.setGState(new d.GState({ opacity: a })); } catch (e) { /* ignore */ } };
  function strip(x, y) { /* the three club colours, kept inside the rounded corners */
    const d = x.doc, P = x.P, w = CW - 2 * R;
    d.setFillColor.apply(d, P.red); d.rect(R, y, w * 0.4, 1.3, 'F');
    d.setFillColor.apply(d, P.gold); d.rect(R + w * 0.4, y, w * 0.3, 1.3, 'F');
    d.setFillColor.apply(d, P.blue); d.rect(R + w * 0.7, y, w * 0.3, 1.3, 'F');
  }
  /* small caption: English in capitals, or "translation / ENGLISH" in a Sinhala/Tamil card */
  function cap(x, en, px, py, o) {
    const t = NS.tr(x, en), up = en.toUpperCase();
    if (t) put(x, t + '  /  ' + up, px, py); else put(x, up, px, py, { charSpace: o && o.cs || 0.45 });
  }
  function logo(x, px, py, s, ring) {
    const d = x.doc;
    if (ring) { d.setFillColor(255, 255, 255); alpha(d, 0.14); d.circle(px + s / 2, py + s / 2, s * 0.6, 'F'); alpha(d, 1); }
    if (x.logo) d.addImage(x.logo, 'PNG', px, py, s, s);
  }
  /* shrink a name until it fits in w mm on at most two lines */
  function fitName(x, text, w) {
    let size = 12.5, lines;
    for (; size >= 7.5; size -= 0.5) {
      style(x, 'bold', size, x.P.white);
      lines = NS.text.wrap(x, text, w);
      if (lines.length <= 2 && lines.every(l => NS.text.width(x, l) <= w)) break;
    }
    return { size: size, lines: lines.slice(0, 2) };
  }

  NS.register('card', {
    title: 'SSCPC Membership Card',
    page: { w: CW, h: CH },
    languages: true, /* optional Sinhala / Tamil copy: labels in that language with the English beside them */
    filename: d => 'SSCPC-Membership-Card-' + NS.slug(d.name) + '.pdf',
    sample: { name: 'Kasun Perera', grade: 'Grade 10', ref: 'SSCPC 007' },
    build: function (x, d) {
      const doc = x.doc, P = x.P, year = new Date().getFullYear();
      const name = NS.text.clean(d.name) || 'Member', grade = NS.text.clean(d.grade), ref = NS.text.clean(d.ref) || 'Pending';

      /* ---------- front ---------- */
      doc.setFillColor.apply(doc, P.navy); doc.roundedRect(0, 0, CW, CH, R, R, 'F');
      doc.setDrawColor.apply(doc, P.sky); doc.setLineWidth(0.25); alpha(doc, 0.12); /* soft shutter rings */
      [9, 15, 21].forEach(r => doc.circle(CW - 2, 2, r, 'S')); alpha(doc, 1);
      strip(x, 0);
      logo(x, 6, 6, 12, true);
      style(x, 'bold', 11, P.cream); put(x, 'SSCPC', 21.5, 11.3);
      style(x, 'reg', 5.2, P.soft); put(x, "St. Sylvester's College", 21.5, 14.8); put(x, 'Photography Club', 21.5, 17.6);
      style(x, 'semi', 5, P.sky); cap(x, 'Member', 6, 26.5, { cs: 0.5 });
      const qw = 22, nameW = CW - 6 - qw - 6 - 6; /* name stays left of the QR code */
      const nm = fitName(x, name, nameW);
      style(x, 'bold', nm.size, P.white);
      nm.lines.forEach((l, i) => put(x, l, 6, 32.2 + i * nm.size * 0.42, {}));
      style(x, 'semi', 4.8, P.soft); cap(x, 'Membership No.', 6, 43.6);
      style(x, 'bold', 8.2, P.navy);
      const bw = NS.text.width(x, ref) + 6.4;
      doc.setFillColor.apply(doc, P.gold); doc.roundedRect(6, 45, bw, 5.6, 2.8, 2.8, 'F');
      style(x, 'bold', 8.2, P.navy); put(x, ref, 9.2, 49);
      if (grade) { style(x, 'reg', 7, P.soft); put(x, grade, 6 + bw + 3.2, 49); } /* grade sits beside the number */
      if (d.photo) { /* member photo, top right, 3:4 portrait with a gold frame */
        const pw = 16, ph = 21.33, pxx = CW - 6 - pw, pyy = 4.5;
        try {
          doc.addImage(d.photo, /^data:image\/png/i.test(d.photo) ? 'PNG' : 'JPEG', pxx, pyy, pw, ph);
          doc.setDrawColor.apply(doc, P.gold); doc.setLineWidth(0.5); doc.roundedRect(pxx, pyy, pw, ph, 1.2, 1.2, 'S');
        } catch (e) { /* a bad image should never stop the card being made */ }
      }
      const q = NS.qrPrep(x, { anchor: 'about', size: qw });
      if (q) NS.qrDraw(x, q, CW - 6 - q.size, CH - 5 - q.size, { border: false });

      /* ---------- back ---------- */
      doc.addPage();
      doc.setFillColor(246, 247, 251); doc.roundedRect(0, 0, CW, CH, R, R, 'F');
      doc.setDrawColor.apply(doc, P.line); doc.setLineWidth(0.3); doc.roundedRect(0.15, 0.15, CW - 0.3, CH - 0.3, R, R, 'S');
      strip(x, 0);
      logo(x, 6, 5.5, 9, false);
      style(x, 'bold', 8, P.navy); put(x, 'SSCPC', 17, 10);
      style(x, 'reg', 5.2, P.muted); put(x, "St. Sylvester's College Photography Club", 17, 13.4);
      const para = "This card shows that the holder is a member of the St. Sylvester's College Photography Club. It is not transferable.";
      const trP = NS.tr(x, para);
      let y1 = 31.5, y2 = 39.2;
      if (trP) { /* a translated card: the translation, then the English beneath it, then the details */
        style(x, 'reg', 5, P.ink);
        const tl = NS.text.wrap(x, trP, CW - 12);
        tl.forEach((l, i) => put(x, l, 6, 18.8 + i * 2.8));
        style(x, 'reg', 4.3, P.muted);
        const el = NS.text.wrap(x, para, CW - 12), ey = 18.8 + (tl.length - 1) * 2.8 + 3.6;
        el.forEach((l, i) => put(x, l, 6, ey + i * 1.95));
        y1 = ey + (el.length - 1) * 1.95 + 3.6; y2 = y1 + 7.2;
      } else {
        style(x, 'reg', 6.2, P.ink);
        NS.text.wrap(x, para, CW - 12).forEach((l, i) => put(x, l, 6, 21.5 + i * 3.1));
      }
      const row = (label, val, py) => {
        style(x, 'semi', 4.8, P.muted); cap(x, label, 6, py, { cs: 0.4 });
        style(x, 'bold', 7, P.ink); put(x, val, 6, py + 3.4);
      };
      row('Member', name.length > 34 ? name.slice(0, 33) + '...' : name, y1);
      row('Membership No.', ref, y2);
      style(x, 'semi', 4.8, P.muted); const vx = trP ? 40 : 48;
      cap(x, 'Valid', vx, y2, { cs: 0.4 });
      style(x, 'bold', 7, P.ink); put(x, String(year), vx, y2 + 3.4);
      style(x, 'reg', 4.8, P.muted);
      put(x, x.cfg.email, 6, CH - 5.4); put(x, x.cfg.siteLabel, 6, CH - 2.8);
      doc.setDrawColor.apply(doc, P.ink); doc.setLineWidth(0.25); doc.line(CW - 6 - 26, 46.2, CW - 6, 46.2);
      style(x, 'semi', 4.6, P.muted); { const t = NS.tr(x, 'President'); put(x, t ? t + ' / President' : 'President', CW - 6 - 26, 48.8); }
    }
  });
})();
