/* Home hero: tilted photo wall behind the hand, orb and text (effect "B" from the preview page).
   Photos come straight from ALBUMS in js/data.js, so new albums added in the admin portal
   show up here automatically. Nothing here reads the pointer; the wall just pans slowly.
   Tuning:
     WANT      how many different photos to pull in (the wall repeats them to fill its cells)
     CELLS     how many tiles the wall has (desktop / phone)
   Photo strength and tint are CSS: --ws and .intro__duo in css/style.css. */
(function () {
  const wall = document.getElementById('introWall');
  if (!wall || typeof ALBUMS === 'undefined' || !Array.isArray(ALBUMS)) return;

  const WANT = 24;
  const CELLS = window.matchMedia('(max-width:640px)').matches ? 40 : 70;

  /* ---- pick a spread of photos: every album's cover, then evenly spaced photos from each album ---- */
  function thumbOf(a, p) { return a.thumbs ? a.thumbs + String(p).split('/').pop() : p; }

  const covers = [], extras = [];
  ALBUMS.forEach(a => {
    if (!a) return;
    if (a.cover) covers.push({ src: a.cover });
    const ph = Array.isArray(a.photos) ? a.photos : [];
    /* bigger albums give more photos, but no album takes over the wall */
    const n = Math.min(6, Math.max(0, Math.round(Math.sqrt(ph.length) / 2)));
    for (let k = 0; k < n; k++) {
      const p = ph[Math.floor(((k + 0.5) / n) * ph.length)];
      if (p) extras.push({ src: thumbOf(a, p), full: p });
    }
  });

  /* interleave so neighbouring albums don't clump, then trim */
  const pool = [];
  const seen = new Set();
  covers.concat(extras).forEach(x => { if (!seen.has(x.src)) { seen.add(x.src); pool.push(x); } });
  /* deterministic shuffle: same wall on every visit, no layout surprises */
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const picks = pool.slice(0, WANT);
  if (!picks.length) return;

  /* ---- build the wall (after the page has settled so it never competes with the loader) ---- */
  function build() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < CELLS; i++) {
      /* stride by a prime so repeats land far apart */
      const pk = picks[(i * 7) % picks.length];
      const im = new Image();
      im.alt = '';
      im.decoding = 'async';
      im.draggable = false;
      im.className = 'iw-img';
      im.onload = () => im.classList.add('is-in');
      im.onerror = () => {
        /* thumb missing: fall back to the full photo once, otherwise drop the tile */
        if (pk.full && im.src.indexOf(pk.full) === -1) im.src = pk.full;
        else im.remove();
      };
      im.src = pk.src;
      frag.appendChild(im);
    }
    wall.appendChild(frag);
  }
  const go = () => (window.requestIdleCallback ? requestIdleCallback(build, { timeout: 1500 }) : setTimeout(build, 300));
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
})();
