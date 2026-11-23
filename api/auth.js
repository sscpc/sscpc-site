/* SSCPC / SSCK Photography admin authentication API (Vercel serverless function).
   POST /api/auth  with JSON { action, ... }
     check-username       { username }                                                     is this username free?
     register             { fullName, username, email, passkey, confirmPasskey, acceptTerms }
                          creates a PENDING General User account and emails a verification link (magic link)
     verify-email         { token }                                                        activates the account (single-use, 15 minutes)
     resend-verification  { email | username }                                             sends a fresh link (old one stops working)
     signin               { username, passkey }                                            verifies both, then starts a session (HttpOnly cookie)
     session              {}                                                               who is signed in? (also returns the CSRF token)
     logout               {}   + X-CSRF-Token header                                       ends the session
   GET  /api/auth  -> { ok, configured, emailConfigured }

   The shared passkey is only ever compared here, against its hash. Pending accounts can never sign in. */
const crypto = require('crypto');
const { send, sameOrigin, isJson, readBody, ipKey } = require('./_lib/http');
const { checkUsername, checkFullName, checkPasskey, checkEmail, maskEmail, normalizeUsername } = require('./_lib/validate');
const { getConfig, activeConfig } = require('./_lib/config');
const { accessFor } = require('./_lib/permissions');
const { verifyEmail, welcomeEmail } = require('./_lib/emails');
const { sendMail } = require('./_lib/mailer');
const M = require('./_lib/magic');
const S = require('./_lib/session');

const FAIL_LIMIT = 8, FAIL_WINDOW = 900;            // wrong passkeys per IP per 15 minutes
const FAIL_DAY_LIMIT = 30, FAIL_DAY_WINDOW = 86400; // ... and per day
const CHECK_LIMIT = 40, CHECK_WINDOW = 300;         // availability checks per IP per 5 minutes
const REG_LIMIT = 5, REG_WINDOW = 3600;             // registrations per IP per hour
const MAIL_IP_LIMIT = 20, MAIL_LIMIT = 5, MAIL_WINDOW = 3600, COOLDOWN = 60; // verification emails
const VERIFY_FAIL_LIMIT = 30, VERIFY_FAIL_WINDOW = 900;                      // bad links per IP

const publicUser = u => ({ username: u.username, fullName: u.fullName, email: u.email || null, role: u.role, status: u.status });

