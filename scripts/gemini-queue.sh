#!/usr/bin/env bash
# Writes chapters one at a time through Gemini, stopping at the first failure.
# Usage: scripts/gemini-queue.sh en-de:6 de-en:5 de-en:6
cd "$(dirname "$0")/.."
export PYTHONIOENCODING=utf-8
for job in "$@"; do
  id="${job%%:*}"; n="${job##*:}"
  file="content-src/$id/chapter-$(printf "%02d" "$n").json"
  if [ -f "$file" ]; then echo "$job already exists, skipping"; continue; fi
  echo "$(date +%H:%M) starting $job"
  if ! .venv/Scripts/python.exe -W ignore scripts/gemini_chapter.py "$id" "$n" 2>&1 | tail -7 | cut -c1-260; then exit 1; fi
  if [ ! -f "$file" ]; then echo "$job FAILED"; exit 1; fi
  echo "$(date +%H:%M) finished $job"
done
echo "queue done"
