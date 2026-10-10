SSCPC WEBSITE - HOW TO LOOK AFTER IT
St. Sylvester's College Photography Club
=====================================================

This is a normal website made of plain files. It does not need a
database, a subscription or any special software. Any host can
serve it, and it can be edited with a free text editor (Notepad,
VS Code, or Notepad++).

To preview it on your computer: double-click index.html.


1. WHAT IS IN THIS FOLDER
-------------------------
index.html    The pages: Home, About, Gallery, Events, Members, Contact
css/style.css All colours, fonts and layout
js/data.js    THE FILE YOU EDIT MOST: event date and all albums
js/main.js    Menu, countdown, loading screen
js/gallery.js Album cards and photo viewer
js/router.js  Switches between the menu tabs
js/forms.js   Sends the forms (Google Sheet or Netlify)
vercel.json   Settings for Vercel
js/app.js     Theme button, install button, offline support
tools/        album-builder.html: makes new albums without coding
icons/, manifest.webmanifest, sw.js   Installable app files
js/members.js  Builds the Members page
js/join.js      Join Us form, PDF and WhatsApp buttons
js/register.js Sends the registration form
images/       Logo, Spectrum wordmark, and one folder per album
fonts/        Grifter (headings) and Poppins (everything else) font files,
              used locally so the site does not depend on Google Fonts for
              its main typefaces. (A few HUD-style bits -- the countdown
              ticker text, the loading screen -- also use Share Tech Mono
              from Google Fonts for a digital-display look; if it cannot
              load, a normal monospace font is used instead.)


HOW FACEBOOK AND THE WEBSITE WORK TOGETHER
------------------------------------------
Post every album on the Facebook page first, as usual. On the
website, show the BEST 10-20 photos of each album with the album
details (event, date, venue, credits) and a "Facebook album" button. This keeps the site fast and small, and the
complete albums stay on Facebook.


ADMIN PORTAL (your-site/admin)
   Home: key numbers, new items in the inbox, and what is unpublished.
   Inbox: click a row to read it all, mark it Handled and add a private note.
     This needs the updated tools/google-sheet-script.gs: paste it into Apps
     Script, then Deploy > Manage deployments > pencil > New version > Deploy.
     (Until then the inbox still works, without Handled/Notes.)
     Please also change ADMIN_KEY in that script from the sample value.
   Events / Members / Slides: forms with checks (links, dates, empty names),
     image upload (the picture is resized and committed with your changes),
     drag the handle to reorder, Undo and Redo in the side menu.
   Albums: reorder or remove here; add and edit in the Album Builder.
   Publish: review every change first, fix any listed problems, then publish.
     Changes made meanwhile elsewhere (for example by the Album Builder) are
     merged in; if the same section changed in both places, reload and redo it.

2. COMMON UPDATES
-----------------

EASIEST WAY TO ADD OR EDIT AN ALBUM: THE ALBUM BUILDER (no coding)
   Open  your-site/album-builder  (it forwards to tools/album-builder.html; also reachable from the admin portal's
   side menu, "Album Builder"). Pick an album to edit, or press New album.
   Fill in the details, add the photos, drag to reorder, press the star on
   a photo to make it the cover, and untick any you do not want.
   Then press "Publish to site": the photos and the updated js/data.js are
   committed to GitHub and Vercel redeploys in about a minute.
   First time only: open the "GitHub connection" box at the top and enter the
   repository (owner/name), branch and a fine-grained token (Contents: read
   and write, this repo only). The admin portal uses the same saved settings.
   No token? Press "Download ZIP instead", unzip it into the website folder
   (it replaces js/data.js), then commit and push.
   The builder also makes or updates the Events-page entry, and it can edit
   albums that already exist (details, order, cover, extra photos).
   Big albums (200 to 500 photos) are fine: photos are processed a few at a
   time and uploaded in batches. Keep the tab open while it works.
   (The manual way is described in A) below.)

