const test = require('node:test');
const assert = require('node:assert/strict');
const { init, setup, PASSKEY, NEW_PASSKEY } = require('./harness');
const { accessFor, ROLE_IDS } = require('../../api/_lib/permissions');

test.before(init);

/* A world with one account of each role, each signed in. */
async function world() {
  const t = setup();
  const s = {};
  for (const [name, role] of [['super.one', 'super_admin'], ['admin.one', 'admin'], ['editor.one', 'editor'], ['general.one', 'general']]) s[role] = await t.asUser(name, role);
  s.id = u => t.store.users.find(x => x.username === u).id;
  return { t, s };
}
const list = (t, who, extra) => t.M(Object.assign({ action: 'users.list' }, extra), who);
const upd = (t, who, id, patch) => t.M(Object.assign({ action: 'users.update', id }, patch), who);

/* ---------- the four roles ---------- */
test('the permission matrix: four roles, General User has no administrative privileges', () => {
  assert.deepEqual(ROLE_IDS.sort(), ['admin', 'editor', 'general', 'super_admin']);
  const p = r => accessFor(r).permissions;
  assert.deepEqual(p('general'), ['account:view']);
  assert.equal(accessFor('general').landing, 'account');
  for (const r of ['editor', 'admin', 'super_admin']) assert.equal(accessFor(r).landing, 'portal');
  assert.ok(p('editor').includes('content:edit') && p('editor').includes('photos:manage'));
  assert.ok(!p('editor').some(x => /^(users|roles|passkey|settings|inbox|votes)/.test(x)), 'editors have no admin sections');
  assert.ok(p('admin').includes('users:manage') && p('admin').includes('inbox:read') && !p('admin').some(x => /^(roles|passkey|settings):|users:delete/.test(x)));
  for (const x of ['roles:assign', 'passkey:manage', 'settings:manage', 'users:delete']) assert.ok(p('super_admin').includes(x));
  assert.deepEqual(accessFor('mystery').permissions, [], 'unknown roles get nothing');
});

/* ---------- viewing / searching ---------- */
test('user list shows name, username, email, role, status, verification and registration date; only managers can see it', async () => {
  const { t, s } = await world();
  t.seed('pending.user', { status: 'pending', emailVerifiedAt: null, email: 'pending@example.com' });
  const r = await list(t, s.admin);
  assert.equal(r.status, 200); assert.equal(r.body.total, 5);
  const u = r.body.users.find(x => x.username === 'pending.user');
  assert.deepEqual(Object.keys(u).filter(k => ['fullName', 'username', 'email', 'role', 'status', 'emailVerified', 'createdAt'].includes(k)).sort(), ['createdAt', 'email', 'emailVerified', 'fullName', 'role', 'status', 'username']);
  assert.equal(u.emailVerified, false); assert.equal(u.status, 'pending');
  assert.equal(r.body.users.find(x => x.username === 'super.one').emailVerified, true);
  for (const role of ['editor', 'general']) assert.equal((await list(t, s[role])).status, 403);
  assert.equal((await t.M({ action: 'users.list' })).status, 401);
});

test('search by name, username or email, and filter by role and status', async () => {
  const { t, s } = await world();
  t.seed('zed.zulu', { fullName: 'Zed Zulu', email: 'zz@mail.test' });
  t.seed('susp.user', { status: 'suspended' });
  assert.deepEqual((await list(t, s.super_admin, { q: 'zulu' })).body.users.map(u => u.username), ['zed.zulu']);
  assert.deepEqual((await list(t, s.super_admin, { q: 'ZZ@MAIL' })).body.users.map(u => u.username), ['zed.zulu']);
  assert.deepEqual((await list(t, s.super_admin, { q: 'zed.z' })).body.users.map(u => u.username), ['zed.zulu']);
  assert.equal((await list(t, s.super_admin, { role: 'editor' })).body.total, 1);
  assert.equal((await list(t, s.super_admin, { status: 'suspended' })).body.total, 1);
  assert.equal((await list(t, s.super_admin, { role: 'hacker' })).status, 400);
  assert.equal((await list(t, s.super_admin, { page: 1, pageSize: 2 })).body.users.length, 2);
});

