/* Transactional email through Brevo (https://api.brevo.com/v3/smtp/email), over plain HTTPS: no extra dependency.
   Credentials come only from server-side environment variables (BREVO_API_KEY, BREVO_FROM_EMAIL, BREVO_FROM_NAME).
   Message bodies, recipients and links are never logged. */
async function sendMail(msg, cfg, fetchFn) {
  if (!cfg.emailConfigured) throw new Error('mail_not_configured');
  const f = fetchFn || ((...a) => fetch(...a));
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await f('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', signal: ctl.signal,
      headers: { 'api-key': cfg.brevoKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: cfg.fromName, email: cfg.fromEmail },
        to: [{ email: msg.to, name: msg.toName || undefined }],
        subject: msg.subject, htmlContent: msg.html, textContent: msg.text
      })
    });
    if (!r.ok) throw new Error('mail_provider_status_' + r.status);   // status code only; never the response body
  } finally { clearTimeout(timer); }
}
module.exports = { sendMail };
