"""FastF1 Data Service layer."""

import logging
import math
import os
from collections import OrderedDict
from datetime import date
from functools import lru_cache
from threading import Lock
from typing import Dict, List, Optional

import fastf1
import pandas as pd

from app.core.config import get_settings
from app.models.f1 import (
    CircuitInfo,
    Corner,
    Driver,
    DriverResult,
    Event,
    LapData,
    MultiDriverTelemetry,
    RaceControlMessage,
    Season,
    SessionInfo,
    SessionResults,
    TelemetryDataset,
    TrackPoint,
    WeatherData,
)

log = logging.getLogger(__name__)

settings = get_settings()
os.makedirs(settings.fastf1_cache_dir, exist_ok=True)
fastf1.Cache.enable_cache(settings.fastf1_cache_dir)

pd.options.mode.chained_assignment = None


class NotFoundError(Exception):
    """The requested season, event, session, driver or lap doesn't exist (→ HTTP 404)."""


# Module-level LRU session cache — keeps last 5 loaded sessions in memory.
# (year, round, session name) -> (session, has_telemetry)
_session_cache: OrderedDict = OrderedDict()
_session_lock = Lock()
_load_lock = Lock()
_SESSION_CACHE_MAX = 5

# Module-level telemetry cache — keyed by (session key, driver(s), lap).
_tel_cache: dict = {}
_tel_lock = Lock()
_TEL_CACHE_MAX = 30


# ponytail: cached for the process lifetime; a restart picks up calendar changes mid-season.
@lru_cache(maxsize=None)
def _schedule(year: int):
    if not settings.fastf1_min_year <= year <= date.today().year:
        raise NotFoundError(
            f"No data for season {year} (available: {settings.fastf1_min_year}–{date.today().year})"
        )
    return fastf1.get_event_schedule(year, include_testing=False)


def _resolve(year: int, event: str, session_type: str):
    """Resolve an event (exact name, country, location or round number) to an unloaded session.

    FastF1's own lookup is fuzzy and happily maps "Atlantis" to Australia, so match strictly.
    """
    schedule = _schedule(year)
    query = event.strip().lower()
    if query.isdigit():
        matches = schedule[schedule['RoundNumber'] == int(query)]
    else:
        names = schedule[['EventName', 'Country', 'Location']].apply(lambda col: col.str.lower())
        matches = schedule[(names == query).any(axis=1)]

    if matches.empty:
        raise NotFoundError(f"No event '{event}' in {year}")
    if len(matches) > 1:
        raise NotFoundError(f"'{event}' matches several {year} events; use the full event name")

    ev = schedule.get_event_by_round(int(matches.iloc[0]['RoundNumber']))
    try:
        session = ev.get_session(session_type)
    except ValueError as e:  # unknown session type, or e.g. FP3 on a sprint weekend
        raise NotFoundError(str(e)) from e

    if session.date > pd.Timestamp.now(tz='UTC').tz_localize(None):
        raise NotFoundError(f"{year} {ev['EventName']} {session.name} hasn't taken place yet")
    return session


def _session_key(session) -> tuple:
    return (session.event.year, int(session.event['RoundNumber']), session.name)


def _cached_session(key, load_telemetry: bool):
    with _session_lock:
        entry = _session_cache.get(key)
        if entry and (entry[1] or not load_telemetry):
            _session_cache.move_to_end(key)
            return entry[0]
    return None


