/* SSCPC Album Builder page, behind the admin sign-in (Vercel serverless function).
   The page lives at /api/album-builder. /album-builder and /tools/album-builder.html redirect here (vercel.json).
   Only a signed-in admin-portal user who may publish albums (Editor, Admin, Super Admin) gets the page.
   Everybody else is sent to the public albums gallery. The page itself is built into api/_lib/album-builder-page.js
   (run: node album-builder-src/build.js) so it is NOT a public static file. */
const { getConfig, activeConfig } = require('./_lib/config');
const { can } = require('./_lib/permissions');
const S = require('./_lib/session');

const PUBLIC_URL = '/#gallery';   // where visitors who may not use the builder are sent (the public albums gallery)

function createHandler(deps) {
  const { store } = deps;
  const cfgOf = deps.getConfig || getConfig;
  const now = deps.now || Date.now;
  const resolveSession = deps.resolveSession || S.resolveSession;
  const page = deps.page || (() => require('./_lib/album-builder-page'));

  function leave(res, cookie, why) {
    const h = { Location: PUBLIC_URL, 'X-Album-Gate': why || 'no', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
    if (cookie) h['Set-Cookie'] = cookie;
    res.writeHead(302, h); res.end();
  }

  return async function handler(req, res) {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
      const cfg = await activeConfig(cfgOf, store);
      if (!cfg.ok) return leave(res, null, 'auth-not-configured');
      const s = await resolveSession(req, { store, cfg, now });
      if (!s.ok) return leave(res, s.reason === 'none' && !s.stale ? null : S.clearCookie(req), 'not-signed-in');
      if (!can(s.user.role, 'portal:access') || !can(s.user.role, 'content:publish')) return leave(res, null, 'no-publish-permission');
      const html = page();
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(html),
        'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow',
        'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin'
      });
      res.end(req.method === 'HEAD' ? undefined : html);
    } catch (e) {
      console.error('[album-builder] error:', (e && (e.code || e.message)) || 'unknown');
      leave(res, null, 'error');
    }
  };
}

module.exports = createHandler({ store: require('./_lib/store') });
module.exports.createHandler = createHandler;
