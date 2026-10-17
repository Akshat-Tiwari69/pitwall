"""Main FastAPI application entry point."""

import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastf1.exceptions import DataNotLoadedError

from app.api.router import router
from app.core.config import get_settings
from app.services.f1_data import NO_TIMING_DATA, NotFoundError

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("app")

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend API for Pitwall",
)


@app.exception_handler(NotFoundError)
async def not_found(_: Request, exc: NotFoundError):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(DataNotLoadedError)
async def data_not_available(_: Request, exc: DataNotLoadedError):
    return JSONResponse(status_code=404, content={"detail": NO_TIMING_DATA})


# Registered before CORS so it runs inside it: 500s still carry CORS headers and the browser
# sees the real error instead of an opaque CORS failure.
@app.middleware("http")
async def log_and_catch(request: Request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        log.exception("Unhandled error on %s %s", request.method, request.url.path)
        response = JSONResponse(status_code=500, content={"detail": "Internal server error"})
    ms = (time.perf_counter() - start) * 1000
    log.info("%s %s -> %d (%.0f ms)", request.method, request.url.path, response.status_code, ms)
    return response


app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health", tags=["system"])
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