function createHandler(deps) {
  const { store, verifyPasskey } = deps;
  const cfgOf = deps.getConfig || getConfig;
  const now = deps.now || Date.now;
  const mailer = deps.mailer || ((msg, cfg) => sendMail(msg, cfg));

  return async function handler(req, res) {
    try {
      if (req.method === 'GET') { const c = cfgOf(); return send(res, 200, { ok: true, configured: c.ok, emailConfigured: !!c.emailConfigured }); }
      if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method_not_allowed' }, { Allow: 'GET, POST' });
      if (!sameOrigin(req)) return send(res, 403, { ok: false, error: 'forbidden' });
      if (!isJson(req)) return send(res, 415, { ok: false, error: 'unsupported_media_type' });

      const cfg = await activeConfig(cfgOf, store);
      if (!cfg.ok) {
        console.error('[auth] not configured. Missing:', cfg.missing.join(', '));
        return send(res, 503, { ok: false, error: 'not_configured', message: 'Sign-in is not set up yet. Please contact the site administrator.' });
      }

      let body;
      try { body = await readBody(req); } catch (e) { return send(res, 400, { ok: false, error: 'bad_request', message: 'The request could not be read.' }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { ok: false, error: 'bad_request', message: 'The request could not be read.' });

      const ip = ipKey(req, cfg.secret);
      const ua = String(req.headers['user-agent'] || '');
      const ctx = { store, cfg, now };
      if (Math.random() < 0.02) store.purgeAttempts().catch(() => {});
      const event = (type, username, userId, detail) => store.recordEvent({ type, username, userId, ipHash: ip, userAgent: ua, detail }).catch(() => {});

      const blocked = async (bucket, limit, win) => (await store.countAttempts(bucket, win)) >= limit;
      const tooMany = (win, msg) => send(res, 429, { ok: false, error: 'too_many_attempts', retryAfter: win, message: msg || 'Too many attempts. Please wait a few minutes and try again.' }, { 'Retry-After': String(win) });
      const sessionBody = (user, csrf) => ({ ok: true, authenticated: true, user: publicUser(user), access: accessFor(user.role), csrf });
      const keyOf = v => crypto.createHmac('sha256', cfg.secret).update('mailkey:' + v).digest('hex').slice(0, 32);
      const passkeyBlocked = async () => (await blocked('pkfail:' + ip, FAIL_LIMIT, FAIL_WINDOW)) || (await blocked('pkfail:' + ip, FAIL_DAY_LIMIT, FAIL_DAY_WINDOW));

      /* Creates a fresh token (every earlier one stops working) and emails the link. Throws if the email cannot be sent. */
      async function issueAndSend(user) {
        const t = M.newToken(cfg.magicSecret), n = now();
        await store.issueVerificationToken({ userId: user.id, tokenHash: t.tokenHash, createdAt: n, expiresAt: n + M.TTL_MS, ipHash: ip });
        await mailer(Object.assign({ to: user.email, toName: user.fullName }, verifyEmail({ name: user.fullName, link: M.linkFor(cfg.appUrl, t.token) })), cfg);
      }
      const mailBuckets = (id, key) => ['resend:' + key, 'mail:' + key, 'mailip:' + ip].concat(id ? ['mailacct:' + id] : []);
      const countMail = (id, key) => Promise.all(mailBuckets(id, key).map(b => store.addAttempt(b)));

      switch (body.action) {

        case 'check-username': {
          if (await blocked('check:' + ip, CHECK_LIMIT, CHECK_WINDOW)) return tooMany(CHECK_WINDOW);
          await store.addAttempt('check:' + ip);
          const u = checkUsername(body.username);
          if (!u.ok) return send(res, 200, { ok: true, available: false, reason: u.reason, message: u.message });
          const taken = await store.usernameTaken(u.value);
          return send(res, 200, taken
            ? { ok: true, available: false, reason: 'taken', message: 'That username is already taken.' }
            : { ok: true, available: true });
        }

        case 'register': {
          // Only these fields are ever read. A role or status sent by the client is ignored: new accounts are always General Users.
          const name = checkFullName(body.fullName), user = checkUsername(body.username), email = checkEmail(body.email), pk = checkPasskey(body.passkey);
          const errors = {};
          if (!name.ok) errors.fullName = name.message;
          if (!user.ok) errors.username = user.message;
          if (!email.ok) errors.email = email.message;
          if (!pk.ok) errors.passkey = pk.message;
          else if (typeof body.confirmPasskey !== 'string' || body.confirmPasskey.trim() !== pk.value) errors.confirmPasskey = 'The passkeys do not match.';
          if (body.acceptTerms !== true) errors.terms = 'Please accept the Terms and Conditions.';
          if (Object.keys(errors).length) return send(res, 400, { ok: false, error: 'validation', errors });

          if (!cfg.emailConfigured) {
            console.error('[auth] email verification is not configured (BREVO_API_KEY, BREVO_FROM_EMAIL, MAGIC_LINK_SECRET, APP_URL)');
            return send(res, 503, { ok: false, error: 'email_not_configured', message: 'Email verification is not set up yet. Please contact the site administrator.' });
          }
          const ek = keyOf(email.value);
          if (await passkeyBlocked()) return tooMany(FAIL_WINDOW);
          if (await blocked('register:' + ip, REG_LIMIT, REG_WINDOW)) return tooMany(REG_WINDOW);
          if ((await blocked('resend:' + ek, 1, COOLDOWN)) || (await blocked('mail:' + ek, MAIL_LIMIT, MAIL_WINDOW)) || (await blocked('mailip:' + ip, MAIL_IP_LIMIT, MAIL_WINDOW))) return tooMany(COOLDOWN, 'A verification email was just sent. Please wait a minute before trying again.');

          // Nothing about existing accounts is revealed until the shared passkey is proven.
          if (!(await verifyPasskey(pk.value, cfg.passkeyHash))) {
            await store.addAttempt('pkfail:' + ip);
            return send(res, 401, { ok: false, error: 'invalid_passkey', message: 'That shared passkey is not correct.' });
          }
          const taken = (field, msg) => send(res, 409, { ok: false, error: field + '_taken', message: msg, errors: { [field]: msg } });
          const byEmail = await store.findUserByEmail(email.value), byName = await store.findUser(user.value);
          let acct;
          if (byEmail) {
            if (byEmail.status !== 'pending' || byEmail.emailVerifiedAt) return taken('email', 'An account with this email already exists.');
            if (byName && String(byName.id) !== String(byEmail.id)) return taken('username', 'That username is already taken.');
            acct = byEmail;      // an unverified registration for the same email: refresh its details and send a new link
            if (byEmail.username !== user.value || byEmail.fullName !== name.value) {
              acct = await store.updateUser(byEmail.id, { username: user.value, fullName: name.value });
              if (!acct) return taken('username', 'That username is already taken.');
            }
          } else if (byName) {
            // The username belongs to a registration that was never verified. Once its 15 minute link window has passed it is
            // treated as abandoned (typo in the email, closed tab) and may be refreshed by a new registration; until then it is protected.
            const unverified = byName.status === 'pending' && !byName.emailVerifiedAt;
            if (!unverified) return taken('username', 'That username is already taken.');
            if (now() - byName.createdAt <= M.TTL_MS) return taken('username', 'That username is reserved for a registration waiting for email verification. Choose another, or try again in 15 minutes.');
            acct = await store.updateUser(byName.id, { email: email.value, fullName: name.value });
            if (!acct) return taken('email', 'An account with this email already exists.');
          } else {
            acct = await store.createPendingUser({ username: user.value, fullName: name.value, email: email.value, termsAcceptedAt: now() });
            if (!acct) return taken('username', 'That username or email was just taken. Please try again.');
          }

          let emailSent = true;
          try { await issueAndSend(acct); } catch (e) { emailSent = false; console.error('[auth] verification email failed:', (e && e.message) || 'unknown'); }
          await store.addAttempt('register:' + ip);
          if (emailSent) await countMail(acct.id, ek);
          event('register', acct.username, acct.id, emailSent ? 'verification email sent' : 'verification email FAILED');
          return send(res, 202, { ok: true, emailSent, email: maskEmail(email.value), resendAfter: COOLDOWN, expiresIn: M.TTL_MS / 1000 });
        }

        case 'verify-email': {
          if (await blocked('verifyfail:' + ip, VERIFY_FAIL_LIMIT, VERIFY_FAIL_WINDOW)) return tooMany(VERIFY_FAIL_WINDOW);
          const th = M.checkToken(body.token, cfg.magicSecret || '');
          if (!th) { await store.addAttempt('verifyfail:' + ip); return send(res, 400, { ok: false, error: 'invalid_link', message: 'This verification link is not valid.' }); }

          // One atomic step: mark the link used AND activate the pending account, or do neither.
          const user = await store.claimVerification(th, now());
          if (user) {
            let welcomeSent = true;
            try { await mailer(Object.assign({ to: user.email, toName: user.fullName }, welcomeEmail({ name: user.fullName, username: user.username, signInUrl: cfg.appUrl + '/admin/' })), cfg); }
            catch (e) { welcomeSent = false; console.error('[auth] welcome email failed:', (e && e.message) || 'unknown'); }
            event('email_verified', user.username, user.id);
            return send(res, 200, { ok: true, user: { username: user.username, fullName: user.fullName }, welcomeSent });
          }
          await store.addAttempt('verifyfail:' + ip);
          const row = await store.getVerificationToken(th);
          if (!row) return send(res, 400, { ok: false, error: 'invalid_link', message: 'This verification link is not valid.' });
          if (!row.usedAt && row.expiresAt <= now()) return send(res, 410, { ok: false, error: 'link_expired', message: 'This verification link has expired.' });
          return send(res, 410, { ok: false, error: 'link_used', message: 'This verification link has already been used, or was replaced by a newer email.' });
        }

        case 'resend-verification': {
          if (!cfg.emailConfigured) return send(res, 503, { ok: false, error: 'email_not_configured', message: 'Email verification is not set up yet. Please contact the site administrator.' });
          let ident, lookup;
          if (typeof body.email === 'string' && body.email.trim()) {
            const e = checkEmail(body.email);
            if (!e.ok) return send(res, 400, { ok: false, error: 'validation', errors: { email: e.message } });
            ident = e.value; lookup = () => store.findUserByEmail(e.value);
          } else {
            const u = checkUsername(body.username);
            if (!u.ok && u.reason !== 'reserved') return send(res, 400, { ok: false, error: 'validation', message: 'Enter the email address you registered with.' });
            ident = normalizeUsername(body.username); lookup = () => store.findUser(ident);
          }
          const key = keyOf(ident);
          // The same limits apply whether or not a matching account exists, so the answer reveals nothing.
          if (await blocked('mailip:' + ip, MAIL_IP_LIMIT, MAIL_WINDOW)) return tooMany(MAIL_WINDOW);
          if ((await blocked('resend:' + key, 1, COOLDOWN)) || (await blocked('mail:' + key, MAIL_LIMIT, MAIL_WINDOW))) return tooMany(COOLDOWN, 'Please wait a minute before requesting another email.');
          await store.addAttempt('resend:' + key); await store.addAttempt('mail:' + key); await store.addAttempt('mailip:' + ip);

          const acct = await lookup();
          if (acct && acct.status === 'pending' && !acct.emailVerifiedAt && acct.email &&
              !(await blocked('mailacct:' + acct.id, MAIL_LIMIT, MAIL_WINDOW)) && !(await blocked('mailacctcool:' + acct.id, 1, COOLDOWN))) {
            try { await issueAndSend(acct); await store.addAttempt('mailacct:' + acct.id); await store.addAttempt('mailacctcool:' + acct.id); event('verification_resent', acct.username, acct.id); }
            catch (e) { console.error('[auth] verification email failed:', (e && e.message) || 'unknown'); }
          }
          return send(res, 200, { ok: true, resendAfter: COOLDOWN, message: 'If an unverified account matches, a new verification email is on its way.' });
        }

        case 'signin': {
          const pk = checkPasskey(body.passkey);
          if (typeof body.username !== 'string' || !body.username.trim() || !pk.ok) {
            return send(res, 400, { ok: false, error: 'validation', message: 'Enter your username and the shared passkey.' });
          }
          const uname = normalizeUsername(body.username).slice(0, 24);
          if (await passkeyBlocked()) { event('signin_blocked', uname, null); return tooMany(FAIL_WINDOW); }

          // Both lookups always run, so response time does not reveal which half was wrong.
          const passkeyOk = await verifyPasskey(pk.value, cfg.passkeyHash);
          const found = await store.findUser(uname);
          if (!passkeyOk || !found) {
            await store.addAttempt('pkfail:' + ip);
            event('signin_fail', uname, found ? found.id : null);
            return send(res, 401, { ok: false, error: 'invalid_credentials', message: 'The username or passkey is incorrect.' });
          }
          if (found.status === 'suspended') { event('signin_blocked', uname, found.id); return send(res, 403, { ok: false, error: 'account_suspended', message: 'This account has been suspended. Please contact an administrator.' }); }
          if (found.status !== 'active') {
            event('signin_blocked', uname, found.id, 'email not verified');
            return send(res, 403, { ok: false, error: 'email_unverified', username: found.username, email: found.email ? maskEmail(found.email) : null,
              message: 'Please verify your email address first. Open the link we emailed you, or request a new one.' });
          }

          // Fresh session on every sign-in (prevents session fixation); any session this browser already had is ended.
          const old = S.readCookie(req, S.cookieName(req));
          if (S.validToken(old)) await store.deleteSession(S.hashToken(old));
          const sess = await S.createSession(req, { store, cfg, now, ipHash: ip, userId: found.id });
          await store.markLogin(found.id);
          event('signin_ok', uname, found.id);
          return send(res, 200, sessionBody(found, sess.csrf), { 'Set-Cookie': sess.cookie });
        }

        case 'session': {
          const r = await S.resolveSession(req, ctx);
          if (r.ok) return send(res, 200, sessionBody(r.user, r.csrf));
          const extra = r.reason === 'none' && !r.stale ? {} : { 'Set-Cookie': S.clearCookie(req) };
          return send(res, 200, { ok: true, authenticated: false, reason: r.reason === 'none' ? (r.stale ? 'expired' : 'none') : r.reason }, extra);
        }

        case 'logout': {
          const r = await S.resolveSession(req, ctx);
          if (r.ok) {
            if (!S.csrfOk(req, r.csrf)) return send(res, 403, { ok: false, error: 'csrf', message: 'Security check failed. Please reload the page and try again.' });
            await store.deleteSession(r.tokenHash);
            event('logout', r.user.username, r.user.id);
          }
          return send(res, 200, { ok: true }, { 'Set-Cookie': S.clearCookie(req) });
        }

        default:
          return send(res, 400, { ok: false, error: 'unknown_action' });
      }
    } catch (e) {
      console.error('[auth] error:', (e && (e.code || e.message)) || 'unknown');
      return send(res, 500, { ok: false, error: 'server_error', message: 'Something went wrong on our side. Please try again.' });
    }
  };
}

module.exports = createHandler({ store: require('./_lib/store'), verifyPasskey: require('./_lib/passkey').verifyPasskey });
module.exports.createHandler = createHandler;
module.exports.getConfig = getConfig;
