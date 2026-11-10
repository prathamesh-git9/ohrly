#!/usr/bin/env bash
# Converts the English course (de-en) to American English one chapter at a time, resumably.
cd "$(dirname "$0")/.."
logdir="docs/prompts/logs"; mkdir -p "$logdir"
for f in content-src/de-en/chapter-*.json content-src/de-en/exam-*.json; do
  name=$(basename "$f" .json); stamp="$logdir/de-en-$name.us.done"
  [ -f "$stamp" ] && { echo "$name already American"; continue; }
  prompt="$logdir/de-en-$name.us.prompt.md"
  { cat docs/prompts/american.md; echo; echo "File: $f"; } > "$prompt"
  codex exec -C "$(pwd -W)" --sandbox workspace-write -c approval_policy="never" --skip-git-repo-check \
    --output-last-message "$logdir/de-en-$name.us.report.txt" - < "$prompt" > "$logdir/de-en-$name.us.log" 2>&1
  if grep -qiE "usage limit|hit your" "$logdir/de-en-$name.us.log"; then echo "QUOTA EXHAUSTED at $name"; exit 3; fi
  npm run -s course -- de-en >/dev/null 2>&1
  if npm run -s validate -- de-en > "$logdir/de-en-$name.us.validate.txt" 2>&1; then touch "$stamp"; echo "$name ok"; else echo "$name LEFT ERRORS: $(head -1 "$logdir/de-en-$name.us.validate.txt")"; exit 4; fi
done
echo "de-en is American"
