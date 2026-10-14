/* Photo selection "completed" block. Its words and photo are kept in js/data.js (SELECTION_DONE) and edited in the
   admin portal under Selection. If that data is missing, the text already written in index.html is shown. */
(function () {
  'use strict';
  var d = (typeof SELECTION_DONE !== 'undefined' && SELECTION_DONE) || null;
  var box = document.getElementById('sel-done');
  if (!d || !box) return;
  function set(id, v) { var e = document.getElementById(id); if (e && typeof v === 'string' && v.trim()) e.textContent = v.trim(); }
  set('sd-k', d.kicker); set('sd-t1', d.title); set('sd-t2', d.highlight); set('sd-text', d.text); set('sd-cap', d.caption);
  var fig = document.getElementById('sd-fig'), img = document.getElementById('sd-img');
  if (d.photo && String(d.photo).trim()) { img.src = d.photo; fig.hidden = false; }
  if (d.caption && d.caption.trim()) img.alt = d.caption.trim();
  if (d.show === 'no') box.hidden = true;
})();
