/* User management and Shared Passkey tabs for the admin portal.
   Everything shown here comes from /api/admin; the server decides who may do what on every request,
   so hiding a button here is a convenience, never the protection. */
(function () {
  'use strict';
  var A = function () { return window.SSCPC_AUTH; };
  var LABEL = { super_admin: 'Super Admin', admin: 'Admin', editor: 'Editor', general: 'General User' };
  var STATUS = { active: 'Active', pending: 'Pending', suspended: 'Suspended' };

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function date(ms) { return ms ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ms)) : 'Never'; }
  function dateTime(ms) { return ms ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ms)) : ''; }
  function badge(kind, text) { return '<span class="u-badge b-' + kind + '">' + esc(text) + '</span>'; }
  function button(label, fn, cls) { var b = el('button', 'btn' + (cls ? ' ' + cls : ''), esc(label)); b.type = 'button'; b.addEventListener('click', fn); return b; }

  /* ---------- dialog helpers (one shared <dialog id="cdlg">) ---------- */
  function openModal(node) { var d = document.getElementById('cdlg'); d.innerHTML = ''; d.appendChild(node); if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute('open', ''); return d; }
  function closeModal() { var d = document.getElementById('cdlg'); if (d.close) d.close(); else d.removeAttribute('open'); d.innerHTML = ''; }

  /* Asks "are you sure?". If typeToConfirm is given, the person must type it exactly. Resolves true/false. */
  function confirmBox(o) {
    return new Promise(function (resolve) {
      var w = el('form'); w.noValidate = true;
      w.appendChild(el('h3', '', esc(o.title))); w.appendChild(el('p', '', o.body));
      var inp = null;
      if (o.typeToConfirm) {
        var lab = el('label', 'u-form', '<span>Type <b>' + esc(o.typeToConfirm) + '</b> to confirm</span>'); inp = el('input', 'in'); inp.autocomplete = 'off'; inp.spellcheck = false; lab.appendChild(inp); w.appendChild(lab);
      }
      var foot = el('div', 'u-foot'), ok = button(o.confirmLabel || 'Confirm', function () {}, o.danger ? 'danger' : ''), no = button('Cancel', function () { closeModal(); resolve(false); }, 'ghost');
      ok.type = 'submit'; if (inp) { ok.disabled = true; inp.addEventListener('input', function () { ok.disabled = inp.value !== o.typeToConfirm; }); }
      foot.append(no, ok); w.appendChild(foot);
      w.addEventListener('submit', function (e) { e.preventDefault(); if (inp && inp.value !== o.typeToConfirm) return; closeModal(); resolve(true); });
      openModal(w).addEventListener('cancel', function () { resolve(false); }, { once: true });
      setTimeout(function () { (inp || no).focus(); }, 30);
    });
  }

  /* =========================================================
     USERS
     ========================================================= */
  var S = { q: '', role: '', status: '', page: 1, size: 25, data: null, msg: null, timer: null };

  function usersTab() {
    var w = el('div', 'u-wrap');
    var msg = el('div', 'u-msg'); msg.hidden = true; msg.setAttribute('role', 'status');
    var bar = el('div', 'u-bar'), q = el('input', 'in u-search'), role = el('select', 'in'), status = el('select', 'in'), count = el('span', 'u-count');
    q.type = 'search'; q.placeholder = 'Search by name, username or email'; q.value = S.q; q.setAttribute('aria-label', 'Search users');
    role.setAttribute('aria-label', 'Filter by role'); status.setAttribute('aria-label', 'Filter by status');
    role.innerHTML = '<option value="">All roles</option>' + Object.keys(LABEL).map(function (k) { return '<option value="' + k + '">' + LABEL[k] + '</option>'; }).join('');
    status.innerHTML = '<option value="">All statuses</option>' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '">' + STATUS[k] + '</option>'; }).join('');
    role.value = S.role; status.value = S.status;
    bar.append(q, role, status, button('Refresh', function () { load(); }, 'ghost'), count);
    var host = el('div', 'tbl u-tbl'), pager = el('div', 'u-pager');
    w.append(msg, bar, host, pager);

    function say(kind, text) { msg.hidden = !text; msg.className = 'u-msg ' + (kind || ''); msg.textContent = text || ''; }
    function load() {
      host.innerHTML = '<div class="u-empty">Loading users…</div>'; pager.innerHTML = '';
      A().admin('users.list', { q: S.q, role: S.role, status: S.status, page: S.page, pageSize: S.size }).then(function (d) {
        S.data = d; draw();
      }, function (e) { host.innerHTML = '<div class="u-empty">Could not load users.</div>'; say('err', e.message); });
    }
    function draw() {
      var d = S.data; count.textContent = d.total + (d.total === 1 ? ' user' : ' users');
      if (!d.users.length) { host.innerHTML = '<div class="u-empty">No users match your search.</div>'; pager.innerHTML = ''; return; }
      var t = el('table'); t.innerHTML = '<thead><tr><th>Name</th><th class="hide-sm">Email</th><th>Role</th><th>Status</th><th class="hide-md" title="Email verification status">Email verified</th><th class="hide-md">Registered</th><th></th></tr></thead>';
      var tb = el('tbody');
      d.users.forEach(function (u) {
        var tr = el('tr', 'u-row');
        tr.innerHTML = '<td class="u-wrapcell"><span class="u-name">' + esc(u.fullName) + (u.self ? ' <small>(you)</small>' : '') + '</span><span class="u-sub">@' + esc(u.username) + '</span></td>' +
          '<td class="hide-sm">' + (u.email ? esc(u.email) : '<span class="u-sub">none on file</span>') + '</td>' +
          '<td>' + badge(u.role, u.roleLabel || LABEL[u.role] || u.role) + '</td><td>' + badge(u.status, STATUS[u.status] || u.status) + '</td>' +
          '<td class="hide-md">' + (u.emailVerified ? badge('yes', 'Verified') : badge('no', 'Not verified')) + '</td><td class="hide-md">' + date(u.createdAt) + '</td>';
        var act = el('td'), box = el('div', 'u-act');
        if (u.canEdit && !u.self && u.status !== 'pending') box.appendChild(button(u.status === 'active' ? 'Deactivate' : 'Activate', function (ev) { ev.stopPropagation(); toggle(u); }, 'ghost sm'));
        box.appendChild(button(u.canEdit ? 'Edit' : 'View', function (ev) { ev.stopPropagation(); edit(u); }, 'sm'));
        act.appendChild(box); tr.appendChild(act); tr.addEventListener('click', function () { edit(u); }); tb.appendChild(tr);
      });
      t.appendChild(tb); host.innerHTML = ''; host.appendChild(t);
      var pages = Math.max(1, Math.ceil(d.total / d.pageSize)); pager.innerHTML = '';
      if (pages > 1) pager.append(button('Previous', function () { S.page--; load(); }, 'ghost sm'), el('span', '', 'Page ' + d.page + ' of ' + pages), button('Next', function () { S.page++; load(); }, 'ghost sm'));
      pager.firstChild && (pager.firstChild.disabled = d.page <= 1); pager.lastChild && pages > 1 && (pager.lastChild.disabled = d.page >= pages);
    }
    function toggle(u) {
      var on = u.status === 'active';
      confirmBox({ title: (on ? 'Deactivate ' : 'Activate ') + u.fullName + '?', body: on ? 'They will be signed out straight away and will not be able to sign in until you activate the account again.' : 'They will be able to sign in again with their username and the shared passkey.', confirmLabel: on ? 'Deactivate' : 'Activate', danger: on })
        .then(function (yes) { if (!yes) return; return A().admin('users.update', { id: u.id, status: on ? 'suspended' : 'active' }).then(function () { say('ok', u.fullName + (on ? ' was deactivated.' : ' was activated.')); load(); }, function (e) { say('err', e.message); }); });
    }
    function edit(u) {
      var f = el('form', 'u-form'); f.noValidate = true;
      var can = u.canEdit, canRename = can && A().can('users:rename'), canRole = can && !u.self && A().can('roles:assign');
      f.appendChild(el('h3', '', esc(can ? 'Edit user' : 'User details')));
      if (!can) f.appendChild(el('p', '', 'You can view this account but not change it.'));
      function row(id, label, html, hint) { var l = el('label', '', '<span>' + label + '</span>' + html + '<span class="u-err" id="e_' + id + '" role="alert"></span>' + (hint ? '<span class="u-hint">' + hint + '</span>' : '')); return l; }
      f.appendChild(row('fullName', 'Full name', '<input class="in" name="fullName" maxlength="60" value="' + esc(u.fullName) + '"' + (can ? '' : ' disabled') + '>'));
      f.appendChild(row('username', 'Personal username', '<input class="in" name="username" maxlength="24" autocapitalize="none" spellcheck="false" value="' + esc(u.username) + '"' + (canRename ? '' : ' disabled') + '>'));
      f.appendChild(row('email', 'Email address', '<input class="in" name="email" type="email" maxlength="254" value="' + esc(u.email || '') + '"' + (can ? '' : ' disabled') + '>',
        u.emailVerified ? 'Verified. Changing the address marks it as unverified.' : 'Not verified.'));
      var roles = (S.data && S.data.assignableRoles && S.data.assignableRoles.length ? S.data.assignableRoles : [u.role]);
      var two = el('div', 'u-two');
      two.appendChild(row('role', 'Role', '<select class="in" name="role"' + (canRole ? '' : ' disabled') + '>' + roles.concat(roles.indexOf(u.role) < 0 ? [u.role] : []).map(function (r) { return '<option value="' + r + '"' + (r === u.role ? ' selected' : '') + '>' + esc(LABEL[r] || r) + '</option>'; }).join('') + '</select>'));
      two.appendChild(row('status', 'Status', '<select class="in" name="status"' + (can && !u.self && u.status !== 'pending' ? '' : ' disabled') + '>' + ['active', 'suspended'].concat(u.status === 'pending' ? ['pending'] : []).map(function (s) { return '<option value="' + s + '"' + (s === u.status ? ' selected' : '') + '>' + STATUS[s] + '</option>'; }).join('') + '</select>'));
      f.appendChild(two);
      f.appendChild(el('p', 'u-hint', 'Registered ' + dateTime(u.createdAt) + (u.lastLoginAt ? '. Last signed in ' + dateTime(u.lastLoginAt) + '.' : '. Has not signed in yet.')));
      var top = el('div', 'u-err'); top.id = 'e_top'; top.setAttribute('role', 'alert'); f.appendChild(top);
      var foot = el('div', 'u-foot'), save = button('Save changes', function () {}); save.type = 'submit';
      if (u.canDelete) foot.appendChild(Object.assign(button('Delete account', function () { remove(u); }, 'danger'), { className: 'btn danger u-spacer' }));
      foot.appendChild(button(can ? 'Cancel' : 'Close', closeModal, 'ghost')); if (can) foot.appendChild(save); f.appendChild(foot);
      f.addEventListener('submit', function (e) {
        e.preventDefault(); if (!can) return;
        Array.prototype.forEach.call(f.querySelectorAll('.u-err'), function (x) { x.textContent = ''; });
        var v = {}; new FormData(f).forEach(function (val, key) { v[key] = val; });
        var patch = { id: u.id };
        if (v.fullName !== u.fullName) patch.fullName = v.fullName;
        if (canRename && v.username !== u.username) patch.username = v.username;
        if (v.email.trim().toLowerCase() !== (u.email || '')) patch.email = v.email;
        if (canRole && v.role && v.role !== u.role) patch.role = v.role;
        if (v.status && v.status !== u.status && !u.self) patch.status = v.status;
        if (Object.keys(patch).length === 1) { closeModal(); return; }
        var go = function () { save.disabled = true; save.textContent = 'Saving…';
          return A().admin('users.update', patch).then(function () { closeModal(); say('ok', 'Saved changes for ' + u.fullName + '.'); load(); }, function (er) {
            save.disabled = false; save.textContent = 'Save changes';
            var any = false; Object.keys(er.errors || {}).forEach(function (k) { var t = f.querySelector('#e_' + k); if (t) { t.textContent = er.errors[k]; any = true; } });
            if (!any) top.textContent = er.message;
          }); };
        if (patch.role || patch.status === 'suspended') confirmBox({ title: 'Confirm this change?', body: (patch.role ? 'Changing the role of ' + esc(u.fullName) + ' to <b>' + esc(LABEL[patch.role]) + '</b> signs them out so the new permissions apply.' : '') + (patch.status === 'suspended' ? ' ' + esc(u.fullName) + ' will be deactivated and signed out.' : ''), confirmLabel: 'Yes, save' }).then(function (y) { if (y) { openModal(f); go(); } else openModal(f); });
        else go();
      });
      openModal(f);
    }
    function remove(u) {
      confirmBox({ title: 'Delete ' + u.fullName + '?', body: 'This permanently deletes the account <b>@' + esc(u.username) + '</b> and signs them out. This cannot be undone.', confirmLabel: 'Delete account', danger: true, typeToConfirm: u.username })
        .then(function (yes) { if (!yes) return; return A().admin('users.delete', { id: u.id, confirm: u.username }).then(function () { say('ok', u.fullName + ' was deleted.'); load(); }, function (e) { say('err', e.message); }); });
    }
    q.addEventListener('input', function () { clearTimeout(S.timer); S.timer = setTimeout(function () { S.q = q.value.trim(); S.page = 1; load(); }, 300); });
    role.addEventListener('change', function () { S.role = role.value; S.page = 1; load(); });
    status.addEventListener('change', function () { S.status = status.value; S.page = 1; load(); });
    load();
    return w;
  }

  /* =========================================================
     SHARED PASSKEY SETTINGS (Super Admin)
     ========================================================= */
  function passkeyTab() {
    var w = el('div', 'u-wrap'), card = el('div', 'u-card');
    card.innerHTML = '<h3>Shared passkey</h3><p>Everyone signs in with their own username and this one shared passkey. The current passkey is never shown anywhere. Changing it signs <b>everyone</b> out, including you, and they must use the new passkey to sign back in.</p>';
    var status = el('p', 'u-hint', 'Loading…'); status.style.margin = '0 0 1rem'; card.appendChild(status);
    var msg = el('div', 'u-msg'); msg.hidden = true; msg.setAttribute('role', 'status');
    var f = el('form', 'u-form'); f.noValidate = true;
    function row(id, label) { return el('label', '', '<span>' + label + '</span><input class="in" id="pk_' + id + '" type="password" autocomplete="off" maxlength="128"><span class="u-err" id="pe_' + id + '" role="alert"></span>'); }
    f.append(row('cur', 'Current passkey'), row('new', 'New passkey'), row('conf', 'Confirm new passkey'));
    var showL = el('label', 'u-show', '<input type="checkbox" id="pk_show"> Show passkeys'); f.appendChild(showL);
    f.appendChild(el('p', 'u-hint', 'Use at least 12 characters. A short phrase of several words is easy to remember and hard to guess.'));
    var top = el('div', 'u-err'); top.setAttribute('role', 'alert'); f.appendChild(top);
    var save = button('Save changes', function () {}); save.type = 'submit'; var foot = el('div', 'u-foot'); foot.appendChild(save); f.appendChild(foot);
    card.appendChild(f); w.append(msg, card);
    var $i = function (id) { return f.querySelector('#pk_' + id); }, $e = function (id) { return f.querySelector('#pe_' + id); };
    showL.querySelector('input').addEventListener('change', function () { ['cur', 'new', 'conf'].forEach(function (k) { $i(k).type = this.checked ? 'text' : 'password'; }, this); });
    A().admin('passkey.status').then(function (d) {
      status.innerHTML = d.changedAt ? 'Last changed <b>' + esc(dateTime(d.changedAt)) + '</b>' + (d.changedBy ? ' by <b>@' + esc(d.changedBy) + '</b>' : '') + '.' : 'Not changed from this screen yet. The passkey currently in force was set during server setup.';
    }, function (e) { status.textContent = e.message; });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); top.textContent = ''; ['cur', 'new', 'conf'].forEach(function (k) { $e(k).textContent = ''; });
      var cur = $i('cur').value.trim(), nw = $i('new').value.trim(), cf = $i('conf').value.trim(), bad = false;
      if (!cur) { $e('cur').textContent = 'Enter the current passkey to confirm it is you.'; bad = true; }
      if (nw.length < 12) { $e('new').textContent = 'Use at least 12 characters.'; bad = true; } else if (nw === cur) { $e('new').textContent = 'The new passkey must be different from the current one.'; bad = true; }
      if (cf !== nw) { $e('conf').textContent = 'The two new passkeys do not match.'; bad = true; }
      if (bad) return;
      confirmBox({ title: 'Change the shared passkey?', body: 'Every signed-in person, <b>including you</b>, will be signed out immediately. Nobody can sign in again until they use the new passkey, so make sure you have shared it first.', confirmLabel: 'Change passkey', danger: true }).then(function (yes) {
        if (!yes) return; save.disabled = true; save.textContent = 'Saving…';
        A().admin('passkey.change', { currentPasskey: cur, newPasskey: nw }).then(function () {
          f.hidden = true; msg.hidden = false; msg.className = 'u-msg ok';
          msg.innerHTML = 'The shared passkey was changed and everyone has been signed out. <b>Sign in again</b> with the new passkey.';
          var again = button('Sign in again', function () { location.reload(); }); again.style.marginTop = '.8rem'; msg.appendChild(el('div')).appendChild(again);
          $i('cur').value = $i('new').value = $i('conf').value = '';
        }, function (er) {
          save.disabled = false; save.textContent = 'Save changes';
          var any = false; var map = { currentPasskey: 'cur', newPasskey: 'new' };
          Object.keys(er.errors || {}).forEach(function (k) { if (map[k]) { $e(map[k]).textContent = er.errors[k]; any = true; } });
          if (!any) top.textContent = er.message;
        });
      });
    });
    return w;
  }

  window.SSCPC_USERS = { users: usersTab, passkey: passkeyTab };
})();
