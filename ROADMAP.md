# F1 Intelligence System — Development Roadmap

> A phased development plan taking the project from zero to a fully operational AI-powered Formula One race engineering intelligence platform.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite + TypeScript)         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Dashboard │ │  Replay  │ │   Lap    │ │ Driver   │ │    AI    │  │
│  │   Shell   │ │  Engine  │ │ Compare  │ │   DNA    │ │ Engineer │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │          Visualization Layer (D3.js + Canvas + ECharts)        │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │          State Management (Zustand + TanStack Query)           │ │
│  └─────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│                         REST API + WebSocket                        │
├──────────────────────────────────────────────────────────────────────┤
│                     BACKEND (FastAPI + Python)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  FastF1  │ │ Analysis │ │    ML    │ │   LLM    │ │  Cache   │  │
│  │  Data    │ │  Engine  │ │ Pipeline │ │ Service  │ │  Layer   │  │
│  │  Layer   │ │          │ │          │ │          │ │          │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │              Data Processing (Pandas + NumPy + SciPy)          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────────────┐ ┌──────────────────────────────┐ │
│  │  SQLite  │ │  Redis (Cache)   │ │  FastF1 File Cache           │ │
│  │  (Dev)   │ │  (Computed Data) │ │  (Raw Telemetry)             │ │
│  └──────────┘ └──────────────────┘ └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0 — Project Scaffolding & Infrastructure

**Goal:** Set up the complete development environment, project structure, CI tooling, and foundational data layer so all future development has a solid base.

**Duration:** ~1 week

---

### Milestone 0.1 — Repository & Environment Setup

#### Deliverables

- [ ] Initialize Git repository with proper `.gitignore` (Python, Node, IDE files, cache directories)
- [ ] Create monorepo structure:
  ```
  f1-intelligence/
  ├── backend/              # Python FastAPI backend
  │   ├── app/
  │   │   ├── api/          # Route handlers
  │   │   ├── core/         # Config, settings, dependencies
  │   │   ├── models/       # Pydantic schemas
  │   │   ├── services/     # Business logic
  │   │   ├── analysis/     # Analysis engines
  │   │   ├── ml/           # ML pipelines
  │   │   └── main.py       # FastAPI app entry
  │   ├── tests/
  │   ├── requirements.txt
  │   └── pyproject.toml
  ├── frontend/             # React + Vite + TypeScript
  │   ├── src/
  │   │   ├── components/   # Shared UI components
  │   │   ├── features/     # Feature-based modules
  │   │   ├── hooks/        # Custom React hooks
  │   │   ├── services/     # API clients
  │   │   ├── stores/       # Zustand stores
  │   │   ├── styles/       # Global CSS, design tokens
  │   │   ├── types/        # TypeScript type definitions
  │   │   └── utils/        # Utility functions
  │   ├── public/
  │   └── package.json
  ├── docker-compose.yml
  ├── Makefile              # Dev shortcuts
  ├── Project Vision.md
  ├── ROADMAP.md
  └── README.md
  ```
- [ ] Configure Python environment (Python 3.11+):
  - FastAPI, Uvicorn, Pydantic v2
  - FastF1, Pandas, NumPy, SciPy, Scikit-learn
  - Redis client (for later phases)
  - pytest, httpx (testing)
- [ ] Configure Frontend environment:
  - Vite + React 18 + TypeScript
  - D3.js, Apache ECharts
  - Zustand, TanStack Query, Axios
  - GSAP (animations)
  - ESLint, Prettier
- [ ] Docker Compose for local development:
  - Backend container (FastAPI + Uvicorn)
  - Frontend container (Vite dev server)
  - Redis container (optional, for caching)
- [ ] Create `Makefile` with commands: `make dev`, `make backend`, `make frontend`, `make test`

---

### Milestone 0.2 — FastF1 Data Layer

#### Deliverables

- [ ] Create `DataService` class wrapping FastF1:
  ```python
  class F1DataService:
      def get_session(year, event, session_type) -> SessionData
      def get_laps(session, driver=None, accurate_only=True) -> LapData
      def get_telemetry(session, driver, lap_number) -> TelemetryData
      def get_weather(session) -> WeatherData
      def get_race_control(session) -> RaceControlData
      def get_results(session) -> ResultsData
      def get_circuit_info(session) -> CircuitInfo
      def get_event_schedule(year) -> EventSchedule
  ```
- [ ] Implement FastF1 caching with configurable cache directory
- [ ] Create Pydantic response models for all data types:
  - `LapSchema`, `TelemetrySchema`, `WeatherSchema`, `RaceControlSchema`, `ResultsSchema`, `CircuitInfoSchema`
