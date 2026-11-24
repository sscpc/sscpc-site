/* SSCPC album publishing API (Vercel serverless function).
   The GitHub token lives ONLY in Vercel's environment variables. The browser never sees it. Every call needs a valid
   admin session, the CSRF header, and the content:publish permission (Editors, Admins and Super Admins).
   POST /api/album  with JSON { action, ... }
     status                                     is publishing set up?  (repo + branch, no secrets)
     head                                       { oid, text }  the current js/data.js and the commit it belongs to
     blob   { content }                         uploads one JPEG (base64) and returns its sha
     commit { baseOid, entries, data, message } ONE commit: the uploaded photos + the new js/data.js
   Environment variables: GITHUB_TOKEN (fine-grained, this repo, Contents read and write), GITHUB_REPO (owner/name),
   GITHUB_BRANCH (optional, default main). */
const { send, sameOrigin, isJson, readBody } = require('./_lib/http');
const { getConfig, activeConfig } = require('./_lib/config');
const { can } = require('./_lib/permissions');
const S = require('./_lib/session');

const PATH_RE = /^images\/albums\/[a-z0-9][a-z0-9-]{0,80}(?:\/thumbs)?\/[A-Za-z0-9][A-Za-z0-9._-]{0,80}\.jpg$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const MAX_PHOTO_B64 = 3.5 * 1024 * 1024;   // Vercel allows 4.5 MB per request; leave room for the JSON around it
const MAX_ENTRIES = 3000, MAX_DATA = 1.5 * 1024 * 1024;

const clean = v => String(v == null ? '' : v).trim();
function ghConfig(env) {
  const repo = clean(env.GITHUB_REPO).replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/^\/|\/$/g, '');
  const token = clean(env.GITHUB_TOKEN), branch = clean(env.GITHUB_BRANCH) || 'main';
  const ok = /^[\w.-]+\/[\w.-]+$/.test(repo) && token.length >= 20 && /^[\w./-]+$/.test(branch);
  return { ok, repo, token, branch };
}

class GhError extends Error { constructor(status, message) { super(message); this.status = status; } }

