/* User management and shared-passkey settings. Called only from api/admin.js, after it has confirmed the session,
   the CSRF token and the permission for the action. The rules about WHO may change WHOM are enforced here, on the server. */
const { checkUsername, checkFullName, checkEmail, checkPasskey } = require('./validate');
const { can, canManage, canDelete, ROLES, ROLE_IDS } = require('./permissions');

const STATUSES = ['active', 'suspended'];
const ID_RE = /^\d{1,15}$/;
const fail = (status, error, message, extra) => ({ status, body: Object.assign({ ok: false, error, message }, extra || {}) });
const same = (a, b) => String(a) === String(b);

function view(u, actor) {
  const self = same(u.id, actor.id);
  return {
    id: String(u.id), username: u.username, fullName: u.fullName, email: u.email, role: u.role, roleLabel: (ROLES[u.role] || {}).label || u.role,
    status: u.status, emailVerified: !!u.emailVerifiedAt, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt, self,
    canEdit: canManage(actor, u, self), canDelete: canDelete(actor, u, self)
  };
}

async function list(body, ctx) {
  const q = typeof body.q === 'string' ? body.q.trim().slice(0, 100) : '';
  const role = body.role || '', status = body.status || '';
  if (role && ROLE_IDS.indexOf(role) < 0) return fail(400, 'validation', 'Unknown role filter.');
  if (status && ['active', 'suspended', 'pending'].indexOf(status) < 0) return fail(400, 'validation', 'Unknown status filter.');
  const pageSize = Number.isInteger(body.pageSize) ? Math.min(100, Math.max(1, body.pageSize)) : 50;
  const page = Number.isInteger(body.page) && body.page > 0 ? body.page : 1;
  const r = await ctx.store.listUsers({ q, role, status, limit: pageSize, offset: (page - 1) * pageSize });
  return { status: 200, body: { ok: true, users: r.users.map(u => view(u, ctx.actor)), total: r.total, page, pageSize, assignableRoles: can(ctx.actor.role, 'roles:assign') ? ROLE_IDS : [] } };
}

async function isLastSuperAdmin(target, store) {
  return target.role === 'super_admin' && target.status === 'active' && (await store.countActiveSuperAdmins()) <= 1;
}
const LAST = () => fail(409, 'last_super_admin', 'There must always be at least one active Super Admin.');

async function update(body, ctx) {
  const { store, actor } = ctx;
  if (!ID_RE.test(String(body.id))) return fail(400, 'validation', 'Invalid user.');
  const target = await store.findUserById(String(body.id));
  if (!target) return fail(404, 'not_found', 'That user no longer exists.');
  const self = same(target.id, actor.id);
  if (!canManage(actor, target, self)) return fail(403, 'forbidden', 'You do not have permission to manage this user.');

  const patch = {}, changes = [], errors = {};

  if ('fullName' in body) {
    const c = checkFullName(body.fullName);
    if (!c.ok) errors.fullName = c.message; else if (c.value !== target.fullName) { patch.fullName = c.value; changes.push('name'); }
  }
  if ('username' in body && String(body.username).trim().toLowerCase() !== target.username) {
    if (!can(actor.role, 'users:rename')) return fail(403, 'forbidden', 'You do not have permission to change usernames.');
    const c = checkUsername(body.username);
    if (!c.ok) errors.username = c.message;
    else if (await store.usernameTaken(c.value, target.id)) errors.username = 'That username is already taken.';
    else { patch.username = c.value; changes.push('username'); }
  }
  if ('email' in body) {
    const c = checkEmail(body.email);
    if (!c.ok) errors.email = c.message;
    else if (c.value !== (target.email || '')) {
      if (await store.emailTaken(c.value, target.id)) errors.email = 'An account with this email already exists.';
      else { patch.email = c.value; patch.emailVerifiedAt = null; changes.push('email (now unverified)'); }
    }
  }
  if ('role' in body && body.role !== target.role) {
    if (self) return fail(403, 'forbidden', 'You cannot change your own role.');
    if (!can(actor.role, 'roles:assign')) return fail(403, 'forbidden', 'Only a Super Admin can change roles.');
    if (ROLE_IDS.indexOf(body.role) < 0) errors.role = 'Unknown role.';
    else { if (await isLastSuperAdmin(target, store)) return LAST(); patch.role = body.role; changes.push('role ' + target.role + ' to ' + body.role); }
  }
  if ('status' in body && body.status !== target.status) {
    if (self) return fail(403, 'forbidden', 'You cannot change your own account status.');
    if (STATUSES.indexOf(body.status) < 0) errors.status = 'Status must be active or suspended.';
    else { if (body.status === 'suspended' && await isLastSuperAdmin(target, store)) return LAST(); patch.status = body.status; changes.push('status ' + target.status + ' to ' + body.status); }
  }

  if (Object.keys(errors).length) return fail(400, 'validation', 'Please fix the highlighted fields.', { errors });
  if (!Object.keys(patch).length) return { status: 200, body: { ok: true, user: view(target, actor), changed: false } };

  const updated = await store.updateUser(target.id, patch);
  if (!updated) return fail(409, 'conflict', 'Someone else just used that username or email. Please try another.');
  // Race guard: if two Super Admins demote each other at the same instant, both pass the check above. Look again
  // after the change and undo it if no active Super Admin is left.
  if (target.role === 'super_admin' && target.status === 'active' && (patch.role || patch.status === 'suspended') && (await store.countActiveSuperAdmins()) < 1) {
    await store.updateUser(target.id, { role: target.role, status: target.status });
    return LAST();
  }
  // Sensitive change to someone else's account: end their sessions so they sign in again under the new settings.
  if (!self && (patch.role || patch.status === 'suspended' || patch.email || patch.username)) await store.deleteUserSessions(target.id);
  await ctx.audit('user_update', target.username + ': ' + changes.join(', '), target.id);
  return { status: 200, body: { ok: true, user: view(updated, actor), changed: true } };
}