- [ ] Handle edge cases:
  - Missing telemetry for certain laps (pit laps, retirements)
  - NaN values in timing data
  - Timedelta → float (seconds) conversion
  - Session loading failures
- [ ] Write unit tests for data layer with cached test fixtures
- [ ] Create data exploration notebook (scratch) for validating data access patterns

---

### Milestone 0.3 — API Foundation

#### Deliverables

- [ ] FastAPI application with:
  - CORS middleware (allow frontend dev server)
  - Error handling middleware
  - Request logging
  - Health check endpoint (`/health`)
- [ ] Core API routes:
  ```
  GET /api/v1/seasons                          # Available seasons (2019–current)
  GET /api/v1/seasons/{year}/events            # Events in a season
  GET /api/v1/sessions/{year}/{event}/{type}   # Session metadata
  GET /api/v1/sessions/.../laps                # Lap data for session
  GET /api/v1/sessions/.../laps/{driver}       # Laps for specific driver
  GET /api/v1/sessions/.../telemetry/{driver}/{lap}  # Telemetry for a specific lap
  GET /api/v1/sessions/.../weather             # Weather data
  GET /api/v1/sessions/.../race-control        # Race control messages
  GET /api/v1/sessions/.../results             # Session results
  GET /api/v1/sessions/.../circuit             # Circuit info (corners, rotation)
  ```
- [ ] Auto-generated Swagger documentation
- [ ] Response caching (in-memory or Redis) for expensive queries
- [ ] Pagination for large datasets (telemetry)

---

## Phase 1 — Core Dashboard & Telemetry Visualization

**Goal:** Build the main dashboard shell and implement fundamental telemetry visualization capabilities. By the end of this phase, a user should be able to select a session, view lap data, and see basic telemetry charts.

**Duration:** ~2–3 weeks

---

### Milestone 1.1 — Dashboard Shell & Design System

#### Deliverables

- [ ] **Design System** (`styles/tokens.css`):
  ```css
  /* Color Palette */
  --bg-primary: #0a0a0f;        /* Deep dark background */
  --bg-surface: #111118;        /* Card/panel background */
  --bg-elevated: #1a1a2e;       /* Elevated surfaces */
  --bg-hover: #222240;          /* Hover states */
  --border-subtle: #2a2a3e;     /* Subtle borders */
  --text-primary: #e8e8f0;      /* Primary text */
  --text-secondary: #8888a0;    /* Secondary text */
  --text-muted: #555570;        /* Muted text */
  --accent-red: #e10600;        /* F1 Red */
  --accent-purple: #9b59b6;     /* Fastest lap */
  --delta-positive: #00e676;    /* Time gained / green */
  --delta-negative: #ff1744;    /* Time lost / red */
  --delta-neutral: #ffab00;     /* Neutral / yellow */

  /* Tire Compound Colors */
  --tire-soft: #ff1801;
  --tire-medium: #ffd700;
  --tire-hard: #ffffff;
  --tire-intermediate: #43b02a;
  --tire-wet: #0067ff;

  /* Typography */
  --font-ui: 'Inter', sans-serif;
  --font-data: 'JetBrains Mono', monospace;
  ```
- [ ] **Dashboard Layout Component**: Header (session selector, settings), Sidebar (navigation, timing tower), Main Content Area (modular panels), Bottom Bar (timeline/controls)
- [ ] **Session Selector**: Year → Event → Session type cascade selector
- [ ] **Navigation**: Sidebar tabs for each module (Dashboard, Replay, Compare, DNA, Strategy, AI Engineer)
- [ ] **Loading States**: Skeleton loaders matching engineering panel shapes
- [ ] **Responsive Considerations**: Desktop-first (1920×1080 primary target), adaptable to 1366×768 minimum

---

### Milestone 1.2 — Timing Tower & Lap Data Display

#### Deliverables

- [ ] **Timing Tower Component**: Vertical list of all drivers, sorted by position. Show: position, driver abbreviation (3-letter), team color bar, last lap time, gap to leader, tire compound indicator (colored dot), pit stop count. Highlight: fastest lap (purple), personal best (green)
- [ ] **Lap Time Table**: Sortable, filterable table of all laps for selected driver(s). Columns: Lap #, LapTime, S1, S2, S3, Compound, TyreLife, Position, SpeedTrap. Color-code personal bests (green) and overall fastest (purple)
- [ ] **Session Summary Card**: Winner, fastest lap, total laps, weather summary, key events count

