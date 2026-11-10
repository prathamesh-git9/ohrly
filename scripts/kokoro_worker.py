"""English speech with Kokoro (Apache 2.0). Same interface as piper_worker.py: a JSON list of
[text, wav_path] on stdin, one file per text, no file when there is nothing to say.

    python kokoro_worker.py <model.onnx> <voices.bin> <voice> <lang>
"""
import json
import sys

import soundfile as sf
from kokoro_onnx import Kokoro


def main() -> None:
    model, voices, voice, lang = sys.argv[1:5]
    k = Kokoro(model, voices)
    jobs = json.loads(sys.stdin.buffer.read().decode('utf-8'))
    for text, path in jobs:
        try:
            # Slightly under normal speed: clear for learners without sounding slowed down.
            samples, rate = k.create(text, voice=voice, speed=0.92, lang=lang)
        except Exception as error:  # noqa: BLE001 - one bad line must not stop the batch
            print(f'no speech for {text!r}: {error}', file=sys.stderr)
            continue
        if len(samples) == 0:
            print(f'no speech for {text!r}', file=sys.stderr)
            continue
        sf.write(path, samples, rate)


if __name__ == '__main__':
    main()
