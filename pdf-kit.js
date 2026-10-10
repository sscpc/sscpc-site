/* SSCPC PDF kit - compatibility file.
   The PDF design kit now lives in js/pdf/ (text.js, core.js, components.js, ui.js and one
   file per document in js/pdf/docs/). This file stays so any older code that expects
   window.SSCPCPdf (create, meta, fields, section, signatures, note, para, bubble, tag,
   finish, today, clean, ensure, C) keeps working: those names are all still provided
   by the new engine. It only warns if the engine files failed to load. */
(function () {
  'use strict';
  const K = window.SSCPCPdf;
  if (!K || !K.create || !K.fields || !K.generate) {
    if (window.console) console.warn('SSCPC PDF engine files are missing or loaded in the wrong order (see index.html).');
  }
})();
