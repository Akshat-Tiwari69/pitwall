# Pitwall — Roadmap

> Last updated: 2026-10-16 · Status legend: ✅ done · 🟡 partial · ⬜ not started

## How this roadmap works

**Assumptions** (change these and the plan changes): solo developer · showcase-quality project with a public demo · historical sessions first, live data later · one LLM provider.

**Principles**

1. **Vertical slices.** Every milestone ends in something a user can open and use. No phase of "all the charts", then "all the analysis", then "all the AI".
2. **Insight ships with the view.** Each analysis view comes with plain-language findings from day one. They're deterministic templates first; the LLM rewrites them later. "Why, not just what" starts in Phase 2, not Phase 4.
3. **Real data only.** No mock panels in the product. If FastF1 can't provide it (fuel, brake temps, ERS, tyre temps), we don't show it.
4. **Compute in Python, render in React.** Analysis lives in pure, tested functions in `apps/api/app/analysis/`. The web app only draws results.
5. **Every milestone has a "Done when".** It's a concrete check, ideally against a known race, not "feels polished".

Sizes: **S** ≈ a few evenings · **M** ≈ 1–2 weeks · **L** ≈ 3+ weeks (split it).

---

## Now / Next / Later

| | |
|---|---|
| **Now** | Phase 1 is complete. Next: Phase 2, lap comparison, once the data question below is settled |
| **Data** | ⏸ **Waiting on FastF1.** F1's timing archive has needed an F1 TV login since ~15 Oct 2026 ([Fast-F1#978](https://github.com/theOehrly/Fast-F1/issues/978)). Until FastF1 supports it, build against the 4 cached sessions. **Plan B:** [OpenF1](https://openf1.org) as a fallback source (2023 onward; 2026 telemetry verified on 2026-10-17). Switch if FastF1 is still locked out when Phase 2 starts. |
| **Next** | Phase 2: lap comparison with auto-generated findings → **v0.1 public demo** |
| **Then** | Phase 3: race story → Phase 4: AI race engineer → **v0.2** → Phase 5: replay → **v1.0** |
| **Later** | Driver profiles & season view, live timing, strategy simulator |

---

## Architecture

```
apps/web  React + Vite + TS · TanStack Query · Zustand · ECharts · Three.js
   │  REST (JSON)
apps/api  FastAPI
   ├── api/         routes, error mapping
   ├── services/    FastF1 loading + in-memory session cache        ✅
   ├── analysis/    pure functions: compare, stints, degradation…   ⬜ (Phase 2+)
   ├── engineer/    LLM tool-calling over analysis/                 ⬜ (Phase 4)
   └── storage      FastF1 disk cache ✅ · computed results as files on disk ⬜
```

No database, Redis or WebSocket until a feature actually needs one. Historical data is immutable, so computed results are cached as files keyed by session.

---

## Phase 1 — Foundation & Session Explorer *(in progress)*

**Goal:** someone can pick any session from 2018 to today, trust everything on screen, and share a link to it.

### ✅ Already done
- Monorepo (`apps/api`, `apps/web`, `docs/`), git, Makefile, README
- FastF1 data service: seasons, results, laps, telemetry (single + multi-driver), weather, race control, circuit info, track outline
- Session cache: one load per session shared across requests, upgraded in place when telemetry is needed
- Dashboard shell, design tokens, Year → Event → Session selector, sidebar navigation
- Timing tower (position, team, gap), lap table, telemetry charts (speed/throttle/brake/gear, up to 3 drivers, linked crosshair)
- 3D track view, team-themed driver dashboard, tyre strategy for one driver, weather strip, race control feed
- API smoke tests (`apps/api/tests`)

### 1.1 API hardening — S ✅
*Shipped 2026-10-16. CI is green. Also fixed: race gaps were negative (`+-5482s`), and lapped cars now show "+1 Lap". Note: 2026 sessions are selectable, but since F1's archive lockout only their results load (see Data above).*
- Typed errors: unknown event / driver / lap → 404; bad params → 422; never return raw exception text
- Resolve the event name through the FastF1 schedule, so "bahrain", "Bahrain" and "Bahrain Grand Prix" share one cache entry
- Season range from 2018 to the current year, derived from the date instead of hardcoded (2026 is currently unreachable)
- Replace the deprecated `pick_driver` with `pick_drivers`; add request logging
- Web: API base URL from `VITE_API_URL`
- CI (GitHub Actions): ruff, pytest, `tsc`, eslint, build