A) ADD A NEW ALBUM
   1. Inside images/albums/ make a new folder, for example
      images/albums/sports-meet-2026
   2. Put the photos in it (photo-01.jpg, photo-02.jpg, ...) and
      the album poster as cover.jpg. Keep each photo under about
      300 KB (width around 1200 px) so the site stays fast.
   3. Open js/data.js. Copy the whole { ... } block of an existing
      album, put a comma after the previous block, and paste it.
   4. Change name, date, venue, captured and edited names, and the
      image paths to match your new folder.
   5. Save, then re-upload the site (section 4).

B) ADD PHOTOS TO AN EXISTING ALBUM
   Put the new photo in the album's folder and add one more line to
   that album's "photos" list in js/data.js.

C) CHANGE THE SPECTRUM DATE OR TIME
   In js/data.js change EVENT_DATE (the countdown), and change the
   date, time and venue in the Spectrum entry of EVENTS (same file).

G) ADD AN EVENT TO THE EVENTS PAGE
   In js/data.js copy an entry of EVENTS, change the text, set
   category to 'main' (Spectrum) or 'school' (other school events),
   and set status to 'upcoming' or 'past'. To link the event to its photos,
   set album to the exact name of an album from ALBUMS.

H) LINK AN ALBUM TO ITS FULL FACEBOOK ALBUM
   In js/data.js, paste the Facebook album link into "facebook"
   for that album. A "Facebook album" button appears.

D) CHANGE TEXT
   Open index.html and edit the words between the tags. Do not
   delete the < > tags.

E) MEMBERS PAGE
   In js/data.js edit MEMBERS. To add or change a person, copy one
   { name, role, photo } line. Put the photo (square, about 400 x 400
   px) in images/members/ and write its path. Use '' for no photo yet
   (a silhouette is shown). For a new year's committee, copy the whole
   group { title, members } and change the title; keep the old group
   below it so past committees stay on the site.

E2) CONTACT PAGE
   In index.html find the Contact section and replace the "coming
   soon" text.

F) FACEBOOK LINK
   In index.html search for "facebook.com/SSCKphotography" and
   change it (it appears twice).


H2) VISITOR REGISTRATION (Register tab)
   The form works when the site is hosted on Netlify (Netlify Forms).
   - After the first upload, open Netlify -> your site -> Forms.
     You should see "spectrum-registration". Every registration
     appears there. You can download all of them as a CSV file.
   - Forms -> Settings & usage -> Form notifications: add the club
     email so every registration is emailed to you.
   - Free plans have a monthly limit on submissions. Check the
     current limit on Netlify. Asking one teacher to register a
     whole group keeps the count low.
   - If you ever need unlimited registrations, make a Google Form
     and replace the form on the Register page with a button that
     links to it.
   - Registrations contain personal details. Keep them private,
     share them only with the organisers, and delete them after the
     exhibition.
   - The form does NOT work in the claude.ai preview link. Test it on
     your Netlify address.


H3) JOIN US (membership applications)
   - Applications are saved in Netlify -> Forms -> "join-application"
     (same place as visitor registrations). Add an email notification for
     this form too.
   - After the applicant submits, the browser makes a PDF of the
     application. The applicant then taps a button to send it to the
     president on WhatsApp.
   - In js/data.js the president's WhatsApp chat link is set in
     PRESIDENT_WHATSAPP_LINK. If you fill PRESIDENT_WHATSAPP with a number
     (international format, digits only, e.g. 94771234567) the message
     button also pre-fills the applicant's details. When the president
     changes, update these two lines.
   - WhatsApp does NOT allow a website to send a message or file by
     itself. The applicant has to tap Send. Fully automatic sending needs
     the paid WhatsApp Business platform and a small server.
   - The PDF maker (jsPDF) loads from cdnjs.cloudflare.com. If that
     address ever stops working, the application is still saved and the
     WhatsApp message button still works.


