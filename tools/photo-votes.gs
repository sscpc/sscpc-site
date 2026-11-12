/* SSCPC photo votes - add this to the SAME Apps Script project as tools/google-sheet-script.gs
   (it uses that file's ADMIN_KEY and the spreadsheet the script is attached to).

   1. Paste everything below into the project (a new file, "photo-votes", or the bottom of the existing one).
   2. In the existing doPost(e), add this as the VERY FIRST line inside the function:
        if (e && e.parameter && e.parameter.form === 'photo-vote') { recordPhotoVote_(e.parameter); return ContentService.createTextOutput('ok'); }
   3. In the existing doGet(e), add this as the VERY FIRST line inside the function:
        if (e && e.parameter && e.parameter.action === 'photo-votes') { return photoVotesReport_(e.parameter); }
   4. Deploy > Manage deployments > pencil > Version: New version > Deploy (the web app address stays the same).

   Votes are stored on a tab called "Photo votes": Photo | Photo name | Photographer | Votes | Last voted.
   Visitors cannot read the numbers; only the admin portal can (with the admin key).
   Votes are counted only between PHOTO_VOTE_OPENS and PHOTO_VOTE_CLOSES (below). */
var PHOTO_VOTES_SHEET = 'Photo votes';
/* Votes are only counted on Photography Day (Sri Lanka time). Set both to '' to accept votes at any time (e.g. while testing). */
var PHOTO_VOTE_OPENS = '2026-11-13T09:00:00+05:30';
var PHOTO_VOTE_CLOSES = '2026-11-13T17:00:00+05:30';

/* The voting window is read from the website (SITE.vote in js/data.js, edited in Admin > Site), so the site and this counter always agree.
   It is cached for 5 minutes. If the site cannot be read, the two fixed times above are used instead. */
var SITE_DATA_URL = 'https://sscpc.vercel.app/js/data.js';

function voteWindow_() {
  try {
    const cache = CacheService.getScriptCache(), hit = cache.get('vote-window');
    if (hit) return JSON.parse(hit);
    const txt = UrlFetchApp.fetch(SITE_DATA_URL + '?t=' + Date.now(), { muteHttpExceptions: true }).getContentText();
    const m = /"vote"\s*:\s*\{[^}]*?"opens"\s*:\s*"([^"]*)"[^}]*?"closes"\s*:\s*"([^"]*)"/.exec(txt);
    if (m && !isNaN(Date.parse(m[1])) && !isNaN(Date.parse(m[2]))) {
      const w = { o: m[1], c: m[2] };
      cache.put('vote-window', JSON.stringify(w), 300);
      return w;
    }
  } catch (err) { /* fall through to the fixed times */ }
  return { o: PHOTO_VOTE_OPENS, c: PHOTO_VOTE_CLOSES };
}

function photoVotesSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(PHOTO_VOTES_SHEET);
  if (!sh) { sh = ss.insertSheet(PHOTO_VOTES_SHEET); sh.appendRow(['Photo', 'Photo name', 'Photographer', 'Votes', 'Last voted']); sh.setFrozenRows(1); }
  return sh;
}

function pvText_(v) {
  v = String(v || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120);
  if (/^[=+\-@]/.test(v)) v = "'" + v; /* never let a name run as a formula */
  return v;
}

function recordPhotoVote_(p) {
  var id = String(p.photo || '').trim().slice(0, 200);
  if (!/^images\/spectrum-photos\/[A-Za-z0-9._-]+$/.test(id)) return;   /* only real photo ids */
  var now = Date.now();   /* one vote per person per day is enforced on the website; the window is enforced here */
  const win = voteWindow_();
  if (win.o && now < Date.parse(win.o)) return;
  if (win.c && now > Date.parse(win.c)) return;
  var delta = 1;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = photoVotesSheet_(), last = sh.getLastRow(), ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues() : [], row = -1;
    for (var i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { row = i + 2; break; } }
    if (row < 0) {
      sh.appendRow([id, pvText_(p.title), pvText_(p.photographer), 1, new Date()]);
    } else {
      var n = Math.max(0, (Number(sh.getRange(row, 4).getValue()) || 0) + delta);
      sh.getRange(row, 4, 1, 2).setValues([[n, new Date()]]);
    }
  } finally { lock.releaseLock(); }
}

function photoVotesReport_(p) {
  var out = { ok: false };
  if (ADMIN_KEY && String(p.key || '').trim() === String(ADMIN_KEY).trim()) {
    var sh = photoVotesSheet_(), last = sh.getLastRow(), rows = last > 1 ? sh.getRange(2, 1, last - 1, 5).getValues() : [];
    out = { ok: true, photos: rows.map(function (r) { return { photo: String(r[0]), title: String(r[1]), photographer: String(r[2]), votes: Number(r[3]) || 0, last: r[4] ? new Date(r[4]).toISOString() : '' }; }) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
