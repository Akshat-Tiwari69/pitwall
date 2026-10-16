import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { f1Service } from '../../services/api';
import { useSessionStore } from '../../stores/sessionStore';
import { ErrorState, Skeleton } from '../../components/PanelState';
import type { TelemetryDataset } from '../../types/f1';
import './TelemetryMiniGrid.css';

const DRIVER_COLORS = ['#e10600', '#00e676', '#a855f7'];

type Channel = 'speed' | 'throttle' | 'brake' | 'gear' | 'rpm' | 'drs';

const CHANNELS: { key: Channel; label: string; yMax: number; step?: boolean }[] = [
  { key: 'speed',    label: 'SPEED (KPH)',   yMax: 380   },
  { key: 'throttle', label: 'THROTTLE (%)',  yMax: 100   },
  { key: 'brake',    label: 'BRAKE (%)',     yMax: 1,    step: true },
  { key: 'gear',     label: 'GEAR',          yMax: 9,    step: true },
  { key: 'rpm',      label: 'RPM',           yMax: 14000 },
  { key: 'drs',      label: 'DRS',           yMax: 14,   step: true },
];

function MiniChart({
  label, channel, yMax, step = false, drivers, driverData,
}: {
  label: string;
  channel: Channel;
  yMax: number;
  step?: boolean;
  drivers: string[];
  driverData: Record<string, TelemetryDataset>;
}) {
  const option = useMemo(() => ({
    dataset: drivers.map(drv => ({ id: drv, source: driverData[drv] })),
    grid: { top: 4, bottom: 18, left: 30, right: 4 },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'value',
      min: 0,
      max: yMax,
      splitLine: { lineStyle: { color: '#1e1e30' } },
      axisLabel: { color: '#50506a', fontSize: 8 },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#14141f',
      borderColor: '#2a2a40',
      borderWidth: 1,
      padding: [4, 8],
      textStyle: { color: '#eaeaf0', fontSize: 10 },
      axisPointer: {
        type: 'line',
        lineStyle: { color: '#3a3a55', type: 'dashed' as const, width: 1 },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const ps: unknown[] = Array.isArray(params) ? params : [params];
        return ps.map((p: unknown) => {
          const param = p as { color: string; seriesName: string; value: unknown };
          const v = param.value;
          let num: number | undefined;
          if (typeof v === 'number') num = v;
          else if (v && typeof v === 'object' && !Array.isArray(v)) num = (v as Record<string, number>)[channel];
          else if (Array.isArray(v)) num = Number((v as unknown[])[1]);
          const txt = num != null && !isNaN(num)
            ? (step ? String(Math.round(num)) : num.toFixed(1))
            : '—';
          return `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${param.color};margin-right:4px;vertical-align:middle"></span><span style="color:#9090a8">${param.seriesName}</span> <b>${txt}</b>`;
        }).join('<br/>');
      },
    },
    series: drivers.map((drv, i) => ({
      name: drv,
      type: 'line',
      datasetId: drv,
      encode: { x: 'distance', y: channel },
      showSymbol: false,
      lineStyle: { width: 1.2, color: DRIVER_COLORS[i % DRIVER_COLORS.length] },
      itemStyle: { color: DRIVER_COLORS[i % DRIVER_COLORS.length] },
      ...(step ? { step: 'end' } : {}),
    })),
    animation: false,
  }), [drivers, driverData, channel, yMax, step]);

  return (
    <div className="mini-chart-cell">
      <div className="mini-chart-label">{label}</div>
      <div className="mini-chart-body">
        <ReactECharts
          key={drivers.join(',')}
          option={option}
          notMerge
          style={{ height: '100%', width: '100%' }}
          theme="dark"
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
}

export function TelemetryMiniGrid() {
  const { selectedYear, selectedEvent, selectedSessionType, selectedDrivers, selectedLap } = useSessionStore();

  const sessionReady = !!selectedEvent && !!selectedSessionType && selectedDrivers.length > 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ['telemetry-compare', selectedYear, selectedEvent, selectedSessionType, selectedDrivers, selectedLap],
    queryFn: () => f1Service.getCompareTelemetry(
      selectedYear, selectedEvent!, selectedSessionType!, selectedDrivers, selectedLap
    ),
    enabled: sessionReady,
    staleTime: 5 * 60 * 1000,
  });

  if (selectedDrivers.length === 0) {
    return <div className="tele-mini-empty">Click a driver in the timing tower to view telemetry</div>;
  }
  if (isLoading) return <Skeleton rows={10} />;
  if (error) return <ErrorState error={error} />;
  if (!data || Object.keys(data.drivers).length === 0) {
    return <div className="tele-mini-empty">No telemetry available</div>;
  }

  const drivers = Object.keys(data.drivers);

  return (
    <div className="tele-mini-grid">
      {CHANNELS.map(ch => (
        <MiniChart
          key={ch.key}
          label={ch.label}
          channel={ch.key}
          yMax={ch.yMax}
          step={ch.step}
          drivers={drivers}
          driverData={data.drivers}
        />
      ))}
    </div>
  );
}
