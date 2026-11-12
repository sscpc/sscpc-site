/* Most Popular Photograph vote.
   - Photos, open/close times: js/data.js (VOTE_PHOTOS, VOTE_OPEN, VOTE_CLOSE)
   - Votes are saved by tools/google-sheet-script.gs (Google Apps Script) into the "Photo votes" tab; the admin portal (Votes tab) reads them.
   - Counts are never shown on the site. The server also checks the time window and
     one vote per device per day ("Voter log" tab), so changing the phone's clock does not help. */
(function () {
  'use strict';
  const grid = document.getElementById('vote-grid');
  const statusEl = document.getElementById('vote-status');
  if (!grid || !statusEl || typeof VOTE_PHOTOS === 'undefined') return;

  const OPEN = new Date(VOTE_OPEN).getTime();
  const CLOSE = new Date(VOTE_CLOSE).getTime();
  const TZ = 'Asia/Colombo';
  const fmtDay = d => new Date(d).toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric', month: 'long' });
  const fmtTime = d => new Date(d).toLocaleTimeString('en-GB', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).replace(' am', ' a.m.').replace(' pm', ' p.m.');
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function deviceId() {
    let id = store.get('sscpc_vote_dev');
    if (!id || id.length < 16) {
      const a = new Uint8Array(12);
      (window.crypto || window.msCrypto).getRandomValues(a);
      id = Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
      store.set('sscpc_vote_dev', id);
    }
    return id;
  }
  function myVote() {
    try { const v = JSON.parse(store.get('sscpc_vote_day') || 'null'); return v && v.day === today() ? v.photo : null; } catch (e) { return null; }
  }
  function remember(photo) { store.set('sscpc_vote_day', JSON.stringify({ day: today(), photo })); }

  const phase = () => { const n = Date.now(); return n < OPEN ? 'soon' : n > CLOSE ? 'closed' : 'open'; };
  const label = p => 'Photo ' + String(p.id).padStart(2, '0');
  /* The photo's file path, as the admin lists it (images/spectrum-photos/name.jpg). A thumbs/ copy or ../ prefix is cleaned up. */
  const pathOf = p => String(p.photo || p.full || p.src || '').split('?')[0].replace(/^https?:\/\/[^\/]+\//i, '').replace(/^(\.\.?\/|\/)+/, '').replace('/thumbs/', '/');
  const idOfPath = path => { const f = VOTE_PHOTOS.find(p => pathOf(p) === path); return f ? f.id : null; };
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ---- grid ---- */
  grid.innerHTML = VOTE_PHOTOS.map(p => {
    const n = String(p.id).padStart(2, '0');
    return '<article class="vote-card" data-id="' + p.id + '">' +
      '<button type="button" class="vote-img" data-view="' + p.id + '" aria-label="View ' + label(p) + ' larger">' +
        '<span class="vote-ph" aria-hidden="true">' + n + '</span>' +
        '<img src="' + p.src + '" alt="' + label(p) + (p.by ? ' by ' + esc(p.by) : '') + (p.title ? ': ' + esc(p.title) : '') + '" loading="lazy" decoding="async" onload="this.parentNode.classList.add(\'has-img\')" onerror="this.remove()">' +
        '<span class="vote-num">' + n + '</span>' +
      '</button>' +
      '<div class="vote-meta">' +
        '<div class="vote-cap"><b>' + esc(p.by || label(p)) + '</b>' + (p.school ? '<small>' + esc(p.school) + '</small>' : '') + '</div>' +
        '<button type="button" class="vote-btn" data-vote="' + p.id + '"></button>' +
      '</div></article>';
  }).join('');

  function paint() {
    const ph = phase(), mine = myVote();
    if (ph === 'soon') statusEl.innerHTML = '<b>Voting opens on Photography Day</b>, ' + fmtDay(OPEN) + ' at ' + fmtTime(OPEN) + ' Have a look at the photographs until then.';
    else if (ph === 'open') statusEl.innerHTML = mine
      ? '<b>Thank you for voting!</b> You voted for Photo ' + String(mine).padStart(2, '0') + '. You can vote again tomorrow while voting is open.'
      : '<b>Voting is open</b> until ' + fmtTime(CLOSE) + ' today. Tap a photograph to view it, then press Vote. One vote per person per day.';
    else statusEl.innerHTML = '<b>Voting has closed.</b> Thank you to everyone who voted. The Most Popular Photograph will be announced at the ceremony.';
    statusEl.dataset.phase = ph;
    grid.querySelectorAll('.vote-btn').forEach(b => {
      const id = +b.dataset.vote, card = b.closest('.vote-card');
      card.classList.toggle('is-mine', mine === id && ph === 'open');
      b.disabled = ph !== 'open' || !!mine;
      b.textContent = ph === 'soon' ? 'Opens ' + fmtDay(OPEN).replace('November', 'Nov') : ph === 'closed' ? 'Closed' : mine === id ? '\u2713 Your vote' : mine ? 'Voted' : 'Vote';
    });
  }
  paint();
  setInterval(paint, 20000);

  /* ---- dialog (large view + confirm) ---- */
  const dlg = document.createElement('div');
  dlg.className = 'vote-dlg'; dlg.hidden = true;
  dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-label', 'Photograph');
  dlg.innerHTML = '<div class="vote-dlg-in"><button type="button" class="vote-x" aria-label="Close">&times;</button>' +
    '<div class="vote-dlg-img"></div><p class="vote-dlg-t"></p><p class="vote-dlg-msg" role="status" aria-live="polite"></p>' +
    '<div class="vote-dlg-act"><button type="button" class="btn ghost" data-close>Close</button><button type="button" class="btn cut" data-confirm></button></div></div>';
  document.body.appendChild(dlg);
  const dImg = dlg.querySelector('.vote-dlg-img'), dT = dlg.querySelector('.vote-dlg-t'),
        dMsg = dlg.querySelector('.vote-dlg-msg'), dOk = dlg.querySelector('[data-confirm]');
  let cur = null, busy = false, lastFocus = null;

  function openDlg(id, confirming) {
    cur = VOTE_PHOTOS.find(p => p.id === id); if (!cur) return;
    lastFocus = document.activeElement;
    dImg.innerHTML = '<img src="' + cur.src + '" alt="' + label(cur) + '" onerror="this.outerHTML=\'<div class=vote-ph-big>' + String(cur.id).padStart(2, '0') + '</div>\'">';
    dT.textContent = (cur.by ? cur.by + (cur.school ? ' \u2022 ' + cur.school : '') : label(cur)) + (cur.title ? ' \u2022 \u201c' + cur.title + '\u201d' : '');
    dMsg.textContent = confirming ? 'Vote for ' + label(cur) + '? You can only vote once today.' : '';
    const can = phase() === 'open' && !myVote();
    dOk.hidden = !can; dOk.textContent = confirming ? 'Confirm my vote' : 'Vote for this photo';
    dOk.disabled = false; busy = false;
    dlg.hidden = false; document.body.classList.add('vote-lock');
    (can ? dOk : dlg.querySelector('[data-close]')).focus();
  }
  function closeDlg() { dlg.hidden = true; document.body.classList.remove('vote-lock'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('.vote-x,[data-close]')) closeDlg(); });
  document.addEventListener('keydown', e => { if (!dlg.hidden && e.key === 'Escape') closeDlg(); });

  grid.addEventListener('click', e => {
    const v = e.target.closest('[data-view]'), b = e.target.closest('[data-vote]');
    if (b && !b.disabled) openDlg(+b.dataset.vote, true);
    else if (v) openDlg(+v.dataset.view, false);
  });

  /* ---- send the vote ---- */
  async function send() {
    const body = new URLSearchParams({ form: 'photo-vote', photo: pathOf(cur), title: cur.title || '', photographer: cur.by || '', device: deviceId() });
    const url = (typeof FORMS_ENDPOINT === 'string' ? FORMS_ENDPOINT : '').trim();
    if (!url) throw { code: 'notconnected' };
    if (!navigator.onLine) throw { code: 'offline' };
    try {
      const r = await fetch(url, { method: 'POST', body });
      return JSON.parse(await r.text());
    } catch (e) {
      /* The reply could not be read. Sending again is safe: the server counts one vote per device per day. */
      await fetch(url, { method: 'POST', body, mode: 'no-cors' });
      return { ok: true, unconfirmed: true };
    }
  }
  dOk.addEventListener('click', async () => {
    if (busy || !cur) return;
    if (dOk.textContent === 'Vote for this photo') { dMsg.textContent = 'Vote for ' + label(cur) + '? You can only vote once today.'; dOk.textContent = 'Confirm my vote'; return; }
    busy = true; dOk.disabled = true; dMsg.textContent = 'Sending your vote\u2026';
    try {
      const r = await send();
      if (r && r.unconfirmed) { dMsg.textContent = 'We could not confirm that your vote was saved. Press Confirm again to retry (it will never count twice).'; dOk.disabled = false; busy = false; }
      else if (r && r.ok) { remember(cur.id); dMsg.textContent = '\u2713 Your vote for ' + label(cur) + ' has been counted. Thank you!'; dOk.hidden = true; paint(); }
      else if (r && r.error === 'already') { remember(idOfPath(r.photo) || cur.id); dMsg.textContent = 'You have already voted today. Thank you!'; dOk.hidden = true; paint(); }
      else if (r && r.error === 'closed') { dMsg.textContent = 'Voting has closed.'; dOk.hidden = true; paint(); }
      else if (r && r.error === 'not_open') { dMsg.textContent = 'Voting has not opened yet.'; dOk.hidden = true; paint(); }
      else if (r && r.error === 'invalid') { dMsg.textContent = 'This vote could not be recognised. Please reload the page and try again.'; dOk.disabled = false; busy = false; }
      else { dMsg.textContent = 'Your vote could not be saved. Please try again.'; dOk.disabled = false; busy = false; }
    } catch (e) {
      dMsg.textContent = e && e.code === 'offline' ? 'You are offline. Please connect and try again.'
        : e && e.code === 'notconnected' ? 'Voting is not connected yet. Please contact the club.'
        : 'Your vote could not be sent. Please check your connection and try again.';
      dOk.disabled = false; busy = false;
    }
  });
})();