---

### Milestone 1.3 — Telemetry Chart Engine

#### Deliverables

- [ ] **Chart Engine** using Apache ECharts (WebGL mode for performance):
  - Speed trace (km/h vs distance)
  - Throttle trace (% vs distance)
  - Brake trace (on/off vs distance)
  - Gear trace (gear number vs distance)
  - RPM trace (RPM vs distance)
  - DRS status trace
- [ ] **Multi-trace overlay**: Plot 2 drivers' telemetry on the same chart with team-colored traces
- [ ] **Interactive features**:
  - Linked crosshair across all charts (hover on speed → see corresponding throttle/brake/gear point)
  - Zoom in/out on specific sections
  - Click-to-compare feature (click a point → see delta at that distance)
- [ ] **Distance normalization**: Align telemetry by distance (not time) for fair comparison using `add_distance()` from FastF1
- [ ] **Corner markers**: Overlay vertical lines at corner positions (from circuit info) with corner numbers

#### Backend API Additions
```
GET /api/v1/sessions/.../telemetry/compare?driver1=VER&lap1=15&driver2=HAM&lap2=15
```
Returns both telemetry traces aligned by distance.

---

### Milestone 1.4 — Track Map Visualization

#### Deliverables

- [ ] **Track Map Component** (Canvas-based):
  - Render circuit outline from X/Y position data
  - Apply rotation from `circuit_info.rotation`
  - Color-code track sections by sector (S1, S2, S3)
  - Label corners with corner numbers
  - Show DRS detection zones
- [ ] **Speed Heatmap Mode**: Color the track outline by speed at each point (blue=slow → red=fast)
- [ ] **Delta Heatmap Mode**: When comparing two laps, color the track by who is faster (green=driver A, red=driver B)
- [ ] **Interactive**: Hover over track → show data values at that point; click a corner → zoom into corner telemetry

---

## Phase 2 — Lap Comparison & Strategy Intelligence

**Goal:** Implement the detailed lap comparison system and race strategy analysis tools. By the end of this phase, users can compare any two laps with engineering precision and understand the strategic story of a race.

**Duration:** ~2–3 weeks

---

### Milestone 2.1 — Lap Comparison System

#### Deliverables

- [ ] **Lap Selector UI**: Pick Driver A + Lap, Driver B + Lap. Quick actions: "Compare fastest laps", "Compare qualifying laps"
- [ ] **Delta Time Trace**: Running cumulative time delta vs distance. Green shading where Driver A gains, Red where Driver B gains. Peak delta annotations (e.g., "+0.32s at Turn 6")
- [ ] **Mini-Sector Breakdown**: Divide track into 25 mini-sectors. Bar chart showing time delta per mini-sector. Color-coded (green = faster, red = slower). Identify the 3 biggest gains and 3 biggest losses
- [ ] **Corner-by-Corner Table**:
  | Corner | Entry Speed A | Entry Speed B | Δ Entry | Apex A | Apex B | Exit A | Exit B | Time Δ |
  |--------|--------------|--------------|---------|--------|--------|--------|--------|--------|
  | T1     | 312 km/h     | 308 km/h     | +4      | ...    | ...    | ...    | ...    | -0.12s |
- [ ] **Brake Point Comparison**: Overlay showing where each driver starts braking (distance markers on track map)
- [ ] **Comparison Summary Card**: AI-generated textual summary of the comparison (pre-cursor to AI Engineer)

#### Backend API
```
GET  /api/v1/analysis/compare-laps
POST /api/v1/analysis/compare-laps
Body: { driver1, lap1, driver2, lap2, session_key }
Response: { delta_trace, mini_sectors, corner_analysis, summary_stats }
```

#### Analysis Engine
```python
class LapComparisonEngine:
    def compare(lap_a_tel, lap_b_tel, circuit_info) -> ComparisonResult:
        # 1. Align telemetry by distance
        # 2. Compute running delta: cumsum(dt_b - dt_a)
        # 3. Segment into mini-sectors
        # 4. Extract corner metrics (entry/apex/exit speeds)
        # 5. Compute brake point distances
        # 6. Generate summary statistics
```

---

### Milestone 2.2 — Race Strategy Timeline

#### Deliverables

