#!/usr/bin/env python3
"""Fetch the transcript of one or more YouTube videos as clean, readable text.

Usage:
    scripts/yt-transcript.py <url-or-id> [<url-or-id> ...]
    scripts/yt-transcript.py --out docs/transcripts <url>

Writes one .txt per video and prints the paths. Prefers a real uploaded caption
track and falls back to YouTube's auto-generated one.

Two sources, in order:

  1. yt-dlp, which pulls YouTube's own caption track. Free, no key, no quota.
  2. transcriptapi.com, if TRANSCRIPT_API_KEY is set in .env or the environment.

The free path runs first and the paid one is only touched when it fails --
YouTube rate-limits (HTTP 429) when hit repeatedly from one address, and some
videos have captions disabled entirely. Both cases fall through automatically.

Setup, if this ever moves to another machine:
    pip3 install --user yt-dlp certifi
"""

import argparse
import html
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

# The Python.org framework build ships without a CA bundle, so yt-dlp's TLS
# verification fails with CERTIFICATE_VERIFY_FAILED unless it is pointed at one.
try:
    import certifi

    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
    os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())
except ImportError:
    pass

TIMESTAMP = re.compile(r"^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->")
TAGS = re.compile(r"<[^>]+>")


def video_id(arg: str) -> str:
    m = re.search(r"(?:v=|youtu\.be/|/shorts/|/embed/)([A-Za-z0-9_-]{11})", arg)
    if m:
        return m.group(1)
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", arg):
        return arg
    raise SystemExit(f"Not a YouTube URL or video id: {arg}")


def parse_vtt(text: str) -> str:
    """Flatten a WebVTT file into prose.

    Auto-generated captions roll: each cue repeats the tail of the previous one
    with one new word appended, so a naive strip yields every phrase five or six
    times. Keeping only lines that are not already the tail of what we have
    collapses that back to what was actually said.
    """
    out: list[str] = []
    for raw in text.splitlines():
        line = TAGS.sub("", raw).strip()
        if not line or TIMESTAMP.match(line) or line.startswith(("WEBVTT", "Kind:", "Language:", "NOTE")):
            continue
        if line.isdigit():
            continue
        line = html.unescape(line)
        if out and (line == out[-1] or line in out[-1]):
            continue
        # A rolling cue often repeats the previous line plus new words -- keep the delta.
        if out and line.startswith(out[-1]):
            line = line[len(out[-1]) :].strip()
            if not line:
                continue
        out.append(line)
    body = " ".join(out)
    body = re.sub(r"\s+", " ", body).strip()
    # One sentence per line reads far better than a single 40 KB paragraph.
    return re.sub(r"(?<=[.!?]) (?=[A-Z])", "\n", body)


def api_key() -> str | None:
    """The key from the environment, else from .env. Never hardcoded, never committed --
    .env is gitignored, and this deliberately has no VITE_ prefix so nothing bundles it."""
    if os.environ.get("TRANSCRIPT_API_KEY"):
        return os.environ["TRANSCRIPT_API_KEY"]
    env = Path(__file__).resolve().parent.parent / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("TRANSCRIPT_API_KEY="):
                return line.split("=", 1)[1].strip().strip("\"'")
    return None


def fetch_via_api(vid: str) -> tuple[str, str] | None:
    """Fallback: transcriptapi.com. Returns (title, body), or None if unavailable."""
    key = api_key()
    if not key:
        return None
    url = f"https://transcriptapi.com/api/v2/youtube/transcript?video_url={vid}&format=json"
    # A real User-Agent is required: Cloudflare rejects Python's default
    # "Python-urllib/3.x" with error 1010 before the request ever reaches the API.
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {key}",
            "User-Agent": "jacked-yt-transcript/1.0",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.load(r)
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError) as e:
        sys.stderr.write(f"    transcriptapi: {e}\n")
        return None
    cues = data.get("transcript") or []
    if not cues:
        return None
    body = " ".join(c.get("text", "").replace("\n", " ") for c in cues)
    body = re.sub(r"\s+", " ", body).strip()
    # The API does not return a title, so the filename falls back to the video id.
    return data.get("title") or vid, re.sub(r"(?<=[.!?]) (?=[A-Z])", "\n", body)


def fetch(vid: str, out_dir: Path) -> Path | None:
    with tempfile.TemporaryDirectory() as tmp:
        cmd = [
            "yt-dlp", "--skip-download",
            "--write-subs", "--write-auto-subs",
            # Only the original English tracks. Asking for "en.*" pulls dozens of
            # machine-translated variants and trips YouTube's rate limiter.
            "--sub-langs", "en,en-orig",
            "--sub-format", "vtt",
            "--print-to-file", "%(title)s", f"{tmp}/title.txt",
            "-o", f"{tmp}/%(id)s.%(ext)s",
            f"https://www.youtube.com/watch?v={vid}",
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        vtts = sorted(Path(tmp).glob("*.vtt"))
        if not vtts:
            sys.stderr.write(f"  yt-dlp found no English captions for {vid}\n")
            for line in res.stderr.strip().splitlines()[-2:]:
                sys.stderr.write(f"    {line}\n")
            fallback = fetch_via_api(vid)
            if not fallback:
                return None
            sys.stderr.write("  falling back to transcriptapi.com\n")
            title, body = fallback
            return write(vid, title, body, out_dir)
        # A hand-written track ("en") beats the auto one ("en-orig") when both exist.
        vtts.sort(key=lambda p: ("orig" in p.name, p.name))
        title_file = Path(tmp) / "title.txt"
        title = title_file.read_text().strip() if title_file.exists() else vid
        body = parse_vtt(vtts[0].read_text(encoding="utf-8", errors="replace"))

    return write(vid, title, body, out_dir)


def write(vid: str, title: str, body: str, out_dir: Path) -> Path:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:60] or vid
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / f"{slug}.txt"
    dest.write_text(
        f"{title}\nhttps://www.youtube.com/watch?v={vid}\n{'-' * 70}\n\n{body}\n",
        encoding="utf-8",
    )
    return dest


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("urls", nargs="+", help="YouTube URLs or 11-character video ids")
    ap.add_argument("--out", default="docs/transcripts", help="where to write (default: docs/transcripts)")
    args = ap.parse_args()

    out_dir = Path(args.out)
    failed = 0
    for arg in args.urls:
        vid = video_id(arg)
        dest = fetch(vid, out_dir)
        if dest:
            words = len(dest.read_text().split())
            print(f"{dest}  ({words:,} words)")
        else:
            failed += 1
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
