#!/usr/bin/env bash
# Finishes A1 for one course: the remaining chapters, every audit, then the A1 practice exam.
# Usage: scripts/finish-a1.sh <course-id>
set -u
id="$1"
cd "$(dirname "$0")/.."
for n in 5 6; do
  if [ ! -f "content-src/$id/chapter-0$n.json" ]; then
    scripts/author-course.sh "$id" "$n" "$n" || exit $?
  fi
done
scripts/audit-course.sh "$id" 1 6 || exit $?
if [ ! -f "content-src/$id/exam-A1.json" ]; then
  scripts/author-level.sh "$id" A1 || exit $?
fi
echo "$id A1 finished"
