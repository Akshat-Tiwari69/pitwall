.PHONY: dev backend frontend test

# Run both frontend and backend development servers
dev:
	@echo "Starting backend and frontend..."
	start cmd /c "cd backend && .\.venv\Scripts\Activate.ps1 && uvicorn app.main:app --reload --port 8000"
	start cmd /c "cd frontend && npm run dev"

backend:
	cd backend && .\.venv\Scripts\Activate.ps1 && uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

test-backend:
	cd backend && .\.venv\Scripts\Activate.ps1 && pytest
