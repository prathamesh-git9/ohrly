# Research job for Fennly

Fennly is an ORIGINAL website for learning languages, built on the same general concept as
apps like Duolingo: a chapter path, short lessons, audio, tactile buttons, hearts, XP, streaks.
Launch courses: English speakers learning German, and German speakers learning English.
More language pairs come later. Stack: Vite + React + TypeScript, static hosting, no backend.
Own brand: fennec fox mascot "Fenn". We must NOT copy any Duolingo name, character, art, sound,
colour-for-colour palette or course text. Mechanics and teaching concepts are fine to learn from.

Use web search. Prefer primary sources (official docs, licence files, model cards, CEFR
documents, Goethe-Institut word lists, peer-reviewed papers, Duolingo's own blog) over SEO blogs.

Write exactly one file: docs/RESEARCH.md. Do not create or edit anything else. Do not commit.
Maximum about 500 lines. Every non-obvious claim gets a URL. Mark anything unverified as
UNVERIFIED rather than guessing. Be concrete and give recommendations, not surveys.

Answer these sections:

## 1. Lesson mechanics
Exercise types used by the leading apps (word bank translate, typed translate, tap what you hear,
match pairs, picture choice, fill the blank, speak). Which order works in a lesson, how many
exercises per lesson, how new words are introduced, how mistakes are re-queued within a lesson,
typo tolerance, how alternative correct answers are handled. Give a recommended lesson recipe.

## 2. Course sequencing for German (A1) for English speakers
A chapter-by-chapter order for about 6 sections/chapters and about 30 units covering CEFR A1,
based on the Goethe-Institut A1 word list and A1 can-do statements. When to introduce der/die/das,
sein/haben, verb conjugation, accusative, separable verbs, modal verbs, word order.
Common English-speaker pitfalls. Give each unit: title, can-do, grammar point, 8-12 target words.

## 3. Course sequencing for English (A1) for German speakers
The same, using CEFR A1 English sources. Include German-speaker pitfalls: false friends
(become/bekommen), th-sounds, do-support, present continuous vs simple, word order.

## 4. Audio
We want pre-generated natural speech audio for every sentence, shipped as static files, with a
fallback to the browser's speechSynthesis. Compare, with licence evidence:
Piper voices for de_DE and en_US/en_GB (read the actual model cards: thorsten, kerstin, ramona,
amy, ryan, lessac, etc.), edge-tts (and Microsoft terms), Kokoro, Coqui, and Google/Azure free tiers.
Which voices may be used in a public website, possibly commercial later? Recommend one concrete
choice per language with install commands that work on Windows without a GPU, and file format and
bitrate. Also speech recognition: browser SpeechRecognition support today (Chrome, Edge, Safari,
Firefox), privacy notes, and how to degrade gracefully. Also autoplay restrictions on mobile browsers.

## 5. Motion and feedback design
What makes these apps feel tactile: how the chunky pressed button is built in CSS (values for the
bottom edge, translate on press, timing), spring tuning, correct/incorrect bottom sheet behaviour,
progress bar, path node animation, lesson-complete celebration, sound effect design using the Web
Audio API (no copied sound files), haptics via navigator.vibrate and where it works. Must respect
prefers-reduced-motion. Give numeric values to start from.

## 6. Retention mechanics, ethically
Hearts, streaks, streak freeze, XP, daily goals, spaced repetition (compare HLR, FSRS, SM-2,
Leitner for a client-only app; recommend one and give the formula). Which dark patterns to avoid.

## 7. Intellectual property boundaries
What is safe and unsafe when building a product inspired by Duolingo: trade dress, trademarks
including the green owl and any registered terms, and specific things we must avoid in naming,
colour and mascot. Is the name "Fennly" clear in a quick search of app stores and trademarks?
Note: this is not legal advice; flag the risks.

## 8. Recommendations
A short list of the 15 decisions you would make for this build.
