import { useMemo } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useLaps, useResults } from '../../hooks/useSessionQueries';
import { ErrorState, Skeleton } from '../../components/PanelState';
import { TyreIcon } from '../../components/TyreIcon';
import { formatTime } from '../../utils/format';
import type { LapData } from '../../types/f1';
import './TimingTower.css';

interface DriverLapStats {
  compound: string;
  tyreLife: number;
  stops: number;
}

/**
 * Each driver's tyre on their last lap and pit stops, plus the session's fastest lap.
 *
 * A stop is a new stint whose tyre age didn't carry on. A plain "stints − 1" also counts
 * laps where the safety car led the field through the pit lane without stopping (e.g.
 * 2025 Australia, laps 2–4). ponytail: tyre age is occasionally wrong in the source data
 * for exactly those laps, so a driver can still be over-counted in such races.
 */
function summariseLaps(laps: LapData[] | undefined) {
  const byDriverLaps = new Map<string, LapData[]>();
  let fastest: LapData | null = null;
  for (const lap of laps ?? []) {
    if (!byDriverLaps.has(lap.driver)) byDriverLaps.set(lap.driver, []);
    byDriverLaps.get(lap.driver)!.push(lap);
    if (lap.lapTime != null && (!fastest || lap.lapTime < fastest.lapTime!)) fastest = lap;
  }

  const byDriver = new Map<string, DriverLapStats>();
  for (const [driver, rows] of byDriverLaps) {
    rows.sort((a, b) => a.lapNumber - b.lapNumber);
    const stops = rows.filter((l, i) => i > 0 && l.stint > rows[i - 1].stint && l.tyreLife <= rows[i - 1].tyreLife).length;
    const last = rows[rows.length - 1];
    byDriver.set(driver, { compound: last.compound, tyreLife: last.tyreLife, stops });
  }
  return { byDriver, fastest };
}

export function TimingTower() {
  const { selectedSessionType, focusedDriver, focusDriver } = useSessionStore();
  const { data: results, isLoading, error } = useResults();
  const { data: laps } = useLaps();

  const { byDriver, fastest } = useMemo(() => summariseLaps(laps), [laps]);
  const isRace = selectedSessionType === 'R' || selectedSessionType === 'S';

  if (isLoading) return <div className="timing-tower"><Skeleton rows={14} /></div>;
  if (error) return <div className="timing-tower"><ErrorState error={error} /></div>;
  if (!results) return <div className="timing-tower timing-tower--state">Select a session to view standings</div>;

  return (
    <div className="timing-tower">
      <div className="tower-header">
        <span className="th-pos">POS</span>
        <span className="th-dot" />
        <span className="th-driver">DRIVER</span>
        <span className="th-tyre">TYRE</span>
        {isRace && <span className="th-pit" title="Pit stops">PIT</span>}
        <span className="th-gap">GAP</span>
      </div>
      <div className="tower-body">
        {results.drivers.map((d) => {
          const abbr = d.driver.abbreviation;
          const isSelected = focusedDriver === abbr;
          const isLeader = d.position === 1;
          const gapText = isLeader ? 'Leader' : (d.gap ?? '—');
          const lapStats = byDriver.get(abbr);
          const hasFastest = fastest?.driver === abbr;
          return (
            <div
              key={abbr}
              className={`tower-row${isSelected ? ' selected' : ''}`}
              onClick={() => focusDriver(abbr)}
            >
              <span className="tower-pos">{d.position ?? '—'}</span>
              <span
                className="tower-dot"
                style={{ backgroundColor: d.driver.teamColor ? `#${d.driver.teamColor.replace('#', '')}` : '#444' }}
              />
              <div className="tower-driver">
                <span className="driver-abbr">
                  {abbr}
                  {hasFastest && (
                    <span className="tower-fastest" title={`Fastest lap: ${formatTime(fastest.lapTime)} (lap ${fastest.lapNumber})`}>
                      FL
                    </span>
                  )}
                </span>
                <span className="driver-team">{d.driver.team}</span>
              </div>
              <span className="tower-tyre" title={lapStats ? `${lapStats.compound}, ${lapStats.tyreLife} laps old` : undefined}>
                {lapStats?.compound ? (
                  <>
                    <TyreIcon compound={lapStats.compound} size={14} />
                    <span className="tower-tyre-age">{lapStats.tyreLife}</span>
                  </>
                ) : '—'}
              </span>
              {isRace && <span className="tower-pit">{lapStats ? lapStats.stops : '—'}</span>}
              <span className={`tower-gap${isLeader ? ' tower-gap--leader' : ''}`}>{gapText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
