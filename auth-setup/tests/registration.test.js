const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { init, setup, PASSKEY } = require('./harness');
const { sendMail } = require('../../api/_lib/mailer');
const { getConfig } = require('../../api/_lib/config');
const { checkUsername, checkFullName, checkEmail } = require('../../api/_lib/validate');
const MIN = 60 * 1000;

test.before(init);
const verify = (t, token, o) => t.A({ action: 'verify-email', token }, o);

/* ---------- 1. registration with valid information ---------- */
test('valid registration creates a PENDING General User, emails a Brevo verification link, and exposes no secrets', async () => {
  const t = setup();
  const r = await t.A(t.reg());
  assert.equal(r.status, 202);
  assert.equal(r.body.emailSent, true);
  assert.equal(r.body.email, 'n***@example.com');
  assert.equal(r.body.resendAfter, 60);
  const u = t.store.users[0];
  assert.equal(u.status, 'pending'); assert.equal(u.role, 'general'); assert.equal(u.emailVerifiedAt, null);
  assert.equal(u.email, 'nimal@example.com');
  assert.equal(t.mails.length, 1);
  const m = t.mails[0];
  assert.equal(m.to, 'nimal@example.com');
  assert.match(m.text, /^Hello Nimal,/);
  assert.ok(m.text.includes('https://ssckphotography.com/admin/verify.html#token='), 'link uses the primary domain');
  assert.ok(!/sscpc\.vercel\.app/.test(m.text + m.html), 'old domain is not used');
  assert.match(m.html, />Verify Email</); assert.match(m.html, /SSCK Photography/); assert.match(m.text, /15 minutes/); assert.match(m.text, /ignore this email/);
  const everything = JSON.stringify(r.body) + m.text + m.html + JSON.stringify(t.store.users) + JSON.stringify(t.store.tokens);
  assert.ok(!everything.includes(PASSKEY), 'passkey never appears in a response, an email or storage');
  assert.ok(!JSON.stringify(r.body).includes(t.lastToken()), 'the token is only ever in the email');
});

test('only the SHA-256 hash of the token is stored, and it expires in 15 minutes', async () => {
  const t = setup();
  await t.A(t.reg());
  const token = t.lastToken(), row = t.store.tokens[0];
  assert.equal(row.tokenHash, crypto.createHash('sha256').update(token).digest('hex'));
  assert.ok(!JSON.stringify(t.store.tokens).includes(token));
  assert.equal(row.expiresAt - row.createdAt, 15 * MIN);
  assert.equal(row.usedAt, null);
});

/* ---------- 2-4. duplicates and mismatches ---------- */
test('existing email is rejected (even in a different case), and no email is sent', async () => {
  const t = setup();
  t.seed('already.here', { email: 'nimal@example.com' });
  const r = await t.A(t.reg({ email: 'NIMAL@Example.com' }));
  assert.equal(r.status, 409); assert.equal(r.body.error, 'email_taken'); assert.ok(r.body.errors.email);
  assert.equal(t.mails.length, 0); assert.equal(t.store.users.length, 1);
});

test('existing username is rejected (case-insensitive), including a username held by a pending account', async () => {
  const t = setup();
  t.seed('nimal.p', { email: 'other@example.com' });
  let r = await t.A(t.reg({ username: 'NIMAL.P' }));
  assert.equal(r.status, 409); assert.equal(r.body.error, 'username_taken');
  const t2 = setup();
  assert.equal((await t2.A(t2.reg())).status, 202);
  r = await t2.A(t2.reg({ email: 'different@example.com' }), { ip: '2.2.2.2' });
  assert.equal(r.status, 409); assert.equal(r.body.error, 'username_taken');
  assert.equal(t2.store.users.length, 1);
});

test('mismatched passkeys are rejected by the backend: nothing is created or sent', async () => {
  const t = setup();
  const r = await t.A(t.reg({ confirmPasskey: PASSKEY + 'x' }));
  assert.equal(r.status, 400); assert.equal(r.body.errors.confirmPasskey, 'The passkeys do not match.');
  assert.equal((await t.A(t.reg({ confirmPasskey: undefined }))).status, 400);
  assert.equal(t.store.users.length, 0); assert.equal(t.mails.length, 0);
});

test('incorrect shared passkey is rejected before anything is created or emailed', async () => {
  const t = setup();
  const r = await t.A(t.reg({ passkey: 'not the passkey', confirmPasskey: 'not the passkey' }));
  assert.equal(r.status, 401); assert.equal(r.body.error, 'invalid_passkey');
  assert.equal(t.store.users.length, 0); assert.equal(t.mails.length, 0);
});

