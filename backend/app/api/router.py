"""FastAPI routes for F1 Intelligence System."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.f1 import (
    Season, LapData, TelemetryPoint, TelemetryDataset, MultiDriverTelemetry,
    WeatherData, RaceControlMessage, SessionResults, CircuitInfo, TrackPoint
)
from app.services.f1_data import F1DataService

router = APIRouter(prefix="/api/v1", tags=["f1_data"])


def get_f1_service():
    return F1DataService()


@router.get("/seasons", response_model=List[Season])
def get_seasons(
    year: int = Query(default=2024, ge=2018, le=2025, description="Season year"),
    service: F1DataService = Depends(get_f1_service),
):
    try:
        return service.get_seasons(year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{year}/{event}/{session_type}/laps", response_model=List[LapData])
def get_laps(
    year: int,
    event: str,
    session_type: str,
    service: F1DataService = Depends(get_f1_service),
):
    try:
        return service.get_laps(year, event, session_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{year}/{event}/{session_type}/telemetry/compare", response_model=MultiDriverTelemetry)
def get_telemetry_compare(
    year: int,
    event: str,
    session_type: str,
    drivers: str = Query(..., description="Comma-separated driver abbreviations, e.g. VER,HAM"),
    lap: int = Query(default=0, ge=0, description="Lap number; 0 = each driver's fastest lap"),
    service: F1DataService = Depends(get_f1_service),
):
    """Fetch telemetry for multiple drivers in a single session load."""
    driver_list = [d.strip().upper() for d in drivers.split(',') if d.strip()]
    if not driver_list:
        raise HTTPException(status_code=422, detail="Provide at least one driver abbreviation")
    try:
        return service.get_multi_telemetry(year, event, session_type, driver_list, lap)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{year}/{event}/{session_type}/telemetry/{driver}/{lap_number}", response_model=TelemetryDataset)
def get_telemetry(
    year: int,
    event: str,
    session_type: str,
    driver: str,
    lap_number: int,
    service: F1DataService = Depends(get_f1_service),
):
    """Get column-oriented telemetry for a specific driver and lap. Use lap_number=0 for fastest lap."""
    try:
        data = service.get_telemetry(year, event, session_type, driver, lap_number)
        if not data.distance:
            raise HTTPException(status_code=404, detail="Telemetry data not found for lap")
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{year}/{event}/{session_type}/weather", response_model=List[WeatherData])
def get_weather(
    year: int,
    event: str,
    session_type: str,
    service: F1DataService = Depends(get_f1_service),
):
    try:
        return service.get_weather(year, event, session_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{year}/{event}/{session_type}/race-control", response_model=List[RaceControlMessage])
def get_race_control(
    year: int,
    event: str,
    session_type: str,
    service: F1DataService = Depends(get_f1_service),
):
    try:
        return service.get_race_control(year, event, session_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{year}/{event}/{session_type}/results", response_model=SessionResults)
def get_results(
    year: int,
    event: str,
    session_type: str,
    service: F1DataService = Depends(get_f1_service),
):
    try:
        return service.get_results(year, event, session_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{year}/{event}/{session_type}/circuit", response_model=CircuitInfo)
def get_circuit_info(
    year: int,
    event: str,
    session_type: str,
    service: F1DataService = Depends(get_f1_service),
):
    try:
        return service.get_circuit_info(year, event, session_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{year}/{event}/{session_type}/track-outline", response_model=List[TrackPoint])
def get_track_outline(
    year: int,
    event: str,
    session_type: str,
    service: F1DataService = Depends(get_f1_service),
):
    try:
        data = service.get_track_outline(year, event, session_type)
        if not data:
            raise HTTPException(status_code=404, detail="Track outline not available for this session")
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
