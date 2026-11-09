#!/usr/bin/env python3
"""Build Ohrly's static speech files with Piper and ffmpeg.

Python 3.12, standard library only. Piper itself is invoked through the Python
interpreter supplied by --piper-python; it is not an application dependency.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
COURSES_DIR = ROOT / "src" / "content" / "courses"
AUDIO_DIR = ROOT / "public" / "audio"
OUTER_PUNCTUATION = '.,!?;:"“”„«»¿¡()'


def audio_key(text: str) -> str:
    """Match audioKey() in src/audio/speech.ts exactly."""
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text).strip())


def tokenize(text: str) -> list[str]:
    """Match the tile-oriented behavior of tokenize() in src/domain/check.ts."""
    return [token for part in re.split(r"\s+", text) if (token := part.strip(OUTER_PUNCTUATION))]


def legacy_example_target(example: str) -> str:
    """Tolerate course drafts from before tip examples became objects."""
    for separator in (" — ", " – "):
        if separator in example:
            return example.split(separator, 1)[0]
    return example


def collect_spoken() -> dict[str, set[str]]:
    spoken: dict[str, set[str]] = defaultdict(set)

    def add(lang: str, value: Any) -> None:
        if isinstance(value, str):
            key = audio_key(value)
            if key:
                spoken[lang].add(key)

    for course_path in sorted(COURSES_DIR.glob("*.json")):
        with course_path.open("r", encoding="utf-8") as handle:
            course = json.load(handle)
        lang = course.get("to")
        if not isinstance(lang, str):
            raise ValueError(f"{course_path}: missing string 'to' language")
        for exam in course.get("exams", []):
            for passage in exam.get("listening", []):
                add(lang, passage.get("text"))
        for section in course.get("sections", []):
            for unit in section.get("units", []):
                for word in unit.get("words", []):
                    add(lang, word.get("target"))
                    add(lang, word.get("plural"))

                for passage in unit.get("passages", []):
                    if passage.get("kind") == "listening":
                        add(lang, passage.get("text"))

                tip = unit.get("tip", {})
                for example in tip.get("examples", []):
                    if isinstance(example, dict):
                        add(lang, example.get("target"))
                    elif isinstance(example, str):
                        add(lang, legacy_example_target(example))

                for sentence in unit.get("sentences", []):
                    target = sentence.get("target")
                    add(lang, target)
                    if isinstance(target, str):
                        tokens = tokenize(target)
                        for token in tokens:
                            add(lang, token)
                        if tokens:
                            add(lang, tokens[0].lower())
                    cloze = sentence.get("cloze")
                    if isinstance(cloze, dict):
                        add(lang, cloze.get("answer"))
    return spoken


def file_name(key: str) -> str:
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16] + ".mp3"


def voice_model(voices_dir: Path, voice: str) -> Path:
    candidate = voices_dir / voice
    if candidate.suffix != ".onnx":
        candidate = candidate.with_suffix(".onnx")
    return candidate


def piper_base(python: str, model: Path, speaker: int | None) -> list[str]:
    command = [python, "-m", "piper", "-m", str(model)]
    if speaker is not None:
        command.extend(["--speaker", str(speaker)])
    return command


def run_checked(command: list[str], *, input_text: str | None = None) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command,
            input=input_text,
            text=True,
            encoding="utf-8",
            capture_output=True,
            check=True,
        )
    except subprocess.CalledProcessError as error:
        detail = (error.stderr or error.stdout or "").strip()
        raise RuntimeError(f"Command failed: {' '.join(command)}\n{detail}") from error


def ffmpeg_convert(ffmpeg: str, wav: Path, output: Path) -> None:
    filters = (
        "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB:"
        "stop_periods=-1:stop_silence=0.08:stop_threshold=-45dB,"
        "loudnorm=I=-18:TP=-1.5:LRA=11"
    )
    run_checked(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(wav),
            "-af",
            filters,
            "-ac",
            "1",
            "-ar",
            "22050",
            "-b:a",
            "48k",
            str(output),
        ]
    )


def piper_output_dir_flag(python: str) -> str | None:
    """Use Piper's one-process, one-line-per-file mode when this CLI provides it."""
    try:
        result = subprocess.run(
            [python, "-m", "piper", "--help"],
            text=True,
            encoding="utf-8",
            errors="replace",
            capture_output=True,
            check=False,
        )
    except OSError:
        return None
    help_text = result.stdout + result.stderr
    if "--output-dir" in help_text:
        return "--output-dir"
    if "--output_dir" in help_text:
        return "--output_dir"
    return None


