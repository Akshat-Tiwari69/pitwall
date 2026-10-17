import { useMemo, useState } from 'react';
import { useLaps } from '../../hooks/useSessionQueries';
import { ErrorState, Skeleton } from '../../components/PanelState';
import { TyreIcon } from '../../components/TyreIcon';
import { formatTime } from '../../utils/format';
import type { LapData } from '../../types/f1';
import './LapTable.css';

type SortKey = 'lapNumber' | 'driver' | 'sector1Time' | 'sector2Time' | 'sector3Time' | 'lapTime';

const COLUMNS: { key: SortKey | null; label: string }[] = [
  { key: 'lapNumber', label: 'LAP' },
  { key: 'driver', label: 'DRIVER' },
  { key: null, label: 'TYRE' },
  { key: 'sector1Time', label: 'S1' },
  { key: 'sector2Time', label: 'S2' },
  { key: 'sector3Time', label: 'S3' },
  { key: 'lapTime', label: 'LAP TIME' },
];

// Missing values (e.g. no S1 on lap 1) always sort last, whichever the direction.
function compare(a: LapData, b: LapData, key: SortKey, dir: 1 | -1): number {
  const x = a[key], y = b[key];
  if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
  return (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)) * dir;
}

export function LapTable() {
  const { data: laps, isLoading, error } = useLaps();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'lapNumber', dir: -1 });
  const [driver, setDriver] = useState('');

  const timed = useMemo(() => (laps ?? []).filter((l) => l.lapTime != null), [laps]);
  const drivers = useMemo(() => [...new Set(timed.map((l) => l.driver))].sort(), [timed]);
  const fastestTime = useMemo(() => Math.min(...timed.map((l) => l.lapTime!)), [timed]);

  const rows = useMemo(() => {
    const shown = driver ? timed.filter((l) => l.driver === driver) : timed;
    // Tie-break on lap time so the default "latest lap first" view lists each lap fastest-first.
    return [...shown].sort((a, b) => compare(a, b, sort.key, sort.dir) || compare(a, b, 'lapTime', 1));
  }, [timed, driver, sort]);

  if (isLoading) return <Skeleton rows={8} />;
  if (error) return <ErrorState error={error} />;
  if (!laps) return <div className="lap-table-empty">Select a session to view lap data</div>;
  if (timed.length === 0) return <div className="lap-table-empty">No lap data available</div>;

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'lapNumber' ? -1 : 1 }));

  return (
    <div className="lap-table-container">
      <div className="lap-table-toolbar">
        <select className="lap-filter" value={driver} onChange={(e) => setDriver(e.target.value)} aria-label="Filter by driver">
          <option value="">All drivers</option>
          {drivers.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="lap-legend"><i className="swatch swatch--fastest" />Fastest <i className="swatch swatch--pb" />Personal best</span>
      </div>
      <table className="lap-table">
        <thead>
          <tr>
            {COLUMNS.map(({ key, label }) => (
              <th
                key={label}
                className={key ? 'sortable' : undefined}
                onClick={key ? () => toggleSort(key) : undefined}
                aria-sort={key && sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
              >
                {label}{key && sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((lap) => {
            const isFastest = lap.lapTime === fastestTime;
            const timeClass = isFastest ? 'text-fastest' : lap.isPersonalBest ? 'text-personal-best' : '';
            return (
              <tr key={`${lap.lapNumber}-${lap.driver}`} className={isFastest ? 'lap-fastest' : lap.isPersonalBest ? 'lap-personal-best' : ''}>
                <td className="data-text lap-num-cell">
                  {lap.lapNumber}
                  {lap.pitInTime != null && <span className="pit-tag" title="In-lap: pitted at the end of this lap">IN</span>}
                  {lap.pitOutTime != null && <span className="pit-tag" title="Out-lap: left the pits on this lap">OUT</span>}
                </td>
                <td className="font-bold driver-cell">{lap.driver}</td>
                <td className="tyre-cell" title={lap.compound ? `${lap.compound}, ${lap.tyreLife} laps old` : undefined}>
                  {lap.compound ? <TyreIcon compound={lap.compound} /> : <span className="text-muted">—</span>}
                </td>
                <td className="data-text">{formatTime(lap.sector1Time)}</td>
                <td className="data-text">{formatTime(lap.sector2Time)}</td>
                <td className="data-text">{formatTime(lap.sector3Time)}</td>
                <td className={`data-text font-bold ${timeClass}`}>{formatTime(lap.lapTime)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
