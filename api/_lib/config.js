/* Environment configuration, read in one place. Nothing here is ever sent to the browser. */
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function getConfig(env) {
  env = env || process.env;
  const missing = [];
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) missing.push('AUTH_SECRET');
  if (!env.DATABASE_URL) missing.push('DATABASE_URL');
  const appUrl = String(env.APP_URL || '').trim().replace(/\/+$/, '');
  const brevoKey = env.BREVO_API_KEY || '', fromEmail = env.BREVO_FROM_EMAIL || '', magicSecret = env.MAGIC_LINK_SECRET || '';
  return {
    ok: !missing.length, missing,
    secret: env.AUTH_SECRET,
    passkeyHash: env.SHARED_PASSKEY_HASH || '',   // first-time fallback only; once a passkey is saved in the database, that one wins
    idleSec: clamp(num(env.SESSION_IDLE_HOURS, 12) * 3600, 900, 7 * 86400),
    maxSec: clamp(num(env.SESSION_MAX_DAYS, 7) * 86400, 3600, 30 * 86400),
    upstreamUrl: env.APPS_SCRIPT_URL || '', upstreamSecret: env.APPS_SCRIPT_SECRET || '',
    // Email verification (Brevo + magic links). All values come from server-side environment variables only.
    brevoKey, fromEmail, fromName: env.BREVO_FROM_NAME || 'SSCK Photography', magicSecret, appUrl,
    emailConfigured: !!(brevoKey && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fromEmail) && magicSecret.length >= 32 && /^https:\/\/[^/\s]+$/.test(appUrl))
  };
}

/* The shared passkey in force right now: the one saved from the admin portal (database) if there is one,
   otherwise the SHARED_PASSKEY_HASH environment variable. Read on every request so a rotation takes effect at once. */
async function activeConfig(cfgOf, store) {
  const base = cfgOf();
  if (!base.ok) return base;
  const saved = await store.getPasskeyHash();
  const hash = (saved && saved.hash) || base.passkeyHash || '';
  if (!/^scrypt:/.test(hash)) return Object.assign({}, base, { ok: false, missing: base.missing.concat('SHARED_PASSKEY_HASH') });
  return Object.assign({}, base, { passkeyHash: hash, passkeySource: saved && saved.hash ? 'database' : 'environment', passkeyChangedAt: saved ? saved.changedAt : null, passkeyChangedBy: saved ? saved.changedBy : null });
}

module.exports = { getConfig, activeConfig };