def _get_session(year: int, event: str, session_type: str, load_telemetry: bool = False):
    """Return a cached FastF1 session, loading it on first access.

    One entry per session ("bahrain"/"Bahrain Grand Prix"/"1" all share it); a telemetry-loaded
    session also serves non-telemetry requests, and a lighter one is upgraded in place when
    telemetry is first asked for.
    """
    session = _resolve(year, event, session_type)
    key = _session_key(session)
    if (cached := _cached_session(key, load_telemetry)) is not None:
        return cached

    # ponytail: global load lock, so the dashboard's parallel requests don't each load the
    # same session. Different sessions load one at a time; go per-key locks if that bites.
    with _load_lock:
        if (cached := _cached_session(key, load_telemetry)) is not None:
            return cached

        session.load(telemetry=load_telemetry, weather=True, messages=True)

        with _session_lock:
            _session_cache[key] = (session, load_telemetry)
            _session_cache.move_to_end(key)
            while len(_session_cache) > _SESSION_CACHE_MAX:
                _session_cache.popitem(last=False)

    return session


def _rdp(points: list, epsilon: float = 2.0) -> list:
    """Iterative Ramer-Douglas-Peucker polyline simplification."""
    if len(points) < 3:
        return points

    mask = [True] * len(points)
    stack = [(0, len(points) - 1)]

    while stack:
        start, end = stack.pop()
        x1, y1 = points[start]
        x2, y2 = points[end]
        dx, dy = x2 - x1, y2 - y1
        line_len = math.hypot(dx, dy)

        max_dist = 0.0
        max_idx = start
        for i in range(start + 1, end):
            if not mask[i]:
                continue
            px, py = points[i]
            if line_len == 0:
                dist = math.hypot(px - x1, py - y1)
            else:
                dist = abs(dy * px - dx * py + x2 * y1 - y2 * x1) / line_len
            if dist > max_dist:
                max_dist = dist
                max_idx = i

        if max_dist > epsilon:
            stack.append((start, max_idx))
            stack.append((max_idx, end))
        else:
            for i in range(start + 1, end):
                mask[i] = False

    return [p for p, keep in zip(points, mask) if keep]