test('field validation: invalid email, names, usernames, missing fields and terms', async () => {
  const t = setup();
  for (const email of ['no-at.com', 'a@b', 'a..b@x.com', '', 'x@y.c', 'sp ace@x.com']) assert.ok((await t.A(t.reg({ email }))).body.errors.email, email);
  const r = await t.A({ action: 'register', fullName: '', username: 'a', email: '', passkey: '', acceptTerms: false });
  assert.deepEqual(Object.keys(r.body.errors).sort(), ['email', 'fullName', 'passkey', 'terms', 'username']);
  assert.equal((await t.A(t.reg({ acceptTerms: 'true' }))).status, 400);
  assert.equal((await t.A(t.reg({ username: 'admin' }))).status, 400);
  assert.equal(t.store.users.length, 0);
});

test('public registration can never choose a role or status', async () => {
  const t = setup();
  const r = await t.A(t.reg({ role: 'super_admin', status: 'active', isAdmin: true, emailVerifiedAt: 1, user: { role: 'admin' } }));
  assert.equal(r.status, 202);
  assert.equal(t.store.users[0].role, 'general'); assert.equal(t.store.users[0].status, 'pending'); assert.equal(t.store.users[0].emailVerifiedAt, null);
});

/* ---------- 5. Brevo ---------- */
test('the real mailer calls the Brevo transactional API with the api-key header and the configured sender', async () => {
  const calls = [];
  const cfg = getConfig({ AUTH_SECRET: 'a'.repeat(32), DATABASE_URL: 'x', BREVO_API_KEY: 'xkeysib-TEST', BREVO_FROM_EMAIL: 'verify@auth.ssckphotography.com', BREVO_FROM_NAME: 'SSCK Photography', APP_URL: 'https://ssckphotography.com/', MAGIC_LINK_SECRET: 'm'.repeat(40) });
  assert.equal(cfg.emailConfigured, true); assert.equal(cfg.appUrl, 'https://ssckphotography.com');
  await sendMail({ to: 'a@b.co', toName: 'A B', subject: 'S', html: '<p>h</p>', text: 't' }, cfg, async (url, opts) => { calls.push({ url, opts }); return { ok: true, status: 201 }; });
  assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(calls[0].opts.method, 'POST');
  assert.equal(calls[0].opts.headers['api-key'], 'xkeysib-TEST');
  const body = JSON.parse(calls[0].opts.body);
  assert.deepEqual(body.sender, { name: 'SSCK Photography', email: 'verify@auth.ssckphotography.com' });
  assert.deepEqual(body.to, [{ email: 'a@b.co', name: 'A B' }]);
  assert.equal(body.subject, 'S'); assert.equal(body.htmlContent, '<p>h</p>'); assert.equal(body.textContent, 't');
  assert.ok(!calls[0].opts.body.includes('xkeysib-TEST'), 'the API key is a header only, never in the body');
  await assert.rejects(sendMail({ to: 'a@b.co', subject: 'S', html: 'h', text: 't' }, cfg, async () => ({ ok: false, status: 401 })), /mail_provider_status_401/);
});

test('email delivery is only "configured" when every required variable is present and sane', () => {
  const base = { AUTH_SECRET: 'a'.repeat(32), DATABASE_URL: 'x', BREVO_API_KEY: 'k', BREVO_FROM_EMAIL: 'verify@auth.ssckphotography.com', APP_URL: 'https://ssckphotography.com', MAGIC_LINK_SECRET: 'm'.repeat(40) };
  assert.equal(getConfig(base).emailConfigured, true);
  for (const bad of [{ BREVO_API_KEY: '' }, { BREVO_FROM_EMAIL: 'nope' }, { MAGIC_LINK_SECRET: 'short' }, { APP_URL: 'http://ssckphotography.com' }, { APP_URL: '' }]) assert.equal(getConfig(Object.assign({}, base, bad)).emailConfigured, false, JSON.stringify(bad));
  assert.equal(getConfig(base).fromName, 'SSCK Photography');
});

test('when email is not configured, registration fails honestly and creates nothing', async () => {
  const t = setup(); t.cfg.emailConfigured = false;
  const r = await t.A(t.reg());
  assert.equal(r.status, 503); assert.equal(r.body.error, 'email_not_configured');
  assert.equal(t.store.users.length, 0);
});

