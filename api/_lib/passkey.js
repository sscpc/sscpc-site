/* Shared passkey hashing (server only).
   The passkey is never stored or logged. Only a salted scrypt hash lives in the SHARED_PASSKEY_HASH
   environment variable, in the form  scrypt:N:r:p:salt:hash  (base64url parts). */
const crypto = require('crypto');

const DEFAULTS = { N: 16384, r: 8, p: 1, keylen: 32 };

function derive(passkey, salt, o) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      Buffer.from(passkey, 'utf8'), salt, o.keylen,
      { N: o.N, r: o.r, p: o.p, maxmem: 256 * o.N * o.r },
      (err, key) => (err ? reject(err) : resolve(key))
    );
  });
}

async function hashPasskey(passkey, opts) {
  const o = Object.assign({}, DEFAULTS, opts || {});
  const salt = crypto.randomBytes(16);
  const key = await derive(passkey, salt, o);
  return ['scrypt', o.N, o.r, o.p, salt.toString('base64url'), key.toString('base64url')].join(':');
}

function parse(stored) {
  const parts = String(stored || '').split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') throw new Error('Malformed SHARED_PASSKEY_HASH');
  const [, N, r, p, salt, hash] = parts;
  const o = { N: +N, r: +r, p: +p };
  if (![o.N, o.r, o.p].every(Number.isInteger) || o.N < 2 || (o.N & (o.N - 1)) !== 0) throw new Error('Malformed SHARED_PASSKEY_HASH');
  const expected = Buffer.from(hash, 'base64url');
  if (!expected.length) throw new Error('Malformed SHARED_PASSKEY_HASH');
  return { o: Object.assign(o, { keylen: expected.length }), salt: Buffer.from(salt, 'base64url'), expected };
}

/* Constant-time check of a typed passkey against the stored hash. */
async function verifyPasskey(passkey, stored) {
  const { o, salt, expected } = parse(stored);
  const actual = await derive(String(passkey), salt, o);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = { hashPasskey, verifyPasskey, DEFAULTS };
