"""German voice candidates from Chatterbox Multilingual (MIT). Run with .venv-cb's Python.

Writes .audio-cache/voice-lab/de/extra-<label>/<label>-<n>.wav for scripts/voice_lab.py to score.
The reference clip is from the CC0 Thorsten-Voice dataset, so the accent comes from a native speaker.
"""
import sys
from pathlib import Path

import torchaudio
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).parent))
from voice_lab import SENTENCES  # noqa: E402

OUT = ROOT / '.audio-cache' / 'voice-lab' / 'de'
REF = ROOT / '.audio-cache' / 'ref' / 'thorsten-0.wav'

VARIANTS = {
    'Chatterbox default voice': dict(),
    'Chatterbox native German (Thorsten CC0)': dict(audio_prompt_path=str(REF)),
    'Chatterbox native German, calmer': dict(audio_prompt_path=str(REF), exaggeration=0.4, cfg_weight=0.4),
}

model = ChatterboxMultilingualTTS.from_pretrained(device='cuda')
for label, opts in VARIANTS.items():
    folder = OUT / f'extra-{label}'
    folder.mkdir(parents=True, exist_ok=True)
    for i, text in enumerate(SENTENCES['de']):
        wav = model.generate(text, language_id='de', **opts)
        torchaudio.save(str(folder / f'clip-{i}.wav'), wav, model.sr)
    print('done', label, flush=True)
