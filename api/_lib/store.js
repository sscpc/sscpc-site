/* All database access (PostgreSQL, e.g. Neon). Table definitions: auth-setup/schema.sql.
   Every query is parameterised. A role is never taken from a public request: new accounts get the column
   default 'general', and only the audited user-management code can change it. Ids are returned as strings. */
let pool;
function db(text, params) {
  if (!pool) pool = new (require('pg').Pool)({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000 });
  return pool.query(text, params);
}

const COLS = 'id, username, full_name, email, email_verified_at, role, status, created_at, last_login_at';
const ms = d => (d ? d.getTime() : null);
const toUser = r => r && {
  id: String(r.id), username: r.username, fullName: r.full_name, email: r.email || null, emailVerifiedAt: ms(r.email_verified_at),
  role: r.role, status: r.status, createdAt: ms(r.created_at), lastLoginAt: ms(r.last_login_at)
};
const COLMAP = { username: 'username', fullName: 'full_name', email: 'email', emailVerifiedAt: 'email_verified_at', role: 'role', status: 'status' };

module.exports = {
  /* ---- users ---- */
  async usernameTaken(username, exceptId) {
    const r = await db('select 1 from users where lower(username) = $1 and ($2::bigint is null or id <> $2::bigint) limit 1', [username, exceptId || null]);
    return r.rowCount > 0;
  },
  async emailTaken(email, exceptId) {
    const r = await db('select 1 from users where lower(email) = $1 and ($2::bigint is null or id <> $2::bigint) limit 1', [email, exceptId || null]);
    return r.rowCount > 0;
  },
  async findUser(username) { return toUser((await db('select ' + COLS + ' from users where lower(username) = $1 limit 1', [username])).rows[0]); },
  async findUserById(id) { return toUser((await db('select ' + COLS + ' from users where id = $1::bigint', [id])).rows[0]); },

  /* Called only after the email code is verified. Returns the new user, or null if the username/email was taken meanwhile. */
  async createVerifiedUser(u) {
    try {
      const r = await db(
        'insert into users (username, full_name, email, email_verified_at, terms_accepted_at) values ($1, $2, $3, now(), $4) returning ' + COLS,
        [u.username, u.fullName, u.email, new Date(u.termsAcceptedAt)]);
      return toUser(r.rows[0]);
    } catch (e) { if (e && e.code === '23505') return null; throw e; }
  },

  async listUsers({ q, role, status, limit, offset }) {
    const where = [], p = [];
    if (q) { p.push('%' + q.replace(/[\\%_]/g, '\\$&') + '%'); const i = p.length; where.push("(username ilike $" + i + " escape '\\' or full_name ilike $" + i + " escape '\\' or coalesce(email, '') ilike $" + i + " escape '\\')"); }
    if (role) { p.push(role); where.push('role = $' + p.length); }
    if (status) { p.push(status); where.push('status = $' + p.length); }
    const w = where.length ? 'where ' + where.join(' and ') : '';
    const total = (await db('select count(*)::int as n from users ' + w, p)).rows[0].n;
    p.push(limit, offset);
    const rows = (await db('select ' + COLS + ' from users ' + w + ' order by created_at desc, id desc limit $' + (p.length - 1) + ' offset $' + p.length, p)).rows;
    return { total, users: rows.map(toUser) };
  },

  /* patch keys: username, fullName, email, emailVerifiedAt (null to clear), role, status. Returns the user, or null on a unique clash. */
  async updateUser(id, patch) {
    const sets = [], p = [];
    Object.keys(patch).forEach(k => { if (COLMAP[k]) { p.push(patch[k]); sets.push(COLMAP[k] + ' = $' + p.length); } });
    if (!sets.length) return toUser((await db('select ' + COLS + ' from users where id = $1::bigint', [id])).rows[0]);
    p.push(id);
    try { return toUser((await db('update users set ' + sets.join(', ') + ', updated_at = now() where id = $' + p.length + '::bigint returning ' + COLS, p)).rows[0]); }
    catch (e) { if (e && e.code === '23505') return null; throw e; }
  },
  async deleteUser(id) { await db('delete from users where id = $1::bigint', [id]); },   // sessions go with it (on delete cascade)
  async countActiveSuperAdmins() { return (await db("select count(*)::int as n from users where role = 'super_admin' and status = 'active'")).rows[0].n; },
  async markLogin(userId) { await db('update users set last_login_at = now() where id = $1::bigint', [userId]); },

  /* ---- registration: pending accounts and magic-link tokens ---- */
  /* Creates the account in the 'pending' state (role defaults to 'general'; it is never a parameter). */
  async createPendingUser(u) {
    try {
      const r = await db("insert into users (username, full_name, email, status, terms_accepted_at) values ($1, $2, $3, 'pending', $4) returning " + COLS,
        [u.username, u.fullName, u.email, new Date(u.termsAcceptedAt)]);
      return toUser(r.rows[0]);
    } catch (e) { if (e && e.code === '23505') return null; throw e; }
  },
  async findUserByEmail(email) { return toUser((await db('select ' + COLS + ' from users where lower(email) = $1 limit 1', [email])).rows[0]); },

  /* Stores a new token and, in the same statement, invalidates every earlier unused token for that account. */
  async issueVerificationToken(t) {
    await db(
      'with old as (update email_verification_tokens set used_at = $3 where user_id = $1::bigint and used_at is null) ' +
      'insert into email_verification_tokens (user_id, token_hash, created_at, expires_at, ip_hash) values ($1::bigint, $2, $3, $4, $5)',
      [t.userId, t.tokenHash, new Date(t.createdAt), new Date(t.expiresAt), t.ipHash]);
  },
  /* Atomic and single-use: marks the token used AND activates the pending account in ONE statement, or does neither.
     Returns the activated user, or null (invalid, already used, expired, or the account was not pending). */
  async claimVerification(tokenHash, nowMs) {
    const r = await db(
      "with t as (update email_verification_tokens set used_at = $2 where token_hash = $1 and used_at is null and expires_at > $2 returning user_id), " +
      "u as (update users set status = 'active', email_verified_at = $2, updated_at = $2 where id = (select user_id from t) and status = 'pending' and email_verified_at is null returning " + COLS + ") " +
      "select * from u", [tokenHash, new Date(nowMs)]);
    return toUser(r.rows[0]);
  },
  async getVerificationToken(tokenHash) {
    const r = (await db('select used_at, expires_at from email_verification_tokens where token_hash = $1', [tokenHash])).rows[0];
    return r ? { usedAt: ms(r.used_at), expiresAt: ms(r.expires_at) } : null;
  },

  /* ---- shared passkey (settings) ---- */
  async getPasskeyHash() {
    const r = (await db("select s.value, s.updated_at, u.username from settings s left join users u on u.id = s.updated_by where s.key = 'shared_passkey_hash'")).rows[0];
    return r ? { hash: r.value, changedAt: ms(r.updated_at), changedBy: r.username || null } : null;
  },
  async setPasskeyHash(hash, userId) {
    await db("insert into settings (key, value, updated_at, updated_by) values ('shared_passkey_hash', $1, now(), $2::bigint) on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by", [hash, userId]);
  },

  /* ---- rate limiting counters ---- */
  async countAttempts(bucket, seconds) {
    const r = await db('select count(*)::int as n from auth_attempts where bucket = $1 and created_at > now() - make_interval(secs => $2::double precision)', [bucket, seconds]);
    return r.rows[0].n;
  },
  async addAttempt(bucket) { await db('insert into auth_attempts (bucket) values ($1)', [bucket]); },
  async purgeAttempts() {
    await db("delete from auth_attempts where created_at < now() - interval '1 day'");
    await db("delete from auth_events where created_at < now() - interval '90 days'");
    await db("delete from sessions where expires_at < now() - interval '1 day' or last_seen_at < now() - interval '8 days'");
    // Registrations never verified within 24 hours are abandoned: free the username and email again.
    await db("delete from users where status = 'pending' and email_verified_at is null and created_at < now() - interval '24 hours'");
  },

  /* ---- sessions (timestamps are milliseconds from the caller's clock) ---- */
  async createSession(s) {
    await db('insert into sessions (token_hash, user_id, pk_epoch, created_at, last_seen_at, expires_at, ip_hash, user_agent) values ($1, $2::bigint, $3, $4, $4, $5, $6, $7)',
      [s.tokenHash, s.userId, s.pkEpoch, new Date(s.createdAt), new Date(s.expiresAt), s.ipHash, s.userAgent]);
  },
  async getSession(tokenHash) {
    const r = await db(
      'select s.id, s.pk_epoch, s.created_at, s.last_seen_at, s.expires_at, u.id as user_id, u.username, u.full_name, u.email, u.email_verified_at, u.role, u.status, u.created_at as user_created_at ' +
      'from sessions s join users u on u.id = s.user_id where s.token_hash = $1', [tokenHash]);
    const x = r.rows[0];
    if (!x) return null;
    return {
      id: x.id, pkEpoch: x.pk_epoch, createdAt: ms(x.created_at), lastSeenAt: ms(x.last_seen_at), expiresAt: ms(x.expires_at),
      user: { id: String(x.user_id), username: x.username, fullName: x.full_name, email: x.email || null, emailVerifiedAt: ms(x.email_verified_at), role: x.role, status: x.status, createdAt: ms(x.user_created_at) }
    };
  },
  async touchSession(id, t) { await db('update sessions set last_seen_at = $2 where id = $1', [id, new Date(t)]); },
  async deleteSession(tokenHash) { await db('delete from sessions where token_hash = $1', [tokenHash]); },
  async deleteUserSessions(userId) { await db('delete from sessions where user_id = $1::bigint', [userId]); },
  async deleteAllSessions() { await db('delete from sessions'); },
  async pruneUserSessions(userId, keep) {
    await db('delete from sessions where user_id = $1::bigint and id not in (select id from sessions where user_id = $1::bigint order by created_at desc limit $2)', [userId, keep]);
  },
  async recordEvent(e) {
    await db('insert into auth_events (type, username, user_id, ip_hash, user_agent, detail) values ($1, $2, $3::bigint, $4, $5, $6)',
      [e.type, e.username || null, e.userId || null, e.ipHash || null, (e.userAgent || '').slice(0, 200) || null, (e.detail || '').slice(0, 300) || null]);
  }
};
