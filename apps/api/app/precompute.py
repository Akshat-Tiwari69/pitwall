"""Warm the FastF1 disk cache for a season, so sessions open fast later.

Usage (from apps/api):
    .venv/Scripts/python -m app.precompute 2024                     # every race and qualifying
    .venv/Scripts/python -m app.precompute 2024 --sessions R,Q,S    # pick session types
    .venv/Scripts/python -m app.precompute 2024 --event "Bahrain Grand Prix"

A cold race download is large and slow; running this once ahead of time means the API
only reads from disk. Sessions that fail (e.g. F1's archive login since Oct 2026,
theOehrly/Fast-F1#978) are reported and skipped, never fatal.
"""

import argparse
import logging
import time

from fastf1.exceptions import DataNotLoadedError

from app.services.f1_data import NO_TIMING_DATA, NotFoundError, _get_session, _schedule


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("year", type=int)
    parser.add_argument("--sessions", default="R,Q", help="comma-separated types (default R,Q)")
    parser.add_argument("--event", help="only this event (exact name, country, location or round)")
    args = parser.parse_args(argv)
    logging.getLogger("fastf1").setLevel(logging.ERROR)

    events = [args.event] if args.event else list(_schedule(args.year)["EventName"])
    ok = failed = 0
    for event in events:
        for stype in args.sessions.split(","):
            label = f"{args.year} {event} {stype}"
            start = time.perf_counter()
            try:
                session = _get_session(args.year, event, stype, load_telemetry=True)
                n_laps = len(session.laps)  # raises if the timing data didn't load
            except NotFoundError as e:  # not run yet, or no such session that weekend
                print(f"skip  {label}: {e}")
                continue
            except DataNotLoadedError:
                failed += 1
                print(f"FAIL  {label}: {NO_TIMING_DATA}")
                continue
            except Exception as e:
                failed += 1
                print(f"FAIL  {label}: {type(e).__name__}: {e}")
                continue
            ok += 1
            print(f"ok    {label}: {n_laps} laps in {time.perf_counter() - start:.1f}s")

    print(f"\n{ok} warmed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
