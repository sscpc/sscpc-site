/* SSCPC admin data API (Vercel serverless function). Every call needs a valid session, the CSRF header,
   and the specific permission for that action. The browser never sees the Apps Script secret: this function
   calls Apps Script itself and relays only the result.
   POST /api/admin  with JSON { action, ... }
     inbox                                    inbox:read    registrations, join requests, messages
     votes                                    votes:read    photo vote counts
     set { sheet, row, ts, status, note }     inbox:write   mark a row New / Handled with a private note
     users.list / users.update / users.delete   users:view / users:manage / users:delete
     passkey.status / passkey.change            passkey:manage   (Super Admin only) */
const { send, sameOrigin, isJson, readBody } = require('./_lib/http');
const { getConfig, activeConfig } = require('./_lib/config');
const users = require('./_lib/usermgmt');
const { hashPasskey: realHash, verifyPasskey: realVerify } = require('./_lib/passkey');
const { can } = require('./_lib/permissions');
const S = require('./_lib/session');

const SHEETS = ['registrations', 'joins', 'messages'];
const STATUSES = ['New', 'Handled'];
const UPSTREAM_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;

function validateSet(b) {
  const row = b.row, ts = b.ts, note = b.note == null ? '' : b.note;
  if (SHEETS.indexOf(b.sheet) < 0) return 'Unknown sheet.';
  if (!Number.isInteger(row) || row < 2 || row > 100000) return 'Invalid row.';
  if (typeof ts !== 'string' || ts.length > 100) return 'Invalid timestamp.';
  if (STATUSES.indexOf(b.status) < 0) return 'Invalid status.';
  if (typeof note !== 'string' || note.length > 2000) return 'The note is too long (2000 characters at most).';
  return '';
}

async function callUpstream(cfg, params, fetchFn) {
  const u = new URL(cfg.upstreamUrl);
  Object.keys(params).forEach(k => u.searchParams.set(k, params[k]));
  u.searchParams.set('key', cfg.upstreamSecret);
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetchFn(u.toString(), { redirect: 'follow', signal: ctl.signal, headers: { Accept: 'application/json' } });
    const text = await r.text();
    try { return JSON.parse(text); } catch (e) { throw new Error('upstream returned a non-JSON response'); }
  } finally { clearTimeout(timer); }
}

function createHandler(deps) {
  const { store } = deps;
  const cfgOf = deps.getConfig || getConfig;
  const now = deps.now || Date.now;
  const fetchFn = deps.fetch || ((...a) => fetch(...a));
  const hashPasskey = deps.hashPasskey || (p => realHash(p));
  const verifyPasskey = deps.verifyPasskey || realVerify;

  return async function handler(req, res) {
    try {
      if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method_not_allowed' }, { Allow: 'POST' });
      if (!sameOrigin(req)) return send(res, 403, { ok: false, error: 'forbidden' });
      if (!isJson(req)) return send(res, 415, { ok: false, error: 'unsupported_media_type' });
      const cfg = await activeConfig(cfgOf, store);
      if (!cfg.ok) { console.error('[admin] not configured. Missing:', cfg.missing.join(', ')); return send(res, 503, { ok: false, error: 'not_configured', message: 'The portal is not set up yet.' }); }

      // 1. Must be signed in.
      const s = await S.resolveSession(req, { store, cfg, now });
      if (!s.ok) return send(res, 401, { ok: false, error: 'unauthenticated', reason: s.reason, message: 'Please sign in.' }, s.reason === 'none' && !s.stale ? {} : { 'Set-Cookie': S.clearCookie(req) });
      // 2. Must carry this session's CSRF token.
      if (!S.csrfOk(req, s.csrf)) return send(res, 403, { ok: false, error: 'csrf', message: 'Security check failed. Please reload the page and try again.' });

      let body;
      try { body = await readBody(req); } catch (e) { return send(res, 400, { ok: false, error: 'bad_request', message: 'The request could not be read.' }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { ok: false, error: 'bad_request', message: 'The request could not be read.' });

      // 3. Must hold the permission for this action.
      const needs = {
        inbox: 'inbox:read', votes: 'votes:read', set: 'inbox:write',
        'users.list': 'users:view', 'users.update': 'users:manage', 'users.delete': 'users:delete',
        'passkey.status': 'passkey:manage', 'passkey.change': 'passkey:manage'
      }[body.action];
      if (!needs) return send(res, 400, { ok: false, error: 'unknown_action' });
      if (!can(s.user.role, 'portal:access') || !can(s.user.role, needs)) return send(res, 403, { ok: false, error: 'forbidden', message: 'Your account does not have permission to do that.' });

      if (/^(users|passkey)\./.test(body.action)) {
        const fn = { 'users.list': users.list, 'users.update': users.update, 'users.delete': users.remove, 'passkey.status': users.passkeyStatus, 'passkey.change': users.passkeyChange }[body.action];
        const ctx = {
          store, actor: s.user, cfg, now, verifyPasskey, hashPasskey,
          audit: (type, detail, targetId) => store.recordEvent({ type, username: s.user.username, userId: targetId || s.user.id, detail }).catch(() => {})
        };
        const r = await fn(body, ctx);
        return send(res, r.status, r.body, r.clearCookie ? { 'Set-Cookie': S.clearCookie(req) } : {});
      }

      let params;
      if (body.action === 'set') {
        const bad = validateSet(body);
        if (bad) return send(res, 400, { ok: false, error: 'validation', message: bad });
        params = { action: 'set', sheet: body.sheet, row: String(body.row), ts: body.ts, status: body.status, note: body.note == null ? '' : body.note };
      } else params = body.action === 'votes' ? { action: 'photo-votes' } : {};

      if (!UPSTREAM_RE.test(cfg.upstreamUrl) || cfg.upstreamSecret.length < 32) {
        console.error('[admin] APPS_SCRIPT_URL / APPS_SCRIPT_SECRET missing or invalid');
        return send(res, 503, { ok: false, error: 'not_configured', message: 'The data connection is not set up yet.' });
      }

      let j;
      try { j = await callUpstream(cfg, params, fetchFn); }
      catch (e) { console.error('[admin] upstream call failed:', e && e.name); return send(res, 502, { ok: false, error: 'upstream', message: 'Could not reach the data sheet. Please try again.' }); }

      if (!j || j.ok !== true) {
        const why = String((j && j.error) || '');
        if (body.action === 'set' && why && !/unauthori[sz]ed|invalid/i.test(why)) return send(res, 200, { ok: false, error: 'rejected', message: why.slice(0, 200) });
        console.error('[admin] upstream rejected the request:', why.slice(0, 80));
        return send(res, 502, { ok: false, error: 'upstream', message: 'The data sheet rejected the request. Check APPS_SCRIPT_SECRET and the Apps Script deployment.' });
      }
      return send(res, 200, j);
    } catch (e) {
      console.error('[admin] error:', (e && (e.code || e.message)) || 'unknown');
      return send(res, 500, { ok: false, error: 'server_error', message: 'Something went wrong on our side. Please try again.' });
    }
  };
}

module.exports = createHandler({ store: require('./_lib/store') });
module.exports.createHandler = createHandler;
