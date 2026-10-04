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
const ADMIN_KEY = '11111';

function doGet(e) {
  const k = ((e && e.parameter && e.parameter.key) || '').trim();

  if (!ADMIN_KEY || k !== ADMIN_KEY.trim()) {
    return out({ ok: false, error: 'Invalid passkey' });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cs = CONTACT_SHEET_ID ? SpreadsheetApp.openById(CONTACT_SHEET_ID) : ss;

  return out({
    ok: true,
    registrations: sheetRows(ss, 'Registrations'),
    joins: sheetRows(ss, 'Join requests'),
    messages: sheetRows(cs, 'Messages')
  });
}

function sheetRows(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const v = sh.getDataRange().getDisplayValues(), head = v[0];
  return v.slice(1).map(r => { const o = {}; head.forEach((c, i) => { if (c) o[c] = r[i]; }); return o; });
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}