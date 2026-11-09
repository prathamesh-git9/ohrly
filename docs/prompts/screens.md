# Finish two screens and the audio generator for Ohrly

Ohrly is a free, original language-learning website (Vite, React 19, TypeScript, motion, zustand).
Do not commit. Do not install npm packages. Other jobs are writing content-src/ and src/content/ at
the same time: do not touch them. Only create or edit the files named below.

Read first: src/App.tsx (how the screens are mounted, the props they receive), src/screens/Practice.tsx
(the style to match), src/components/ui.tsx, src/state/store.ts, src/domain/srs.ts, src/domain/gamify.ts,
src/domain/course.ts, src/i18n.ts, src/audio/speech.ts, src/styles/app.css.

## 1. src/screens/WordList.tsx
`export function WordList({ course, t }: { course: Course; t: Translate })`.
A list of the words the learner has met: every word with a card in useProgress(course.id).cards,
grouped by unit in course order, unit titles as headings. Each row: SpeakerButton (size sm) for
word.target with lang course.to, the target word, the source word, and 4 strength bars from
srs.strength(). Text search box at the top matching target or source. A header count of words met.
Empty state exactly like Practice.tsx's, using Fenn. Must stay fast with 350 words.

## 2. src/screens/Profile.tsx
`export function Profile({ course, t }: { course: Course; t: Translate })`. Sections, top to bottom:
- Stats grid: current streak (displayedStreak), best streak, total XP, words met, lessons done, gems.
- Weekly chart: small hand-written bars of XP for the last 7 days from xpByDay. Labels by weekday via
  toLocaleDateString(course.from, { weekday: 'short' }). No chart library.
- Achievements: compute from the store; at least 6, such as first lesson, 7-day streak, 100 words met,
  1000 XP, 10 perfect lessons, first chapter test passed. Locked ones are shown greyed out.
- Courses: list from COURSES in src/content/index.ts with a Flag, and switchCourse to change. Progress
  is kept per course.
- Daily goal: 10/20/30/50 XP buttons using setDailyGoal.
- Rewards shop, spending gems earned in lessons. Real money never exists in this app and the copy must
  say nothing about paying: streak freeze (buyFreeze, STREAK_FREEZE_COST, show owned count of
  MAX_FREEZES), refill hearts (refillHearts, HEART_REFILL_COST).
- Settings: toggle switches for sound effects, voices, speaking exercises, listening exercises
  (updateSettings).
- Your data: export progress as a JSON download and import from a file. The persisted localStorage key
  is 'ohrly-v1'. Import must validate that it parses and has the `state` object with `courses`, then
  write it and reload; show an error otherwise. Reset progress with a Modal confirmation calling resetAll
  and then navigate('/').
- About: "Ohrly is free" line; link to https://github.com/prathamesh-git9/ohrly ; audio credits listing
  the voices exactly as in public/audio/CREDITS.md (see part 3).

## Shared rules for the UI
Every visible string goes through t(). Add the keys you need to BOTH the `en` and `de` tables in
src/i18n.ts (natural German with "du"); only append keys, do not change existing ones. Put new CSS in
a new file src/styles/screens.css using only the CSS variables from app.css, and import it in main.tsx
after app.css. Reuse .page-title, .card-option, .btn via Btn, .empty-state. Must work in light and dark,
at 360px wide with no horizontal scrolling. Controls need accessible names, and toggles need
role="switch" with aria-checked.

## 3. scripts/gen_audio.py and public/audio/CREDITS.md
A Python 3.12 script, standard library only (it shells out to piper and ffmpeg), which:
- Reads src/content/courses/*.json. For each course, collects every unique string to be spoken in the
  course's `to` language: word.target, word plural, sentence.target, tip example targets, every tile
  token from sentence.target (see tokenize in src/domain/check.ts: split on whitespace and strip outer
  punctuation), and each cloze answer. Also the lowercased first token, since the app lowercases tiles.
- Key is the same as audioKey() in src/audio/speech.ts: NFC, trimmed, whitespace collapsed.
- File name: first 16 hex characters of sha1 of the UTF-8 key, plus .mp3. Output
  public/audio/<lang>/<name>.mp3 and public/audio/<lang>/manifest.json mapping key to file name, with
  non-ASCII written literally (ensure_ascii False, encoding utf-8).
- Voices via arguments, defaults: de = de_DE-mls-medium with --speaker argument, en = en_GB-cori-high.
  Voice model paths come from --voices-dir. Run piper through --piper-python (the Python of a venv with
  piper-tts): `<python> -m piper -m <model.onnx> -f <wav> [--speaker N]`, text on stdin in UTF-8. To be
  fast, keep model loading low: use one long-lived piper process per language if piper's CLI supports
  it (read `python -m piper --help` output if available), otherwise batch.
- Converts with ffmpeg to mono MP3 at 48 kbps, 22050 Hz, trimming long edge silence and normalising
  loudness to about -18 LUFS (loudnorm) with no clipping.
- Incremental: skips text whose output exists. Deletes files no longer referenced. Prints counts and
  total size. Supports --limit N and --lang for trial runs.
Do not run it against real voices; test logic with --dry-run, which prints what it would do.
Also write public/audio/CREDITS.md, stating: German voice Piper de_DE-mls-medium, dataset license CC BY
4.0, trained from scratch; model card
https://huggingface.co/rhasspy/piper-voices/blob/main/de/de_DE/mls/medium/MODEL_CARD . English voice
Piper en_GB-cori-high, dataset public domain (LibriVox), trained from scratch; model card
https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_GB/cori/high/MODEL_CARD . Piper is used only
as an offline build tool and is not distributed with the site.

## Verify
Run `npx tsc --noEmit` and fix only errors in your files. Report what you checked and what you could not.
