/* Roles and permissions. The role is read from the database on every request, never from the browser.
   Unknown roles get nothing (fail closed). */
const EDITOR = ['account:view', 'portal:access', 'content:edit', 'content:publish', 'photos:manage'];
const ADMIN = EDITOR.concat(['inbox:read', 'inbox:write', 'votes:read', 'users:view', 'users:manage', 'users:rename']);
const SUPER = ADMIN.concat(['users:delete', 'roles:assign', 'passkey:manage', 'settings:manage']);

const ROLES = {
  super_admin: { label: 'Super Admin', rank: 4, landing: 'portal', permissions: SUPER },
  admin: { label: 'Admin', rank: 3, landing: 'portal', permissions: ADMIN },
  editor: { label: 'Editor', rank: 2, landing: 'portal', permissions: EDITOR },
  general: { label: 'General User', rank: 1, landing: 'account', permissions: ['account:view'] }
};
const ROLE_IDS = Object.keys(ROLES);

const rank = role => (ROLES[role] ? ROLES[role].rank : 0);
const can = (role, permission) => !!ROLES[role] && ROLES[role].permissions.indexOf(permission) > -1;

/* Who may a person manage? Everyone can edit their own name/email. Super Admins manage anyone. Admins manage only
   people of a lower rank (Editors and General Users). Nobody else manages anyone. */
function canManage(actor, target, self) {
  if (!can(actor.role, 'users:manage')) return false;
  if (self) return true;
  return actor.role === 'super_admin' || rank(actor.role) > rank(target.role);
}
const canDelete = (actor, target, self) => !self && can(actor.role, 'users:delete');

function accessFor(role) {
  const r = ROLES[role];
  return r
    ? { role, label: r.label, landing: r.landing, permissions: r.permissions.slice(), assignableRoles: can(role, 'roles:assign') ? ROLE_IDS.slice() : [] }
    : { role: String(role), label: 'No access', landing: 'account', permissions: [], assignableRoles: [] };
}

module.exports = { accessFor, can, canManage, canDelete, rank, ROLES, ROLE_IDS };