- [ ] **Strategy Gantt Chart**: Horizontal bars per driver showing stints. Bar color = tire compound color. Bar length = stint length (laps). Pit stop markers between stints with stop duration. Sorted by finishing position
- [ ] **Stint Summary Table**: Per driver per stint: compound, start lap, end lap, number of laps, average pace (fuel-corrected), best lap, degradation rate (s/lap)
- [ ] **Pit Stop Timeline**: Vertical event markers on the race timeline showing all pit stops. Show stop duration and tire change (old → new compound)
- [ ] **Position Change Visualization**: Lap-by-lap position chart (sometimes called "race trace" or "spaghetti chart"). X-axis = lap number, Y-axis = position (inverted). Lines per driver, colored by team. Highlights: pit stops, safety cars, retirements

#### Backend API
```
GET /api/v1/analysis/strategy/{year}/{event}
Response: { stints[], pit_stops[], position_history[], race_events[] }
```

---

### Milestone 2.3 — Tire Degradation Analysis

#### Deliverables

- [ ] **Degradation Curve Chart**: Fuel-corrected lap time vs lap number per stint. Fit regression line to show degradation rate. Annotate degradation rate (e.g., "0.05s/lap") and cliff detection ("Cliff at lap 28")
- [ ] **Fuel Correction Model**:
  ```python
  def fuel_correct(lap_time, lap_number, total_laps, fuel_effect=0.055):
      fuel_remaining_laps = total_laps - lap_number
      correction = fuel_remaining_laps * fuel_effect
      return lap_time + correction  # Add back the time "saved" by lighter fuel
  ```
- [ ] **Compound Comparison**: Overlay degradation curves for different compounds on the same driver. Show compound performance window (where each compound is optimal)
- [ ] **Cross-Driver Degradation**: Compare degradation rates between drivers on the same compound. Identify who manages tires better
- [ ] **Cliff Detection Algorithm**:
  ```python
  def detect_cliff(fuel_corrected_times, window=5):
      # Compute rolling degradation rate
      # Detect change point where rate increases > 2x
      # Return cliff_lap, pre_cliff_rate, post_cliff_rate
  ```

---

### Milestone 2.4 — Undercut/Overcut Analysis

#### Deliverables

- [ ] **Gap Evolution Chart**: Track the time gap between two drivers across the pit window. Show: pre-pit gap → pit stop → outlap battle → post-pit gap. Annotate net gain/loss from the strategy
- [ ] **Undercut/Overcut Detection Algorithm**:
  ```python
  def detect_undercut(driver_a_laps, driver_b_laps):
      # 1. Detect when driver A pits (earlier)
      # 2. Compare outlap pace vs driver B's in-lap pace
      # 3. Calculate net position gain/loss
      # 4. Classify: undercut_success, undercut_fail, overcut_success, overcut_fail
  ```
- [ ] **What-If Pit Scenario** (stretch): "What if Driver X had pitted 1 lap earlier/later?" Re-project positions using actual degradation data and pit stop times

---

## Phase 3 — AI Race Engineer & Driver DNA

**Goal:** Implement the intelligent features that differentiate this platform — the conversational AI race engineer and the driver behavioral analysis system.

**Duration:** ~3–4 weeks

---

### Milestone 3.1 — Analysis Insight Engine (Pre-computation)

Before the AI Engineer can explain things, we need a structured insight generation pipeline.

#### Deliverables

- [ ] **Insight Generation Pipeline**:
  ```python
  class InsightEngine:
      def generate_lap_comparison_insight(comparison_result) -> str
      def generate_degradation_insight(degradation_data) -> str
      def generate_strategy_insight(strategy_data) -> str
      def generate_battle_insight(battle_data) -> str
      def generate_race_summary(session_data) -> str
  ```
- [ ] Each method produces a **structured JSON insight** with:
  - `insight_type`: "lap_comparison", "degradation", "strategy", etc.
  - `key_findings`: List of finding objects with numeric data
  - `narrative_seed`: Pre-formatted description for LLM context
  - `data_references`: Links to specific laps, corners, stints
- [ ] **Automated Race Summary Generator**: Process an entire race and produce a structured narrative covering: qualifying → race start → key battles → strategy moves → safety cars → final result

---

### Milestone 3.2 — AI Race Engineer (Chat Interface)

#### Deliverables

- [ ] **Chat UI Component**: Chat panel docked to the right or bottom of dashboard. Message history with user/engineer messages. Engineering avatar/identity. Typing indicator during LLM generation. Suggested questions based on current view context
- [ ] **Backend Chat Service**:
  ```python
  class AIEngineerService:
      def answer_question(question: str, session_context: SessionContext) -> str:
          # 1. Parse user intent (what are they asking about?)
          # 2. Retrieve relevant pre-computed insights
          # 3. Build LLM context with structured data
          # 4. Generate response via LLM API
          # 5. Return engineering-tone explanation
  ```
