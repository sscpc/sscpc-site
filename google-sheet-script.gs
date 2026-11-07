/* SSCPC forms -> Google Sheets, with thank-you emails
   How to use (about 5 minutes, see README.txt section H6):
   1. Make a new Google Sheet with the club Google account -- this will hold
      Registrations and Join requests.
   2. Extensions > Apps Script. Delete the sample code, paste ALL of this file.
   3. (Optional) put the club email between the quotes in NOTIFY_EMAIL to get an email for every entry.
   4. Contact form messages go to a SEPARATE spreadsheet (see CONTACT_SHEET_ID
      below): make a second new Google Sheet, copy its ID out of the URL --
      the long part between /d/ and /edit -- and paste it into CONTACT_SHEET_ID.
      Leave CONTACT_SHEET_ID empty to keep contact messages in this same
      spreadsheet instead, on a "Messages" tab.
   5. Deploy > New deployment > type: Web app
        Execute as: Me
        Who has access: Anyone
      Press Deploy, allow access, and copy the Web app URL (ends with /exec).
   6. Paste that URL into FORMS_ENDPOINT in js/data.js and upload the website again.
   Registrations go to the sheet "Registrations"; membership applications to "Join requests" -- both in this spreadsheet.
   Contact-form messages go to the "Messages" tab of CONTACT_SHEET_ID (its own spreadsheet), or of this spreadsheet if CONTACT_SHEET_ID is left empty.
   The person who filled the form also gets a thank-you email (if they typed an email address).
   If you change this script later: Deploy > Manage deployments > pencil icon > Version: New version > Deploy.
   The web app URL stays the same. Free Google accounts can send about 100 emails a day. */

const NOTIFY_EMAIL = 'spectrum.sscpc@gmail.com';
const CLUB = "SSCPC - St. Sylvester's College Photography Club";

/* The separate Google Sheet that Contact Us messages go to. Paste the
   spreadsheet ID from its URL (the part between /d/ and /edit) here, e.g.
   const CONTACT_SHEET_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
   Left empty, contact messages go to a "Messages" tab in THIS spreadsheet
   instead, same as before. */
const CONTACT_SHEET_ID = '';

/* Membership numbers (Join requests only): SSCPC 001, SSCPC 002, ...
   Generated here, centrally, one at a time under a lock -- never in the
   browser -- so two applications submitted at the same moment can never
   receive the same number. To change the format, edit these two lines. */
const MEMBERSHIP_PREFIX = 'SSCPC ';
const MEMBERSHIP_DIGITS = 3;           // 3 -> SSCPC 001. Use 4 for SSCPC 0001, etc.
const MEMBERSHIP_COL = 'Membership No.';

