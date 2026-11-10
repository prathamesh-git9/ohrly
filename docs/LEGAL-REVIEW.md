# Ohrly legal risk review

10 November 2026. **This is not legal advice.** It was written without a lawyer, to remove every risk
that can be removed in the product itself and to list what still needs a qualified professional. No
document or design can make a project immune from being sued; the aim is that any claim would be weak.

The project: a free, non-commercial, open-source language-learning website by a private individual,
hosted on GitHub Pages, for learners of German and English, so used by people in the EU.

## 1. Being accused of copying another product (Duolingo or others)

The real legal exposure for an app "like Duolingo" is not the idea. Game mechanics, lesson formats,
streaks, hearts and spaced repetition are ideas and methods, which copyright does not protect. The exposure
is in copying **expression** (text, art, sound, code), **trademarks** (names, logos, mascots), and **trade
dress** (the overall look that identifies a product, see USPTO TMEP 1202.02 in docs/RESEARCH.md).

| Risk | Status | What was done |
|---|---|---|
| Name confusion | Reduced | Renamed from "Fennly" after finding a live app with that name. "Ohrly" had no conflict in a web and app-store search. **A professional trademark search (EUIPO, USPTO, UKIPO, DPMA) was not done.** |
| Mascot | Low | Fenn is a fennec fox in sand colours, drawn from scratch. No bird, no owl, no green. |
| Colours and look | Low | Indigo and desert-sand palette, not lime green. Own button shapes, own path layout, own scenery. |
| Product names in the site | None | A full scan found no other product's name anywhere in the shipped site. |
| Feature names | Reduced | "Gems" became **Sparks** and "Streak freeze" became **Rest day**, since those were another product's distinctive names. "Hearts", "XP" and "streak" are generic game terms and were kept. |
| Characters | Low | Mara, Leon, Ada and Juno are original names and drawings; none shares a name with another app's known cast. |
| Course text | Low | Every sentence was written for Ohrly by AI authors told never to reproduce another course, then validated and audited. Short everyday sentences ("I am tired") are not protectable on their own. |
| Sound effects | None | Synthesized in code; no recorded sample from anywhere. The "correct" chime is an original bell built from sine partials. |
| Code | None | Written for this project; MIT licence. |
| Public research notes | Kept on purpose | docs/RESEARCH.md names Duolingo factually and records the rule *not* to copy it. That is evidence of independent creation, which helps rather than hurts. |

**Do not:** use any other app's name or logo in marketing, app-store text, keywords or ads; say "the free
Duolingo" or "Duolingo alternative" anywhere public; copy screenshots of another app; or use its sounds.

## 2. Exams and third-party names

Goethe-Institut, telc, Cambridge English and IELTS are trademarks. Ohrly names them only to say which
official exam a level lines up with, with a clear "unofficial practice" statement on the level header,
the exam result screen and the legal page. No question, text, layout or recording is taken from their
materials. Results say "Practice target met", never "passed" or "certified".

## 3. Audio and assets

| Asset | Licence | Notes |
|---|---|---|
| English voice: Kokoro | Apache 2.0 | Credit on the legal page. |
| German voice: Chatterbox Multilingual (Resemble AI) | MIT | Adds an inaudible watermark; disclosed. |
| German reference recording: Thorsten-Voice dataset | CC0 (public domain) | The voice is a real person's, donated to the public domain for exactly this kind of use. |
| Piper Thorsten (fallback) | Dataset CC0; model fine-tuned from the lessac voice | Used only for a few very short German words and clips Chatterbox could not say clearly. Same speaker. The lessac lineage is a residual licence question for any future commercial use. |
| Fonts: Nunito, Fredoka | SIL Open Font License 1.1 | Credited. Bundled from @fontsource with their licence files. |
| Icons: Lucide | ISC | Credited. |

Rejected on purpose: edge-tts (Microsoft's consumer endpoint, no licence to redistribute audio), Coqui
XTTS (non-commercial licence covering outputs), any voice whose licence was unclear.

## 4. Privacy and data protection (GDPR)

Without an account Ohrly processes no personal data on any server: progress lives in the browser's
local storage, which the user asked for, and no cookies, analytics or trackers are used, so no consent
banner is required. With an optional account:

- **Data:** email, a hashed password (by Supabase Auth), and the learner's progress.
- **Where:** Supabase, EU region (Paris, eu-west-3). Supabase acts as processor; accept its Data Processing
  Addendum in the Supabase dashboard (Organization settings > Legal documents).
- **Access control:** row-level security in supabase/schema.sql lets each user read and write only their
  own row. The public "anon" key in the site is meant to be public; it grants nothing without those rules.
- **Deletion:** self-service, on the Account page, through `delete_my_account()`, removing the account and
  (by cascade) all saved progress. Export is in Profile > Your data.
- **Age:** accounts are for people aged 16+ (the digital age of consent in Germany and Ireland).
- **Visitor names (added 10 Nov 2026, at the operator's request):** the name typed at the start is sent to a
  Supabase table with the course, date and a random browser ID. Visitors are told at the name step and
  can use a nickname; the basis is consent, withdrawable with "Remove my name" in Profile, which deletes
  every row from that browser. The public can only insert, never read; only the owner sees the list.
  **Risk to keep in mind:** consent must stay genuinely optional. Never make a real name a condition of use.
- **Visitor location (added 10 Nov 2026, at the operator's request):** the visitor's browser sends its IP address
  to ipapi.co (United States) and Ohrly stores only city, region and country. Disclosed at the name step and in
  the policy. **Open points for a lawyer:** the transfer of IP addresses to a US service, and whether consent
  given at the name step covers it. A server-side lookup in the EU would remove the transfer.
- **Microphone:** speech recognition is done by the browser vendor; disclosed before use and in the policy.
- **Contact:** GitHub issues, as the operator chose. GDPR expects an easy way to exercise rights; the
  self-service deletion and export cover the main ones. **A dedicated contact email would be stronger.**

## 5. Operator obligations

- **Impressum (Germany, DDG section 5):** required for "geschäftsmäßige" services. A free, non-commercial,
  private project is generally argued to be outside it, but German courts read "business-like" broadly.
  The legal page names the operator and a contact route. **Get advice if Ohrly ever earns money, shows ads,
  or is promoted heavily in Germany**, and add a full Impressum then.
- **Stamp 1G:** Ohrly is unpaid and non-commercial. Turning it into a business would raise immigration
  permission questions; check before charging money, taking sponsorship, or registering a company.
- **Terms of use:** included; they disclaim warranties only to the extent the law allows, which matters
  because EU consumer law voids blanket exclusions.

## 6. What a lawyer should still check

1. A trademark clearance search for "Ohrly" in the EU, UK, US and Germany, and whether to register it.
2. Whether the Impressum obligation applies in the current non-commercial setup.
3. The privacy policy and terms against current German and Irish practice, once Supabase accounts are live.
4. If the project ever goes commercial: the voice licences again (all are commercial-friendly today), and
   immigration status.

## 7. Rules to keep the risk low from now on

- Never use another product's name, mascot, colours, sounds or screenshots in the site or promotion.
- Keep every course sentence, exercise and asset original, and keep the audits that check it.
- Keep the legal page true: if data handling changes (analytics, new providers, payments), update it first.
- Keep the "unofficial practice" wording wherever exam names appear.
