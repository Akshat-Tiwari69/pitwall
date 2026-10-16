import { TimingTower } from './TimingTower';
import { LapTable } from './LapTable';
import { TelemetryMiniGrid } from '../telemetry/TelemetryMiniGrid';
import { TrackMap } from '../telemetry/TrackMap';
import { TeamDashboard } from '../team-dashboard/TeamDashboard';
import { useSessionStore } from '../../stores/sessionStore';
import './DashboardView.css';

function PanelHeader({ title }: { title: string }) {
  return <div className="panel-header"><span>{title}</span></div>;
}

export function DashboardView() {
  const focusedDriver = useSessionStore((s) => s.focusedDriver);

  if (focusedDriver) {
    return <TeamDashboard />;
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
          <TelemetryMiniGrid />
        </div>

        <div className="dv-bottom">
          <div className="dv-laps">
            <PanelHeader title="LAP-BY-LAP DATA" />
            <LapTable />
          </div>
          <div className="dv-track">
            <PanelHeader title="TRACK POSITIONS" />
            <TrackMap />
          </div>
        </div>
      </div>
    </div>
  );
}
