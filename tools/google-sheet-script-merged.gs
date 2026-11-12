/* SSCPC forms -> Google Sheets, with thank-you emails  (MERGED VERSION: includes the Most Popular Photograph vote)
   How to use (about 5 minutes, see README.txt section H6):
   1. Make a new Google Sheet with the club Google account -- this will hold
      Registrations and Join requests.
   2. Extensions > Apps Script. Delete the sample code, paste ALL of this file.
   3. (Optional) put the club email between the quotes in NOTIFY_EMAIL to get an email for every entry.
   4. Contact form messages go to a SEPARATE spreadsheet (see CONTACT_SHEET_ID
      below). Leave CONTACT_SHEET_ID empty to keep contact messages in this same
      spreadsheet instead, on a "Messages" tab.
   5. Deploy > New deployment > type: Web app
        Execute as: Me
        Who has access: Anyone
      Press Deploy, allow access, and copy the Web app URL (ends with /exec).
   6. Paste that URL into FORMS_ENDPOINT in js/data.js and upload the website again.
   Registrations go to the sheet "Registrations"; membership applications to "Join requests"; photo votes to "Photo votes".
   If you change this script later: Deploy > Manage deployments > pencil icon > Version: New version > Deploy.
   The web app URL stays the same. Free Google accounts can send about 100 emails a day. */

const NOTIFY_EMAIL = 'spectrum.sscpc@gmail.com';
const CLUB = "SSCPC - St. Sylvester's College Photography Club";

const CONTACT_SHEET_ID = '';

const MEMBERSHIP_PREFIX = 'SSCPC ';
const MEMBERSHIP_DIGITS = 3;           // 3 -> SSCPC 001. Use 4 for SSCPC 0001, etc.
const MEMBERSHIP_COL = 'Membership No.';

function doPost(e) {
  // Most Popular Photograph vote (sent by the website's vote page)
  if (e && e.parameter && e.parameter.form === 'photo-vote') { recordPhotoVote_(e.parameter); return ContentService.createTextOutput('ok'); }

  const p = {};
  Object.keys(e.parameters).forEach(k => p[k] = e.parameters[k].join(', '));
  if (p['bot-field']) return out({ ok: true });                 // spam trap
  const type = p.form_type === 'join' ? 'join' : p.form_type === 'contact' ? 'contact' : 'registration';
  const ss = (type === 'contact' && CONTACT_SHEET_ID) ? SpreadsheetApp.openById(CONTACT_SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  const name = type === 'join' ? 'Join requests' : type === 'contact' ? 'Messages' : 'Registrations';
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  const skip = ['form_type', 'form-name', 'bot-field'];
  const keys = Object.keys(p).filter(k => skip.indexOf(k) < 0);

  let membershipNo = '';
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (sh.getLastRow() === 0) {
      const firstHeader = type === 'join' ? ['Timestamp', MEMBERSHIP_COL] : ['Timestamp'];
      sh.appendRow(firstHeader.concat(keys));
    }
    let header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    if (type === 'join' && header.indexOf(MEMBERSHIP_COL) < 0) {
      sh.insertColumnAfter(1);
      sh.getRange(1, 2).setValue(MEMBERSHIP_COL);
      header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    }
    keys.forEach(k => { if (header.indexOf(k) < 0) { sh.getRange(1, header.length + 1).setValue(k); header.push(k); } });

    if (type === 'join') membershipNo = nextMembershipNumber(sh, header);

    sh.appendRow(header.map((h, i) => {
      if (i === 0) return new Date();
      if (h === MEMBERSHIP_COL) return membershipNo;
      return p[h] || '';
    }));
  } finally {
    lock.releaseLock();
  }

  // email to the club
  if (NOTIFY_EMAIL) {
    try { MailApp.sendEmail(NOTIFY_EMAIL, 'SSCPC ' + type + ': ' + (membershipNo ? membershipNo + ' - ' : '') + (p.school || p.name || ''), keys.map(k => k + ': ' + p[k]).join('\n')); } catch (err) {}
  }
  // thank-you email to the visitor
  const to = (p.email || '').trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    try {
      const opt = { to: to, name: CLUB, subject: '', body: '' };
      if (NOTIFY_EMAIL) opt.replyTo = NOTIFY_EMAIL;
      if (type === 'join') {
        opt.subject = 'We received your application to join SSCPC';
        opt.body = 'Dear ' + (p.name || 'applicant') + ',\n\nThank you for applying to join SSCPC, the Photography Club of St. Sylvester\'s College, Kandy.\n\n' +
          'Your membership number: ' + membershipNo + '\n\n' +
          'Your details:\nName: ' + (p.name || '') + '\nGrade: ' + (p.grade || '') + '\nPhone: ' + (p.phone || '') + '\n\n' +
          'The club committee will contact you. If anything above is wrong, please reply to this email.\n\n' + CLUB;
      } else if (type === 'contact') {
        opt.subject = 'SSCPC: we received your message';
        opt.body = 'Dear ' + (p.name || 'there') + ',\n\nThank you for reaching out to SSCPC, the Photography Club of St. Sylvester\'s College, Kandy.\n\n' +
          'Your message:\nSubject: ' + (p.subject || '') + '\n' + (p.message || '') + '\n\n' +
          'The club committee will get back to you soon. If anything above is wrong, please reply to this email.\n\n' + CLUB;
      } else {
        opt.subject = 'Spectrum 2026: we received your registration';
        opt.body = 'Dear ' + (p.contact_name || 'visitor') + ',\n\nThank you for registering ' + (p.school || 'your school') + ' for Spectrum, the photography competition and exhibition of the Photography Club of St. Sylvester\'s College, Kandy.\n\n' +
          'Your details:\nSchool: ' + (p.school || '') + '\nStudents attending: ' + (p.students || '') + '\nTeachers attending: ' + (p.teachers || '') + '\n\n' +
          'The organisers will contact you if they need more information. If anything above is wrong, please reply to this email.\n\n' + CLUB;
      }
      MailApp.sendEmail(opt);
    } catch (err) {}
  }
  return out({ ok: true, ref: membershipNo });
}

