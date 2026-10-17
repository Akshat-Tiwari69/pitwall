"""Pydantic schemas for F1 data."""

from typing import Dict, List, Optional

from pydantic import BaseModel


class Driver(BaseModel):
    """Driver information."""
    abbreviation: str
    number: str
    full_name: str
    team: str
    team_color: str
    headshot_url: Optional[str] = None


class DriverResult(BaseModel):
    """Result for a specific driver in a session."""
    position: Optional[float] = None
    grid_position: Optional[float] = None
    driver: Driver
    status: str
    points: float
    q1: Optional[float] = None  # seconds
    q2: Optional[float] = None
    q3: Optional[float] = None
    gap: Optional[str] = None  # "Leader", "+1.234s", "Pole", "DNF", "N/A"


class SessionResults(BaseModel):
    """Overall results for a session."""
    drivers: List[DriverResult]


class SessionInfo(BaseModel):
    """Information about a specific session within an event."""
    type: str  # 'FP1', 'FP2', 'FP3', 'Q', 'S', 'SQ', 'R'
    name: str
    date: str


class Event(BaseModel):
    """Information about a race weekend (event)."""
    round: int
    name: str
    country: str
    location: str
    date: str
    sessions: List[SessionInfo]


class Season(BaseModel):
    """Information about a full F1 season."""
    year: int
    events: List[Event]


class LapData(BaseModel):
    """Data for a single lap by a specific driver."""
    lap_number: int
    driver: str
    lap_time: Optional[float] = None  # in seconds
    sector1_time: Optional[float] = None
    sector2_time: Optional[float] = None
    sector3_time: Optional[float] = None
    compound: str
    tyre_life: float
    position: float
    is_personal_best: bool
    is_accurate: bool
    stint: int
    speed_trap: Optional[float] = None
    pit_out_time: Optional[float] = None  # non-null = car left pit on this lap (outlap)
    pit_in_time: Optional[float] = None   # non-null = car entered pit on this lap (inlap)


class TelemetryPoint(BaseModel):
    """A single point of telemetry data."""
    distance: float
    time: float  # seconds from session start or lap start
    speed: float
    throttle: float
    brake: bool
    gear: int
    rpm: float
    drs: int
    x: float
    y: float
    z: float


class TelemetryDataset(BaseModel):
    """Column-oriented telemetry payload — one array per channel."""
    distance: List[float]
    time: List[float]
    speed: List[float]
    throttle: List[float]
    brake: List[int]
    gear: List[int]
    rpm: List[float]
    drs: List[int]
    x: List[float]
    y: List[float]


class MultiDriverTelemetry(BaseModel):
    """Telemetry for multiple drivers in a single response."""
    drivers: Dict[str, TelemetryDataset]


class WeatherData(BaseModel):
    """Weather data point."""
    time: float  # seconds
    air_temp: float
    track_temp: float
    humidity: float
    pressure: float
    rainfall: bool
    wind_speed: float
    wind_direction: float


class RaceControlMessage(BaseModel):
    """A message from race control."""
    time: float  # seconds
    lap: Optional[int] = None
    category: str
    message: str
    flag: Optional[str] = None
    scope: Optional[str] = None
    sector: Optional[int] = None
    driver_number: Optional[str] = None


class Corner(BaseModel):
    """Information about a track corner."""
    number: int
    x: float
    y: float
    angle: float
    letter: Optional[str] = None
    distance: Optional[float] = None  # metres along the fastest lap; for chart corner markers


class CircuitInfo(BaseModel):
    """Information about the circuit."""
    corners: List[Corner]
    rotation: float


class TrackPoint(BaseModel):
    """A single XY coordinate point of the track outline."""
    x: float
    y: float
