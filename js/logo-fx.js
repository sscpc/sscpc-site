/* Interactive nav logo.
   Desktop (fine pointer + real hover): the mark tilts toward the cursor like
   glass catching light, with a soft highlight that tracks the pointer.
   Touch: no hover to react to, so a tap plays a quick "shutter" snap instead
   -- a small nod to the shutter button on a camera. Both share one ambient
   glow (in CSS) so the logo is never fully static.
   Everything here is transform/opacity only (GPU-friendly), the tilt loop
   only runs while it's actually moving toward a target, and all of it is
   skipped for prefers-reduced-motion. */
(function () {
  const ico = document.getElementById('brand-ico');
  if (!ico) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) ico.classList.add('fx-fine');

  const MAX_TILT = 14;      /* degrees */
  let tx = 0, ty = 0;       /* target rotation */
  let rx = 0, ry = 0;       /* rendered (eased) rotation */
  let raf = null;

  function render() {
    /* Ease toward the target a little each frame -- smoother than snapping
       straight to the pointer, and settles (and stops the loop) once close
       enough that further motion would be imperceptible. */
    rx += (tx - rx) * 0.18;
    ry += (ty - ry) * 0.18;
    ico.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    ico.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    if (Math.abs(tx - rx) > 0.05 || Math.abs(ty - ry) > 0.05) {
      raf = requestAnimationFrame(render);
    } else {
      raf = null;
    }
  }
  function wake() { if (!raf) raf = requestAnimationFrame(render); }

  function updateTilt(clientX, clientY) {
    const r = ico.getBoundingClientRect();
    const px = (clientX - r.left) / r.width;   /* 0..1, can run outside while dragging */
    const py = (clientY - r.top) / r.height;
    /* Tilt toward the pointer: moving right tilts the top edge right, etc. */
    ty = (px - 0.5) * 2 * MAX_TILT;
    tx = (0.5 - py) * 2 * MAX_TILT;
    ico.style.setProperty('--gx', (Math.min(1, Math.max(0, px)) * 100).toFixed(1) + '%');
    ico.style.setProperty('--gy', (Math.min(1, Math.max(0, py)) * 100).toFixed(1) + '%');
  }
  function resetTilt() {
    tx = 0; ty = 0;
    ico.classList.remove('is-active');
    wake();
  }

  if (fine) {
    ico.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      updateTilt(e.clientX, e.clientY);
      ico.classList.add('is-active');
      wake();
    });
    ico.addEventListener('pointerleave', e => {
      if (e.pointerType !== 'mouse') return;
      resetTilt();
    });
  }

  /* Touch: since there's no hover, the tilt follows the finger only while
     it's down and sliding across the logo (pointer capture keeps it
     tracking smoothly even if the finger drifts just outside the icon). */
  let touchId = null;
  ico.addEventListener('pointermove', e => {
    if (e.pointerType !== 'touch' || e.pointerId !== touchId) return;
    updateTilt(e.clientX, e.clientY);
    ico.classList.add('is-active');
    wake();
  });
  function endTouch(e) {
    if (e.pointerType !== 'touch' || e.pointerId !== touchId) return;
    touchId = null;
    resetTilt();
  }
  ico.addEventListener('pointerup', endTouch);
  ico.addEventListener('pointercancel', endTouch);

  /* Shutter-snap: fires on tap/click, independent of the tilt above. */
  let snapping = false;
  ico.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') {
      touchId = e.pointerId;
      if (ico.setPointerCapture) ico.setPointerCapture(touchId);
      updateTilt(e.clientX, e.clientY);
      ico.classList.add('is-active');
      wake();
    }
    if (snapping) return;
    snapping = true;
    ico.classList.add('shutter');
    setTimeout(() => {
      ico.classList.remove('shutter');
      snapping = false;
    }, 440);
  }, { passive: true });
})();
