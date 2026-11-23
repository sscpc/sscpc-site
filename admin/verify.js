/* Email verification page. The magic link carries its token after the # sign, so it is never sent to a server
   in the request itself, never appears in server logs, and is not passed along in Referer headers. This page reads it,
   removes it from the address bar at once, and posts it to /api/auth. Nothing happens on a mere page load by a link
   scanner that does not run scripts, so the one-time link is not used up before the person clicks it. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var token = '';
  function takeToken() {
    var m = /(?:^|&)token=([^&]+)/.exec(location.hash.replace(/^#/, ''));
    try { token = m ? decodeURIComponent(m[1]) : ''; } catch (e) { token = ''; }
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  }
  takeToken();

  function view(id) { ['stProcessing', 'stOk', 'stProblem'].forEach(function (x) { $('#' + x).hidden = x !== id; }); }
  function post(action, data) {
    return fetch('/api/auth', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ action: action }, data)) })
      .then(function (res) { return res.json().then(function (b) { return { status: res.status, body: b }; }, function () { return { status: res.status, body: {} }; }); },
            function () { return { status: 0, body: {} }; });
  }

  var PROBLEMS = {
    link_expired: ['warn', 'This link has expired', 'Verification links last 15 minutes. Enter your email address below and we will send you a new one.'],
    link_used: ['warn', 'This link was already used', 'If you have already verified your email, you can sign in now. Otherwise, enter your email address and we will send a new link (a newer email replaces older ones).'],
    invalid_link: ['bad', 'This link is not valid', 'It may be incomplete, or copied incorrectly from the email. Enter your email address below to get a new verification link.'],
    too_many_attempts: ['bad', 'Too many attempts', 'Please wait a few minutes before trying again.'],
    unreachable: ['bad', 'We could not reach the server', 'Check your connection and try again. Your link has not been used up.'],
    unavailable: ['bad', 'Verification is unavailable', 'Email verification is not set up yet. Please contact the site administrator.']
  };
  function problem(code) {
    var p = PROBLEMS[code] || PROBLEMS.invalid_link;
    $('#pIcon').setAttribute('class', 'v-icon v-' + p[0]);
    $('#pIcon').innerHTML = p[0] === 'bad' ? '<circle cx="32" cy="32" r="28"/><path d="M22 22l20 20M42 22L22 42"/>' : '<circle cx="32" cy="32" r="28"/><path d="M32 18v18M32 44v2"/>';
    $('#pTitle').textContent = p[1]; $('#pMsg').textContent = p[2];
    var noForm = code === 'too_many_attempts' || code === 'unreachable' || code === 'unavailable';
    $('#resendForm').hidden = noForm;
    $('#retryBtn').hidden = code !== 'unreachable';
    $('#toSignin').textContent = code === 'link_used' ? 'Sign In' : 'Back to Sign In';
    view('stProblem');
  }

  function verify() {
    view('stProcessing');
    if (!token) { problem('invalid_link'); return; }
    post('verify-email', { token: token }).then(function (r) {
      var b = r.body || {};
      if (r.status === 200 && b.ok) {
        $('#okName').textContent = b.user.fullName; $('#okUser').textContent = b.user.username;
        $('#okMsg').textContent = 'Thank you, ' + b.user.fullName.split(' ')[0] + '. Your account is now active.';
        token = ''; view('stOk'); return;
      }
      if (r.status === 0) return problem('unreachable');
      if (r.status === 429) return problem('too_many_attempts');
      if (r.status === 503) return problem('unavailable');
      problem(b.error === 'link_expired' || b.error === 'link_used' ? b.error : 'invalid_link');
    });
  }
  $('#retryBtn').addEventListener('click', verify);

  /* ---- request a new link, with a 60 second cooldown ---- */
  var RE = /^[a-z0-9._%+'-]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/, timer = null;
  function banner(kind, text) { var b = $('#rsBanner'); if (!kind) { b.hidden = true; return; } b.className = 'auth-banner ' + kind; b.textContent = text; b.hidden = false; }
  function cool(sec) {
    var btn = $('#rsBtn'), txt = btn.querySelector('.btn-txt'), left = sec;
    clearInterval(timer);
    function t() { if (left > 0) { btn.disabled = true; txt.textContent = 'Send again in ' + left + 's'; left--; } else { btn.disabled = false; txt.textContent = 'Send a new verification email'; clearInterval(timer); } }
    t(); if (sec > 0) timer = setInterval(t, 1000);
  }
  $('#resendForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = $('#rsEmail').closest('.af'), msg = f.querySelector('.af-msg'), v = $('#rsEmail').value.trim().toLowerCase();
    banner(); f.classList.remove('is-err'); msg.textContent = '';
    if (!v || !RE.test(v) || /\.\./.test(v)) { f.classList.add('is-err'); msg.textContent = 'Enter a valid email address, like name@example.com.'; $('#rsEmail').focus(); return; }
    var btn = $('#rsBtn'); btn.disabled = true; btn.classList.add('is-busy'); btn.querySelector('.btn-txt').textContent = 'Sending…';
    post('resend-verification', { email: v }).then(function (r) {
      btn.classList.remove('is-busy');
      var b = r.body || {};
      if (r.status === 200) { banner('ok', 'If an unverified account matches that address, a new verification email is on its way. Older links no longer work.'); cool(b.resendAfter || 60); }
      else if (r.status === 429) { banner('info', b.message || 'Please wait a minute before requesting another email.'); cool(60); }
      else if (r.status === 400 && b.errors && b.errors.email) { f.classList.add('is-err'); msg.textContent = b.errors.email; cool(0); }
      else { banner('err', b.message || 'Could not send the email. Please try again.'); cool(0); }
    });
  });

  verify();
  /* A second link pasted into a tab that is already on this page only changes the # part, so listen for that too. */
  window.addEventListener('hashchange', function () { if (/token=/.test(location.hash)) { takeToken(); verify(); } });
})();
