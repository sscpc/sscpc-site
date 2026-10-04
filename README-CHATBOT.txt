SSCPC ASSISTANT (chat bot) - HOW IT WORKS
=========================================

What it is
  The "AI" button (bottom-left, blue sparkle icon) opens a chat window. It answers
  questions about the club and website, gives photography tips, and can make PDFs.

Files
  js/chatbot.js     The bot: answers, photography tips, PDF export. EDIT THIS to change answers.
  css/chatbot.css   Its look (follows the site's light/dark theme).
  api/chat.js       OPTIONAL AI brain for Vercel (see below).

It works with NO setup
  The bot has a built-in knowledge base, so it works on any host and even offline.
  Event date, albums and committee names are read live from js/data.js, so they stay
  current when you update the site in the admin portal.

Turning on the AI mode (optional, Vercel only)
  1. Vercel > your project > Settings > Environment Variables
  2. Add  ANTHROPIC_API_KEY  = your key from console.anthropic.com
     (optional) ANTHROPIC_MODEL = a different model name
  3. Redeploy.
  The bot then answers free-form questions with AI (streamed live, word by word, with a Stop button) and falls back to the built-in answers
  if the AI is unavailable. The key stays on the server and is never visible in the browser.
  Note: AI usage is billed to that key's account. Do not put the key in any .js file.
  To switch AI mode off completely, set AI_ENDPOINT = '' at the top of js/chatbot.js.

PDF buttons
  - "Photography Tips PDF": a 4-page cheat sheet built from the TIPS list in chatbot.js.
  - "Save chat as PDF" (download icon in the chat header).
  - Join Us / Register forms keep their own Download PDF buttons after submitting.

Editing answers
  - Club facts: the FACTS list in js/chatbot.js (each has keywords "k" and an answer "a").
  - Photography tips: the TIPS list (title + points). The PDF updates automatically.
  - If you change club facts, also update the CLUB FACTS text in api/chat.js (AI mode).

Where visitors find it
  - Every page: the "Need a hand?" section sits just above the footer on all tabs,
    (in index.html, id="helpdesk"; styles at the end of css/chatbot.css).
    It has chat shortcuts and the PDF download buttons.
  - Bottom-left: a small "AI" badge (sparkle icon) tells visitors there is an AI assistant; it opens the same chat.