H4) ANNOUNCEMENT SLIDER (Home page)
   The posters that slide across the Home page are listed in SLIDES in
   js/data.js. Put each poster in images/announcements/ (about 900 px wide,
   under 300 KB), then add or remove a line. SLIDE_SECONDS sets how long each
   poster stays. Remove posters that are out of date (for example an old
   deadline). To show details when a poster is tapped, add text: `...` to
   its line in SLIDES (see the example in js/data.js). Web links and phone
   numbers become tappable automatically.


H5) OTHER FEATURES
   - Gallery filters (Year, Event type) appear automatically. The event type
     comes from "category" in each album in js/data.js.
   - Add to calendar / Directions on the Events page use start, end and
     mapsQuery in the Spectrum entry of EVENTS (js/data.js). Check that
     the Directions button opens the correct place on the map.
   - Light/dark theme button: in the menu. The choice is remembered.
   - Loading-page shutter sound: off unless the visitor taps "Sound".
   - Install as an app: manifest.webmanifest, sw.js and the icons/ folder make
     the site installable on phones (works on the live Netlify address, not
     in previews). The service worker always fetches the newest files first,
     so updates show straight away.


H6) FORMS ON VERCEL OR ANY HOST: GOOGLE SHEET (recommended)
   Netlify Forms only works on Netlify. On Vercel the forms would show an
   error. To store registrations, membership applications, and contact
   messages on any host:
   1. Make a Google Sheet with the club Google account -- this holds
      Registrations and Join requests.
   2. Extensions > Apps Script. Delete the sample code and paste all of
      tools/google-sheet-script.gs. (Optional: put the club email in
      NOTIFY_EMAIL to get an email for every entry.)
   3. Contact Us messages go to a SEPARATE spreadsheet: make a second new
      Google Sheet, copy its ID out of the URL (the long part between /d/
      and /edit), and paste it into CONTACT_SHEET_ID near the top of
      google-sheet-script.gs. Leave it empty to keep contact messages in
      the same spreadsheet instead, on a "Messages" tab.
   4. Deploy > New deployment > Web app. Execute as: Me. Who has access:
      Anyone. Deploy, allow access, copy the Web app URL (ends with /exec).
   5. Paste it into FORMS_ENDPOINT in js/data.js and upload the site again.
   Registrations and Join requests appear in the sheet tabs "Registrations"
   and "Join requests" of the first spreadsheet. Contact messages appear on
   a "Messages" tab -- in the second spreadsheet if you set CONTACT_SHEET_ID,
   otherwise in the same one. Test all three forms once after uploading.

   MEMBERSHIP NUMBERS: every Join Us application gets a number -- SSCPC 001,
   SSCPC 002, and so on -- assigned automatically by the script and written
   in the "Membership No." column of "Join requests" (the column is added
   for you the first time a join application comes in, even on a sheet that
   already has rows). The applicant sees it on screen, in the PDF they can
   download, and in their thank-you email. Numbers always go up and never
   repeat, even if two people apply at the same moment. If you ALREADY had a
   google-sheet-script.gs deployed before this feature: paste in the updated
   file, then Deploy > Manage deployments > pencil icon > Version: New
   version > Deploy (see H8 below) -- the web app URL stays the same, so
   nothing in js/data.js needs to change.

H7) NAMES LINKED TO THE COMMITTEE
   In the Gallery, a name in "Captured by" or "Edited by" that matches a member of
   the Executive Committee (group with exec: true in MEMBERS) becomes a button that
   opens the Members page at that person's card. Write the name exactly as in
   MEMBERS.


H8) LINK PREVIEW, VISITOR COUNTER, THANK-YOU EMAILS
   - Link preview: index.html has title, description and picture tags that use
     https://sscpc.vercel.app/ and images/og-image.jpg. If the web address changes
     (for example a new domain), replace that address in the og: and twitter: lines
     near the top of index.html. WhatsApp and Facebook keep old previews for a while.
   - Visitor counter: in Vercel open the project > Analytics tab > Enable. Then
     upload the site once. Counts appear in that tab (free plan has a monthly limit).
   - Thank-you emails: sent by tools/google-sheet-script.gs to the email typed in the
     form. After changing that script: Deploy > Manage deployments > pencil > New
     version > Deploy (the web app URL stays the same).