/* ---------- editing and role rules ---------- */
test('only a Super Admin can change roles; an Admin, Editor or General User cannot', async () => {
  const { t, s } = await world();
  const target = s.id('general.one');
  for (const who of [s.admin, s.editor]) assert.ok([403].includes((await upd(t, who, target, { role: 'editor' })).status));
  assert.equal((await upd(t, s.general, target, { role: 'admin' })).status, 403);
  assert.equal(t.store.users.find(u => u.id === target).role, 'general');
  const r = await upd(t, s.super_admin, target, { role: 'editor' });
  assert.equal(r.status, 200); assert.equal(r.body.user.role, 'editor');
  assert.equal((await upd(t, s.super_admin, target, { role: 'wizard' })).status, 400);
  assert.ok(t.store.events.some(e => e.type === 'user_update' && /role general to editor/.test(e.detail)));
});

test('nobody can elevate themselves, change their own status, or delete themselves', async () => {
  const { t, s } = await world();
  const tries = [[s.admin, 'admin.one', 'super_admin'], [s.editor, 'editor.one', 'admin'], [s.general, 'general.one', 'admin'], [s.super_admin, 'super.one', 'admin']];
  for (const [who, name, role] of tries) {
    assert.equal((await upd(t, who, s.id(name), { role })).status, 403, name + ' changing own role');
    assert.equal((await upd(t, who, s.id(name), { status: 'suspended' })).status, 403, name + ' suspending self');
  }
  assert.deepEqual(['admin', 'editor', 'general', 'super_admin'], ['admin.one', 'editor.one', 'general.one', 'super.one'].map(n => t.store.users.find(u => u.username === n).role).sort());
  assert.equal((await t.M({ action: 'users.delete', id: s.id('super.one'), confirm: 'super.one' }, s.super_admin)).status, 403);
});

test('an Admin manages only lower-ranked users; Super Admins and other Admins are off limits', async () => {
  const { t, s } = await world();
  assert.equal((await upd(t, s.editor, s.id('general.one'), { fullName: 'x y' })).status, 403);
  assert.equal((await upd(t, s.general, s.id('general.one'), { fullName: 'x y' })).status, 403);
  assert.equal((await upd(t, s.admin, s.id('general.one'), { fullName: 'New Name' })).status, 200);
  assert.equal((await upd(t, s.admin, s.id('editor.one'), { status: 'suspended' })).status, 200);
  assert.equal((await upd(t, s.admin, s.id('super.one'), { fullName: 'Hacked' })).status, 403);
  t.seed('admin.two', { role: 'admin' });
  assert.equal((await upd(t, s.admin, t.store.users.find(u => u.username === 'admin.two').id, { status: 'suspended' })).status, 403);
  assert.equal(t.store.users.find(u => u.username === 'super.one').fullName.startsWith('Person'), true);
});

test('activate / deactivate: deactivated users lose access immediately and cannot sign in', async () => {
  const { t, s } = await world();
  const target = s.id('editor.one');
  assert.equal((await upd(t, s.admin, target, { status: 'suspended' })).body.user.status, 'suspended');
  assert.equal((await t.A({ action: 'session' }, { cookie: s.editor.cookie })).body.authenticated, false);
  assert.equal((await t.A({ action: 'signin', username: 'editor.one', passkey: PASSKEY })).status, 403);
  assert.equal((await upd(t, s.admin, target, { status: 'active' })).body.user.status, 'active');
  assert.equal((await t.A({ action: 'signin', username: 'editor.one', passkey: PASSKEY })).status, 200);
  assert.equal((await upd(t, s.super_admin, target, { status: 'pending' })).status, 400);
});

