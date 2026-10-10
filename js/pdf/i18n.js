/* SSCPC PDF engine - translations of the fixed wording (labels, headings, notes).
   Used only when a visitor picks Sinhala or Tamil in the "PDF language" box. In that case
   every label is printed in the chosen language with the English wording printed beneath it,
   so anyone can read what each line means. The header and footer always stay English, and
   whatever the applicant typed is printed exactly as typed.

   To add or fix a translation: find the English text (the key) and edit its si / ta line.
   A key with no translation is simply printed in English. To add another language, add a
   code (for example 'hi') to LANGS and a line for it under each key (and a font in text.js).

   Please have a Sinhala and a Tamil speaker read these through once: a native reader should
   confirm the wording before the club relies on it. */
(function () {
  'use strict';
  const NS = window.SSCPCPdf = window.SSCPCPdf || {};

  NS.LANGS = [
    { code: 'en', label: 'English' },
    { code: 'si', label: 'සිංහල' },        /* Sinhala */
    { code: 'ta', label: 'தமிழ்' }        /* Tamil */
  ];

  const T = {
    /* common */
    'Date': { si: 'දිනය', ta: 'திகதி' },
    'Reference': { si: 'යොමු අංකය', ta: 'குறிப்பு எண்' },
    'Message': { si: 'පණිවිඩය', ta: 'செய்தி' },
    'Email': { si: 'විද්‍යුත් තැපෑල', ta: 'மின்னஞ்சல்' },

    /* membership application */
    'Membership No.': { si: 'සාමාජික අංකය', ta: 'உறுப்பினர் எண்' },
    'Applicant': { si: 'අයදුම්කරු', ta: 'விண்ணப்பதாரர்' },
    'Parent / guardian': { si: 'දෙමාපිය / භාරකරු', ta: 'பெற்றோர் / பாதுகாவலர்' },
    'About your photography': { si: 'ඔබේ ඡායාරූපකරණය පිළිබඳව', ta: 'உங்கள் புகைப்படக்கலை பற்றி' },
    'Full name': { si: 'සම්පූර්ණ නම', ta: 'முழுப் பெயர்' },
    'Grade': { si: 'ශ්‍රේණිය', ta: 'தரம்' },
    'Admission number': { si: 'ඇතුළත් කිරීමේ අංකය', ta: 'சேர்க்கை எண்' },
    'Phone / WhatsApp': { si: 'දුරකථන / වට්ස්ඇප්', ta: 'தொலைபேசி / வட்ஸ்அப்' },
    'Guardian phone': { si: 'භාරකරුගේ දුරකථන අංකය', ta: 'பாதுகாவலரின் தொலைபேசி' },
    'Photography experience': { si: 'ඡායාරූපකරණ පළපුරුද්ද', ta: 'புகைப்பட அனுபவம்' },
    'Equipment': { si: 'උපකරණ', ta: 'உபகரணங்கள்' },
    'Interests': { si: 'රුචිකම්', ta: 'ஆர்வங்கள்' },
    'Why I want to join': { si: 'මා සම්බන්ධ වීමට කැමති හේතුව', ta: 'நான் சேர விரும்புவதற்கான காரணம்' },
    'Applicant signature': { si: 'අයදුම්කරුගේ අත්සන', ta: 'விண்ணப்பதாரரின் கையொப்பம்' },
    'Parent / guardian signature': { si: 'දෙමාපිය / භාරකරුගේ අත්සන', ta: 'பெற்றோர் / பாதுகாவலரின் கையொப்பம்' },
    'I confirm that the details above are correct.': { si: 'ඉහත සඳහන් තොරතුරු නිවැරදි බව මම තහවුරු කරමි.', ta: 'மேலே உள்ள விவரங்கள் சரியானவை என்பதை உறுதிப்படுத்துகிறேன்.' },
    'For club use only': { si: 'සමාජ කාර්යාල භාවිතය සඳහා පමණි', ta: 'கழக அலுவலகப் பயன்பாட்டிற்கு மட்டும்' },
    'Received by': { si: 'භාර ගත්තේ', ta: 'பெற்றவர்' },
    'Membership confirmed': { si: 'සාමාජිකත්වය තහවුරු කළේ', ta: 'உறுப்புரிமை உறுதிப்படுத்தியவர்' },
    'Please send this application to the President of SSCPC, or message the club on WhatsApp with your membership number.': {
      si: 'කරුණාකර මෙම අයදුම්පත SSCPC සභාපතිවරයාට ලබා දෙන්න, නැතහොත් ඔබේ සාමාජික අංකය සමඟ WhatsApp හරහා සමාජයට පණිවිඩයක් එවන්න.',
      ta: 'இந்த விண்ணப்பத்தை SSCPC தலைவரிடம் ஒப்படையுங்கள், அல்லது உங்கள் உறுப்பினர் எண்ணுடன் WhatsApp மூலம் கழகத்திற்குச் செய்தி அனுப்புங்கள்.' },

    /* visitor registration */
    'Students attending': { si: 'සහභාගී වන සිසුන්', ta: 'பங்குபெறும் மாணவர்கள்' },
    'Teachers attending': { si: 'සහභාගී වන ගුරුවරුන්', ta: 'பங்குபெறும் ஆசிரியர்கள்' },
    'School': { si: 'පාසල', ta: 'பாடசாலை' },
    'School name': { si: 'පාසලේ නම', ta: 'பாடசாலையின் பெயர்' },
    'Teacher in charge name': { si: 'භාර ගුරුවරයාගේ නම', ta: 'பொறுப்பாசிரியரின் பெயர்' },
    'Teacher in charge telephone number': { si: 'භාර ගුරුවරයාගේ දුරකථන අංකය', ta: 'பொறுப்பாசிரியரின் தொலைபேசி எண்' },
    'Club contact': { si: 'සමාජයේ සම්බන්ධතා', ta: 'கழகத் தொடர்பு' },
    'Club email': { si: 'සමාජයේ විද්‍යුත් තැපෑල', ta: 'கழக மின்னஞ்சல்' },
    "President's name": { si: 'සභාපතිගේ නම', ta: 'தலைவரின் பெயர்' },
    "President's phone / WhatsApp": { si: 'සභාපතිගේ දුරකථන / වට්ස්ඇප්', ta: 'தலைவரின் தொலைபேசி / வட்ஸ்அப்' },
    'Student names': { si: 'සිසුන්ගේ නම්', ta: 'மாணவர்களின் பெயர்கள்' },
    'Show this on arrival': { si: 'පැමිණෙන විට මෙය පෙන්වන්න', ta: 'வருகையின்போது இதைக் காட்டுங்கள்' },
    'Please keep this as your copy of the registration. Bring it, or show it on your phone, when you arrive at Spectrum.': {
      si: 'කරුණාකර මෙය ඔබේ ලියාපදිංචි පිටපත ලෙස තබා ගන්න. Spectrum වෙත පැමිණෙන විට මෙය රැගෙන එන්න, නැතහොත් දුරකථනයෙන් පෙන්වන්න.',
      ta: 'இதனை உங்கள் பதிவின் நகலாக வைத்திருங்கள். Spectrum நிகழ்வுக்கு வரும்போது இதைக் கொண்டு வாருங்கள் அல்லது தொலைபேசியில் காட்டுங்கள்.' }
  };
  NS.i18n = T;

  /* translation of an English string for the document's language, or null when the
     document is English or no translation exists. Never used for the header or footer. */
  NS.tr = function (x, en) {
    if (!x || !x.lang || x.lang === 'en') return null;
    const e = T[String(en == null ? '' : en).trim()];
    return (e && e[x.lang]) || null;
  };
})();