3. RULES THAT KEEP IT WORKING
-----------------------------
- File and folder names: lowercase letters, numbers and hyphens
  only. No spaces.
- Keep index.html in the main folder. Do not rename it.
- Make a copy of the whole folder before big changes.
- Keep a backup of the folder in the club's Google Drive, not on
  one person's phone.


4. PUBLISHING AND THE DOMAIN
----------------------------
HOSTING (free): Netlify, Cloudflare Pages or GitHub Pages.
  Netlify: go to app.netlify.com/drop, upload this folder (or the
  zip). To update the site later: open the site in Netlify ->
  Deploys -> drag the updated folder in.

VERCEL (the site can also live on Vercel, for example sscpc.vercel.app)
  The address stays the same for every update to the same Vercel project.
  - If the project is connected to a GitHub repository: open the repository on
    GitHub, press Add file > Upload files, drop in the updated files (keep the
    folders), press Commit changes. Vercel publishes the new version by itself
    in about a minute.
  - If you used the Vercel command line: unzip the site, open a terminal in the
    folder and run:  vercel --prod
  Vercel's dashboard does not accept a zip file. Keep vercel.json in the folder.

DOMAIN (yearly fee): buy a name such as sscpc.club from a domain
  registrar, then connect it in Netlify: Domain management ->
  Add a domain. Turn ON auto-renew.


5. KEEPING IT ALIVE FOR YEARS (PRESIDENTS CHANGE, SITES SHOULD NOT)
--------------------------------------------------------------------
- Register the domain, hosting and Facebook page under a CLUB
  email address (for example sscpc.club@gmail.com), NOT a
  personal one. Give the password to the teacher-in-charge.
- Add at least two people (president + teacher-in-charge) as
  owners of the hosting account and the domain.
- Turn on auto-renew and check the payment card every year.
- Write the renewal date in the club calendar.
- Every year, when the new committee starts: hand over this
  README, the email login, the registrar login and the hosting
  login.
- Do not use a personal email or someone's own card for the
  domain. When that student leaves, the domain can be lost.


6. WHO TO ASK FOR HELP
----------------------
If you need bigger changes (new pages, new design), give this
folder to any web developer, or upload it to Claude and ask for
the change. Everything needed is in this folder.


BACKGROUND MUSIC
----------------
audio/track-1..5.mp3 play one after another and loop (js/music.js). The round music button is
at the bottom-right. Hover over it (or tap it on a phone) and three icons slide out: Previous,
Play/Pause and Next. Previous: one click restarts the current song, a quick double click goes
to the previous song. Browsers block autoplay, so music starts on the visitor's first
tap/click; if they switch it off, it stays off on their device. To change the order or titles,
edit the TRACKS list at the top of js/music.js. Replace a track by overwriting its mp3.

COMMITTEE PAGE
--------------
The Executive Committee shows as wide profile cards (css/committee.css, js/members.js). Each card uses
name, role, grade, photo and "note" from MEMBERS in js/data.js. "View profile" opens the full note.
A member with no photo gets a panel with their initials; add photo: "images/members/xxx.jpg" to fix that.

(Committee fonts: role/grade text uses Noto Sans from fonts/noto-sans-*.woff, licence in fonts/NotoSans-LICENSE_OFL.txt.)

GALLERY: DOWNLOADS, FAVOURITES, SHARE
------------------------------------
js/gallery-tools.js + css/gallery-tools.css + js/zip.js add these to every album:
 - Download one photo, select several (ZIP), download favourites (ZIP), download the whole album (ZIP).
 - Favourites (heart): saved on the visitor's own device only. Share (link to the album or one photo).
 - FULL-QUALITY LINK (optional): in js/data.js, add a line to an album, e.g.
       "originals": "https://drive.google.com/drive/folders/....",
   A "Full-quality photos" button then appears for that album. Leave it out to hide the button.
 - Shared links look like  yoursite/?album=<album folder name>&photo=<file name>#gallery
   so keep the album folder names (images/albums/<name>/) unchanged once shared.