test('editing details: names, usernames and emails are validated and kept unique; a new email becomes unverified', async () => {
  const { t, s } = await world();
  const id = s.id('general.one');
  t.seed('taken.name', { email: 'taken@example.com' });
  assert.equal((await upd(t, s.admin, id, { username: 'taken.name' })).body.errors.username, 'That username is already taken.');
  assert.equal((await upd(t, s.admin, id, { email: 'TAKEN@example.com' })).body.errors.email, 'An account with this email already exists.');
  assert.ok((await upd(t, s.admin, id, { fullName: '' })).body.errors.fullName);
  assert.ok((await upd(t, s.admin, id, { email: 'bad' })).body.errors.email);
  assert.ok((await upd(t, s.admin, id, { username: 'admin' })).body.errors.username);
  const r = await upd(t, s.admin, id, { username: 'renamed.user', email: 'New.Email@Example.com', fullName: 'Renamed Person' });
  assert.equal(r.status, 200);
  const u = t.store.users.find(x => x.id === id);
  assert.equal(u.username, 'renamed.user'); assert.equal(u.email, 'new.email@example.com'); assert.equal(u.emailVerifiedAt, null);
  assert.equal(r.body.user.emailVerified, false);
});

test('sensitive changes sign the affected user out (role, deactivation, email, username)', async () => {
  const { t, s } = await world();
  for (const patch of [{ role: 'editor' }, { status: 'suspended' }, { email: 'x1@example.com' }, { username: 'newname.one' }]) {
    const who = await t.asUser('victim', 'general');
    assert.equal((await t.A({ action: 'session' }, { cookie: who.cookie })).body.authenticated, true);
    assert.equal((await upd(t, s.super_admin, t.store.users.find(u => u.username === 'victim').id, patch)).status, 200);
    assert.equal((await t.A({ action: 'session' }, { cookie: who.cookie })).body.authenticated, false, JSON.stringify(patch));
    t.store.users.splice(t.store.users.findIndex(u => u.username === (patch.username || 'victim')), 1);
  }
  const keep = await t.asUser('victim2', 'general');                    // a harmless edit does not
  await upd(t, s.super_admin, t.store.users.find(u => u.username === 'victim2').id, { fullName: 'Just Renamed' });
  assert.equal((await t.A({ action: 'session' }, { cookie: keep.cookie })).body.authenticated, true);
});

test('the last active Super Admin is protected: simultaneous demotions cannot leave the portal without one', async () => {
  const t = setup();
  const a = await t.asUser('super.a', 'super_admin'), b = await t.asUser('super.b', 'super_admin');
  const id = n => t.store.users.find(u => u.username === n).id;
  const [r1, r2] = await Promise.all([upd(t, a, id('super.b'), { role: 'admin' }), upd(t, b, id('super.a'), { role: 'admin' })]);
  assert.ok(t.store.users.filter(u => u.role === 'super_admin' && u.status === 'active').length >= 1, 'at least one Super Admin remains');
  assert.ok([r1.status, r2.status].includes(409) || [r1.status, r2.status].every(x => x === 200));
});

test('a Super Admin account cannot be deleted directly (demote first); demoting another Super Admin is allowed', async () => {
  const { t, s } = await world();
  t.seed('super.two', { role: 'super_admin' });
  const two = t.store.users.find(u => u.username === 'super.two').id;
  const r = await t.M({ action: 'users.delete', id: two, confirm: 'super.two' }, s.super_admin);
  assert.equal(r.status, 409); assert.equal(r.body.error, 'demote_first');
  assert.equal((await upd(t, s.super_admin, two, { role: 'admin' })).status, 200);
  assert.equal((await t.M({ action: 'users.delete', id: two, confirm: 'super.two' }, s.super_admin)).status, 200);
});

