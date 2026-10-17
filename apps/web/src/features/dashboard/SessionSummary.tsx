import { useMemo } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useLaps, useRaceControl, useResults, useWeather } from '../../hooks/useSessionQueries';
import { formatTime } from '../../utils/format';
import './SessionSummary.css';

const range = (values: number[], unit: string) =>
  values.length ? `${Math.round(Math.min(...values))}–${Math.round(Math.max(...values))}${unit}` : '—';

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="summary-stat">
      <span className="summary-label">{label}</span>
      <span className="summary-value">{value}</span>
      {detail && <span className="summary-detail">{detail}</span>}
    </div>
  );
}

/** One-line overview of the selected session, built from data the other panels already load. */
export function SessionSummary() {
  const sessionType = useSessionStore((s) => s.selectedSessionType);
  const { data: results } = useResults();
  const { data: laps } = useLaps();
  const { data: raceControl } = useRaceControl();
  const { data: weather } = useWeather();

  const s = useMemo(() => {
    const timed = (laps ?? []).filter((l) => l.lapTime != null);
    const fastest = timed.reduce<(typeof timed)[number] | null>((best, l) => (!best || l.lapTime! < best.lapTime! ? l : best), null);
    const deployed = (text: string) => (raceControl ?? []).filter((m) => m.message === text).length;
    return {
      fastest,
      laps: laps?.length ? Math.max(...laps.map((l) => l.lapNumber)) : null,
      sc: deployed('SAFETY CAR DEPLOYED'),
      vsc: deployed('VIRTUAL SAFETY CAR DEPLOYED'),
      reds: (raceControl ?? []).filter((m) => m.flag === 'RED').length,
      air: range((weather ?? []).map((w) => w.airTemp), '°C'),
      track: range((weather ?? []).map((w) => w.trackTemp), '°C'),
      rain: (weather ?? []).some((w) => w.rainfall),
    };
  }, [laps, raceControl, weather]);

  if (!results && !laps) return null;

  const isRace = sessionType === 'R' || sessionType === 'S';
  const isQuali = sessionType === 'Q' || sessionType === 'SQ';
  const p1 = results?.drivers.find((d) => d.position === 1);

  return (
    <div className="session-summary">
      {(isRace || isQuali) && (
        <Stat label={isRace ? 'Winner' : 'Pole'} value={p1?.driver.abbreviation ?? '—'} detail={p1?.driver.team} />
      )}
      <Stat
        label="Fastest lap"
        value={s.fastest ? formatTime(s.fastest.lapTime) : '—'}
        detail={s.fastest ? `${s.fastest.driver}, lap ${s.fastest.lapNumber}` : undefined}
      />
      <Stat label="Laps" value={s.laps != null ? String(s.laps) : '—'} />
      {isRace && (
        <Stat
          label="Safety car"
          value={raceControl ? `${s.sc} SC · ${s.vsc} VSC` : '—'}
          detail={s.reds ? `${s.reds} red flag${s.reds > 1 ? 's' : ''}` : undefined}
        />
      )}
      <Stat label="Air / track" value={`${s.air} / ${s.track}`} detail={weather ? (s.rain ? 'Rain' : 'Dry') : undefined} />
    </div>
  );
}
