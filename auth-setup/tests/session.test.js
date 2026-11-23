const test = require('node:test');
const assert = require('node:assert/strict');
const { init, setup, PASSKEY } = require('./harness');

test.before(init);
const HOUR = 3600 * 1000;

/* ---------- Sign in ---------- */
test('correct username and passkey: signs in, sets a hardened session cookie, tells the client where to go', async () => {
  const t = setup();
  const { res, cookie } = await t.login('nimal.p');
  assert.equal(res.status, 200);
  assert.equal(res.body.authenticated, true);
  assert.equal(res.body.user.username, 'nimal.p');
  assert.equal(res.body.access.landing, 'account');           // General User
  assert.ok(res.body.csrf && res.body.csrf.length >= 40);
  const set = res.headers['Set-Cookie'];
  assert.match(set, /^__Host-sscpc_sid=[A-Za-z0-9_-]{43};/);
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', 'Max-Age=604800']) assert.ok(set.includes(flag), flag);
  assert.ok(!/Domain=/i.test(set));
  assert.ok(cookie.length > 50);
});

test('sign-in response and stored data never contain the passkey, its hash or any secret', async () => {
  const t = setup();
  const { res, cookie } = await t.login('nimal.p');
  const blob = JSON.stringify(res.body) + JSON.stringify(t.store.users);
  for (const secret of [PASSKEY, t.cfg.passkeyHash, t.cfg.secret, t.cfg.upstreamSecret]) assert.ok(!blob.includes(secret));
  const token = cookie.split('=')[1];
  assert.ok(!JSON.stringify(t.store.sessions).includes(token), 'raw token must not be stored');
  assert.equal(t.store.sessions[0].tokenHash.length, 64);
});

test('incorrect username: rejected, no cookie, no session, audit event', async () => {
  const t = setup();
  await t.login('nimal.p');
  const r = await t.A({ action: 'signin', username: 'nobody.here', passkey: PASSKEY });
  assert.equal(r.status, 401);
  assert.equal(r.headers['Set-Cookie'], undefined);
  assert.equal(t.store.sessions.length, 1);                    // only the earlier legitimate one
  assert.ok(t.store.events.some(e => e.type === 'signin_fail' && e.username === 'nobody.here'));
});

test('incorrect shared passkey: rejected with the same response as a wrong username', async () => {
  const t = setup();
  await t.login('nimal.p');
  const wrongKey = await t.A({ action: 'signin', username: 'nimal.p', passkey: 'definitely wrong' });
  const wrongUser = await t.A({ action: 'signin', username: 'ghost.user', passkey: PASSKEY });
  assert.equal(wrongKey.status, 401);
  assert.deepEqual(wrongKey.body, wrongUser.body);
  assert.equal(wrongKey.headers['Set-Cookie'], undefined);
});

test('disabled accounts cannot sign in (suspended and pending)', async () => {
  const t = setup();
  t.seed('nimal.p');
  t.store.users[0].status = 'suspended';
  let r = await t.A({ action: 'signin', username: 'nimal.p', passkey: PASSKEY });
  assert.equal(r.status, 403); assert.equal(r.body.error, 'account_suspended'); assert.equal(r.headers['Set-Cookie'], undefined);
  t.store.users[0].status = 'pending';
  r = await t.A({ action: 'signin', username: 'nimal.p', passkey: PASSKEY });
  assert.equal(r.status, 403); assert.equal(r.body.error, 'email_unverified');
  assert.equal(t.store.sessions.length, 0);
});

test('a wrong passkey is not revealed as wrong for a suspended account (credentials checked first)', async () => {
  const t = setup();
  t.seed('nimal.p');
  t.store.users[0].status = 'suspended';
  const r = await t.A({ action: 'signin', username: 'nimal.p', passkey: 'wrong wrong wrong' });
  assert.equal(r.status, 401);
});

test('brute force: 8 wrong passkeys lock that IP out, even for the right passkey; other IPs unaffected', async () => {
  const t = setup();
  t.seed('nimal.p');
  for (let i = 0; i < 8; i++) assert.equal((await t.A({ action: 'signin', username: 'nimal.p', passkey: 'guess number ' + i }, { ip: '5.5.5.5' })).status, 401);
  const locked = await t.A({ action: 'signin', username: 'nimal.p', passkey: PASSKEY }, { ip: '5.5.5.5' });
  assert.equal(locked.status, 429); assert.ok(locked.headers['Retry-After']); assert.equal(locked.headers['Set-Cookie'], undefined);
  assert.equal((await t.A({ action: 'signin', username: 'nimal.p', passkey: PASSKEY }, { ip: '6.6.6.6' })).status, 200);
  t.clock.t += 16 * 60 * 1000;                                 // the 15 minute window passes
  assert.equal((await t.A({ action: 'signin', username: 'nimal.p', passkey: PASSKEY }, { ip: '5.5.5.5' })).status, 200);
});

