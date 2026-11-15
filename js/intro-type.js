/* Home page, section under the opening scene ("Capture. Create. Inspire." + the welcome text).
   Plays by itself, once, over DURATION (5 seconds) as soon as the section comes into view:
     - the big "Capture. Create. Inspire." comes into focus word by word, then viewfinder corners lock around it
     - the two small paragraphs are typed out letter by letter, with a blinking caret
     - the closing line fades in last
   The full text stays in the page (hidden part), so wrapping never changes while it types.
   Skipped for visitors who prefer reduced motion (they just see the text).
   Tuning: DURATION = total time in ms; SEE = how much of the section must be on screen to start;
   the 0.xx numbers in render() set when each part runs inside the 5 seconds. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var sec = document.querySelector('section.intro');
  if (!sec) return;
  var motto = sec.querySelector('.motto');
  var words = motto ? Array.prototype.slice.call(motto.querySelectorAll('span')) : [];
  var paras = Array.prototype.slice.call(sec.querySelectorAll('.intro-text p:not(.closer)'));
  var closer = sec.querySelector('.intro-text .closer');
  var DURATION = 3600, SEE = 0.3;     /* 3.6 seconds; starts when 30% of the section is on screen */

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

    /* typed text: 0.26 -> 0.72 of the 3.6s (about 1.7s of typing, was 3.1s), paragraph after paragraph */
    var n = Math.round(clamp((p - 0.26) / 0.46) * total);
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
      var c = clamp((p - 0.74) / 0.16);
      closer.style.opacity = c.toFixed(3);
      closer.style.translate = '0 ' + ((1 - c) * 10).toFixed(1) + 'px';
    }
  }

  var started = false;
  function play() {
    if (started) return;
    started = true;
    var t0 = null;
    function frame(now) {
      if (t0 === null) t0 = now;
      var p = clamp((now - t0) / DURATION);
      render(p);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  render(0);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); play(); } });
    }, { threshold: SEE });
    io.observe(sec);
  } else {
    play();
  }
})();