async function remove(body, ctx) {
  const { store, actor } = ctx;
  if (!ID_RE.test(String(body.id))) return fail(400, 'validation', 'Invalid user.');
  const target = await store.findUserById(String(body.id));
  if (!target) return fail(404, 'not_found', 'That user no longer exists.');
  const self = same(target.id, actor.id);
  if (!canDelete(actor, target, self)) return fail(403, 'forbidden', self ? 'You cannot delete your own account.' : 'You do not have permission to delete users.');
  if (typeof body.confirm !== 'string' || body.confirm !== target.username) return fail(400, 'confirm', 'Type the username exactly to confirm deleting this account.');
  if (target.role === 'super_admin') return fail(409, 'demote_first', 'A Super Admin cannot be deleted directly. Change their role first, then delete the account.');
  await store.deleteUser(target.id);          // their sessions are removed with them
  await ctx.audit('user_delete', target.username, target.id);
  return { status: 200, body: { ok: true } };
}

/* ---------------- shared passkey ---------------- */
const MIN_PASSKEY = 12;

async function passkeyStatus(body, ctx) {
  return { status: 200, body: { ok: true, source: ctx.cfg.passkeySource || 'environment', changedAt: ctx.cfg.passkeyChangedAt || null, changedBy: ctx.cfg.passkeyChangedBy || null, minLength: MIN_PASSKEY } };
}

async function passkeyChange(body, ctx) {
  const { store, actor, cfg } = ctx;
  const cur = checkPasskey(body.currentPasskey), next = checkPasskey(body.newPasskey), errors = {};
  if (!cur.ok) errors.currentPasskey = 'Enter the current shared passkey to confirm it is you.';
  if (!next.ok) errors.newPasskey = next.message;
  else if (next.value.length < MIN_PASSKEY) errors.newPasskey = 'Use at least ' + MIN_PASSKEY + ' characters. A short phrase of several words works well.';
  else if (cur.ok && next.value === cur.value) errors.newPasskey = 'The new passkey must be different from the current one.';
  if (Object.keys(errors).length) return fail(400, 'validation', 'Please fix the highlighted fields.', { errors });

  const bucket = 'pkchange:' + actor.id;     // guessing the current passkey through this form is limited too
  if ((await store.countAttempts(bucket, 900)) >= 5) return fail(429, 'too_many_attempts', 'Too many attempts. Please wait a few minutes and try again.');
  if (!(await ctx.verifyPasskey(cur.value, cfg.passkeyHash))) {
    await store.addAttempt(bucket);
    return fail(403, 'invalid_current', 'The current shared passkey is not correct.', { errors: { currentPasskey: 'The current shared passkey is not correct.' } });
  }
  const hash = await ctx.hashPasskey(next.value);
  await store.setPasskeyHash(hash, actor.id);
  // Every session carries a fingerprint of the passkey it was created under. The fingerprint just changed, so every existing
  // session (including this administrator's) is rejected on its next request and the person is told to sign in again.
  await ctx.audit('passkey_change', 'shared passkey rotated', null);
  return { status: 200, body: { ok: true, changedAt: ctx.now(), signedOut: true } };
}

module.exports = { list, update, remove, passkeyStatus, passkeyChange, view, MIN_PASSKEY };