test('a daily cap applies on top of the 15 minute limit', async () => {
  const t = setup();
  t.seed('nimal.p');
  for (let burst = 0; burst < 4; burst++) {
    for (let i = 0; i < 8; i++) await t.A({ action: 'signin', username: 'nimal.p', passkey: 'bad ' + burst + i }, { ip: '8.8.8.8' });
    t.clock.t += 16 * 60 * 1000;
  }
  const r = await t.A({ action: 'signin', username: 'nimal.p', passkey: PASSKEY }, { ip: '8.8.8.8' });
  assert.equal(r.status, 429);
});

/* ---------- Session persistence ---------- */
test('session persists across requests and the client can restore it (session action)', async () => {
  const t = setup();
  const { cookie, csrf } = await t.login('nimal.p');
  for (let i = 0; i < 3; i++) {
    t.clock.t += 20 * 60 * 1000;
    const r = await t.A({ action: 'session' }, { cookie });
    assert.equal(r.body.authenticated, true);
    assert.equal(r.body.user.username, 'nimal.p');
    assert.equal(r.body.csrf, csrf);                           // stable for the life of the session
  }
});

test('activity keeps a session alive past the idle limit; inactivity does not', async () => {
  const t = setup();
  const { cookie } = await t.login('nimal.p');
  for (let i = 0; i < 5; i++) { t.clock.t += 10 * HOUR; assert.equal((await t.A({ action: 'session' }, { cookie })).body.authenticated, true); }
  t.clock.t += 13 * HOUR;                                      // idle for longer than 12h
  const r = await t.A({ action: 'session' }, { cookie });
  assert.equal(r.body.authenticated, false); assert.equal(r.body.reason, 'expired');
});

/* ---------- Expiry ---------- */
test('expired sessions (absolute limit) are rejected and removed, even if active', async () => {
  const t = setup();
  const { cookie } = await t.login('nimal.p');
  for (let d = 0; d < 7; d++) { t.clock.t += 23 * HOUR; await t.A({ action: 'session' }, { cookie }); }
  t.clock.t += 2 * HOUR;                                       // now past 7 days from sign-in
  const r = await t.A({ action: 'session' }, { cookie });
  assert.equal(r.body.authenticated, false); assert.equal(r.body.reason, 'expired');
  assert.equal(t.store.sessions.length, 0);
  assert.match(r.headers['Set-Cookie'], /Max-Age=0/);          // browser is told to drop the cookie
});

test('expired session cannot call the admin API', async () => {
  const t = setup();
  const { cookie, csrf } = await t.login('boss', { role: 'admin' });
  t.clock.t += 13 * HOUR;
  const r = await t.M({ action: 'inbox' }, { cookie, headers: { 'x-csrf-token': csrf } });
  assert.equal(r.status, 401); assert.equal(r.body.reason, 'expired');
  assert.equal(t.upstreamCalls.length, 0);
});

/* ---------- Logout ---------- */
test('logout ends the session on the server, clears the cookie, and the old cookie is dead', async () => {
  const t = setup();
  const { cookie, csrf } = await t.login('nimal.p');
  const out = await t.A({ action: 'logout' }, { cookie, headers: { 'x-csrf-token': csrf } });
  assert.equal(out.status, 200);
  assert.match(out.headers['Set-Cookie'], /Max-Age=0/);
  assert.equal(t.store.sessions.length, 0);
  assert.ok(t.store.events.some(e => e.type === 'logout'));
  const replay = await t.A({ action: 'session' }, { cookie });  // attacker / back button replaying the old cookie
  assert.equal(replay.body.authenticated, false);
});

test('logout without the CSRF token is refused and the session survives', async () => {
  const t = setup();
  const { cookie } = await t.login('nimal.p');
  const r = await t.A({ action: 'logout' }, { cookie });
  assert.equal(r.status, 403);
  assert.equal(t.store.sessions.length, 1);
  const r2 = await t.A({ action: 'logout' }, { cookie, headers: { 'x-csrf-token': 'wrong-token' } });
  assert.equal(r2.status, 403);
});

test('logout when already signed out is harmless', async () => {
  const t = setup();
  const r = await t.A({ action: 'logout' });
  assert.equal(r.status, 200);
});