function createHandler(deps) {
  const { store } = deps;
  const cfgOf = deps.getConfig || getConfig;
  const now = deps.now || Date.now;
  const env = deps.env || process.env;
  const fetchFn = deps.fetch || ((...a) => fetch(...a));
  const resolveSession = deps.resolveSession || S.resolveSession;

  async function gh(g, path, o) {
    o = o || {};
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
    let r;
    try {
      r = await fetchFn('https://api.github.com/repos/' + g.repo + path, {
        method: o.method || 'GET', signal: ctl.signal,
        headers: { Authorization: 'Bearer ' + g.token, Accept: o.accept || 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'sscpc-album-builder' },
        body: o.body ? JSON.stringify(o.body) : undefined
      });
    } catch (e) { throw new GhError(0, 'Could not reach GitHub.'); } finally { clearTimeout(timer); }
    if (r.ok) return o.raw ? r.text() : (r.status === 204 ? {} : r.json());
    let msg = ''; try { msg = (await r.json()).message || ''; } catch (e) {}
    throw new GhError(r.status, msg || ('GitHub said ' + r.status));
  }

  async function headOf(g) {
    const ref = await gh(g, '/git/ref/heads/' + g.branch);
    const oid = ref && ref.object && ref.object.sha;
    if (!SHA_RE.test(oid || '')) throw new GhError(502, 'Unexpected answer from GitHub.');
    return oid;
  }

  function checkCommit(b) {
    if (typeof b.baseOid !== 'string' || !SHA_RE.test(b.baseOid)) return 'Missing base commit.';
    if (!Array.isArray(b.entries) || b.entries.length > MAX_ENTRIES) return 'Too many files in one publish.';
    const seen = new Set();
    for (const e of b.entries) {
      if (!e || typeof e.path !== 'string' || !PATH_RE.test(e.path) || e.path.indexOf('..') > -1) return 'A file path is not allowed: ' + String(e && e.path).slice(0, 80);
      if (typeof e.sha !== 'string' || !SHA_RE.test(e.sha)) return 'A photo was not uploaded properly. Press Publish again.';
      if (seen.has(e.path)) return 'Duplicate file path.';
      seen.add(e.path);
    }
    const d = b.data;
    if (typeof d !== 'string' || d.length > MAX_DATA || d.indexOf('const ALBUMS') < 0 || d.indexOf('const EVENTS') < 0) return 'The site data looks wrong, so nothing was published.';
    const m = clean(b.message).replace(/[\r\n]+/g, ' ').slice(0, 120);
    if (!m) return 'Missing commit message.';
    return '';
  }

  return async function handler(req, res) {
    try {
      if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method_not_allowed' }, { Allow: 'POST' });
      if (!sameOrigin(req)) return send(res, 403, { ok: false, error: 'forbidden' });
      if (!isJson(req)) return send(res, 415, { ok: false, error: 'unsupported_media_type' });
      const cfg = await activeConfig(cfgOf, store);
      if (!cfg.ok) { console.error('[album] auth not configured. Missing:', cfg.missing.join(', ')); return send(res, 503, { ok: false, error: 'not_configured', message: 'The portal is not set up yet.' }); }

      const s = await resolveSession(req, { store, cfg, now });
      if (!s.ok) return send(res, 401, { ok: false, error: 'unauthenticated', reason: s.reason, message: 'Please sign in again.' }, s.reason === 'none' && !s.stale ? {} : { 'Set-Cookie': S.clearCookie(req) });
      if (!S.csrfOk(req, s.csrf)) return send(res, 403, { ok: false, error: 'csrf', message: 'Security check failed. Reload the page and try again.' });
      if (!can(s.user.role, 'portal:access') || !can(s.user.role, 'content:publish')) return send(res, 403, { ok: false, error: 'forbidden', message: 'Your account is not allowed to publish albums.' });

      let b;
      try { b = await readBody(req); } catch (e) { return send(res, 400, { ok: false, error: 'bad_request', message: 'The request could not be read.' }); }
      if (!b || typeof b !== 'object' || Array.isArray(b)) return send(res, 400, { ok: false, error: 'bad_request', message: 'The request could not be read.' });

      const g = ghConfig(env);
      if (b.action === 'status') return send(res, 200, { ok: true, configured: g.ok, repo: g.ok ? g.repo : '', branch: g.ok ? g.branch : '' });
      if (!g.ok) { console.error('[album] GITHUB_TOKEN / GITHUB_REPO missing or invalid'); return send(res, 503, { ok: false, error: 'not_configured', message: 'Publishing from the portal is not set up yet. The site owner must add GITHUB_TOKEN and GITHUB_REPO in Vercel.' }); }

      if (b.action === 'head') {
        const oid = await headOf(g);
        const text = await gh(g, '/contents/js/data.js?ref=' + oid, { accept: 'application/vnd.github.raw+json', raw: true });
        return send(res, 200, { ok: true, oid, text });
      }

      if (b.action === 'blob') {
        const c = b.content;
        if (typeof c !== 'string' || !c || c.length > MAX_PHOTO_B64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(c)) return send(res, 400, { ok: false, error: 'validation', message: 'That photo could not be read.' });
        const head = Buffer.from(c.slice(0, 8), 'base64');
        if (!(head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff)) return send(res, 400, { ok: false, error: 'validation', message: 'Only JPEG photos can be published.' });
        const r = await gh(g, '/git/blobs', { method: 'POST', body: { content: c, encoding: 'base64' } });
        return send(res, 200, { ok: true, sha: r.sha });
      }

      if (b.action === 'commit') {
        const bad = checkCommit(b);
        if (bad) return send(res, 400, { ok: false, error: 'validation', message: bad });
        const oid = await headOf(g);
        if (oid !== b.baseOid) return send(res, 409, { ok: false, error: 'conflict', message: 'The site changed while you were publishing.' });
        const base = (await gh(g, '/git/commits/' + oid)).tree.sha;
        const tree = await gh(g, '/git/trees', { method: 'POST', body: { base_tree: base, tree: b.entries.map(e => ({ path: e.path, mode: '100644', type: 'blob', sha: e.sha })).concat([{ path: 'js/data.js', mode: '100644', type: 'blob', content: b.data }]) } });
        const msg = clean(b.message).replace(/[\r\n]+/g, ' ').slice(0, 120) + '\n\nPublished from the admin portal by ' + s.user.username;
        const cm = await gh(g, '/git/commits', { method: 'POST', body: { message: msg, tree: tree.sha, parents: [oid] } });
        try { await gh(g, '/git/refs/heads/' + g.branch, { method: 'PATCH', body: { sha: cm.sha, force: false } }); }
        catch (e) { if (e.status === 422) return send(res, 409, { ok: false, error: 'conflict', message: 'The site changed while you were publishing.' }); throw e; }
        if (store && store.recordEvent) store.recordEvent({ type: 'album_publish', username: s.user.username, userId: s.user.id, detail: clean(b.message).slice(0, 200) }).catch(() => {});
        return send(res, 200, { ok: true, commit: cm.sha });
      }

      return send(res, 400, { ok: false, error: 'unknown_action' });
    } catch (e) {
      if (e instanceof GhError) {
        console.error('[album] GitHub error', e.status, String(e.message).slice(0, 100));
        if (e.status === 401) return send(res, 502, { ok: false, error: 'github_auth', message: 'GitHub did not accept the saved token. The site owner must make a new GITHUB_TOKEN in Vercel.' });
        if (e.status === 403 || e.status === 429) return send(res, 429, { ok: false, error: 'github_slow', message: 'GitHub asked us to slow down. Wait a moment.' });
        if (e.status === 404) return send(res, 502, { ok: false, error: 'github_repo', message: 'GitHub could not find the repository or branch. Check GITHUB_REPO, GITHUB_BRANCH and the token permissions (Contents: read and write).' });
        return send(res, 502, { ok: false, error: 'github', message: 'GitHub had a problem. Please try again.' });
      }
      console.error('[album] error:', (e && (e.code || e.message)) || 'unknown');
      return send(res, 500, { ok: false, error: 'server_error', message: 'Something went wrong on our side. Please try again.' });
    }
  };
}

module.exports = createHandler({ store: require('./_lib/store') });
module.exports.createHandler = createHandler;
