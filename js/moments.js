/* About page: "Moments We've Captured" continuously gliding photo row.
   ------------------------------------------------------------------
   HOW TO ADD PHOTOS: put the image files in  images/about/moments/
   and add one line per photo to PHOTOS below:  ['file-name.jpg', 'short description'],
   (the description is used as alt text; it can be left as '' if you prefer).
   Tip: resize photos to about 900px wide first so the page stays fast.

   HOW IT BEHAVES
   - The row glides smoothly and non-stop from right to left (no stop-and-go),
     at a speed of one photo every SECONDS_PER_PHOTO seconds, and loops forever.
   - Desktop shows 4 photos at a time, tablets 3, phones 2 (set in CSS).
   - Hover a photo (or tap it on a phone) and it pops up; the photos beside it
     slide aside so the gaps stay the same. The glide eases to a stop while a
     photo is popped and eases back up to speed when it is released.
   - Visitors can still scroll / swipe / use the scrollbar at any time; the
     glide pauses while they do and resumes a few seconds later.
   - Only glides while the row is on screen. Skipped for visitors who have
     "reduce motion" turned on (they can still scroll by hand). */
(function () {
  var DIR = 'images/about/moments/';
  var PHOTOS = [
    ['moment-violinist.jpg',   'Violinist performing at Swara Ranjana'],
    ['moment-vocalist-2.jpg',  'Vocalist performing at Swara Ranjana'],
    ['moment-band-parade.jpg', 'Cadet band marching at the Annual Prize Giving'],
    ['moment-ceremony.jpg',    'Felicitation ceremony with traditional drummers'],
    ['moment-meliora.jpg',     'Meliora inter-school English day competition entries'],
    ['moment-kids-prayer.jpg', 'Junior students at a school observance'],
    ['moment-dance-stage.jpg', 'Kandyan dance performance on stage'],
    ['moment-drama-umbrella.jpg',        'Actors under a ceremonial umbrella in a stage drama'],
    ['moment-poson-flower-tray.jpg',     'Boy carrying a tray of flowers at the Poson procession'],
    ['moment-rugby-anthem.jpg',          'Rugby team standing for the anthem at the P.M.L. Banda & B. Nillegoda Memorial Trophy'],
    ['moment-poson-lotus-procession.jpg','Young students carrying lotus flowers in the Poson procession'],
    ['moment-one-day-encounter.jpg',     'Bowler in action at the 37th One Day Encounter'],
    ['moment-poson-alms-giving.jpg',     'Students and monks at the Poson alms giving'],
    ['moment-rugby-lineout.jpg',         'Rugby lineout at the P.M.L. Banda & B. Nillegoda Memorial Trophy'],
    ['moment-avurudu-pillow-fight.jpg',  'Pillow fight on the greasy pole at the Avurudu celebrations'],
    ['moment-soccer-celebration.jpg',    'Goal celebration at the Vesters\' Soccer Carnival'],
    ['moment-kandyan-dance-troupe.jpg',  'Kandyan dance troupe performing on stage'],
    ['moment-poson-decorations.jpg',     'Poson decorations and statues in the school courtyard'],
    ['moment-avurudu-balloon-race.jpg',  'Students blowing up balloons in an Avurudu game'],
    ['moment-poson-street-procession.jpg','Students and monks in the Poson street procession'],
    ['moment-poson-prayer.jpg',          'Devotees praying at the Poson observance'],
    ['moment-drama-king.jpg',            'Actor as a king in a stage drama'],
    ['moment-stage-singer-bw.jpg',       'Student singing on stage among performers in batik shirts'],
    ['moment-swarna-panhida-dancer.jpg', 'Dancer smiling on stage at Swarna Panhida'],
    ['moment-junior-scouts-oath.jpg',    'Junior scout saluting during the swearing-in of medals'],
    ['moment-paradigma-performance.jpg', 'Performers in white robes and sunglasses at Paradigma \'26'],
    ['moment-drum-dance-boys.jpg',       'Boys drumming and dancing on stage'],
    ['moment-swarna-panhida-stage.jpg',  'The stage set for Swarna Panhida, the inter-school bilingual media day'],
    ['moment-paradigma-booklets.jpg',    'Paradigma \'26 booklets on a checked cloth'],
    ['moment-swara-ranjana-finale.jpg',  'Performers celebrating together at the Swara Ranjana finale'],
    ['moment-battle-of-babes-cricketer.jpg', 'Batsman celebrating at the 65th Battle of the Babes'],
    ['moment-kalei-vizhal-nadaswaram.jpg', 'Nadaswaram player leading a procession at Kalei Vizhal \'25'],
    ['moment-swara-ranjana-singer-smile.jpg', 'Singer smiling on stage at Swara Ranjana \'24'],
    ['moment-hisawes-dancer.jpg', 'Kandyan dancer with hands raised in salutation at the Hisawes Thabeema Kalaeli Mangalyaya \'24'],
    ['moment-sankranthi-masked-dancer.jpg', 'Masked dancer in a yellow costume at Sankranthi \'25'],
    ['moment-inter-house-rifles.jpg', 'Cadets kneeling with raised rifles at the Annual Inter House Sports Meet \'24'],
    ['moment-kalei-vizhal-scarf-dance.jpg', 'Young boys dancing with red scarves at Kalei Vizhal \'25'],
    ['moment-swara-ranjana-violin.jpg', 'Violinist performing with the orchestra at Swara Ranjana \'24'],
    ['moment-founders-day-statue.jpg', 'Statue of the founder at Founder\'s Day \'22'],
    ['moment-sankranthi-wig-actor.jpg', 'Actor in a colourful wig and costume at Sankranthi \'25'],
    ['moment-an-noor-students.jpg', 'Students in white robes and headscarves at An-Noor \'25'],
    ['moment-hisawes-drummer.jpg', 'Kandyan drummer performing at the Hisawes Thabeema Kalaeli Mangalyaya \'24'],
    ['moment-kalei-vizhal-tray-boys.jpg', 'Two students in traditional attire holding a ceremonial tray at Kalei Vizhal \'25'],
    ['moment-swara-ranjana-singer-shades.jpg', 'Singer in sunglasses performing at Swara Ranjana \'24'],
    ['moment-avionics-desk.jpg', 'Two students at a table with a laptop and papers at Avionics \'25'],
    ['moment-hisawes-bowing-troupe.jpg', 'Kandyan dancers bowing on stage at the Hisawes Thabeema Kalaeli Mangalyaya \'24'],
    ['moment-founders-day-rain.jpg', 'Smiling attendee in the rain at Founder\'s Day \'22'],
    ['moment-sankranthi-singer.jpg', 'Singer performing on stage at Sankranthi \'25'],
    ['moment-kalei-vizhal-bw-dance.jpg', 'Boys performing a traditional dance at Kalei Vizhal \'25'],
    ['moment-swara-ranjana-hall.jpg', 'Orchestra and singers on stage at Swara Ranjana \'24'],
    ['moment-hisawes-full-stage.jpg', 'Full troupe of Kandyan dancers on stage at the Hisawes Thabeema Kalaeli Mangalyaya \'24']
  ];
  var SECONDS_PER_PHOTO = 3; // glide speed: one photo width every 3 seconds (raise = slower)
  var RESUME_AFTER = 4000;   // ms of quiet after a visitor scrolls before gliding resumes

  var row = document.getElementById('momentsRow');
  if (!row || !PHOTOS.length) return;

  function makeFig(p, clone) {
    var f = document.createElement('figure');
    var img = new Image();
    img.src = DIR + p[0];
    img.alt = clone ? '' : (p[1] || 'Moment captured by SSCPC');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.draggable = false;
    if (clone) f.setAttribute('aria-hidden', 'true');
    f.appendChild(img);
    return f;
  }

  var N = PHOTOS.length;
  var frag = document.createDocumentFragment();
  PHOTOS.forEach(function (p) { frag.appendChild(makeFig(p, false)); });
  // copies of the first photos at the end so the loop has no visible jump
  for (var i = 0; i < Math.min(4, N); i++) frag.appendChild(makeFig(PHOTOS[i], true));
  row.appendChild(frag);

  function step() {
    var a = row.children[0], b = row.children[1];
    return (a && b) ? b.offsetLeft - a.offsetLeft : 0;
  }

  var pos = 0;              // our own (fractional) scroll position, for silky motion
  var speedFactor = 1;      // eases between 0 (stopped) and 1 (full speed)
  var pausedUntil = 0, hovering = false, visible = false, popped = null;
  var lastSet = 0, last = 0;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function pause() { pausedUntil = Date.now() + RESUME_AFTER; }

  // visitor input -> pause and hand control to the visitor
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (ev) {
    row.addEventListener(ev, pause, { passive: true });
  });
  row.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hovering = true; });
  row.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hovering = false; });

  // scrolls we did not cause (drag, swipe, scrollbar, keys) -> pause and re-sync
  row.addEventListener('scroll', function () {
    if (Math.abs(row.scrollLeft - lastSet) > 2) {
      pause();
      pos = row.scrollLeft;
    }
  }, { passive: true });

  // tap-to-pop for touch screens (mouse users get the same effect from CSS :hover)
  row.addEventListener('click', function (e) {
    var fig = e.target.closest ? e.target.closest('figure') : null;
    if (popped) popped.classList.remove('is-popped');
    if (fig && fig !== popped && window.matchMedia('(hover: none)').matches) {
      fig.classList.add('is-popped');
      popped = fig;
    } else {
      popped = null;
    }
  });
  document.addEventListener('click', function (e) {
    if (popped && !row.contains(e.target)) { popped.classList.remove('is-popped'); popped = null; }
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0.2 }).observe(row);
  } else {
    visible = true;
  }

  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000 || 0);
    last = now;

    var s = step();
    var canGlide = s && !reduce.matches && !document.hidden && visible && row.offsetWidth;
    var wantMove = canGlide && !hovering && !popped && Date.now() >= pausedUntil;

    // ease speed up / down instead of starting and stopping abruptly
    speedFactor += ((wantMove ? 1 : 0) - speedFactor) * Math.min(1, dt * 5);
    if (!wantMove && speedFactor < 0.002) speedFactor = 0;

    if (canGlide && speedFactor > 0) {
      pos += (s / SECONDS_PER_PHOTO) * speedFactor * dt;
      var loop = N * s;
      if (pos >= loop) pos -= loop;   // copies at the end look identical to the start
      lastSet = pos;
      row.scrollLeft = pos;
      lastSet = row.scrollLeft;       // browsers may round; remember what really got set
    } else if (!wantMove) {
      pos = row.scrollLeft;           // stay in sync while the visitor is in control
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(function (t) { last = t; requestAnimationFrame(frame); });

  // if a visitor scrolls into the copies by hand, jump back to the identical spot at the start
  var t;
  row.addEventListener('scroll', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      var s = step();
      if (s && row.scrollLeft >= N * s) {
        row.scrollLeft -= N * s;
        pos = lastSet = row.scrollLeft;
      }
    }, 200);
  }, { passive: true });
})();
