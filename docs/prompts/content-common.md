# Writing an Ohrly course

Ohrly is an original free language-learning website. Read these before you start:
- src/domain/types.ts: the exact JSON contract (Word, Sentence, Cloze, Tip, Unit, Section, Course).
- src/domain/validate.ts: the rules your output must pass. Read it closely.
- src/domain/generator.ts: how lessons are built from your data.
- src/domain/check.ts: how answers are checked. Note contractions are already handled for English.
- docs/RESEARCH.md: follow the chapter and unit sequence for your course exactly.

## How to write it
Write one file per chapter in your course folder, named chapter-01.json to chapter-06.json. Each
chapter file is one Section object. Also write meta.json holding id, from, to, title, version (1)
and names. After each chapter run `npm run course -- <id>` and then `npm run validate -- <id>`, and
fix every ERROR before moving on. Finish with zero errors and as few warnings as you can.
A validator error about a word not yet taught means you must teach it earlier or change the sentence.
Do not weaken or edit the validator or any other file outside your folder and the merged JSON.
Do not commit. Do not install anything. All sentences must be YOUR OWN writing. Never reproduce
sentences from Duolingo or any other course.

## Size
6 chapters, 30 units (5 per chapter), 8-12 words per unit (use the unit targets in the research).
16-20 sentences per unit, at least 5 with a cloze. Sentences are 2-10 words, natural, things a person
would really say. Vary them: statements, questions, answers, short everyday situations.
Unit and sentence ids must be unique across the course, for example "u07" and "u07-s03".
Word ids must be unique across the course and stable, for example "w-hund". Do not teach the same
word twice: a later unit reuses it through sentences. If a research target was already taught, choose
another useful A1 word for that unit.

## Rules that decide whether the course is good
1. ACCURACY FIRST. Every sentence must be correct, natural, and truly equivalent in both languages.
2. Every sentence's `words` lists EVERY taught word id it uses. Lessons use it to decide when the
   sentence may appear, so a missing id can expose an untaught word.
3. Order words inside a unit so the first half can make at least 3 sentences on its own (together with
   words from earlier units). The first lesson of a unit teaches only the first half.
4. `forms` holds the inflected forms a word entry teaches, so sentences may use them. Keep them
   grammatically honest. Teach a form in the unit that explains it.
5. Exhaustive alternatives. The checker accepts ONLY what you list. For each sentence list every
   natural translation in targetAccept and sourceAccept: both word orders where both are fine, and every
   valid reading of an ambiguous word (you = du/ihr/Sie; sie = she/they; present simple or continuous
   in German-to-English; flat/apartment; "Hi"/"Hello"). Do this for words as well.
   Answers are compared without case or punctuation, so never list a variant differing only in those.
6. Cloze: `answer` is exactly one token occurring once in `target`. Distractors (2-3) must be real
   words which are clearly WRONG in that sentence, and should test the unit's grammar point
   (den/dem/der, am/is/are, do/does). Check that no distractor would also make a correct sentence.
7. `emoji` only when one emoji really depicts the word: a dog, an apple. No emoji for abstract words,
   and do not use the same emoji for two words in a unit.
8. Tips are short and friendly, written in the source language, 2-4 short paragraphs and 2-4 examples,
   explaining the unit's grammar point by contrast with the learner's own language. No tables.
9. Keep content suitable for all ages. No politics, religion, alcohol-focused content or stereotypes.
   Use a diverse mix of names and list all names in meta.json `names`.
10. Tile answers must make sense. Avoid sentences over 10 words. Avoid hyphenated tokens.
11. `canDo`, unit titles and chapter descriptions are learner-facing, in the source language.

When finished, reply with: final validator output, and anything you were unsure of. Be honest about
sentences you are not confident are natural; do not claim things you did not check.