PDFs (js/pdf/)
--------------
Every PDF the site makes is built by one engine in js/pdf/:
  text.js        text cleaning, wrapping and drawing; Sinhala/Tamil lines are shaped by the
                 browser and placed in the PDF as pictures
  qr.js          QR codes drawn as vector squares (encoder: js/vendor/qrcode.js)
  i18n.js        the Sinhala and Tamil wording of every label, heading and note (edit here)
  core.js        page sizes, templates (standard / print / compact), options, fonts, logo,
                 the document registry and generate()
  components.js  headers, footer, sections, field panels, tables, cards, tiles, signatures...
  ui.js          the "PDF options" panel, deliver() (download + share) and data-pdf buttons
  docs/*.js      one file per PDF: tips, chat, join, register
Club-wide settings (colours, footer text, defaults) are in PDF_CONFIG in js/data.js.
To add a new PDF: copy a file in js/pdf/docs/, change the id, title, filename and build(),
add its <script> tag after the other docs in index.html, then give any button
data-pdf="your-id". Open tools/pdf-preview.html to check every PDF with sample data.

PDF LANGUAGE: ENGLISH FIRST, SINHALA / TAMIL OPTIONAL
----------------------------------------------------
English is the main language. After a visitor submits the Join Us or Registration form, the
normal English PDF (Download / Share buttons) is ready as before. Below it is a small collapsed box,
"Need a Sinhala or Tamil copy too? (optional)". Opening it offers two extra download buttons;
nobody has to use it, and it never changes the English PDF.
 - Header and footer are always English.
 - In a Sinhala/Tamil copy every label, heading, note and signature line is printed in that language
   with the English wording in small type directly beneath it. What the applicant typed is printed
   exactly as typed (Sinhala and Tamil typing works in every PDF, including English ones).
 - Fonts (in fonts/): abhayalibre.ttf (Sinhala), notosanstamil-regular.ttf and
   notosanstamil-bold.ttf (Tamil). Poppins is used for the English words.
 - Translations are in js/pdf/i18n.js. Please have a Sinhala and a Tamil speaker read them once.
   A line with no translation prints in English only.
 - Sinhala/Tamil lines are pictures inside the PDF, so that text cannot be selected or searched.
 - PDF logo: images/pdf-logo.png (round version of the club logo). Change PDF_CONFIG.logo in
   js/data.js to use a different picture.
 - If the site has an offline cache (sw.js), add the three font files and pdf-logo.png to it.

QR CODES IN THE PDFs
--------------------
Each PDF carries a QR code that opens the club website (PDF_CONFIG.siteUrl in js/data.js):
 - Membership application: beside the membership badge, links to the About page (<site>/#about)
 - Registration: inside the "Show this on arrival" box, links to the Spectrum tab (<site>/#spectrum)
 - Chat PDF ("Save chat as PDF"): beside the Conversation bar at the top, opens the AI assistant (<site>/?assistant=1)
 - Tips sheet: bottom-right of the last page, opens the AI assistant (<site>/?assistant=1) so readers
   find more tips; chatbot.js opens the chat when a page is loaded with ?assistant=1
The code is drawn as sharp vector squares (js/pdf/qr.js), so it stays crisp at any zoom or print size.
It is dark on white, 28 mm (never below 22 mm), with a 4-module white margin, error correction M and
no logo on top. Change the size, or turn the codes off, with PDF_CONFIG.qr = { enabled, size } in
js/data.js. The encoder is bundled in js/vendor/qrcode.js (Kazuhiko Arase, MIT licence), so nothing
is loaded from outside. To add a code to another PDF:
   NS.meta(x, ..., { qr: { anchor: 'join' } })     beside the badge
   NS.note(x, text, { qr: { anchor: 'register' } })  inside a callout
   NS.qrCorner(x, { query: 'assistant=1' })              bottom-right of the last page
   a document definition with  headerQr: true      header-right (only when the header is tall enough)
If the code cannot be made for any reason, the PDF is still produced without it.

MEMBERSHIP CARD
---------------
js/pdf/docs/card.js makes a bank-card-size PDF (85.60 x 53.98 mm, corner radius 3.18 mm; the standard allows
2.88 to 3.48 mm). Page 1 = front (name, grade, membership number, QR code to the About page), page 2 = back.
After a Join Us application is submitted and the club has given a membership number, a "Download membership
card" button appears under the application PDF, with optional "Card in Sinhala" and "Card in Tamil" buttons
(labels in that language with the English beside them; the translations are in js/pdf/i18n.js). Print it at 100% (no "fit to page") on card stock and cut along
the rounded edge. Open tools/pdf-preview.html and choose "SSCPC Membership Card" to see it with sample data.

LEARN SECTION (a card on the home page opens a lessons page)
-------------------------------------------------------------
index.html, id="learn": a single card, "Photography Basics". Clicking it opens the lessons page (id="learn-hub", shown over the site, not a menu tab), which holds
the four lessons, a video and photos for each lesson, the weekly challenge and the buttons for the tips PDF and the assistant.
To change a lesson, edit the words in id="learn-hub". To change the card title or text, edit id="learn". Style: css/learn.css.
THIS WEEK'S CHALLENGE changes by itself every Monday: js/learn.js holds a list of 12 challenges and shows the next one each
week, then starts again. Edit the list to add your own, or set PIN at the top of js/learn.js to keep one challenge for a while.

VIDEOS AND PHOTOS INSIDE EACH LESSON
------------------------------------
In js/learn.js, the LESSONS list has one entry per lesson (composition, light, exposure, phone) with a "video" and a "photos" list.
There is no separate video tutorials section any more. To add a video, paste its link into "url":
  - a YouTube link: it plays on the page. The player loads only when the visitor presses play (youtube-nocookie.com).
  - your own file, for example url: 'videos/composition.mp4' (.mp4 or .webm, ideally under 30 MB), optional poster: 'images/learn/composition.jpg'.
  - any other link (for example a Facebook video): a "Watch" button opens it in a new tab.
  Leave url empty to show "Coming soon".
To add photos, put the files in images/learn/ and list them, e.g. photos: [{ src: 'images/learn/composition-1.jpg', caption: 'Rule of thirds' }].
If the site has a Content-Security-Policy (vercel.json), allow youtube-nocookie.com in frame-src and i.ytimg.com in img-src.

GALLERY VIEWS PER ALBUM (admin page)
------------------------------------
js/album-views.js counts one view per album per visitor session (only the album name is sent) and sends it to the
same Google Apps Script as the forms. Setup, once:
  1. Open tools/album-views.gs and follow the 4 steps at the top (paste it into the Apps Script project, add two
     lines to doPost / doGet, then Deploy > Manage deployments > New version).
  2. In the admin page, add  <div id="album-views"></div>  and load js/admin-album-views.js, then call
     SSCPCAlbumViews.mount(document.getElementById('album-views'), { endpoint: FORMS_ENDPOINT, key: <the admin key> }).
  3. In the gallery code, when an album is opened, add:
     window.dispatchEvent(new CustomEvent('sscpc:album-open', { detail: { album: albumName } }))
Shared album links (?album=...) are counted without step 3.


ADMIN AND ALBUM BUILDER FONTS
-----------------------------
Secondary font, always bold:
  Admin page    : Nexa Heavy          (fonts/Nexa-Heavy.ttf, css/admin-fonts.css)
  Album builder : Heading Now Bold    (fonts/HeadingNow-*.ttf, css/album-builder-fonts.css)
Add the matching <link rel="stylesheet"> line (written at the top of each CSS file) to the end of that page's <head>.
Heading Now is licensed CC BY-NC (non-commercial); keep its licence PDF if you publish the site.
