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
     Each lesson: title, points (list), tryIt, videoTitle, videoUrl, videoLength, videoBy, photos (list of { photo, caption }).
     videoUrl: a YouTube link plays on the page (privacy-friendly player, loads only on press); any other link shows a Watch button;
     empty shows "Coming soon". */
  const LESSONS = (typeof LEARN !== 'undefined' && Array.isArray(LEARN)) ? LEARN : [];

  function ytId(u) {
    const m = String(u).match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  }
  function make(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function playIcon() {
    const ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); p.setAttribute('d', 'M8 5v14l11-7z'); s.appendChild(p); return s;
  }
  function videoBlock(v) {
    const art = make('div', 'vid-card'), media = make('div', 'vid-media'), url = String(v.url || '').trim();
    const id = ytId(url), isFile = /\.(mp4|webm)(\?.*)?$/i.test(url);
    const meta = [v.length, v.by].filter(Boolean).join('  ·  ');
    if (id) { /* YouTube: a still picture with a play button; the player loads only on click */
      const b = make('button', 'vid-play'); b.type = 'button'; b.setAttribute('aria-label', 'Play video: ' + v.title);
      const img = make('img'); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
      img.addEventListener('error', function () { img.remove(); }); /* no picture? the dark card and play button remain */
      b.appendChild(img); b.appendChild(playIcon()); media.appendChild(b);
      b.addEventListener('click', function () {
        const f = make('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
        f.title = v.title; f.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin';
        media.textContent = ''; media.appendChild(f);
      });
    } else if (isFile) {
      const vd = make('video'); vd.controls = true; vd.preload = 'none'; vd.playsInline = true; vd.src = url; if (v.poster) vd.poster = v.poster; vd.setAttribute('aria-label', v.title);
      media.appendChild(vd);
    } else if (url) {
      const a = make('a', 'vid-play vid-out'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('aria-label', 'Watch: ' + v.title);
      a.appendChild(playIcon()); a.appendChild(make('span', null, 'Watch')); media.appendChild(a);
    } else {
      const soon = make('div', 'vid-soon'); soon.appendChild(playIcon()); soon.appendChild(make('span', null, 'Coming soon')); media.appendChild(soon);
    }
    art.appendChild(media);
    art.appendChild(make('h4', 'vid-title', v.title));
    if (meta) art.appendChild(make('p', 'vid-meta', meta));
    return art;
  }
  function photoBlock(list) {
    const wrap = make('div', 'ph-grid');
    if (!list || !list.length) { wrap.appendChild(make('p', 'ph-soon', 'Photos coming soon')); return wrap; }
    list.forEach(function (p) {
      const fig = make('figure', 'ph-fig'), a = make('a'), img = make('img');
      a.href = p.src; a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('aria-label', 'Open photo' + (p.caption ? ': ' + p.caption : ''));
      img.src = p.src; img.alt = p.caption || ''; img.loading = 'lazy'; img.decoding = 'async';
      a.appendChild(img); fig.appendChild(a);
      if (p.caption) fig.appendChild(make('figcaption', null, p.caption));
      wrap.appendChild(fig);
    });
    return wrap;
  }
  function lessonCard(l, i) {
    const art = make('article', 'hd-card learn-card');
    art.appendChild(make('span', 'learn-no', String(i + 1))).setAttribute('aria-hidden', 'true');
    art.appendChild(make('h3', null, l.title || 'Lesson ' + (i + 1)));
    const pts = Array.isArray(l.points) ? l.points.filter(Boolean) : [];
    if (pts.length) { const ul = make('ul', 'learn-pts'); pts.forEach(function (t) { ul.appendChild(make('li', null, t)); }); art.appendChild(ul); }
    if (l.tryIt) { const p = make('p', 'learn-try'); p.appendChild(make('b', null, 'Try this: ')); p.appendChild(document.createTextNode(l.tryIt)); art.appendChild(p); }
    const slot = make('div', 'lesson-media');
    slot.appendChild(make('h4', 'media-h', 'Video'));
    slot.appendChild(videoBlock({ title: l.videoTitle || l.title || 'Video', url: l.videoUrl, length: l.videoLength, by: l.videoBy }));
    slot.appendChild(make('h4', 'media-h', 'Photos'));
    slot.appendChild(photoBlock((Array.isArray(l.photos) ? l.photos : []).filter(function (p) { return p && p.photo; }).map(function (p) { return { src: p.photo, caption: p.caption }; })));
    art.appendChild(slot);
    return art;
  }
  function showMedia() {
    const grid = document.getElementById('learn-grid'); if (!grid || !LESSONS.length) return;
    grid.textContent = '';
    LESSONS.forEach(function (l, i) { grid.appendChild(lessonCard(l, i)); });
    const n = document.getElementById('learn-count');
    if (n) n.textContent = LESSONS.length + (LESSONS.length === 1 ? ' lesson' : ' lessons') + ' · photos · videos';
  }

  window.SSCPCLearn = { pick: pick, weekIndex: weekIndex, ytId: ytId, lessons: LESSONS };
  /* ---------- lessons page (opens over the site; does not use the menu router) ---------- */
  function hubInit() {
    const hub = document.getElementById('learn-hub'), openBtn = document.getElementById('learn-open');
    if (!hub || !openBtn) return;
    let opener = null, scrollY = 0, hideT = 0;
    function open() {
      clearTimeout(hideT);
      if (hub.classList.contains('is-in')) return;
      opener = document.activeElement; scrollY = window.pageYOffset;
      hub.hidden = false; hub.scrollTop = 0; document.body.classList.add('learn-lock');
      void hub.offsetWidth;                              /* let the browser see the start position, then slide up */
      hub.classList.add('is-in');
      try { history.pushState({ learnHub: 1 }, ''); } catch (e) { /* history unavailable: Back button still works */ }
      const b = hub.querySelector('[data-learn-close]'); if (b) b.focus();
    }
    function hide() {
      if (hub.hidden || !hub.classList.contains('is-in')) return;
      hub.classList.remove('is-in'); document.body.classList.remove('learn-lock');
      window.scrollTo(0, scrollY);                       /* back to where the visitor was, not the top */
      clearTimeout(hideT); hideT = setTimeout(function () { if (!hub.classList.contains('is-in')) hub.hidden = true; }, 520);
      if (opener && opener.focus) try { opener.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    function close() { if (history.state && history.state.learnHub) history.back(); else hide(); }
    openBtn.addEventListener('click', open);
    hub.querySelectorAll('[data-learn-close]').forEach(function (b) { b.addEventListener('click', close); });
    window.addEventListener('popstate', function () { if (!(history.state && history.state.learnHub)) hide(); });
    window.addEventListener('hashchange', hide);          /* a link inside (e.g. the gallery) leaves the lessons page */
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && hub.classList.contains('is-in')) close(); });
    hub.addEventListener('click', function (e) { const a = e.target.closest && e.target.closest('a[href^="#"]'); if (a) hide(); });
    if (location.hash === '#learn-hub') history.replaceState(null, '', location.pathname + location.search);
  }
  function start() { show(); showMedia(); hubInit(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
