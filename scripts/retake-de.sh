#!/usr/bin/env bash
# Retakes flagged German clips with new seeds; what still fails after two retakes falls back to Piper Thorsten.
cd "$(dirname "$0")/.."
export PYTHONIOENCODING=utf-8
PY="$(pwd -W)/.venv/Scripts/python.exe"
flag=.audio-cache/de-flagged.json
for attempt in 1 2; do
  n=$(python -c "import json;print(len(json.load(open('$flag',encoding='utf8'))))")
  echo "attempt $attempt: retaking $n clips"
  [ "$n" = 0 ] && break
  python scripts/gen_audio.py --piper-python "$PY" --voices-dir .audio-cache/voices --lang de --redo "$flag" --attempt "$attempt" 2>&1 | grep -E "^\[de\] [0-9]+ referenced|too short"
  .venv/Scripts/python.exe scripts/audit_audio.py --lang de --sample 0 --min-words 1 --flag-below 0.5 --only "$flag" --flagged-out "$flag.next" 2>&1 | grep -E "checked"
  mv "$flag.next" "$flag"
done
n=$(python -c "import json;print(len(json.load(open('$flag',encoding='utf8'))))")
if [ "$n" != 0 ]; then
  echo "falling back to Piper Thorsten for $n clips"
  python scripts/gen_audio.py --piper-python "$PY" --voices-dir .audio-cache/voices --lang de --redo "$flag" --engine-de piper 2>&1 | grep -E "^\[de\] [0-9]+ referenced"
  .venv/Scripts/python.exe scripts/audit_audio.py --lang de --sample 0 --min-words 1 --flag-below 0.5 --only "$flag" 2>&1 | grep -v -iE "warning|hf_hub" | tail -12
fi
python scripts/gen_audio.py --dry-run --lang de 2>&1 | tail -1
