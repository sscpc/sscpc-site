/* "Letter burst" text effect (the one on vits.lk): a letter swells and a glass-drop bubble forms over it (see css/style.css "lbDropBubble"), then settles back.
   Where it runs on the home hero:
     - the headline "CAPTURE. CREATE. INSPIRE."  (hover or touch a letter; plus one wave when the page opens)
     - the big SSCPC signature that draws in while you scroll  (hover or touch a letter)
     - the KEEP FOCUSING / CAPTURE THE BEST rows  (hover or touch a letter)
   Nothing here changes the layout: letters are wrapped in inline-block spans and only transform / colour
   change. Skipped for visitors who prefer reduced motion.
   Tuning: 1.5s and the blue are in css/style.css (".lb.is-burst", "@keyframes lbBurst"); WAVE_DELAY / WAVE_STEP below. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const stage = document.getElementById('introStage');
  if (!stage) return;

  const WAVE_DELAY = 1500;   /* ms after load before the one-time wave on the headline */
  const WAVE_STEP = 55;      /* ms between letters in that wave */

  /* ---- 1. wrap each visible character of text elements in <span class="lb"> ---- */
  function wrap(el) {
    if (!el || el.dataset.lbDone) return;
    el.dataset.lbDone = '1';
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    if (el.getAttribute('aria-hidden') !== 'true') el.setAttribute('aria-label', label);
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          Array.from(n.nodeValue).forEach(ch => {
            if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(ch)); return; }
            const s = document.createElement('span');
            s.className = 'lb'; s.textContent = ch; s.setAttribute('aria-hidden', 'true');
            frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains('lb')) walk(n);
      });
    };
    walk(el);
  }
  wrap(stage.querySelector('.intro__title'));
  stage.querySelectorAll('.intro__row span').forEach(wrap);

  /* ---- 2. split the SSCPC signature into one path per letter (keeps the draw-in order) ---- */
  const sig = document.getElementById('introSigPath');
  if (sig && sig.ownerSVGElement) {
    try {
      const svg = sig.ownerSVGElement;
      const subs = sig.getAttribute('d').split(/(?=M)/).map(s => s.trim()).filter(Boolean);
      const total = sig.getTotalLength();
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', sig.getAttribute('transform') || '');
      svg.appendChild(g);
      /* bounding box by sampling the outline, so it also works while the hero is still display:none */
      const boxOf = p => {
        const L = p.getTotalLength(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (let i = 0; i <= 160; i++) { const pt = p.getPointAtLength(L * i / 160); x0 = Math.min(x0, pt.x); y0 = Math.min(y0, pt.y); x1 = Math.max(x1, pt.x); y1 = Math.max(y1, pt.y); }
        return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
      };
      const mk = d => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); g.appendChild(p); return p; };
      /* group sub-paths into letters: an inner outline (like the hole in the P) joins the letter it sits inside */
      const letters = [];
      subs.forEach(d => {
        const bb = boxOf(mk(d));
        const prev = letters[letters.length - 1];
        if (prev && bb.x >= prev.bb.x && bb.x + bb.width <= prev.bb.x + prev.bb.width && bb.y >= prev.bb.y && bb.y + bb.height <= prev.bb.y + prev.bb.height) prev.d += ' ' + d;
        else letters.push({ d, bb });
      });
      g.textContent = '';
      let start = 0;
      letters.forEach(l => {
        const p = mk(l.d);
        p.setAttribute('class', 'lb lbp');
        const len = p.getTotalLength();
        p.style.setProperty('--ps', start.toFixed(1));
        p.style.setProperty('--pl', len.toFixed(1));
        start += len;
      });
      /* the original single path is replaced by the five letter paths */
      sig.style.display = 'none';
      svg.dataset.lbTotal = total.toFixed(1);
    } catch (e) { /* keep the original signature if anything is unsupported */ }
  }

  /* ---- 3. trigger: hover or touch a letter ---- */
  /* SVG letters can't have a ::after, so a glass-drop circle is drawn over the letter instead */
  function sigBubble(el) {
    try {
      const svg = el.ownerSVGElement, g = el.parentNode, NS = 'http://www.w3.org/2000/svg';
      if (!svg.querySelector('#lbBubGrad')) {
        const defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS(NS, 'defs'), svg.firstChild);
        defs.insertAdjacentHTML('beforeend', '<radialGradient id="lbBubGrad" cx=".5" cy=".5" r=".5" fx=".3" fy=".74"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".08" stop-color="#fff" stop-opacity=".6"/><stop offset=".2" stop-color="#9bd6ff" stop-opacity=".1"/><stop offset="1" stop-color="#46a0eb" stop-opacity=".3"/></radialGradient>');
      }
      const b = el.getBBox(), c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', b.x + b.width / 2); c.setAttribute('cy', b.y + b.height / 2);
      c.setAttribute('r', Math.max(b.width, b.height) * 0.55);
      c.setAttribute('fill', 'url(#lbBubGrad)'); c.setAttribute('stroke', 'rgba(205,240,255,.55)'); c.setAttribute('stroke-width', '5');
      c.setAttribute('class', 'lbb');
      c.addEventListener('animationend', () => c.remove(), { once: true });
      g.appendChild(c);
    } catch (e) { /* no bubble if unsupported */ }
  }
  function burst(el) {
    if (!el || el.classList.contains('is-burst')) return;
    el.classList.add('is-burst');
    if (el.classList.contains('lbp')) sigBubble(el);
    el.addEventListener('animationend', () => el.classList.remove('is-burst'), { once: true });
  }
  const letterAt = e => e.target && e.target.closest ? e.target.closest('.lb') : null;
  stage.addEventListener('pointerover', e => { const l = letterAt(e); if (l) burst(l); });
  stage.addEventListener('pointerdown', e => {
    const l = letterAt(e) || (document.elementsFromPoint(e.clientX, e.clientY).find(x => x.classList && x.classList.contains('lb')));
    if (l) burst(l);
  }, { passive: true });
  /* finger dragging across the headline */
  stage.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') return;
    const l = document.elementsFromPoint(e.clientX, e.clientY).find(x => x.classList && x.classList.contains('lb'));
    if (l) burst(l);
  }, { passive: true });

  /* ---- 4. one wave across the headline when the page opens ---- */
  const wave = () => {
    stage.querySelectorAll('.intro__title .lb').forEach((l, i) => setTimeout(() => burst(l), i * WAVE_STEP));
  };
  const start = () => setTimeout(wave, WAVE_DELAY);
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
})();