- [ ] **Context Management**:
  - Track which session/driver/lap the user is viewing
  - Include relevant insights in LLM context automatically
  - Maintain conversation history for follow-up questions
- [ ] **LLM Integration**:
  - Abstract LLM provider (Gemini/OpenAI/Claude) behind interface
  - System prompt engineering for "F1 Race Engineer" persona
  - Temperature and token limit tuning for technical accuracy
  - Response streaming for real-time typing effect
- [ ] **Suggested Questions**: Context-aware question suggestions:
  - When viewing lap comparison: "Why was [Driver A] faster in Sector 2?"
  - When viewing strategy: "Did the undercut work for [Driver]?"
  - When viewing degradation: "When did [Driver]'s tires start to drop off?"

#### System Prompt (Core)
```
You are an experienced Formula One race engineer with deep expertise in
telemetry analysis, tire management, race strategy, and driver performance.

You explain race situations with technical precision but in a way that's
accessible to F1 enthusiasts. You use proper F1 terminology — undercut,
degradation cliff, traction zone, dirty air, DRS window — and always
reference specific data points (lap numbers, time deltas, corner names).

When given telemetry data and analysis results, you explain what happened
and why it happened, not just what the numbers show. You think like an
engineer: cause and effect, trade-offs, and strategic implications.

Tone: Confident, technical, specific. Like explaining to a team principal
who wants to understand every tenth of a second.
```

---

### Milestone 3.3 — Driver DNA Analyzer

#### Deliverables

- [ ] **DNA Feature Extraction Pipeline**:
  ```python
  class DriverDNAExtractor:
      def extract_braking_profile(telemetry_laps) -> BrakingMetrics
      def extract_throttle_profile(telemetry_laps) -> ThrottleMetrics
      def extract_cornering_profile(telemetry_laps, circuit_info) -> CorneringMetrics
      def extract_consistency_profile(lap_times) -> ConsistencyMetrics
      def extract_tire_management_profile(stint_data) -> TireMetrics
      def extract_overtaking_profile(position_data) -> OvertakingMetrics
      def compute_dna(session, driver) -> DriverDNA
  ```
- [ ] **DNA Dimensions** (all normalized 0–100):
  | Dimension | Computation |
  |---|---|
  | Braking Aggression | Avg brake point distance from corner entry / deceleration G |
  | Throttle Smoothness | Std deviation of throttle application gradients |
  | Corner Commitment | Avg entry speed relative to track optimal |
  | Traction Utilization | Avg throttle application distance from apex |
  | Consistency Index | 1 - (std_dev(lap_times) / mean(lap_times)) normalized |
  | Tire Preservation | Inverse of degradation rate relative to field average |
  | Attack Frequency | Position gains per race distance |
  | Qualifying Pace | Avg delta to pole position |
- [ ] **Radar Chart Visualization**: 8-axis radar chart showing DNA fingerprint. Dual-overlay for comparing two drivers. Team-colored traces. Hover to see exact values
- [ ] **Driver Archetype Classification**:
  ```python
  class ArchetypeClassifier:
      archetypes = [
          "Aggressive Late-Braker",
          "Smooth Operator",
          "Tire Whisperer",
          "Qualifying Specialist",
          "Race Pace Machine",
          "Wet Weather Master",
          "Calculated Attacker",
          "Consistent Metronome"
      ]
      def classify(dna: DriverDNA) -> Archetype  # K-Means clustering
  ```
- [ ] **Corner Strength Heatmap**: Color each corner on the track map by driver strength (green = strong, red = weak) relative to comparison driver

---

### Milestone 3.4 — Driver Comparison View

#### Deliverables

- [ ] **Side-by-Side DNA Comparison**: Two driver DNA radar charts overlaid with data table
- [ ] **Head-to-Head Statistics**: Qualifying battles, race result comparisons, average lap time delta, consistency comparison — when both drivers competed in the same sessions
- [ ] **Evolution Chart**: How a driver's DNA dimensions change across races in a season (line chart over time)
- [ ] **Strongest/Weakest Corners**: For each driver, identify their 3 strongest and 3 weakest corners on a given circuit

---

## Phase 4 — Race Replay Engine & Battle Detection

**Goal:** Build the cinematic race replay system and automated battle detection/narrative system. This is the "wow factor" phase.

**Duration:** ~3–4 weeks

---

### Milestone 4.1 — Race Replay: Core Engine

#### Deliverables