test('if Brevo fails, the account stays pending, the user is told, and "resend" can recover', async () => {
  const t = setup(); t.state.mailFails = true;
  const r = await t.A(t.reg());
  assert.equal(r.status, 202); assert.equal(r.body.emailSent, false);
  assert.equal(t.store.users[0].status, 'pending');
  t.state.mailFails = false; t.clock.t += 61 * 1000;
  assert.equal((await t.A({ action: 'resend-verification', email: 'nimal@example.com' })).status, 200);
  assert.equal(t.mails.length, 1);
  assert.equal((await verify(t, t.lastToken())).status, 200);
});

/* ---------- 6-7. opening a valid link activates the account ---------- */
test('a valid link activates the account, records the verification time, sends the welcome email, and does not sign anyone in', async () => {
  const t = setup();
  await t.A(t.reg());
  t.clock.t += 5 * MIN;
  const r = await verify(t, t.lastToken());
  assert.equal(r.status, 200); assert.equal(r.body.user.username, 'nimal.p');
  assert.equal(r.headers['Set-Cookie'], undefined, 'verifying does not create a session');
  const u = t.store.users[0];
  assert.equal(u.status, 'active'); assert.equal(u.emailVerifiedAt, t.clock.t); assert.equal(u.role, 'general');
  assert.equal(t.mails.length, 2);
  const w = t.mails[1];
  assert.equal(w.subject, 'Welcome to the SSCPC Admin Portal!');
  assert.match(w.text, /Hello Nimal Perera/); assert.match(w.text, /successful/); assert.match(w.text, /verified/); assert.match(w.text, /nimal\.p/);
  assert.ok(w.text.includes('https://ssckphotography.com/admin/')); assert.match(w.text, /SSCK Photography Administration Team/);
  assert.ok(!(w.text + w.html).includes(PASSKEY));
  assert.ok(t.store.events.some(e => e.type === 'email_verified'));
});

/* ---------- 8. replay ---------- */
test('the same link cannot be used twice (single use), and no second welcome email is sent', async () => {
  const t = setup();
  await t.A(t.reg());
  const token = t.lastToken();
  assert.equal((await verify(t, token)).status, 200);
  const again = await verify(t, token);
  assert.equal(again.status, 410); assert.equal(again.body.error, 'link_used');
  assert.equal(t.mails.length, 2);
});

test('two simultaneous clicks on one link activate exactly once', async () => {
  const t = setup();
  await t.A(t.reg());
  const token = t.lastToken();
  const results = await Promise.all([verify(t, token), verify(t, token, { ip: '3.3.3.3' }), verify(t, token, { ip: '4.4.4.4' })]);
  assert.equal(results.filter(r => r.status === 200).length, 1);
  assert.equal(t.mails.filter(m => /Welcome/.test(m.subject)).length, 1);
});

/* ---------- 9. expiry ---------- */
test('an expired link is refused with a friendly error and the account stays pending', async () => {
  const t = setup();
  await t.A(t.reg());
  const token = t.lastToken();
  t.clock.t += 15 * MIN + 1000;
  const r = await verify(t, token);
  assert.equal(r.status, 410); assert.equal(r.body.error, 'link_expired');
  assert.equal(t.store.users[0].status, 'pending');
});

test('a link still works just before the 15 minute limit', async () => {
  const t = setup();
  await t.A(t.reg());
  const token = t.lastToken();
  t.clock.t += 14 * MIN + 59 * 1000;
  assert.equal((await verify(t, token)).status, 200);
});

test('forged, tampered, truncated and wrong-secret tokens are invalid and never touch an account', async () => {
  const t = setup();
  await t.A(t.reg());
  const good = t.lastToken();
  const forged = crypto.randomBytes(32).toString('base64url') + '.' + crypto.randomBytes(16).toString('base64url').slice(0, 22);
  for (const bad of [forged, good.slice(0, -1) + (good.endsWith('A') ? 'B' : 'A'), good.slice(0, 30), '', null, 42, {}, good.split('.')[0], 'x'.repeat(66)]) {
    const r = await verify(t, bad);
    assert.equal(r.status, 400, String(bad).slice(0, 20)); assert.equal(r.body.error, 'invalid_link');
  }
  assert.equal(t.store.users[0].status, 'pending');
  t.cfg.magicSecret = 'z'.repeat(40);                              // a token signed under another secret
  assert.equal((await verify(t, good)).status, 400);
});

test('repeated bad links from one IP are rate limited', async () => {
  const t = setup();
  for (let i = 0; i < 30; i++) await verify(t, 'x'.repeat(66), { ip: '9.9.9.9' });
  assert.equal((await verify(t, 'x'.repeat(66), { ip: '9.9.9.9' })).status, 429);
});

