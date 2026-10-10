/* SSCPC admin - "Gallery views per album" table.
   Put  <div id="album-views"></div>  where the table should appear in the admin page, load this file, and call
       SSCPCAlbumViews.mount(document.getElementById('album-views'), { endpoint: FORMS_ENDPOINT, key: ADMIN_KEY_FROM_THE_LOGIN });
   `key` is the admin key the portal already holds (the same ADMIN_KEY that is set in tools/google-sheet-script.gs).
   It reads the numbers from the Apps Script (action=album-views) and draws a sorted table with bars,
   a total, the last-viewed date and a Refresh button. Uses plain text only (no HTML from the server is inserted). */
(function () {
  'use strict';
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function fmtDate(v) { const d = new Date(v); return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

  function mount(host, o) {
    if (!host) return;
    o = o || {};
    host.textContent = '';
    host.classList.add('av');
    const style = el('style', null, '.av{font-size:.9rem}.av table{width:100%;border-collapse:collapse}.av th,.av td{text-align:left;padding:.45rem .5rem;border-bottom:1px solid rgba(128,140,170,.25)}.av th{font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;opacity:.75}.av td.n{text-align:right;font-variant-numeric:tabular-nums;width:5rem}.av .bar{height:.5rem;border-radius:.25rem;background:#2882e6;min-width:2px}.av .bw{width:40%}.av .top{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:.6rem}.av button{font:inherit;padding:.4rem .8rem;border-radius:.4rem;border:1px solid rgba(128,140,170,.5);background:transparent;color:inherit;cursor:pointer}.av .msg{opacity:.8;margin:.5rem 0}');
    const top = el('div', 'top'), title = el('b', null, 'Gallery views per album'), btn = el('button', null, 'Refresh');
    btn.type = 'button';
    top.appendChild(title); top.appendChild(btn);
    const msg = el('p', 'msg', ''), body = el('div');
    host.appendChild(style); host.appendChild(top); host.appendChild(msg); host.appendChild(body);

    async function load() {
      msg.textContent = 'Loading...'; body.textContent = '';
      if (!o.endpoint) { msg.textContent = 'No form address is set (FORMS_ENDPOINT).'; return; }
      try {
        const r = await fetch(o.endpoint + '?action=album-views&key=' + encodeURIComponent(o.key || ''), { redirect: 'follow' });
        const j = await r.json();
        if (!j || !j.ok) { msg.textContent = 'Could not read the numbers (check the admin key and that tools/album-views.gs is deployed).'; return; }
        const list = (j.albums || []).slice().sort(function (a, b) { return b.views - a.views; });
        if (!list.length) { msg.textContent = 'No views yet. They appear after visitors open an album.'; return; }
        const total = list.reduce(function (s, a) { return s + (Number(a.views) || 0); }, 0), max = Math.max.apply(null, list.map(function (a) { return Number(a.views) || 0; })) || 1;
        msg.textContent = total + ' views in total across ' + list.length + ' albums.';
        const t = el('table'), h = el('tr');
        ['Album', '', 'Views', 'Last viewed'].forEach(function (c) { h.appendChild(el('th', null, c)); });
        t.appendChild(h);
        list.forEach(function (a) {
          const tr = el('tr'), bw = el('td', 'bw'), bar = el('div', 'bar');
          bar.style.width = Math.max(2, Math.round((Number(a.views) || 0) / max * 100)) + '%';
          bw.appendChild(bar);
          tr.appendChild(el('td', null, a.album)); tr.appendChild(bw); tr.appendChild(el('td', 'n', String(a.views))); tr.appendChild(el('td', null, fmtDate(a.last)));
          t.appendChild(tr);
        });
        body.appendChild(t);
      } catch (e) { msg.textContent = 'Could not load the numbers. Check your connection and try Refresh.'; }
    }
    btn.addEventListener('click', load);
    load();
  }
  window.SSCPCAlbumViews = { mount: mount };
})();
