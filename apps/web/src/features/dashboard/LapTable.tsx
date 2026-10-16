import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { f1Service } from '../../services/api';
import { useSessionStore } from '../../stores/sessionStore';
import { ErrorState, Skeleton } from '../../components/PanelState';
import type { LapData } from '../../types/f1';
import tireSoft         from '../../assets/icons/tire-soft.svg';
import tireMedium       from '../../assets/icons/tire-medium.svg';
import tireHard         from '../../assets/icons/tire-hard.svg';
import tireIntermediate from '../../assets/icons/tire-intermediate.svg';
import tireWet          from '../../assets/icons/tire-wet.svg';
import './LapTable.css';

const TYRE_ICONS: Record<string, string> = {
  soft:         tireSoft,
  medium:       tireMedium,
  hard:         tireHard,
  intermediate: tireIntermediate,
  wet:          tireWet,
};

function formatTime(secs: number | null): string {
  if (secs == null) return '—';
  if (secs >= 60) {
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toFixed(3).padStart(6, '0');
    return `${m}:${s}`;
  }
  return secs.toFixed(3);
}

function TyreIcon({ compound }: { compound: string }) {
  const src = TYRE_ICONS[compound.toLowerCase()];
  if (!src) return <span className="tyre-unknown">{compound.charAt(0).toUpperCase()}</span>;
  return <img src={src} alt={compound} className="tyre-img" />;
}

export function LapTable() {
  const { selectedYear, selectedEvent, selectedSessionType } = useSessionStore();

  const { data: laps, isLoading, error } = useQuery({
    queryKey: ['laps', selectedYear, selectedEvent, selectedSessionType],
    queryFn: () => f1Service.getLaps(selectedYear, selectedEvent!, selectedSessionType!),
    enabled: !!selectedEvent && !!selectedSessionType,
  });

  // Group by lap number, sort each group by lap time, show most recent laps first
  const lapGroups = useMemo(() => {
    if (!laps) return [];
    const groups = new Map<number, LapData[]>();
    for (const lap of laps) {
      if (lap.lapTime == null) continue; // skip incomplete laps
      if (!groups.has(lap.lapNumber)) groups.set(lap.lapNumber, []);
      groups.get(lap.lapNumber)!.push(lap);
    }
    for (const [, group] of groups) {
      group.sort((a, b) => (a.lapTime ?? Infinity) - (b.lapTime ?? Infinity));
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[0] - a[0]) // most recent lap first
      .map(([lapNum, rows]) => ({ lapNum, rows }));
  }, [laps]);

  if (isLoading) return <Skeleton rows={8} />;
  if (error) return <ErrorState error={error} />;
  if (!laps) return <div className="lap-table-empty">Select a session to view lap data</div>;
  if (lapGroups.length === 0) return <div className="lap-table-empty">No lap data available</div>;

  return (
    <div className="lap-table-container">
      <table className="lap-table">
        <thead>
          <tr>
            <th>LAP</th>
            <th>DRIVER</th>
            <th>CMP</th>
            <th>S1 TIME</th>
            <th>S2 TIME</th>
            <th>S3 TIME</th>
            <th>LAP TIME</th>
          </tr>
        </thead>
        <tbody>
          {lapGroups.map(({ lapNum, rows }) =>
            rows.map((lap, i) => (
              <tr
                key={`${lapNum}-${lap.driver}`}
                className={`${i === 0 ? 'lap-group-first' : ''} ${lap.isPersonalBest ? 'lap-personal-best' : ''}`}
              >
                <td className="data-text lap-num-cell">
                  {i === 0 ? <span className="lap-num-badge">L{lapNum}</span> : null}
                </td>
                <td className="font-bold driver-cell">{lap.driver}</td>
                <td className="tyre-cell">
                  {lap.compound ? <TyreIcon compound={lap.compound} /> : <span className="text-muted">—</span>}
                </td>
                <td className="data-text">{formatTime(lap.sector1Time)}</td>
                <td className="data-text">{formatTime(lap.sector2Time)}</td>
                <td className="data-text">{formatTime(lap.sector3Time)}</td>
                <td className={`data-text font-bold ${lap.isPersonalBest ? 'text-personal-best' : ''}`}>
                  {formatTime(lap.lapTime)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