function nextMembershipNumber(sh, header) {
  const col = header.indexOf(MEMBERSHIP_COL) + 1;
  const lastRow = sh.getLastRow();
  let highest = 0;
  if (col > 0 && lastRow > 1) {
    const values = sh.getRange(2, col, lastRow - 1, 1).getValues();
    values.forEach(r => {
      const m = String(r[0] || '').match(/(\d+)\s*$/);
      if (m) { const n = parseInt(m[1], 10); if (n > highest) highest = n; }
    });
  }
  const next = highest + 1;
  let digits = String(next);
  while (digits.length < MEMBERSHIP_DIGITS) digits = '0' + digits;
  return MEMBERSHIP_PREFIX + digits;
}

/* ADMIN PORTAL (admin/index.html): lets the portal read the sheets.
   Put a long passphrase between the quotes. Leave it empty to switch this off.
   After changing the script: Deploy > Manage deployments > pencil > New version > Deploy. */
const ADMIN_KEY = '102030';

function doGet(e) {
  const k = ((e && e.parameter && e.parameter.key) || '').trim();

  // Brute-force protection: after 8 wrong passkeys, lock the portal for 15 minutes.
  const cache = CacheService.getScriptCache();
  if (Number(cache.get('fails') || 0) >= 8) return out({ ok: false, error: 'Too many attempts. Try again in 15 minutes.' });
  if (!ADMIN_KEY || ADMIN_KEY === 'KEEP-YOUR-OWN-PASSKEY' || k !== ADMIN_KEY.trim()) {
    cache.put('fails', String(Number(cache.get('fails') || 0) + 1), 900);
    return out({ ok: false, error: 'Invalid passkey' });
  }
  cache.remove('fails');

  // Admin portal > Votes tab (placed AFTER the passkey check on purpose, so it is protected by the same lockout)
  if (e.parameter.action === 'photo-votes') { return photoVotesReport_(e.parameter); }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cs = CONTACT_SHEET_ID ? SpreadsheetApp.openById(CONTACT_SHEET_ID) : ss;

  // Admin portal: mark a row Handled/New and save a private note
  if (e.parameter.action === 'set') {
    const map = { registrations: [ss, 'Registrations'], joins: [ss, 'Join requests'], messages: [cs, 'Messages'] }[e.parameter.sheet];
    const sh = map && map[0].getSheetByName(map[1]);
    const row = parseInt(e.parameter.row, 10);
    if (!sh || !(row >= 2) || row > sh.getLastRow()) return out({ ok: false, error: 'Row not found. Refresh and try again.' });
    if (String(sh.getRange(row, 1).getDisplayValue()) !== String(e.parameter.ts || '')) return out({ ok: false, error: 'The sheet changed. Refresh and try again.' });
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      [['Status', e.parameter.status], ['Note', e.parameter.note]].forEach(function (c) {
        const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
        let ix = head.indexOf(c[0]);
        if (ix < 0) { sh.getRange(1, head.length + 1).setValue(c[0]); ix = head.length; }
        sh.getRange(row, ix + 1).setValue(c[1] || '');
      });
    } finally { lock.releaseLock(); }
    return out({ ok: true });
  }

  return out({
    ok: true,
    v: 2,
    registrations: sheetRows(ss, 'Registrations'),
    joins: sheetRows(ss, 'Join requests'),
    messages: sheetRows(cs, 'Messages')
  });
}

