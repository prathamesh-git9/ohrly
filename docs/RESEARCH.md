# Fennly product and curriculum research

Research date: 9 November 2026. This is a build recommendation, not a description of a single competitor. “Recommended” values are proposed starting points to test. `UNVERIFIED` means the available primary evidence did not justify a stronger conclusion.

## 1. Lesson mechanics

### What to borrow at the level of learning mechanics

Leading products converge on a small set of task families, while varying the surface design. Duolingo publicly documents vocabulary matching, mistake practice, speaking and listening practice; its course tooling supports very large sets of acceptable translations ([Duolingo Practice](https://blog.duolingo.com/ways-to-practice-in-duolingo/), [answer handling](https://blog.duolingo.com/how-user-reports-improve-course-content/)). Memrise exposes word/phrase audio and video, tapping/jumbled-word tests, typing tests, pronunciation, review and conversation activities ([Memrise help](https://explore.memrise.com/help)). Babbel documents speech-recognition exercises, though not in every lesson ([Babbel help](https://support.babbel.com/hc/en-gb/articles/19211305815570-Speech-recognition)). These support the following original Fennly task set:

| Task | Learning job | Fennly implementation |
|---|---|---|
| Picture choice | Establish concrete meaning without translation | 3–4 original illustrations; never use competitor art or layouts. |
| Match pairs | Fast form–meaning recognition | 5 pairs; remove both on a match; no timer in core lessons. |
| Word-bank translation | Scaffold syntax and first retrieval | Include 2 plausible distractors; allow keyboard and drag/tap. |
| Fill the blank | Focus one lexical/grammar contrast | One clear gap; avoid multiple equally natural answers. |
| Tap what you hear | Segment speech into known forms | Normal and 0.8× replay; tiles only from learned vocabulary. |
| Typed translation | Cued productive recall | Use only after recognition/scaffolded work. |
| Speak | Pronunciation rehearsal, not a hard gate | Always skippable; compare key words/phonemes, not accent identity. |

Retrieval, spacing and interleaving have positive average effects, but tasks must still make the learner perform the relevant retrieval; feedback also matters ([2026 classroom meta-analysis](https://link.springer.com/article/10.1007/s10648-026-10225-5), [L2 spacing meta-analysis](https://onlinelibrary.wiley.com/doi/10.1111/lang.12479)). Spoken retrieval with feedback can outperform mere imitation for foreign vocabulary ([Kang et al.](https://pubmed.ncbi.nlm.nih.gov/23681928/)).

### Recommended lesson recipe

Use **12 scheduled exercises, normally 4–6 minutes**, with at most 3 remedial repeats (15 total). Duolingo says its average lesson takes about five minutes, but the exact exercise count of current competitor lessons is `UNVERIFIED` and changes by platform/experiment ([Duolingo](https://blog.duolingo.com/tips-for-maintaining-streak/)).

1. Retrieval warm-up: 2 due items from earlier units (one listening, one production).
2. Introduce 2–3 new lexical items: original picture/context + spelling + natural audio; present German nouns with article and plural, never as bare nouns.
3. Recognition: 1 picture choice and 1 match/fill task.
4. Comprehension: 2 listening tasks, first with text support and then without.
5. Guided production: 2 word-bank/fill tasks.
6. Productive recall: 2 typed tasks; speaking may replace one, never add a mandatory gate.
7. Interleaved transfer: 1 item mixing today’s pattern with an older contrast.
8. Exit check: 1 unseen but tightly controlled sentence; show the can-do achieved.

Introduce no more than **5–7 new lexical items per lesson** and recycle each in at least three modes (see/hear, recognize, produce). A 10-word unit can therefore use two lessons plus review. New forms first appear in a meaningful micro-context, then a contrast (for example *der Hund / die Katze*), then retrieval; do not lead with an abstract grammar table.

### Errors, typos and answer sets

- On a wrong answer, give immediate, specific feedback (“Use **den** for this masculine direct object”), then put a variant of that item **2–4 positions later**, never immediately. If missed again, reduce difficulty one step (typed → word bank → contrast) and retry near the end. Retrieval with corrective feedback is preferable to silent repetition ([digital flashcard study](https://pmc.ncbi.nlm.nih.gov/articles/PMC12649105/)).
- Do not remove a heart for a learning error. Record it for later review. A failed re-queued item can still complete the lesson after showing the answer and asking the learner to reconstruct it.
- Normalize Unicode (NFC), trim/collapse spaces, normalize straight/curly apostrophes and ignore terminal punctuation/case where case is not the target. Do **not** erase German umlauts/ß, English apostrophes, negation, articles, person endings or word order when those are being tested.
- Accept an answer if it matches a curated alternative exactly after normalization. Otherwise, for answers ≥5 letters, allow one edit only when it does not create another known word or touch a target morpheme; label “Correct—with a typo.” For very short answers, names, minimal pairs and target inflections, require exact spelling.
- Store answers as authored semantic variants, not one reference string plus fuzzy matching: contractions, natural synonyms, permitted pronoun/reference choices and allowed word orders. Duolingo reports thousands of valid variants for some sentences, demonstrating why a single-string checker fails ([Duolingo](https://blog.duolingo.com/how-user-reports-improve-course-content/)).
- For a valid but unlisted response, show “Not in our answer set—report it,” preserve the attempt locally, and do not claim it is linguistically wrong. With no backend, export reports as a JSON/download or open a prefilled feedback form.

## 2. Course sequencing for German (A1) for English speakers

The curriculum is an original synthesis of CEFR A1 action-oriented descriptors and the Goethe A1 inventory. CEFR A1 covers basic familiar expressions, simple personal information and simple interaction when the other person helps ([Council of Europe levels](https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions)); Goethe’s adult A1 list contains about 650 entries and expects roughly half as active vocabulary across personal, public, educational and professional domains ([Goethe A1 list](https://www.goethe.de/pro/relaunch/prf/th/A1_SD1_Wortliste_02.pdf)). The lists are inputs, not course text to copy.

**Sequence rationale.** Teach nouns with **der/die/das from their first appearance**; introduce *sein* in Unit 1, *haben* in Unit 4, present-tense verb conjugation explicitly in Unit 9, main-clause V2 order in Unit 11, accusative in Unit 12, separable verbs in Unit 17, *können* in Unit 19 and *wollen/müssen* in Unit 20. Recycle all of them through Chapter 6. English L1 learners have persistent difficulty with grammatical gender and case; storing the article with the noun is therefore a design requirement ([gender study](https://pmc.ncbi.nlm.nih.gov/articles/PMC4554762/)).

### Chapter 1 — Meet and identify

1. **Hello!** Can-do: greet, say goodbye and say who I am. Grammar: *ich/du/Sie* + *sein*. Targets: hallo; guten Morgen; guten Tag; tschüss; auf Wiedersehen; ich; du; Sie; sein; heißen.
2. **Where are you from?** Can-do: ask and answer name/origin. Grammar: W-questions; *kommen/wohnen*. Targets: wo; woher; wie; aus; kommen; wohnen; Deutschland; England; der Name; die Stadt.
3. **Spell it, please** Can-do: spell a name and ask for repetition. Grammar: *Wie bitte?*; formal imperative chunks. Targets: der Buchstabe; buchstabieren; wiederholen; bitte; langsam; verstehen; sprechen; Deutsch; Englisch; noch einmal.
4. **Numbers and age** Can-do: give age, phone number and simple quantities. Grammar: *haben*; *wie alt/wie viel*. Targets: null; eins; zwei; zehn; zwanzig; hundert; alt; die Nummer; das Telefon; haben.
5. **In the classroom** Can-do: follow basic lesson instructions. Grammar: polite/formal imperative chunks. Targets: lesen; hören; schreiben; sagen; öffnen; schließen; richtig; falsch; die Frage; die Antwort.

### Chapter 2 — People and everyday things

6. **My family** Can-do: identify close family. Grammar: possessives *mein/dein*; *er/sie*. Targets: die Familie; die Mutter; der Vater; die Eltern; der Bruder; die Schwester; das Kind; mein; dein; verheiratet.
7. **What is that?** Can-do: name common objects. Grammar: *der/die/das*, *ein/eine*; plural as a lexical property. Targets: der Tisch; der Stuhl; die Tasche; die Tür; das Buch; das Fenster; ein; eine; das; was.
8. **Food I like** Can-do: name basic food and say preferences. Grammar: *gern*; yes/no questions. Targets: das Brot; der Käse; die Milch; der Kaffee; der Tee; das Wasser; essen; trinken; gern; schmecken.
9. **Things we do** Can-do: say simple present actions. Grammar: regular present endings; *ich/du/er/wir/ihr/Sie*. Targets: machen; lernen; arbeiten; spielen; kaufen; brauchen; heute; oft; wir; ihr.
10. **No, not, none** Can-do: deny and correct simple information. Grammar: *nicht* versus *kein/keine*. Targets: nicht; kein; keine; ja; nein; auch; aber; oder; leider; natürlich.

### Chapter 3 — Routines and direct objects

11. **My day** Can-do: describe a basic routine and time. Grammar: finite verb in position 2; irregular *fahren/lesen*. Targets: morgens; mittags; abends; aufstehen; frühstücken; arbeiten; lernen; fahren; lesen; schlafen.
12. **I need a…** Can-do: ask for and buy common items. Grammar: accusative *den/einen*; feminine/neuter unchanged. Targets: brauchen; suchen; nehmen; der Apfel; der Saft; die Banane; die Zeitung; das Ticket; den; einen.
13. **At the café** Can-do: order and pay politely. Grammar: *ich möchte*; accusative chunks. Targets: möchten; bestellen; bezahlen; kosten; die Speisekarte; die Rechnung; das Frühstück; der Euro; zusammen; bitte.
14. **My home** Can-do: describe rooms and contents. Grammar: *es gibt* + accusative; basic location chunks. Targets: die Wohnung; das Zimmer; die Küche; das Bad; das Bett; der Schrank; groß; klein; hier; dort.
15. **People and plans review** Can-do: exchange a short profile and shopping dialogue. Grammar: nominative–accusative contrast. Targets: treffen; besuchen; der Freund; die Freundin; zusammen; allein; heute; morgen; wer; wen.

### Chapter 4 — Around town

16. **Places nearby** Can-do: ask where a public place is. Grammar: *wo* + fixed location phrases. Targets: der Bahnhof; die Post; die Bank; der Supermarkt; das Hotel; das Restaurant; links; rechts; geradeaus; nahe.
17. **Getting around** Can-do: state departure, arrival and transport. Grammar: separable verbs, prefix at clause end. Targets: abfahren; ankommen; einsteigen; aussteigen; der Bus; der Zug; die Haltestelle; fahren; wann; spät.
18. **Which way?** Can-do: understand and give short directions. Grammar: imperative chunks; *zu/nach* in high-frequency phrases. Targets: gehen; nehmen; folgen; über; durch; bis; zu; nach; die Straße; die Ecke.
19. **I can do that** Can-do: state ability and ask permission. Grammar: *können* + infinitive at end. Targets: können; schwimmen; kochen; tanzen; helfen; parken; fotografieren; gut; schlecht; vielleicht.
20. **Appointments** Can-do: arrange a simple time and state necessity/want. Grammar: *wollen/müssen* + infinitive; time-first V2. Targets: wollen; müssen; der Termin; die Uhr; Montag; Dienstag; frei; Zeit; anfangen; enden.

### Chapter 5 — Describe life

21. **Weather today** Can-do: understand a basic weather report. Grammar: impersonal *es ist/es regnet*. Targets: das Wetter; die Sonne; der Regen; der Wind; warm; kalt; schön; schlecht; regnen; scheinen.
22. **Clothes and colours** Can-do: identify and choose clothing. Grammar: predicative adjectives; *dieser/diese/dieses* as chunks. Targets: die Jacke; die Hose; das Hemd; der Schuh; rot; blau; schwarz; weiß; tragen; passen.
23. **How do you feel?** Can-do: state a simple health problem. Grammar: *haben* + accusative; *mir geht es…* chunks. Targets: krank; gesund; müde; der Kopf; der Bauch; der Arzt; die Apotheke; wehtun; helfen; besser.
24. **Free time** Can-do: say what I enjoy and invite someone. Grammar: *gern/lieber*; *und/aber*. Targets: das Hobby; die Musik; der Film; das Buch; Sport; hören; sehen; laufen; gern; lieber.
25. **Yesterday, briefly** Can-do: understand a few common past statements. Grammar: receptive/periphrastic perfect with *haben/sein*; no full paradigm. Targets: gestern; gewesen; gehabt; gemacht; gelernt; gekauft; gefahren; gekommen; schon; noch.

### Chapter 6 — Travel and A1 tasks

26. **At the hotel** Can-do: check in and ask about a room. Grammar: polite questions; *für* + accusative. Targets: reservieren; die Reservierung; der Pass; der Schlüssel; das Einzelzimmer; das Doppelzimmer; frei; für; die Nacht; bleiben.
27. **Tickets and times** Can-do: buy a ticket and understand departure details. Grammar: questions with *wann/wohin/wie viel*. Targets: die Fahrkarte; der Schalter; das Gleis; hin; zurück; einfach; umsteigen; dauern; ab; bis.
28. **An invitation** Can-do: invite, accept and decline with a reason. Grammar: modal review; *denn/aber* as discourse chunks. Targets: einladen; kommen; feiern; die Party; das Wochenende; gern; leider; keine Zeit; wann; wo.
29. **Forms and messages** Can-do: complete a basic form and write a short message. Grammar: capitalization of nouns; question-to-field mapping. Targets: der Vorname; der Familienname; die Adresse; die Straße; die Postleitzahl; das Land; geboren; unterschreiben; die E-Mail; die Nachricht.
30. **A day in German** Can-do: handle a short meet–shop–travel scenario. Grammar: cumulative A1 review. Targets: zuerst; dann; später; heute; morgen; brauchen; möchten; können; müssen; bezahlen.

**Pitfall policy.** Contrast English and German explicitly for noun gender/article, nominative versus accusative, V2 order after a time phrase, infinitive-final modal clauses, and split separable verbs. Keep capital letters on German nouns in all feedback. Treat English-like cognates cautiously and teach false friends only when useful. Case and word order both carry comprehension cues in German ([L2 case/word-order study](https://ucrisportal.univie.ac.at/en/publications/word-order-and-case-in-the-comprehension-of-l2-german-by-l1-engli/)).

## 3. Course sequencing for English (A1) for German speakers

This sequence uses the same CEFR A1 can-do scope and the free Cambridge English Vocabulary Profile as lexical checks ([English Vocabulary Profile](https://englishprofile.org/?menu=english-vocabulary-profile)), with British Council A1–A2 grammar references as a usage check ([LearnEnglish grammar](https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2/using-there-there-are)). Select either a broadly British or American model for spelling/audio and label it; do not silently mix *flat/apartment*, *lift/elevator* or accent targets.

### Chapter 1 — Meet and identify

1. **Hello!** Can-do: greet, say goodbye and introduce myself. Grammar: subject pronouns + *be*. Targets: hello; hi; good morning; goodbye; please; thanks; I; you; am; are.
2. **Names and countries** Can-do: ask and answer name/origin. Grammar: *What/Where* + *be*. Targets: name; country; city; from; live; England; Germany; English; German; where.
3. **Numbers and age** Can-do: give age, phone number and quantities. Grammar: *How old/many*; *be/have*. Targets: zero; one; ten; twenty; hundred; age; old; number; phone; many.
4. **Spell it** Can-do: spell and ask for repetition. Grammar: *Can you…?* as a polite chunk. Targets: letter; spell; repeat; say; slowly; understand; again; word; question; answer.
5. **In class** Can-do: follow basic instructions. Grammar: imperative; object pronoun *it*. Targets: read; listen; write; speak; open; close; look; choose; correct; wrong.

### Chapter 2 — People and things

6. **My family** Can-do: identify close family. Grammar: possessive adjectives; *have/has*. Targets: family; mother; father; parents; brother; sister; child; husband; wife; have.
7. **One or more** Can-do: name everyday objects. Grammar: *a/an*, regular plurals. Targets: book; bag; chair; table; door; window; key; a; an; some.
8. **This and that** Can-do: point out and ask about objects. Grammar: *this/that/these/those*. Targets: this; that; these; those; here; there; thing; what; which; whose.
9. **Describe people** Can-do: give a simple description. Grammar: adjective before noun; *be* + adjective. Targets: tall; short; young; old; friendly; happy; tired; hair; eyes; person.
10. **What I can do** Can-do: state ability and ask permission. Grammar: *can/can’t* + base verb. Targets: can; cannot; swim; cook; drive; dance; help; use; well; maybe.

### Chapter 3 — Routines and questions

11. **Every day** Can-do: describe a basic routine. Grammar: present simple; third-person *-s*. Targets: wake; eat; work; study; go; come; read; sleep; every; usually.
12. **Do you…?** Can-do: ask about habits and give short answers. Grammar: do-support *do/does*. Targets: do; does; like; play; watch; speak; start; finish; when; why.
13. **I don’t** Can-do: negate and correct routine information. Grammar: *don’t/doesn’t* + base form. Targets: do not; does not; never; not; yes; no; but; also; really; sometimes.
14. **Time and frequency** Can-do: tell time and say how often. Grammar: adverb position. Targets: clock; hour; morning; afternoon; evening; today; tomorrow; always; often; sometimes.
15. **Work and study** Can-do: state a job/place of study. Grammar: *be* versus lexical verbs. Targets: job; teacher; student; office; school; shop; hospital; work; study; at.

### Chapter 4 — Food, shopping and places

16. **Food and drink** Can-do: name basics and state preferences. Grammar: count/non-count introduction; *some*. Targets: bread; cheese; milk; coffee; tea; water; apple; rice; eat; drink.
17. **At a café** Can-do: order and pay politely. Grammar: *I’d like / Can I have…?* Targets: menu; breakfast; lunch; bill; order; pay; cost; pound; like; please.
18. **How much?** Can-do: ask prices and quantities. Grammar: *much/many*; *any*. Targets: much; many; any; bottle; cup; kilo; cheap; expensive; buy; need.
19. **My home** Can-do: describe rooms and contents. Grammar: *there is/there are*. Targets: home; room; kitchen; bathroom; bedroom; bed; sofa; in; on; under.
20. **Around town** Can-do: ask for and follow short directions. Grammar: imperatives; place prepositions. Targets: station; bank; supermarket; hotel; restaurant; left; right; straight; near; opposite.

### Chapter 5 — Now and usually

21. **What’s happening?** Can-do: say what people are doing now. Grammar: present continuous *be + -ing*. Targets: now; doing; walking; sitting; standing; talking; eating; drinking; waiting; wearing.
22. **Usually or now?** Can-do: contrast a routine with the current moment. Grammar: present simple versus continuous. Targets: usually; every day; today; now; work; working; play; playing; live; staying.
23. **Weather and clothes** Can-do: describe weather and choose clothing. Grammar: *it is*; continuous for current conditions. Targets: weather; sunny; raining; windy; hot; cold; coat; trousers; shirt; shoes.
24. **Free time** Can-do: say likes and suggest an activity. Grammar: *like + -ing*; *Let’s*. Targets: music; film; sport; reading; running; swimming; weekend; love; enjoy; let’s.
25. **How are you?** Can-do: state a simple health need. Grammar: *have* + symptom; basic imperatives. Targets: ill; well; headache; stomach; doctor; pharmacy; medicine; rest; hurt; better.

### Chapter 6 — Past, plans and A1 tasks

26. **Yesterday** Can-do: say where I was. Grammar: *was/were*. Targets: yesterday; last night; was; were; home; work; school; busy; free; there.
27. **What did you do?** Can-do: report a few completed actions. Grammar: regular past and *did* questions, receptive irregulars. Targets: did; visited; played; watched; worked; studied; went; had; saw; ago.
28. **Travel basics** Can-do: buy a ticket and understand times. Grammar: *to/from*, time prepositions. Targets: ticket; train; bus; platform; single; return; leave; arrive; journey; change.
29. **Plans** Can-do: state a simple near-future plan. Grammar: *be going to*. Targets: plan; going to; visit; travel; stay; meet; next; week; holiday; together.
30. **A day in English** Can-do: handle a short meet–order–directions scenario. Grammar: cumulative A1 review. Targets: first; then; later; need; would like; can; do; go; pay; help.

**German-speaker pitfalls.** Teach *become* (“werden”) against *bekommen* (“get/receive”) explicitly; the BBC lists it as a false friend ([BBC Learning English](https://downloads.bbc.co.uk/learningenglish/intermediate/unit10/b2_u10_6min_vocab_false_friends.pdf)). Contrast German verb-first questions with English *do/does* questions and negatives; Austrian education material makes this exact contrast ([BMBWF exercise](https://www.bmb.gv.at/dam/jcr%3A1d7b901b-4f31-4040-b0ef-00d764067e0d/glr_13_asking_questions.pdf)). Drill present simple (habit/state) versus continuous (now/temporary), English SVO after fronted adverbials, third-person *-s*, and *th* /θ, ð/ without penalizing accent. /θ/ and /w/ are documented problem sounds absent from standard German inventories ([pronunciation study](https://journals.sagepub.com/doi/10.1177/1367006921996811)).

## 4. Audio

### TTS license comparison

The license of the engine is not the license of every voice or dataset. Preserve the selected card, dataset license and revision in `audio/NOTICE.md` when assets are generated.

| Option | Evidence and commercial conclusion |
|---|---|
| Piper engine | Current `piper-tts` is GPL-3.0-or-later and has a Windows x86-64 wheel; using it as an offline build tool is practical, but distributing/modifying the tool triggers its license ([PyPI](https://pypi.org/project/piper-tts/)). Voice rights remain voice-specific. |
| `de_DE-thorsten-high` | 22.05 kHz; card says dataset CC0. **Use** for public and later commercial audio, retaining evidence ([card](https://huggingface.co/rhasspy/piper-voices/blob/v1.0.0/de/de_DE/thorsten/high/MODEL_CARD)). |
| `de_DE-kerstin-low` | 16 kHz; dataset CC0. Commercially permissive but lower fidelity; fallback only ([card](https://huggingface.co/rhasspy/piper-voices/blob/main/de/de_DE/kerstin/low/MODEL_CARD)). |
| `de_DE-ramona-low` | Card says only “License: See URL.” **UNVERIFIED; do not ship** until the exact M-AILABS subset terms are archived ([card](https://huggingface.co/rhasspy/piper-voices/blob/main/de/de_DE/ramona/low/MODEL_CARD)). |
| `en_US-ryan-high` | Dataset is CC BY-NC-SA 4.0. **Do not use** for a product that may become commercial ([card](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/ryan/high/MODEL_CARD)). |
| `en_US-lessac-high` | 22.05 kHz but its source license limits materials to research and excludes commercial speech products. **Do not ship** ([card](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/lessac/high/MODEL_CARD), [dataset license](https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html)). |
| `en_US-amy-medium` | Card says “See URL” and is fine-tuned from Lessac. **UNVERIFIED; do not ship** ([card](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/amy/medium/MODEL_CARD)). |
| `en_GB-alan-medium` | Card says “See URL” and is fine-tuned from Lessac. **UNVERIFIED; do not ship** ([card](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_GB/alan/medium/MODEL_CARD)). |
| `en_GB-cori-medium` | 22.05 kHz; card identifies public-domain LibriVox recordings. **Use** for British English, after keeping card/revision evidence ([card](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_GB/cori/medium/MODEL_CARD)). |
| `edge-tts` | Unofficial access to Edge’s consumer Read Aloud endpoint is not an Azure license. Commercial redistribution rights are **UNVERIFIED; do not use for generated site assets**. Microsoft grants commercial prebuilt-voice output rights specifically to paid-tier Azure TTS customers ([Microsoft Product Terms](https://www.microsoft.com/licensing/terms/en-US/productoffering/MicrosoftAzure/allprograms)). |
| Kokoro | Core Kokoro weights are Apache-2.0 and English-capable ([model card](https://huggingface.co/litert-community/Kokoro-82M)). German checkpoints are separate derivatives with separate provenance; quality and training rights are **UNVERIFIED** for this build. It is a viable English experiment, not the two-language default. |
| Coqui XTTS-v2 | Code and model are distinct; XTTS-v2’s CPML permits only non-commercial use of the model **and its outputs**. **Reject** for this roadmap ([license](https://huggingface.co/coqui/XTTS-v2/blob/v2.0.3/LICENSE.txt)). |
| Google Cloud TTS | Generated files may be used in applications/media subject to Cloud terms; current free allowances include 4M chars/month for Standard/WaveNet and 1M for Neural2, with billing enabled ([usage rights](https://docs.cloud.google.com/text-to-speech/quotas), [pricing](https://cloud.google.com/text-to-speech/pricing)). Strong paid fallback. |
| Azure Speech | Free F0 lists 0.5M neural characters/month, but the express commercial-output grant is for **paid tier only**. Generate production assets on S0 if using Azure ([pricing](https://azure.microsoft.com/en-us/pricing/details/speech/), [Product Terms](https://www.microsoft.com/licensing/terms/en-US/productoffering/MicrosoftAzure/allprograms)). |

### Concrete generation choice

Choose **Piper `de_DE-thorsten-high` for German** and **Piper `en_GB-cori-medium` for English**. Before launch, have a native speaker audit every clip for pronunciation, stress, homographs, abbreviations and unnatural prosody. If Cori quality fails that audit, use paid Google Cloud TTS rather than a license-ambiguous Piper US voice.

Windows CPU-only setup (PowerShell, Python 3.9+; the CLI flags are documented in Piper source: [CLI](https://github.com/rhasspy/piper/blob/master/src/python_run/piper/__main__.py)):

```powershell
py -m venv .venv-tts
.\.venv-tts\Scripts\python.exe -m pip install --upgrade pip piper-tts
.\.venv-tts\Scripts\python.exe -m piper.download_voices de_DE-thorsten-high en_GB-cori-medium
"Guten Morgen!" | .\.venv-tts\Scripts\python.exe -m piper -m .\de_DE-thorsten-high.onnx -f .\de-test.wav
"Good morning!" | .\.venv-tts\Scripts\python.exe -m piper -m .\en_GB-cori-medium.onnx -f .\en-test.wav
```

Generate master WAV at the model’s native **22,050 Hz, mono**, then ship **WebM/Opus mono at 32 kb/s** plus optional AAC/M4A fallback if target testing requires it. Use content-hashed names, normalize conservatively (about −18 LUFS integrated; no clipping), trim only long edge silence, and keep masters out of the deployed bundle. Example: `ffmpeg -i in.wav -ac 1 -c:a libopus -b:a 32k -vbr on out.webm`. Opus is designed for speech and scales across low bitrates ([RFC 7587](https://www.rfc-editor.org/rfc/rfc7587)).

### Browser synthesis and recognition

- Fallback playback: feature-detect `speechSynthesis`, wait for `voiceschanged`, prefer an exact `de-DE` or chosen `en-GB` voice, set `lang`, and label it “device voice”; installed voices vary, so never grade listening solely from fallback audio.
- Recognition: feature-detect `window.SpeechRecognition || window.webkitSpeechRecognition`. As of the research date, MDN compatibility data shows long-standing prefixed Chrome/Edge support and prefixed Safari support from 14.1; Firefox desktop support is listed only from version 160 and Firefox Android as unsupported, so Firefox availability today is **UNVERIFIED/usually absent** ([MDN browser data](https://github.com/mdn/browser-compat-data/blob/main/api/SpeechRecognition.json)).
- Privacy: default Web Speech recognition can send audio to a server; disclose this immediately before microphone permission and do not imply on-device processing ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API)). Do not retain audio. Offer “Skip speaking” and an equivalent listen-and-type task.
- Grade speaking softly: pass on presence of key words above a forgiving confidence threshold; show the transcript; allow retry and self-assessment. Never deduct hearts or block progress for API/network/accent failure.
- Mobile autoplay: browsers may block audible media and Web Audio until a user gesture; call `play()` from the lesson-start/tap event, handle its rejected promise, and resume a suspended `AudioContext` on interaction ([MDN autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)). Never auto-speak on page load.

## 5. Motion and feedback design

These are original implementation values, not measurements copied from another app. Short interaction feedback around 100 ms is consistent with established design-system guidance ([Atlassian](https://atlassian.design/foundations/motion/applying-motion)).

### Tactile starting specification

- **Chunky button:** 52 px minimum height, 14 px radius, `border-bottom: 5px solid color-mix(in srgb, var(--button) 72%, black)`, no generic drop shadow. Rest at `translateY(0)`; `:active` at `translateY(4px)` with bottom border 1 px. Press 70 ms `cubic-bezier(.2,0,0,1)`; release 120 ms. Keep a visible 3 px focus ring independent of the edge.
- **Selection tile:** scale 1 → 0.98 for 70 ms on press, then 1 for 120 ms. Selected state changes border/background as well as color; never rely on color alone.
- **Spring:** for path-node unlock or small mascot settle, start with mass 1, stiffness 420, damping 30 (roughly ≤450 ms, no more than one visible overshoot). Do not spring reading text or the whole page.
- **Correct sheet:** fixed bottom sheet, 12–16 px upward entrance + opacity over 180 ms; green-adjacent but brand-specific tint, check icon, “Correct” and one short note. Keep Continue in a stable location. Auto-focus nothing and never auto-dismiss.
- **Incorrect sheet:** same geometry/timing to avoid punishment theatre; warm coral tint, “Try this” explanation and correct answer. Re-queue instead of shaking the viewport. A 2 px, 120 ms horizontal nudge of the selected tile is the maximum.
- **Progress bar:** 8 px height, 999 px radius; animate width over 220 ms with `cubic-bezier(.2,.8,.2,1)`. Errors do not move it backwards. Announce only meaningful milestones via `aria-live`, not every pixel change.
- **Path node:** locked/static; available node breathes once on first reveal (scale 0.92 → 1.04 → 1, 360 ms); completed node gets a 300 ms ring draw. No infinite pulsing.
- **Lesson complete:** 900–1,200 ms total: original Fenn hop/ear motion, 12–18 simple particles, XP count over 600 ms, then a stable summary. Never delay Continue beyond 300 ms.

For reduced motion, remove parallax, particles, shakes, springs, breathing and count-up; use instant state changes or ≤100 ms opacity fades. Respecting `prefers-reduced-motion` is an explicit WCAG technique ([W3C C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html)). Preserve meaning and operability when animation is removed.

### Original sound and haptics

Synthesize tiny effects at runtime with Web Audio oscillators/noise and gain envelopes—no copied samples. The Web Audio specification provides sample-accurate low-latency scheduling ([W3C](https://www.w3.org/TR/webaudio-1.0/)). Start at master gain −18 dB, user-toggleable:

- Correct: sine 523 Hz for 55 ms then 659 Hz for 90 ms, 5 ms attack/60 ms exponential release.
- Incorrect: triangle 180 → 145 Hz over 130 ms, 5 ms attack/100 ms release; keep quiet and non-alarming.
- Completion: sine arpeggio 392/523/659 Hz at 0/90/180 ms, total <450 ms.
- Tap: 2 ms filtered-noise attack + 18 ms release, very low gain; disable if repetitive testing finds it fatiguing.

Call `navigator.vibrate(10)` for a deliberate primary press, `vibrate([12,35,12])` for completion, and nothing for ordinary navigation or errors. Feature-detect and honor the sound/haptics setting. Vibration works only where hardware/browser permit it and is absent in iOS Safari ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate), [compatibility](https://caniuse.com/mdn-api_navigator_vibrate)); it must never carry unique information.

## 6. Retention mechanics, ethically

### Product rules

- **Hearts:** use five “focus hearts” only as an optional session challenge; mistakes never lock learning, trigger waiting, or sell relief. Default core lessons have unlimited attempts.
- **Streak:** count any meaningful learning action (one completed review or lesson), use the learner’s local timezone, show calendar truth, allow a one-tap repair for the previous day, and offer a no-streak mode. A “freeze” should be a free monthly grace day, not scarce paid insurance.
- **XP:** award by learning effort: new lesson 10, due review 8, speaking/listening practice 8, repeated easy item 1. Cap farming from the same item/day. XP never changes correctness or access.
- **Daily goal:** learner chooses 5, 10 or 15 minutes and can lower/pause it without losing history. Report words strengthened and can-dos completed before XP.
- Gamification can motivate, but users can optimize points over learning, and streak interruption can create stress; autonomy and fair competition should dominate ([2025 IEEE study](https://ieeexplore.ieee.org/abstract/document/11346677), [gamification misuse study](https://doi.org/10.1145/3491140.3528274)).

### Client-only spaced repetition choice

| Method | Fit for Fennly |
|---|---|
| Leitner boxes | Tiny and explainable, but coarse fixed boxes ignore lateness and item difficulty. |
| SM-2 | Small per-card state and deterministic offline formula; easy to audit, migrate and sync later. |
| HLR | Predicts recall as a half-life and performed well on Duolingo data, but its useful weights are trained from substantial response data ([HLR paper](https://research.duolingo.com/papers/settles.acl16.pdf)). |
| FSRS | Modern stability/difficulty/retrievability model and excellent future candidate, but parameter optimization and a 21-weight FSRS-6 implementation add MVP complexity ([FSRS-6 spec](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm)). |

**Recommend SM-2 for v1**, stored in IndexedDB per learning item: repetitions `n`, interval `I` days, easiness `EF` (start 2.5), due timestamp and lapse count. Map Fennly results to quality `q`: 5 correct unhinted and fast; 4 correct unhinted; 3 correct after hesitation/typo; 2 correct only after hint; 1 wrong but familiar; 0 no recall.

```text
EF' = max(1.3, EF + 0.1 - (5-q) * (0.08 + (5-q) * 0.02))
if q < 3: n' = 0; I' = 1
else if n = 0: n' = 1; I' = 1
else if n = 1: n' = 2; I' = 6
else: n' = n + 1; I' = round(I * EF')
due = now + I' days
```

This is the published SM-2 shape ([SuperMemo description](https://github.com/clockzhong/OpenSuperMemo/blob/master/SM2/Docs/SuperMemo%202_%20Algorithm.html)). Add two humane constraints: cap the next interval at 180 days in A1, and if the learner reviews late, base scheduling on actual elapsed time only after enough product data exists; do not fabricate “AI personalization.” Export/import this local state and warn that clearing site data removes it.

### Dark patterns to reject

No fake urgency/countdowns, loss-framed push notifications, confirmshaming, preselected marketing consent, hidden prices, hard cancellation, pay-to-win leaderboards, paid mistake forgiveness, coercive streak-loss animations, forced account creation, or disguised ads. The FTC specifically identifies fake urgency, hidden information, preselection and cancellation obstruction ([FTC report](https://www.ftc.gov/reports/bringing-dark-patterns-light)); the EU study found hidden hierarchy, preselection, nagging, difficult cancellation and forced registration among prevalent patterns ([European Commission](https://op.europa.eu/en/publication-detail/-/publication/606365bc-d58b-11ec-a95f-01aa75ed71a1)).

## 7. Intellectual property boundaries

**Not legal advice.** Mechanics such as short exercises, progress, spaced review and a chapter path are general ideas; do not copy protected expression: course sentences, prompts, explanations, illustrations, animation, mascot poses/personality, UI assets, sound recordings, source code, or a substantially similar screen-by-screen composition. Duolingo states it owns registered/unregistered copyrights for logos and characters and trademarks including the Duolingo word marks and Duo mascot/logo ([2026 Form 10-K](https://investors.duolingo.com/static-files/f19d76fb-dee4-4f13-96ae-138ebfd0f2d3)).

Trade dress can be the total image/overall appearance, including size, shape, color combinations, texture and graphics—not merely one copied logo ([USPTO TMEP 1202.02](https://tmep.uspto.gov/RDMS/TMEP/print?href=TMEP-1200d1e835.html&version=current)). Therefore:

- **Safe direction:** an angular, desert-adapted fennec; sand/night-sky/coral/teal palette; original typography, path geometry, icons, button silhouette, illustrations, sounds, copy and celebration language; documented independent sketches and source files.
- **Avoid:** a green bird/round owl silhouette; lime-green-led palette with the same supporting color relationships; Duo-like eyes/beak/body, poses or threatening-comic persona; copied lesson/course sentences; copied sound/melody; near-identical path nodes, shop/hearts presentation, iconography, feedback sheets or animation sequence.
- Do not put “Duolingo,” “Duo,” its owl, logo, screenshots or “official/compatible with” language in branding/metadata. Use competitor names only in factual internal research or nominative comparison reviewed by counsel.
- Treat “XP,” “hearts,” “streak” and “streak freeze” as potentially source-identifying in a particular branded presentation even if some words are descriptive/common. Rename the user-facing bundle where practical: e.g. **learning points**, **focus**, **run**, **grace day**. A comprehensive clearance search must consider sound, appearance, meaning, commercial impression and related services ([USPTO](https://www.uspto.gov/trademarks/search/likelihood-confusion)).

### “Fennly” quick clearance result

**Not clear. High naming risk; do not launch under the name without counsel.** A quick web/app-store search found an active **Fennly: Food & Symptom Diary** on Apple’s App Store and a live site linking both Apple and Google stores ([App Store](https://apps.apple.com/gb/app/fennly-food-symptom-diary/id6790508044), [fennly.app](https://fennly.app/)). Search also found “Fennly Co” and a 2026 Fennly tea-shop design, showing broader commercial use ([Fennly Co terms](https://fennlyco.com/policies/terms-of-service), [design case study](https://www.amariq.com/projects/fennly-herbal-tea-website-design)).

No conclusion about registered/pending marks can be drawn from general web results. `UNVERIFIED`: USPTO, EUIPO, UKIPO, DPMA/WIPO records, common-law use, domains/social handles and phonetic neighbors have not received a lawyer-grade clearance search. Different goods can coexist, but relatedness and likely confusion are fact-specific; USPTO expressly recommends comprehensive searching ([USPTO scope](https://www.uspto.gov/trademarks/basics/scope-protection), [search overview](https://www.uspto.gov/learning-and-resources/uspto-videos/federal-trademark-searching-overview)). Commission clearance in intended launch countries and prepare replacement names before investing further in the mark or mascot lockup.

## 8. Recommendations

1. Pause public use of **Fennly** pending professional US/EU/UK/German clearance; shortlist distinctive replacements now.
2. Keep Fenn a clearly angular sand-coloured fennec in a desert/night visual world, never a green round bird.
3. Ship an original 30-unit A1 path per direction, five units per chapter, using the sequences above.
4. Author every noun in German as article + noun + plural from first exposure.
5. Use 12 scheduled exercises per lesson, max 15 after re-queues, and 5–7 new items.
6. Sequence each lesson context → recognition → listening → scaffolded production → free production → transfer.
7. Build explicit authored answer graphs; apply only conservative, target-aware typo tolerance.
8. Re-queue mistakes 2–4 items later with simpler scaffolding and specific feedback; never lock learning.
9. Pre-generate German with Piper Thorsten and British English with Piper Cori; native-speaker QA every clip.
10. Deploy 22.05 kHz mono masters as 32 kb/s WebM/Opus and fall back to labeled device TTS.
11. Make speech recognition optional, privacy-disclosed and non-punitive; always offer listen/type equivalence.
12. Implement the numeric tactile spec, original Web Audio cues, and a complete reduced-motion mode.
13. Use optional, forgiving streaks/grace days and effort-weighted learning points; no paid hearts or fear copy.
14. Start client-only review with auditable SM-2 state in IndexedDB plus export/import; evaluate FSRS after real data.
15. Maintain an IP/audio provenance ledger containing every model card, dataset license, revision, original-art source and course-text author/reviewer.
