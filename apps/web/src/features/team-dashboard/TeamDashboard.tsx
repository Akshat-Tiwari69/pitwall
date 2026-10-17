import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Flag, Activity } from 'lucide-react';
import { f1Service } from '../../services/api';
import { useSessionStore } from '../../stores/sessionStore';
import { deriveTeamTheme, teamThemeVars } from '../../theme/teamTheme';
import type { DriverResult, LapData } from '../../types/f1';
import { TimingTower } from '../dashboard/TimingTower';
import { TrackMap } from '../telemetry/TrackMap';
import { SECTOR_COLORS } from '../telemetry/trackConstants';
import { TelemetryMiniGrid } from '../telemetry/TelemetryMiniGrid';
import { LapTable } from '../dashboard/LapTable';
import { TyreStrategy } from './TyreStrategy';
import { ErrorState, Skeleton } from '../../components/PanelState';
import './TeamDashboard.css';

function Panel({
  title, icon, className, children,
}: {
  title: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`td-panel ${className ?? ''}`}>
      <header className="td-panel-head">
        <span className="td-panel-title">{icon}{title}</span>
      </header>
      <div className="td-panel-body">{children}</div>
    </section>
  );
}

function fmtLap(secs: number | null | undefined): string {
  if (secs == null) return '—';
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(3).padStart(6, '0');
  return `${m}:${s}`;
}

function DriverHero({ result, laps }: { result: DriverResult; laps: LapData[] | undefined }) {
  const stats = useMemo(() => {
    const dl = (laps ?? []).filter((l) => l.driver === result.driver.abbreviation);
    const best = dl.reduce<number | null>((acc, l) => {
      if (l.lapTime == null) return acc;
      return acc == null || l.lapTime < acc ? l.lapTime : acc;
    }, null);
    const topSpeed = dl.reduce<number | null>((acc, l) => {
      if (l.speedTrap == null) return acc;
      return acc == null || l.speedTrap > acc ? l.speedTrap : acc;
    }, null);
    const lastLap = dl.length ? dl[dl.length - 1] : undefined;
    return { best, topSpeed, lastCompound: lastLap?.compound, laps: dl.length };
  }, [laps, result]);

  return (
    <div className="td-hero">
      <div className="td-hero-id">
        <span className="td-hero-num">{result.driver.number}</span>
        <div className="td-hero-name-block">
          <span className="td-hero-name">{result.driver.fullName || result.driver.abbreviation}</span>
          <span className="td-hero-team">{result.driver.team}</span>
        </div>
      </div>
      <div className="td-hero-stats">
        <div className="td-stat">
          <span className="td-stat-val">P{result.position ?? '—'}</span>
          <span className="td-stat-label">POSITION</span>
        </div>
        <div className="td-stat">
          <span className="td-stat-val">{result.points ?? 0}</span>
          <span className="td-stat-label">POINTS</span>
        </div>
        <div className="td-stat">
          <span className="td-stat-val">{fmtLap(stats.best)}</span>
          <span className="td-stat-label">BEST LAP</span>
        </div>
        <div className="td-stat">
          <span className="td-stat-val">{stats.topSpeed != null ? `${Math.round(stats.topSpeed)}` : '—'}</span>
          <span className="td-stat-label">TOP SPEED KPH</span>
        </div>
      </div>
    </div>
  );
}

