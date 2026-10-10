/* PDF: chat transcript (the chatbot's "Save chat as PDF" button).
   Data: { turns: [{ role: 'user'|'bot', text }, ...] } */
(function () {
  'use strict';
  const NS = window.SSCPCPdf;
  NS.register('chat', {
    title: 'Chat with the SSCPC Assistant',
    filename: () => 'SSCPC-Chat.pdf',
    sample: { turns: [
      { role: 'user', text: 'How do I join the club?' },
      { role: 'bot', text: 'Open the Join Us section, fill in the form and submit it. You can download your application as a PDF afterwards.' },
      { role: 'user', text: 'When is Spectrum?' },
      { role: 'bot', text: 'Spectrum 2026 is our annual photography exhibition. The date and venue are on the Events page.' }
    ] },
    build: function (x, d) {
      const turns = (d.turns || []).filter(h => h && h.text), P = x.P;
      NS.meta(x, 'Conversation', turns.length + (turns.length === 1 ? ' message' : ' messages'), NS.today());
      let last = null;
      turns.forEach((h, i) => {
        const me = h.role === 'user', next = turns[i + 1], change = !next || (next.role === 'user') !== me;
        if (last !== me) NS.tag(x, me ? 'You' : 'SSCPC Assistant', { right: me, color: me ? P.blue : P.maroon, inset: 9 });
        NS.bubble(x, String(h.text).replace(/\*\*/g, ''), me
          ? { right: true, fill: [226, 238, 252], color: P.ink, avatar: { letter: 'Y', fill: P.blue }, after: change ? 5 : 2 }
          : { fill: P.panel, bar: P.navy, color: P.ink, avatar: { letter: 'S', fill: P.maroon }, after: change ? 5 : 2 });
        last = me;
      });
    }
  });
})();
