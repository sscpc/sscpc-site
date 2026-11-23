/* Loads the real tools/google-sheet-script-merged.gs against stubbed Google services and checks its admin gate. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), vm = require('vm'), path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', '..', 'tools', 'google-sheet-script-merged.gs'), 'utf8');

function run(secretProp, params) {
  const sandbox = {
    console,
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ text: t, setMimeType() { return this; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k === 'PROXY_SECRET' ? secretProp : null) }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => null }), openById: () => ({ getSheetByName: () => null }) }
  };
  vm.createContext(sandbox); vm.runInContext(code, sandbox);
  return JSON.parse(vm.runInContext('doGet', sandbox)({ parameter: params }).text);
}
const good = 'x'.repeat(40);

test('the old hardcoded key and wrong or missing keys are rejected', () => {
  for (const k of ['102030', '', 'y'.repeat(40)]) assert.equal(run(good, { key: k }).error, 'Unauthorized');
  assert.equal(run(good, {}).error, 'Unauthorized');
});
test('with no (or a too short) PROXY_SECRET the admin actions are off', () => {
  assert.equal(run('', { key: '' }).error, 'Unauthorized');
  assert.equal(run('short', { key: 'short' }).error, 'Unauthorized');
});
test('wrong guesses never lock out the real caller (no global lockout)', () => {
  for (let i = 0; i < 25; i++) run(good, { key: 'bad' + i });
  assert.equal(run(good, { key: good }).ok, true);
});
test('the correct secret reaches the inbox, votes and set actions', () => {
  assert.equal(run(good, { key: good }).v, 2);
  assert.equal(run(good, { key: good, action: 'set', sheet: 'nope' }).error, 'Row not found. Refresh and try again.');
});
test('the script no longer contains a hardcoded admin key', () => {
  assert.ok(!/ADMIN_KEY/.test(code) && !/102030/.test(code));
});
