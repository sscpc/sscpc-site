/* SSCPC photo votes - add this to the SAME Apps Script project as tools/google-sheet-script.gs
   (it uses that file's ADMIN_KEY and the spreadsheet the script is attached to).

   1. Paste everything below into the project (a new file, "photo-votes", or the bottom of the existing one).
      If you pasted the older version, delete it first so the functions are not defined twice.
   2. In the existing doPost(e), add this as the VERY FIRST line inside the function:
        if (e && e.parameter && e.parameter.form === 'photo-vote') { return recordPhotoVote_(e.parameter); }
   3. In the existing doGet(e), add this as the VERY FIRST line inside the function:
        if (e && e.parameter && e.parameter.action === 'photo-votes') { return photoVotesReport_(e.parameter); }
   4. Deploy > Manage deployments > pencil > Version: New version > Deploy (the web app address stays the same).

   Tabs this creates automatically:
     "Photo votes"  : Photo | Photo name | Photographer | Votes | Last voted     (totals, read by Admin > Votes)
     "Voter log"    : Device and day | Photo | Time                              (one row per device per day; stops repeat votes)
   Visitors cannot read the numbers; only the admin portal can (with the admin key).
   Votes are counted only inside the voting window (read from the website, see below).
   The script answers with JSON: {ok:true}, {error:'already'}, {error:'closed'}, {error:'not_open'} or {error:'invalid'}. */
var PHOTO_VOTES_SHEET = 'Photo votes';
var VOTER_LOG_SHEET = 'Voter log';
var VOTE_TZ = 'Asia/Colombo';
/* Fallback times, used only if the website cannot be read. Set both to '' to accept votes at any time (e.g. while testing). */
var PHOTO_VOTE_OPENS = '2026-11-13T09:00:00+05:30';
var PHOTO_VOTE_CLOSES = '2026-11-13T17:00:00+05:30';

/* The voting window is read from the website (SITE.vote in js/data.js, edited in Admin > Site), so the site and this counter always agree.
   It is cached for 5 minutes. If the site cannot be read, the two fixed times above are used instead. */
var SITE_DATA_URL = 'https://sscpc.vercel.app/js/data.js';

function voteWindow_() {
  try {
    var cache = CacheService.getScriptCache(), hit = cache.get('vote-window');
    if (hit) return JSON.parse(hit);
    var txt = UrlFetchApp.fetch(SITE_DATA_URL + '?t=' + Date.now(), { muteHttpExceptions: true }).getContentText();
    var m = /"vote"\s*:\s*\{[^}]*?"opens"\s*:\s*"([^"]*)"[^}]*?"closes"\s*:\s*"([^"]*)"/.exec(txt);
    if (m && !isNaN(Date.parse(m[1])) && !isNaN(Date.parse(m[2]))) {
      var w = { o: m[1], c: m[2] };
      cache.put('vote-window', JSON.stringify(w), 300);
      return w;
    }
  } catch (err) { /* fall through to the fixed times */ }
  return { o: PHOTO_VOTE_OPENS, c: PHOTO_VOTE_CLOSES };
}

function pvJson_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function photoVotesSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(PHOTO_VOTES_SHEET);
  if (!sh) { sh = ss.insertSheet(PHOTO_VOTES_SHEET); sh.appendRow(['Photo', 'Photo name', 'Photographer', 'Votes', 'Last voted']); sh.setFrozenRows(1); }
  return sh;
}

function voterLogSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(VOTER_LOG_SHEET);
  if (!sh) { sh = ss.insertSheet(VOTER_LOG_SHEET); sh.appendRow(['Device and day', 'Photo', 'Time']); sh.setFrozenRows(1); }
  return sh;
}

function pvText_(v) {
  v = String(v || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120);
  if (/^[=+\-@]/.test(v)) v = "'" + v; /* never let a name run as a formula */
  return v;
}

/* Turns whatever the website sent (full address, ../ prefix, thumbs/ copy) into the photo id used by the admin: images/spectrum-photos/name.jpg */
function pvId_(v) {
  v = String(v || '').trim().split('?')[0].split('#')[0];
  v = v.replace(/^https?:\/\/[^\/]+\//i, '').replace(/^(\.\.?\/|\/)+/, '').replace('/thumbs/', '/');
  return v.slice(0, 200);
}

function recordPhotoVote_(p) {
  var id = pvId_(p.photo);
  if (!/^images\/spectrum-photos\/[A-Za-z0-9._-]+$/.test(id)) return pvJson_({ ok: false, error: 'invalid' });   /* only real photo ids */
  var device = String(p.device || '').trim();
  if (!/^[A-Za-z0-9]{16,64}$/.test(device)) return pvJson_({ ok: false, error: 'invalid' });

  var now = Date.now();
  var win = voteWindow_();
  if (win.o && now < Date.parse(win.o)) return pvJson_({ ok: false, error: 'not_open' });
  if (win.c && now > Date.parse(win.c)) return pvJson_({ ok: false, error: 'closed' });

  var day = Utilities.formatDate(new Date(now), VOTE_TZ, 'yyyy-MM-dd');   /* the server's own clock, so a phone's clock does not matter */
  var key = device + '|' + day;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    /* one vote per device per day */
    var lg = voterLogSheet_(), ll = lg.getLastRow();
    if (ll > 1) {
      var keys = lg.getRange(2, 1, ll - 1, 2).getValues();
      for (var k = 0; k < keys.length; k++) {
        if (String(keys[k][0]) === key) return pvJson_({ ok: false, error: 'already', photo: String(keys[k][1]) });
      }
    }
    /* count it */
    var sh = photoVotesSheet_(), last = sh.getLastRow(), ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues() : [], row = -1;
    for (var i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { row = i + 2; break; } }
    if (row < 0) {
      sh.appendRow([id, pvText_(p.title), pvText_(p.photographer), 1, new Date()]);
    } else {
      var n = (Number(sh.getRange(row, 4).getValue()) || 0) + 1;
      sh.getRange(row, 4, 1, 2).setValues([[n, new Date()]]);
    }
    lg.appendRow([key, id, new Date()]);
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
  return pvJson_({ ok: true });
}

function photoVotesReport_(p) {
  var out = { ok: false };
  if (ADMIN_KEY && String(p.key || '').trim() === String(ADMIN_KEY).trim()) {
    var sh = photoVotesSheet_(), last = sh.getLastRow(), rows = last > 1 ? sh.getRange(2, 1, last - 1, 5).getValues() : [];
    out = { ok: true, photos: rows.map(function (r) { return { photo: String(r[0]), title: String(r[1]), photographer: String(r[2]), votes: Number(r[3]) || 0, last: r[4] ? new Date(r[4]).toISOString() : '' }; }) };
  }
  return pvJson_(out);
}