class F1DataService:
    """Service wrapping FastF1 data fetching and mapping to Pydantic models."""

    @staticmethod
    def _convert_timedelta(td) -> Optional[float]:
        try:
            if pd.isna(td):
                return None
        except (TypeError, ValueError):
            return None
        return td.total_seconds()

    @staticmethod
    def _safe_float(val) -> Optional[float]:
        if isinstance(val, float) and math.isnan(val):
            return None
        try:
            if pd.isna(val):
                return None
        except (TypeError, ValueError):
            pass
        return float(val)

    @staticmethod
    def _safe_str(val) -> str:
        try:
            if pd.isna(val):
                return ""
        except (TypeError, ValueError):
            pass
        return str(val)

    @staticmethod
    def _is_valid_time(val) -> bool:
        if val is None:
            return False
        try:
            return not pd.isna(val)
        except (TypeError, ValueError):
            return False

    def get_session(self, year: int, event: str, session_type: str, load_telemetry: bool = True):
        return _get_session(year, event, session_type, load_telemetry)

    def _tel_to_dataset(self, tel: pd.DataFrame) -> TelemetryDataset:
        """Convert a telemetry DataFrame to a column-oriented TelemetryDataset."""
        if 'Distance' not in tel.columns:
            tel = tel.add_distance()

        def col_f(name: str) -> List[float]:
            if name not in tel.columns:
                return [0.0] * len(tel)
            return tel[name].fillna(0.0).astype(float).tolist()

        def col_i(name: str) -> List[int]:
            if name not in tel.columns:
                return [0] * len(tel)
            return tel[name].fillna(0).astype(int).tolist()

        times: List[float] = [
            t.total_seconds() if hasattr(t, 'total_seconds') else 0.0
            for t in tel['Time']
        ]

        return TelemetryDataset(
            distance=col_f('Distance'),
            time=times,
            speed=col_f('Speed'),
            throttle=col_f('Throttle'),
            brake=col_i('Brake'),
            gear=col_i('nGear'),
            rpm=col_f('RPM'),
            drs=col_i('DRS'),
            x=col_f('X'),
            y=col_f('Y'),
        )

    def get_seasons(self, year: int) -> List[Season]:
        schedule = _schedule(year)

        events = []
        for _, row in schedule.iterrows():
            sessions = []
            name_map = {
                'Practice 1': 'FP1', 'Practice 2': 'FP2', 'Practice 3': 'FP3',
                'Qualifying': 'Q', 'Sprint Qualifying': 'SQ', 'Sprint Shootout': 'SQ',
                'Sprint': 'S', 'Race': 'R',
            }
            for i in range(1, 6):
                col = f'Session{i}'
                if col in row and not pd.isna(row[col]):
                    full_name = row[col]
                    sessions.append(SessionInfo(
                        type=name_map.get(full_name, full_name),
                        name=full_name,
                        date=str(row[f'Session{i}Date']),
                    ))

            events.append(Event(
                round=int(row['RoundNumber']),
                name=row['EventName'],
                country=row['Country'],
                location=row['Location'],
                date=str(row['EventDate']),
                sessions=sessions,
            ))

        return [Season(year=year, events=events)]

    def _calculate_gaps(self, results, session_name: str) -> List[str]:
        gaps = []

        if session_name in ('Race', 'Sprint'):
            # FastF1 gives the winner's total race time but every other finisher's gap to the
            # winner, so those times are already the gap. A lapped car's time is meaningless
            # (show laps down); retired cars show their status.
            leader_laps = None
            for _, row in results.iterrows():
                time_val = row.get('Time')
                status = self._safe_str(row.get('Status', ''))
                laps = self._safe_float(row.get('Laps'))
                if leader_laps is None and self._is_valid_time(time_val):
                    leader_laps = laps
                    gaps.append("Leader")
                elif status == 'Lapped' and laps is not None and leader_laps is not None:
                    down = int(leader_laps - laps)
                    gaps.append(f"+{down} Lap{'s' if down > 1 else ''}")
                elif status == 'Finished' and self._is_valid_time(time_val):
                    gaps.append(f"+{time_val.total_seconds():.3f}s")
                else:
                    gaps.append(status or "DNF")

        elif session_name in ('Qualifying', 'Sprint Qualifying', 'Sprint Shootout'):
            best_times = []
            for _, row in results.iterrows():
                q_times = [row.get(c) for c in ('Q1', 'Q2', 'Q3')]
                q_times = [t for t in q_times if self._is_valid_time(t)]
                best_times.append(min(q_times) if q_times else None)

            valid = [t for t in best_times if t is not None]
            pole_time = min(valid) if valid else None

            for bt in best_times:
                if pole_time is None or bt is None:
                    gaps.append("N/A")
                elif bt == pole_time:
                    gaps.append("Pole")
                else:
                    try:
                        gaps.append(f"+{(bt - pole_time).total_seconds():.3f}s")
                    except Exception:
                        gaps.append("N/A")
        else:
            gaps = ["N/A"] * len(results)

        return gaps

    def get_laps(self, year: int, event: str, session_type: str) -> List[LapData]:
        session = _get_session(year, event, session_type, load_telemetry=False)
        laps = session.laps

        result = []
        for _, row in laps.iterrows():
            result.append(LapData(
                lap_number=int(row['LapNumber']),
                driver=self._safe_str(row['Driver']),
                lap_time=self._convert_timedelta(row['LapTime']),
                sector1_time=self._convert_timedelta(row['Sector1Time']),
                sector2_time=self._convert_timedelta(row['Sector2Time']),
                sector3_time=self._convert_timedelta(row['Sector3Time']),
                compound=self._safe_str(row['Compound']),
                tyre_life=self._safe_float(row['TyreLife']) or 0.0,
                position=self._safe_float(row['Position']) or 0.0,
                is_personal_best=(
                    bool(row['IsPersonalBest']) if not pd.isna(row['IsPersonalBest']) else False
                ),
                is_accurate=bool(row['IsAccurate']) if not pd.isna(row['IsAccurate']) else False,
                stint=int(row['Stint']) if not pd.isna(row['Stint']) else 0,
                speed_trap=self._safe_float(row['SpeedST']),
                pit_out_time=self._convert_timedelta(row.get('PitOutTime')),
                pit_in_time=self._convert_timedelta(row.get('PitInTime')),
            ))

        return result

    @staticmethod
    def _pick_lap(session, driver: str, lap_number: int):
        """A driver's lap by number; 0 → their fastest. Raises NotFoundError if absent."""
        driver_laps = session.laps.pick_drivers(driver)
        if driver_laps.empty:
            raise NotFoundError(f"No laps for driver '{driver}' in this session")
        if lap_number == 0:
            lap = driver_laps.pick_fastest()
            if lap is None or pd.isna(lap['LapTime']):
                raise NotFoundError(f"No timed lap for driver '{driver}'")
            return lap
        matching = driver_laps.loc[driver_laps['LapNumber'] == lap_number]
        if matching.empty:
            raise NotFoundError(f"Driver '{driver}' has no lap {lap_number}")
        return matching.iloc[0]

    def get_telemetry(
        self, year: int, event: str, session_type: str, driver: str, lap_number: int
    ) -> TelemetryDataset:
        """Get column-oriented telemetry. lap_number=0 → driver's fastest lap."""
        cache_key = (_session_key(_resolve(year, event, session_type)), driver, lap_number)
        with _tel_lock:
            if cache_key in _tel_cache:
                return _tel_cache[cache_key]

        session = _get_session(year, event, session_type, load_telemetry=True)
        tel = self._pick_lap(session, driver, lap_number).get_telemetry()
        dataset = self._tel_to_dataset(tel)

        with _tel_lock:
            _tel_cache[cache_key] = dataset
            while len(_tel_cache) > _TEL_CACHE_MAX:
                _tel_cache.pop(next(iter(_tel_cache)))

        return dataset

    def get_multi_telemetry(
        self, year: int, event: str, session_type: str, drivers: List[str], lap: int
    ) -> MultiDriverTelemetry:
        """Bulk telemetry for multiple drivers — single session load.

        Drivers without the requested lap are left out rather than failing the whole request.
        """
        cache_key = (_session_key(_resolve(year, event, session_type)), tuple(sorted(drivers)), lap)
        with _tel_lock:
            if cache_key in _tel_cache:
                return _tel_cache[cache_key]

        session = _get_session(year, event, session_type, load_telemetry=True)
        driver_datasets: Dict[str, TelemetryDataset] = {}

        for driver in drivers:
            try:
                tel = self._pick_lap(session, driver, lap).get_telemetry()
                driver_datasets[driver] = self._tel_to_dataset(tel)
            except NotFoundError:
                continue
            except Exception:
                log.exception("Telemetry failed for %s", driver)

        result = MultiDriverTelemetry(drivers=driver_datasets)

        with _tel_lock:
            _tel_cache[cache_key] = result
            while len(_tel_cache) > _TEL_CACHE_MAX:
                _tel_cache.pop(next(iter(_tel_cache)))

        return result

    def get_weather(self, year: int, event: str, session_type: str) -> List[WeatherData]:
        session = _get_session(year, event, session_type, load_telemetry=False)
        weather = session.weather_data

        result = []
        for _, row in weather.iterrows():
            result.append(WeatherData(
                time=self._convert_timedelta(row['Time']) or 0.0,
                air_temp=self._safe_float(row['AirTemp']) or 0.0,
                track_temp=self._safe_float(row['TrackTemp']) or 0.0,
                humidity=self._safe_float(row['Humidity']) or 0.0,
                pressure=self._safe_float(row['Pressure']) or 0.0,
                rainfall=bool(row['Rainfall']) if not pd.isna(row['Rainfall']) else False,
                wind_speed=self._safe_float(row['WindSpeed']) or 0.0,
                wind_direction=self._safe_float(row['WindDirection']) or 0.0,
            ))
        return result

    def get_race_control(
        self, year: int, event: str, session_type: str
    ) -> List[RaceControlMessage]:
        session = _get_session(year, event, session_type, load_telemetry=False)
        msgs = session.race_control_messages
        # Message Time is UTC wall-clock; t0_date needs telemetry, so measure from the
        # scheduled session start instead (negative = before the session).
        start = session.date

        return [
            RaceControlMessage(
                time=(row['Time'] - start).total_seconds(),
                lap=int(row['Lap']) if not pd.isna(row['Lap']) else None,
                category=self._safe_str(row['Category']),
                message=self._safe_str(row['Message']),
                flag=self._safe_str(row['Flag']) or None,
                scope=self._safe_str(row['Scope']) or None,
                sector=int(row['Sector']) if not pd.isna(row['Sector']) else None,
                driver_number=self._safe_str(row['RacingNumber']) or None,
            )
            for _, row in msgs.iterrows()
        ]

    def get_results(self, year: int, event: str, session_type: str) -> SessionResults:
        session = _get_session(year, event, session_type, load_telemetry=False)
        results = session.results
        gaps = self._calculate_gaps(results, session.name)

        drivers = []
        for idx, (_, row) in enumerate(results.iterrows()):
            raw_color = self._safe_str(row.get('TeamColor', ''))
            if raw_color.startswith('#'):
                team_color = raw_color
            elif len(raw_color) in (3, 6):
                team_color = f'#{raw_color}'
            else:
                team_color = '#888888'

            driver = Driver(
                abbreviation=self._safe_str(row['Abbreviation']),
                number=self._safe_str(row['DriverNumber']),
                full_name=self._safe_str(row['FullName']),
                team=self._safe_str(row['TeamName']),
                team_color=team_color,
                headshot_url=self._safe_str(row.get('HeadshotUrl', '')),
            )
            drivers.append(DriverResult(
                position=self._safe_float(row['Position']),
                grid_position=self._safe_float(row['GridPosition']),
                driver=driver,
                status=self._safe_str(row['Status']),
                points=self._safe_float(row['Points']) or 0.0,
                q1=self._convert_timedelta(row.get('Q1')),
                q2=self._convert_timedelta(row.get('Q2')),
                q3=self._convert_timedelta(row.get('Q3')),
                gap=gaps[idx] if idx < len(gaps) else "N/A",
            ))

        return SessionResults(drivers=drivers)

    def get_circuit_info(self, year: int, event: str, session_type: str) -> CircuitInfo:
        session = _get_session(year, event, session_type, load_telemetry=False)
        info = session.get_circuit_info()

        corners = []
        for _, row in info.corners.iterrows():
            corners.append(Corner(
                number=int(row['Number']) if not pd.isna(row['Number']) else 0,
                x=self._safe_float(row['X']) or 0.0,
                y=self._safe_float(row['Y']) or 0.0,
                angle=self._safe_float(row['Angle']) or 0.0,
                letter=self._safe_str(row['Letter']) if not pd.isna(row['Letter']) else None,
            ))

        return CircuitInfo(corners=corners, rotation=info.rotation)

    def get_track_outline(self, year: int, event: str, session_type: str) -> List[TrackPoint]:
        """Get track outline XY using RDP-simplified fastest-lap telemetry."""
        session = _get_session(year, event, session_type, load_telemetry=True)

        try:
            fastest_lap = session.laps.pick_fastest()
            tel = fastest_lap.get_telemetry()
        except Exception as e:
            log.warning("No track outline for %s %s %s: %s", year, event, session_type, e)
            return []

        tel = tel[['X', 'Y']].dropna()
        if tel.empty:
            return []

        raw_points = list(zip(tel['X'].tolist(), tel['Y'].tolist()))
        simplified = _rdp(raw_points, epsilon=2.0)

        return [TrackPoint(x=x, y=y) for x, y in simplified]
