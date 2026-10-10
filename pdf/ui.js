/* SSCPC PDF engine - UI helpers.
   - SSCPCPdf.mountOptions(el, onChange): fills a <details> with the PDF options
     (style, page size, orientation, text size). Choices are remembered in the browser.
   - SSCPCPdf.mountLanguage(el, build): the optional "Sinhala or Tamil copy" box (extra downloads).
   - SSCPCPdf.deliver({...}): builds a PDF, wires the Download and Share buttons, keeps the
     English PDF as the main one (plus the optional language box for documents with
     languages: true) and rebuilds it when the visitor changes an option. Used by the Join and Register forms.
   - Any element with data-pdf="<id>" downloads that registered PDF when clicked,
     so a new download button needs no extra JavaScript. */
(function () {
  'use strict';
  const NS = window.SSCPCPdf = window.SSCPCPdf || {};

  const FIELDS = [
    { key: 'template', label: 'Style', names: { standard: 'Standard', print: 'Print-friendly (less ink)', compact: 'Compact' } },
    { key: 'pageSize', label: 'Page size', names: { a4: 'A4', a5: 'A5 (small)' } },
    { key: 'orientation', label: 'Orientation', names: { portrait: 'Portrait', landscape: 'Landscape' } },
    { key: 'textSize', label: 'Text size', names: { normal: 'Normal', large: 'Large' } }
  ];

  NS.mountOptions = function (el, onChange) {
    if (!el) return;
    el.hidden = false;
    el.className = 'pdf-opts';
    el.innerHTML = '';
    const sum = document.createElement('summary');
    sum.textContent = 'PDF options';
    el.appendChild(sum);
    const grid = document.createElement('div');
    grid.className = 'pdf-opts-grid';
    const cur = NS.options.get();
    FIELDS.forEach(f => {
      const lab = document.createElement('label');
      const span = document.createElement('span');
      span.textContent = f.label;
      const sel = document.createElement('select');
      sel.setAttribute('aria-label', f.label);
      NS.options.choices[f.key].forEach(v => {
        const o = document.createElement('option');
        o.value = v; o.textContent = f.names[v] || v;
        if (cur[f.key] === v) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => {
        const patch = {}; patch[f.key] = sel.value;
        NS.options.set(patch);
        if (typeof onChange === 'function') onChange(f.key, sel.value);
      });
      lab.appendChild(span); lab.appendChild(sel); grid.appendChild(lab);
    });
    el.appendChild(grid);
    const p = document.createElement('p');
    p.textContent = 'Your choices are remembered on this device and used for every PDF from this site.';
    el.appendChild(p);
  };

  /* Optional extra: "Need a Sinhala or Tamil copy?". The English PDF stays the main one (its Download
     and Share buttons never change). This collapsed box only adds extra downloads in another
     language. build(code) must resolve to a pdf ({blob, name}) or null. */
  NS.mountLanguage = function (before, build) {
    if (!before || !before.parentNode || !NS.LANGS) return null;
    const old = before.parentNode.querySelector('.pdf-lang');
    if (old) old.remove();
    const box = document.createElement('details');
    box.className = 'pdf-lang';
    const sum = document.createElement('summary');
    sum.textContent = 'Need a Sinhala or Tamil copy too? (optional)';
    box.appendChild(sum);
    const row = document.createElement('div');
    row.className = 'pdf-lang-row';
    const msg = document.createElement('p');
    msg.className = 'pdf-lang-note';
    msg.setAttribute('role', 'status');
    NS.LANGS.filter(l => l.code !== 'en').forEach(l => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('lang', l.code);
      b.textContent = 'Download in ' + l.label;
      b.addEventListener('click', async () => {
        if (b.disabled) return;
        b.disabled = true; msg.textContent = 'Preparing...';
        const pdf = await build(l.code);
        if (pdf) {
          const u = URL.createObjectURL(pdf.blob), a = document.createElement('a');
          a.href = u; a.download = pdf.name.replace(/\.pdf$/i, '') + '-' + l.code + '.pdf';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(u), 4000);
          msg.textContent = 'Done. Your English PDF above is unchanged.';
        } else msg.textContent = 'Sorry, that PDF could not be created on this device.';
        b.disabled = false;
      });
      row.appendChild(b);
    });
    box.appendChild(row);
    msg.textContent = 'Every line is printed in your language with the English wording beneath it. The header and footer stay in English.';
    box.appendChild(msg);
    before.parentNode.insertBefore(box, before);
    return box;
  };

  /* o: { id, data, dl, share, shareTitle, shareText, optionsEl }
     Resolves to the English pdf ({blob, name, doc}) or null if it could not be built.
     English is always the main PDF. For documents with languages: true an optional box offers
     extra Sinhala / Tamil downloads above optionsEl. */
  NS.deliver = async function (o) {
    let url = null, seq = 0;
    const def = NS.get(o.id);
    async function run() {
      const mine = ++seq; /* if the visitor changes an option quickly, only the newest build is used */
      let pdf = null;
      try { pdf = await NS.generate(o.id, o.data, { lang: 'en' }); } catch (e) { pdf = null; if (window.console) console.warn('PDF could not be created:', e); }
      if (mine !== seq) return pdf;
      if (url) { URL.revokeObjectURL(url); url = null; }
      if (o.dl) o.dl.hidden = !pdf;
      if (o.share) { o.share.hidden = true; o.share.onclick = null; }
      if (pdf) {
        url = URL.createObjectURL(pdf.blob);
        if (o.dl) { o.dl.href = url; o.dl.download = pdf.name; }
        const file = new File([pdf.blob], pdf.name, { type: 'application/pdf' });
        if (o.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          o.share.hidden = false;
          o.share.onclick = () => navigator.share({ files: [file], title: o.shareTitle, text: o.shareText }).catch(() => { });
        }
      }
      return pdf;
    }
    const first = await run();
    if (o.optionsEl) {
      if (def && def.languages) NS.mountLanguage(o.optionsEl, async code => {
        try { return await NS.generate(o.id, o.data, { lang: code }); } catch (e) { if (window.console) console.warn('PDF could not be created:', e); return null; }
      });
      NS.mountOptions(o.optionsEl, () => { run(); });
    }
    return first;
  };

  /* data-pdf="<id>" buttons */
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-pdf]');
    if (!b) return;
    const id = b.getAttribute('data-pdf');
    if (!NS.get(id)) return;
    e.preventDefault();
    if (b.dataset.busy) return;
    b.dataset.busy = '1';
    NS.download(id).catch(err => { if (window.console) console.warn('PDF failed:', err); }).then(() => { delete b.dataset.busy; });
  });

  /* options panels that are placed straight in the page (no PDF built beside them) */
  function mountStatic() {
    document.querySelectorAll('[data-pdf-options="global"]').forEach(el => NS.mountOptions(el));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountStatic); else mountStatic();
})();