/* ---------- Immediate effect of account and passkey changes ---------- */
test('suspending an account ends its session immediately', async () => {
  const t = setup();
  const { cookie } = await t.login('nimal.p');
  assert.equal((await t.A({ action: 'session' }, { cookie })).body.authenticated, true);
  t.store.users[0].status = 'suspended';
  const r = await t.A({ action: 'session' }, { cookie });
  assert.equal(r.body.authenticated, false); assert.equal(r.body.reason, 'disabled');
  assert.equal(t.store.sessions.length, 0);
});

test('role changes take effect on the next request (demotion removes admin access)', async () => {
  const t = setup();
  const { cookie, csrf } = await t.login('boss', { role: 'admin' });
  assert.equal((await t.M({ action: 'inbox' }, { cookie, headers: { 'x-csrf-token': csrf } })).status, 200);
  t.store.users.find(u => u.username === 'boss').role = 'general';
  assert.equal((await t.M({ action: 'inbox' }, { cookie, headers: { 'x-csrf-token': csrf } })).status, 403);
});

test('rotating the shared passkey invalidates every existing session; new passkey signs in', async () => {
  const t = setup();
  const a = await t.login('nimal.p');
  const b = await t.login('boss', { role: 'admin' });
  assert.equal((await t.A({ action: 'session' }, { cookie: a.cookie })).body.authenticated, true);
  t.cfg.passkeyHash = t.hash2();                                // the passkey is rotated
  for (const c of [a.cookie, b.cookie]) {
    const r = await t.A({ action: 'session' }, { cookie: c });
    assert.equal(r.body.authenticated, false); assert.equal(r.body.reason, 'passkey_changed');
  }
  assert.equal((await t.A({ action: 'signin', username: 'nimal.p', passkey: PASSKEY })).status, 401);          // old passkey dead
  assert.equal((await t.A({ action: 'signin', username: 'nimal.p', passkey: 'a brand new rotated passkey' })).status, 200);
});

test('signing in again replaces the browser\'s previous session (no session fixation)', async () => {
  const t = setup();
  const first = await t.login('nimal.p');
  const second = await t.A({ action: 'signin', username: 'nimal.p', passkey: PASSKEY }, { cookie: first.cookie });
  assert.notEqual(t.cookieOf(second), first.cookie);
  assert.equal((await t.A({ action: 'session' }, { cookie: first.cookie })).body.authenticated, false);
  assert.equal((await t.A({ action: 'session' }, { cookie: t.cookieOf(second) })).body.authenticated, true);
});

test('only the 10 newest sessions per user are kept', async () => {
  const t = setup();
  await t.login('nimal.p');
  for (let i = 0; i < 12; i++) { t.clock.t += 1000; await t.A({ action: 'signin', username: 'nimal.p', passkey: PASSKEY }); }
  assert.equal(t.store.sessions.length, 10);
});

/* ---------- Cookie handling edge cases ---------- */
test('garbage, truncated and forged cookies are treated as signed out', async () => {
  const t = setup();
  const { cookie } = await t.login('nimal.p');
  for (const c of ['__Host-sscpc_sid=', '__Host-sscpc_sid=abc', '__Host-sscpc_sid=' + 'A'.repeat(43), '__Host-sscpc_sid=' + cookie.split('=')[1] + 'x', 'other=1']) {
    assert.equal((await t.A({ action: 'session' }, { cookie: c })).body.authenticated, false, c);
  }
});

test('over plain http (local development) the cookie works without Secure / __Host-', async () => {
  const t = setup();
  t.seed('nimal.p');
  const r = await t.A({ action: 'signin', username: 'nimal.p', passkey: PASSKEY }, { headers: { 'x-forwarded-proto': 'http' } });
  assert.match(r.headers['Set-Cookie'], /^sscpc_sid=/);
  assert.ok(!r.headers['Set-Cookie'].includes('Secure'));
});

/* ---------- Unauthorized access to the admin API ---------- */
test('admin API: no session => 401, nothing reaches Apps Script', async () => {
  const t = setup();
  for (const action of ['inbox', 'votes', 'set']) assert.equal((await t.M({ action })).status, 401);
  assert.equal(t.upstreamCalls.length, 0);
});

test('admin API: General User => 403 for every action', async () => {
  const t = setup();
  const { cookie, csrf } = await t.login('nimal.p');
  for (const action of ['inbox', 'votes']) assert.equal((await t.M({ action }, { cookie, headers: { 'x-csrf-token': csrf } })).status, 403);
  const set = await t.M({ action: 'set', sheet: 'messages', row: 2, ts: 't', status: 'Handled', note: '' }, { cookie, headers: { 'x-csrf-token': csrf } });
  assert.equal(set.status, 403);
  assert.equal(t.upstreamCalls.length, 0);
});

