import { useMemo, useRef, useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useCursorStore } from '../../stores/cursorStore';
import { nearestIndex, useCircuit, useCompareTelemetry, useLaps } from '../../hooks/useSessionQueries';
import { SECTOR_COLORS } from './trackConstants';
import type { LapData } from '../../types/f1';
import './AnalysisTrackMap.css';

// Sequential single-hue ramp (reference blue, dark → light): slow corners recede toward the
// dark surface, fast straights read brightest. One hue, so it stays colour-blind safe.
const SPEED_RAMP = ['#104281', '#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#6da7ec', '#86b6ef', '#9ec5f4', '#b7d3f6', '#cde2fb'];

type Mode = 'sectors' | 'speed';

/** Rotate a point by `rad` (counter-clockwise), the same transform FastF1 uses for its maps. */
const rotate = (x: number, y: number, rad: number): [number, number] =>
  [x * Math.cos(rad) - y * Math.sin(rad), x * Math.sin(rad) + y * Math.cos(rad)];

/**
 * 2D map of the first selected driver's lap, rotated to the official circuit orientation.
 * Hovering it moves the telemetry crosshair (and vice versa) through the cursor store.
 */
export function AnalysisTrackMap() {
  const { selectedDrivers, selectedLap } = useSessionStore();
  const { data } = useCompareTelemetry();
  const { data: circuit } = useCircuit();
  const { data: laps } = useLaps();
  const { cursor, setCursor } = useCursorStore();
  const [mode, setMode] = useState<Mode>('sectors');
  const svgRef = useRef<SVGSVGElement>(null);

  const driver = selectedDrivers.find((d) => data?.drivers[d]);
  const tel = driver ? data?.drivers[driver] : undefined;

  const geo = useMemo(() => {
    if (!tel || tel.x.length < 2) return null;
    const rad = ((circuit?.rotation ?? 0) * Math.PI) / 180;
    // SVG y grows downwards; FastF1 y grows upwards.
    const pts = tel.x.map((x, i) => {
      const [rx, ry] = rotate(x, tel.y[i], rad);
      return [rx, -ry] as [number, number];
    });
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const size = Math.max(maxX - minX, maxY - minY);
    const pad = size * 0.08;

    // Corner labels sit just off the track, pushed out along each corner's marker angle.
    const corners = (circuit?.corners ?? []).map((c) => {
      const [ox, oy] = rotate(size * 0.04, 0, (c.angle * Math.PI) / 180);
      const [lx, ly] = rotate(c.x + ox, c.y + oy, rad);
      return { label: `${c.number}${c.letter ?? ''}`, x: lx, y: -ly };
    });

    // Sector boundaries: telemetry time starts at 0 each lap, so S1 ends at time = sector1Time.
    const lap = (laps ?? []).filter((l) => l.driver === driver && l.lapTime != null)
      .reduce<LapData | null>((best, l) =>
        selectedLap ? (l.lapNumber === selectedLap ? l : best) : (!best || l.lapTime! < best.lapTime! ? l : best), null);
    let bounds: number[] | null = null;
    if (lap?.sector1Time != null && lap.sector2Time != null) {
      const s1 = lap.sector1Time, s2 = s1 + lap.sector2Time;
      bounds = [tel.time.findIndex((t) => t >= s1), tel.time.findIndex((t) => t >= s2)];
      if (bounds.some((b) => b <= 0)) bounds = null;
    }

    const minSpeed = Math.min(...tel.speed), maxSpeed = Math.max(...tel.speed);
    return {
      pts, corners, bounds, minSpeed, maxSpeed,
      viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`,
      fontSize: size / 34,
    };
  }, [tel, circuit, laps, driver, selectedLap]);

  if (!tel || !geo) return <div className="analysis-map analysis-map--empty">No position data for this lap.</div>;

  const toPolyline = (from: number, to: number) => geo.pts.slice(from, to + 1).map((p) => p.join(',')).join(' ');
  const speedColor = (v: number) =>
    SPEED_RAMP[Math.min(SPEED_RAMP.length - 1, Math.floor(((v - geo.minSpeed) / (geo.maxSpeed - geo.minSpeed || 1)) * SPEED_RAMP.length))];

  const cursorIdx = cursor ? nearestIndex(tel.distance, cursor.distance) : null;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    let best = 0, bestD = Infinity;
    geo.pts.forEach(([x, y], i) => {
      const d = (x - p.x) ** 2 + (y - p.y) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    });
    setCursor({ distance: tel.distance[best], source: 'map' });
  };

  const lapText = selectedLap ? `lap ${selectedLap}` : 'fastest lap';

  return (
    <div className="analysis-map">
      <div className="analysis-map-head">
        <span className="analysis-map-title">{driver} · {lapText}</span>
        <div className="analysis-map-modes" role="group" aria-label="Colour the track by">
          {(['sectors', 'speed'] as const).map((m) => (
            <button key={m} className={mode === m ? 'active' : ''} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === 'sectors' ? 'Sectors' : 'Speed'}
            </button>
          ))}
        </div>
      </div>

      <svg
        ref={svgRef}
        className="analysis-map-svg"
        viewBox={geo.viewBox}
        role="img"
        aria-label={`Track map of ${driver}'s ${lapText}, coloured by ${mode}`}
        onMouseMove={onMove}
        onMouseLeave={() => setCursor(null)}
      >
        {mode === 'sectors' && geo.bounds ? (
          [[0, geo.bounds[0]], [geo.bounds[0], geo.bounds[1]], [geo.bounds[1], geo.pts.length - 1]].map(([a, b], i) => (
            <polyline key={i} points={toPolyline(a, b)} stroke={SECTOR_COLORS[i]} className="track-line" />
          ))
        ) : mode === 'sectors' ? (
          <polyline points={toPolyline(0, geo.pts.length - 1)} stroke="#9090a8" className="track-line" />
        ) : (
          geo.pts.slice(1).map(([x, y], i) => (
            <line key={i} x1={geo.pts[i][0]} y1={geo.pts[i][1]} x2={x} y2={y} stroke={speedColor(tel.speed[i])} className="track-line" />
          ))
        )}

        {geo.corners.map((c) => (
          <text key={c.label} x={c.x} y={c.y} fontSize={geo.fontSize} className="corner-label">{c.label}</text>
        ))}

        {cursorIdx != null && (
          <circle cx={geo.pts[cursorIdx][0]} cy={geo.pts[cursorIdx][1]} r={geo.fontSize * 0.45} className="cursor-dot" />
        )}
      </svg>

      <div className="analysis-map-foot">
        {mode === 'speed' ? (
          <span className="speed-legend">
            {Math.round(geo.minSpeed)}
            <span className="speed-ramp" style={{ background: `linear-gradient(90deg, ${SPEED_RAMP.join(',')})` }} />
            {Math.round(geo.maxSpeed)} km/h
          </span>
        ) : geo.bounds ? (
          <span className="sector-legend">
            {SECTOR_COLORS.map((c, i) => <span key={c}><i style={{ background: c }} />S{i + 1}</span>)}
          </span>
        ) : (
          <span>Sector times unavailable for this lap</span>
        )}
        <span className="cursor-readout">
          {cursorIdx != null ? `${Math.round(tel.distance[cursorIdx]).toLocaleString()} m · ${Math.round(tel.speed[cursorIdx])} km/h` : 'Hover the track'}
        </span>
      </div>
    </div>
  );
}
