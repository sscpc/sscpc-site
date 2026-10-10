/* SSCPC album views - add this to the SAME Apps Script project as tools/google-sheet-script.gs
   (it uses that file's ADMIN_KEY and the spreadsheet the script is attached to).

   1. Paste everything below into the project (a new file, "album-views", or the bottom of the existing one).
   2. In the existing doPost(e), add this at the very top:
        if (e && e.parameter && e.parameter.form === 'album-view') { recordAlbumView_(e.parameter); return ContentService.createTextOutput('ok'); }
   3. In the existing doGet(e) (add a doGet if there is none), add this at the top:
        if (e && e.parameter && e.parameter.action === 'album-views') { return albumViewsReport_(e.parameter); }
   4. Deploy > Manage deployments > pencil > Version: New version > Deploy (the web app address stays the same).

   Counts are stored on a tab called "Album views": Album | Views | Last viewed. Only the album name is stored. */
var VIEWS_SHEET = 'Album views';

function viewsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(VIEWS_SHEET);
  if (!sh) { sh = ss.insertSheet(VIEWS_SHEET); sh.appendRow(['Album', 'Views', 'Last viewed']); sh.setFrozenRows(1); }
  return sh;
}

function recordAlbumView_(p) {
  var album = String(p.album || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120);
  if (!album) return;
  if (album.charAt(0) === '=' || album.charAt(0) === '+' || album.charAt(0) === '-' || album.charAt(0) === '@') album = "'" + album; /* never let a name run as a formula */
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = viewsSheet_(), last = sh.getLastRow(), names = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues() : [], row = -1;
    for (var i = 0; i < names.length; i++) { if (String(names[i][0]) === album) { row = i + 2; break; } }
    if (row < 0) { sh.appendRow([album, 1, new Date()]); }
    else { sh.getRange(row, 2, 1, 2).setValues([[(Number(sh.getRange(row, 2).getValue()) || 0) + 1, new Date()]]); }
  } finally { lock.releaseLock(); }
}

function albumViewsReport_(p) {
  var out = { ok: false };
  if (String(p.key || '') === String(ADMIN_KEY) && ADMIN_KEY) {
    var sh = viewsSheet_(), last = sh.getLastRow(), rows = last > 1 ? sh.getRange(2, 1, last - 1, 3).getValues() : [];
    out = { ok: true, albums: rows.map(function (r) { return { album: String(r[0]), views: Number(r[1]) || 0, last: r[2] ? new Date(r[2]).toISOString() : '' }; }) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
