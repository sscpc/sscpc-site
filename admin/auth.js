/* SSCPC admin sign-in / sign-up interface and session handling. Talks to /api/auth and /api/admin.
   The shared passkey is only ever typed by the user and sent to the server. It is never stored or
   embedded here; the only things kept in the browser are the username (if "Remember" is ticked) and,
   in memory only, the CSRF token. The session itself is an HttpOnly cookie that scripts cannot read. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var API = '/api/auth', LS_USER = 'sscpcAdminUsername';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ROLE = { super_admin: 'Super Admin', admin: 'Admin', editor: 'Editor', general: 'General User' };

  var S = { user: null, csrf: '', access: null };
  var AUTH = window.SSCPC_AUTH = { user: null, access: null, admin: adminCall, logout: logout, can: function (p) { return !!(S.access && S.access.permissions && S.access.permissions.indexOf(p) > -1); } };

  var mem = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------- API ---------- */
  function api(action, data, signal, extra) {
    return fetch(API, {
      method: 'POST', credentials: 'same-origin', signal: signal,
      headers: Object.assign({ 'Content-Type': 'application/json' }, extra || {}),
      body: JSON.stringify(Object.assign({ action: action }, data))
    }).then(function (res) {
      return res.json().then(function (b) { return { status: res.status, body: b }; }, function () {
        return { status: res.status, body: { ok: false, message: res.status === 404
          ? 'The sign-in service is not available on this site yet.'
          : 'Unexpected response from the server. Please try again.' } };
      });
    }, function (e) {
      if (e && e.name === 'AbortError') throw e;
      return { status: 0, body: { ok: false, message: 'Could not reach the server. Check your connection and try again.' } };
    });
  }

  /* ---------- Validation (mirrors api/_lib/validate.js; the server is the final judge) ---------- */
  var RESERVED = ['admin','administrator','root','system','sysadmin','superuser','owner','staff','support','security','moderator','mod','webmaster','official','committee','president','sscpc','sscpc-admin','photographyclub','api','login','logout','signin','signup','register','auth','null','undefined','guest','user','anonymous'];
  function normUser(v) { return String(v || '').replace(/\s+/g, '').toLowerCase(); }
  function checkUser(v) {
    if (v.length < 3) return { ok: false, soft: true, msg: 'At least 3 characters.' };
    if (v.length > 24) return { ok: false, msg: 'Use 24 characters or fewer.' };
    if (!/^[a-z]/.test(v)) return { ok: false, msg: 'Start with a letter.' };
    if (!/^[a-z][a-z0-9._-]*$/.test(v)) return { ok: false, msg: 'Use only letters, numbers, dots, underscores and hyphens.' };
    if (/[._-]{2}/.test(v) || /[._-]$/.test(v)) return { ok: false, msg: 'No repeated symbols, and do not end with one.' };
    if (RESERVED.indexOf(v) > -1 || /^admin/.test(v)) return { ok: false, msg: 'This username is not available.' };
    return { ok: true };
  }
  function checkName(v) {
    v = v.replace(/\s+/g, ' ').trim();
    if (v.length < 2 || v.length > 60) return 'Enter your full name (2 to 60 characters).';
    if (!/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(v)) return 'Use letters, spaces, dots, apostrophes and hyphens only.';
    return '';
  }

  /* ---------- Field + form helpers ---------- */
  function field(id) { return $('#' + id).closest('.af'); }
  function setField(id, state, msg) {
    var f = field(id), m = $('.af-msg', f), inp = $('#' + id);
    f.classList.remove('is-err', 'is-ok', 'is-busy');
    if (state) f.classList.add('is-' + state);
    m.textContent = msg || '';
    if (inp.type !== 'checkbox') { if (state === 'err') inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid'); }
  }
  function banner(form, kind, text) {
    var b = $('.auth-banner', form);
    if (!kind) { b.hidden = true; b.textContent = ''; return; }
    b.className = 'auth-banner ' + kind; b.textContent = text; b.hidden = false;
    if (kind === 'err' && !reduce) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
  }
  function busy(form, on, label) {
    var btn = $('button[type=submit]', form), txt = $('.btn-txt', btn);
    form.querySelector('fieldset').disabled = on;
    btn.classList.toggle('is-busy', on);
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
    if (on) { txt.dataset.l = txt.textContent; txt.textContent = label; } else if (txt.dataset.l) txt.textContent = txt.dataset.l;
    isBusy = on;
  }
  var isBusy = false;

  /* ---------- Tabs ---------- */
  var tabs = $('.auth-tabs'), panelsEl = $('#authPanels'), current = 'signin';
  var COPY = {
    signin: ['Sign in', 'Use your personal username and the shared passkey.'],
    signup: ['Create account', 'Choose your own username. You will need the shared passkey from a club administrator.'],
    done: ['Check your email', 'One more step to activate your account.']
  };
  function copyFor(which) { return which === 'signup' && !$('#signupSent').hidden ? COPY.done : COPY[which]; }
  function setCopy(which) { var c = copyFor(which); $('#authTitle').textContent = c[0]; $('#authSub').textContent = c[1]; }
  function swap(outEl, inEl, dx) {
    var h0 = panelsEl.offsetHeight;
    panelsEl.style.height = h0 + 'px';
    panelsEl.style.setProperty('--dx', dx);
    outEl.classList.remove('is-active'); outEl.classList.add('is-leaving'); outEl.setAttribute('aria-hidden', 'true');
    inEl.hidden = false; inEl.classList.remove('is-leaving'); inEl.removeAttribute('aria-hidden');
    var h1 = inEl.offsetHeight;
    void panelsEl.offsetHeight;
    requestAnimationFrame(function () { inEl.classList.add('is-active'); panelsEl.style.height = h1 + 'px'; });
    setTimeout(function () { outEl.hidden = true; outEl.classList.remove('is-leaving'); panelsEl.style.height = ''; }, reduce ? 0 : 380);
  }
  function select(which, focusFirst) {
    if (which === current || isBusy) return;
    var from = current, dx = which === 'signup' ? '16px' : '-16px';
    current = which;
    tabs.dataset.active = which;
    $$('.auth-tab').forEach(function (t) { var on = t.id === 'tab' + cap(which); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    var t = $('#authTitle'), s = $('#authSub');
    t.classList.add('is-swapping'); s.classList.add('is-swapping');
    setTimeout(function () { setCopy(which); t.classList.remove('is-swapping'); s.classList.remove('is-swapping'); }, reduce ? 0 : 160);
    swap($('#panel' + cap(from)), $('#panel' + cap(which)), dx);
    if (focusFirst) setTimeout(function () { var f = $('#panel' + cap(which)).querySelector('input:not([type=checkbox])'); if (f) f.focus(); }, reduce ? 0 : 200);
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  $$('.auth-tab').forEach(function (t) {
    t.addEventListener('click', function () { select(t.id === 'tabSignup' ? 'signup' : 'signin'); });
    t.addEventListener('keydown', function (e) {
      var map = { ArrowLeft: 'signin', ArrowRight: 'signup', Home: 'signin', End: 'signup' };
      if (map[e.key]) { e.preventDefault(); select(map[e.key]); $('#tab' + cap(map[e.key])).focus(); }
    });
  });
  $$('[data-go]').forEach(function (b) { b.addEventListener('click', function () { select(b.dataset.go, true); }); });

  /* ---------- Show / hide passkey, Caps Lock hint ---------- */
  $$('.auth-eye').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = $('#' + b.dataset.target), show = i.type === 'password';
      i.type = show ? 'text' : 'password';
      b.setAttribute('aria-pressed', show); b.setAttribute('aria-label', show ? 'Hide the passkey' : 'Show the passkey');
      b.classList.toggle('on', show);
      $('.e-open', b).style.display = show ? 'none' : ''; $('.e-shut', b).style.display = show ? '' : 'none';
    });
  });
  $$('input[data-caps]').forEach(function (i) {
    var hint = i.closest('.af').querySelector('.af-caps');
    function chk(e) { if (e.getModifierState) hint.hidden = !e.getModifierState('CapsLock'); }
    i.addEventListener('keydown', chk); i.addEventListener('keyup', chk); i.addEventListener('blur', function () { hint.hidden = true; });
  });

  /* ---------- Sign in ---------- */
  var fIn = $('#signinForm');
  var remembered = mem.get(LS_USER);
  if (remembered) { $('#siUser').value = remembered; $('#siRemember').checked = true; }
  $('#siUser').addEventListener('input', function () { var v = normUser(this.value); if (v !== this.value) this.value = v; setField('siUser'); banner(fIn); });
  $('#siPass').addEventListener('input', function () { setField('siPass'); banner(fIn); });

  fIn.addEventListener('submit', function (e) {
    e.preventDefault(); if (isBusy) return;
    banner(fIn);
    var u = normUser($('#siUser').value), pk = $('#siPass').value.trim(), bad = null;
    setField('siUser'); setField('siPass');
    if (!u) { setField('siUser', 'err', 'Enter your personal username.'); bad = bad || 'siUser'; }
    if (!pk) { setField('siPass', 'err', 'Enter the shared passkey.'); bad = bad || 'siPass'; }
    if (bad) { $('#' + bad).focus(); return; }
    busy(fIn, true, 'Signing in…');
    api('signin', { username: u, passkey: pk }).then(function (r) {
      var b = r.body || {};
      if (b.ok && b.authenticated) {
        if ($('#siRemember').checked) mem.set(LS_USER, u); else mem.del(LS_USER);   // the username only, never the passkey
        $('#siPass').value = '';
        return route(b).then(function () { busy(fIn, false); });
      }
      busy(fIn, false);
      if (b.error === 'email_unverified') { unverified(b, u); return; }
      banner(fIn, 'err', b.message || 'Sign in failed. Please try again.');
      if (r.status === 401) $('#siPass').select();
    });
  });

  /* ---------- Sign up ---------- */
  var fUp = $('#signupForm'), uState = 'idle', uSeq = 0, uTimer = null, uCtl = null, uChecked = '';
  function setUser(state, msg) { uState = state; setField('suUser', state === 'taken' || state === 'invalid' ? 'err' : state === 'available' ? 'ok' : state === 'checking' ? 'busy' : '', msg); }

  $('#suUser').addEventListener('input', function () {
    var v = normUser(this.value); if (v !== this.value) this.value = v;
    clearTimeout(uTimer); if (uCtl) uCtl.abort(); uSeq++; banner(fUp);
    if (!v) { setUser('idle', ''); return; }
    var c = checkUser(v);
    if (!c.ok) { if (c.soft) { setField('suUser', '', c.msg); uState = 'idle'; } else setUser('invalid', c.msg); return; }
    setUser('checking', 'Checking availability…');
    var mine = uSeq;
    uTimer = setTimeout(function () {
      uCtl = window.AbortController ? new AbortController() : null;
      api('check-username', { username: v }, uCtl && uCtl.signal).then(function (r) {
        if (mine !== uSeq) return;
        var b = r.body || {};
        if (b.ok && b.available) { uChecked = v; setUser('available', 'Nice, this username is available.'); }
        else if (b.ok) setUser(b.reason === 'taken' ? 'taken' : 'invalid', b.message);
        else { uState = 'unknown'; setField('suUser', '', 'Could not check right now. We will check again when you create the account.'); }
      }, function () {});
    }, 450);
  });

  function matchHint() {
    var a = $('#suPass').value, c = $('#suPass2').value;
    if (!c) { setField('suPass2'); return; }
    if (a.trim() === c.trim()) setField('suPass2', 'ok', 'Passkeys match.'); else setField('suPass2', 'err', 'The passkeys do not match.');
  }
  var EMAIL_RE = /^[a-z0-9._%+'-]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
  function checkEmailField(v) {
    v = v.trim().toLowerCase();
    if (!v) return 'Enter your email address.';
    if (v.length > 254 || !EMAIL_RE.test(v) || /\.\./.test(v)) return 'Enter a valid email address, like name@example.com.';
    return '';
  }
  $('#suPass').addEventListener('input', function () { setField('suPass'); banner(fUp); matchHint(); });
  $('#suPass2').addEventListener('input', function () { banner(fUp); matchHint(); });
  $('#suName').addEventListener('input', function () { setField('suName'); banner(fUp); });
  $('#suEmail').addEventListener('input', function () { setField('suEmail'); banner(fUp); });
  $('#suEmail').addEventListener('blur', function () { var m = this.value.trim() && checkEmailField(this.value); if (m) setField('suEmail', 'err', m); });
  $('#suTerms').addEventListener('change', function () { setField('suTerms'); });

  fUp.addEventListener('submit', function (e) {
    e.preventDefault(); if (isBusy) return;
    banner(fUp);
    var name = $('#suName').value, user = normUser($('#suUser').value), email = $('#suEmail').value.trim().toLowerCase(),
        p1 = $('#suPass').value.trim(), p2 = $('#suPass2').value.trim(), first = null;
    function bad(id, msg) { setField(id, 'err', msg); first = first || id; }
    var nm = checkName(name); if (nm) bad('suName', nm); else setField('suName');
    var uc = checkUser(user);
    if (!user) bad('suUser', 'Choose a personal username.'); else if (!uc.ok) bad('suUser', uc.msg);
    else if (uState === 'taken' && uChecked !== user) { /* re-check on server */ }
    else if (uState === 'taken') bad('suUser', 'That username is already taken.');
    var em = checkEmailField(email); if (em) bad('suEmail', em); else setField('suEmail');
    if (!p1) bad('suPass', 'Enter the shared passkey.'); else setField('suPass');
    if (!p2) bad('suPass2', 'Confirm the shared passkey.'); else if (p1 !== p2) bad('suPass2', 'The passkeys do not match.');
    if (!$('#suTerms').checked) bad('suTerms', 'Please accept the Terms and Conditions to continue.'); else setField('suTerms');
    if (first) { $('#' + first).focus(); return; }

    busy(fUp, true, 'Creating your account…');
    api('register', { fullName: name.replace(/\s+/g, ' ').trim(), username: user, email: email, passkey: p1, confirmPasskey: p2, acceptTerms: true }).then(function (r) {
      busy(fUp, false);
      var b = r.body || {};
      if (r.status === 202 && b.ok) { $('#suPass').value = ''; $('#suPass2').value = ''; showSent(b, email, user); return; }
      if (b.errors) {
        var map = { fullName: 'suName', username: 'suUser', email: 'suEmail', passkey: 'suPass', confirmPasskey: 'suPass2', terms: 'suTerms' }, f1 = null;
        Object.keys(b.errors).forEach(function (k) { if (map[k]) { setField(map[k], 'err', b.errors[k]); f1 = f1 || map[k]; } });
        if (b.error === 'username_taken') { uChecked = user; uState = 'taken'; }
        if (f1) $('#' + f1).focus();
      } else if (b.error === 'invalid_passkey') {
        setField('suPass', 'err', b.message); $('#suPass').focus(); $('#suPass').select();
      } else banner(fUp, 'err', b.message || 'Could not create the account. Please try again.');
    });
  });

  /* ---------- Check your email: resend with a 60 second countdown ---------- */
  var sent = { email: '', username: '', timer: null, left: 0 };
  function sentBanner(kind, text) { var b = $('#sentBanner'); if (!kind) { b.hidden = true; return; } b.className = 'auth-banner ' + kind; b.textContent = text; b.hidden = false; }
  function tick() {
    var btn = $('#resendBtn'), txt = $('.btn-txt', btn);
    if (sent.left > 0) { btn.disabled = true; txt.textContent = 'Resend email in ' + sent.left + 's'; }
    else { btn.disabled = false; txt.textContent = 'Resend email'; clearInterval(sent.timer); sent.timer = null; }
  }
  function countdown(sec) {
    clearInterval(sent.timer); sent.left = sec; tick();
    if (sec > 0) sent.timer = setInterval(function () { sent.left--; tick(); }, 1000);
  }
  function showSent(b, email, username) {
    sent.email = email; sent.username = username;
    $('#sentTo').textContent = email;
    sentBanner(b.emailSent === false ? 'err' : null, 'We created your account, but could not send the email just now. Press Resend email to try again.');
    countdown(b.emailSent === false ? 0 : (b.resendAfter || 60));
    swap(fUp, $('#signupSent'), '16px'); setCopy('signup');
  }
  $('#resendBtn').addEventListener('click', function () {
    var btn = this; btn.disabled = true; btn.classList.add('is-busy'); sentBanner();
    api('resend-verification', { email: sent.email }).then(function (r) {
      btn.classList.remove('is-busy');
      var b = r.body || {};
      if (r.status === 200 && b.ok) { sentBanner('ok', 'A new email is on its way. The previous link no longer works.'); countdown(b.resendAfter || 60); }
      else if (r.status === 429) { sentBanner('info', b.message || 'Please wait a moment before requesting another email.'); countdown(Math.min(b.retryAfter || 60, 60)); }
      else { sentBanner('err', b.message || 'Could not send the email. Please try again.'); countdown(0); }
    });
  });
  function leaveSent(toSignin) {
    clearInterval(sent.timer);
    var gone = $('#signupSent'), back = function () { gone.hidden = true; gone.classList.remove('is-active'); fUp.hidden = false; fUp.classList.add('is-active'); fUp.removeAttribute('aria-hidden'); setCopy('signup'); };
    if (toSignin) {
      $('#siUser').value = sent.username; setField('siUser'); setField('siPass'); banner(fIn);
      select('signin', false);
      setTimeout(function () { $('#siPass').focus(); fUp.reset(); ['suName', 'suUser', 'suEmail', 'suPass', 'suPass2', 'suTerms'].forEach(function (id) { setField(id); }); uState = 'idle'; uChecked = ''; back(); }, reduce ? 0 : 420);
    } else { swap(gone, fUp, '-16px'); setCopy('signup'); setTimeout(function () { $('#suEmail').focus(); }, reduce ? 0 : 400); }
  }
  $('#sentBack').addEventListener('click', function () { leaveSent(true); });
  $('#sentChange').addEventListener('click', function () { leaveSent(false); });

  /* ---------- Terms dialog ---------- */
  var dlg = $('#termsDlg');
  function openTerms() { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  function closeTerms() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  $('#openTerms').addEventListener('click', function (e) { e.preventDefault(); openTerms(); });
  $('#termsClose').addEventListener('click', closeTerms);
  $('#termsAgree').addEventListener('click', function () { $('#suTerms').checked = true; setField('suTerms'); closeTerms(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeTerms(); });

  /* Signed in correctly, but the email was never verified: explain, and offer a fresh link. */
  function unverified(b, username) {
    banner(fIn, 'info', 'Please verify your email address first' + (b.email ? ' (we sent a link to ' + b.email + ')' : '') + '. Open the link in that email to activate your account.');
    var box = $('.auth-banner', fIn), a = document.createElement('button');
    a.type = 'button'; a.className = 'auth-link'; a.textContent = 'Send me a new verification email'; a.style.display = 'block'; a.style.marginTop = '.5rem';
    a.addEventListener('click', function () {
      a.disabled = true; a.textContent = 'Sending…';
      api('resend-verification', { username: username }).then(function (r) {
        a.textContent = r.status === 200 ? 'Email sent. Check your inbox.' : r.status === 429 ? 'Please wait a minute, then try again.' : 'Could not send. Try again shortly.';
        if (r.status !== 200) setTimeout(function () { a.disabled = false; a.textContent = 'Send me a new verification email'; }, 5000);
      });
    });
    box.appendChild(a);
  }

  /* ---------- After sign-in: send people where their permissions allow ---------- */
  function setSession(b) { S.user = b.user; S.csrf = b.csrf; S.access = b.access; AUTH.user = b.user; AUTH.access = b.access; }

  function showLogin() {
    $('#acctCard').classList.add('hide'); $('#authCard').classList.remove('hide'); $('#login').classList.remove('hide');
    if (window.matchMedia && matchMedia('(pointer:fine)').matches) setTimeout(function () { var f = $('#siUser').value ? $('#siPass') : $('#siUser'); f.focus(); }, 60);
  }
  function showAccount(b, problem) {
    $('#acctName').textContent = b.user.fullName; $('#acctUser').textContent = b.user.username;
    $('#acctRole').textContent = (b.access && b.access.label) || ROLE[b.user.role] || 'General User';
    $('#acctSub').textContent = 'Welcome back, ' + b.user.fullName.split(' ')[0] + '.';
    $('#acctMsg').textContent = problem || 'Your account is active, but it does not have access to the admin tools yet. An administrator can grant you permissions.';
    $('#acctRetry').classList.toggle('hide', !problem);
    $('#authCard').classList.add('hide'); $('#acctCard').classList.remove('hide'); $('#login').classList.remove('hide'); $('#app').classList.add('hide');
  }
  function route(b) {
    setSession(b);
    var perms = (b.access && b.access.permissions) || [];
    if (b.access && b.access.landing === 'portal' && perms.indexOf('portal:access') > -1 && typeof window.enterPortal === 'function') {
      return Promise.resolve().then(function () { return window.enterPortal(); }).then(function () {
        $('#login').classList.add('hide'); $('#app').classList.remove('hide');
      }, function (err) {
        showAccount(b, 'Signed in, but the admin portal could not load its data. ' + ((err && err.message) || '') + ' Try again, or ask the site administrator to check the data connection.');
      });
    }
    showAccount(b); return Promise.resolve();
  }
  $('#acctRetry').addEventListener('click', function () { if (S.user) route({ ok: true, user: S.user, csrf: S.csrf, access: S.access }); });
  $('#acctOut').addEventListener('click', function () { logout(); });

  /* ---------- Session restore on every page load (persistence) ---------- */
  function ready() { $('#login').classList.remove('auth-checking'); }
  api('session', {}).then(function (r) {
    var b = r.body || {};
    if (b.ok && b.authenticated) return route(b).then(ready);
    ready(); showLogin();
    if (b.reason === 'expired') banner(fIn, 'info', 'Your session has expired. Please sign in again.');
    else if (b.reason === 'passkey_changed') banner(fIn, 'info', 'The shared passkey was changed, so everyone has been signed out. Please sign in again with the new passkey.');
    else if (b.reason === 'disabled') banner(fIn, 'err', 'This account is not active. Please contact an administrator.');
  });

  /* ---------- Logout ---------- */
  function logout() {
    return api('logout', {}, null, { 'X-CSRF-Token': S.csrf }).then(function (r) {
      if (r.status === 200 || r.status === 401) { location.reload(); return; }
      window.alert((r.body && r.body.message) || 'Could not sign out. Please try again.');
    });
  }

  /* ---------- Calls to the protected admin API (used by the portal) ---------- */
  function sessionEnded(reason) {
    S.csrf = '';
    $('#app').classList.add('hide'); showLogin();
    banner(fIn, 'info', reason === 'passkey_changed' ? 'The shared passkey was changed. Please sign in again with the new passkey.'
      : reason === 'disabled' ? 'This account is no longer active.' : 'Your session has expired. Please sign in again. Any unsaved edits are still here.');
  }
  function adminCall(action, data) {
    return fetch('/api/admin', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': S.csrf },
      body: JSON.stringify(Object.assign({ action: action }, data || {}))
    }).then(function (res) {
      return res.json().then(function (b) { return { status: res.status, body: b }; }, function () { return { status: res.status, body: {} }; });
    }, function () { throw new Error('Could not reach the server. Check your connection.'); })
    .then(function (r) {
      var b = r.body || {};
      if (r.status === 401) { sessionEnded(b.reason); throw new Error('Your session has ended. Please sign in again.'); }
      if (!b.ok) { var er = new Error(b.message || 'The request failed. Please try again.'); er.errors = b.errors; er.code = b.error; throw er; }
      return b;
    });
  }
})();
