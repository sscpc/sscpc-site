/* Cinematic scroll intro -- home tab only (see router.js, which hides
   #intro entirely on every other tab so those jump straight to their
   content with no scrolling required).
   The section is pinned with plain CSS position:sticky (js/CSS only reads
   scroll position -- nothing hijacks the wheel/touch scroll itself, so it
   stays smooth and works exactly like normal scrolling). One progress value
   0..1 across the pinned height drives everything:
     0.00–0.34  big logo is live and pointer-reactive (viewfinder phase)
     0.20–0.55  logo defocuses out while the "SSCPC" signature draws in
     0.50–0.85  the two marquee rows slide up into view
     1.00       fully released -- normal page scrolls in underneath
   All of it is skipped for prefers-reduced-motion (the CSS shows a static
   final frame instead). */
(function () {
  const root = document.getElementById('intro');
  const stage = document.getElementById('introStage');
  if (!root || !stage) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const logo = document.getElementById('introLogo');
  const reticle = document.getElementById('introReticle');
  const spot = document.getElementById('introSpot');
  const sigPath = document.getElementById('introSigPath');
  const hint = document.getElementById('introHint');

  /* ---- helpers ---- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  /* Maps p from [a,b] to 0..1, clamped -- the building block for every phase below. */
  const band = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const ease = t => t * t * (3 - 2 * t); /* smoothstep, cheap and smooth */

  /* ---- signature draw-in setup ---- */
  let sigLen = 3000;
  try {
    sigLen = sigPath.getTotalLength();
    stage.style.setProperty('--siglen', sigLen);
    stage.style.setProperty('--sigoff', sigLen);
  } catch (e) { /* SVG not ready / unsupported -- keep the CSS fallback length */ }

  /* ---- scroll-progress loop ---- */
  let ticking = false;
  function update() {
    ticking = false;
    const rect = root.getBoundingClientRect();
    const total = root.offsetHeight - window.innerHeight;
    const p = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;

    /* logo: visible & sharp early, defocuses (blur+scale+fade) as sig draws in */
    const logoOut = ease(band(p, 0.20, 0.50));
    stage.style.setProperty('--lop', (1 - logoOut).toFixed(3));
    stage.style.setProperty('--lbl', (logoOut * 14).toFixed(2) + 'px');
    stage.style.setProperty('--lsc', (1 + logoOut * 0.22).toFixed(3));
    stage.style.setProperty('--glowop', (1 - logoOut).toFixed(3)); /* blue backdrop glow fades out with the logo */

    /* photo wall fades to black before the signature draws in, so the scroll story plays on the same black as before */
    stage.style.setProperty('--wop', (1 - ease(band(p, 0.10, 0.40))).toFixed(3));

    /* signature draws in, then holds solid */
    const sigIn = ease(band(p, 0.24, 0.55));
    stage.style.setProperty('--sigop', p < 0.22 ? 0 : 1);
    stage.style.setProperty('--sigoff', (sigLen * (1 - sigIn)).toFixed(1));

    /* marquee rows slide up and hold until release */
    const rowsIn = ease(band(p, 0.50, 0.85));
    stage.style.setProperty('--rowsop', rowsIn.toFixed(3));
    stage.style.setProperty('--rowsy', (22 - rowsIn * 22).toFixed(1) + 'px');

    /* menu-page labels, headline and button fade out first, then stop being clickable */
    const uiOut = ease(band(p, 0.04, 0.2));
    stage.style.setProperty('--uiop', (1 - uiOut).toFixed(3));
    const ui = document.getElementById('introUi');
    if (ui) ui.classList.toggle('is-off', uiOut >= 1);

    /* scroll hint disappears the moment you start */
    hint.style.setProperty('--hintop', p > 0.035 ? 0 : 1);

    /* pointer fx only matter while the logo is actually visible */
    const fxActive = p < 0.34;
    reticle.style.setProperty('--rtop', fxActive && pointerInside ? 1 : 0);
    root.classList.toggle('intro--fx', fxActive);

    /* the floating countdown badge stays hidden until this pinned intro
       has fully released -- only relevant while actually on the Home tab,
       since #intro is hidden outright on every other tab */
    const onHome = document.documentElement.classList.contains('on-home');
    document.documentElement.classList.toggle('intro-pinned', onHome && p < 0.98);
  }
  function requestUpdate() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  requestUpdate();
  /* the router adds .on-home a moment after load: re-check the moment it changes, so the hero's top bar
     is styled correctly from the first frame instead of only after the first scroll or mouse move */
  let wasHome = document.documentElement.classList.contains('on-home');
  new MutationObserver(() => {
    const h = document.documentElement.classList.contains('on-home');
    if (h !== wasHome) { wasHome = h; requestUpdate(); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('load', requestUpdate);

  /* ---- pointer-reactive viewfinder (desktop / any fine pointer) ---- */
  let pointerInside = false;
  let tx = 0, ty = 0, rx = 0, ry = 0;   /* reticle target/rendered offset */
  let ltx = 0, lty = 0, lrx = 0, lry = 0; /* logo tilt target/rendered */
  let fxRaf = null;

  function renderFx() {
    rx += (tx - rx) * 0.16; ry += (ty - ry) * 0.16;
    lrx += (ltx - lrx) * 0.12; lry += (lty - lry) * 0.12;
    reticle.style.setProperty('--rtx', rx.toFixed(1) + 'px');
    reticle.style.setProperty('--rty', ry.toFixed(1) + 'px');
    stage.style.setProperty('--lrx', lrx.toFixed(2) + 'deg');
    stage.style.setProperty('--lry', lry.toFixed(2) + 'deg');
    stage.style.setProperty('--shx', (36 - lry * 1.1).toFixed(1) + '%');   /* shine slides across the disc as it tilts */
    stage.style.setProperty('--shy', (28 - lrx * 1.1).toFixed(1) + '%');
    if (Math.abs(tx - rx) > 0.2 || Math.abs(ty - ry) > 0.2 || Math.abs(ltx - lrx) > 0.02 || Math.abs(lty - lry) > 0.02) {
      fxRaf = requestAnimationFrame(renderFx);
    } else fxRaf = null;
  }
  function wakeFx() { if (!fxRaf) fxRaf = requestAnimationFrame(renderFx); }

  stage.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    pointerInside = true;
    stage.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    stage.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    tx = (px - 0.5) * 60; ty = (py - 0.5) * 60;         /* reticle travel */
    ltx = (px - 0.5) * 2 * 22; lty = (0.5 - py) * 2 * 22; /* logo tilt, degrees */
    wakeFx();
    requestUpdate();
  });
  stage.addEventListener('pointerleave', e => {
    if (e.pointerType !== 'mouse') return;
    pointerInside = false;
    ltx = 0; lty = 0;
    wakeFx();
    requestUpdate();
  });

  /* ---- shutter snap: click/tap the logo while it's the active phase ---- */
  let snapping = false;
  stage.addEventListener('pointerdown', e => {
    const rectBox = root.getBoundingClientRect();
    const total = root.offsetHeight - window.innerHeight;
    const p = total > 0 ? clamp(-rectBox.top / total, 0, 1) : 0;
    if (p > 0.34 || snapping) return;
    snapping = true;
    if (e.pointerType !== 'mouse') { pointerInside = true; requestUpdate(); }
    reticle.classList.add('lock');
    stage.style.setProperty('--lsc', '0.9');
    setTimeout(() => { stage.style.setProperty('--lsc', (1).toString()); }, 90);
    setTimeout(() => {
      reticle.classList.remove('lock');
      snapping = false;
    }, 480);
  }, { passive: true });
})();
