# Write ONE original Ohrly practice exam

Read src/domain/types.ts (LevelExam, Passage, LanguageItem, SelfCheckTask), src/domain/validate.ts (the
BY_LEVEL and EXAM_ITEMS limits), docs/RESEARCH-LEVELS.md sections 1, 5 and 6, the course brief, and the
taught-words file named at the end. Write exactly one JSON file, by hand, as named at the end. No scripts.
Do not commit. Do not touch other files, except the merged course JSON through the command below.

This is practice modelled on the SKILL AREAS of real exams. Everything must be your own original writing.
NEVER copy or closely paraphrase any question, text, layout or recording from Goethe-Institut, telc,
Cambridge or any publisher's material, and never name those exams in the content.

Shape: `{ level, reading: Passage[], listening: Passage[], language: LanguageItem[], production: SelfCheckTask[] }`.
Item counts must be exact per EXAM_ITEMS: the question total across reading passages, across listening
passages, and the language items.
- Use the text types for this level from research section 5: several short texts and notices at lower levels,
  longer articles and opinions at higher ones. Passage word counts per BY_LEVEL.
- Only vocabulary and grammar the level has taught, plus words easily understood from context.
- Listening texts are read by one voice, so write them as one speaker: messages, announcements, short talks.
  They are heard, so write them to be heard, with a question repeated in mind for what a listener can catch.
- Questions and options are in the learner's language at A1 and A2, and in the target language at B1 and B2.
  Unit-free: 3 or 4 options, similar in length, one defensible answer found in the text with no outside
  knowledge. Vary gist, detail and, from B1, inference and opinion. `answer` is the exact text of an option.
- Language items test this level's key grammar, each with one ___ gap and one correct option, trying each
  distractor to be sure it is wrong. Cover a spread of the level's grammar points.
- production: at least one "writing" and one "speaking" task, sized as in research section 6. Prompts in the
  learner's language; `model` in the target language, at this level, within the requested length; `checklist`
  3-6 points in the learner's language covering task completion, organisation, range and accuracy.
- Ids unique across the course, prefixed with the level and course, such as "A2-r1" and "A2-lang04" .

Run `npm run course -- <id>` and `npm run validate -- <id>` and fix all errors in your exam. Then answer the
whole exam yourself from the text alone and check every key. Reply briefly with the validator line and doubts.
