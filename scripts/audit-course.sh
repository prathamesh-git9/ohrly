#!/usr/bin/env bash
# Audits finished chapters with Codex, one independent job per chapter. Safe to re-run: a chapter whose
# audit already completed is skipped, so a quota stop loses nothing.
# Usage: scripts/audit-course.sh <course-id> <first-chapter> <last-chapter>
set -u
id="$1"; first="$2"; last="$3"
cd "$(dirname "$0")/.."
logdir="docs/prompts/logs"; mkdir -p "$logdir"
for n in $(seq "$first" "$last"); do
  ch=$(printf "%02d" "$n")
  stamp="$logdir/$id-$ch.audit.done"
  if [ -f "$stamp" ]; then echo "$id audit $ch already done"; continue; fi
  prompt="$logdir/$id-$ch.audit.prompt.md"
  { cat docs/prompts/audit.md; echo; echo "Course id: $id. Chapter file: content-src/$id/chapter-$ch.json."; } > "$prompt"
  codex exec -C "$(pwd -W)" --sandbox workspace-write -c approval_policy="never" --skip-git-repo-check \
    --output-last-message "$logdir/$id-$ch.audit.report.txt" - < "$prompt" > "$logdir/$id-$ch.audit.log" 2>&1
  code=$?
  if grep -qiE "usage limit|hit your" "$logdir/$id-$ch.audit.log"; then
    npm run -s course -- "$id" >/dev/null 2>&1
    echo "$id audit $ch: QUOTA EXHAUSTED"; exit 3
  fi
  npm run -s course -- "$id" >/dev/null 2>&1
  if npm run -s validate -- "$id" > "$logdir/$id-$ch.audit.validate.txt" 2>&1; then
    touch "$stamp"
    echo "$id audit $ch ok (exit $code): $(head -1 "$logdir/$id-$ch.audit.validate.txt")"
  else
    echo "$id audit $ch LEFT ERRORS (exit $code): $(head -1 "$logdir/$id-$ch.audit.validate.txt")"; exit 4
  fi
done
echo "$id audit done"