function SectorTimes({ result, laps }: { result: DriverResult; laps: LapData[] | undefined }) {
  const sectors = useMemo(() => {
    const dl = (laps ?? []).filter((l) => l.driver === result.driver.abbreviation && l.lapTime != null);
    if (!dl.length) return null;
    const fastest = dl.reduce((a, b) => ((b.lapTime ?? Infinity) < (a.lapTime ?? Infinity) ? b : a));
    return [fastest.sector1Time, fastest.sector2Time, fastest.sector3Time];
  }, [laps, result]);

  return (
    <div className="td-sectors">
      {[1, 2, 3].map((n, i) => (
        <div className="td-sector" key={n}>
          <span className="td-sector-label" style={{ color: SECTOR_COLORS[i] }}>SECTOR {n}</span>
          <span className="td-sector-time">
            {sectors && sectors[i] != null ? sectors[i]!.toFixed(3) : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

const RC_FLAG_COLORS: Record<string, string> = {
  GREEN: '#00e676',
  CLEAR: '#00e676',
  YELLOW: '#ffd600',
  'DOUBLE YELLOW': '#ffd600',
  RED: '#ff1744',
  BLUE: '#0067ff',
  CHEQUERED: '#ffffff',
  'BLACK AND WHITE': '#bbbbbb',
};

function RaceControl() {
  const { selectedYear, selectedEvent, selectedSessionType } = useSessionStore();
  const { data } = useQuery({
    queryKey: ['race-control', selectedYear, selectedEvent, selectedSessionType],
    queryFn: () => f1Service.getRaceControl(selectedYear, selectedEvent!, selectedSessionType!),
    enabled: !!selectedEvent && !!selectedSessionType,
  });
  // Newest first, like a live race-control feed.
  const msgs = useMemo(() => (data ?? []).slice().reverse(), [data]);

  if (!msgs.length) return <div className="td-rc"><span className="td-rc-msg">No messages</span></div>;

  return (
    <div className="td-rc">
      {msgs.map((x, i) => {
        const label = x.flag ?? (x.category === 'Other' ? 'INFO' : x.category.toUpperCase());
        return (
          <div className="td-rc-row" key={i}>
            <span className="td-rc-flag" style={{ backgroundColor: RC_FLAG_COLORS[label] ?? '#5555aa' }}>
              {x.lap != null ? `L${x.lap} ` : ''}{label}
            </span>
            <span className="td-rc-msg">{x.message}</span>
          </div>
        );
      })}
    </div>
  );
}

function WeatherStrip() {
  const { selectedYear, selectedEvent, selectedSessionType } = useSessionStore();
  const { data } = useQuery({
    queryKey: ['weather', selectedYear, selectedEvent, selectedSessionType],
    queryFn: () => f1Service.getWeather(selectedYear, selectedEvent!, selectedSessionType!),
    enabled: !!selectedEvent && !!selectedSessionType,
  });
  const latest = data && data.length ? data[data.length - 1] : null;
  const items = [
    { label: 'AIR', value: latest ? `${latest.airTemp.toFixed(0)}°C` : '—' },
    { label: 'TRACK', value: latest ? `${latest.trackTemp.toFixed(0)}°C` : '—' },
    { label: 'HUMIDITY', value: latest ? `${latest.humidity.toFixed(0)}%` : '—' },
    { label: 'WIND', value: latest ? `${latest.windSpeed.toFixed(1)} m/s` : '—' },
    { label: 'RAIN', value: latest ? (latest.rainfall ? 'YES' : 'NO') : '—' },
  ];
  return (
    <div className="td-weather">
      {items.map((it) => (
        <div className="td-weather-item" key={it.label}>
          <span className="td-weather-label">{it.label}</span>
          <span className="td-weather-val">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TeamDashboard() {
  const { selectedYear, selectedEvent, selectedSessionType, focusedDriver, clearFocus } = useSessionStore();

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['results', selectedYear, selectedEvent, selectedSessionType],
    queryFn: () => f1Service.getResults(selectedYear, selectedEvent!, selectedSessionType!),
    enabled: !!selectedEvent && !!selectedSessionType,
  });

  const { data: laps } = useQuery({
    queryKey: ['laps', selectedYear, selectedEvent, selectedSessionType],
    queryFn: () => f1Service.getLaps(selectedYear, selectedEvent!, selectedSessionType!),
    enabled: !!selectedEvent && !!selectedSessionType,
  });

  const focusedResult = results?.drivers.find((d) => d.driver.abbreviation === focusedDriver);
  const theme = useMemo(
    () => deriveTeamTheme(focusedResult?.driver.teamColor),
    [focusedResult]
  );

  if (isLoading) return <Skeleton rows={14} />;
  if (error) return <ErrorState error={error} />;
  if (!focusedResult) {
    return <div className="td-loading">{focusedDriver} isn't in this session's results.</div>;
  }

  return (
    <div className="team-dashboard" style={teamThemeVars(theme)}>
      <div className="td-topbar">
        <button className="td-back" onClick={clearFocus}>
          <ArrowLeft size={14} /> All drivers
        </button>
        <span className="td-topbar-team">{focusedResult.driver.team}</span>
      </div>

      <div className="td-grid">
        {/* Row 1 */}
        <Panel title="TIMING TOWER" className="td-area-timing">
          <TimingTower />
        </Panel>

        <Panel title="TRACK MAP" className="td-area-track">
          <div className="td-track-wrap">
            <SectorTimes result={focusedResult} laps={laps} />
            <div className="td-track-canvas"><TrackMap /></div>
          </div>
        </Panel>

        <Panel title="TYRE STRATEGY" className="td-area-tyre">
          <TyreStrategy driver={focusedResult.driver.abbreviation} color={theme.primary} />
        </Panel>

        {/* Row 2 */}
        <Panel title="DRIVER" className="td-area-hero">
          <DriverHero result={focusedResult} laps={laps} />
        </Panel>

        <Panel title="CONDITIONS" className="td-area-weather">
          <WeatherStrip />
        </Panel>

        {/* Rows 3–4 */}
        <Panel title="TELEMETRY OVERLAY" icon={<Activity size={11} />} className="td-area-telemetry">
          <TelemetryMiniGrid />
        </Panel>

        <Panel title="LAP TIMES" className="td-area-laps">
          <LapTable />
        </Panel>

        <Panel title="RACE CONTROL" icon={<Flag size={11} />} className="td-area-rc">
          <RaceControl />
        </Panel>
      </div>
    </div>
  );
}
