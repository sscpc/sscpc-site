SSCPC AI ASSISTANT - SETUP (api/chat.js)

1. Get a free key (no card) from at least one of:
   Groq        https://console.groq.com/keys
   Gemini      https://aistudio.google.com  (Get API key)
   Cerebras    https://cloud.cerebras.ai
   Mistral     https://console.mistral.ai
   OpenRouter  https://openrouter.ai/keys
2. Vercel -> your project -> Settings -> Environment Variables. Add, for example:
      GROQ_API_KEY    = (your key)
      GEMINI_API_KEY  = (your key)
   Add two or three: if one is busy the next answers automatically.
3. Redeploy (Deployments -> ... -> Redeploy). Env variables only apply to new deployments.
4. Check it: open https://sscpc.vercel.app/api/chat in a browser. You should see
   {"providers":["groq","gemini",...],"data":true}
   "data":true means the AI can read your site data (albums, events, committee).
   An empty provider list means no key was found.

If a provider starts failing, its free model name has probably changed: set GROQ_MODEL / GEMINI_MODEL /
CEREBRAS_MODEL / MISTRAL_MODEL / OPENROUTER_MODEL to a current free model from that provider's docs.
Any other OpenAI-compatible provider: set AI_BASE_URL, AI_API_KEY and AI_MODEL.

The AI only sees public site data (js/data.js). Form submissions never go to any AI provider.
If every provider fails, the chat widget falls back to its built-in answers.
