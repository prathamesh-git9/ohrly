# Audio credits

All speech on this site is synthetic, generated ahead of time and served as static files.

- English voice: [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) (Apache 2.0), voice `af_heart`, via
  kokoro-onnx.
- German voice: [Chatterbox Multilingual](https://github.com/resemble-ai/chatterbox) by Resemble AI (MIT),
  voiced from a recording in the [Thorsten-Voice dataset](https://huggingface.co/datasets/Thorsten-Voice/TV-44kHz-Full)
  by Thorsten Müller (CC0, public domain). Chatterbox embeds an inaudible watermark marking its output as generated.
- A few German clips use Piper `de_DE-thorsten-high`: single short words Chatterbox cannot voice, and the
  clips that still failed a speech-recognition check after two Chatterbox retakes. Same speaker; dataset CC0;
  the model card says it was fine-tuned from Piper's U.S. English `lessac` voice.

The speech engines run only as offline build tools and are not distributed with the site.
