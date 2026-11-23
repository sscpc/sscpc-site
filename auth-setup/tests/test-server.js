/* TEST ONLY. Serves the site and mounts the REAL api/auth.js and api/admin.js handlers with an in-memory store,
   a controllable clock, a fake Apps Script and a fake Brevo mailer (it records what would be sent), so the browser UI can be
   exercised end to end without a database or email account. Never deployed (.vercelignore).
   The /__test endpoints let a test change time, seed accounts, change roles, and read the last email. */
const http = require('http'), fs = require('fs'), path = require('path');
const { createHandler: authHandler } = require('../../api/auth');
const { createHandler: adminHandler } = require('../../api/admin');
const { hashPasskey, verifyPasskey } = require('../../api/_lib/passkey');
const memoryStore = require('./memory-store');
const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
const UPSTREAM_SECRET = 'u'.repeat(48), UPSTREAM_URL = 'https://script.google.com/macros/s/AKfycbTestDeploymentId123/exec';

module.exports = async function start(port, passkey) {
  const clock = { t: Date.now() };
  const store = memoryStore(() => clock.t), mails = [];
  const cfg = {
    ok: true, missing: [], secret: 's'.repeat(40), passkeyHash: await hashPasskey(passkey, { N: 1024 }), idleSec: 43200, maxSec: 604800,
    upstreamUrl: UPSTREAM_URL, upstreamSecret: UPSTREAM_SECRET,
    brevoKey: 'test', fromEmail: 'verify@auth.ssckphotography.com', fromName: 'SSCK Photography', magicSecret: 'm'.repeat(40), appUrl: 'https://ssckphotography.com', emailConfigured: true
  };
  const upstream = async url => {
    const u = new URL(url);
    if (u.searchParams.get('key') !== UPSTREAM_SECRET) return { text: async () => JSON.stringify({ ok: false, error: 'Unauthorized' }) };
    const a = u.searchParams.get('action');
    const body = a === 'photo-votes' ? { ok: true, photos: [] } : a === 'set' ? { ok: true }
      : { ok: true, v: 2, registrations: [{ _row: 2, Timestamp: '2026-01-01', name: 'Visible Registration', Status: 'New' }], joins: [], messages: [] };
    return { text: async () => JSON.stringify(body) };
  };
  const mailer = async msg => { mails.push(msg); };
  const auth = authHandler({ store, verifyPasskey, getConfig: () => cfg, now: () => clock.t, mailer });
  const admin = adminHandler({ store, getConfig: () => cfg, now: () => clock.t, fetch: upstream, hashPasskey: p => hashPasskey(p, { N: 1024 }), verifyPasskey });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x'), q = k => url.searchParams.get(k);
    if (url.pathname === '/api/auth') return auth(req, res);
    if (url.pathname === '/api/admin') return admin(req, res);
    if (url.pathname === '/__test/advance') { clock.t += Number(q('ms')); return res.end('ok'); }
    if (url.pathname === '/__test/seed') { store.seedUser({ username: q('u'), role: q('role') || 'general', status: q('status') || 'active', fullName: q('name') || undefined }); return res.end('ok'); }
    if (url.pathname === '/__test/set') { const u = store.users.find(x => x.username === q('u')); if (u) u[q('k')] = q('v'); return res.end(u ? 'ok' : 'nouser'); }
    if (url.pathname === '/__test/mails') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(mails)); }
    let f = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!f.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream');
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(port, r));
  return { server, store, clock, cfg, mails };
};
