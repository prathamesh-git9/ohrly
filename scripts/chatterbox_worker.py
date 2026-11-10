"""German speech with Chatterbox Multilingual (MIT), voiced from a CC0 native-speaker reference.
Same interface as piper_worker.py. Run with the Python of .venv-cb (CUDA).

    python chatterbox_worker.py <reference.wav> <lang>

Generation is sampled, so a take can occasionally come out garbled. Each text gets a fixed seed,
which keeps reruns stable; scripts/gen_audio.py passes a different seed list to retry a bad take.
"""
import json
import sys
import zlib

import torch
import torchaudio
from chatterbox.mtl_tts import ChatterboxMultilingualTTS


def main() -> None:
    reference, lang = sys.argv[1], sys.argv[2]
    attempt = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    model = ChatterboxMultilingualTTS.from_pretrained(device='cuda' if torch.cuda.is_available() else 'cpu')
    jobs = json.loads(sys.stdin.buffer.read().decode('utf-8'))
    for text, path in jobs:
        torch.manual_seed(zlib.crc32(text.encode('utf-8')) + attempt * 7919)
        try:
            wav = model.generate(
                text,
                language_id=lang,
                audio_prompt_path=reference,
                exaggeration=0.4,
                cfg_weight=0.4,
            )
        except Exception as error:  # noqa: BLE001 - one bad line must not stop the batch
            print(f'no speech for {text!r}: {error}', file=sys.stderr)
            continue
        torchaudio.save(path, wav, model.sr)


if __name__ == '__main__':
    main()
