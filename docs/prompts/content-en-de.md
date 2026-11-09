Follow docs/prompts/content-common.md, which you must read first.

Course: English speakers learning German. id "en-de", from "en", to "de", title "German".
Your folder: content-src/en-de/. You may write only there and to src/content/courses/en-de.json.
Follow docs/RESEARCH.md section 2 exactly for the sequence.

Course-specific rules:
- target is German, standard Germany German. source is English; accept both British and American
  spelling in sourceAccept when they differ.
- Every German noun word entry is taught with its article (target "der Hund"), `plural` ("die Hunde")
  and `source` with its English article ("the dog"), sourceAccept ["dog", "a dog"].
- When English is the prompt for a noun the bare German noun is NOT accepted. Require the article.
- `forms` on verbs: list the conjugated forms the unit teaches (for sein: bin, bist, ist, sind, seid).
  Accusative and other article forms must be introduced on a word entry before sentences use them.
- Teach German word order honestly; list both V2 orders in targetAccept where both are natural.
- For prompts with English "you", accept du, ihr and Sie versions wherever grammatical, unless the
  sentence's context settles it. Write "ss" and the sharp s correctly per modern spelling, and use real
  umlauts, in UTF-8.
