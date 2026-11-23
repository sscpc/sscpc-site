/* Magic-link tokens.
   token = <32 random bytes, base64url> . <HMAC-SHA256(MAGIC_LINK_SECRET, random part), 22 chars>
   - The signature lets the server throw away forged or mistyped tokens without touching the database.
   - The database stores only SHA-256(token), so a database leak cannot be turned into working links.
   - Links expire after 15 minutes and are single-use (enforced atomically in the database). */
const crypto = require('crypto');
const TTL_MS = 15 * 60 * 1000;

const sig = (secret, rand) => crypto.createHmac('sha256', secret).update('magic:' + rand).digest('base64url').slice(0, 22);
const sha256 = t => crypto.createHash('sha256').update(t).digest('hex');

function newToken(secret) {
  const rand = crypto.randomBytes(32).toString('base64url');
  const token = rand + '.' + sig(secret, rand);
  return { token, tokenHash: sha256(token) };
}

/* Returns the token's SHA-256 hash if its shape and signature are valid, otherwise null. */
function checkToken(token, secret) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{22}$/.test(token)) return null;
  const [rand, got] = token.split('.'), want = sig(secret, rand);
  const a = Buffer.from(got), b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? sha256(token) : null;
}

const linkFor = (appUrl, token) => appUrl + '/admin/verify.html#token=' + token;

module.exports = { newToken, checkToken, linkFor, TTL_MS, sha256 };
