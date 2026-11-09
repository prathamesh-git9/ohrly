Follow docs/prompts/content-common.md, which you must read first.

Course: German speakers learning English. id "de-en", from "de", to "en", title "Englisch".
Your folder: content-src/de-en/. You may write only there and to src/content/courses/de-en.json.
Follow docs/RESEARCH.md section 3 exactly for the sequence.

Course-specific rules:
- target is British English (flat, trousers, colour), matching the audio voice. Accept American
  variants in targetAccept. source is German; every learner-facing string (titles, canDo, tips,
  descriptions) is in natural, friendly German using "du".
- English nouns: target is taught without an article unless it is a fixed phrase, `source` has the
  German article ("der Hund"), sourceAccept includes bare "Hund" and "ein Hund". targetAccept includes
  "the dog" and "a dog".
- `forms` on verbs: list the forms taught, such as goes, going, went. Do the same for plurals of nouns,
  either in forms or plural.
- Target the known pitfalls explicitly with tips and clozes: do-support, third person -s, present simple
  vs continuous, word order after adverbs, become vs bekommen, th-sounds, a vs an.
- German prompts: in sourceAccept list du, ihr and Sie variants wherever an English "you" allows it.
  Use correct German spelling with umlauts and the sharp s, in UTF-8.