/* ---------- 10. resend, cooldown, invalidation ---------- */
test('resend has a 60 second cooldown, then sends a new link and invalidates the previous one', async () => {
  const t = setup();
  await t.A(t.reg());
  const first = t.lastToken();
  let r = await t.A({ action: 'resend-verification', email: 'nimal@example.com' });
  assert.equal(r.status, 429); assert.equal(t.mails.length, 1);
  t.clock.t += 61 * 1000;
  r = await t.A({ action: 'resend-verification', email: 'nimal@example.com' });
  assert.equal(r.status, 200); assert.equal(t.mails.length, 2);
  const second = t.lastToken();
  assert.notEqual(first, second);
  assert.equal((await verify(t, first)).body.error, 'link_used');      // old link is dead
  assert.equal((await verify(t, second)).status, 200);                 // new link works
});

test('resend by username works too (used from the sign-in screen)', async () => {
  const t = setup();
  await t.A(t.reg());
  t.clock.t += 61 * 1000;
  assert.equal((await t.A({ action: 'resend-verification', username: 'nimal.p' })).status, 200);
  assert.equal(t.mails.length, 2);
});

test('resend answers identically for unknown and active accounts, and sends nothing for them', async () => {
  const t = setup();
  t.seed('active.one', { email: 'active@example.com' });
  const unknown = await t.A({ action: 'resend-verification', email: 'ghost@example.com' });
  const active = await t.A({ action: 'resend-verification', email: 'active@example.com' });
  assert.equal(unknown.status, 200); assert.deepEqual(unknown.body, active.body);
  assert.equal(t.mails.length, 0);
  assert.equal((await t.A({ action: 'resend-verification', email: 'ghost@example.com' })).status, 429);   // same cooldown for everyone
});

test('verification emails are capped per email address per hour', async () => {
  const t = setup();
  await t.A(t.reg());
  for (let i = 0; i < 4; i++) { t.clock.t += 61 * 1000; assert.equal((await t.A({ action: 'resend-verification', email: 'nimal@example.com' })).status, 200); }
  t.clock.t += 61 * 1000;
  assert.equal((await t.A({ action: 'resend-verification', email: 'nimal@example.com' })).status, 429);
  assert.equal(t.mails.length, 5);
});

test('a mistyped email does not lock the username forever: after the 15 minute window a new registration can refresh it, and the old link dies', async () => {
  const t = setup();
  await t.A(t.reg({ email: 'typo@exmaple.com' }));
  const oldLink = t.lastToken();
  let r = await t.A(t.reg({ email: 'nimal@example.com' }), { ip: '2.2.2.2' });          // too soon: protected
  assert.equal(r.status, 409); assert.match(r.body.message, /waiting for email verification/);
  t.clock.t += 16 * 60 * 1000;
  r = await t.A(t.reg({ email: 'nimal@example.com' }), { ip: '2.2.2.2' });
  assert.equal(r.status, 202);
  assert.equal(t.store.users.length, 1); assert.equal(t.store.users[0].email, 'nimal@example.com'); assert.equal(t.store.users[0].status, 'pending');
  assert.equal(t.mails[1].to, 'nimal@example.com');
  assert.equal((await verify(t, oldLink)).status, 410);                                  // the typo address's link no longer works
  assert.equal((await verify(t, t.lastToken())).status, 200);
});

test('an ACTIVE account\'s username can never be taken over this way', async () => {
  const t = setup();
  t.seed('nimal.p', { email: 'real@example.com' });
  t.clock.t += 60 * 60 * 1000;
  const r = await t.A(t.reg({ email: 'attacker@example.com' }));
  assert.equal(r.status, 409); assert.equal(t.store.users[0].email, 'real@example.com'); assert.equal(t.mails.length, 0);
});

test('registering again with the same email while unverified refreshes the details and replaces the old link', async () => {
  const t = setup();
  await t.A(t.reg());
  const first = t.lastToken();
  t.clock.t += 61 * 1000;
  const r = await t.A(t.reg({ fullName: 'Nimal P Perera', username: 'nimal.perera' }));
  assert.equal(r.status, 202);
  assert.equal(t.store.users.length, 1); assert.equal(t.store.users[0].username, 'nimal.perera'); assert.equal(t.store.users[0].fullName, 'Nimal P Perera');
  assert.equal((await verify(t, first)).body.error, 'link_used');
  assert.equal((await verify(t, t.lastToken())).status, 200);
});

