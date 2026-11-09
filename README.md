# Ohrly

Learn German or English in short, playful lessons with Fenn the fennec fox. Free, with no ads, no
account and no paid tier. Your progress stays in your own browser.

## What's in it

- **Two courses at launch:** English speakers learning German, and German speakers learning English.
  The interface speaks the language you already know.
- **A chapter path:** 6 chapters of 5 units each, 5 lessons per unit, and a test at the end of each chapter.
- **Exercise types:** new-word cards, picture choice, meaning choice, listening choice, match the pairs,
  word-bank translation, tap what you hear, typed translation, type what you hear, fill the blank and
  speaking (where the browser supports speech recognition).
- **Audio:** every word and sentence is pre-generated speech with normal and slow playback, falling
  back to the browser's voices if a clip is missing.
- **Game loop:** hearts, XP, streaks with freezes, gems, daily goals and achievements. Running out of
  hearts never costs money: practising earns one back.
- **Spaced repetition:** SM-2 schedules your reviews, with practice modes for due and weak words.

## Develop

```sh
npm install
npm run dev        # local site
npm test           # unit tests
npm run validate   # checks every course against the teaching rules
npm run e2e        # browser tests, desktop and mobile
npm run build      # production build in dist/
```

Pushing to `main` builds and deploys to GitHub Pages through `.github/workflows/pages.yml`.

## How it's built

- `src/domain/`: pure logic with no React: answer checking, lesson generation, spaced repetition,
  hearts and streak rules, and the course validator.
- `content-src/<course>/`: the authored course, one JSON file per chapter. `npm run course -- <id>` merges
  them into `src/content/courses/`.
- Lessons are generated from each unit's words and sentences, so a retry is never the same twice.
- `scripts/gen_audio.py` renders speech with [Piper](https://github.com/OHF-Voice/piper1-gpl), and
  `scripts/audit_audio.py` transcribes it back to catch garbled clips.

## Add a language pair

1. Write `content-src/<from>-<to>/meta.json` and its chapter files, following `src/domain/types.ts`.
2. Run `npm run course -- <id>` and `npm run validate -- <id>`.
3. Add one line to `COURSES` in `src/content/index.ts`, and a UI translation in `src/i18n.ts` if the
   source language is new.
4. Generate its audio with `scripts/gen_audio.py`.

## Credits and licences

Code: MIT. Voice credits are in [`public/audio/CREDITS.md`](public/audio/CREDITS.md). Fenn, the course
text and all sound effects are original to this project. Ohrly is an independent project and is not
affiliated with any other language-learning product.

Spotted a wrong answer or a bad sentence? Use the report link in a lesson, or open an issue.
