/* In-memory stand-in for api/_lib/store.js, used only by tests. It mirrors the real store's behaviour, including the
   single atomic "use the token and activate the account" step. Ids are strings, as with the real database. */
module.exports = function memoryStore(clock) {
  const users = [], attempts = [], sessions = [], events = [], tokens = []; let id = 0, sid = 0, passkey = null;
  const nowMs = () => (clock ? clock() : Date.now());
  const copy = u => (u ? { ...u } : u);
  const lc = s => String(s || '').toLowerCase();
  const store = {
    users, attempts, sessions, events, tokens,
    /* TEST ONLY: insert an account directly (the real code paths never accept a role from a request). */
    seedUser(o) {
      const u = { id: String(++id), username: o.username, fullName: o.fullName || 'Person ' + o.username.replace(/[^a-z]/gi, ''), email: o.email === undefined ? o.username + '@example.test' : o.email,
        emailVerifiedAt: o.emailVerifiedAt === undefined ? nowMs() : o.emailVerifiedAt, role: o.role || 'general', status: o.status || 'active', createdAt: nowMs(), lastLoginAt: null };
      users.push(u); return copy(u);
    },
    async usernameTaken(u, except) { return users.some(x => lc(x.username) === u && String(x.id) !== String(except || '')); },
    async emailTaken(e, except) { return users.some(x => x.email && lc(x.email) === e && String(x.id) !== String(except || '')); },
    async findUser(u) { return copy(users.find(x => lc(x.username) === u)); },
    async findUserById(i) { return copy(users.find(x => String(x.id) === String(i))); },
    async findUserByEmail(e) { return copy(users.find(x => x.email && lc(x.email) === e)); },
    async createPendingUser(u) {
      if (users.some(x => lc(x.username) === u.username || (x.email && lc(x.email) === u.email))) return null;
      const n = { id: String(++id), username: u.username, fullName: u.fullName, email: u.email, emailVerifiedAt: null, role: 'general', status: 'pending', createdAt: nowMs(), lastLoginAt: null, termsAcceptedAt: u.termsAcceptedAt };
      users.push(n); return copy(n);
    },
    async listUsers({ q, role, status, limit, offset }) {
      let r = users.slice().reverse();
      if (q) { const n = lc(q); r = r.filter(u => lc(u.username).includes(n) || lc(u.fullName).includes(n) || lc(u.email).includes(n)); }
      if (role) r = r.filter(u => u.role === role);
      if (status) r = r.filter(u => u.status === status);
      return { total: r.length, users: r.slice(offset, offset + limit).map(copy) };
    },
    async updateUser(i, patch) {
      const u = users.find(x => String(x.id) === String(i)); if (!u) return null;
      if (patch.username && users.some(x => x !== u && lc(x.username) === lc(patch.username))) return null;
      if (patch.email && users.some(x => x !== u && x.email && lc(x.email) === lc(patch.email))) return null;
      Object.assign(u, patch); return copy(u);
    },
    async deleteUser(i) {
      const k = users.findIndex(x => String(x.id) === String(i)); if (k < 0) return;
      users.splice(k, 1);
      for (let n = sessions.length - 1; n >= 0; n--) if (String(sessions[n].userId) === String(i)) sessions.splice(n, 1);
      for (let n = tokens.length - 1; n >= 0; n--) if (String(tokens[n].userId) === String(i)) tokens.splice(n, 1);
    },
    async countActiveSuperAdmins() { return users.filter(u => u.role === 'super_admin' && u.status === 'active').length; },
    async markLogin(uid) { const u = users.find(x => String(x.id) === String(uid)); if (u) u.lastLoginAt = nowMs(); },

    async issueVerificationToken(t) {
      tokens.filter(x => String(x.userId) === String(t.userId) && !x.usedAt).forEach(x => { x.usedAt = t.createdAt; });   // older links stop working
      tokens.push({ userId: t.userId, tokenHash: t.tokenHash, createdAt: t.createdAt, expiresAt: t.expiresAt, usedAt: null });
    },
    async claimVerification(th, now) {
      const t = tokens.find(x => x.tokenHash === th && !x.usedAt && x.expiresAt > now); if (!t) return null;
      t.usedAt = now;
      const u = users.find(x => String(x.id) === String(t.userId));
      if (!u || u.status !== 'pending' || u.emailVerifiedAt) return null;
      u.status = 'active'; u.emailVerifiedAt = now; return copy(u);
    },
    async getVerificationToken(th) { const t = tokens.find(x => x.tokenHash === th); return t ? { usedAt: t.usedAt, expiresAt: t.expiresAt } : null; },

    async getPasskeyHash() { return passkey ? { ...passkey } : null; },
    async setPasskeyHash(hash, uid) { const u = users.find(x => String(x.id) === String(uid)); passkey = { hash, changedAt: nowMs(), changedBy: u ? u.username : null }; },

    async countAttempts(b, secs) { const t = nowMs() - secs * 1000; return attempts.filter(a => a.b === b && a.t > t).length; },
    async addAttempt(b) { attempts.push({ b, t: nowMs() }); },
    async purgeAttempts() {},

    async createSession(s) { sessions.push({ id: ++sid, ...s, lastSeenAt: s.createdAt }); },
    async getSession(th) {
      const s = sessions.find(x => x.tokenHash === th); if (!s) return null;
      const u = users.find(x => String(x.id) === String(s.userId));
      return { id: s.id, pkEpoch: s.pkEpoch, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, expiresAt: s.expiresAt, user: u ? copy(u) : null };
    },
    async touchSession(i, ms) { const s = sessions.find(x => x.id === i); if (s) s.lastSeenAt = ms; },
    async deleteSession(th) { const i = sessions.findIndex(x => x.tokenHash === th); if (i > -1) sessions.splice(i, 1); },
    async deleteUserSessions(uid) { for (let n = sessions.length - 1; n >= 0; n--) if (String(sessions[n].userId) === String(uid)) sessions.splice(n, 1); },
    async deleteAllSessions() { sessions.length = 0; },
    async pruneUserSessions(uid, keep) {
      const mine = sessions.filter(x => String(x.userId) === String(uid)).sort((a, b) => b.createdAt - a.createdAt).slice(keep);
      mine.forEach(m => sessions.splice(sessions.indexOf(m), 1));
    },
    async recordEvent(e) { events.push({ ...e }); }
  };
  return store;
};
