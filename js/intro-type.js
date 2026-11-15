/* Home page, section under the opening scene ("Capture. Create. Inspire." + the welcome text).
   Everything here is driven by SCROLL, so it plays as you scroll down and rewinds as you scroll back up:
     - the big "Capture. Create. Inspire." comes into focus word by word, then viewfinder corners lock around it
     - the two small paragraphs are typed out letter by letter as you scroll, with a blinking caret
     - the closing line fades in last
   The full text stays in the page (hidden part), so wrapping never changes while it types.
   Skipped for visitors who prefer reduced motion (they just see the text).
   Tuning: RANGE = how much scrolling it takes (share of the screen height); the 0.xx numbers in render() set when each part runs. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var sec = document.querySelector('section.intro');
  if (!sec) return;
  var motto = sec.querySelector('.motto');
  var words = motto ? Array.prototype.slice.call(motto.querySelectorAll('span')) : [];
  var paras = Array.prototype.slice.call(sec.querySelectorAll('.intro-text p:not(.closer)'));
  var closer = sec.querySelector('.intro-text .closer');
  var START = 0.95, RANGE = 0.7;      /* starts when the section top is at 95% of the screen height, ends 0.7 screens later */

  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; e.setAttribute('aria-hidden', 'true'); return e; }
  var items = paras.map(function (p) {
    var full = p.textContent.replace(/\s+/g, ' ').trim();
    p.setAttribute('aria-label', full);
    p.textContent = '';
    p.classList.add('tw');
    var v = el('span', 'tw-v'), caret = el('i', 'tw-caret'), r = el('span', 'tw-r');
    r.textContent = full;
    p.appendChild(v); p.appendChild(caret); p.appendChild(r);
    return { v: v, r: r, caret: caret, full: full };
  });
  var total = items.reduce(function (s, it) { return s + it.full.length; }, 0);

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(x) { return 1 - Math.pow(1 - x, 3); }
  var lastN = -1;

  function render(p) {
    /* headline: each word pulled into focus (0.02 -> 0.5), then the corners lock on */
    words.forEach(function (w, i) {
      var f = ease(clamp((p - 0.02 - i * 0.1) / 0.2));
      w.style.opacity = f.toFixed(3);
      w.style.filter = f < 1 ? 'blur(' + ((1 - f) * 14).toFixed(1) + 'px)' : 'none';
      w.style.scale = (1 + (1 - f) * 0.08).toFixed(3);
    });
    if (motto) motto.style.setProperty('--lock', ease(clamp((p - 0.34) / 0.14)).toFixed(3));

    /* typed text: 0.30 -> 0.92 of the scroll, paragraph after paragraph */
    var n = Math.round(clamp((p - 0.30) / 0.62) * total);
    if (n !== lastN) {
      lastN = n;
      var left = n, active = -1;
      items.forEach(function (it, idx) {
        var k = Math.max(0, Math.min(it.full.length, left));
        left -= it.full.length;
        it.v.textContent = it.full.slice(0, k);
        it.r.textContent = it.full.slice(k);
        if (active < 0 && k > 0 && k < it.full.length) active = idx;
      });
      items.forEach(function (it, idx) { it.caret.classList.toggle('on', idx === active); });
    }

    if (closer) {
      var c = clamp((p - 0.9) / 0.1);
      closer.style.opacity = c.toFixed(3);
      closer.style.translate = '0 ' + ((1 - c) * 10).toFixed(1) + 'px';
    }
  }

  var ticking = false;
  function update() {
    ticking = false;
    var r = sec.getBoundingClientRect();
    if (!r.height) return;                       /* another tab of the site is showing */
    var vh = window.innerHeight || document.documentElement.clientHeight;
    render(clamp((vh * START - r.top) / (vh * RANGE)));
  }
  function ask() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  render(0);
  window.addEventListener('scroll', ask, { passive: true });
  window.addEventListener('resize', ask);
  window.addEventListener('hashchange', function () { setTimeout(ask, 60); setTimeout(ask, 400); });
  window.addEventListener('pageshow', ask);
  setTimeout(ask, 50); setTimeout(ask, 800);
})();
