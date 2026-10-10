/* SSCPC Assistant ("Ask SSCPC").
   A small chat widget that answers questions about the club/website and gives
   photography tips.

   How it answers:
   1. If the site is hosted on Vercel with the optional /api/chat function and an
      ANTHROPIC_API_KEY set (see README-CHATBOT.txt), questions go to an AI model that has been
      given the same facts as below.
   2. Otherwise (or if that is unreachable) it answers from the built-in knowledge base in this
      file. This needs no server and no key, so the bot always works.

   To change an answer, edit the FACTS / TIPS lists below. Event dates, albums and committee
   come live from js/data.js, so they never go out of date. */
(function () {
  'use strict';
  if (document.getElementById('sscpc-bot')) return;

  /* ------------------------------------------------------------------ settings */
  const AI_ENDPOINT = '/api/chat';          /* set to '' to turn the AI mode off completely */
  const AI_TIMEOUT_MS = 12000;         /* wait for the first piece of an answer */
  const AI_IDLE_MS = 15000;            /* give up if a streaming answer stalls this long */
  const SITE_URL = 'https://sscpc.vercel.app/';
  const EMAIL = 'sylvestrian.photography@gmail.com';
  const PHONE = '081 222 3917';

  /* ------------------------------------------------------------------ helpers */
  const EV = () => (typeof EVENTS !== 'undefined' ? EVENTS : []);
  const AL = () => (typeof ALBUMS !== 'undefined' ? ALBUMS : []);
  const MB = () => (typeof MEMBERS !== 'undefined' ? MEMBERS : []);
  const spectrumDate = () => new Date(typeof EVENT_DATE !== 'undefined' ? EVENT_DATE : '2026-11-13T09:00:00+05:30');
  function daysToSpectrum() {
    const d = Math.ceil((spectrumDate() - new Date()) / 86400000);
    return d;
  }
  function spectrumCountdownLine() {
    const d = daysToSpectrum();
    if (d > 1) return 'That is ' + d + ' days away.';
    if (d === 1) return 'That is tomorrow!';
    if (d === 0) return 'That is today!';
    return 'It has already taken place.';
  }
  const COMP_CLOSE = new Date('2026-09-30T23:59:59+05:30');
  const compOpen = () => new Date() <= COMP_CLOSE;

  const L = {
    home: { label: 'Home', href: '#home' }, about: { label: 'About', href: '#about' },
    gallery: { label: 'Gallery', href: '#gallery' }, spectrum: { label: 'Spectrum', href: '#spectrum' },
    whatis: { label: 'What is Spectrum', href: '#what-is-spectrum' },
    committee: { label: 'Committee', href: '#members' }, join: { label: 'Join Us (form + PDF)', href: '#join' },
    register: { label: 'Register (form + PDF)', href: '#register' }, contact: { label: 'Contact', href: '#contact' },
    fb: { label: 'Facebook', href: 'https://www.facebook.com/SSCKphotography', ext: true },
    ig: { label: 'Instagram', href: 'https://www.instagram.com/crownsmen_photography', ext: true },
    wa: { label: 'WhatsApp channel', href: 'https://whatsapp.com/channel/0029VaeL6UB9mrGdT1CwN41w', ext: true },
    maps: { label: 'Get directions', href: 'https://www.google.com/maps/dir/?api=1&destination=St.+Sylvester%27s+College%2C+Kandy%2C+Sri+Lanka', ext: true }
  };

  /* ------------------------------------------------------------------ photography tips
     Each topic: id, title, keywords, and short points. Also used to build the tips PDF. */
  const TIPS = [
    { id: 'beginner', title: 'Getting started', k: ['beginner', 'start', 'basics', 'learn photography', 'new to photography', 'first camera'],
      pts: ['Learn on whatever you have. A phone is a real camera, and the skills transfer.', 'Shoot every day, even ten frames. Practice beats gear.', 'Learn just three things first: composition, light, and the exposure triangle.', 'Review your photos and ask "what would I change?". That habit is how you improve fastest.', 'Look at work you love and work out why it works.'] },
    { id: 'composition', title: 'Composition', k: ['composition', 'compose', 'rule of thirds', 'thirds', 'framing', 'leading lines', 'symmetry', 'balance', 'layout', 'frame the shot'],
      pts: ['Rule of thirds: switch on the grid and place your subject on a line or crossing point instead of dead centre.', 'Leading lines (roads, railings, corridors) pull the eye to your subject.', 'Frame within a frame: shoot through a doorway, window or arch.', 'Simplify. Remove clutter, or move a step to the side so nothing grows out of your subject\'s head.', 'Get low or high. Changing your height changes the whole picture.', 'Leave space in the direction a person is looking or moving.'] },
    { id: 'exposure', title: 'Exposure triangle (aperture, shutter, ISO)', k: ['exposure', 'aperture', 'shutter speed', 'iso', 'f stop', 'fstop', 'f number', 'triangle', 'manual mode', 'bokeh', 'depth of field', 'blur background', 'too dark', 'too bright', 'overexposed', 'underexposed'],
      pts: ['Aperture (f-number) controls light and background blur. A low number like f/1.8 gives a blurry background, while f/8 keeps more in focus.', 'Shutter speed controls light and motion. 1/500s or faster freezes action, while 1/30s or slower blurs movement.', 'ISO controls sensor sensitivity. Keep it as low as you can, since high ISO adds noise.', 'They trade off: if you let in more light with one, you must reduce it with another.', 'Start in Aperture Priority (A or Av) mode, then move to Manual once it feels natural.', 'If photos are too dark, use exposure compensation (+) or lower the shutter speed; if too bright, go the other way.'] },
    { id: 'light', title: 'Using light', k: ['light', 'lighting', 'golden hour', 'blue hour', 'sunlight', 'shadow', 'backlight', 'silhouette', 'harsh sun', 'midday', 'natural light', 'window light'],
      pts: ['Golden hour (just after sunrise, before sunset) gives soft, warm light that flatters almost everything.', 'Harsh midday sun: find open shade, or use it for strong shadows and black-and-white.', 'Backlight makes silhouettes. Expose for the bright sky, and the subject turns dark.', 'Window light is great for portraits. Place the person facing the window at 45 degrees.', 'Overcast days act like a giant softbox, ideal for portraits and colour.', 'Always ask "where is the light coming from?" before you ask "what do I shoot?".'] },
    { id: 'focus', title: 'Sharp photos and focus', k: ['focus', 'sharp', 'blurry', 'out of focus', 'camera shake', 'autofocus', 'tripod', 'steady'],
      pts: ['Tap your subject on a phone, or place the focus point on the eye for portraits.', 'Blurry shots are usually shake. Hold your elbows in, breathe out, and press gently.', 'A safe handheld speed is about 1 divided by your focal length (1/60s for a 50mm lens).', 'Use a tripod, wall or table when light is low, and a 2-second timer to avoid touching the camera.', 'Check sharpness by zooming in on the playback screen, not just the thumbnail.'] },
    { id: 'phone', title: 'Phone photography', k: ['phone', 'mobile', 'smartphone', 'iphone', 'android', 'mobile photography', 'phone camera'],
      pts: ['Wipe the lens. A smudged lens is the number one cause of hazy phone photos.', 'Switch on the grid, and tap to focus, then slide the sun icon to adjust brightness.', 'Avoid digital zoom. Walk closer, or use the 2x/3x lens if you have one.', 'Use portrait mode for people, but check the edges of hair for cut-out errors.', 'Shoot in good light. Phones struggle most in dim light, so find a window or lamp.', 'Edit gently (Snapseed or your gallery app): brightness, contrast, crop and straighten.', 'Mobile is a full category in Spectrum, so phone shots can win!'] },
    { id: 'portrait', title: 'Portraits', k: ['portrait', 'portraits', 'people', 'face', 'selfie', 'headshot', 'pose', 'posing', 'candid'],
      pts: ['Focus on the eyes. If the eyes are sharp, the portrait works.', 'Use soft light (shade, window, overcast) and avoid direct overhead sun.', 'Use a longer lens (50 to 85mm, or 2x on a phone) so faces look natural.', 'Talk to your subject. Relaxed people give better expressions than stiff poses.', 'Candid shots: be patient, stay close, and shoot before and after the "moment".', 'Check the background so nothing distracting is behind them.'] },
    { id: 'sports', title: 'Sports and action', k: ['sports', 'sport', 'action', 'match', 'cricket', 'rugby', 'soccer', 'football', 'moving', 'freeze', 'fast', 'panning', 'motion blur'],
      pts: ['Use a fast shutter, 1/500s or faster, to freeze movement (1/1000s for fast sports).', 'Switch to continuous autofocus and burst mode, then pick the best frame later.', 'Anticipate. Learn the sport so you know where the action will happen.', 'Pan for speed: use around 1/30s to 1/60s and follow the subject smoothly for a sharp subject with blurred background.', 'Shoot the emotion too: celebrations, disappointment and the crowd.', 'Get low and change position. Don\'t stay glued to one spot.'] },
    { id: 'night', title: 'Low light and night', k: ['night', 'low light', 'dark', 'evening', 'dim', 'stars', 'astro', 'long exposure', 'indoor', 'noise', 'grain'],
      pts: ['Steady the camera (tripod, wall or bag) so you can use a slower shutter instead of high ISO.', 'Open the aperture as wide as it goes (low f-number).', 'Raise ISO only as much as needed. Some noise is better than a blurry photo.', 'Look for light sources, such as street lamps, signs and windows, and expose for them.', 'Night mode on phones works best when you hold still for the full capture.', 'Long exposures (seconds) turn car lights and water into streaks. Use a tripod and timer.'] },
    { id: 'nature', title: 'Nature and wildlife', k: ['nature', 'wildlife', 'bird', 'birds', 'animal', 'animals', 'flower', 'macro', 'insect', 'landscape', 'tree', 'forest', 'telephoto', 'zoom'],
      pts: ['Be patient and quiet. Let animals get used to you, and never disturb or chase wildlife.', 'Focus on the eye of the animal, and shoot at its eye level when you can.', 'Early morning and late afternoon give the best light and the most activity.', 'Use a longer lens or zoom for wildlife; for flowers and insects, get close and use a wide aperture.', 'Landscapes: include a foreground, a middle and a background for depth, and keep the horizon level.', 'Tell a story: behaviour (feeding, flying, interacting) beats a plain portrait of an animal.'] },
    { id: 'mono', title: 'Black and white (monochrome)', k: ['black and white', 'monochrome', 'b&w', 'bw', 'greyscale', 'grayscale', 'mono'],
      pts: ['Look for contrast, texture, shape and light, not colour.', 'Strong side light and shadows make dramatic monochrome images.', 'Shoot in colour (or RAW) and convert later, so you can adjust how each colour becomes grey.', 'Check that there is a true black and a true white, or the photo may look flat.', 'Great subjects: faces with character, architecture, rain, silhouettes and patterns.'] },
    { id: 'colour', title: 'Colour photography', k: ['colour', 'color', 'colourful', 'vibrant', 'colors', 'white balance', 'saturation', 'tones'],
      pts: ['Pick a colour theme: one bold colour against a calm background works beautifully.', 'Complementary colours (blue and orange, red and green) make a photo pop.', 'Set white balance correctly (or use Auto and fix it in editing) so whites look white.', 'Don\'t over-saturate in editing. Nudge vibrance rather than pushing saturation to the maximum.', 'Golden hour and blue hour bring out the richest natural colour.'] },
    { id: 'event', title: 'School and event photography', k: ['event', 'events', 'school event', 'ceremony', 'concert', 'stage', 'dance', 'cultural', 'prize giving', 'documentary', 'photojournalism'],
      pts: ['Arrive early, scout the venue and note where the light is.', 'Capture a mix: wide scene-setters, medium shots of action and close-ups of faces and details.', 'Shoot the in-between moments. Reactions, preparations and the audience tell the story.', 'Be respectful and discreet. Don\'t block the audience or use flash during performances.', 'Take more than you need and cull hard later; deliver only the best.', 'Always note names (for captions) as you go.'] },
    { id: 'story', title: 'Storytelling', k: ['story', 'storytelling', 'emotion', 'meaning', 'narrative', 'moment', 'decisive moment', 'series', 'photo story'],
      pts: ['Ask "what is this photo about?" and remove anything that isn\'t.', 'Look for emotion and interaction. A moment beats a pose.', 'Include a human element to give scale and feeling.', 'Think in sets: establishing shot, detail shot and portrait together tell a story.', 'Wait for the moment. Often the best frame arrives a few seconds after you get ready.'] },
    { id: 'edit', title: 'Editing', k: ['edit', 'editing', 'lightroom', 'snapseed', 'photoshop', 'raw', 'jpeg', 'retouch', 'filter', 'preset', 'post processing', 'post-processing', 'colour grading', 'color grading'],
      pts: ['Fix the basics first: crop and straighten, exposure, contrast, then highlights and shadows.', 'Free tools: Snapseed (phone), Lightroom Mobile (free tier), GIMP and Darktable (computer).', 'RAW files keep far more detail than JPEG, so use RAW if your camera allows it.', 'Less is more. If people notice the edit before the photo, dial it back.', 'Keep your original files and make edits on copies.', 'Be honest in competitions: follow the rules about what editing is allowed.'] },
    { id: 'gear', title: 'Gear and care', k: ['gear', 'camera', 'lens', 'equipment', 'buy', 'which camera', 'best camera', 'flash', 'memory card', 'battery', 'clean', 'care'],
      pts: ['Your first upgrade should be learning, not gear. A kit lens is plenty to begin.', 'A 50mm f/1.8 prime lens is an affordable way to get blurry backgrounds and low-light ability.', 'Carry spare batteries and memory cards, and format cards in the camera.', 'Keep gear dry and dust-free; use a blower and microfibre cloth, and never wipe a dusty lens dry.', 'Back up photos in two places as soon as you get home.'] },
    { id: 'contest', title: 'Competition tips (Spectrum)', k: ['competition tips', 'tips for spectrum', 'win', 'winning', 'judge', 'judging', 'submit tips', 'enter competition', 'contest', 'improve my entry', 'choose best photo'],
      pts: ['Choose quality over quantity. Pick your strongest images and skip the near-duplicates.', 'Match the category: Colour, Monochrome, Nature, Wildlife or Mobile.', 'Judges love a clear subject, strong light, clean composition and a feeling or story.', 'Check sharpness at full size, straighten horizons and remove distracting edge clutter.', 'Don\'t over-edit or add heavy filters, and follow the competition rules.', 'Ask a friend or club member to rank your shortlist, since fresh eyes spot what you miss.'] }
  ];
  const TIP_ORDER = ['composition', 'exposure', 'light', 'phone', 'portrait', 'sports', 'night', 'edit'];
  const tipById = id => TIPS.find(t => t.id === id);

  /* ------------------------------------------------------------------ site facts */
  const FACTS = [
    { id: 'greet', k: ['hello there'], a: () => 'Hi! I\'m the SSCPC assistant. Ask me about the club, Spectrum, joining, events, or photography tips.', chips: ['When is Spectrum?', 'How do I join?', 'Photography tips'] },
    { id: 'thanks', k: ['thanks', 'thank you', 'thx', 'awesome'], a: () => 'You\'re welcome! Anything else I can help with?', chips: ['Photography tips', 'Contact the club'] },
    { id: 'who', k: ['who are you', 'what are you', 'your name', 'are you ai', 'are you a bot', 'bot', 'assistant'], a: () => 'I\'m the SSCPC assistant, a helper for the St. Sylvester\'s College Photography Club website. I can answer questions about the club and Spectrum, point you to the right page, and share photography tips. For anything I can\'t answer, the club committee is happy to help.', links: [L.contact] },
    { id: 'about', k: ['about the club', 'about us', 'about sscpc', 'what is sscpc', 'sscpc', 'the club', 'photography club', 'who is sscpc', 'what do you do', 'how many members', 'members of the club'], a: () => 'The St. Sylvester\'s College Photography Club (SSCPC) in Kandy brings together students who capture moments, explore creativity and turn experiences into visual stories. The club has 50+ members and covers school life, live sports and cultural events, with workshops, competitions, exhibitions and creative projects for photography and videography. Beginners and experienced members are both welcome.', links: [L.about, L.gallery] },
    { id: 'spectrum', k: ['spectrum', 'what is spectrum', 'spectrum 2026', 'exhibition', 'photography day'], a: () => 'Spectrum is the club\'s flagship event. It starts with an island-wide online photography competition, and the winning and selected photographs are then shown at a photography exhibition on the main Photography Day. The day also has talks by two professional photographers (the Chief Guest and Guest of Honour) and a certificate award ceremony for the winners.', links: [L.whatis, L.register] },
    { id: 'when', k: ['when is spectrum', 'spectrum date', 'date', 'when', 'what time', 'time', 'venue', 'where is spectrum', 'where', 'hall', 'cingolani', 'countdown', 'how many days', 'schedule'], a: () => { const e = EV().find(x => /spectrum/i.test(x.name)) || {}; return 'Spectrum 2026 is on ' + (e.date || 'Friday, 13 November 2026') + ', from ' + (e.time || '9:00 a.m. onwards') + ', at ' + (e.venue || 'Cingolani Memorial Hall') + ', St. Sylvester\'s College, Kandy. ' + spectrumCountdownLine(); }, links: [L.register, L.maps] },
    { id: 'mobilecat', k: ['phone photos win', 'can phone', 'phone win', 'mobile category', 'phone category', 'can i use my phone', 'use a phone'], a: () => 'Yes! Spectrum has a Mobile category, so photos taken on a phone are welcome and can win. The competition also has Colour, Monochrome, Nature and Wildlife categories. Great light and a clear subject matter more than the camera.', links: [L.whatis], chips: ['Phone photography tips', 'Competition tips'] },
    { id: 'comp', k: ['competition', 'categories', 'category', 'submit', 'submission', 'deadline', 'entry', 'entries', 'enter', 'participate', 'how many photos', 'google form', 'prizes', 'winners', 'awards', 'merit'], a: () => 'The Spectrum Online Photography Competition is open to students from schools across Sri Lanka. There are five categories: Colour, Monochrome, Nature, Wildlife and Mobile. Each participant could submit up to three photographs per category, through a Google Form. Eight winners are chosen (1st, 2nd, 3rd and five merit awards), and their photos are displayed at the exhibition and recognised at the certificate ceremony. ' + (compOpen() ? 'Submissions are open until 30 September 2026.' : 'Submissions closed on 30 September 2026 (the deadline had been extended from 20 September), so the entries are now with the judges.') + ' You can still come to the exhibition!', links: [L.whatis, L.register] },
    { id: 'register', k: ['register', 'registration', 'visitor', 'attend', 'attending', 'invite', 'invited', 'invited schools', 'school registration', 'teacher', 'how to attend', 'come to spectrum'], a: () => 'Visitor registration for Spectrum is for invited schools. One teacher can register a whole group by entering how many students are coming. Fill in the school details, the president\'s contact, the student names, and confirm. After you submit, you can tap Download PDF to save your registration (or Share PDF on WhatsApp) and send it to the club president.', links: [L.register], chips: ['Download the registration PDF', 'Contact the president'] },
    { id: 'join', k: ['join', 'membership', 'become a member', 'apply', 'application', 'sign up', 'signup', 'enrol', 'enroll', 'how to join', 'join club', 'who can join', 'grade'], a: () => 'To join SSCPC, open the Join Us page and fill in the membership application: your name, grade (6 to 13), admission number, phone, your photography experience and equipment (a phone is fine!), your interests and why you want to join. Beginners are welcome. When you submit, you get a Download PDF button (and Share PDF on WhatsApp) so you can send your application to the president.', links: [L.join], chips: ['Download the membership PDF', 'Do I need a camera?'] },
    { id: 'camera_needed', k: ['do i need a camera', 'need a camera', 'no camera', 'only phone', 'phone only', 'equipment needed', 'what equipment'], a: () => 'No, you don\'t need a camera. Phone-only members are welcome (the application has "Phone only" and "None yet" options), and there is even a Mobile category in Spectrum. The club helps you learn the skills first.', links: [L.join], chips: ['Phone photography tips'] },
    { id: 'pdf', k: ['pdf', 'download pdf', 'download', 'print', 'printable', 'save as pdf'], a: () => 'PDFs are available in these places:\n• Join Us and Register: after submitting the form, tap Download PDF.\n• Photography tips: I can make a printable Photography Tips Cheat Sheet for you.\n• This chat: you can save our conversation as a PDF.\nUse the buttons below.', actions: ['tipsPdf', 'chatPdf'], links: [L.join, L.register] },
    { id: 'contact', k: ['contact', 'email', 'phone number', 'telephone', 'call', 'reach', 'whatsapp', 'get in touch', 'social media', 'facebook', 'instagram', 'follow', 'channel', 'contact details'], a: () => 'You can reach the club at:\n• Email: ' + EMAIL + '\n• Phone: ' + PHONE + '\n• President Sasidu Shanelka: 077 531 2890, Secretary Chethiya Sulakshana: 076 911 0822\n• Instagram: crownsmen_photography\n• Facebook: SSCPC Photography\n• WhatsApp channel for updates\nThe Contact page also has a message form.', links: [L.contact, L.fb, L.ig, L.wa] },
    { id: 'location', k: ['location', 'directions', 'map', 'how to get', 'find the school', 'kandy', 'where is the school', 'address of school'], a: () => 'We are at St. Sylvester\'s College, Kandy, Sri Lanka. Spectrum 2026 takes place at the Cingolani Memorial Hall on the school premises.', links: [L.maps, L.contact] },
    { id: 'committee', k: ['committee', 'president', 'secretary', 'treasurer', 'vice president', 'editor', 'organizer', 'organiser', 'leaders', 'office bearers', 'executive', 'who runs'], a: q => { const roleHit = roleAnswer(q); if (roleHit) return roleHit; const m = MB(); if (!m.length) return 'You can meet the committee on the Committee page.'; const out = []; m.forEach(gr => (gr.people || gr.members || []).forEach(p => out.push('• ' + p.role + ': ' + p.name))); return out.length ? 'Here is the committee:\n' + out.join('\n') : 'You can meet the committee on the Committee page.'; }, links: [L.committee] },
    { id: 'events', k: ['events', 'upcoming', 'past events', 'what events', 'calendar', 'activities', 'happening', 'news', 'latest'], a: () => { const e = EV(); if (!e.length) return 'See the Spectrum page for what\'s coming up.'; return 'Events on our site:\n' + e.map(x => '• ' + x.name + ' (' + (x.date || '') + (x.venue ? ', ' + x.venue : '') + ')').join('\n'); }, links: [L.spectrum, L.gallery] },
    { id: 'gallery', k: ['gallery', 'albums', 'album', 'see photos', 'view photos', 'your photos', 'club photos', 'event photos', 'photo albums', 'pictures of events'], a: () => { const a = AL(); return 'Our Gallery has photo albums from school events' + (a.length ? ' such as:\n' + a.slice(0, 6).map(x => '• ' + x.name + (x.info && x.info.date ? ' (' + x.info.date + ')' : '')).join('\n') : '.') + '\nOpen an album to browse and view the photos; each links to the full post on Facebook.'; }, links: [L.gallery, L.fb] },
    { id: 'wristband', k: ['wristband', 'crownsmen', 'band', 'merch', 'merchandise', 'price'], a: () => 'The official Crownsmen wristband appears on our announcement poster at Rs. 400. For how to get one, please contact the club.', links: [L.contact, L.spectrum] },
    { id: 'school', k: ['school', 'st sylvester', 'sylvester', 'college', 'founded', 'history', 'since', 'crest', 'motto'], a: () => 'SSCPC belongs to St. Sylvester\'s College, Kandy, a school with a history going back to 1945. The school\'s motto on its crest is "Fortiter in Re". The club\'s motto is Capture. Create. Inspire.', links: [L.about] },
    { id: 'website', k: ['website', 'site', 'who made', 'developer', 'developed', 'built', 'made the website', 'dark mode', 'theme', 'install', 'app'], a: () => 'This website was developed by the SSCPC Crew. You can switch light/dark theme with the theme button in the menu, and install the site as an app from your browser menu.', links: [L.home] },
    { id: 'tipsmenu', k: ['tips', 'photography tips', 'advice', 'help me with photography', 'improve', 'better photos', 'get better', 'take good photos', 'good photos', 'photography help'], a: () => 'Happy to help you take better photos! Pick a topic below, or just ask, for example "how do I take photos at night?" or "what is the rule of thirds?"', tipsMenu: true }
  ];

  /* ------------------------------------------------------------------ matching */
  const norm = s => String(s).toLowerCase().replace(/[’']/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanName = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const stem = w => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w);
  const stemText = s => norm(s).split(' ').map(stem).join(' ');
  function editDistance(a, b) {
    a = cleanName(a); b = cleanName(b); if (!a || !b) return 99;
    const dp = Array.from({length: b.length + 1}, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = dp[0]; dp[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cur = dp[j];
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = cur;
      }
    }
    return dp[b.length];
  }
  function score(q, keys) {
    const qs = ' ' + stemText(q) + ' ';
    let sc = 0;
    keys.forEach(k => {
      const ks = stemText(k);
      if (!ks) return;
      if (qs.indexOf(' ' + ks + ' ') !== -1) sc += ks.indexOf(' ') !== -1 ? 4 : (ks.length <= 2 ? 1 : 2);
    });
    return sc;
  }
  function committeePeople() {
    const all = [];
    MB().forEach(gr => (gr.members || gr.people || []).forEach(p => all.push(p)));
    return all;
  }
  function personAnswer(q) {
    const raw = String(q || ''), nq = norm(raw), compact = cleanName(raw);
    const all = committeePeople();
    if (!all.length) return null;
    /* Exact/near-exact name matching. This intentionally tolerates small spelling errors
       such as "Sasindu Shanelka" -> "Sasidu Shanelka". */
    let best = null, bestScore = 0;
    all.forEach(p => {
      const full = cleanName(p.name), parts = String(p.name || '').toLowerCase().split(/\s+/).filter(Boolean);
      const first = cleanName(parts[0] || ''), last = cleanName(parts[parts.length - 1] || '');
      if (!full) return;
      let score = 0;
      if (compact.includes(full) || nq.includes(norm(p.name))) score = 100;
      else if (first && compact.includes(first) && last && compact.includes(last)) score = 95;
      else if (last && compact.includes(last) && first && editDistance(compact, full) <= Math.max(2, Math.floor(full.length * .18))) score = 90;
      else if (first && compact.includes(first) && editDistance(compact, full) <= Math.max(3, Math.floor(full.length * .25))) score = 80;
      if (score > bestScore) { bestScore = score; best = p; }
    });
    if (!best) return null;
    const role = best.role ? best.role + '. ' : '';
    const grade = best.grade ? ' He is in ' + best.grade + '.' : '';
    const note = best.note ? ' ' + best.note : '';
    return '**' + best.name + '** is the ' + role + grade + note + ' You can open the Committee page to see the committee.';
  }
  function roleAnswer(q) {
    const nq = norm(q), all = committeePeople();
    all.sort((x, y) => String(y.role || '').length - String(x.role || '').length);   /* "vice president" before "president" */
    const hit = all.find(p => p.role && nq.indexOf(norm(p.role)) !== -1);
    if (!hit) return null;
    return 'The ' + hit.role + ' is ' + hit.name + (hit.grade ? ' (' + hit.grade + ')' : '') + '. You can meet everyone on the Committee page.';
  }
  const factById = id => FACTS.find(f => f.id === id);
  function sinhalaLocal(q) {
    const x = String(q || '').toLowerCase();
    const hasSinhala = /[\u0D80-\u0DFF]/.test(x);
    if (!hasSinhala) return null;
    if (/(sasidu|sasindu|ශසිදු|සසිදු|සසිඳු|president|ජනාධිපති|සභාපති)/i.test(x)) {
      return { text: '**සසිදු ෂැනෙල්කා (Sasidu Shanelka)** SSCPC හි **President** වේ. ඔහු Grade 12 ශිෂ්‍යයෙකි. Committee පිටුවෙන් ඔහු සහ අනෙකුත් සාමාජිකයන් ගැන බලන්න.', links: [L.committee] };
    }
    if (/(join|membership|සාමාජික|සම්බන්ධ|එක්ව)/i.test(x)) {
      return { text: 'SSCPC එකට join වෙන්න **Join Us** පිටුවට ගිහින් membership form එක පුරවන්න. Camera එකක් අනිවාර්ය නැහැ — phone එකක් තිබුණත් join වෙන්න පුළුවන්.', links: [L.join] };
    }
    if (/(register|registration|ලියාපදිංචි|ලියාපදිංචිය|spectrum.*register)/i.test(x)) {
      return { text: 'Spectrum registration ගැන නම් **Register** පිටුව විවෘත කර form එක පුරවන්න. Form එකේ ගැටලුවක් තිබේ නම් මට කියන්න — පියවරෙන් පියවර උදව් කරන්නම්.', links: [L.register] };
    }
    if (/(form|ෆෝම්|ප්‍රශ්න|ගැටලුව|වැඩ නැහැ|submit|යවන්න)/i.test(x)) {
      return { text: 'Form එකේ ගැටලුව මට කියන්න. උදාහරණයක් ලෙස “submit වෙන්නේ නැහැ”, “PDF එක එන්නේ නැහැ”, “required field error” වගේ විස්තරයක් දෙන්න. මම විසඳුම පියවරෙන් පියවර කියන්නම්.', links: [L.join, L.register, L.contact] };
    }
    if (/(spectrum|ස්පෙක්ට්‍රම්|තරග|තරඟ|exhibition|ප්‍රදර්ශන)/i.test(x)) {
      return { text: 'Spectrum 2026 Photography Day එක 2026 නොවැම්බර් 6 වන සිකුරාදා පෙ.ව. 9.00 සිට Cingolani Memorial Hall, St. Sylvester’s College, Kandy හි පැවැත්වීමට නියමිතයි.', links: [L.spectrum, L.register] };
    }
    if (/(photo|photography|ඡායාරූප|කැමරා|camera|tips|උපදෙස්)/i.test(x)) {
      return { text: 'ඡායාරූප ගැනීම ගැන උදව් කරන්න පුළුවන්. ඔබට phone photography, composition, lighting, sports, portraits හෝ night photography ගැන අහන්න පුළුවන්.', chips: ['Phone photography', 'Composition', 'Sports photography'] };
    }
    return { text: 'ඔබට සිංහලෙන් අහන්න පුළුවන්. SSCPC, Committee, Spectrum, forms, joining හෝ photography ගැන ඔබේ ප්‍රශ්නය සරලව ලියන්න.' };
  }
  function formHelp(q) {
    const x = norm(q);
    if (!/(form|forms|register|registration|join|membership|contact|submit|submission|pdf|whatsapp|application)/.test(x)) return null;
    if (/(submit|send|not working|doesnt work|does not work|error|failed|failure|cant submit|cannot submit|not sending|stuck)/.test(x)) {
      if (/(register|registration|spectrum)/.test(x)) return { text: 'If the **Spectrum registration form** will not submit: check that every required field is filled, the student count matches the number of names entered, the confirmation checkbox is selected, and your internet connection is stable. Then try Submit again. If it still fails, use the Contact page and tell the committee the exact error message.', links: [L.register, L.contact] };
      if (/(join|membership|application)/.test(x)) return { text: 'If the **Join Us form** will not submit: check every required field, make sure your phone number is valid, select an equipment option (phone-only is fine), and try again with a stable connection. If it still fails, use Contact and send the exact error message.', links: [L.join, L.contact] };
      return { text: 'If a website form is not submitting, first check required fields, the confirmation checkbox, your internet connection, and any red error message. Tell me which form you are using — Join Us, Spectrum Registration, or Contact — and I can guide you more precisely.', links: [L.join, L.register, L.contact] };
    }
    if (/(pdf|download|save)/.test(x)) return { text: 'After a successful Join Us or Register submission, the page provides a **Download PDF** option. If you cannot see it, first confirm that the form submission completed successfully, then try again. You can also use the WhatsApp sharing option where available.', links: [L.join, L.register] };
    if (/whatsapp/.test(x)) return { text: 'After submitting the Join Us or Register form, use **Share PDF on WhatsApp** when the button appears. If it does not appear, use Download PDF first and share the saved PDF manually.', links: [L.join, L.register] };
    return null;
  }
  function answerLocal(q) {
    const nq = norm(q);
    if (!nq) return null;
    const si = sinhalaLocal(q);
    if (si) return { type: 'direct', text: si.text, links: si.links, chips: si.chips };
    const person = personAnswer(q);
    if (person && /(who|whos|who is|tell me about|about|president|secretary|treasurer|vice|editor|organizer|organiser|teacher|sasidu|sasindu|shanelka)/i.test(String(q))) return { type: 'direct', text: person, links: [L.committee] };
    const fh = formHelp(q);
    if (fh) return { type: 'direct', text: fh.text, links: fh.links, chips: fh.chips };
    if (/^(hi|hii+|hello|hey|hola|ayubowan|yo|good (morning|afternoon|evening))( there| bot)?$/.test(nq)) return { type: 'fact', f: factById('greet') };
    let bt = null, bts = 0, bf = null, bfs = 0;
    TIPS.forEach(t => { const x = score(q, t.k); if (x > bts) { bts = x; bt = t; } });
    FACTS.forEach(f => { if (f.id === 'tipsmenu') return; const x = score(q, f.k); if (x > bfs) { bfs = x; bf = f; } });
    const howTo = /\b(how (to|do i|can i|should i)|tips?|best way|advice)\b/.test(nq);
    if (howTo && bt && bts >= 2 && bfs < 4) return { type: 'tip', t: bt };   /* technique questions beat vague club keywords */
    if (bf && bfs >= 2 && bfs >= bts) return { type: 'fact', f: bf };   /* club questions win ties */
    if (bt && bts >= 2) return { type: 'tip', t: bt };
    if (score(q, factById('tipsmenu').k) >= 2) return { type: 'fact', f: factById('tipsmenu') };
    return null;
  }

  /* ------------------------------------------------------------------ UI */
  const root = document.createElement('div');
  root.id = 'sscpc-bot';
  root.innerHTML =
    '<section class="sb-panel" id="sb-panel" role="dialog" aria-label="SSCPC assistant" hidden>' +
    '<header class="sb-head"><img src="images/logo.png" alt="" width="34" height="34" draggable="false">' +
    '<div class="sb-title"><strong>SSCPC Assistant</strong><span>Club info &amp; photography tips</span></div>' +
    '<div class="sb-tools"><button type="button" class="sb-ico" data-act="chatPdf" title="Save chat as PDF" aria-label="Save chat as PDF"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 20h14"/></svg></button>' +
    '<button type="button" class="sb-ico" data-act="close" title="Close" aria-label="Close assistant"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></header>' +
    '<div class="sb-log" id="sb-log" role="log" aria-live="polite"></div>' +
    '<div class="sb-chips" id="sb-chips"></div>' +
    '<div class="sb-form"><input id="sb-in" type="text" maxlength="400" placeholder="Ask about SSCPC or photography…" autocomplete="off" aria-label="Your question">' +
    '<button type="button" id="sb-send" aria-label="Send"><svg class="i-send" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 20 4l-4 16-4-6-8-2Z"/></svg><svg class="i-stop" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg></button></div>' +
    '<p class="sb-foot">Answers about the club come from this website. Check details with the committee.</p></section>';
  document.body.appendChild(root);

  /* small "AI" badge, bottom-left, so visitors can see there is an AI assistant */
  const aiBtn = document.createElement('button');
  aiBtn.type = 'button'; aiBtn.className = 'sb-ai'; aiBtn.setAttribute('aria-label', 'Open the AI chat assistant'); aiBtn.setAttribute('aria-controls', 'sb-panel');
  aiBtn.innerHTML = '<span class="sb-ai-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" opacity=".85"/></svg></span><span class="sb-ai-txt"><b>AI Assistant</b><i>Ask SSCPC anything</i></span>';
  document.body.appendChild(aiBtn);

  const $ = s => root.querySelector(s);
  const panel = $('#sb-panel'), log = $('#sb-log'), chipsEl = $('#sb-chips'), input = $('#sb-in');
  const history = [];   /* {role:'user'|'bot', text} */
  let aiFails = 0, opened = false, aiDown = !AI_ENDPOINT || location.protocol === 'file:';

  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* Chat formatting: turns the AI's markdown into clean HTML (paragraphs, bullet / numbered lists, **bold**, *italic*,
     `code`, links). Everything is HTML-escaped first, so nothing the AI (or a visitor) writes can inject markup. */
  function inline(t) {
    return t
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|#[\w-]*)\)/g, (m, a, u) => '<a href="' + u + '"' + (u[0] === '#' ? '' : ' target="_blank" rel="noopener"') + '>' + a + '</a>')
      .replace(/(^|[\s(>])(https?:\/\/[^\s<)]+[^\s<).,;:!?])/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
      .replace(/(^|[\s(>])([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g, '$1<a href="mailto:$2">$2</a>')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(^|[\s(>])\*(?![\s*])([^*\n]+?)(?<![\s*])\*(?=$|[\s).,;:!?<])/g, '$1<i>$2</i>');
  }
  function fmt(s) {
    const lines = esc(String(s == null ? '' : s)).replace(/\r/g, '').split('\n');
    let out = '', list = null, para = [];
    const flushPara = () => { if (para.length) { out += '<p>' + para.join('<br>') + '</p>'; para = []; } };
    const closeList = () => { if (list) { out += '</' + list + '>'; list = null; } };
    lines.forEach(line => {
      let m;
      if ((m = line.match(/^\s*(?:[*\-•–])\s+(.*)$/))) {
        flushPara(); if (list !== 'ul') { closeList(); out += '<ul>'; list = 'ul'; } out += '<li>' + inline(m[1]) + '</li>';
      } else if ((m = line.match(/^\s*\d{1,2}[.)]\s+(.*)$/))) {
        flushPara(); if (list !== 'ol') { closeList(); out += '<ol>'; list = 'ol'; } out += '<li>' + inline(m[1]) + '</li>';
      } else if ((m = line.match(/^\s{0,3}#{1,4}\s+(.*)$/))) {
        flushPara(); closeList(); out += '<p class="sb-h"><b>' + inline(m[1].replace(/\*\*/g, '')) + '</b></p>';
      } else if (!line.trim()) {
        flushPara(); closeList();
      } else {
        closeList(); para.push(inline(line.trim()));
      }
    });
    flushPara(); closeList();
    return out;
  }
  (function addChatFormatCss() {
    if (document.getElementById('sb-md-css')) return;
    const st = document.createElement('style'); st.id = 'sb-md-css';
    st.textContent =
      '#sscpc-bot .sb-bub p{margin:0 0 .55em}#sscpc-bot .sb-bub p:last-child,#sscpc-bot .sb-bub ul:last-child,#sscpc-bot .sb-bub ol:last-child{margin-bottom:0}' +
      '#sscpc-bot .sb-bub ul,#sscpc-bot .sb-bub ol{margin:0 0 .6em;padding-left:1.15em}#sscpc-bot .sb-bub li{margin:.18em 0;padding-left:.1em}' +
      '#sscpc-bot .sb-bub li::marker{color:#6cc8ff}#sscpc-bot .sb-bub p.sb-h{margin-top:.2em}' +
      '#sscpc-bot .sb-bub code{padding:.05em .35em;border-radius:3px;background:rgba(108,200,255,.14);font-family:ui-monospace,Consolas,monospace;font-size:.92em}' +
      '#sscpc-bot .sb-bub a{color:#6cc8ff;text-decoration:underline;text-underline-offset:2px;word-break:break-word}';
    document.head.appendChild(st);
  })();
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nearBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 70;
  const toBottom = () => log.scrollTo({ top: log.scrollHeight, behavior: 'instant' });
  let lastStream = Promise.resolve();   /* resolves when the latest bot message has finished appearing */
  let curStream = null;

  /* links / PDF buttons under a bot message (shown once the text has finished) */
  function decorate(bub, extra) {
    if (!extra) return;
    if (extra.links && extra.links.length) {
      const w = document.createElement('div'); w.className = 'sb-links';
      extra.links.forEach(l => {
        const a = document.createElement('a'); a.textContent = l.label; a.href = l.href;
        if (l.ext) { a.target = '_blank'; a.rel = 'noopener'; } else a.addEventListener('click', () => { if (matchMedia('(max-width:640px)').matches) closePanel(); });
        w.appendChild(a);
      });
      bub.appendChild(w);
    }
    if (extra.actions && extra.actions.length) {
      const w = document.createElement('div'); w.className = 'sb-links';
      extra.actions.forEach(a => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'sb-dl';
        b.textContent = a === 'tipsPdf' ? '⬇ Photography Tips PDF' : '⬇ Save this chat as PDF';
        b.addEventListener('click', () => doAction(a));
        w.appendChild(b);
      });
      bub.appendChild(w);
    }
  }

  /* A bot message that fills in live, like a streaming AI. push(text) adds text as it arrives; the words are
     revealed smoothly (faster when a lot is waiting) with a blinking cursor; end() resolves once everything is shown.
     opt.fixed = the whole text is already known (built-in answers): reveal at a steady typing pace. */
  function streamMsg(opt) {
    opt = opt || {};
    const d = document.createElement('div'); d.className = 'sb-msg bot';
    const bub = document.createElement('div'); bub.className = 'sb-bub sb-streaming';
    d.appendChild(bub); log.appendChild(d); toBottom();
    let full = '', shown = 0, done = false, raf = null, last = 0, acc = 0, res;
    const ctl = { el: d, finished: false };
    const p = new Promise(r => { res = r; });
    function paint() {
      let t = full.slice(0, shown);
      if ((t.match(/\*\*/g) || []).length % 2) t += '**';   /* close an open **bold** so it renders as it grows */
      const stick = nearBottom();
      bub.innerHTML = fmt(t);
      if (stick) toBottom();
    }
    function finish() {
      if (ctl.finished) return; ctl.finished = true;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      shown = full.length; bub.classList.remove('sb-streaming'); bub.innerHTML = fmt(full);
      decorate(bub, opt.extra);
      toBottom();
      history.push({ role: 'bot', text: full });
      if (curStream === ctl) curStream = null;
      res(full);
    }
    function tick(now) {
      raf = null;
      const dt = Math.min(now - (last || now), 64); last = now;
      const backlog = full.length - shown;
      if (backlog > 0) {
        const rate = opt.fixed ? Math.min(0.32, Math.max(0.14, full.length / 2200)) : Math.min(1.2, 0.05 + backlog * 0.0025);   /* chars per ms */
        acc += dt * rate; const n = Math.floor(acc);
        if (n > 0) { acc -= n; shown = Math.min(full.length, shown + n); paint(); }
      }
      if (shown < full.length) raf = requestAnimationFrame(tick);
      else if (done) finish();
    }
    ctl.push = t => {
      if (ctl.finished || !t) return;
      full += t;
      if (REDUCED) { shown = full.length; paint(); return; }
      if (!raf) { last = 0; raf = requestAnimationFrame(tick); }
    };
    ctl.end = () => { done = true; if (REDUCED || shown >= full.length) finish(); return p; };
    ctl.abort = () => { if (shown < full.length) full = full.slice(0, shown).replace(/\S*$/, '').replace(/\s+$/, '') + '…'; done = true; finish(); };   /* Stop button: keep what is already on screen */
    curStream = ctl;
    return ctl;
  }

  function addMsg(role, text, extra) {
    if (role === 'bot') {
      const s = streamMsg({ extra: extra, fixed: true });
      s.push(text); lastStream = s.end();
      return s.el;
    }
    const d = document.createElement('div');
    d.className = 'sb-msg ' + role;
    d.innerHTML = '<div class="sb-bub">' + fmt(text) + '</div>';
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    history.push({ role: role, text: text });
    return d;
  }
  let chipTok = 0;
  function setChips(list) {
    const tok = ++chipTok;
    chipsEl.innerHTML = '';
    if (!list || !list.length) return;
    lastStream.then(() => {        /* suggestion chips appear once the answer has finished */
      if (tok !== chipTok) return;
      chipsEl.innerHTML = '';
      list.forEach(t => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
        b.addEventListener('click', () => ask(t));
        chipsEl.appendChild(b);
      });
    });
  }
  const DEFAULT_CHIPS = ['When is Spectrum?', 'How do I join?', 'Photography tips', 'Download tips PDF', 'Contact the club'];
  function typing(on) {
    let t = log.querySelector('.sb-typing');
    if (on && !t) { t = document.createElement('div'); t.className = 'sb-msg bot sb-typing'; t.innerHTML = '<div class="sb-bub"><i></i><i></i><i></i></div>'; log.appendChild(t); log.scrollTop = log.scrollHeight; }
    if (!on && t) t.remove();
  }

  function respondLocal(q) {
    /* chip shortcuts that map to actions */
    const nq = norm(q);
    if (/(download|save|get|make).*(tips|cheat).*(pdf)|tips pdf|cheat sheet/.test(nq)) {
      addMsg('bot', 'Here\'s your Photography Tips Cheat Sheet. Tap the button to download it as a PDF.', { actions: ['tipsPdf'] });
      setChips(DEFAULT_CHIPS); return;
    }
    if (/(save|download|export).*(chat|conversation)/.test(nq)) {
      addMsg('bot', 'Tap below to save our conversation as a PDF.', { actions: ['chatPdf'] }); setChips(DEFAULT_CHIPS); return;
    }
    if (/(download|get).*(membership|join).*pdf/.test(nq)) {
      addMsg('bot', 'The membership PDF is created from your own application. Fill in the Join Us form, submit it, then tap Download PDF (or Share PDF on WhatsApp) to send it to the president.', { links: [L.join] }); setChips(['How do I join?', 'Do I need a camera?']); return;
    }
    if (/(download|get).*(registration|register).*pdf/.test(nq)) {
      addMsg('bot', 'The registration PDF is created from your school\'s details. Fill in the Register form, submit it, then tap Download PDF (or Share PDF on WhatsApp) to send it to the president.', { links: [L.register] }); setChips(['Who can register?', 'When is Spectrum?']); return;
    }
    const m = answerLocal(q);
    if (!m) {
      addMsg('bot', 'I\'m not sure about that one. I can help with the club, Spectrum (dates, categories, registration), joining SSCPC, the committee, contact details, and photography tips. For anything else, the committee will be glad to help.', { links: [L.contact] });
      setChips(DEFAULT_CHIPS); return;
    }
    if (m.type === 'direct') {
      addMsg('bot', m.text, { links: m.links });
      setChips(m.chips || DEFAULT_CHIPS);
      return;
    }
    if (m.type === 'tip') {
      const t = m.t;
      addMsg('bot', '**' + t.title + '**\n' + t.pts.map(p => '• ' + p).join('\n'), { actions: ['tipsPdf'] });
      const others = TIP_ORDER.filter(i => i !== t.id).slice(0, 4).map(i => tipById(i).title.split(' (')[0]);
      setChips(others.concat(['Photography tips']));
      return;
    }
    const f = m.f;
    const text = typeof f.a === 'function' ? f.a(q) : f.a;
    addMsg('bot', text, { links: f.links, actions: f.actions });
    if (f.tipsMenu) setChips(TIP_ORDER.map(i => tipById(i).title.split(' (')[0]));
    else setChips(f.chips || DEFAULT_CHIPS);
  }

  let busy = false, stopped = false, curFetch = null;
  const sendBtn = () => $('#sb-send');
  function setBusy(on) { busy = on; sendBtn().classList.toggle('is-stop', on); sendBtn().setAttribute('aria-label', on ? 'Stop' : 'Send'); }
  function stopGen() { stopped = true; if (curFetch) curFetch.abort(); if (curStream) curStream.abort(); }

  function aiSiteContext() {
    const people = committeePeople().map(p => ({ name: p.name, role: p.role, grade: p.grade || '', note: p.note || '' }));
    const events = EV().slice(0, 20).map(e => ({ name: e.name, date: e.date || '', time: e.time || '', venue: e.venue || '' }));
    const albums = AL().slice(0, 12).map(a => ({ name: a.name, date: a.info && a.info.date ? a.info.date : '' }));
    return { today: new Date().toISOString(), committee: people, events, albums, pages: Object.values(L).map(x => ({ label: x.label, href: x.href })) };
  }

  /* Ask the AI and show its answer live as it streams in. Throws only if nothing at all arrived (then we fall back). */
  async function respondAI() {
    const msgs = history.slice(-8).map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text.slice(0, 600) }));
    /* API requires first message to be from user */
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    const ctl = new AbortController(); curFetch = ctl;
    let to = setTimeout(() => ctl.abort(), AI_TIMEOUT_MS), s = null;
    try {
      const r = await fetch(AI_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: msgs, stream: true, siteContext: aiSiteContext() }), signal: ctl.signal });
      if (!r.ok) throw new Error('http ' + r.status);
      if ((r.headers.get('content-type') || '').indexOf('application/json') >= 0 || !r.body || !r.body.getReader) {
        const j = await r.json();       /* server answered in one piece: still reveal it progressively */
        if (!j || !j.reply) throw new Error('empty');
        typing(false); s = streamMsg({ fixed: true }); s.push(String(j.reply)); lastStream = s.end(); await lastStream; return;
      }
      const reader = r.body.getReader(), dec = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const t = dec.decode(value, { stream: true });
        if (!t) continue;
        clearTimeout(to); to = setTimeout(() => ctl.abort(), AI_IDLE_MS);
        if (!s) { typing(false); s = streamMsg({}); }
        s.push(t);
      }
      if (!s) throw new Error('empty');
      lastStream = s.end(); await lastStream;
    } catch (e) {
      if (s) { lastStream = s.end(); await lastStream; return; }   /* connection dropped / stopped mid-answer: keep what arrived */
      throw e;
    } finally { clearTimeout(to); curFetch = null; }
  }

  async function ask(q) {
    q = String(q || '').trim(); if (!q || busy) return;
    stopped = false; setBusy(true);
    input.value = ''; setChips([]);
    addMsg('user', q);
    typing(true);
    try {
      /* things the bot does itself (PDFs, page links) are always answered locally */
      const nq = norm(q);
      const localOnly = /pdf|download|cheat sheet/.test(nq) || /^photography tips$/.test(nq);
      if (!aiDown && !localOnly) {
        try {
          await respondAI();
          aiFails = 0;
          setChips(DEFAULT_CHIPS);
          return;
        } catch (e) {
          if (stopped) { typing(false); return; }
          /* The AI could not answer this time. Switch it off for the rest of the visit only when the server is clearly not set up
             (404 = api/chat.js not deployed, 503 = no AI key added in Vercel) or it failed 3 times in a row; one hiccup just falls
             back to the built-in answer for this question. The reason is printed in the browser console (F12). */
          aiFails = (aiFails || 0) + 1;
          console.warn('[SSCPC AI] not available:', e && e.message ? e.message : e);
          if (/http (404|503)/.test(String(e && e.message)) || aiFails >= 3) aiDown = true;
        }
      }
      await new Promise(r => setTimeout(r, 350));
      if (stopped) { typing(false); return; }
      typing(false);
      respondLocal(q);
      await lastStream;
    } finally { typing(false); setBusy(false); }
  }

  /* ------------------------------------------------------------------ PDFs */
  const clean = v => String(v == null ? '' : v).replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, '').trim();
  /* Both PDFs are built by the shared engine (js/pdf/docs/tips.js and chat.js). */
  async function tipsPdf() {
    if (!window.jspdf || !window.SSCPCPdf) { addMsg('bot', 'The PDF tool is still loading. Please try again in a moment.'); return; }
    try {
      const pdf = await window.SSCPCPdf.generate('tips', { tips: TIPS });
      pdf.doc.save(pdf.name);
    } catch (e) { addMsg('bot', 'Sorry, the PDF could not be created on this device.'); }
  }
  async function chatPdf() {
    const turns = history.filter(h => h.text);
    if (!turns.length) { addMsg('bot', 'There is nothing to save yet. Ask me something first!'); return; }
    if (!window.jspdf || !window.SSCPCPdf) { addMsg('bot', 'The PDF tool is still loading. Please try again in a moment.'); return; }
    try {
      const pdf = await window.SSCPCPdf.generate('chat', { turns: turns });
      pdf.doc.save(pdf.name);
    } catch (e) { addMsg('bot', 'Sorry, the PDF could not be created on this device.'); }
  }
  function doAction(a) {
    if (a === 'tipsPdf') tipsPdf(); else if (a === 'chatPdf') chatPdf(); else if (a === 'close') closePanel();
  }

  /* ------------------------------------------------------------------ open / close */
  function openPanel() {
    panel.hidden = false; root.classList.add('open'); document.documentElement.classList.add('sb-open');
    if (!opened) {
      opened = true;
      addMsg('bot', 'Hi! I\'m the SSCPC assistant. Ask me about the club, Spectrum 2026, joining, or get photography tips.');
      setChips(DEFAULT_CHIPS);
    }
    setTimeout(() => input.focus({ preventScroll: true }), 50);
  }
  function closePanel() { panel.hidden = true; root.classList.remove('open'); document.documentElement.classList.remove('sb-open'); aiBtn.focus({ preventScroll: true }); }
  aiBtn.addEventListener('click', () => { if (panel.hidden) openPanel(); });
  root.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => doAction(b.dataset.act)));
  $('#sb-send').addEventListener('click', () => (busy ? stopGen() : ask(input.value)));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ask(input.value); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) closePanel(); });

  /* a link with ?assistant=1 (the QR code on the tips PDF) opens the assistant once the page has loaded */
  try {
    if (/[?&]assistant(=|&|$)/.test(location.search)) {
      const go = () => setTimeout(() => { if (panel.hidden) openPanel(); }, 1800);
      if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
    }
  } catch (e) { /* ignore */ }

  /* keep the button out of the way of the pinned intro */
  window.SSCPC_BOT = { open: openPanel, ask: q => { openPanel(); ask(q); }, tipsPdf: tipsPdf, tips: TIPS };

  /* buttons in the "Need a hand?" section on the Home page */
  document.querySelectorAll('[data-bot-open]').forEach(b => b.addEventListener('click', openPanel));
  document.querySelectorAll('[data-bot-ask]').forEach(b => b.addEventListener('click', () => window.SSCPC_BOT.ask(b.getAttribute('data-bot-ask'))));
  document.querySelectorAll('[data-bot-pdf="tips"]').forEach(b => b.addEventListener('click', tipsPdf));
})();
