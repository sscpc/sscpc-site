/* Session handling (server only).
   - The browser holds a random 256-bit token in an HttpOnly cookie. The database stores only its SHA-256 hash,
     so a database leak cannot be replayed as a login.
   - Every request re-reads the account, so suspending a user or changing a role takes effect immediately.
   - Sessions die on idle timeout, absolute timeout, or when the shared passkey is rotated (epoch changes). */
const crypto = require('crypto');

const COOKIE_SECURE = '__Host-sscpc_sid', COOKIE_PLAIN = 'sscpc_sid';
const TOUCH_EVERY_MS = 5 * 60 * 1000, MAX_SESSIONS_PER_USER = 10;

const isSecure = req => /^https\b/i.test(String(req.headers['x-forwarded-proto'] || '')) || !!(req.socket && req.socket.encrypted);
const cookieName = req => (isSecure(req) ? COOKIE_SECURE : COOKIE_PLAIN);

function readCookie(req, name) {
  const h = String(req.headers.cookie || '');
  const parts = h.split(/;\s*/);
  for (let i = 0; i < parts.length; i++) {
    const k = parts[i].indexOf('=');
    if (k > 0 && parts[i].slice(0, k) === name) return parts[i].slice(k + 1);
  }
  return '';
}

const newToken = () => crypto.randomBytes(32).toString('base64url');
const validToken = t => /^[A-Za-z0-9_-]{43}$/.test(t || '');
const hashToken = t => crypto.createHash('sha256').update(t).digest('hex');

function setCookie(req, token, maxAgeSec) {
  const p = [cookieName(req) + '=' + token, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=' + Math.max(0, Math.floor(maxAgeSec))];
  if (isSecure(req)) p.push('Secure');
  return p.join('; ');
}
function clearCookie(req) {
  const p = [cookieName(req) + '=', 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0', 'Expires=Thu, 01 Jan 1970 00:00:00 GMT'];
  if (isSecure(req)) p.push('Secure');
  return p.join('; ');
}

/* CSRF token: derived from the session, so nothing extra is stored. It is returned only in JSON bodies
   (which other sites cannot read) and must come back in the X-CSRF-Token header on every state-changing call. */
const csrfFor = (tokenHash, secret) => crypto.createHmac('sha256', secret).update('csrf:' + tokenHash).digest('base64url');
function csrfOk(req, expected) {
  const got = Buffer.from(String(req.headers['x-csrf-token'] || '')), want = Buffer.from(expected);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

/* Changes whenever SHARED_PASSKEY_HASH changes, which ends every session made under the old passkey. */
const passkeyEpoch = cfg => crypto.createHmac('sha256', cfg.secret).update('pk-epoch:' + cfg.passkeyHash).digest('hex').slice(0, 24);

/* Creates a session and returns { token, cookie, csrf }. */
async function createSession(req, { store, cfg, now, ipHash, userId }) {
  const token = newToken(), th = hashToken(token), t = now();
  await store.createSession({
    tokenHash: th, userId, pkEpoch: passkeyEpoch(cfg), createdAt: t, expiresAt: t + cfg.maxSec * 1000,
    ipHash, userAgent: String(req.headers['user-agent'] || '').slice(0, 200)
  });
  await store.pruneUserSessions(userId, MAX_SESSIONS_PER_USER);
  return { token, cookie: setCookie(req, token, cfg.maxSec), csrf: csrfFor(th, cfg.secret) };
}

/* Looks at the cookie and returns { ok:true, user, csrf, tokenHash } or { ok:false, reason }.
   reason: 'none' (no usable cookie) | 'expired' | 'passkey_changed' | 'disabled'. */
async function resolveSession(req, { store, cfg, now }) {
  const token = readCookie(req, cookieName(req));
  if (!validToken(token)) return { ok: false, reason: 'none' };
  const th = hashToken(token), row = await store.getSession(th);
  if (!row) return { ok: false, reason: 'none', stale: true };
  const t = now();
  if (row.expiresAt <= t || row.lastSeenAt + cfg.idleSec * 1000 <= t) { await store.deleteSession(th); return { ok: false, reason: 'expired' }; }
  if (row.pkEpoch !== passkeyEpoch(cfg)) { await store.deleteSession(th); return { ok: false, reason: 'passkey_changed' }; }
  if (!row.user || row.user.status !== 'active') { await store.deleteSession(th); return { ok: false, reason: 'disabled' }; }
  if (t - row.lastSeenAt > TOUCH_EVERY_MS) await store.touchSession(row.id, t);
  return { ok: true, user: row.user, tokenHash: th, csrf: csrfFor(th, cfg.secret) };
}

module.exports = { createSession, resolveSession, readCookie, cookieName, clearCookie, setCookie, hashToken, csrfFor, csrfOk, passkeyEpoch, validToken, isSecure };
