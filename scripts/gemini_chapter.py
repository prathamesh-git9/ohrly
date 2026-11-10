"""Writes one course chapter with Gemini through the signed-in Comet tab, then validates it.

Run with the project venv, from the project root, with Comet on debug port 9222:
    python scripts/gemini_chapter.py en-de 5
Validation errors go back into the same chat, up to three rounds. Nothing is kept unless it validates.
"""
import asyncio
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).parent))
import gemini_cdp  # noqa: E402

PROMPTS = ROOT / 'docs' / 'prompts'
LOGS = PROMPTS / 'logs'
NPM = shutil.which('npm') or 'npm'


def npm(*args):
    return subprocess.run([NPM, 'run', '-s', *args], cwd=ROOT, capture_output=True, text=True, encoding='utf8')


def level_of(chapter):
    return ['A1', 'A2', 'B1', 'B2'][(chapter - 1) // 6]


def plan_for(course, chapter):
    level = level_of(chapter)
    local = (chapter - 1) % 6 + 1
    if level == 'A1':
        text = (ROOT / 'docs' / 'RESEARCH.md').read_text(encoding='utf8')
        start = text.index('## 2. Course') if course == 'en-de' else text.index('## 3. Course')
        part = text[start:]
        a = part.index(f'### Chapter {local}')
        b = part.find('\n### ', a + 5)
        c = part.find('\n**', a + 5)
        return part[a:min(x for x in (b, c) if x > 0)]
    text = (ROOT / 'docs' / 'RESEARCH-LEVELS.md').read_text(encoding='utf8')
    name = 'German' if course == 'en-de' else 'English'
    start = text.index(f'### {name} {level}')
    end = text.find('\n### ', start + 5)
    rows = [l for l in text[start:end if end > 0 else None].splitlines() if l.startswith(f'| {local}.')]
    return '\n'.join(rows)


def build_prompt(course, chapter):
    level = level_of(chapter)
    ch = f'{chapter:02d}'
    first = (chapter - 1) * 5 + 1
    width = 2 if level == 'A1' else 3
    types = (ROOT / 'src' / 'domain' / 'types.ts').read_text(encoding='utf8')
    types = types[:types.index('/* ------------------------------ Exercises')]
    rules = (PROMPTS / 'content-common.md').read_text(encoding='utf8')
    rules = rules[rules.index('## Rules that decide'):]
    guide = (PROMPTS / ('content-chapter.md' if level == 'A1' else 'content-upper.md')).read_text(encoding='utf8')
    guide = guide[guide.index('## Hard rules'):guide.index('## Finish')]
    brief = (PROMPTS / f'content-{course}.md').read_text(encoding='utf8')
    brief = brief[brief.index('Course-specific rules:'):]
    vocab = npm('vocab', '--', course).stdout
    return f"""You are a professional language-course author writing original course material for Ohrly, a free language-learning site. Write ONE chapter as one JSON object. Quality and accuracy are the whole job. All text must be your own writing; do not reproduce any existing course or exam.

Accuracy traps seen in earlier drafts, which must not appear: invented plurals (a noun with no real plural, such as das Wetter or die Musik, has no `plural` field at all); sentences that are grammatical but mean nonsense ("I like seeing a book", "It is cold and warm"); calques ("Ich spiele gern Sport" instead of "Ich mache gern Sport"); clozes with a second correct option; archaic forms as distractors. Include sourceAccept and targetAccept alternatives for natural variants, such as sick/ill. Every accepted alternative must itself be correct and natural: never accept wrong English such as "I have been in Berlin yesterday" (the present perfect cannot take a finished time), or stilted options such as "Is this shirt fitting?". Prefer natural contractions and idiom: "ins Kino", not "in das Kino"; "Mein Bauch tut weh", not "Der Bauch tut weh". Read every sentence as a native speaker before you finish.

Reply with ONLY the JSON object in one code block. No commentary. Do not stop early: all 5 complete units.

The object is a Section: id "c{ch}", cefr "{level}", title, description, units. Unit ids "u{first:0{width}d}" to "u{first + 4:0{width}d}". Sentence ids such as "u{first:0{width}d}-s01". Word ids such as "w-hund", unique across the course: reuse no id listed in the taught words below. Each unit needs: id, title, canDo, tip, words, sentences{'' if level == 'A1' else ', passages'}.

TypeScript contract:
{types}

{rules}

{guide}

Course rules:
{brief}

Plan for this chapter (use its units, can-do statements, grammar and targets, in your own words; skip targets already taught and pick another useful {level} word):
{plan_for(course, chapter)}

Already taught. Reuse these freely in sentences, using their ids in `words`, but do not teach them again. A sentence may use ONLY these words, listed forms, names, and words you teach in this chapter or an earlier unit of it. Any inflected form you use must be listed in a word's `forms`:
{vocab}
"""


def extract_json(text):
    a, b = text.find('{'), text.rfind('}')
    if a < 0 or b < 0:
        raise ValueError('no JSON object in the reply')
    return json.loads(text[a:b + 1])


def validate(course, chapter):
    """Returns the error lines that belong to this chapter's run."""
    if npm('course', '--', course).returncode:
        return ['the course failed to merge']
    out = npm('validate', '--', course).stdout
    return [l.strip() for l in out.splitlines() if 'ERROR' in l or 'more errors' in l]


async def main(course, chapter):
    LOGS.mkdir(parents=True, exist_ok=True)
    ch = f'{chapter:02d}'
    target = ROOT / 'content-src' / course / f'chapter-{ch}.json'
    if target.exists():
        raise SystemExit(f'{target.name} already exists')
    base = LOGS / f'{course}-{ch}-gemini'
    prompt = build_prompt(course, chapter)
    (LOGS / f'{base.name}.prompt.md').write_text(prompt, encoding='utf8')
    new = True
    for round_no in range(1, 8):
        if round_no == 1 and '--harvest' in sys.argv:
            reply = await gemini_cdp.current_reply()  # Already written: collect it, send nothing.
        else:
            reply = await gemini_cdp.ask(prompt, new)
        new = False
        (LOGS / f'{base.name}.reply{round_no}.txt').write_text(reply, encoding='utf8')
        try:
            data = extract_json(reply)
        except ValueError as error:
            print(f'round {round_no}: unparseable reply ({error})', flush=True)
            prompt = f'That was not one complete valid JSON object ({error}). Reply with ONLY the whole corrected JSON object in one code block.'
            continue
        target.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf8')
        errors = validate(course, chapter)
        print(f'round {round_no}: {len(reply)} chars, {len(errors)} errors', flush=True)
        if not errors:
            print(npm('validate', '--', course).stdout.splitlines()[0])
            return
        target.unlink()
        npm('course', '--', course)
        prompt = (
            'Validation failed. Fix every error below and any like it, then reply with ONLY the whole '
            'corrected JSON object in one code block. For "untaught target words", add the form to the '
            'right word\'s `forms` or rewrite the sentence. For "does not list its word", add the id to '
            '`words`.\n\n' + '\n'.join(errors)
        )
    raise SystemExit('gave up after 7 rounds; nothing kept')


if __name__ == '__main__':
    asyncio.run(main(sys.argv[1], int(sys.argv[2])))
