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
  const CHALLENGES = [
    { title: 'Shadows', text: 'Find a strong shadow and make it the subject of your photo.' },
    { title: 'Leading lines', text: 'Use a road, fence or railing to lead the eye to your subject.' },
    { title: 'Reflections', text: 'Photograph a reflection in a window, puddle or glass of water.' },
    { title: 'Golden hour', text: 'Shoot one scene in the hour after sunrise or before sunset.' },
    { title: 'Frame within a frame', text: 'Use a door, window or archway to frame your subject.' },
    { title: 'Close up', text: 'Get close to an everyday object and show a detail most people miss.' },
    { title: 'Patterns', text: 'Find a repeating pattern, then break it with one different thing.' },
    { title: 'Motion', text: 'Freeze a moving subject, then try to blur it on purpose.' },
    { title: 'People at work', text: 'Photograph someone at work (with permission) and show what they do.' },
    { title: 'Black and white', text: 'Take a photo that works because of contrast and shape, not colour.' },
    { title: 'Minimal', text: 'Make a photo with one subject and lots of empty space.' },
    { title: 'School life', text: 'Tell a small story of an ordinary moment at school in one frame.' }
  ];

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
    p.appendChild(document.createTextNode(c.text + ' Send your best frame to the club.'));
  }

  /* ---------- lesson videos and photos ----------
     Each lesson page (id="lesson-<key>" in index.html) has a media slot that is filled from this list.
     VIDEO: put its link in "url". Accepted:
       - a YouTube link (watch?v=..., youtu.be/..., shorts/... or embed/...): plays on the page, privacy-friendly
         (youtube-nocookie.com), and only loads when the visitor presses play
       - a video file of your own, e.g. 'videos/composition.mp4' (.mp4 or .webm), with an optional  poster: 'images/learn/composition.jpg'
       - any other link (for example a Facebook video): shows a "Watch" button that opens it in a new tab
       Leave url empty ('') to show "Coming soon". Fields: title, length (text such as '5 min'), by (who made it).
     PHOTOS: a list of { src: 'images/learn/composition-1.jpg', caption: 'Rule of thirds' }. Put the picture files in images/learn/.
       With no photos the lesson shows "Photos coming soon". */
  const LESSONS = {
    composition: { video: { title: 'Composition: the rule of thirds', url: '', length: '', by: 'SSCPC' }, photos: [] },
    light:       { video: { title: 'Using natural light', url: '', length: '', by: 'SSCPC' }, photos: [] },
    exposure:    { video: { title: 'Aperture, shutter and ISO', url: '', length: '', by: 'SSCPC' }, photos: [] },
    phone:       { video: { title: 'Better photos with your phone', url: '', length: '', by: 'SSCPC' }, photos: [] }
  };

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
  function showMedia() {
    document.querySelectorAll('.lesson-media[data-lesson]').forEach(function (slot) {
      const l = LESSONS[slot.getAttribute('data-lesson')];
      if (!l) return;
      slot.textContent = '';
      if (l.video) { slot.appendChild(make('h4', 'media-h', 'Video')); slot.appendChild(videoBlock(l.video)); }
      slot.appendChild(make('h4', 'media-h', 'Photos')); slot.appendChild(photoBlock(l.photos));
    });
  }

  window.SSCPCLearn = { pick: pick, weekIndex: weekIndex, ytId: ytId, lessons: LESSONS };
  function start() { show(); showMedia(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
