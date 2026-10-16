"""API smoke tests against a real session (served from the FastF1 cache after first run)."""

from concurrent.futures import ThreadPoolExecutor
from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import f1_data

client = TestClient(app)
BASE = "/api/v1/sessions/2024/Bahrain/R"
KEY = (2024, 1, "Race")  # (year, round, session name) — see f1_data._session_key


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_session_endpoints_share_one_load():
    f1_data._session_cache.clear()
    paths = ["/results", "/laps", "/weather", "/race-control"]
    with ThreadPoolExecutor(len(paths)) as ex:
        responses = list(ex.map(lambda p: client.get(BASE + p), paths))

    assert [r.status_code for r in responses] == [200] * len(paths)
    assert list(f1_data._session_cache) == [KEY]

    results, _, _, race_control = (r.json() for r in responses)
    assert results["drivers"][0]["driver"]["abbreviation"] == "VER"
    gaps = {d["driver"]["abbreviation"]: d["gap"] for d in results["drivers"]}
    assert gaps["PER"] == "+22.457s"  # FastF1 finisher times are already gaps to the winner
    assert gaps["ZHO"] == "+1 Lap" and gaps["SAR"] == "+2 Laps"
    assert any(m["flag"] == "CHEQUERED" for m in race_control)


def test_event_aliases_share_one_session():
    f1_data._session_cache.clear()
    for alias in ("Bahrain Grand Prix", "bahrain", "Sakhir", "1"):
        assert client.get(f"/api/v1/sessions/2024/{alias}/R/results").status_code == 200
    assert list(f1_data._session_cache) == [KEY]


@pytest.mark.parametrize("path, detail", [
    ("/sessions/2024/Atlantis/R/results", "No event"),  # plain FastF1 fuzzy-matches Australia
    ("/sessions/2024/United States/R/results", "several"),         # Miami, Austin, Las Vegas
    ("/sessions/2024/China/FP3/results", "does not exist"),        # sprint weekend
    ("/sessions/2024/Bahrain/X/results", "Invalid session type"),
    ("/sessions/2099/Bahrain/R/results", "No data for season"),
    ("/seasons?year=2017", "No data for season"),
    ("/sessions/2024/Bahrain/R/telemetry/XXX/0", "No laps for driver"),
    ("/sessions/2024/Bahrain/R/telemetry/VER/999", "has no lap 999"),
])
def test_not_found(path, detail):
    r = client.get("/api/v1" + path)
    assert r.status_code == 404
    assert detail in r.json()["detail"]


def test_current_season_listed():
    year = date.today().year
    assert client.get(f"/api/v1/seasons?year={year}").json()[0]["year"] == year


def test_telemetry_upgrades_cached_session():
    client.get(BASE + "/results")
    assert client.get(BASE + "/track-outline").status_code == 200

    session, has_telemetry = f1_data._session_cache[KEY]
    assert has_telemetry
    client.get(BASE + "/weather")
    assert f1_data._session_cache[KEY][0] is session
