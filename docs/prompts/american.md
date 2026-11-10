# Convert one chapter of the English course to American English

The course for German speakers learning English (course id de-en) now uses an American voice, so its
English must be American. Edit only the chapter file named at the end, directly as JSON. No scripts.
Do not commit. Do not touch other files except the merged course JSON via the command below.

For every English string in that file (word `target`, `plural`, `forms`, `targetAccept`, sentence `target`
and `targetAccept`, cloze `answer` and `distractors`, tip `examples[].target`, passage texts and English
questions and options, exam texts):
1. Make the primary text American: spelling (color, center, traveled, apartment), vocabulary (apartment
   not flat, pants not trousers, cell phone or phone not mobile, check not bill in a restaurant, vacation
   where natural, subway, fall/autumn both fine) and usage ("Have you got" becomes "Do you have", "at the
   weekend" becomes "on the weekend").
2. Keep the British form as an accepted alternative in targetAccept wherever a learner might write it, so
   a British answer is never marked wrong. Never list two variants differing only in case or punctuation.
3. Keep ids, `words` lists and meaning unchanged. If a sentence changes words, keep `words` truthful and
   keep every token taught: when you change a word entry's target (flat to apartment), update that word's
   entry, its forms and every sentence using it, consistently across the chapter.
4. Tips written in German that mention British usage should now teach the American form, mentioning the
   British one only where helpful.
5. Leave German text unchanged.

Run `npm run course -- de-en` and `npm run validate -- de-en`, fix every error, and reply with the
validator line and a short list of the main vocabulary changes.
