.PHONY: dev api web test lint

API_PY = .venv\Scripts\python

# Run API and web dev servers in separate windows
dev:
	start cmd /k "cd apps\api && $(API_PY) -m uvicorn app.main:app --reload --port 8000"
	start cmd /k "cd apps\web && npm run dev"

api:
	cd apps\api && $(API_PY) -m uvicorn app.main:app --reload --port 8000

web:
	cd apps\web && npm run dev

test:
	cd apps\api && $(API_PY) -m pytest

lint:
	cd apps\api && $(API_PY) -m ruff check app tests
	cd apps\web && npm run lint
