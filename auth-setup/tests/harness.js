/* Shared test harness: handlers around an in-memory store, a controllable clock, a fake Apps Script and a fake Brevo mailer
   (it records what WOULD be sent, so tests can open the real magic links). */
const { createHandler: authHandler } = require('../../api/auth');
const { createHandler: adminHandler } = require('../../api/admin');
const { hashPasskey, verifyPasskey } = require('../../api/_lib/passkey');
const memoryStore = require('./memory-store');

const PASSKEY = 'correct horse battery staple';
const NEW_PASSKEY = 'a brand new rotated passkey';
const UPSTREAM_SECRET = 'u'.repeat(48);
const UPSTREAM_URL = 'https://script.google.com/macros/s/AKfycbTestDeploymentId123/exec';
const APP_URL = 'https://ssckphotography.com';
let HASH, HASH2;

async function init() {
  HASH = await hashPasskey(PASSKEY, { N: 1024 });
  HASH2 = await hashPasskey(NEW_PASSKEY, { N: 1024 });
}

function setup(opts) {
  opts = opts || {};
  const clock = { t: 1_800_000_000_000 };
  const store = memoryStore(() => clock.t);
  const cfg = {
    ok: true, missing: [], secret: 's'.repeat(40), passkeyHash: HASH, idleSec: 12 * 3600, maxSec: 7 * 86400,
    upstreamUrl: UPSTREAM_URL, upstreamSecret: UPSTREAM_SECRET,
    brevoKey: 'brevo-test-key', fromEmail: 'verify@auth.ssckphotography.com', fromName: 'SSCK Photography', magicSecret: 'm'.repeat(40), appUrl: APP_URL, emailConfigured: true
  };
  const upstreamCalls = [], mails = [];
  const state = { mailFails: false };
  const upstream = opts.upstream || (async (url) => {
    upstreamCalls.push(url);
    const u = new URL(url);
    if (u.searchParams.get('key') !== UPSTREAM_SECRET) return { text: async () => JSON.stringify({ ok: false, error: 'Unauthorized' }) };
    const a = u.searchParams.get('action');
    const body = a === 'photo-votes' ? { ok: true, photos: [] } : a === 'set' ? { ok: true } : { ok: true, v: 2, registrations: [{ _row: 2, Timestamp: 't', name: 'Test' }], joins: [], messages: [] };
    return { text: async () => JSON.stringify(body) };
  });
  const mailer = async (msg) => { if (state.mailFails) throw new Error('mail_provider_status_500'); mails.push(msg); };
  const deps = { store, verifyPasskey, getConfig: () => cfg, now: () => clock.t, mailer };
  const auth = authHandler(deps);
  const admin = adminHandler({ store, getConfig: () => cfg, now: () => clock.t, fetch: upstream, hashPasskey: p => hashPasskey(p, { N: 1024 }), verifyPasskey });

  async function call(handler, body, o) {
    o = o || {};
    const headers = Object.assign({ 'content-type': 'application/json', host: 'site.test', origin: 'https://site.test', 'x-forwarded-proto': 'https', 'x-vercel-forwarded-for': o.ip || '1.1.1.1', 'user-agent': 'test-agent' }, o.headers);
    if (o.cookie) headers.cookie = o.cookie;
    const req = { method: o.method || 'POST', headers, body };
    const out = { headers: {} };
    const res = { setHeader: (k, v) => { out.headers[k] = v; }, end: s => { out.body = JSON.parse(s); } };
    Object.defineProperty(res, 'statusCode', { set: v => { out.status = v; }, get: () => out.status });
    await handler(req, res);
    return out;
  }
  const A = (body, o) => call(auth, body, o);
  const M = (body, o) => call(admin, body, o);
  const reg = over => Object.assign({ action: 'register', fullName: 'Nimal Perera', username: 'nimal.p', email: 'nimal@example.com', passkey: PASSKEY, confirmPasskey: PASSKEY, acceptTerms: true }, over);
  const cookieOf = r => { const c = r.headers['Set-Cookie']; return c ? c.split(';')[0] : ''; };
  const seed = (username, o) => store.seedUser(Object.assign({ username }, o));
  const tokenFrom = mail => { const m = /#token=([A-Za-z0-9_.-]+)/.exec(mail.text); return m && m[1]; };
  const lastToken = () => tokenFrom(mails[mails.length - 1]);

  /* Signs in (creating an active account first if needed) and returns { cookie, csrf, res }. */
  async function login(username, o) {
    o = o || {};
    if (!store.users.some(u => u.username === username)) seed(username, { role: o.role });
    else if (o.role) store.users.find(u => u.username === username).role = o.role;
    const res = await A({ action: 'signin', username, passkey: o.passkey || PASSKEY }, { ip: o.ip });
    return { res, cookie: cookieOf(res), csrf: res.body && res.body.csrf };
  }
  /* For the admin API: headers carrying a session's cookie + CSRF token. */
  const asUser = async (username, role) => { const l = await login(username, { role }); return { cookie: l.cookie, headers: { 'x-csrf-token': l.csrf } }; };

  return { clock, store, cfg, A, M, reg, seed, login, asUser, cookieOf, mails, lastToken, tokenFrom, state, upstreamCalls, PASSKEY, NEW_PASSKEY, UPSTREAM_SECRET, APP_URL, hash2: () => HASH2 };
}

module.exports = { init, setup, PASSKEY, NEW_PASSKEY, UPSTREAM_SECRET };
