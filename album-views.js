/* SSCPC album views - counts how many visitors open each gallery album.
   Privacy: only the album name is sent (no name, no address, no cookie). One visit per album per
   browser tab session is counted, so refreshing the page does not add views.

   How an album view is reported (any one of these):
     1. gallery code dispatches:  window.dispatchEvent(new CustomEvent('sscpc:album-open', { detail: { album: 'Album name' } }))
     2. gallery code calls:       SSCPCViews.track('Album name')
     3. a shared link  yoursite/?album=<album folder name>  is opened (this one works with no gallery change)
   The count is stored by tools/album-views.gs (the same Google Apps Script that stores the forms).
   Admin side: js/admin-album-views.js shows the table. */
(function () {
  'use strict';
  const seen = {};
  function endpoint() { try { return (typeof FORMS_ENDPOINT === 'string' && FORMS_ENDPOINT) || ''; } catch (e) { return ''; } }
  function once(name) {
    const k = 'sscpc-view:' + name;
    if (seen[k]) return false;
    seen[k] = 1;
    try { if (sessionStorage.getItem(k)) return false; sessionStorage.setItem(k, '1'); } catch (e) { /* private mode: fall back to memory */ }
    return true;
  }
  function track(album) {
    album = String(album || '').trim().slice(0, 120);
    const url = endpoint();
    if (!album || !url || !once(album)) return;
    try {
      const body = new URLSearchParams({ form: 'album-view', album: album });
      /* no-cors: we do not need the answer, and Apps Script does not need a preflight */
      fetch(url, { method: 'POST', mode: 'no-cors', body: body, keepalive: true }).catch(function () { });
    } catch (e) { /* counting must never break the gallery */ }
  }
  window.SSCPCViews = { track: track };
  window.addEventListener('sscpc:album-open', function (e) { track(e && e.detail && e.detail.album); });
  try {
    const a = new URLSearchParams(location.search).get('album');
    if (a) track(a);
  } catch (e) { /* ignore */ }
})();
