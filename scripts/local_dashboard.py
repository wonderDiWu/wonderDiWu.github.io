#!/usr/bin/env python3
"""Serve the private visitor dashboard on localhost only."""

import argparse
import json
import shutil
import subprocess
import threading
import webbrowser
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
LOG_FILE = ROOT / "visitor-logs" / "latest.jsonl"
SOURCE_HTML = ROOT / "_local-dashboard" / "dashboard.html.template"
DASHBOARD_DIR = ROOT / "visitor-dashboard"
DASHBOARD_HTML = DASHBOARD_DIR / "index.html"
SYNC_COMMAND = (str(ROOT / "sync-visitors.sh"),)
SYNC_LOCK = threading.Lock()
STATE = {"warning": "", "last_sync": None, "syncing": False}


def sync_logs():
    """Run only the fixed, trusted sync command and retain old data on failure."""
    with SYNC_LOCK:
        STATE["syncing"] = True
        try:
            result = subprocess.run(SYNC_COMMAND, cwd=ROOT, capture_output=True, text=True, timeout=180)
            if result.returncode:
                message = (result.stderr or result.stdout or "Unknown sync error").strip()
                STATE["warning"] = f"Cloudflare sync failed; showing existing local data. {message}"
                return False
            STATE["warning"] = ""
            STATE["last_sync"] = datetime.now(timezone.utc).isoformat()
            return True
        except (OSError, subprocess.TimeoutExpired) as error:
            STATE["warning"] = f"Cloudflare sync failed; showing existing local data. {error}"
            return False
        finally:
            STATE["syncing"] = False


def load_visitors():
    records, malformed, seen = [], 0, set()
    if LOG_FILE.exists():
        with LOG_FILE.open(encoding="utf-8") as stream:
            for line in stream:
                try:
                    record = json.loads(line)
                    if not isinstance(record, dict):
                        raise ValueError("record is not an object")
                    signature = json.dumps(record, sort_keys=True, ensure_ascii=False)
                    if signature not in seen:
                        seen.add(signature)
                        records.append(record)
                except (json.JSONDecodeError, TypeError, ValueError):
                    malformed += 1
    records.sort(key=lambda item: str(item.get("time", "")), reverse=True)
    last_sync = STATE["last_sync"]
    if last_sync is None and LOG_FILE.exists():
        last_sync = datetime.fromtimestamp(LOG_FILE.stat().st_mtime, timezone.utc).isoformat()
    return {"visitors": records, "lastSynced": last_sync, "warning": STATE["warning"], "malformedLines": malformed}


class DashboardHandler(BaseHTTPRequestHandler):
    server_version = "LocalVisitorDashboard/1.0"

    def _allowed_host(self):
        host = self.headers.get("Host", "").split(":", 1)[0]
        return host in {"127.0.0.1", "localhost"}

    def _send(self, status, body, content_type):
        payload = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(payload)

    def _json(self, status, value):
        self._send(status, json.dumps(value, ensure_ascii=False), "application/json; charset=utf-8")

    def do_GET(self):
        if not self._allowed_host():
            self._send(403, "Forbidden", "text/plain; charset=utf-8")
            return
        path = urlsplit(self.path).path
        if path in {"/", "/index.html"}:
            self._send(200, DASHBOARD_HTML.read_bytes(), "text/html; charset=utf-8")
        elif path == "/api/visitors":
            self._json(200, load_visitors())
        else:
            self._send(404, "Not found", "text/plain; charset=utf-8")

    def do_POST(self):
        if not self._allowed_host() or self.headers.get("X-Dashboard-Request") != "refresh":
            self._json(403, {"error": "Forbidden"})
            return
        if urlsplit(self.path).path != "/api/refresh":
            self._json(404, {"error": "Not found"})
            return
        success = sync_logs()
        response = load_visitors()
        response["success"] = success
        self._json(200 if success else 502, response)

    def log_message(self, fmt, *args):
        print(f"[dashboard] {self.address_string()} - {fmt % args}")


def prepare_dashboard():
    DASHBOARD_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(SOURCE_HTML, DASHBOARD_HTML)


def make_server(preferred_port):
    ports = [preferred_port] if preferred_port == 0 else range(preferred_port, preferred_port + 20)
    last_error = None
    for port in ports:
        try:
            return ThreadingHTTPServer(("127.0.0.1", port), DashboardHandler)
        except OSError as error:
            last_error = error
    raise SystemExit(f"Could not bind a localhost dashboard port: {last_error}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--skip-sync", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    prepare_dashboard()
    if not args.skip_sync:
        sync_logs()
    server = make_server(args.port)
    url = f"http://127.0.0.1:{server.server_address[1]}/"
    print(f"Visitor dashboard: {url}")
    print("Press Ctrl+C to stop the local server.")
    if not args.no_browser:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nDashboard stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
