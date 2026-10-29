#!/usr/bin/env python3
"""Applies a scrub rule file to a checked-out tree, for a blind-review branch.

Usage: scrub.py <rules file> <tree dir>

The rule file has one rule per line, fields separated by tabs; `#` lines and
blank lines are skipped. Every rule is a no-op when its file or text is
missing, so one file serves the base tree and every candidate tree.

  rm <path>                        delete a file or a directory
  drop <file> <text>               drop every line that contains <text>
  replace <file> <old> <new>       replace every <old> with <new> (<new> may be empty)
  section <file> <start> <end>     delete from the line that starts with <start>
                                   up to (not including) the line that starts with <end>
"""
import shutil
import sys
from pathlib import Path


def log(message: str) -> None:
    print(f"  {message}")


def rule_rm(tree: Path, path: str) -> None:
    target = tree / path
    if target.is_dir():
        shutil.rmtree(target)
        log(f"removed directory {path}")
    elif target.exists():
        target.unlink()
        log(f"removed {path}")


def read(tree: Path, file: str):
    target = tree / file
    if not target.is_file():
        return None, None
    return target, target.read_text(encoding="utf-8")


def rule_drop(tree: Path, file: str, text: str) -> None:
    target, content = read(tree, file)
    if content is None or text not in content:
        return
    kept = [line for line in content.splitlines(keepends=True) if text not in line]
    target.write_text("".join(kept), encoding="utf-8")
    log(f"dropped line(s) containing [{text}] in {file}")


def rule_replace(tree: Path, file: str, old: str, new: str) -> None:
    target, content = read(tree, file)
    if content is None or old not in content:
        return
    target.write_text(content.replace(old, new), encoding="utf-8")
    log(f"replaced [{old}] in {file}")


def rule_section(tree: Path, file: str, start: str, end: str) -> None:
    target, content = read(tree, file)
    if content is None:
        return
    lines = content.splitlines(keepends=True)
    begin = next((i for i, line in enumerate(lines) if line.startswith(start)), None)
    if begin is None:
        return
    stop = next((i for i in range(begin + 1, len(lines)) if lines[i].startswith(end)), None)
    if stop is None:
        return
    del lines[begin:stop]
    target.write_text("".join(lines), encoding="utf-8")
    log(f"removed the section [{start}] in {file}")


RULES = {"rm": (rule_rm, 1), "drop": (rule_drop, 2), "replace": (rule_replace, 3), "section": (rule_section, 3)}


def main() -> None:
    rules_path, tree = Path(sys.argv[1]), Path(sys.argv[2])
    for number, raw in enumerate(rules_path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        fields = raw.rstrip("\n").split("\t")
        kind, args = fields[0], fields[1:]
        if kind not in RULES:
            sys.exit(f"{rules_path}:{number}: unknown rule {kind!r}")
        handler, arity = RULES[kind]
        if kind == "replace" and len(args) == 2:
            args.append("")
        if len(args) != arity:
            sys.exit(f"{rules_path}:{number}: {kind} takes {arity} field(s), got {len(args)}")
        handler(tree, *args)


if __name__ == "__main__":
    main()