- [ ] **Replay Data Pre-processor** (Backend):
  ```python
  class ReplayDataBuilder:
      def build_replay_data(session) -> ReplayDataset:
          # For every timestamp (100ms intervals):
          #   For every car:
          #     Interpolate X, Y position
          #     Include speed, gear, DRS, compound
          #     Include gap to car ahead
          #     Include current position
          # Also include:
          #   Race control events (flags, safety car)
          #   Pit stop events
          #   Fastest lap events
          # Compress and return as JSON or binary format
  ```
- [ ] **Replay API**:
  ```
  GET /api/v1/replay/{year}/{event}/data      # Full pre-computed replay dataset
  WS  /api/v1/replay/{year}/{event}/stream    # WebSocket for chunked streaming
  ```
- [ ] **Canvas Replay Renderer** (Frontend):
  - Track map drawn at high resolution on Canvas
  - 20 car dots rendered at 60fps using `requestAnimationFrame`
  - Smooth interpolation between data points
  - Team-colored car markers with driver abbreviation labels
  - Current lap indicator per car
- [ ] **Playback Controls**:
  - Play / Pause
  - Speed: 0.5x, 1x, 2x, 5x, 10x, 20x
  - Scrub bar (drag to any point in the race)
  - Jump to lap
  - Jump to event (overtake, pit stop, safety car)

---

### Milestone 4.2 — Replay Overlays & Enrichment

#### Deliverables

- [ ] **Live Timing Tower Overlay**: Animated timing tower that updates in sync with replay, showing position, gap, compound, lap number
- [ ] **Telemetry Strip Overlay**: For selected driver(s), show real-time speed/throttle/brake mini-traces at the bottom of the replay
- [ ] **Gap Indicator**: When two cars are close, show the time gap between them dynamically. Flash when gap drops below 1.0s (DRS range)
- [ ] **Race Control Event Overlay**: Flag animations (yellow sector flash, full yellow, safety car, red flag) overlaid on replay
- [ ] **Pit Stop Animation**: Car enters pit lane → pit stop timer → car exits pit lane. Show stop duration
- [ ] **Fastest Lap Glow**: When a driver sets fastest lap, their dot pulses purple momentarily
- [ ] **Weather Bar**: Subtle indicator at the top showing current air temp, track temp, rainfall status

---

### Milestone 4.3 — Battle Detection System

#### Deliverables

- [ ] **Detection Algorithms** (Backend):
  ```python
  class BattleDetector:
      def detect_overtakes(laps_data) -> List[Overtake]
          # Position change between consecutive laps
          # Filter out pit-related position changes
          # Identify DRS-assisted vs non-DRS overtakes

      def detect_battles(laps_data, threshold_gap=1.5, min_laps=3) -> List[Battle]
          # Sustained close combat (gap < threshold for min_laps)
          # Track gap evolution within battle

      def detect_drs_trains(laps_data) -> List[DRSTrain]
          # Chain of 3+ cars within DRS range

      def detect_chase_phases(laps_data, closing_rate=0.3) -> List[ChasePhase]
          # Sustained gap reduction > closing_rate s/lap

      def build_race_narrative(session) -> RaceNarrative
          # Combine all detections into chronological narrative
  ```
- [ ] **Race Narrative Timeline UI**:
  - Horizontal timeline at bottom of replay
  - Event markers: 🏁 Start, ⚔️ Battle, 🔄 Overtake, 🛞 Pit Stop, 🟡 Safety Car, 🏆 Finish
  - Click any event to jump replay to that moment
  - Hover to see event summary
- [ ] **Battle Replay Mode**: Select a battle → replay zooms into those two cars with enhanced telemetry overlay

---

### Milestone 4.4 — Pressure & Consistency Analysis

#### Deliverables

- [ ] **Pressure Detection Engine**:
  ```python
  class PressureAnalyzer:
      def compute_pressure_index(driver_laps, gap_to_car_behind) -> PressureTimeline
          # Correlate telemetry variance with proximity to attacking car
          # Indicators: brake point variance, throttle jitter, lap time variance
          # Output: per-lap pressure score (0-100)
  ```
- [ ] **Pressure Heatmap**: Color-code each lap by pressure level on the race timeline
- [ ] **Consistency Comparison**: Lap time distribution (violin/box plot) for each driver. Show consistency under clean air vs under pressure
- [ ] **Mistake Detection**: Anomaly detection on per-corner speed — sudden drops = potential mistakes. Map mistakes to track positions

---

## Phase 5 — Advanced Features & Polish

**Goal:** Implement multi-race analysis, enhance the AI engineer, add predictive features, and polish the entire platform to release quality.