test('admin API: missing or wrong CSRF token => 403 even with a valid admin session', async () => {
  const t = setup();
  const { cookie } = await t.login('boss', { role: 'admin' });
  assert.equal((await t.M({ action: 'inbox' }, { cookie })).status, 403);
  assert.equal((await t.M({ action: 'inbox' }, { cookie, headers: { 'x-csrf-token': 'nope' } })).status, 403);
  const other = await t.login('boss2', { role: 'admin' });      // a different session's token must not work either
  assert.equal((await t.M({ action: 'inbox' }, { cookie, headers: { 'x-csrf-token': other.csrf } })).status, 403);
  assert.equal(t.upstreamCalls.length, 0);
});

test('admin API: cross-origin and non-JSON requests are refused', async () => {
  const t = setup();
  const { cookie, csrf } = await t.login('boss', { role: 'admin' });
  const h = { 'x-csrf-token': csrf };
  assert.equal((await t.M({ action: 'inbox' }, { cookie, headers: Object.assign({ origin: 'https://evil.test' }, h) })).status, 403);
  assert.equal((await t.M({ action: 'inbox' }, { cookie, headers: Object.assign({ 'content-type': 'text/plain' }, h) })).status, 415);
  assert.equal((await t.M({ action: 'inbox' }, { cookie, headers: h, method: 'GET' })).status, 405);
});

test('admin API: an administrator can read the inbox and votes; the Apps Script secret stays on the server', async () => {
  const t = setup();
  const { cookie, csrf } = await t.login('boss', { role: 'admin' });
  const h = { cookie, headers: { 'x-csrf-token': csrf } };
  const inbox = await t.M({ action: 'inbox' }, h);
  assert.equal(inbox.status, 200); assert.equal(inbox.body.registrations.length, 1);
  assert.equal((await t.M({ action: 'votes' }, h)).status, 200);
  assert.ok(t.upstreamCalls.every(u => u.includes(t.UPSTREAM_SECRET)), 'server did send the secret upstream');
  const everything = JSON.stringify([inbox, t.store.sessions]) ;
  assert.ok(!everything.includes(t.UPSTREAM_SECRET), 'secret never appears in a response');
});

test('admin API: set validates every field before anything is sent upstream', async () => {
  const t = setup();
  const { cookie, csrf } = await t.login('boss', { role: 'admin' });
  const h = { cookie, headers: { 'x-csrf-token': csrf } };
  const ok = { action: 'set', sheet: 'messages', row: 5, ts: '2026-01-01', status: 'Handled', note: 'called back' };
  assert.equal((await t.M(ok, h)).status, 200);
  const bad = [{ sheet: 'secrets' }, { row: 1 }, { row: '5' }, { row: 1e9 }, { status: 'Deleted' }, { ts: 5 }, { note: 'x'.repeat(2001) }, { note: { a: 1 } }];
  for (const b of bad) assert.equal((await t.M(Object.assign({}, ok, b), h)).status, 400, JSON.stringify(b).slice(0, 40));
  assert.equal((await t.M({ action: 'drop-database' }, h)).status, 400);
  assert.equal(t.upstreamCalls.length, 1);
});

test('admin API: upstream failures give a generic error and never leak details', async () => {
  const t = setup({ upstream: async () => { throw new Error('connect ECONNREFUSED https://script.google.com/...key=SECRET'); } });
  const { cookie, csrf } = await t.login('boss', { role: 'admin' });
  const r = await t.M({ action: 'inbox' }, { cookie, headers: { 'x-csrf-token': csrf } });
  assert.equal(r.status, 502);
  assert.ok(!JSON.stringify(r.body).includes('ECONNREFUSED'));
  const t2 = setup({ upstream: async () => ({ text: async () => '<html>login</html>' }) });
  const b = await t2.login('boss', { role: 'admin' });
  assert.equal((await t2.M({ action: 'inbox' }, { cookie: b.cookie, headers: { 'x-csrf-token': b.csrf } })).status, 502);
});

test('admin API: fails closed when the Apps Script connection is not configured', async () => {
  const t = setup();
  const { cookie, csrf } = await t.login('boss', { role: 'admin' });
  t.cfg.upstreamSecret = 'short';
  const r = await t.M({ action: 'inbox' }, { cookie, headers: { 'x-csrf-token': csrf } });
  assert.equal(r.status, 503);
  assert.equal(t.upstreamCalls.length, 0);
});

test('unexpected internal errors return a generic message', async () => {
  const t = setup();
  t.store.findUser = async () => { throw Object.assign(new Error('password authentication failed for user "neondb_owner" host=ep-secret.neon.tech'), { code: 'XX000' }); };
  const r = await t.A({ action: 'signin', username: 'nimal.p', passkey: PASSKEY });
  assert.equal(r.status, 500);
  assert.ok(!JSON.stringify(r.body).includes('neon'));
});
