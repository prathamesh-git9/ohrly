# Independent audit of one Ohrly course chapter

You did not write this content. You are a strict native-speaking editor and language teacher fluent
in English and German. Assume there are mistakes and find them. Read src/domain/types.ts first.

Audit the chapter file named at the end, sentence by sentence, and word by word:
1. Grammar and spelling of every target and source string, including umlauts, sharp s, noun capitals,
   articles, plurals, cases, verb forms and word order.
2. The translation is truly equivalent and natural. Replace stilted, telegraphic or odd lines
   (such as "Age, please." or "Country: Germany.") with something a real person would say, unless the
   unit is explicitly about filling in forms.
3. Clozes: try EVERY distractor in the blank. If any distractor also gives a correct sentence given the
   source shown (for example "Sprechen Sie bitte langsamer" when the answer is "langsam"), replace that
   distractor. The answer must be the only correct option.
4. targetAccept and sourceAccept: add missing natural translations, and remove wrong ones. The checker
   accepts only what is listed, and a correct learner marked wrong is a serious bug. Think hard about
   du/ihr/Sie, sie/she/they, present simple versus continuous, and word-order alternatives.
5. Word entries: correct article, plural, forms and part of speech. Emoji really depicts the word.
6. Tips are accurate. A wrong grammar explanation is the worst possible error.

Fix what you find, directly in that one chapter file, keeping ids stable. Keep `words` truthful if you
change a sentence. Touch no other file except the merged course JSON through the command below. Do not
commit. No generator scripts: edit the JSON directly.

Then run `npm run course -- <id>` and `npm run validate -- <id>` and fix any errors you caused.
Reply with: number of fixes by category, the 5 most serious errors found, and anything you are unsure of.
