# F1 Intelligence System

An AI-powered Formula One race engineering intelligence platform that transforms raw telemetry into cinematic, interactive, and deeply intelligent race analysis.

## Project Structure

This project is structured as a monorepo containing:
- `backend/`: FastAPI + Python service for fetching and analyzing FastF1 data
- `frontend/`: React + Vite + TypeScript application for visualization and interactions

## Quick Start

See the `Makefile` for available commands to start the development servers.

### Backend Setup
1. `cd backend`
2. `python -m venv .venv`
3. Activate virtual environment
4. `pip install -r requirements.txt`
5. `uvicorn app.main:app --reload`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## Architecture

This platform heavily relies on the FastF1 library for telemetry and session data, and implements advanced visualization techniques using Apache ECharts and custom Canvas rendering.
