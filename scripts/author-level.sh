#!/usr/bin/env bash
# Authors, audits and examines one CEFR level of a course with Codex, stopping at the first failure.
# Usage: scripts/author-level.sh <course-id> <level: A1|A2|B1|B2>
# A1 chapters are 1-6 and already written, so A1 only gets its exam.
set -u
id="$1"; level="$2"
cd "$(dirname "$0")/.."
logdir="docs/prompts/logs"; mkdir -p "$logdir"
win="$(pwd -W)"

case "$level" in
  A1) first=0;  last=-1 ;;
  A2) first=7;  last=12 ;;
  B1) first=13; last=18 ;;
  B2) first=19; last=24 ;;
  *) echo "unknown level $level"; exit 2 ;;
esac

vocab="$logdir/$id-taught.txt"
# Writing, auditing and exams use the default model. A repair round only fixes validator errors, so it
# uses the cheaper model at low effort to save quota.
CHEAP=(-m gpt-5.6-luna -c model_reasoning_effort="low")
run_codex() { # prompt report log [cheap]
  local extra=()
  [ "${4:-}" = cheap ] && extra=("${CHEAP[@]}")
  codex exec "${extra[@]}" -C "$win" --sandbox workspace-write -c approval_policy="never" --skip-git-repo-check \
    --output-last-message "$2" - < "$1" > "$3" 2>&1
  local code=$?
  if grep -qiE "usage limit|hit your" "$3"; then echo "$id $level: QUOTA EXHAUSTED"; exit 3; fi
  return $code
}
valid() { # output-file
  npm run -s course -- "$id" >/dev/null 2>&1 && npm run -s validate -- "$id" > "$1" 2>&1
}

for n in $(seq "$first" "$last"); do
  ch=$(printf "%02d" "$n")
  file="content-src/$id/chapter-$ch.json"
  local_ch=$(( (n - 1) % 6 + 1 ))
  ustart=$(( (n - 1) * 5 + 1 ))
  if [ -f "$file" ] && valid "$logdir/$id-$ch.validate.txt"; then
    echo "$id chapter $ch already valid, skipping"
    continue
  fi
  for attempt in 1 2; do
    npm run -s vocab -- "$id" > "$vocab" 2>/dev/null
    prompt="$logdir/$id-$ch.prompt.md"
    {
      cat docs/prompts/content-upper.md
      echo; echo "## This job"
      echo "Course brief: docs/prompts/content-$id.md (course-specific rules only). Course id: $id."
      echo "Taught-words file: $vocab. Level: $level. Plan: chapter $local_ch of $level in docs/RESEARCH-LEVELS.md."
      echo "Write $file. Section id \"c$ch\", cefr \"$level\". Unit ids \"u$(printf "%03d" $ustart)\" to \"u$(printf "%03d" $(( ustart + 4 )))\"; word, sentence and passage ids are prefixed by them."
      [ "$attempt" = 2 ] && { echo; echo "A previous attempt failed validation. The file may be partial. Fix or finish it."; }
    } > "$prompt"
    run_codex "$prompt" "$logdir/$id-$ch.report.txt" "$logdir/$id-$ch.log" "$([ "$attempt" = 2 ] && echo cheap)"
    if [ -f "$file" ] && valid "$logdir/$id-$ch.validate.txt"; then
      echo "$id chapter $ch ok: $(head -1 "$logdir/$id-$ch.validate.txt")"; break
    fi
    echo "$id chapter $ch attempt $attempt FAILED: $(head -1 "$logdir/$id-$ch.validate.txt" 2>/dev/null)"
    [ "$attempt" = 2 ] && exit 4
  done

  prompt="$logdir/$id-$ch.audit.prompt.md"
  { cat docs/prompts/audit.md; echo; echo "Also audit the passages: each question has one defensible answer in the text."; echo "Course id: $id. Chapter file: $file."; } > "$prompt"
  run_codex "$prompt" "$logdir/$id-$ch.audit.report.txt" "$logdir/$id-$ch.audit.log"
  if ! valid "$logdir/$id-$ch.audit.validate.txt"; then
    echo "$id audit $ch LEFT ERRORS: $(head -1 "$logdir/$id-$ch.audit.validate.txt")"; exit 4
  fi
  echo "$id audit $ch ok: $(head -1 "$logdir/$id-$ch.audit.validate.txt")"
done

exam="content-src/$id/exam-$level.json"
for attempt in 1 2; do
  npm run -s vocab -- "$id" > "$vocab" 2>/dev/null
  prompt="$logdir/$id-exam-$level.prompt.md"
  {
    cat docs/prompts/content-exam.md
    echo; echo "## This job"
    echo "Course id: $id. Course brief: docs/prompts/content-$id.md. Taught-words file: $vocab."
    echo "Level: $level. Write $exam."
    [ "$attempt" = 2 ] && { echo; echo "A previous attempt failed validation. Fix or finish the file."; }
  } > "$prompt"
  run_codex "$prompt" "$logdir/$id-exam-$level.report.txt" "$logdir/$id-exam-$level.log" "$([ "$attempt" = 2 ] && echo cheap)"
  if [ -f "$exam" ] && valid "$logdir/$id-exam-$level.validate.txt"; then
    echo "$id exam $level ok: $(head -1 "$logdir/$id-exam-$level.validate.txt")"; break
  fi
  echo "$id exam $level attempt $attempt FAILED: $(head -1 "$logdir/$id-exam-$level.validate.txt" 2>/dev/null)"
  [ "$attempt" = 2 ] && exit 4
done
echo "$id $level done"