**Duration:** ~3–4 weeks

---

### Milestone 5.1 — Multi-Race & Season Analysis

#### Deliverables

- [ ] **Season Dashboard**: Team standings evolution (animated line chart over rounds). Driver standings evolution. Points per race bar chart
- [ ] **Driver Season DNA Evolution**: How each DNA dimension changes across the season. Detect improvement/regression trends
- [ ] **Circuit-Specific Profiles**: Which drivers/teams are strongest at which types of circuits (high-speed vs street vs high-downforce). Cluster circuits by characteristics
- [ ] **Head-to-Head Season Stats**: Teammate qualifying battles, race results, consistency comparison across full season

---

### Milestone 5.2 — Enhanced AI Engineer

#### Deliverables

- [ ] **Richer Context Window**: Multi-race context — "How has Verstappen's tire management evolved this season?"
- [ ] **Visualization Integration**: AI can reference and highlight specific charts. "Look at the degradation curve — you can see the cliff at lap 28" → highlights that point on the chart
- [ ] **Proactive Insights**: AI notices interesting patterns and suggests them. "I noticed Piastri's braking pattern changed significantly after the safety car restart — would you like me to analyze that?"
- [ ] **Export Capability**: Export AI explanations as formatted reports (PDF/Markdown)

---

### Milestone 5.3 — UX Polish & Performance

#### Deliverables

- [ ] **Micro-animations**: Smooth transitions between dashboard panels. Number animations (counts up when lap times appear). Hover effects on all interactive elements. Loading state animations
- [ ] **Keyboard Shortcuts**: Space = play/pause replay, arrow keys = navigate laps, `/` = open AI engineer, `C` = compare mode
- [ ] **Performance Optimization**: Lazy load heavy visualization components. Virtual scrolling for large tables. WebGL for charts with >10K data points. Data pagination for telemetry endpoints. Frontend bundle optimization (code splitting)
- [ ] **Error Handling**: Graceful fallbacks for sessions with missing data. Informative error states (not blank screens). Retry mechanisms for API failures

---

### Milestone 5.4 — Documentation & Deployment

#### Deliverables

- [ ] **README.md**: Project overview, screenshots, feature list, tech stack, setup instructions
- [ ] **API Documentation**: Auto-generated via FastAPI Swagger + custom endpoint descriptions
- [ ] **User Guide**: Interactive onboarding tour for first-time users
- [ ] **Docker Production Setup**: Multi-stage builds for smaller images. Nginx reverse proxy. Environment variable configuration
- [ ] **Deployment Guide**: Instructions for local development, Docker deployment, and cloud deployment (Railway/Render/VPS)

---

## Phase 6 — Future Vision (Post-Launch)

These features are aspirational and can be pursued after the core platform is stable.

---

### 6.1 — Live Race Analysis (OpenF1 Integration)
- [ ] Integrate with OpenF1 API for real-time data during races
- [ ] Live timing tower with real-time updates
- [ ] Real-time degradation predictions
- [ ] Live AI commentary

### 6.2 — Predictive Strategy Engine
- [ ] ML model trained on historical strategy outcomes
- [ ] "Optimal strategy" calculator for upcoming races
- [ ] Safety car probability prediction based on historical data
- [ ] Pit window optimization engine

### 6.3 — 3D Track Visualization
- [ ] Three.js-powered 3D circuit rendering using X/Y/Z data
- [ ] Elevation profiles (Spa, COTA, etc.)
- [ ] 3D car models on track
- [ ] Flythrough camera modes

### 6.4 — Voice-Enabled Engineer
- [ ] Speech-to-text for hands-free questions
- [ ] Text-to-speech for AI engineer responses
- [ ] "Hey Engineer, why was Leclerc slow in Sector 3?" — full voice interaction

### 6.5 — Mobile Companion (PWA)
- [ ] Progressive Web App for mobile access
- [ ] Simplified dashboard optimized for phone screens
- [ ] Race-day companion mode: quick access to key stats and AI insights

### 6.6 — Community Features
- [ ] Share analysis snapshots (shareable URLs)
- [ ] Export visualizations as images/videos for social media
- [ ] User-created analysis presets

---

## Dependency Graph

