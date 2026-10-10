/* PDF: Membership application (Join Us form).
   Data: { ref, name, grade, admission, phone, email, guardian, guardian_phone,
           experience, equipment, interests, why } */
(function () {
  'use strict';
  const NS = window.SSCPCPdf;
  NS.register('join', {
    title: 'Membership Application',
    languages: true, /* offers the English / Sinhala / Tamil choice */
    filename: d => 'SSCPC-Application-' + NS.slug(d.name) + '.pdf',
    footer: d => ({ ref: d.ref || '' }),
    sample: { ref: 'SSCPC 007', name: 'Kasun Perera', grade: 'Grade 10', admission: '12345', phone: '071 234 5678', email: 'kasun@example.com',
      guardian: 'Nimal Perera', guardian_phone: '077 123 4567', experience: 'Beginner', equipment: 'Phone camera',
      interests: 'Portraits, Landscapes, Street photography', why: 'I enjoy taking photos and want to learn proper composition and editing.' },
    build: function (x, d) {
      NS.meta(x, 'Membership No.', d.ref || 'Pending - the club will confirm', NS.today(), { badge: true, qr: { anchor: 'about', caption: 'Scan the code to learn about the club' } });
      NS.fields(x, 'Applicant', [['Full name', d.name], ['Grade', d.grade], ['Admission number', d.admission], ['Phone / WhatsApp', d.phone], ['Email', d.email]]);
      NS.fields(x, 'Parent / guardian', [['Parent / guardian', d.guardian], ['Guardian phone', d.guardian_phone]]);
      NS.fields(x, 'About your photography', [['Photography experience', d.experience], ['Equipment', d.equipment], ['Interests', d.interests, { full: true }], ['Why I want to join', d.why, { full: true }]]);
      NS.signatures(x, ['Applicant signature', 'Parent / guardian signature', 'Date'], { declaration: 'I confirm that the details above are correct.' });
      NS.officeBox(x, 'For club use only', ['Received by', 'Membership confirmed', 'Date']);
      NS.note(x, 'Please send this application to the President of SSCPC, or message the club on WhatsApp with your membership number.');
    }
  });
})();
