import { useQuery } from '@tanstack/react-query';
import { f1Service } from '../../services/api';
import { useSessionStore } from '../../stores/sessionStore';
import { ErrorState, Skeleton } from '../../components/PanelState';
import './TimingTower.css';

export function TimingTower() {
  const { selectedYear, selectedEvent, selectedSessionType, focusedDriver, focusDriver } = useSessionStore();

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['results', selectedYear, selectedEvent, selectedSessionType],
    queryFn: () => f1Service.getResults(selectedYear, selectedEvent!, selectedSessionType!),
    enabled: !!selectedEvent && !!selectedSessionType,
  });

  if (isLoading) return <div className="timing-tower"><Skeleton rows={14} /></div>;
  if (error) return <div className="timing-tower"><ErrorState error={error} /></div>;
  if (!results) return <div className="timing-tower timing-tower--state">Select a session to view standings</div>;

  return (
    <div className="timing-tower">
      <div className="tower-header">
        <span className="th-pos">POS</span>
        <span className="th-dot" />
        <span className="th-driver">DRIVER</span>
        <span className="th-gap">GAP</span>
      </div>
      <div className="tower-body">
        {results.drivers.map((d) => {
          const isSelected = focusedDriver === d.driver.abbreviation;
          const isLeader = d.position === 1;
          const gapText = isLeader ? 'Leader' : (d.gap ?? '—');
          return (
            <div
              key={d.driver.abbreviation}
              className={`tower-row${isSelected ? ' selected' : ''}`}
              onClick={() => focusDriver(d.driver.abbreviation)}
            >
              <span className="tower-pos">{d.position ?? '—'}</span>
              <span
                className="tower-dot"
                style={{ backgroundColor: d.driver.teamColor ? `#${d.driver.teamColor.replace('#', '')}` : '#444' }}
              />
              <div className="tower-driver">
                <span className="driver-abbr">{d.driver.abbreviation}</span>
                <span className="driver-team">{d.driver.team}</span>
              </div>
              <span className={`tower-gap${isLeader ? ' tower-gap--leader' : ''}`}>{gapText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