function doPost(e) {
  const p = {};
  Object.keys(e.parameters).forEach(k => p[k] = e.parameters[k].join(', '));
  if (p['bot-field']) return out({ ok: true });                 // spam trap
  if (p.form_type === 'vote') return handleVote(p);               // Most Popular Photograph vote
  const type = p.form_type === 'join' ? 'join' : p.form_type === 'contact' ? 'contact' : 'registration';
  // Contact messages go to their own spreadsheet (CONTACT_SHEET_ID) when one
  // is set; Registrations and Join requests always stay in this spreadsheet.
  const ss = (type === 'contact' && CONTACT_SHEET_ID) ? SpreadsheetApp.openById(CONTACT_SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  const name = type === 'join' ? 'Join requests' : type === 'contact' ? 'Messages' : 'Registrations';
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  const skip = ['form_type', 'form-name', 'bot-field'];
  const keys = Object.keys(p).filter(k => skip.indexOf(k) < 0);

  // The lock covers reading the last membership number AND writing the new
  // row, so a second request that arrives mid-write always waits its turn
  // and reads the number that was just taken, instead of reusing it.
  let membershipNo = '';
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (sh.getLastRow() === 0) {
      const firstHeader = type === 'join' ? ['Timestamp', MEMBERSHIP_COL] : ['Timestamp'];
      sh.appendRow(firstHeader.concat(keys));
    }
    let header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    // A "Join requests" sheet created before this feature existed may not
    // have the column yet -- add it right after "Time" without touching
    // any existing data or columns.
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

/* Looks at every existing value in the Membership No. column, finds the
   highest number used so far (however the column got there), and returns
   the next one. This is self-healing: it works the first time the column
   is created, and keeps working correctly even if rows are ever deleted,
   reordered, or the sheet is edited by hand. */
/* ---------- Most Popular Photograph vote ----------
   Votes are saved on the "Votes" tab; totals appear on the "Vote results" tab (made automatically).
   The two times below MUST match VOTE_OPEN / VOTE_CLOSE in js/data.js. Votes outside this window are rejected here.
   One vote per device per day. Totals are never sent to the website, so nobody can see them while voting is open. */
const VOTE_OPEN = new Date('2026-11-13T09:00:00+05:30');
const VOTE_CLOSE = new Date('2026-11-13T17:00:00+05:30');
const VOTE_PHOTO_COUNT = 48;

function handleVote(p) {
  const now = new Date();
  if (now < VOTE_OPEN) return out({ ok: false, error: 'not_open' });
  if (now > VOTE_CLOSE) return out({ ok: false, error: 'closed' });
  const photo = parseInt(p.photo, 10);
  const dev = String(p.device || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 64);
  if (!(photo >= 1 && photo <= VOTE_PHOTO_COUNT) || dev.length < 16) return out({ ok: false, error: 'invalid' });
  const day = Utilities.formatDate(now, 'Asia/Colombo', 'yyyy-MM-dd');
  const key = dev + '|' + day;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName('Votes') || ss.insertSheet('Votes');
    if (sh.getLastRow() === 0) sh.appendRow(['Timestamp', 'Photo', 'Key (device|day)']);
    const last = sh.getLastRow();
    if (last > 1) {
      const rows = sh.getRange(2, 2, last - 1, 2).getValues();
      for (let i = 0; i < rows.length; i++) if (String(rows[i][1]) === key) return out({ ok: false, error: 'already', photo: Number(rows[i][0]) });
    }
    sh.appendRow([now, photo, key]);
    ensureVoteResults(ss);
  } finally { lock.releaseLock(); }
  return out({ ok: true });
}

function ensureVoteResults(ss) {
  if (ss.getSheetByName('Vote results')) return;
  const r = ss.insertSheet('Vote results');
  r.getRange(1, 1, 1, 2).setValues([['Photo', 'Votes']]);
  const rows = [];
  for (let i = 1; i <= VOTE_PHOTO_COUNT; i++) rows.push([i, '=COUNTIF(Votes!B:B,A' + (i + 1) + ')']);
  r.getRange(2, 1, rows.length, 2).setValues(rows);
  r.getRange(1, 4, 1, 3).setValues([['Rank', 'Photo', 'Votes']]);
  r.getRange(2, 5).setFormula('=SORT(A2:B' + (VOTE_PHOTO_COUNT + 1) + ',2,FALSE)');
  r.getRange(2, 4, VOTE_PHOTO_COUNT, 1).setFormulas(Array.from({ length: VOTE_PHOTO_COUNT }, (_, i) => ['=ROW()-1']));
  r.setFrozenRows(1);
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
const ADMIN_KEY = 'KEEP-YOUR-OWN-PASSKEY';   // <- when you paste this script, keep the passkey line you already have in Apps Script

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

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cs = CONTACT_SHEET_ID ? SpreadsheetApp.openById(CONTACT_SHEET_ID) : ss;

  // Admin portal: mark a row Handled/New and save a private note (columns "Status" and "Note" are added automatically)
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
    messages: sheetRows(cs, 'Messages'),
    votes: voteStats(ss)
  });
}

/* Vote totals for the admin portal. Only reachable with the admin passkey (doGet above); never sent to the public site. */
function voteStats(ss) {
  const counts = [];
  for (let i = 0; i < VOTE_PHOTO_COUNT; i++) counts.push(0);
  let total = 0, last = '';
  const sh = ss.getSheetByName('Votes');
  if (sh && sh.getLastRow() > 1) {
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    rows.forEach(function (r) { const n = Number(r[1]); if (n >= 1 && n <= VOTE_PHOTO_COUNT) { counts[n - 1]++; total++; } });
    const t = rows[rows.length - 1][0];
    last = t instanceof Date ? Utilities.formatDate(t, 'Asia/Colombo', 'd MMM yyyy, h:mm:ss a') : String(t);
  }
  return { total: total, counts: counts, last: last, open: VOTE_OPEN.toISOString(), close: VOTE_CLOSE.toISOString() };
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