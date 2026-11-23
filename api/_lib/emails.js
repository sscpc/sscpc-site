/* Email templates (SSCK Photography branding). Neither message ever contains the shared passkey. */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function shell(title, bodyHtml) {
  return '<!doctype html><html><body style="margin:0;background:#eef0f6;font-family:Poppins,Segoe UI,Arial,sans-serif;color:#10163a">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">' +
    '<table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#fff;border-radius:20px;overflow:hidden">' +
    '<tr><td style="background:#0c1446;padding:22px 30px;color:#fff;font-size:20px;font-weight:600;letter-spacing:.3px">SSCK Photography</td></tr>' +
    '<tr><td style="padding:30px;font-size:15px;line-height:1.65"><h1 style="margin:0 0 16px;font-size:22px;color:#10163a">' + esc(title) + '</h1>' + bodyHtml + '</td></tr>' +
    '<tr><td style="padding:0 30px 28px;font-size:13px;color:#5b628a;border-top:1px solid #eef0f6"><p style="margin:18px 0 0">SSCK Photography Administration Team<br>St. Sylvester\'s College Photography Club</p></td></tr>' +
    '</table></td></tr></table></body></html>';
}

function verifyEmail({ name, link }) {
  const first = String(name || '').trim().split(' ')[0] || 'there';
  return {
    subject: 'Verify your email for the SSCK Photography Admin Portal',
    text: 'Hello ' + first + ',\n\nThanks for registering with SSCK Photography. Please verify your email address by opening this link:\n\n' + link +
      '\n\nThis link expires in 15 minutes and can be used only once.\n\nIf you did not register, you can safely ignore this email and nothing will happen.\n\nSSCK Photography Administration Team',
    html: shell('Verify your email address',
      '<p>Hello ' + esc(first) + ',</p><p>Thanks for registering with SSCK Photography. Please confirm that this is your email address to finish creating your account.</p>' +
      '<p style="margin:26px 0"><a href="' + esc(link) + '" style="display:inline-block;background:#2d5bff;color:#fff;text-decoration:none;font-weight:600;padding:14px 30px;border-radius:12px">Verify Email</a></p>' +
      '<p style="font-size:13px;color:#5b628a">This link expires in <b>15 minutes</b> and can be used only once.</p>' +
      '<p style="font-size:13px;color:#5b628a">If the button does not work, copy this link into your browser:<br><span style="word-break:break-all">' + esc(link) + '</span></p>' +
      '<p style="font-size:13px;color:#5b628a">If you did not register, you can safely ignore this email and nothing will happen.</p>')
  };
}

function welcomeEmail({ name, username, signInUrl }) {
  return {
    subject: 'Welcome to the SSCPC Admin Portal!',
    text: 'Hello ' + name + ',\n\nYour registration was successful, and your email address has been verified.\n\nYour personal username: ' + username +
      '\n\nTo sign in, open ' + signInUrl + ' and enter your personal username and the shared passkey given to you by the club.\nKeep the passkey private and do not share it.\n\nSSCK Photography Administration Team',
    html: shell('Welcome, ' + name + '!',
      '<p>Your registration was <b>successful</b>, and your email address has been <b>verified</b>.</p>' +
      '<p>Your personal username:</p><p style="font-size:19px;font-weight:600;margin:6px 0 18px;color:#2d5bff">' + esc(username) + '</p>' +
      '<p>To sign in, open the <a href="' + esc(signInUrl) + '" style="color:#2d5bff">SSCK Photography Admin Portal</a> and enter your personal username and the shared passkey given to you by the club. Keep the passkey private and do not share it.</p>')
  };
}

module.exports = { verifyEmail, welcomeEmail, esc };
