/* Small HTTP helpers for the auth function. */
const crypto = require('crypto');

function send(res, status, body, headers) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  Object.keys(headers || {}).forEach(k => res.setHeader(k, headers[k]));
  res.end(JSON.stringify(body));
}

/* Browsers always send Origin on cross-site POSTs. Reject any that is not this site. */
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch (e) { return false; }
}

function isJson(req) {
  return /^application\/json\b/i.test(String(req.headers['content-type'] || ''));
}

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  if (typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body)); } catch (e) { return Promise.reject(new Error('bad_json')); }
  }
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > 8192) { reject(new Error('too_large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(new Error('bad_json')); } });
    req.on('error', () => reject(new Error('bad_json')));
  });
}

/* Vercel sets x-vercel-forwarded-for itself, so clients cannot spoof it. */
function clientIp(req) {
  const h = req.headers;
  return String(h['x-vercel-forwarded-for'] || h['x-real-ip'] || String(h['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || 'unknown').trim();
}

/* Raw IPs are never stored: only a keyed hash, used for rate limiting. */
function ipKey(req, secret) {
  return crypto.createHmac('sha256', secret).update(clientIp(req)).digest('hex').slice(0, 32);
}

module.exports = { send, sameOrigin, isJson, readBody, ipKey };
