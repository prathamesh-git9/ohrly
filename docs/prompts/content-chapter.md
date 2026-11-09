# Write ONE chapter of an Ohrly course, by hand

You are a professional language-course author. Quality is the whole job.

Read: docs/prompts/content-common.md (all rules apply except its "Size" total and the instruction to
write all chapters), src/domain/types.ts, src/domain/validate.ts, and the course brief named at the
end of this prompt. Read every earlier chapter file in your course folder, so you know exactly which
words are taught. Do not reteach them; reuse them freely in sentences.

Write exactly one file: the chapter file named below. Also write meta.json if it does not exist; if
you need more names, add them to the existing meta.json `names`. Do not touch any other file, except
the merged course JSON through the command below. Do not commit. Finish this chapter fully before you
stop: never end your turn with an incomplete chapter. Do nothing beyond this chapter.

## Hard rules
- HAND-WRITE every sentence directly as JSON in the chapter file. Do NOT write any script, generator,
  template, helper function, .mjs or .py file to produce content. No loops over names or nouns.
- 5 units. Each unit: 8-12 words and 16-20 sentences. Follow the unit plan from docs/RESEARCH.md.
- Every sentence is a distinct, useful thing a real person would say, and practises this unit's words
  or grammar. Never produce a sentence that only swaps a name or noun of another sentence. Include
  short exchanges and questions with real answers. Make it feel like people in situations.
- Use the course `names` sparingly; most sentences should have no name at all.
- At least 5 clozes per unit. A cloze tests the UNIT'S GRAMMAR POINT or a meaningful word. The answer
  is never a name. Distractors are near-misses: other forms of the same word or a similar function
  word (bin/bist/ist, den/der/das, does/do/is, in/on/at), each clearly wrong in this sentence.
  Vary them. Check each cloze: would any distractor also give a correct sentence? If so, change it.
- Every word in the unit is used by at least 2 sentences of the unit, listed in `words`.
- `words` is exactly truthful: every taught word in the sentence, and no word not in the sentence.
- Exhaustive `targetAccept` and `sourceAccept`: all natural translations, no unnatural ones. Do not list
  odd variants just because they are grammatical ("Anna bin ich" is not a useful answer to "I am Anna").
- Tips really explain the grammar and contrast it with the learner's language, with a helpful example.

## Finish
Run `npm run course -- <id>` then `npm run validate -- <id>`, and fix every error and warning belonging
to your chapter. Then re-read your chapter as a strict native-speaking editor and fix anything unnatural,
wrong or boring. Reply briefly with the validator line and any doubts.
