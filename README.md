# Pitwall

**Race engineering intelligence for Formula 1.** Pitwall turns raw FastF1 telemetry into interactive race analysis, and explains where the time was won or lost instead of only charting it.

> Unofficial fan project. Not affiliated with Formula 1, the FIA or any team. F1 and Formula 1 are trademarks of Formula One Licensing B.V.

## Repository layout

```
apps/
  api/        FastAPI service — loads FastF1 sessions and serves timing, telemetry, weather, race control
  web/        React + Vite + TypeScript dashboard (ECharts, Three.js)
docs/
  VISION.md   Product vision
  ROADMAP.md  Phased development plan
  design/     Reference UI, icons and screenshots
Makefile      Dev shortcuts (Windows)
```

## Getting started

Requires Python 3.11+ and Node 20+.

### API (`apps/api`)

```bash
cd apps/api
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

Interactive docs at http://localhost:8000/docs. The first request for a session downloads it into `app/f1_cache/` (gitignored); later requests are served from disk.

### Web (`apps/web`)

```bash
cd apps/web
npm install
npm run dev
```

Opens on http://localhost:5173 and talks to the API on port 8000.

### Make targets

| Target      | What it does                         |
|-------------|--------------------------------------|
| `make dev`  | Start API and web in separate windows |
| `make api`  | Start the API only                    |
| `make web`  | Start the web app only                |
| `make test` | Run API tests                         |
| `make lint` | Ruff (API) + ESLint (web)             |
