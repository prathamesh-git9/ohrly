/**
 * Ohrly's legal texts. They describe what the app really does, so if the app changes how it handles
 * data, these must change with it. The English text is the reference; the German is a translation.
 * Reviewed by no lawyer: see docs/LEGAL-REVIEW.md for what a professional should still check.
 */
export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
}

export const LEGAL_UPDATED = '10 November 2026 (names of visitors)';
export const OPERATOR = 'Prathamesh Kalamkar';
export const CONTACT_URL = 'https://github.com/prathamesh-git9/ohrly/issues';

export const LEGAL: Record<'en' | 'de', LegalSection[]> = {
  en: [
    {
      id: 'about',
      title: 'Who runs Ohrly',
      paragraphs: [
        `Ohrly is a free, non-commercial, open-source project run by ${OPERATOR}, a private individual. It has no ads, no paid features and no company behind it.`,
        `Contact: open an issue at ${CONTACT_URL}. For anything about your personal data, say so in the title; you do not need to share personal details in a public issue to get a reply.`,
      ],
    },
    {
      id: 'independence',
      title: 'Independence and trademarks',
      paragraphs: [
        'Ohrly is an independent project. It is not affiliated with, endorsed by or connected to any other language-learning product or company.',
        'Ohrly mentions exams by Goethe-Institut, telc, Cambridge English and IELTS only so learners know which official exams a level lines up with. Those names are trademarks of their owners. Ohrly practice exams are original, unofficial practice: they are not issued, approved or scored by those organisations and do not certify a level or predict a result.',
        'The Ohrly name, the mascot Fenn, the characters, artwork, sounds, course text and exercises were created for this project.',
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy',
      paragraphs: [
        'Without an account, your progress, settings and streak stay in your own browser. They are kept in your browser’s local storage on your device. Ohrly does not send them anywhere, does not use cookies, and runs no analytics, tracking or advertising.',
        'Your name: the name you type at the start is sent to our database (Supabase, European Union, Paris) with the course you chose, the date and a random ID for your browser, so Ohrly\u2019s creator can see who is learning. You are told this where you type it, and you can use a nickname instead. Nobody else can read these names. The legal basis is your consent (GDPR Article 6(1)(a)); you can withdraw it at any time with Profile > Your data > Remove my name, which deletes every name your browser sent.',
        'With an account, which is optional, Ohrly stores your email address, a securely hashed password, the name you gave, and a copy of your learning progress, so you can continue on another device. This is held by Supabase, our database provider, in the European Union (Paris, France). The legal basis is providing the service you asked for (GDPR Article 6(1)(b)). The data is kept until you delete your account, which you can do yourself at any time on the Account page; deletion removes your account and your saved progress.',
        'Hosting: the website is served by GitHub Pages, which processes technical data such as your IP address to deliver the pages, under GitHub’s own privacy statement. Ohrly does not receive or store these logs.',
        'Speaking exercises: if you use the microphone, your browser (for example Chrome, Edge or Safari) may send the recording to its own speech service to turn it into text. Ohrly does not receive or keep your recording. You can turn speaking exercises off in Settings.',
        'Your rights: you can access, correct, export (Profile > Your data) and delete your data, object to processing, and complain to a data protection authority, for example the Data Protection Commission in Ireland or the authority where you live.',
        'Accounts are for people aged 16 or over. Ohrly is usable without an account at any age.',
      ],
    },
    {
      id: 'terms',
      title: 'Terms of use',
      paragraphs: [
        'Ohrly is provided free of charge, as is, without warranties. The course is written and checked with care, partly with the help of AI tools, but it may contain mistakes. It is a learning aid, not a qualification, and its practice results are not certificates.',
        'Please use Ohrly fairly: do not attack, overload or try to break into the service or other people’s accounts.',
        'Nothing in these terms limits liability where that is not allowed by law, including for intent and gross negligence or rights you have as a consumer.',
        'These terms may change as the project develops; the date below shows the latest version.',
      ],
    },
    {
      id: 'credits',
      title: 'Licences and credits',
      paragraphs: [
        'Code: MIT licence, at github.com/prathamesh-git9/ohrly.',
        'English voice: Kokoro (Apache 2.0). German voice: Chatterbox Multilingual by Resemble AI (MIT), voiced from a recording in the Thorsten-Voice dataset by Thorsten Müller (CC0, public domain). All speech is synthetic. Chatterbox adds an inaudible watermark marking its audio as generated.',
        'Fonts: Nunito and Fredoka, under the SIL Open Font License 1.1. Icons: Lucide, under the ISC licence.',
        'Sound effects, the mascot, characters and scenery were made for Ohrly.',
      ],
    },
  ],
  de: [
    {
      id: 'about',
      title: 'Wer Ohrly betreibt',
      paragraphs: [
        `Ohrly ist ein kostenloses, nicht kommerzielles Open-Source-Projekt von ${OPERATOR}, einer Privatperson. Es gibt keine Werbung, keine kostenpflichtigen Funktionen und kein Unternehmen dahinter.`,
        `Kontakt: Eröffne ein Issue unter ${CONTACT_URL}. Wenn es um deine persönlichen Daten geht, schreib das in den Titel; persönliche Angaben musst du dafür nicht öffentlich machen.`,
      ],
    },
    {
      id: 'independence',
      title: 'Unabhängigkeit und Marken',
      paragraphs: [
        'Ohrly ist ein unabhängiges Projekt. Es ist mit keinem anderen Sprachlernprodukt oder Unternehmen verbunden und wird von keinem unterstützt.',
        'Ohrly nennt Prüfungen von Goethe-Institut, telc, Cambridge English und IELTS nur, damit Lernende wissen, zu welchen offiziellen Prüfungen ein Niveau passt. Diese Namen sind Marken ihrer Inhaber. Die Übungsprüfungen von Ohrly sind eigene, inoffizielle Übungen: Sie werden von diesen Organisationen weder ausgestellt noch anerkannt oder bewertet, bescheinigen kein Niveau und sagen kein Ergebnis voraus.',
        'Der Name Ohrly, das Maskottchen Fenn, die Figuren, Grafiken, Klänge, Kurstexte und Übungen wurden für dieses Projekt geschaffen.',
      ],
    },
    {
      id: 'privacy',
      title: 'Datenschutz',
      paragraphs: [
        'Ohne Konto bleiben Fortschritt, Einstellungen und Serie in deinem Browser. Sie werden im lokalen Speicher deines Browsers auf deinem Gerät gespeichert. Ohrly sendet sie nirgendwohin, verwendet keine Cookies und keine Analyse-, Tracking- oder Werbedienste.',
        'Dein Name: Der Name, den du am Anfang eingibst, wird mit dem gewählten Kurs, dem Datum und einer zufälligen Kennung deines Browsers an unsere Datenbank (Supabase, Europäische Union, Paris) gesendet, damit der Ersteller von Ohrly sehen kann, wer lernt. Darauf wirst du bei der Eingabe hingewiesen, und du kannst stattdessen einen Spitznamen verwenden. Niemand sonst kann diese Namen lesen. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO); du kannst sie jederzeit über Profil > Deine Daten > Meinen Namen bei Ohrly entfernen widerrufen. Dabei werden alle Namen gelöscht, die dein Browser gesendet hat.',
        'Mit einem freiwilligen Konto speichert Ohrly deine E-Mail-Adresse, ein sicher gehashtes Passwort, deinen angegebenen Namen und eine Kopie deines Lernfortschritts, damit du auf einem anderen Gerät weitermachen kannst. Die Daten liegen bei unserem Datenbankanbieter Supabase in der Europäischen Union (Paris, Frankreich). Rechtsgrundlage ist die Bereitstellung des gewünschten Dienstes (Art. 6 Abs. 1 lit. b DSGVO). Die Daten bleiben gespeichert, bis du dein Konto löschst; das kannst du jederzeit selbst auf der Kontoseite tun. Dabei werden dein Konto und dein gespeicherter Fortschritt gelöscht.',
        'Hosting: Die Website wird über GitHub Pages ausgeliefert. GitHub verarbeitet dabei technische Daten wie deine IP-Adresse gemäß seiner eigenen Datenschutzerklärung. Ohrly erhält oder speichert diese Protokolle nicht.',
        'Sprechübungen: Wenn du das Mikrofon nutzt, kann dein Browser (zum Beispiel Chrome, Edge oder Safari) die Aufnahme an seinen eigenen Sprachdienst senden, um sie in Text umzuwandeln. Ohrly erhält und speichert deine Aufnahme nicht. Du kannst Sprechübungen in den Einstellungen ausschalten.',
        'Deine Rechte: Du kannst deine Daten einsehen, berichtigen, exportieren (Profil > Deine Daten) und löschen, der Verarbeitung widersprechen und dich bei einer Datenschutzbehörde beschweren, etwa bei der irischen Data Protection Commission oder der Behörde an deinem Wohnort.',
        'Konten sind für Personen ab 16 Jahren. Ohne Konto kann Ohrly in jedem Alter genutzt werden.',
      ],
    },
    {
      id: 'terms',
      title: 'Nutzungsbedingungen',
      paragraphs: [
        'Ohrly wird kostenlos und ohne Gewähr bereitgestellt. Der Kurs wird sorgfältig erstellt und geprüft, teilweise mit Hilfe von KI-Werkzeugen, kann aber Fehler enthalten. Er ist eine Lernhilfe, keine Qualifikation, und seine Übungsergebnisse sind keine Zertifikate.',
        'Bitte nutze Ohrly fair: Greife den Dienst oder Konten anderer nicht an, überlaste ihn nicht und versuche nicht, in ihn einzudringen.',
        'Diese Bedingungen schränken die Haftung nicht ein, wo das gesetzlich unzulässig ist, etwa bei Vorsatz und grober Fahrlässigkeit oder bei deinen Rechten als Verbraucher.',
        'Die Bedingungen können sich mit dem Projekt weiterentwickeln; das Datum unten zeigt die aktuelle Fassung.',
      ],
    },
    {
      id: 'credits',
      title: 'Lizenzen und Danksagungen',
      paragraphs: [
        'Code: MIT-Lizenz, auf github.com/prathamesh-git9/ohrly.',
        'Englische Stimme: Kokoro (Apache 2.0). Deutsche Stimme: Chatterbox Multilingual von Resemble AI (MIT), nach einer Aufnahme aus dem Thorsten-Voice-Datensatz von Thorsten Müller (CC0, gemeinfrei). Alle Sprache ist synthetisch. Chatterbox fügt ein unhörbares Wasserzeichen ein, das die Aufnahmen als erzeugt kennzeichnet.',
        'Schriften: Nunito und Fredoka unter der SIL Open Font License 1.1. Symbole: Lucide unter der ISC-Lizenz.',
        'Soundeffekte, Maskottchen, Figuren und Landschaften wurden für Ohrly erstellt.',
      ],
    },
  ],
};