/* Floating "Vote" button.
   Sits under the small Spectrum countdown (#pcd) on every tab and stays with it while scrolling.
   When the footer comes into view the countdown docks into the footer, but this button is NOT put
   in the footer: it simply hides, and returns when you scroll back up. It also hides while the
   vote section itself is on screen, while the Home intro is pinned, and once voting has closed. */
(function () {
  'use strict';
  if (typeof VOTE_OPEN === 'undefined') return;
  const OPEN = new Date(VOTE_OPEN).getTime(), CLOSE = new Date(VOTE_CLOSE).getTime();
  const pcd = document.getElementById('pcd');
  const footer = document.querySelector('footer');
  const btn = document.createElement('a');
  btn.id = 'vbtn'; btn.className = 'vbtn'; btn.href = '#spectrum';
  btn.innerHTML = '<span class="vbtn-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M12 16.5s-4-2.4-4-5.1A2.3 2.3 0 0 1 12 10a2.3 2.3 0 0 1 4 1.4c0 2.7-4 5.1-4 5.1z"/></svg></span><span class="vbtn-tx"><span class="vbtn-t"></span><span class="vbtn-s"></span></span>';
  document.body.appendChild(btn);
  const txt = btn.querySelector('.vbtn-t'), sub = btn.querySelector('.vbtn-s');

  let footerOn = false, voteOn = false;
  function phase() { const n = Date.now(); return n < OPEN ? 'soon' : n > CLOSE ? 'closed' : 'open'; }
  function place() {
    let top = 4.7 * parseFloat(getComputedStyle(document.documentElement).fontSize || 16);
    if (pcd && !pcd.hidden && !pcd.classList.contains('docked')) { const r = pcd.getBoundingClientRect(); if (r.height) top = r.bottom; }
    btn.style.top = Math.round(top + 8) + 'px';
  }
  function paint() {
    const ph = phase();
    txt.textContent = ph === 'open' ? 'Vote now' : 'Vote on 13 Nov';
    sub.textContent = ph === 'open' ? 'Most popular photograph' : 'Most popular photo \u2022 opens ' + new Date(OPEN).toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour: 'numeric', minute: '2-digit', hour12: true }).replace(':00', '').replace(' am', ' a.m.').replace(' pm', ' p.m.');
    btn.dataset.phase = ph;
    btn.hidden = ph === 'closed';
    btn.classList.toggle('is-off', footerOn || voteOn);
    btn.setAttribute('aria-label', ph === 'open' ? 'Vote for the Most Popular Photograph' : 'Most Popular Photograph vote opens on 13 November');
    place();
  }
  if ('IntersectionObserver' in window) {
    if (footer) new IntersectionObserver(es => { footerOn = es[0].isIntersecting; paint(); }, { rootMargin: '0px 0px -40% 0px' }).observe(footer);
    const sec = document.getElementById('most-popular');
    if (sec) new IntersectionObserver(es => { voteOn = es[0].isIntersecting; paint(); }, { rootMargin: '0px 0px -40% 0px' }).observe(sec);
  }
  addEventListener('resize', place); addEventListener('hashchange', () => setTimeout(paint, 50));
  addEventListener('scroll', place, { passive: true });
  setInterval(paint, 20000);

  function scrollToVote() {
    let tries = 0;
    (function go() {
      const sec = document.getElementById('most-popular');
      if (sec && sec.offsetParent !== null) {
        const jump = () => window.scrollTo({ top: Math.max(0, sec.getBoundingClientRect().top + window.scrollY - 84), behavior: 'auto' });
        jump(); setTimeout(jump, 350); setTimeout(jump, 900);   /* re-aim once images and fade-ins have settled */
        return;
      }
      if (++tries < 80) setTimeout(go, 100);
    })();
  }
  btn.addEventListener('click', e => {
    const onSpectrum = (location.hash || '').replace('#', '') === 'spectrum' || document.getElementById('most-popular').offsetParent !== null;
    if (onSpectrum) { e.preventDefault(); scrollToVote(); }
    else setTimeout(scrollToVote, 400);   /* the tab sweep runs first, then we glide to the vote section */
  });
  /* Direct link for QR codes: https://your-site/vote  ->  /?vote#spectrum  ->  opens the Spectrum tab at the vote section */
  if (/[?&]vote(=|&|$)/.test(location.search)) {
    const go = () => setTimeout(scrollToVote, 600);
    if (document.readyState === 'complete') go(); else addEventListener('load', go);
  }
  paint();
})();
