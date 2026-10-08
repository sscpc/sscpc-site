/* ==========================================================================
   SPECTRUM · THE JURY — full-screen editorial profiles
   --------------------------------------------------------------------------
   HOW TO FILL IN A JUDGE (everything below is plain text, no code needed):

   title         short professional title (shown on the card and in the spread)
   fields        3–5 photography specialties (shown as editorial keywords)
   bio           approved biography — one string per paragraph
   achievements  5–8 items:  {tag:'Award', year:'2021', text:'What it was'}   (tag and year are both optional)
   quote         {text:'...', by:'Name'} — leave text empty until approved
   links         instagram / website / youtube / facebook — full https:// URLs
   portraitCredit  e.g. 'Photo: Name'
   works         4–6 photographs, each made with W(src, title, caption, credit)
                 e.g. W('images/spectrum/judges/priyantha-bandara/work-1.jpg',
                        'Title of the photograph', 'One-line caption', 'Photo: Priyantha Bandara', 1536, 1025)
                 (the last two numbers are the image's pixel width and height; photos are shown
                  uncropped in their own proportions, and the gallery arranges itself around them)

   Photo files go in:  images/spectrum/judges/<judge-id>/work-1.jpg … work-6.jpg
   (any file name works as long as it matches what you write in W(...))

   SHOW_PLACEHOLDERS
     true  = empty areas are shown as labelled placeholders (use while building)
     false = anything still empty is hidden, so visitors never see "to be added"
   ========================================================================== */