/* ---------- deleting ---------- */
test('deleting needs the right permission, a typed confirmation, and removes the account and its sessions', async () => {
  const { t, s } = await world();
  const victim = await t.asUser('doomed.user', 'general');
  const id = s.id('doomed.user');
  for (const who of [s.admin, s.editor, s.general]) assert.equal((await t.M({ action: 'users.delete', id, confirm: 'doomed.user' }, who)).status, 403);
  assert.equal((await t.M({ action: 'users.delete', id, confirm: 'wrong' }, s.super_admin)).status, 400);
  assert.equal((await t.M({ action: 'users.delete', id }, s.super_admin)).status, 400);
  assert.ok(t.store.users.some(u => u.id === id));
  assert.equal((await t.M({ action: 'users.delete', id, confirm: 'doomed.user' }, s.super_admin)).status, 200);
  assert.ok(!t.store.users.some(u => u.id === id));
  assert.equal((await t.A({ action: 'session' }, { cookie: victim.cookie })).body.authenticated, false);
  assert.equal((await t.A({ action: 'signin', username: 'doomed.user', passkey: PASSKEY })).status, 401);
  assert.equal((await t.M({ action: 'users.delete', id: '999999', confirm: 'x' }, s.super_admin)).status, 404);
  assert.ok(t.store.events.some(e => e.type === 'user_delete'));
});

test('malformed ids and fields are rejected by the backend', async () => {
  const { t, s } = await world();
  for (const id of [null, 'abc', '1; drop table users', -1, {}, '']) assert.equal((await upd(t, s.super_admin, id, { fullName: 'A B' })).status, 400);
  assert.equal((await t.M({ action: 'users.update' }, s.super_admin)).status, 400);
  assert.equal((await t.M({ action: 'users.drop' }, s.super_admin)).status, 400);
});

test('every user-management action needs the CSRF token', async () => {
  const { t, s } = await world();
  const noCsrf = { cookie: s.super_admin.cookie };
  assert.equal((await t.M({ action: 'users.list' }, noCsrf)).status, 403);
  assert.equal((await t.M({ action: 'users.update', id: s.id('general.one'), role: 'admin' }, noCsrf)).status, 403);
  assert.equal(t.store.users.find(u => u.username === 'general.one').role, 'general');
});

/* ---------- roles in the rest of the portal ---------- */
test('Editor and General User are refused the inbox and votes on the server; Admin and Super Admin are allowed', async () => {
  const { t, s } = await world();
  for (const action of ['inbox', 'votes']) {
    assert.equal((await t.M({ action }, s.editor)).status, 403);
    assert.equal((await t.M({ action }, s.general)).status, 403);
    assert.equal((await t.M({ action }, s.admin)).status, 200);
    assert.equal((await t.M({ action }, s.super_admin)).status, 200);
  }
  assert.equal(t.upstreamCalls.length, 4);
});

test('the session reports each role\'s landing page and permissions', async () => {
  const { t, s } = await world();
  const who = async c => (await t.A({ action: 'session' }, { cookie: c.cookie })).body;
  assert.equal((await who(s.general)).access.landing, 'account');
  assert.equal((await who(s.editor)).access.landing, 'portal');
  assert.ok((await who(s.super_admin)).access.permissions.includes('passkey:manage'));
  assert.deepEqual((await who(s.admin)).access.assignableRoles, []);
  assert.deepEqual((await who(s.super_admin)).access.assignableRoles.sort(), ROLE_IDS.slice().sort());
});

/* ---------- shared passkey settings ---------- */
const chg = (t, who, p) => t.M(Object.assign({ action: 'passkey.change' }, p), who);

test('only a Super Admin can see or change the shared passkey settings', async () => {
  const { t, s } = await world();
  for (const role of ['admin', 'editor', 'general']) {
    assert.equal((await t.M({ action: 'passkey.status' }, s[role])).status, 403);
    assert.equal((await chg(t, s[role], { currentPasskey: PASSKEY, newPasskey: NEW_PASSKEY })).status, 403);
  }
  const st = await t.M({ action: 'passkey.status' }, s.super_admin);
  assert.equal(st.status, 200); assert.equal(st.body.source, 'environment'); assert.equal(st.body.changedAt, null);
  assert.ok(!JSON.stringify(st.body).includes('scrypt'), 'the hash is never returned');
});

