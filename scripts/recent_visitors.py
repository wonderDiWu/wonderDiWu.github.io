#!/usr/bin/env python3
"""Print the locally synced visitor JSONL in a compact table."""

import json
from pathlib import Path
import sys

log_file = Path(__file__).resolve().parents[1] / "visitor-logs" / "latest.jsonl"
if not log_file.exists():
    raise SystemExit("No local log yet. Run: python3 scripts/sync_visitors.py")

print(f"{'TIME':16}  {'IP':39}  {'CC':2}  {'CITY':18}  PATH")
with log_file.open(encoding="utf-8") as stream:
    for line in stream:
        try:
            record = json.loads(line)
            time = str(record.get("time", "")).replace("T", " ")[:16]
            print(f"{time:16}  {str(record.get('ip', '')):39}  {str(record.get('country', '')):2}  {str(record.get('city', ''))[:18]:18}  {record.get('path', '')}")
        except (json.JSONDecodeError, TypeError) as error:
            print(f"Skipping invalid line: {error}", file=sys.stderr)
