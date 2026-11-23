/* Input validation shared by every auth action (server side is the source of truth). */

const USERNAME_RE = /^[a-z][a-z0-9._-]{2,23}$/;
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;
const RESERVED = new Set([
  'admin', 'administrator', 'root', 'system', 'sysadmin', 'superuser', 'owner', 'staff', 'support', 'security',
  'moderator', 'mod', 'webmaster', 'official', 'committee', 'president', 'sscpc', 'sscpc-admin', 'photographyclub',
  'api', 'login', 'logout', 'signin', 'signup', 'register', 'auth', 'null', 'undefined', 'guest', 'user', 'anonymous'
]);

function normalizeUsername(raw) {
  return String(raw == null ? '' : raw).trim().toLowerCase();
}

/* Returns { ok:true, value } or { ok:false, reason:'invalid'|'reserved', message } */
function checkUsername(raw) {
  const v = normalizeUsername(raw);
  if (v.length < 3 || v.length > 24) return { ok: false, reason: 'invalid', message: 'Use 3 to 24 characters.' };
  if (!/^[a-z]/.test(v)) return { ok: false, reason: 'invalid', message: 'Start with a letter.' };
  if (!USERNAME_RE.test(v)) return { ok: false, reason: 'invalid', message: 'Use only letters, numbers, dots, underscores and hyphens.' };
  if (/[._-]{2}/.test(v) || /[._-]$/.test(v)) return { ok: false, reason: 'invalid', message: 'No repeated symbols, and do not end with one.' };
  if (RESERVED.has(v) || /^admin/.test(v)) return { ok: false, reason: 'reserved', message: 'This username is not available.' };
  return { ok: true, value: v };
}

function checkFullName(raw) {
  const v = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
  if (v.length < 2 || v.length > 60) return { ok: false, message: 'Enter your full name (2 to 60 characters).' };
  if (!NAME_RE.test(v)) return { ok: false, message: 'Use letters, spaces, dots, apostrophes and hyphens only.' };
  return { ok: true, value: v };
}

/* The passkey is compared exactly as typed, except that surrounding spaces are ignored
   (phone keyboards often add one). The hash script applies the same rule. */
function checkPasskey(raw) {
  if (typeof raw !== 'string') return { ok: false, message: 'Enter the shared passkey.' };
  const v = raw.trim();
  if (!v) return { ok: false, message: 'Enter the shared passkey.' };
  if (v.length > 128) return { ok: false, message: 'That passkey is too long.' };
  return { ok: true, value: v };
}

/* Practical email check: one @, a dotted domain, sensible lengths. Stored lower-case. Real proof of ownership is the OTP. */
const EMAIL_RE = /^([a-z0-9._%+'-]+)@((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})$/;
function checkEmail(raw) {
  const v = String(raw == null ? '' : raw).trim().toLowerCase();
  if (!v) return { ok: false, message: 'Enter your email address.' };
  const m = v.length <= 254 ? EMAIL_RE.exec(v) : null;
  if (!m || m[1].length > 64 || /\.\./.test(v) || /^\.|\.@/.test(v)) return { ok: false, message: 'Enter a valid email address, like name@example.com.' };
  return { ok: true, value: v };
}
const maskEmail = e => { const [l, d] = String(e).split('@'); return (l ? l[0] : '') + '***@' + (d || ''); };

module.exports = { checkUsername, checkFullName, checkPasskey, checkEmail, maskEmail, normalizeUsername, RESERVED };