test('changing the passkey needs the current passkey, a strong new one, and validates everything', async () => {
  const { t, s } = await world();
  assert.equal((await chg(t, s.super_admin, { currentPasskey: 'wrong wrong wrong', newPasskey: NEW_PASSKEY })).status, 403);
  const short = await chg(t, s.super_admin, { currentPasskey: PASSKEY, newPasskey: 'short' });
  assert.equal(short.status, 400); assert.ok(short.body.errors.newPasskey);
  assert.ok((await chg(t, s.super_admin, { currentPasskey: PASSKEY, newPasskey: PASSKEY })).body.errors.newPasskey);
  assert.ok((await chg(t, s.super_admin, { newPasskey: NEW_PASSKEY })).body.errors.currentPasskey);
  assert.equal((await t.M({ action: 'passkey.status' }, s.super_admin)).body.source, 'environment');   // nothing changed yet
});

test('guessing the current passkey through the settings form is rate limited', async () => {
  const { t, s } = await world();
  for (let i = 0; i < 5; i++) assert.equal((await chg(t, s.super_admin, { currentPasskey: 'guess number ' + i, newPasskey: NEW_PASSKEY })).status, 403);
  assert.equal((await chg(t, s.super_admin, { currentPasskey: PASSKEY, newPasskey: NEW_PASSKEY })).status, 429);
});

test('rotation: the new passkey replaces the old, every session (including the admin\'s) is rejected, and nothing leaks', async () => {
  const { t, s } = await world();
  const r = await chg(t, s.super_admin, { currentPasskey: PASSKEY, newPasskey: NEW_PASSKEY });
  assert.equal(r.status, 200); assert.equal(r.body.signedOut, true);
  assert.ok(!JSON.stringify(r.body).includes(NEW_PASSKEY) && !JSON.stringify(r.body).includes('scrypt:'));
  for (const who of [s.super_admin, s.admin, s.editor, s.general]) {
    const c = await t.A({ action: 'session' }, { cookie: who.cookie });
    assert.equal(c.body.authenticated, false); assert.equal(c.body.reason, 'passkey_changed');
    assert.equal((await t.M({ action: 'inbox' }, who)).status, 401);
  }
  assert.equal(t.store.sessions.length, 0, 'rejected sessions are removed as they are noticed');
  assert.equal((await t.A({ action: 'signin', username: 'general.one', passkey: PASSKEY })).status, 401);          // old passkey is dead
  assert.equal((await t.A({ action: 'signin', username: 'general.one', passkey: NEW_PASSKEY })).status, 200);       // new one works
  assert.equal((await t.A(t.reg({ username: 'fresh.one', email: 'f@example.com', passkey: PASSKEY, confirmPasskey: PASSKEY }))).status, 401);   // sign-up uses it too
  assert.equal((await t.A(t.reg({ username: 'fresh.one', email: 'f@example.com', passkey: NEW_PASSKEY, confirmPasskey: NEW_PASSKEY }))).status, 202);
  assert.ok(!JSON.stringify(t.store.users).includes(NEW_PASSKEY));
  const again = await t.asUser('super.one', 'super_admin');
  // login() used the old passkey constant; sign in with the new one instead
  const si = await t.A({ action: 'signin', username: 'super.one', passkey: NEW_PASSKEY });
  const st = await t.M({ action: 'passkey.status' }, { cookie: t.cookieOf(si), headers: { 'x-csrf-token': si.body.csrf } });
  assert.equal(st.body.source, 'database'); assert.equal(st.body.changedBy, 'super.one'); assert.ok(st.body.changedAt);
  assert.ok(t.store.events.some(e => e.type === 'passkey_change'));
});
