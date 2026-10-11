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

  /* Pop-up that asks which language a download should be in. The choice is optional:
     "Continue in English" (or any language button) downloads straight away; Esc, the X or a tap outside
     cancels. Resolves to 'en' | 'si' | 'ta', or null if cancelled. o: { title, note } */
  NS.chooseLanguage = function (o) {
    o = o || {};
    if (!NS.LANGS || typeof HTMLDialogElement === 'undefined') return Promise.resolve('en');
    return new Promise(resolve => {
      const dlg = document.createElement('dialog');
      dlg.className = 'lang-dlg';
      dlg.setAttribute('aria-labelledby', 'lang-dlg-t');
      let result = null;
      const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
      const x = mk('button', 'lang-x', '\u00d7'); x.type = 'button'; x.setAttribute('aria-label', 'Close');
      x.addEventListener('click', () => dlg.close());
      const t = mk('h3', 'lang-t', o.title || 'Choose a language'); t.id = 'lang-dlg-t';
      const note = mk('p', 'lang-note', o.note || 'This is optional. Skip it to get the English version.');
      const row = mk('div', 'lang-row');
      NS.LANGS.forEach(l => {
        const b = mk('button', 'lang-opt' + (l.code === 'en' ? ' is-main' : ''), l.label);
        b.type = 'button'; b.lang = l.code;
        b.addEventListener('click', () => { result = l.code; dlg.close(); });
        row.appendChild(b);
      });
      const skip = mk('button', 'lang-skip', 'Skip and continue in English'); skip.type = 'button';
      skip.addEventListener('click', () => { result = 'en'; dlg.close(); });
      dlg.append(x, t, note, row, skip);
      dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); }); /* tap outside = cancel */
      dlg.addEventListener('close', () => { dlg.remove(); resolve(result); });
      document.body.appendChild(dlg);
      try { dlg.showModal(); } catch (e) { dlg.remove(); resolve('en'); }
    });
  };
  /* saves a {blob, name} pdf to the device. suffix is added before .pdf (for example '-si') */
  NS.saveBlob = function (pdf, suffix) {
    const u = URL.createObjectURL(pdf.blob), a = document.createElement('a');
    a.href = u; a.download = pdf.name.replace(/\.pdf$/i, '') + (suffix || '') + '.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  };

  /* o: { id, data, dl, share, shareTitle, shareText, optionsEl, languagePrompt }
     languagePrompt: true asks for the language in a pop-up when Download is pressed (and does not add the
     collapsed "Sinhala or Tamil copy" box).
     Resolves to the English pdf ({blob, name, doc}) or null if it could not be built.
     English is always the main PDF. For documents with languages: true an optional box offers
     extra Sinhala / Tamil downloads above optionsEl. */
  NS.deliver = async function (o) {
    let url = null, seq = 0, current = null;
    const def = NS.get(o.id);
    async function run() {
      const mine = ++seq; /* if the visitor changes an option quickly, only the newest build is used */
      let pdf = null;
      try { pdf = await NS.generate(o.id, o.data, { lang: 'en' }); } catch (e) { pdf = null; if (window.console) console.warn('PDF could not be created:', e); }
      if (mine !== seq) return pdf;
      if (url) { URL.revokeObjectURL(url); url = null; }
      if (o.dl) o.dl.hidden = !pdf;
      if (o.share) { o.share.hidden = true; o.share.onclick = null; }
      current = pdf;
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
    if (o.languagePrompt && o.dl && def && def.languages) {
      o.dl.onclick = async e => {
        e.preventDefault();
        if (o.dl.dataset.busy) return;
        const code = await NS.chooseLanguage({ title: 'Choose a language for your PDF' });
        if (!code) return;
        o.dl.dataset.busy = '1';
        try {
          const pdf = code === 'en' ? (current || await NS.generate(o.id, o.data, { lang: 'en' })) : await NS.generate(o.id, o.data, { lang: code });
          if (pdf) NS.saveBlob(pdf, code === 'en' ? '' : '-' + code); else alert('Sorry, that PDF could not be created on this device.');
        } catch (err) { if (window.console) console.warn('PDF could not be created:', err); alert('Sorry, that PDF could not be created on this device.'); }
        delete o.dl.dataset.busy;
      };
    }
    if (o.optionsEl) {
      if (def && def.languages && !o.languagePrompt) NS.mountLanguage(o.optionsEl, async code => {
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
