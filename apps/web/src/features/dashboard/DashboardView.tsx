import { lazy, Suspense } from 'react';
import { TimingTower } from './TimingTower';
import { LapTable } from './LapTable';
import { useSessionStore } from '../../stores/sessionStore';
import { Skeleton } from '../../components/PanelState';
import './DashboardView.css';

// Chart/3D panels load as separate chunks so the shell and timing data render first.
const TelemetryMiniGrid = lazy(() =>
  import('../telemetry/TelemetryMiniGrid').then((m) => ({ default: m.TelemetryMiniGrid }))
);
const TrackMap = lazy(() =>
  import('../telemetry/TrackMap').then((m) => ({ default: m.TrackMap }))
);
const TeamDashboard = lazy(() =>
  import('../team-dashboard/TeamDashboard').then((m) => ({ default: m.TeamDashboard }))
);

function PanelHeader({ title }: { title: string }) {
  return <div className="panel-header"><span>{title}</span></div>;
}

export function DashboardView() {
  const focusedDriver = useSessionStore((s) => s.focusedDriver);

  if (focusedDriver) {
    return (
      <Suspense fallback={<Skeleton rows={14} />}>
        <TeamDashboard />
      </Suspense>
    );
  }

  return (
    <div className="dashboard-view">
      <div className="dv-tower">
        <PanelHeader title="TIMING TOWER" />
        <TimingTower />
      </div>

      <div className="dv-right">
        <div className="dv-telemetry">
          <PanelHeader title="TELEMETRY ANALYSIS" />
          <Suspense fallback={<Skeleton rows={10} />}>
            <TelemetryMiniGrid />
          </Suspense>
        </div>

        <div className="dv-bottom">
          <div className="dv-laps">
            <PanelHeader title="LAP-BY-LAP DATA" />
            <LapTable />
          </div>
          <div className="dv-track">
            <PanelHeader title="TRACK POSITIONS" />
            <Suspense fallback={<Skeleton rows={8} />}>
              <TrackMap />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
