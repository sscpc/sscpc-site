/* Applies the editable site settings (SITE in js/data.js, edited in Admin > Site) to the page.
   - data-site="a.b"          -> the element's text becomes SITE.a.b
   - data-site-href="a.b"     -> the link goes to SITE.a.b (data-site-scheme="mailto:" or "tel:" adds the prefix)
   - data-site-map="href|embed" -> Google Maps link / embed built from SITE.contact.mapQuery
   If a value is missing or empty, the text already written in index.html stays, so nothing breaks. */
(function () {
  'use strict';
  var S = (typeof SITE !== 'undefined' && SITE) || {};
  var get = function (p) { return String(p).split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, S); };
  var str = function (v) { return typeof v === 'string' && v.trim() ? v.trim() : ''; };
  var tel = function (v) { var d = String(v).replace(/[^\d+]/g, ''); return d.charAt(0) === '0' ? '+94' + d.slice(1) : d; };
  var safe = function (u) { return /^(https?:\/\/|#|\/|mailto:|tel:)/i.test(u); };

  document.querySelectorAll('[data-site]').forEach(function (e) {
    var v = str(get(e.getAttribute('data-site')));
    if (v) e.textContent = v;
  });

  document.querySelectorAll('[data-site-href]').forEach(function (e) {
    var v = str(get(e.getAttribute('data-site-href'))), sc = e.getAttribute('data-site-scheme') || '';
    if (!v) return;
    var u = sc === 'tel:' ? 'tel:' + tel(v) : sc ? sc + v : v;
    if (safe(u)) e.setAttribute('href', u);
  });

  var q = str(get('contact.mapQuery'));
  if (q) document.querySelectorAll('[data-site-map]').forEach(function (e) {
    if (e.getAttribute('data-site-map') === 'embed') e.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&z=16&output=embed';
    else e.href = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q);
  });

  /* registration closed: hide the form and say so */
  var reg = S.registration, rs = document.getElementById('register');
  if (reg && reg.open === false && rs) {
    var form = rs.querySelector('.wrap > .info');
    if (form) {
      form.hidden = true;
      var p = document.createElement('p');
      p.className = 'lead site-reg-closed';
      p.setAttribute('role', 'status');
      p.textContent = str(reg.closedMessage) || 'Registration is now closed.';
      form.parentNode.insertBefore(p, form);
    }
    document.querySelectorAll('.nav-cta, .reg, .reg-m').forEach(function (e) { e.hidden = true; });
  }

  /* notice bar above the menu */
  var n = S.notice, nt = n && str(n.text);
  if (n && n.show === true && nt) {
    var bar = document.createElement('div');
    bar.className = 'site-notice';
    bar.setAttribute('role', 'status');
    var sp = document.createElement('span');
    sp.textContent = nt;
    bar.appendChild(sp);
    var lu = str(n.linkUrl);
    if (lu && safe(lu)) {
      var a = document.createElement('a');
      a.href = lu;
      a.textContent = str(n.linkLabel) || 'Learn more';
      if (/^https?:/i.test(lu)) { a.target = '_blank'; a.rel = 'noopener'; }
      bar.appendChild(a);
    }
    var nav = document.querySelector('nav.nav');
    if (nav) nav.parentNode.insertBefore(bar, nav);
  }
})();