def generate_batch(
    items: list[tuple[str, Path]],
    python: str,
    model: Path,
    speaker: int | None,
    ffmpeg: str,
) -> None:
    """Generate all items with one model load, each to its own named file."""
    with tempfile.TemporaryDirectory(prefix="ohrly-piper-") as temp_name:
        temp = Path(temp_name)
        wavs = [temp / f"{index}.wav" for index in range(len(items))]
        jobs = [[key, str(wav)] for (key, _), wav in zip(items, wavs, strict=True)]
        worker = Path(__file__).with_name("piper_worker.py")
        command = [python, str(worker), str(model), "none" if speaker is None else str(speaker)]
        run_checked(command, input_text=json.dumps(jobs, ensure_ascii=False))
        for wav, (_, output) in zip(wavs, items, strict=True):
            ffmpeg_convert(ffmpeg, wav, output)


def total_bytes(paths: Iterable[Path]) -> int:
    return sum(path.stat().st_size for path in paths if path.exists())


def human_size(size: int) -> str:
    value = float(size)
    for unit in ("B", "KiB", "MiB", "GiB"):
        if value < 1024 or unit == "GiB":
            return f"{value:.1f} {unit}" if unit != "B" else f"{int(value)} B"
        value /= 1024
    return f"{size} B"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--voices-dir", type=Path, default=ROOT / "voices", help="Directory containing Piper .onnx models")
    parser.add_argument("--piper-python", default=sys.executable, help="Python interpreter from the piper-tts environment")
    parser.add_argument("--ffmpeg", default="ffmpeg", help="ffmpeg executable")
    parser.add_argument("--de-voice", default="de_DE-thorsten-high")
    parser.add_argument("--de-speaker", type=int, default=None, help="Speaker number, for multi-speaker voices only")
    parser.add_argument("--en-voice", default="en_GB-cori-high")
    parser.add_argument("--en-speaker", type=int, default=None)
    parser.add_argument("--lang", choices=("de", "en"), help="Only process one target language")
    parser.add_argument("--limit", type=int, help="Generate at most N missing files across this run")
    parser.add_argument("--dry-run", action="store_true", help="Print planned work without changing files or running tools")
    args = parser.parse_args()
    if args.limit is not None and args.limit < 0:
        parser.error("--limit must be zero or greater")
    return args


def main() -> int:
    args = parse_args()
    spoken = collect_spoken()
    languages = [args.lang] if args.lang else sorted(spoken)
    remaining = args.limit
    totals = {"referenced": 0, "generated": 0, "skipped": 0, "deleted": 0}

    if not args.dry_run and shutil.which(args.ffmpeg) is None:
        raise FileNotFoundError(f"ffmpeg executable not found: {args.ffmpeg}")

    for lang in languages:
        keys = sorted(spoken.get(lang, set()))
        lang_dir = AUDIO_DIR / lang
        expected = {file_name(key) for key in keys}
        totals["referenced"] += len(keys)
        existing = set(lang_dir.glob("*.mp3")) if lang_dir.exists() else set()
        stale = sorted(path for path in existing if path.name not in expected)

        for path in stale:
            print(f"[{lang}] delete {path.name}")
            if not args.dry_run:
                path.unlink()
            totals["deleted"] += 1

        missing = [(key, lang_dir / file_name(key)) for key in keys if not (lang_dir / file_name(key)).exists()]
        totals["skipped"] += len(keys) - len(missing)
        selected = missing if remaining is None else missing[:remaining]
        if remaining is not None:
            remaining = max(0, remaining - len(selected))

        if args.dry_run:
            for key, output in selected:
                print(f"[{lang}] generate {output.name}: {key}")
            totals["generated"] += len(selected)
        elif selected:
            lang_dir.mkdir(parents=True, exist_ok=True)
            voice = args.de_voice if lang == "de" else args.en_voice
            speaker = args.de_speaker if lang == "de" else args.en_speaker
            model = voice_model(args.voices_dir, voice)
            if not model.is_file():
                raise FileNotFoundError(f"Piper model not found: {model}")
            print(f"[{lang}] loading {voice} once for {len(selected)} files")
            generate_batch(selected, args.piper_python, model, speaker, args.ffmpeg)
            totals["generated"] += len(selected)

        if not args.dry_run:
            lang_dir.mkdir(parents=True, exist_ok=True)
            manifest = {key: file_name(key) for key in keys if (lang_dir / file_name(key)).exists()}
            with (lang_dir / "manifest.json").open("w", encoding="utf-8", newline="\n") as handle:
                json.dump(manifest, handle, ensure_ascii=False, indent=2, sort_keys=True)
                handle.write("\n")

        lang_size = total_bytes(lang_dir / name for name in expected)
        print(
            f"[{lang}] {len(keys)} referenced, {len(selected)} "
            f"{'planned' if args.dry_run else 'generated'}, {len(keys) - len(missing)} skipped, "
            f"{len(stale)} stale, {human_size(lang_size)} present"
        )

    selected_paths = [
        AUDIO_DIR / lang / file_name(key)
        for lang in languages
        for key in spoken.get(lang, set())
    ]
    print(
        f"Total: {totals['referenced']} referenced, {totals['generated']} "
        f"{'planned' if args.dry_run else 'generated'}, {totals['skipped']} skipped, "
        f"{totals['deleted']} stale, {human_size(total_bytes(selected_paths))} present"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1) from error
