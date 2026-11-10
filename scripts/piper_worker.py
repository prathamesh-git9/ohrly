"""Synthesizes speech with one model load. Run with the Python of the piper-tts environment.

Reads a JSON list of [text, wav_path] pairs from stdin. Each clip is written to its own named path,
so audio can never be paired with the wrong text the way matching output files by order could.
Text with nothing to say, such as a lone dash, yields no file; the caller skips it.
"""
import json
import os
import sys
import wave

from piper import PiperVoice
from piper.config import SynthesisConfig


def main() -> None:
    model, speaker = sys.argv[1], sys.argv[2]
    config = SynthesisConfig(speaker_id=None if speaker == "none" else int(speaker))
    voice = PiperVoice.load(model)
    jobs = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    for text, path in jobs:
        try:
            with wave.open(path, "wb") as out:
                voice.synthesize_wav(text, out, syn_config=config)
        except wave.Error:
            # No audio came out, so no header could be written: nothing speakable in this text.
            if os.path.exists(path):
                os.remove(path)
            print(f"no speech for {text!r}", file=sys.stderr)


if __name__ == "__main__":
    main()
