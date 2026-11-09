#!/usr/bin/env bash
# Authors a course one chapter at a time with Codex, each chapter validated before the next starts.
# Usage: scripts/author-course.sh <course-id> <first-chapter> <last-chapter>
set -u
id="$1"; first="$2"; last="$3"
cd "$(dirname "$0")/.."
logdir="docs/prompts/logs"; mkdir -p "$logdir"

for n in $(seq "$first" "$last"); do
  ch=$(printf "%02d" "$n")
  file="content-src/$id/chapter-$ch.json"
  for attempt in 1 2; do
    prompt="$logdir/$id-$ch.prompt.md"
    {
      cat docs/prompts/content-chapter.md
      echo
      echo "## This job"
      echo "Course brief: docs/prompts/content-$id.md (for its course-specific rules only)."
      echo "Course folder: content-src/$id/. Course id: $id."
      echo "Write chapter $n of 6: $file. Section id: \"c$ch\". Number units continuously:"
      echo "chapter $n holds units $(( (n-1)*5+1 )) to $(( n*5 )) of the plan, with ids like \"u$(printf "%02d" $(( (n-1)*5+1 )))\"."
      if [ "$attempt" = 2 ]; then
        echo
        echo "A previous attempt failed validation. The current file may be partial. Fix or finish it."
      fi
    } > "$prompt"
    codex exec -C "$(pwd -W)" --sandbox workspace-write -c approval_policy="never" --skip-git-repo-check \
      --output-last-message "$logdir/$id-$ch.report.txt" - < "$prompt" > "$logdir/$id-$ch.log" 2>&1
    code=$?
    if grep -qiE "usage limit|hit your" "$logdir/$id-$ch.log"; then
      echo "$id chapter $ch: QUOTA EXHAUSTED"; exit 3
    fi
    if [ -f "$file" ] && npm run -s course -- "$id" >/dev/null 2>&1 && npm run -s validate -- "$id" > "$logdir/$id-$ch.validate.txt" 2>&1; then
      echo "$id chapter $ch ok (exit $code): $(head -1 "$logdir/$id-$ch.validate.txt")"
      break
    fi
    echo "$id chapter $ch attempt $attempt FAILED (exit $code): $(head -1 "$logdir/$id-$ch.validate.txt" 2>/dev/null)"
    if [ "$attempt" = 2 ]; then exit 4; fi
  done
done
echo "$id done"
