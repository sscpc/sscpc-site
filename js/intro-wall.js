/* Home hero: tilted wall of photo rows behind the hand, orb and text.
   - Rows slide in opposite directions (row 1 right, row 2 left, row 3 right ...).
   - Photos are shuffled on every visit, from the album photos (js/data.js) and the About page photos.
   - Cursor: a "developing lens" follows the pointer and shows the photos in true colour (the dim blue
     wash opens up inside it), and the rows speed up the further the cursor is from the middle of the screen.
   Tuning (all at the top of this file):
     SPEED      pixels per second the rows slide at rest
     BOOST      extra speed when the cursor is at the far left or right (1 = doubles the speed)
     LENS       lens radius in pixels (desktop / phone)
     (the number of rows and photos is worked out from the screen size, so the wall always fills it)
   Photo strength and tint are CSS: --ws and .intro__duo in css/style.css. */
(function () {
  const wall = document.getElementById('introWall');
  const stage = document.getElementById('introStage');
  if (!wall || !stage) return;

  const SPEED = 24;
  const BOOST = 1.6;
  const small = window.matchMedia('(max-width:640px)').matches;
  const LENS = small ? 80 : 130;
  const WANT_ALBUM = 26;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const thumbOf = (a, p) => a.thumbs ? a.thumbs + String(p).split('/').pop() : p;

  /* ---- photo pool: album covers + spread of album photos + every About page photo ---- */
  function collect() {
    const album = [], seen = new Set();
    const add = (list, src, full) => { if (src && !seen.has(src)) { seen.add(src); list.push({ src, full }); } };
    if (typeof ALBUMS !== 'undefined' && Array.isArray(ALBUMS)) {
      const covers = [], extras = [];
      ALBUMS.forEach(a => {
        if (!a) return;
        add(covers, a.cover);
        const ph = Array.isArray(a.photos) ? a.photos : [];
        const n = Math.min(6, Math.round(Math.sqrt(ph.length) / 2));
        for (let k = 0; k < n; k++) {
          const p = ph[Math.floor(((k + 0.5) / n) * ph.length)];
          add(extras, thumbOf(a, p), p);
        }
      });
      shuffle(covers.concat(extras)).slice(0, WANT_ALBUM).forEach(x => album.push(x));
    }
    const about = [], seenAbout = new Set();
    document.querySelectorAll('img[src*="images/about/"]').forEach(im => {
      const s = im.getAttribute('src');
      if (s && !seenAbout.has(s) && !seen.has(s)) { seenAbout.add(s); about.push({ src: s }); }
    });
    return shuffle(album.concat(about));
  }

  /* one row's photo order: n photos from fresh shuffles, no photo next to itself, seam of the loop included */
  function rowOrder(pool, n, prevFirst) {
    let o = [];
    while (o.length < n) o = o.concat(shuffle(pool.slice()));
    o = o.slice(0, n);
    for (let i = 1; i <= n; i++) {
      const a = o[i - 1], b = o[i % n];
      if (a === b && n > 2) { const k = (i + 2) % n; [o[i % n], o[k]] = [o[k], o[i % n]]; }
    }
    if (o[0] === prevFirst && n > 1) o.push(o.shift());
    return o;
  }

  let rows = [];
  function build() {
    const pool = collect();
    if (pool.length < 4) return;
    wall.textContent = ''; rows = [];

    /* measure one tile so the wall can be sized to the screen */
    const probe = new Image(); probe.className = 'iw-img'; probe.alt = '';
    const probeRow = document.createElement('div'); probeRow.className = 'iw-row'; probeRow.appendChild(probe); wall.appendChild(probeRow);
    const th = probe.offsetHeight || 130, gap = parseFloat(getComputedStyle(probeRow).columnGap) || 10;
    const tile = th * 4 / 3 + gap;
    wall.textContent = '';
    const b = stage.getBoundingClientRect();
    const rowCount = Math.ceil((b.height * 0.97 + b.width * 0.25) / (th + gap)) + 1;
    const n = Math.ceil(wall.clientWidth / tile) + 1;          /* photos per half-row: one half is always wider than the wall */

    const frag = document.createDocumentFragment();
    let prev = null;
    for (let r = 0; r < rowCount; r++) {
      const row = document.createElement('div');
      row.className = 'iw-row';
      const order = rowOrder(pool, n, prev); prev = order[0];
      for (let pass = 0; pass < 2; pass++) {
        order.forEach(pk => {
          const im = new Image();
          im.alt = ''; im.decoding = 'async'; im.draggable = false; im.className = 'iw-img';
          im.onload = () => im.classList.add('is-in');
          im.onerror = () => { if (pk.full && im.src.indexOf(pk.full) === -1) im.src = pk.full; else im.style.visibility = 'hidden'; };
          im.src = pk.src;
          row.appendChild(im);
        });
      }
      frag.appendChild(row);
      /* even rows slide right, odd rows slide left; each starts at a different point so rows don't line up */
      rows.push({ el: row, dir: r % 2 ? -1 : 1, x: 0, half: 0, seed: Math.random() });
    }
    wall.appendChild(frag);
    rows.forEach(r => { r.half = r.el.scrollWidth / 2; r.x = -r.seed * r.half; });
    paintRows();
    if (!ticking && !reduceMotion) { ticking = true; requestAnimationFrame(tick); }
  }
  let ticking = false;

  function paintRows() {
    rows.forEach(r => {
      if (!r.half) r.half = r.el.scrollWidth / 2;
      if (r.half) { while (r.x <= -r.half) r.x += r.half; while (r.x > 0) r.x -= r.half; }
      r.el.style.transform = 'translate3d(' + r.x.toFixed(1) + 'px,0,0)';
    });
  }

  /* ---- cursor: lens + speed boost ---- */
  let tx = -999, ty = -999, lx = -999, ly = -999;   /* target / smoothed lens position (px in the stage) */
  let tr = 0, lr = 0;                               /* target / smoothed lens radius */
  let mx = 0.5, boost = 0;                          /* cursor x (0..1) and smoothed speed boost */
  let inside = false;
  const root = document.documentElement;

  function point(e) {
    const b = stage.getBoundingClientRect();
    tx = e.clientX - b.left; ty = e.clientY - b.top;
    mx = Math.min(1, Math.max(0, tx / b.width));
    if (!inside) { lx = tx; ly = ty; }              /* first contact: open right where the cursor is */
    inside = true; tr = LENS;
  }
  stage.addEventListener('pointerdown', point, { passive: true });
  stage.addEventListener('pointermove', point, { passive: true });
  function leave(e) { if (e.type === 'pointerup' && e.pointerType === 'mouse') return; inside = false; tr = 0; }
  stage.addEventListener('pointerleave', leave, { passive: true });
  stage.addEventListener('pointerup', leave, { passive: true });
  stage.addEventListener('pointercancel', leave, { passive: true });

  let last = 0;
  function tick(t) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    /* only work while the hero is on screen */
    if (!root.classList.contains('intro-pinned') || document.hidden) return;
    if (parseFloat(stage.style.getPropertyValue('--wop')) <= 0.01) return;   /* wall has faded out while scrolling: stop work */

    const wantBoost = inside ? Math.abs(mx - 0.5) * 2 * BOOST : 0;
    boost += (wantBoost - boost) * Math.min(1, dt * 3);
    const v = SPEED * (1 + boost);
    rows.forEach(r => { r.x += r.dir * v * dt; });
    paintRows();

    lx += (tx - lx) * Math.min(1, dt * 9);
    ly += (ty - ly) * Math.min(1, dt * 9);
    lr += (tr - lr) * Math.min(1, dt * (tr > lr ? 7 : 5));
    const r = Math.max(1, lr);
    stage.style.setProperty('--lx', lx.toFixed(1) + 'px');
    stage.style.setProperty('--ly', ly.toFixed(1) + 'px');
    stage.style.setProperty('--lr', r.toFixed(1) + 'px');
    stage.style.setProperty('--lo', Math.min(1, lr / LENS).toFixed(3));
  }

  let rz = 0, lastW = window.innerWidth, lastH = window.innerHeight;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      /* ignore the phone address bar growing and shrinking; rebuild when the size really changes */
      if (Math.abs(innerWidth - lastW) > 80 || Math.abs(innerHeight - lastH) > 160) { lastW = innerWidth; lastH = innerHeight; build(); }
    }, 400);
  });

  const go = () => (window.requestIdleCallback ? requestIdleCallback(build, { timeout: 1500 }) : setTimeout(build, 300));
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
})();
