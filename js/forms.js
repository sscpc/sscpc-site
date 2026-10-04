/* Sends a form to the club.
   - If FORMS_ENDPOINT (js/data.js) is set, the form goes to the club's Google Sheets script.
   - Otherwise it is posted to the site itself, which only works on Netlify (Netlify Forms).
   Returns whatever the script replied with (e.g. { ok:true, ref:'SSCPC 007' }
   for a Join application), or null when no reply could be read -- Netlify
   Forms doesn't send one back, and a CORS-blocked reply can't be read
   either, though the submission itself still went through in that case. */
async function sendForm(fd, kind) {
  if (!navigator.onLine) { const e = new Error('offline'); e.code = 'offline'; throw e; }
  fd.set('form_type', kind);
  const body = new URLSearchParams(fd);
  const url = (typeof FORMS_ENDPOINT === 'string' ? FORMS_ENDPOINT : '').trim();
  if (!url) {
    const r = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (!r.ok) { const e = new Error(String(r.status)); e.code = 'notconnected'; throw e; }
    return null;
  }
  try {
    const r = await fetch(url, { method: 'POST', body });
    if (!r.ok) { const e = new Error(String(r.status)); e.code = 'http'; throw e; }
    try { return await r.json(); } catch (e2) { return null; }
  } catch (e) {
    if (e.code === 'http') throw e;
    await fetch(url, { method: 'POST', body, mode: 'no-cors' });   /* reply cannot be read; assume delivered */
    return null;
  }
}
function formError(err, what) {
  if (err && err.code === 'offline') return 'You are offline. Please connect to the internet and try again.';
  if (err && err.code === 'notconnected') return what + ' is not connected yet. Please contact the club on WhatsApp instead.';
  return what + ' could not be sent. Please check your internet connection and try again.';
}
