"""Compare candidate voices: synthesize the same sentences, score how well speech recognition
understands them, and write a page for a human to listen and choose.

    python scripts/voice_lab.py en      (Kokoro voices against the current Piper voice)
The page and clips go to .audio-cache/voice-lab/. Machine scores measure clarity, not pleasantness.
"""
import difflib
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / '.audio-cache' / 'voice-lab'

SENTENCES = {
    'en': [
        'Good morning, my name is Anna.',
        'I would like a coffee and a cheese sandwich, please.',
        'The train to London leaves from platform two.',
        'We have to get up early tomorrow morning.',
        'Where do you come from? I come from Germany.',
        'My brother has two children and a lovely flat.',
        'She is reading a book in the kitchen.',
        'Could you say that again, please?',
        'These three things are over there.',
        'I have never been to Scotland, but I would love to go.',
    ],
    'de': [
        'Guten Morgen, ich heiße Anna.',
        'Ich möchte einen Kaffee und das Frühstück, bitte.',
        'Die Straße ist nicht weit vom Bahnhof.',
        'Wir müssen morgen früh nach München fahren.',
        'Woher kommst du? Ich komme aus Deutschland.',
        'Mein Bruder hat zwei Kinder und eine schöne Wohnung.',
        'Das Mädchen liest ein Buch in der Küche.',
        'Können Sie das bitte noch einmal wiederholen?',
        'Der Zug fährt um acht Uhr ab.',
        'Ich brauche den Schlüssel für das Zimmer.',
    ],
}


def words(text):
    return re.findall(r"[\w']+", text.lower())


def to16k(path):
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-f', 's16le', '-ac', '1', '-ar', '16000', '-'],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768


def score_all(lang, clips):
    from faster_whisper import WhisperModel
    model = WhisperModel('base', device='cpu', compute_type='int8', cpu_threads=3)
    pad = np.zeros(6400, dtype=np.float32)
    results = {}
    for name, paths in clips.items():
        total = 0.0
        for text, path in zip(SENTENCES[lang], paths):
            segs, _ = model.transcribe(np.concatenate([pad, to16k(path), pad]), language=lang, beam_size=1, temperature=0)
            a, b = words(text), words(' '.join(s.text for s in segs))
            total += sum(m.size for m in difflib.SequenceMatcher(None, a, b).get_matching_blocks()) / max(1, len(a))
        results[name] = total / len(paths)
    return results


def kokoro_clips(lang, voices):
    from kokoro_onnx import Kokoro
    k = Kokoro(str(ROOT / '.audio-cache/voices/kokoro/kokoro-v1.0.onnx'), str(ROOT / '.audio-cache/voices/kokoro/voices-v1.0.bin'))
    clips = {}
    for voice in voices:
        accent = 'en-gb' if voice[0] == 'b' else 'en-us'
        paths = []
        for i, text in enumerate(SENTENCES[lang]):
            samples, rate = k.create(text, voice=voice, speed=0.95, lang=accent)
            path = OUT / lang / f'kokoro-{voice}-{i}.wav'
            path.parent.mkdir(parents=True, exist_ok=True)
            sf.write(path, samples, rate)
            paths.append(path)
        clips[f'Kokoro {voice}'] = paths
    return clips


def piper_clips(lang, model_name):
    from piper import PiperVoice
    voice = PiperVoice.load(str(ROOT / '.audio-cache/voices' / f'{model_name}.onnx'))
    paths = []
    for i, text in enumerate(SENTENCES[lang]):
        path = OUT / lang / f'piper-{model_name}-{i}.wav'
        path.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(path), 'wb') as w:
            voice.synthesize_wav(text, w)
        paths.append(path)
    return {f'Piper {model_name} (current)': paths}


def extra_clips(lang):
    """Clips made by other tools (such as Chatterbox in its own venv), named <label>-<n>.wav."""
    clips = {}
    for folder in sorted((OUT / lang).glob('extra-*')):
        paths = sorted(folder.glob('*.wav'), key=lambda p: int(p.stem.rsplit('-', 1)[-1]))
        if len(paths) == len(SENTENCES[lang]):
            clips[folder.name[6:]] = paths
    return clips


def page(lang, clips, scores):
    rows = []
    for name in sorted(clips, key=lambda n: -scores[n]):
        cells = ''.join(
            f'<td><audio controls preload="none" src="{p.relative_to(OUT / lang).as_posix()}"></audio></td>' for p in clips[name][:4]
        )
        rows.append(f'<tr><th>{name}<br><small>clarity {scores[name]:.0%}</small></th>{cells}</tr>')
    heads = ''.join(f'<th>{t}</th>' for t in SENTENCES[lang][:4])
    html = f"""<!doctype html><meta charset="utf-8"><title>Ohrly voices: {lang}</title>
<style>body{{font-family:system-ui;margin:24px;background:#fff9f0;color:#2b2140}}table{{border-collapse:collapse}}
td,th{{border:1px solid #e3d6c3;padding:8px;vertical-align:top;text-align:left}}th small{{color:#6d6480}}audio{{width:190px}}</style>
<h1>Which voice sounds best? ({lang})</h1><p>Clarity is how much speech recognition understood. Trust your ears for how natural it sounds.</p>
<table><tr><th>Voice</th>{heads}</tr>{''.join(rows)}</table>"""
    path = OUT / lang / 'index.html'
    path.write_text(html, encoding='utf-8')
    return path


if __name__ == '__main__':
    lang = sys.argv[1]
    clips = {}
    if lang == 'en':
        clips.update(piper_clips('en', 'en_GB-cori-high'))
        clips.update(kokoro_clips('en', ['bf_emma', 'bf_isabella', 'bf_lily', 'bm_george', 'bm_lewis', 'af_heart']))
    else:
        clips.update(piper_clips('de', 'de_DE-thorsten-high'))
    clips.update(extra_clips(lang))
    scores = score_all(lang, clips)
    for name, value in sorted(scores.items(), key=lambda kv: -kv[1]):
        print(f'{value:.3f}  {name}')
    print(page(lang, clips, scores))
    (OUT / lang / 'scores.json').write_text(json.dumps(scores, indent=1), encoding='utf-8')
