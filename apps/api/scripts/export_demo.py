"""Export API responses for a few sessions as static JSON for the online demo.

The demo (GitHub Pages) can't run the API: F1's live-timing servers reject cloud IPs, so
it serves a snapshot of sessions already in the local FastF1 cache instead. The web app
reads these files when built with VITE_STATIC_DATA=true (see apps/web/src/services/api.ts).

Usage (from apps/api):  .venv/Scripts/python -m scripts.export_demo <output dir>
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

# (year, event name, session) — must already be in app/f1_cache to export offline.
DEMO_SESSIONS = [
    (2024, "Bahrain Grand Prix", "Q"),
    (2024, "Bahrain Grand Prix", "R"),
    (2024, "Saudi Arabian Grand Prix", "R"),
    (2025, "Australian Grand Prix", "R"),
]
SESSION_FILES = ["results", "laps", "weather", "race-control", "track-outline"]

client = TestClient(app)


def slug(name: str) -> str:
    """Must match slug() in apps/web/src/services/api.ts."""
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def fetch(path: str):
    r = client.get("/api/v1" + path)
    r.raise_for_status()
    return r.json()


def write(out: Path, rel: str, data) -> None:
    path = out / f"{rel}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")


def main(out: Path) -> None:
    wanted = defaultdict(set)  # year -> {(event, session type)}
    for year, event, stype in DEMO_SESSIONS:
        wanted[year].add((event, stype))
        base = f"/sessions/{year}/{event}/{stype}"
        dest = f"sessions/{year}/{slug(event)}/{stype}"
        for name in SESSION_FILES:
            write(out, f"{dest}/{name}", fetch(f"{base}/{name}"))

        # Fastest lap per driver only; every lap of every driver would be ~60 MB a race.
        drivers = [d["driver"]["abbreviation"] for d in fetch(f"{base}/results")["drivers"]]
        for drv in drivers:
            r = client.get(f"/api/v1{base}/telemetry/{drv}/0")
            if r.status_code == 200:  # drivers without a timed lap have nothing to show
                write(out, f"{dest}/telemetry/{drv}", r.json())
        print(f"exported {year} {event} {stype} ({len(drivers)} drivers)")

    # Seasons trimmed to the exported sessions, so the selector only offers what exists.
    for year, pairs in wanted.items():
        seasons = fetch(f"/seasons?year={year}")
        for season in seasons:
            season["events"] = [
                {**ev, "sessions": [s for s in ev["sessions"] if (ev["name"], s["type"]) in pairs]}
                for ev in season["events"]
                if any(ev["name"] == e for e, _ in pairs)
            ]
        write(out, f"seasons/{year}", seasons)
    write(out, "years", sorted(wanted, reverse=True))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
