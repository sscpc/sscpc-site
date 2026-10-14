/* SSCPC Learn section - "This week's challenge" changes by itself every Monday.
   The challenges below are used in order, one per week, and then start again from the top.
   - To add or change a challenge, edit the list (keep each as { title, text }).
   - To pin one challenge for a while (for example a Spectrum theme), set  PIN  to its number
     (1 = the first challenge), or to an object like { title: 'Spectrum', text: 'Shoot the theme.' }.
     Set PIN back to null to return to the weekly rotation.
   If this file does not load, the challenge written in index.html (id="learn-challenge") stays as it is. */
(function () {
  'use strict';
  const PIN = null;
  const BUILT_IN = [
    { title: 'Shadows', text: 'Find a strong shadow and make it the subject of your photo.' },
    { title: 'Leading lines', text: 'Use a road, fence or railing to lead the eye to your subject.' },
    { title: 'Reflections', text: 'Photograph a reflection in a window, puddle or glass of water.' },
    { title: 'Golden hour', text: 'Shoot one scene in the hour after sunrise or before sunset.' }
  ];
  /* The weekly challenges are kept in js/data.js (LEARN_CHALLENGES), one per line as "Title: what to do",
     and are edited in the admin portal under Learn. BUILT_IN is only used if that list is missing. */
  function fromData() {
    if (typeof LEARN_CHALLENGES === 'undefined' || !Array.isArray(LEARN_CHALLENGES)) return [];
    return LEARN_CHALLENGES.map(function (l) {
      const s = String(l).trim(), i = s.indexOf(':');
      return i > 0 ? { title: s.slice(0, i).trim(), text: s.slice(i + 1).trim() } : { title: s, text: '' };
    }).filter(function (c) { return c.title; });
  }
  const CHALLENGES = (function () { const c = fromData(); return c.length ? c : BUILT_IN; })();

  /* week number counted from a fixed Monday, so every visitor sees the same challenge in the same week */
  function weekIndex(now) {
    const monday0 = new Date(2024, 0, 1);              /* Monday 1 Jan 2024 */
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor(Math.round((d - monday0) / 86400000) / 7);
  }
  function pick(now) {
    if (PIN && typeof PIN === 'object') return PIN;
    if (typeof PIN === 'number' && CHALLENGES[PIN - 1]) return CHALLENGES[PIN - 1];
    return CHALLENGES[((weekIndex(now) % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length];
  }
  function show() {
    const box = document.getElementById('learn-challenge');
    if (!box) return;
    const c = pick(new Date()), p = box.querySelector('p');
    if (!c || !p) return;
    p.textContent = '';
    const b = document.createElement('b');
    b.textContent = c.title + '. ';
    p.appendChild(b);
    p.appendChild(document.createTextNode((c.text ? c.text + ' ' : '') + 'Send your best frame to the club.'));
  }

  /* ---------- lessons (kept in js/data.js as LEARN, edited in the admin portal under Learn) ----------
     Each topic: title, summary (two sentences, shown on the card), facts (list), tryIt, photos (list of { photo, caption }). */
  const LESSONS = (typeof LEARN !== 'undefined' && Array.isArray(LEARN)) ? LEARN : [];

  function make(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  /* ---------- photo viewer: tap a photo to see it large, with the caption and next / previous ---------- */
  let lb = null;
  function lightbox(list, start) {
    if (lb) return;
    let i = start;
    const box = make('div', 'lv'), img = make('img', 'lv-img'), cap = make('p', 'lv-cap'), count = make('span', 'lv-count');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Photo viewer');
    const btn = function (cls, label, txt, fn) { const b = make('button', 'lv-btn ' + cls, txt); b.type = 'button'; b.setAttribute('aria-label', label); b.addEventListener('click', function (e) { e.stopPropagation(); fn(); }); return b; };
    function draw() { img.src = list[i].src; img.alt = list[i].caption || ''; cap.textContent = list[i].caption || ''; count.textContent = list.length > 1 ? (i + 1) + ' / ' + list.length : ''; }
    function go(d) { i = (i + d + list.length) % list.length; draw(); }
    function close() { document.removeEventListener('keydown', key, true); box.remove(); lb = null; }
    function key(e) {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); }
      else if (list.length > 1 && e.key === 'ArrowRight') go(1);
      else if (list.length > 1 && e.key === 'ArrowLeft') go(-1);
    }
    box.appendChild(btn('lv-x', 'Close', '\u00d7', close));
    if (list.length > 1) { box.appendChild(btn('lv-prev', 'Previous photo', '\u2039', function () { go(-1); })); box.appendChild(btn('lv-next', 'Next photo', '\u203a', function () { go(1); })); }
    const fig = make('figure', 'lv-fig'); fig.appendChild(img); fig.appendChild(cap); fig.appendChild(count); box.appendChild(fig);
    box.addEventListener('click', close);
    fig.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('keydown', key, true);
    draw(); document.body.appendChild(box); lb = box;
    const x = box.querySelector('.lv-x'); if (x) x.focus();
  }
  /* Photos: on a PC, moving the cursor over a photo darkens it and shows its text (the caption set in the admin).
     On a phone or tablet, the first touch does the same and a second touch opens the large view. */
  const touchOnly = function () { return !!(window.matchMedia && window.matchMedia('(hover: none)').matches); };
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.ph-link')) return;
    document.querySelectorAll('.ph-link.on').forEach(function (x) { x.classList.remove('on'); });
  });
  function photoBlock(list) {
    const wrap = make('div', 'ph-grid');
    if (!list || !list.length) { wrap.appendChild(make('p', 'ph-soon', 'Photos coming soon')); return wrap; }
    list.forEach(function (p, n) {
      const fig = make('figure', 'ph-fig'), a = make('a', 'ph-link'), img = make('img');
      a.href = p.src; a.setAttribute('aria-label', 'View photo' + (p.caption ? ': ' + p.caption : ''));
      img.src = p.src; img.alt = p.caption || ''; img.loading = 'lazy'; img.decoding = 'async';
      a.appendChild(img);
      const ov = make('span', 'ph-ov');
      if (p.caption) ov.appendChild(make('span', 'ph-txt', p.caption));
      ov.appendChild(make('span', 'ph-hint', 'View larger'));
      a.appendChild(ov); fig.appendChild(a);
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (touchOnly() && !a.classList.contains('on')) {            /* first touch: darken + show the text */
          wrap.querySelectorAll('.ph-link.on').forEach(function (x) { x.classList.remove('on'); });
          a.classList.add('on'); return;
        }
        lightbox(list, n);                                            /* click on a PC, or second touch */
      });
      wrap.appendChild(fig);
    });
    return wrap;
  }
  /* ---------- topic cards (the list) ---------- */
  const pad = function (n) { return n < 10 ? '0' + n : String(n); };
  function summaryOf(l) { return (l.summary && String(l.summary).trim()) || (Array.isArray(l.facts) && l.facts[0]) || ''; }
  function photosOf(l) { return (Array.isArray(l.photos) ? l.photos : []).filter(function (p) { return p && p.photo; }).map(function (p) { return { src: p.photo, caption: p.caption }; }); }
  function renderList() {
    const grid = document.getElementById('learn-grid'); if (!grid || !LESSONS.length) return;
    grid.textContent = '';
    LESSONS.forEach(function (l, i) {
      const b = make('button', 'topic-card'); b.type = 'button'; b.setAttribute('data-topic', String(i));
      b.setAttribute('aria-label', 'Open lesson: ' + (l.title || 'Topic ' + (i + 1)));
      b.appendChild(make('span', 'tc-no', pad(i + 1)));
      b.appendChild(make('h3', 'tc-title', l.title || 'Topic ' + (i + 1)));
      b.appendChild(make('p', 'tc-sum', summaryOf(l)));
      const ph = photosOf(l).length, meta = [];
      if (ph) meta.push(ph + (ph === 1 ? ' photo' : ' photos'));
      if (meta.length) b.appendChild(make('span', 'tc-meta', meta.join('  ·  ')));
      b.appendChild(make('span', 'tc-go', 'Open lesson \u2192'));
      grid.appendChild(b);
    });
    const n = document.getElementById('learn-count');
    if (n) n.textContent = LESSONS.length + (LESSONS.length === 1 ? ' topic' : ' topics') + ' \u00b7 facts \u00b7 photos';
  }

  /* ---------- the separate section for one topic: summary, facts, try this, photos ---------- */
  function section(cls, heading) { const s = make('section', 'ld-sec ' + cls); s.appendChild(make('h3', 'ld-h', heading)); return s; }
  function renderDetail(root, i) {
    const l = LESSONS[i]; if (!l) return;
    root.textContent = '';
    const bar = make('div', 'ld-bar');
    const back = make('button', 'btn ghost', '\u2190 All topics'); back.type = 'button'; back.setAttribute('data-ld-back', '');
    bar.appendChild(back); bar.appendChild(make('span', 'ld-pos', 'Topic ' + (i + 1) + ' of ' + LESSONS.length));
    root.appendChild(bar);
    root.appendChild(make('span', 'ld-kicker', 'Topic ' + pad(i + 1)));
    const t = make('h2', 'ld-title', l.title || 'Topic ' + (i + 1)); t.id = 'learn-detail-title'; root.appendChild(t);
    const sm = summaryOf(l); if (sm) root.appendChild(make('p', 'ld-lead', sm));
    const facts = (Array.isArray(l.facts) ? l.facts : []).filter(Boolean);
    if (facts.length) {
      const s = section('ld-facts-sec', 'Key facts'), ol = make('ol', 'ld-facts');
      facts.forEach(function (f) { ol.appendChild(make('li', null, f)); });
      s.appendChild(ol); root.appendChild(s);
    }
    if (l.tryIt) {
      const s = make('section', 'ld-sec ld-try'); s.appendChild(make('h3', 'ld-h', 'Try this'));
      s.appendChild(make('p', null, String(l.tryIt).charAt(0).toUpperCase() + String(l.tryIt).slice(1))); root.appendChild(s);
    }
    const ph = photosOf(l);
    if (ph.length) { const s = section('ld-photos', 'Photos'); s.appendChild(photoBlock(ph)); root.appendChild(s); }
    if (LESSONS.length > 1) {
      const nav = make('nav', 'ld-nav'); nav.setAttribute('aria-label', 'Other topics');
      const mk = function (d, label, name) { const b = make('button', 'ld-step', null); b.type = 'button'; b.setAttribute('data-ld-go', String(d));
        b.appendChild(make('small', null, label)); b.appendChild(make('b', null, name)); return b; };
      const pi = (i - 1 + LESSONS.length) % LESSONS.length, ni = (i + 1) % LESSONS.length;
      nav.appendChild(mk(pi, '\u2190 Previous topic', LESSONS[pi].title || 'Topic ' + (pi + 1)));
      nav.appendChild(mk(ni, 'Next topic \u2192', LESSONS[ni].title || 'Topic ' + (ni + 1)));
      root.appendChild(nav);
    }
  }

  window.SSCPCLearn = { pick: pick, weekIndex: weekIndex, lessons: LESSONS };
  /* ---------- the Learn hub: a list of topic cards, and a separate section for each topic ----------
     It opens over the site (no menu router). History is used so the phone's Back button goes
     detail -> topics -> site. */
  function hubInit() {
    const hub = document.getElementById('learn-hub'), openBtn = document.getElementById('learn-open'),
      list = document.getElementById('learn-list'), det = document.getElementById('learn-detail');
    if (!hub || !openBtn || !list || !det) return;
    let opener = null, scrollY = 0, hideT = 0, cur = -1;
    const isOpen = function () { return hub.classList.contains('is-in'); };
    const replay = function (el) { el.classList.remove('pane-in'); void el.offsetWidth; el.classList.add('pane-in'); };
    function showList() { cur = -1; det.hidden = true; det.textContent = ''; list.hidden = false; replay(list); hub.scrollTop = 0; }
    function showLesson(i) { if (!LESSONS[i]) { showList(); return; } cur = i; list.hidden = true; renderDetail(det, i); det.hidden = false; replay(det); hub.scrollTop = 0; const b = det.querySelector('[data-ld-back]'); if (b) b.focus({ preventScroll: true }); }
    function open() {
      clearTimeout(hideT);
      if (isOpen()) return;
      opener = document.activeElement; scrollY = window.pageYOffset;
      showList();
      hub.hidden = false; hub.scrollTop = 0; document.body.classList.add('learn-lock');
      void hub.offsetWidth;                              /* let the browser see the start position, then slide up */
      hub.classList.add('is-in');
      try { history.pushState({ learnHub: 1 }, ''); } catch (e) { /* history unavailable: the Back buttons still work */ }
      const b = list.querySelector('[data-learn-close]'); if (b) b.focus({ preventScroll: true });
    }
    function hide() {
      if (hub.hidden || !isOpen()) return;
      hub.classList.remove('is-in'); document.body.classList.remove('learn-lock');
      window.scrollTo(0, scrollY);                       /* back to where the visitor was, not the top */
      clearTimeout(hideT); hideT = setTimeout(function () { if (!isOpen()) { hub.hidden = true; showList(); } }, 520);
      if (opener && opener.focus) try { opener.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    const inDetail = function () { return !!(history.state && history.state.learnHub && history.state.lesson != null); };
    function toLesson(i) { showLesson(i); try { history.pushState({ learnHub: 1, lesson: i }, ''); } catch (e) { /* ignore */ } }
    function stepLesson(i) { showLesson(i); try { history.replaceState({ learnHub: 1, lesson: i }, ''); } catch (e) { /* ignore */ } }
    function toList() { if (inDetail()) history.back(); else showList(); }
    function close() { if (cur >= 0) { toList(); return; } if (history.state && history.state.learnHub) history.back(); else hide(); }
    openBtn.addEventListener('click', open);
    list.addEventListener('click', function (e) {
      const c = e.target.closest && e.target.closest('[data-topic]'); if (c) { toLesson(parseInt(c.getAttribute('data-topic'), 10)); return; }
      if (e.target.closest && e.target.closest('[data-learn-close]')) close();
    });
    det.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-ld-back]')) { toList(); return; }
      const g = e.target.closest && e.target.closest('[data-ld-go]'); if (g) stepLesson(parseInt(g.getAttribute('data-ld-go'), 10));
    });
    window.addEventListener('popstate', function () {
      const st = history.state;
      if (st && st.learnHub) { if (!isOpen()) return; if (st.lesson != null) showLesson(st.lesson); else showList(); } else hide();
    });
    window.addEventListener('hashchange', hide);          /* a link inside (e.g. the gallery) leaves the Learn hub */
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) close(); });
    hub.addEventListener('click', function (e) { const a = e.target.closest && e.target.closest('a[href^="#"]'); if (a) hide(); });
    if (location.hash === '#learn-hub') history.replaceState(null, '', location.pathname + location.search);
  }
  function start() { show(); renderList(); hubInit(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
