# Write ONE chapter of an Ohrly course, by hand, at A2, B1 or B2

You are a professional language-course author. Quality is the whole job.

Read: docs/prompts/content-common.md (all its rules apply except its "Size" total and the instruction to
write all chapters), src/domain/types.ts, src/domain/validate.ts, the course brief named at the end, and
the taught-words file named at the end, which lists every word the course has already taught. Do not
reteach those words; reuse them freely, and use their inflected forms only if they are listed.
Follow your unit plan in docs/RESEARCH-LEVELS.md: section 3 for German, section 4 for English. Find the
level and chapter named at the end. Use its unit titles, can-do statements, grammar and targets, in your
own words. If a target was already taught, choose another useful word of that level. Translate titles and
can-do statements into the learner's language.

Write exactly one file: the chapter file named below. You may add names to meta.json `names`. Do not touch
any other file, except the merged course JSON through the command below. Do not commit. Finish this chapter
fully before you stop. Do nothing beyond this chapter.

## Hard rules
- HAND-WRITE everything directly as JSON. No script, generator, template, helper or loop.
- Section: `cefr` is the level ("A2", "B1" or "B2"). 5 units, 8-12 words, 16-20 sentences each.
- Sentences suit the level: longer, more varied and more natural as levels rise, using this unit's grammar.
  Up to 12 tokens at A2, 16 at B1, 20 at B2. Each distinct and useful. Never swap only a name or noun.
- Every inflected form a sentence uses must be taught: list it in that word's `forms`.
- At least 5 clozes per unit test this unit's grammar point. Distractors are near-misses, each clearly wrong
  in this sentence given the source shown. Try every distractor in the blank; if one also works, replace it.
- Every word is used by at least 2 sentences of its unit. `words` is exactly truthful.
- Exhaustive natural `targetAccept` and `sourceAccept`.
- Tips explain the grammar accurately by contrast with the learner's language. A wrong rule is the worst error.
- Each unit has `passages`: one "reading" and one "listening", each original, on the unit's topic, using its
  grammar, written as real texts of the kinds in docs/RESEARCH-LEVELS.md section 5 (emails, notices, articles,
  announcements, conversations). Mostly known vocabulary, but natural.
  Word counts: reading A2 60-130, B1 120-250, B2 200-400. Listening A2 50-110, B1 100-220, B2 160-320.
  Listening texts are read by one voice, so write them as one speaker talking: a message, announcement or talk.
  4 questions per passage at A2, 5 at B1, 6 at B2. Questions and options: in the learner's language at A2, and
  in the target language at B1 and B2. 3 or 4 options of similar length. One defensible answer found in the text,
  with no outside knowledge needed. Mix gist, detail and, from B1, inference and writer's opinion.
  `answer` is the exact text of the right option.

## Finish
Run `npm run course -- <id>` then `npm run validate -- <id>`, and fix every error and warning in your chapter.
Then re-read it as a strict native-speaking editor and fix anything unnatural, wrong or boring. Reply briefly
with the validator line and any doubts.