**Done when:** CI is green; `GET …/2024/Atlantis/R/results` returns 404; 2026 sessions are selectable.

### 1.2 Honest UI — S ✅
*Shipped 2026-10-16, finished 2026-10-17. Initial JS is 108 kB gzipped; ECharts and Three.js load as separate chunks. Also removed: the fake account avatar, the Strategy/AI Engineer "coming soon" pages, and panel titles that promised more than they showed ("Track positions", "Lap comparison").*
- Remove the Car Status gauges (FastF1 has no fuel, brake temp or ERS data) and hide the mock AI Engineer panel until Phase 4
- Remove or label the 3D car dots (they're evenly spaced, not real positions) until replay exists
- Skeleton loaders and real error states instead of blank panels
- Lazy-load routes so Three.js and ECharts aren't in the first bundle

**Done when:** no mock or placeholder data anywhere in the UI (the only "demo" in the code is the GitHub Pages online-demo mode); initial JS is under 250 kB gzipped (was ~600 kB).

### 1.3 URL state — S ✅
*Shipped 2026-10-17. The selection lives in query parameters (`/telemetry?year=2024&event=Bahrain+Grand+Prix&session=R&drivers=VER,LEC&lap=12`, plus `focus=` for the driver view), so links also work on the GitHub Pages demo. Verified: a pasted link restores page, session, drivers and lap; clicks update the URL; the sidebar keeps the selection between pages.*
- Session, selected drivers and lap live in the URL, e.g. `/2024/bahrain/R/telemetry?d=VER,LEC&lap=fastest`
- Reloading restores the view, and links are shareable. This covers most of the old "community sharing" idea for free.

**Done when:** copying the URL into a fresh tab reproduces the exact view.

### 1.4 Session explorer completion — M ✅
*Shipped 2026-10-17. Verified against [OpenF1](https://openf1.org) as an independent source for Bahrain 2024 R: fastest lap (VER 1:32.608, lap 39), 0 SC / 0 VSC, and all 20 drivers' pit counts match.*
- Timing tower: current tyre and its age, pit stop count, fastest lap in purple
- Lap table: sortable and filterable, personal bests in green, overall fastest in purple, pit in/out laps marked
- Session summary card: winner/pole, fastest lap, laps completed, SC/VSC count, weather range
- Telemetry: add RPM and DRS traces (the API already sends them), corner markers from circuit info, zoom

**Done when:** for Bahrain 2024 R, the fastest lap, pit counts and SC periods shown match the official results.

### 1.5 Analysis track map — M ✅
*Shipped 2026-10-17, on the Telemetry page next to the charts. The speed heatmap uses a single-hue blue ramp (dark = slow, light = fast) rather than blue→red, which keeps it colour-blind safe. Verified: hovering the T1 label snaps to 712 m (FastF1's T1 distance is 712.3 m), and the chart crosshair lands on the T1 braking minimum (73 km/h, 3rd gear).*
- A 2D SVG map for analysis: crisp labels and hover. Three.js stays for the showcase and replay view.
- Circuit rotation, corner numbers, sector colours, speed heatmap for the selected lap
- Shared distance cursor: hovering the map moves the telemetry crosshair, and the reverse

**Done when:** hovering Turn 1 on the map highlights the braking zone in the speed trace.

### 1.6 Cold-load experience — S ✅
*Shipped 2026-10-17. Measured on a fresh API process with a warm disk cache: the dashboard's requests take under 1 s in total. ⚠ The **first** telemetry view of a session takes ~3.3 s (car and position data processed once), then ~0.01 s. Panels loading for more than 4 s now explain why. Under the archive lockout, the command can only re-warm already-cached sessions; others are reported and skipped.*
- `python -m app.precompute 2024` warms the FastF1 cache for a season
- The first-load state says what's happening: a cold race download takes tens of seconds

**Done when:** demo sessions open in under 2 s on a warm cache.

---

## Phase 2 — Lap Comparison *(first "intelligence" slice)* → v0.1

**Goal:** pick two laps and get told *where* and *how* the time was won or lost.

### 2.1 Comparison engine — M ⬜
- `analysis/compare.py`: resample both laps onto a common distance grid (e.g. every 5 m), compute the cumulative delta, and split into corner-based segments using the `Distance` of each corner in circuit info
- Per corner: entry speed, minimum speed, exit speed, brake-on point, throttle-on point
- Golden tests against cached sessions

**Done when:** the delta at the finish line equals the real lap time difference within 0.05 s (this is a built-in correctness check).

### 2.2 Comparison view — M ⬜
- Driver A/lap vs driver B/lap pickers with "fastest vs fastest" and "teammates" shortcuts
- Delta trace under the speed traces, a corner-by-corner table, the track map coloured by who's faster, and brake-point markers

### 2.3 Findings v1 (deterministic) — S ⬜
- Rank segments by time gained or lost, then template the top findings, e.g. *"Biggest gain: T10, +0.14 s. Brakes 11 m later and carries 6 km/h more minimum speed."*
- Suppress differences below sampling resolution (see Data caveats) instead of reporting noise

**Done when:** on Bahrain 2024 Q (VER vs LEC fastest laps), the top 3 findings agree with what the delta trace visibly shows.

### 2.4 Release v0.1 — S ⬜
- Deploy: API in a Docker container with a persistent volume for the FastF1 cache; web as a static site
- The cache must be warmed locally and shipped, since nothing can download new sessions while F1's archive needs a login (see Data caveats).
- README with screenshots and a demo link; 3–5 preloaded showcase sessions

**Done when:** a stranger can open the public URL and compare two laps without instructions.

---

## Phase 3 — Race Story

**Goal:** understand a whole race: strategy, pace, pit stops and safety cars, with findings.

### 3.1 Race data layer — M ⬜
- Stints, pit stops (time in the pit lane from PitIn/PitOut; stationary time isn't in the data), track status (SC/VSC/red flag), position and gap to the leader per lap

### 3.2 Race views — M 🟡
- Strategy chart for the whole field (today it exists for one driver), gap-to-leader race trace, position chart, SC/VSC shading on all of them

### 3.3 Tyre degradation — M ⬜
- **Fuel correction (correct sign):** normalise every lap to an empty tank, `corrected = lap_time − laps_remaining × k`, with k ≈ 0.03–0.06 s/lap as a configurable value. Heavy early laps get *faster* after correction, not slower.
- Clean laps only: exclude in-laps, out-laps, SC/VSC laps and lap 1
- A linear fit per stint gives the degradation rate in s/lap with a confidence range. Only call a "cliff" when a two-segment fit beats the linear one by a clear margin.

**Done when:** degradation rates are stable (±20%) when one lap is removed from a stint.

### 3.4 Pit-stop outcomes — M ⬜
- For each stop, find the rivals within a pit-window gap. Undercut/overcut verdict = gap before the first car stopped vs gap after both stopped. Also track positions gained or lost through the stops.

### 3.5 Race summary v1 (deterministic) — S ⬜
- Start (lap 1 gains and losses), stops, SC periods, decisive moves, result, all generated from 3.1–3.4

**Done when:** the Bahrain 2024 summary lists every pit stop and SC period, matching the official data.

---

## Phase 4 — AI Race Engineer → v0.2

**Goal:** ask questions in plain English and get answers grounded in computed data.

### 4.1 Tool layer — S ⬜
- Expose the analysis functions as LLM tools (`compare_laps`, `get_stints`, `get_degradation`, `get_race_events`, …)
- Rule: the model only states numbers that came back from a tool call

### 4.2 Chat panel — M ⬜
- Docked panel that knows the current view from the URL state (session, drivers, lap)
- Streaming responses, suggested questions for each view
- Answers link to evidence: links that open the relevant chart with the right drivers and laps

### 4.3 Evals & guardrails — S ⬜
- 30–50 question eval set, each with required facts and forbidden claims; run it before any prompt or model change
- No invented causes: if the data can't show *why* (setup, driver feedback), say so
- Per-session token cap, response cache for repeated questions

### 4.4 Prose findings — S ⬜
- Optional: the LLM rewrites the Phase 2/3 deterministic findings into engineer-style prose, constrained to the same facts

**Done when:** at least 90% of eval questions pass, with zero fabricated numbers.

---

## Phase 5 — Race Replay → v1.0

**Goal:** watch any race unfold on the track with live timing, and jump to the moments that mattered.

### 5.1 Replay data — M ⬜
- Position data resampled to a fixed ~4 Hz (the source rate; smoothing happens client-side), stored as columnar float32 chunks per 10 laps and served as static cached files over HTTP
- Budget: 20 cars × 2 h × 4 Hz × (x, y) ≈ 5 MB raw per race, so no WebSocket is needed

### 5.2 Player — M ⬜
- Reuses the Three.js track: play/pause, 1–20× speed, scrub bar, jump to lap
- Timing tower synced to replay time

### 5.3 Event timeline — S ⬜
- Overtakes (position swaps not caused by pit stops), stops and SC periods from Phase 3 shown on a timeline; click to jump

### 5.4 Overlays — S ⬜
- Flag states, close-gap highlight, telemetry strip for the selected driver

**Done when:** a full race plays at 60 fps on a mid-range laptop, and every Phase 3 event is reachable from the timeline.

---

## Phase 6 — Driver Profiles & Season *(later)*

- **Transparent metrics, no black-box ML:** qualifying gap to teammate, race pace vs teammate (clean, fuel-corrected laps), degradation vs the field on the same compound, consistency (spread of clean lap times), lap-1 gains, overtakes made and lost. Each is shown as a percentile against the field.
- Labels like "Tyre whisperer" only when a percentile rule backs them, never from clustering about 20 drivers
- Teammate head-to-head across the season; standings evolution; multi-race context for the AI engineer
- **Research spike first:** test whether telemetry style metrics (braking aggression, throttle smoothness) are stable across laps at ~4 Hz *before* building them into the product

---

## Parking lot (only if something pulls for it)

Live timing via OpenF1 · strategy what-if simulator · image/video export · voice interface · mobile PWA

## Cut from the previous roadmap

| Item | Why |
|---|---|
| Redis, SQLite → Postgres | Historical data never changes; file caches cover it |
| WebSocket replay streaming | About 5 MB per race; static chunked files are simpler and cacheable |
| LLM provider abstraction | One provider; swap it if needed, since it's one module |
| K-means driver archetypes | About 20 samples, and unlabelled clusters don't come out as "Smooth Operator" |
| Pressure index / mistake detection | Not supportable at ~4 Hz without a research spike first |
| ECharts WebGL, telemetry pagination | A lap is around 800 points per channel |
| Week-based estimates | Replaced by S/M/L sizes and "Done when" checks |

---

## Data caveats (read before designing a feature)

| Limitation | Consequence |
|---|---|
| Car telemetry is ~4 Hz, interpolated | At 300 km/h that's ~20 m between samples, so brake-point differences under ~20 m are noise |
| `Brake` is on/off | No brake pressure; "braking aggression" can only mean timing, not force |
| X/Y position isn't a precise racing line | Don't compare driving lines; compare speeds and timings |
| No fuel, tyre temperature, ERS or brake temperature data | Never display them; fuel load is modelled, not measured |
| 2026 rules replace DRS with active aero and an overtake mode | DRS-based features apply to ≤ 2025; check what the DRS channel means for 2026 sessions |
| Cold session loads download a lot of data | Precompute or warm the demo sessions; show progress |
| When the safety car leads the field through the pit lane, FastF1 and OpenF1 both record each pass as a pit stop, and their tyre ages for those laps disagree | Pitwall counts a stop only when tyre age resets. That fixes most drivers, but one can still be over-counted (Stroll shows 5 in 2025 Australia; really 2) |
| **Since ~15 Oct 2026, F1's timing archive returns 401 without an F1 TV login** ([Fast-F1#978](https://github.com/theOehrly/Fast-F1/issues/978)); FastF1's mirror has no 2023–2026 data | Only cached sessions load (2024 Bahrain Q/R, 2024 Saudi R, 2025 Australia R); others get results only. CI skips `livedata` tests. **Never clear `app/f1_cache`**: a backup is at `F:\Code\Backups\pitwall-f1-cache-2026-10-17` |

## Engineering standards

- **Tests:** analysis functions get golden tests against cached real sessions; API routes get smoke tests; CI blocks merges on red
- **Performance budgets:** warm API responses < 300 ms; initial web JS < 250 kB gz; replay at 60 fps
- **Docs:** this roadmap's checkboxes are updated in the same PR that ships the work