test('registrations per IP and wrong-passkey guesses are rate limited', async () => {
  const t = setup();
  for (let i = 0; i < 5; i++) { assert.equal((await t.A(t.reg({ username: 'person' + 'abcde'[i], email: 'p' + i + '@example.com' }))).status, 202); }
  assert.equal((await t.A(t.reg({ username: 'personz', email: 'z@example.com' }))).status, 429);
  const t2 = setup();
  for (let i = 0; i < 8; i++) assert.equal((await t2.A(t2.reg({ passkey: 'bad' + i + 'bad', confirmPasskey: 'bad' + i + 'bad' }))).status, 401);
  assert.equal((await t2.A(t2.reg())).status, 429);
});

/* ---------- 11-12. signing in; pending accounts have no access ---------- */
test('after verification the user can sign in; before it, they cannot and get a clear explanation', async () => {
  const t = setup();
  await t.A(t.reg());
  let r = await t.A({ action: 'signin', username: 'nimal.p', passkey: PASSKEY });
  assert.equal(r.status, 403); assert.equal(r.body.error, 'email_unverified'); assert.equal(r.body.email, 'n***@example.com');
  assert.equal(r.headers['Set-Cookie'], undefined);
  assert.equal(t.store.sessions.length, 0);
  assert.equal((await verify(t, t.lastToken())).status, 200);
  r = await t.A({ action: 'signin', username: 'nimal.p', passkey: PASSKEY });
  assert.equal(r.status, 200); assert.equal(r.body.user.role, 'general'); assert.equal(r.body.access.landing, 'account');
  assert.ok(r.headers['Set-Cookie']);
});

test('a wrong passkey for a pending account is not told it is unverified (credentials are checked first)', async () => {
  const t = setup();
  await t.A(t.reg());
  const r = await t.A({ action: 'signin', username: 'nimal.p', passkey: 'wrong wrong wrong' });
  assert.equal(r.status, 401); assert.equal(r.body.error, 'invalid_credentials');
});

test('an unverified account can never reach protected features: no session, no admin API, and any session is dropped', async () => {
  const t = setup();
  await t.A(t.reg());
  assert.equal((await t.A({ action: 'session' })).body.authenticated, false);
  assert.equal((await t.M({ action: 'inbox' })).status, 401);
  const live = await t.login('boss', { role: 'admin' });                 // a signed-in account that becomes pending is cut off at once
  t.store.users.find(u => u.username === 'boss').status = 'pending';
  assert.equal((await t.A({ action: 'session' }, { cookie: live.cookie })).body.authenticated, false);
  assert.equal((await t.M({ action: 'inbox' }, { cookie: live.cookie, headers: { 'x-csrf-token': live.csrf } })).status, 401);
});

/* ---------- 13. existing administrators are untouched ---------- */
test('existing administrator accounts (no email on file) still sign in and use the portal', async () => {
  const t = setup();
  t.seed('old.admin', { role: 'admin', email: null, emailVerifiedAt: null });
  const l = await t.login('old.admin');
  assert.equal(l.res.status, 200);
  assert.equal((await t.M({ action: 'inbox' }, { cookie: l.cookie, headers: { 'x-csrf-token': l.csrf } })).status, 200);
});

/* ---------- username availability and validators ---------- */
test('check-username reports available, taken (including pending accounts), invalid and reserved', async () => {
  const t = setup();
  await t.A(t.reg());
  assert.deepEqual((await t.A({ action: 'check-username', username: 'fresh.name' })).body, { ok: true, available: true });
  assert.equal((await t.A({ action: 'check-username', username: 'Nimal.P' })).body.reason, 'taken');
  assert.equal((await t.A({ action: 'check-username', username: '9x' })).body.reason, 'invalid');
  assert.equal((await t.A({ action: 'check-username', username: 'admin' })).body.reason, 'reserved');
});

test('validators', () => {
  assert.equal(checkUsername('Nimal.P').value, 'nimal.p');
  for (const bad of ['ab', '1abc', 'a b c', 'abc__d', 'abc.', 'x'.repeat(25)]) assert.equal(checkUsername(bad).ok, false, bad);
  assert.equal(checkFullName('  සුනිල්   පෙරේරා ').ok, true);
  assert.equal(checkFullName('Bot 123').ok, false);
  assert.equal(checkEmail(' Nimal.P+club@Gmail.com ').value, 'nimal.p+club@gmail.com');
});

test('cross-origin, non-JSON and bad methods are refused; unknown actions rejected', async () => {
  const t = setup();
  assert.equal((await t.A(t.reg(), { headers: { origin: 'https://evil.test' } })).status, 403);
  assert.equal((await t.A(t.reg(), { headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await t.A({}, { method: 'PUT' })).status, 405);
  assert.equal((await t.A({ action: 'nope' })).status, 400);
  const g = await t.A(null, { method: 'GET' });
  assert.deepEqual(g.body, { ok: true, configured: true, emailConfigured: true });
});