function sheetRows(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const v = sh.getDataRange().getDisplayValues(), head = v[0];
  return v.slice(1).map((r, n) => { const o = { _row: n + 2 }; head.forEach((c, i) => { if (c) o[c] = r[i]; }); return o; });
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ================= MOST POPULAR PHOTOGRAPH: photo votes =================
   Votes are stored on a tab called "Photo votes": Photo | Photo name | Photographer | Votes | Last voted.
   Visitors cannot read the numbers; only the admin portal can (with the admin passkey).
   Votes are counted only between PHOTO_VOTE_OPENS and PHOTO_VOTE_CLOSES. Set both to '' to accept votes at any time (e.g. while testing).
   "One vote per person per day" is enforced by the website (in the visitor's browser). */
const PHOTO_VOTES_SHEET = 'Photo votes';
const PHOTO_VOTE_OPENS = '2026-11-13T09:00:00+05:30';
const PHOTO_VOTE_CLOSES = '2026-11-13T17:00:00+05:30';

/* The voting window is read from the website (SITE.vote in js/data.js, edited in Admin > Site), so the site and this counter always agree.
   It is cached for 5 minutes. If the site cannot be read, the two fixed times above are used instead. */
const SITE_DATA_URL = 'https://sscpc.vercel.app/js/data.js';

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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(PHOTO_VOTES_SHEET);
  if (!sh) { sh = ss.insertSheet(PHOTO_VOTES_SHEET); sh.appendRow(['Photo', 'Photo name', 'Photographer', 'Votes', 'Last voted']); sh.setFrozenRows(1); }
  return sh;
}

function pvText_(v) {
  v = String(v || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120);
  if (/^[=+\-@]/.test(v)) v = "'" + v; /* never let a name run as a formula */
  return v;
}

function recordPhotoVote_(p) {
  const id = String(p.photo || '').trim().slice(0, 200);
  if (!/^images\/spectrum-photos\/[A-Za-z0-9._-]+$/.test(id)) return;   /* only real photo ids */
  const now = Date.now();
  const win = voteWindow_();
  if (win.o && now < Date.parse(win.o)) return;
  if (win.c && now > Date.parse(win.c)) return;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = photoVotesSheet_(), last = sh.getLastRow();
    const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues() : [];
    let row = -1;
    for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { row = i + 2; break; } }
    if (row < 0) {
      sh.appendRow([id, pvText_(p.title), pvText_(p.photographer), 1, new Date()]);
    } else {
      const n = (Number(sh.getRange(row, 4).getValue()) || 0) + 1;
      sh.getRange(row, 4, 1, 2).setValues([[n, new Date()]]);
    }
  } finally { lock.releaseLock(); }
}

function photoVotesReport_(p) {
  const sh = photoVotesSheet_(), last = sh.getLastRow();
  const rows = last > 1 ? sh.getRange(2, 1, last - 1, 5).getValues() : [];
  return out({ ok: true, photos: rows.map(function (r) { return { photo: String(r[0]), title: String(r[1]), photographer: String(r[2]), votes: Number(r[3]) || 0, last: r[4] ? new Date(r[4]).toISOString() : '' }; }) });
}
