#!/usr/bin/env python3
"""Sync private Workers KV visit entries into visitor-logs/latest.jsonl."""

import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
WORKER = ROOT / "worker"
OUTPUT = ROOT / "visitor-logs" / "latest.jsonl"


def wrangler(*arguments):
    command = ["npx", "wrangler", *arguments, "--binding", "VISITOR_LOGS", "--remote"]
    result = subprocess.run(command, cwd=WORKER, check=True, capture_output=True, text=True)
    return result.stdout


def write_jsonl(records):
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(".tmp")
    with temporary.open("w", encoding="utf-8") as stream:
        for record in sorted(records, key=lambda item: item.get("time", ""), reverse=True):
            stream.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
    os.replace(temporary, OUTPUT)


def main():
    try:
        keys = json.loads(wrangler("kv", "key", "list", "--prefix", "visits/"))
        records = []
        for item in keys:
            try:
                records.append(json.loads(wrangler("kv", "key", "get", item["name"], "--text")))
            except (json.JSONDecodeError, KeyError) as error:
                print(f"Skipping invalid KV entry: {error}", file=sys.stderr)
        write_jsonl(records)
        print(f"Wrote {len(records)} visits to {OUTPUT}")
    except subprocess.CalledProcessError as error:
        print(error.stderr or error.stdout, file=sys.stderr)
        raise SystemExit(error.returncode)


if __name__ == "__main__":
    main()
