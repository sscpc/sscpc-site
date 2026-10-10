/* PDF: Spectrum visitor registration (Register form).
   Data: { ref, school, mic_name, mic_phone, email, president_name, phone, students,
           teachers, student_list: [names], message }
   The event name, date and venue are read from the main event in js/data.js (EVENTS). */
(function () {
  'use strict';
  const NS = window.SSCPCPdf;
  function mainEvent() {
    try { if (typeof EVENTS !== 'undefined') return EVENTS.find(e => e && e.category === 'main') || null; } catch (e) { /* ignore */ }
    return null;
  }
  function names(d) {
    if (Array.isArray(d.student_list)) return d.student_list;
    return String(d.student_names || '').split('\n').filter(Boolean);
  }
  NS.register('register', {
    title: 'Spectrum Visitor Registration',
    languages: true, /* offers the English / Sinhala / Tamil choice */
    filename: d => 'SSCPC-Registration-' + NS.slug(d.school) + '.pdf',
    footer: d => ({ ref: d.ref || '' }),
    sample: { ref: 'SSCPC-20261009-AB12', school: 'Example College, Kandy', mic_name: 'Mr. A. Silva', mic_phone: '071 234 5678',
      email: 'sylvestrian.photography@gmail.com', president_name: 'Club President', phone: '077 123 4567', students: '6', teachers: '1',
      student_list: ['Student One', 'Student Two', 'Student Three', 'Student Four', 'Student Five', 'Student Six'], message: 'We will arrive around 9.30 a.m.' },
    build: function (x, d) {
      NS.meta(x, 'Reference', d.ref, NS.today(), { badge: true });
      const ev = mainEvent();
      if (ev) NS.banner(x, ev.name, [[ev.date, ev.time].filter(Boolean).join('  \u00B7  '), ev.venue].filter(Boolean));
      NS.stats(x, [['Students attending', d.students], ['Teachers attending', d.teachers]]);
      NS.fields(x, 'School', [['School name', d.school, { full: true }], ['Teacher in charge name', d.mic_name], ['Teacher in charge telephone number', d.mic_phone]]);
      NS.fields(x, 'Club contact', [['Club email', d.email, { full: true }], ["President's name", d.president_name], ["President's phone / WhatsApp", d.phone]]);
      NS.table(x, 'Student names', names(d));
      NS.fields(x, 'Message', [['Message', d.message, { full: true }]]);
      NS.note(x, 'Please keep this as your copy of the registration. Bring it, or show it on your phone, when you arrive at Spectrum.', { title: 'Show this on arrival', qr: { anchor: 'spectrum', caption: 'Scan for the Spectrum page' } });
    }
  });
})();
