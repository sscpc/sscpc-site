/* PDF: Photography Tips Cheat Sheet (opened from the chatbot and the Home "PDF Downloads" card).
   Data: { tips: [{ title, pts: [...] }, ...] } - the chatbot passes its TIPS list. */
(function () {
  'use strict';
  const NS = window.SSCPCPdf;
  NS.register('tips', {
    title: 'Photography Tips Cheat Sheet',
    filename: () => 'SSCPC-Photography-Tips.pdf',
    data: () => ({ tips: (window.SSCPC_BOT && window.SSCPC_BOT.tips) || [] }),
    sample: { tips: [
      { title: 'Getting started', pts: ['Learn on whatever you have. A phone is a real camera, and the skills transfer.', 'Shoot every day, even ten frames. Practice beats gear.'] },
      { title: 'Composition', pts: ['Rule of thirds: switch on the grid and place your subject on a line or crossing point.', 'Leading lines pull the eye to your subject.', 'Simplify. Remove clutter, or move closer.'] },
      { title: 'Exposure triangle (aperture, shutter, ISO)', pts: ['Wide aperture gives a blurry background; narrow keeps more in focus.', 'Fast shutter freezes motion; slow shutter blurs it.', 'Keep ISO as low as the light allows.'] }
    ] },
    build: function (x, d) {
      const tips = (d.tips || []).map((t, i) => ({ n: i + 1, title: t.title, pts: t.pts }));
      NS.note(x, 'Quick, practical tips from the club. Practice a little every day and keep experimenting.');
      NS.cards(x, tips);
      /* wording taken from the first tip in the chatbot's TIPS list */
      NS.note(x, 'Shoot every day, even ten frames. Practice beats gear.', { title: 'Golden rule' });
      NS.qrCorner(x, { query: 'assistant=1', label: 'Ask the SSCPC Assistant for more tips', sub: 'Scan to chat, and to find out more about the club' });
    }
  });
})();