```
Phase 0 (Foundation)
  ├── 0.1 Repo Setup ────────────────────────────────┐
  ├── 0.2 Data Layer ──── depends on 0.1 ────────────┤
  └── 0.3 API Foundation ── depends on 0.2 ──────────┘
                                                      │
Phase 1 (Core Dashboard)                              │
  ├── 1.1 Design System ── depends on 0.1 ───────────┤
  ├── 1.2 Timing Tower ─── depends on 0.3, 1.1 ──────┤
  ├── 1.3 Telemetry Charts ── depends on 0.3, 1.1 ───┤
  └── 1.4 Track Map ──── depends on 0.3, 1.1 ────────┘
                                                      │
Phase 2 (Comparison & Strategy)                       │
  ├── 2.1 Lap Comparison ── depends on 1.3, 1.4 ─────┤
  ├── 2.2 Strategy Timeline ── depends on 1.2 ────────┤
  ├── 2.3 Tire Degradation ── depends on 2.2 ─────────┤
  └── 2.4 Undercut Analysis ── depends on 2.2, 2.3 ──┘
                                                      │
Phase 3 (AI & DNA)                                    │
  ├── 3.1 Insight Engine ── depends on 2.1, 2.3 ──────┤
  ├── 3.2 AI Engineer ── depends on 3.1 ──────────────┤
  ├── 3.3 Driver DNA ── depends on 1.3, 1.4 ──────────┤
  └── 3.4 Driver Comparison ── depends on 3.3 ────────┘
                                                      │
Phase 4 (Replay & Battles)                            │
  ├── 4.1 Replay Core ── depends on 1.4 ──────────────┤
  ├── 4.2 Replay Overlays ── depends on 4.1, 1.2 ─────┤
  ├── 4.3 Battle Detection ── depends on 4.1 ─────────┤
  └── 4.4 Pressure Analysis ── depends on 3.3, 4.3 ──┘
                                                      │
Phase 5 (Polish & Advanced)                           │
  ├── 5.1 Season Analysis ── depends on 3.3 ──────────┤
  ├── 5.2 Enhanced AI ── depends on 3.2, 5.1 ─────────┤
  ├── 5.3 UX Polish ── depends on all above ──────────┤
  └── 5.4 Documentation ── depends on all above ──────┘
```

---

## Key Technical Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Backend Framework | FastAPI | Async, auto-docs, native Python for FastF1, modern |
| Frontend Framework | React + Vite + TypeScript | Type safety, ecosystem, component architecture |
| Chart Library | Apache ECharts (WebGL) + Canvas API | High performance for telemetry data (10K+ points) |
| State Management | Zustand + TanStack Query | Lightweight client state + server state caching |
| Track Map Rendering | HTML5 Canvas | 60fps rendering for 20 cars, custom coordinate system |
| AI/LLM Provider | Gemini API (primary) | Abstracted behind interface for provider flexibility |
| ML Framework | Scikit-learn | Sufficient for clustering, regression, anomaly detection |
| Database | SQLite (dev) → PostgreSQL (prod) | Simple start, scalable upgrade path |
| Caching | FastF1 file cache + Redis | Raw data cache + computed results cache |
| Design Approach | Dark engineering UI | Authentic to professional F1 tools |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| FastF1 API rate limiting | Data loading failures | Aggressive caching, pre-load sessions in batch |
| FastF1 breaking changes | Backend failures | Pin version, abstract data layer |
| Position data too low-res for smooth replay | Janky replay animation | Interpolation (cubic spline), adjustable replay speed |
| LLM API costs | Budget overrun | Cache frequent questions, limit context size, use smaller models for simple queries |
| Large telemetry payloads slow frontend | Poor UX | Pagination, data downsampling, WebSocket streaming, progressive loading |
| Scope creep | Never ships | Strict phase boundaries, MVP per phase |
| FastF1 position data is normalized (same line for all laps) | Can't show racing line differences | Acknowledge limitation, focus on speed/timing differences instead |

---

## Success Metrics Per Phase

| Phase | Success Criteria |
|---|---|
| **Phase 0** | Backend serves data from any 2019+ session via API. Frontend renders with design system. |
| **Phase 1** | User can select any session and view telemetry charts + track map for any driver. |
| **Phase 2** | User can compare two laps and see exactly where time was gained/lost. Strategy view shows the full race story. |
| **Phase 3** | AI Engineer answers questions about races intelligently. Driver DNA profiles are generated and comparable. |
| **Phase 4** | Race replay runs smoothly at 60fps with all 20 cars. Battles are auto-detected and narratable. |
| **Phase 5** | Platform feels polished, fast, and professional. Multi-race analysis works across full seasons. |

---

> **This roadmap is a living document.** It should be updated as development progresses, learnings emerge, and priorities shift. The key principle: **ship value incrementally** — each phase delivers a usable, impressive capability.