(function () {
  'use strict';

  var SHOW_PLACEHOLDERS = true;

  function W(src, title, caption, credit, w, h) {
    return { src: src || '', title: title || '', caption: caption || '', credit: credit || '', w: w || 0, h: h || 0 };
  }

  var JUDGES = [
    {
      id: 'priyantha-bandara', first: 'Priyantha', last: 'Bandara',
      title: 'Landscape & Fine-Art Photographer',
      fields: ['Landscape', 'Travel', 'Fine Art', 'Architecture', 'Commercial'],
      portrait: 'images/spectrum/judges/priyantha-bandara/portrait.jpg',
      portraitCredit: '',
      bio: [
        'Priyantha Bandara is a Sri Lankan photographer specializing in landscape, travel, architectural, and commercial photography. Based in Sri Lanka, he is known for capturing atmospheric, dramatic natural environments across the island as well as in international destinations like Iceland and India.',
        'He has established himself as a prominent fine-art landscape and travel photographer in Sri Lanka. Beyond behind-the-lens work, he actively contributes to the photography community through vlogging, educational workshops, and coaching aspiring photographers on the art and technicalities of landscape photography.',
        'He leads guided landscape photography tours both within Sri Lanka and internationally, taking photographers through regions like Horton Plains, Haldummula, and Jaffna, as well as global destinations such as Iceland.',
        'His style focuses on dramatic natural lighting, long exposures, mountain vistas, waterfalls, and coastal landscapes. He offers fine-art canvas and photo prints, commercial image licensing, guided photography expeditions, and education and workshops.'
      ],
      achievements: [
        {tag:'Finalist', year:'', text:"Named a finalist among the 10X Top Ten Landscape Photographers for his dramatic capture of Iceland's Skógafoss waterfall."},
        {tag:'Prints', year:'', text:'Fine-art prints of the misty Sri Lankan highlands (Thotupalakanda in Horton Plains, and Haldummula) and international landscapes, widely collected and licensed.'},
        {tag:'Workshops', year:'', text:'Organized and conducted photography tours and coaching modules, both locally and globally.'}
      ],
      quote: { text: '', by: '' },
      links: { instagram: '', website: '', youtube: '', facebook: '' },
      works: [
        W('images/spectrum/judges/priyantha-bandara/work-1.jpg','','','Photo: Priyantha Bandara',1536,1025),
        W('images/spectrum/judges/priyantha-bandara/work-2.jpg','','','Photo: Priyantha Bandara',1024,1536),
        W('images/spectrum/judges/priyantha-bandara/work-3.jpg','','','Photo: Priyantha Bandara',1536,1025),
        W('images/spectrum/judges/priyantha-bandara/work-4.jpg','','','Photo: Priyantha Bandara',1024,1536),
        W('images/spectrum/judges/priyantha-bandara/work-5.jpg','','','Photo: Priyantha Bandara',1536,934)
      ]
    },
    {
      id: 'ravi-ranasinghe', first: 'Ravi', last: 'Ranasinghe',
      title: 'Street & Fine-Art Photographer',
      fields: ['Street', 'Fine Art', 'Travel', 'Human & Cultural Stories'],
      portrait: 'images/spectrum/judges/ravi-ranasinghe/portrait.jpg',
      portraitCredit: '',
      bio: [
        'Ravi Ranasinghe (professionally known as RaviR Photography) is a prominent Sri Lankan fine art, street, and travel photographer. Known for his ability to find “the un-findable in the commonest and simplest of places,” he has established himself as one of Sri Lanka’s most internationally decorated contemporary visual storytellers.',
        'His passion for photography centres on capturing authentic human emotion, fleeting street narratives, and vibrant cultural events. Rather than focusing solely on commercial output, his work leans into fine-art storytelling, using natural light, shadows, and composition to elevate everyday life into compelling visual art.',
        'Over his career he has expanded from local street walks in Sri Lanka to leading international photo expeditions. He advocates that great photography relies on vision and commitment rather than expensive gear, and often teaches students who shoot with basic setups or mobile phones.',
        'His street and cultural work documents everyday life, candid portraits, local traditions, and street dynamics across Sri Lanka, Vietnam, Bali, and India. He teaches a signature 6-week online masterclass, hosts street walks, lectures at universities, and guides photo tours in Sri Lanka (including Jaffna and the Central Highlands) and abroad. He serves as a jury member for national and international competitions, and has held solo exhibitions in Hanoi (Vietnam) and at the Lionel Wendt Art Gallery in Colombo.'
      ],
      achievements: [
        {tag:'Distinction', year:'', text:'EFIAP – Excellence Fédération Internationale de l’Art Photographique (FIAP)'},
        {tag:'Distinction', year:'', text:'AFIAP – Artist FIAP'},
        {tag:'Distinction', year:'', text:'ANPAS – Associate of the National Photographic Art Society'},
        {tag:'Distinction', year:'', text:'LISLP – Licentiateship of the Institute of Sri Lankan Photographers'},
        {tag:'Gold Award', year:'', text:'Multiple-time winner at the State Festival of Photography, Sri Lanka'},
        {tag:'Gold Award', year:'2017', text:'AGORA Awards Gold Winner'},
        {tag:'Medals', year:'', text:'Numerous FIAP, RPS (Royal Photographic Society), and PSA medals across international salons'},
        {tag:'Honours', year:'', text:'D. C. L. Amarasinghe Memorial Challenge Trophy and Henry Rajakaruna MFIAP Challenge Trophy'}
      ],
      quote: { text: '', by: '' },
      links: { instagram: '', website: '', youtube: '', facebook: '' },
      works: [
        W('images/spectrum/judges/ravi-ranasinghe/work-1.jpg','','','Photo: Ravi Ranasinghe',1536,1149),
        W('images/spectrum/judges/ravi-ranasinghe/work-2.jpg','','','Photo: Ravi Ranasinghe',1536,1068),
        W('images/spectrum/judges/ravi-ranasinghe/work-3.jpg','','','Photo: Ravi Ranasinghe',1536,1016),
        W('images/spectrum/judges/ravi-ranasinghe/work-4.jpg','','','Photo: Ravi Ranasinghe',981,1536),
        W('images/spectrum/judges/ravi-ranasinghe/work-5.jpg','','','Photo: Ravi Ranasinghe',1536,1010)
      ]
    },
    {
      id: 'ravisara-jayamanna', first: 'Ravisara', last: 'Jayamanna',
      title: 'Wildlife & Nature Photographer',
      fields: ['Wildlife', 'Nature', 'Conservation'],
      portrait: 'images/spectrum/judges/ravisara-jayamanna/portrait.jpg',
      portraitCredit: '',
      bio: [
        'Ravisara Jayamanna is an award-winning Sri Lankan wildlife photographer, safari tour guide, and nature conservationist. He is recognized for capturing Sri Lanka’s wildlife in its raw, unmanipulated form, with a primary focus on rare and elusive fauna across national parks and rainforests.',
        'He began his journey into photography in 2017 after joining his school’s photography association. Driven by a curiosity about animal behavior, ecosystems, and travel, he moved into dedicated wildlife photography.',
        'His philosophy centres on authentic visual storytelling. He avoids digital alterations so that images capture exact moments as they occurred in nature, and he sees his photography as a tool for environmental education, raising awareness about biodiversity conservation and the importance of preserving Sri Lanka’s endemic species.',
        'His core focus is leopards, endemic bird species, reptiles, and rainforest fauna, across Yala, Wilpattu, Kumana, and Horton Plains national parks and rainforest hotspots like Sinharaja and Kitulgala. He runs wildlife photography safaris for local and international photographers, teaching field techniques and ethical tracking, and delivers lectures and workshops on nature conservation and animal behavior.'
      ],
      achievements: [
        {tag:'Publications', year:'', text:'Work published and featured by global wildlife platforms including BBC Earth, National Geographic (India), Discovery, and Nikon.'},
        {tag:'Award', year:'2018, 2022', text:'Wild Sri Lanka Photographer of the Year'},
        {tag:'Winner', year:'2019', text:'SLAAS Nature E Photo Contest'},
        {tag:'Awards', year:'', text:'State Festival of Photography and NPAS (National Photographic Art Society)'},
        {tag:'Finalist', year:'', text:'NatureInFocus'},
        {tag:'Recognition', year:'', text:'Among the Top 5 Monkey Photographers in the 35Awards'}
      ],
      quote: { text: '', by: '' },
      links: { instagram: '', website: '', youtube: '', facebook: '' },
      works: [
        W('images/spectrum/judges/ravisara-jayamanna/work-1.jpg','','','Photo: Ravisara Jayamanna',1185,1536),
        W('images/spectrum/judges/ravisara-jayamanna/work-2.jpg','','','Photo: Ravisara Jayamanna',1322,1536),
        W('images/spectrum/judges/ravisara-jayamanna/work-3.jpg','','','Photo: Ravisara Jayamanna',1349,1536),
        W('images/spectrum/judges/ravisara-jayamanna/work-4.jpg','','','Photo: Ravisara Jayamanna',1536,1272),
        W('images/spectrum/judges/ravisara-jayamanna/work-5.jpg','','','Photo: Ravisara Jayamanna',1059,1536)
      ]
    }
  ];

  /* ---------------------------------------------------------------- helpers */
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  var PH = SHOW_PLACEHOLDERS;
  var ov, scroller, state = { open: false, idx: 0, closing: false, last: null }, inerted = [], io, raf = 0;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }

  var ICON_X = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>';
  var ICON_ARROW = '<svg viewBox="0 0 40 12" width="40" height="12" aria-hidden="true"><path d="M0 6h38M33 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
  var ICON_OUT = '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M2 10L10 2M4 2h6v6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';

  /* --------------------------------------------------------------- templates */
  function plateHTML(w, i, j, lay) {
    var n = pad(i + 1), has = !!w.src;
    var meta = '<figcaption class="jd-pl-cap"><span class="jd-pl-n">Plate ' + n + '</span>' +
      (w.title ? '<b>' + esc(w.title) + '</b>' : '') +
      (w.caption ? '<span class="jd-pl-t">' + esc(w.caption) + '</span>' : '') +
      (w.credit ? '<em>' + esc(w.credit) + '</em>' : (PH && !w.title ? '<em class="jd-ph-t">Title &amp; credit to be added</em>' : '')) +
      '</figcaption>';
    var media = has
      ? '<div class="jd-pl-img" data-r="img"><img src="' + esc(w.src) + '"' + (w.w && w.h ? ' width="' + w.w + '" height="' + w.h + '"' : '') + ' alt="' + esc(w.title || ('Photograph ' + n + ' by ' + j.first + ' ' + j.last)) + '" loading="lazy" decoding="async" onerror="this.parentNode.classList.add(\'is-missing\');this.remove()"></div>'
      : '<div class="jd-pl-img is-empty" data-r="img"><span class="jd-pl-ph"><i></i><i></i><i></i><i></i><b>Plate ' + n + '</b><small>Photograph to be added</small></span></div>';
    var ar = w.w && w.h ? w.w / w.h : 1.5;
    return '<figure class="jd-plate p' + (i + 1) + ' ' + (ar < 1 ? 'is-p' : 'is-l') + (i % 2 ? ' i-even' : ' i-odd') + (lay && lay.off ? ' off' : '') + '" style="--ar:' + ar.toFixed(4) + ';' + (lay ? 'grid-column:' + lay.col + ';grid-row:' + lay.row + ';' : '') + '" data-par="' + ([0.07, -0.05, 0.04, -0.06, 0.03, -0.08][i] || 0) + '">' + media + meta + '</figure>';
  }

  /* Arranges plates in editorial rows of two, according to each photo's orientation
     (portrait = 5 columns, landscape = 7 columns of a 12-column grid; second plate of a row overlaps and drops lower) */
  function layout(works) {
    var out = [], r = 1, i = 0;
    function isP(w) { return w.w && w.h ? w.h > w.w : false; }
    while (i < works.length) {
      var a = works[i], b = works[i + 1];
      if (!b) { out.push(isP(a) ? { col: '4 / 9', row: r, off: false } : { col: '2 / 12', row: r, off: false }); break; }
      var pa = isP(a), pb = isP(b), ca, cb;
      if (pa && !pb) { ca = '1 / 6'; cb = '6 / 13'; }
      else if (!pa && pb) { ca = '1 / 8'; cb = '8 / 13'; }
      else if (pa && pb) { ca = '1 / 6'; cb = '7 / 12'; }
      else { ca = '1 / 8'; cb = '6 / 13'; }
      var even = (r % 2 === 0);              /* odd rows: 2nd plate drops; even rows: 1st plate drops */
      out.push({ col: ca, row: r, off: even }, { col: cb, row: r, off: !even });
      r++; i += 2;
    }
    return out;
  }

  function build(idx) {
    var j = JUDGES[idx], n = pad(idx + 1), next = JUDGES[(idx + 1) % JUDGES.length], nextN = pad(((idx + 1) % JUDGES.length) + 1);
    var works = j.works.filter(function (w) { return PH || w.src; });
    var lay = layout(works);
    var h = '';

    /* ---- 01 opening spread ---- */
    h += '<header class="jd-hero">' +
      '<div class="jd-bignum" aria-hidden="true">' + n + '</div>' +
      '<p class="jd-kick" data-r style="--d:.55s"><b>' + n + '</b><i></i><span>The Judges</span><em>Spectrum 2026</em></p>' +
      '<figure class="jd-portrait">' +
        '<div class="jd-pimg" data-r="img" style="--d:.35s"><img class="jd-hero-img" src="' + esc(j.portrait) + '" alt="Portrait of ' + esc(j.first + ' ' + j.last) + '" decoding="async" onerror="this.parentNode.classList.add(\'is-missing\');this.remove()"></div>' +
        '<figcaption class="jd-pcap" data-r style="--d:1.1s"><span>Fig. ' + n + '</span><b>' + esc(j.first + ' ' + j.last) + '</b><em>' + (j.portraitCredit ? esc(j.portraitCredit) : (PH ? '<i class="jd-ph-t">Photo credit to be added</i>' : 'Portrait')) + '</em></figcaption>' +
      '</figure>' +
      '<h2 class="jd-name" id="jd-name" style="--nl:' + Math.max(j.first.length, j.last.length) + '"><span class="jd-ln" style="--d:.6s"><span>' + esc(j.first) + '</span></span><span class="jd-ln" style="--d:.75s"><span>' + esc(j.last) + '</span></span></h2>' +
      '<p class="jd-role" data-r style="--d:.95s">' + esc(j.title) + '</p>' +
      '<ul class="jd-tags" data-r style="--d:1.05s" aria-label="Photography fields">' + j.fields.map(function (f, i) { return '<li><i>' + pad(i + 1) + '</i>' + esc(f) + '</li>'; }).join('') + '</ul>' +
      '<p class="jd-cue" aria-hidden="true"><span></span>Scroll</p>' +
    '</header>';

    /* ---- 02 biography ---- */
    var hasBio = j.bio && j.bio.length;
    if (hasBio || PH) {
      h += '<section class="jd-bio" aria-label="Biography"><div class="jd-bio-in">' +
        '<p class="jd-lab" data-r><i></i>Biography</p>' +
        '<div class="jd-bio-t' + (hasBio ? '' : ' is-ph') + '" data-r>' +
          (hasBio ? j.bio.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('')
                  : '<p class="jd-ph-t">Approved biography to be added.</p><span class="jd-ph-l"></span><span class="jd-ph-l"></span><span class="jd-ph-l s"></span>') +
        '</div>' +
        '<aside class="jd-bio-side" data-r><span class="jd-side-n" aria-hidden="true">' + n + '</span><p>Spectrum 2026<br>Jury &middot; Photo Selection<br>12 October 2026</p></aside>' +
      '</div></section>';
    }

    /* ---- 03 specialties + achievements ---- */
    var ach = (j.achievements || []);
    var hasAch = ach.length;
    h += '<section class="jd-spec" aria-label="Photography and recognition"><div class="jd-spec-in">' +
      '<div class="jd-fields"><p class="jd-lab" data-r><i></i>Photography</p><ul>' +
        j.fields.map(function (f, i) { return '<li data-r style="--d:' + (i * 0.07) + 's"><i>' + pad(i + 1) + '</i><span>' + esc(f) + '</span></li>'; }).join('') +
      '</ul></div>';
    if (hasAch || PH) {
      h += '<div class="jd-ach"><p class="jd-lab" data-r><i></i>Achievements &amp; Recognition</p><ol>';
      if (hasAch) {
        h += ach.map(function (a, i) {
          var tg = [a.tag, a.year].filter(Boolean).join(' · ');
          return '<li data-r style="--d:' + (i * 0.06) + 's"><i>' + pad(i + 1) + '</i><div>' + (tg ? '<small>' + esc(tg) + '</small>' : '') + '<span>' + esc(a.text || '') + '</span></div></li>';
        }).join('');
      } else {
        for (var k = 0; k < 5; k++) h += '<li class="is-ph" data-r style="--d:' + (k * 0.06) + 's"><i>' + pad(k + 1) + '</i><div><small>Award &middot; Year</small><span class="jd-ph-t">Award, exhibition or publication &mdash; to be added</span></div></li>';
      }
      h += '</ol></div>';
    }
    h += '</div></section>';

    /* ---- 04 quote ---- */
    var hasQ = j.quote && j.quote.text;
    if (hasQ || PH) {
      h += '<section class="jd-quote' + (hasQ ? '' : ' is-ph') + '" aria-label="In their words"><div class="jd-quote-in">' +
        '<p class="jd-lab" data-r><i></i>In their words</p>' +
        '<span class="jd-qm" aria-hidden="true">&ldquo;</span>' +
        (hasQ ? '<blockquote data-r><p>' + esc(j.quote.text) + '</p><footer>' + esc(j.quote.by || (j.first + ' ' + j.last)) + '</footer></blockquote>'
              : '<blockquote data-r><p>A personal quote about photography &mdash; to be added.</p><footer>' + esc(j.first + ' ' + j.last) + '</footer></blockquote>') +
      '</div></section>';
    }

    /* ---- 05 gallery ---- */
    if (works.length) {
      h += '<section class="jd-gal" aria-label="Selected works"><div class="jd-gal-in">' +
        '<div class="jd-gal-head"><p class="jd-lab" data-r><i></i>Selected Works</p><h3 data-r>Plates <span>' + pad(works.length) + '</span></h3></div>' +
        '<div class="jd-plates c' + works.length + '">' + works.map(function (w, i) { return plateHTML(w, i, j, lay[i]); }).join('') + '</div>' +
      '</div></section>';
    }

    /* ---- 06 credits · links · next ---- */
    var credits = works.filter(function (w) { return w.title || w.credit || PH; });
    var L = j.links || {}, linkDefs = [['instagram', 'Instagram'], ['website', 'Website'], ['youtube', 'YouTube'], ['facebook', 'Facebook']];
    var anyLink = linkDefs.some(function (d) { return safeUrl(L[d[0]]); });
    h += '<footer class="jd-end"><div class="jd-end-in">';
    if (credits.length) {
      h += '<div class="jd-credits"><p class="jd-lab" data-r><i></i>Photo Credits</p><ol>' +
        credits.map(function (w, i) {
          return '<li data-r' + (w.title || w.credit ? '' : ' class="is-ph"') + '><i>' + pad(i + 1) + '</i><span>' + (w.title ? esc(w.title) : '<em class="jd-ph-t">Untitled</em>') + '</span><em>' + (w.credit ? esc(w.credit) : (PH ? '<span class="jd-ph-t">credit</span>' : '')) + '</em></li>';
        }).join('') + '</ol></div>';
    }
    if (anyLink || PH) {
      h += '<div class="jd-links"><p class="jd-lab" data-r><i></i>Follow the work</p><ul>' +
        linkDefs.filter(function (d) { return PH || safeUrl(L[d[0]]); }).map(function (d) {
          var u = safeUrl(L[d[0]]);
          return u ? '<li data-r><a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer"><span>' + d[1] + '</span>' + ICON_OUT + '</a></li>'
                   : '<li data-r class="is-ph"><span><span>' + d[1] + '</span><small class="jd-ph-t">link to be added</small></span></li>';
        }).join('') + '</ul></div>';
    }
    h += '<div class="jd-next" data-r><p class="jd-lab"><i></i>Next judge</p>' +
      '<button type="button" class="jd-next-b" data-jd-go="' + ((idx + 1) % JUDGES.length) + '"><span class="jd-next-n">' + nextN + '</span><span class="jd-next-name">' + esc(next.first) + '<br>' + esc(next.last) + '</span>' + ICON_ARROW + '</button>' +
      '<button type="button" class="jd-back" data-jd-close>' + '<span>Back to the Judges</span></button></div>';
    h += '</div></footer>';
    return h;
  }

  /* ------------------------------------------------------------ overlay shell */
  function ensure() {
    if (ov) return;
    ov = doc.createElement('div');
    ov.className = 'jd'; ov.id = 'jd'; ov.hidden = true;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'jd-name');
    ov.innerHTML =
      '<div class="jd-grain" aria-hidden="true"></div>' +
      '<div class="jd-prog" aria-hidden="true"><span></span></div>' +
      '<div class="jd-scroll" tabindex="-1">' +
        '<div class="jd-bar"><p class="jd-bar-l"><span>Spectrum 2026</span><i></i><span>The Judges</span></p>' +
        '<p class="jd-bar-c" aria-live="polite"><b></b> / ' + pad(JUDGES.length) + '</p>' +
        '<button type="button" class="jd-close" data-jd-close aria-label="Close profile"><span>Close</span>' + ICON_X + '</button></div>' +
        '<div class="jd-sheet"></div>' +
      '</div>';
    doc.body.appendChild(ov);
    scroller = ov.querySelector('.jd-scroll');
    scroller.addEventListener('scroll', onScroll, { passive: true });
    ov.addEventListener('click', function (e) {
      if (e.target.closest('[data-jd-close]')) { close(); return; }
      var g = e.target.closest('[data-jd-go]');
      if (g) swap(+g.getAttribute('data-jd-go'));
    });
  }

  function render(idx) {
    state.idx = idx;
    ov.querySelector('.jd-sheet').innerHTML = build(idx);
    ov.querySelector('.jd-bar-c b').textContent = pad(idx + 1);
    scroller.scrollTop = 0;
    observe();
    onScroll();
  }

  /* reveal-on-scroll, parallax, progress */
  function observe() {
    if (io) io.disconnect();
    var els = ov.querySelectorAll('[data-r],.jd-ln,.jd-pcap,.jd-cue');
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    /* clipped images are observed through their parent (a fully clipped element never counts as visible) */
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target;
        (t._jdTargets || [t]).forEach(function (x) { x.classList.add('in'); });
        io.unobserve(t);
      });
    }, { root: scroller, threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) {
      if (e.getAttribute('data-r') === 'img') {
        var p = e.parentNode; (p._jdTargets = p._jdTargets || []).push(e); io.observe(p);
      } else io.observe(e);
    });
  }

  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      if (!scroller) return;
      var st = scroller.scrollTop, max = scroller.scrollHeight - scroller.clientHeight;
      ov.classList.toggle('is-scrolled', st > 40);
      ov.querySelector('.jd-prog span').style.transform = 'scaleX(' + (max > 0 ? st / max : 0) + ')';
      if (reduce) return;
      var vh = scroller.clientHeight;
      var himg = ov.querySelector('.jd-hero-img');
      if (himg && st < vh * 1.4) himg.style.setProperty('--hy', (st * 0.16).toFixed(1) + 'px');
      var bn = ov.querySelector('.jd-bignum');
      if (bn && st < vh * 1.4) bn.style.setProperty('--by', (st * -0.22).toFixed(1) + 'px');
      ov.querySelectorAll('[data-par]').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var c = r.top + r.height / 2 - vh / 2;
        var k = (parseFloat(el.getAttribute('data-par')) || 0) * (innerWidth < 1000 ? 0.4 : 1);
        el.style.setProperty('--py', (-c * k).toFixed(1) + 'px');
      });
    });
  }

  /* ------------------------------------------------------- open / close / swap */
  function setInert(on) {
    if (on) {
      Array.prototype.forEach.call(doc.body.children, function (el) {
        if (el === ov || /^(SCRIPT|LINK|STYLE|NOSCRIPT)$/.test(el.tagName) || el.inert) return;
        el.inert = true; inerted.push(el);
      });
    } else { inerted.forEach(function (el) { el.inert = false; }); inerted = []; }
  }
  function insetFor(rect) {
    var w = root.clientWidth, h = window.innerHeight;
    return 'inset(' + Math.max(0, rect.top) + 'px ' + Math.max(0, w - rect.right) + 'px ' + Math.max(0, h - rect.bottom) + 'px ' + Math.max(0, rect.left) + 'px)';
  }
  function cardOf(idx) { return doc.querySelector('.judge[data-judge="' + JUDGES[idx].id + '"]'); }
  function photoRect(idx) {
    var c = cardOf(idx), p = c && (c.querySelector('.judge-ph') || c);
    return p ? p.getBoundingClientRect() : { top: window.innerHeight / 2 - 40, bottom: window.innerHeight / 2 + 40, left: root.clientWidth / 2 - 40, right: root.clientWidth / 2 + 40 };
  }

  function open(idx) {
    if (state.open || state.closing) return;
    ensure();
    state.open = true; state.last = doc.activeElement;
    var rect = photoRect(idx);
    render(idx);
    ov.hidden = false;
    ov.classList.remove('is-closing');
    root.classList.add('jd-lock');
    setInert(true);
    if (reduce) {
      ov.style.opacity = '0'; ov.classList.add('is-fade'); void ov.offsetWidth; ov.style.opacity = '1';
      setTimeout(function () { ov.classList.remove('is-fade'); ov.classList.add('is-open'); }, 280);
    } else {
      ov.style.clipPath = insetFor(rect);
      ov.classList.remove('is-open'); ov.classList.add('is-anim');
      void ov.offsetWidth;
      ov.classList.add('is-open');
      ov.style.clipPath = 'inset(0px 0px 0px 0px)';
      setTimeout(function () { ov.classList.remove('is-anim'); ov.style.clipPath = ''; }, 1000);
    }
    setTimeout(function () { if (state.open) scroller.focus({ preventScroll: true }); var c = ov.querySelector('.jd-close'); c && c.focus({ preventScroll: true }); }, 60);
  }

  function close() {
    if (!state.open || state.closing) return;
    state.closing = true;
    var card = cardOf(state.idx);
    if (card) {
      var r0 = card.getBoundingClientRect();
      if (r0.bottom < 40 || r0.top > window.innerHeight - 40) window.scrollTo({ top: window.scrollY + r0.top - (window.innerHeight - r0.height) / 2, behavior: 'instant' });
    }
    var rect = photoRect(state.idx);
    ov.classList.add('is-closing');
    var done = function () {
      ov.hidden = true; ov.classList.remove('is-open', 'is-anim', 'is-closing', 'is-fade'); ov.style.clipPath = ''; ov.style.opacity = '';
      root.classList.remove('jd-lock'); setInert(false);
      state.open = false; state.closing = false;
      var b = card && card.querySelector('.judge-open');
      var f = (b || state.last); if (f && f.focus) f.focus({ preventScroll: true });
    };
    if (reduce) { ov.classList.add('is-fade'); ov.style.opacity = '0'; setTimeout(done, 280); return; }
    ov.style.clipPath = 'inset(0px 0px 0px 0px)';
    ov.classList.add('is-anim');
    void ov.offsetWidth;
    ov.style.clipPath = insetFor(rect);
    setTimeout(done, 900);
  }

  function swap(idx) {
    if (!state.open || state.closing || idx === state.idx) return;
    ov.classList.add('is-swap');
    setTimeout(function () {
      render(idx);
      requestAnimationFrame(function () { ov.classList.remove('is-swap'); });
      var c = ov.querySelector('.jd-close'); c && c.focus({ preventScroll: true });
    }, reduce ? 0 : 420);
  }

  /* ------------------------------------------------------------------ wiring */
  doc.addEventListener('click', function (e) {
    var card = e.target.closest && e.target.closest('.judge[data-judge]');
    if (!card) return;
    var id = card.getAttribute('data-judge');
    for (var i = 0; i < JUDGES.length; i++) if (JUDGES[i].id === id) { e.preventDefault(); open(i); return; }
  });

  doc.addEventListener('keydown', function (e) {
    if (!state.open) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      var f = Array.prototype.filter.call(ov.querySelectorAll('a[href],button,[tabindex="0"]'), function (el) { return !el.disabled && el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (doc.activeElement === first || doc.activeElement === scroller)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  /* keep the closing wipe correct if the window is resized while open */
  window.addEventListener('resize', function () { if (state.open) onScroll(); });

  /* tiny public hook (optional): window.SpectrumJudges.open(0) */
  window.SpectrumJudges = { open: open, close: close };
})();
