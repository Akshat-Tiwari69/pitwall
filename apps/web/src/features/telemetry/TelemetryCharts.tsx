import { useEffect, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useCursorStore } from '../../stores/cursorStore';
import { nearestIndex, useCircuit, useCompareTelemetry, useResults } from '../../hooks/useSessionQueries';
import { ErrorState, Skeleton } from '../../components/PanelState';
import { AnalysisTrackMap } from './AnalysisTrackMap';
import './TelemetryCharts.css';

const DRIVER_COLORS = ['#e10600', '#00e676', '#a855f7'];
const AXIS = { nameTextStyle: { color: '#9090a8' }, axisLabel: { color: '#9090a8' }, splitLine: { lineStyle: { color: '#1e1e30' } } };

// One row per channel; `top`/`height` are % of the chart. DRS is shown open/closed:
// FastF1 reports 10, 12 or 14 when the flap is open.
const CHANNELS = [
  { key: 'speed', name: 'Speed km/h', top: 3, height: 24, min: 0, max: 360 },
  { key: 'throttle', name: 'Throttle %', top: 31, height: 11, min: 0, max: 100, area: true },
  { key: 'brake', name: 'Brake', top: 46, height: 6, min: 0, max: 1, step: true, area: true },
  { key: 'gear', name: 'Gear', top: 56, height: 9, min: 0, max: 9, step: true },
  { key: 'rpm', name: 'RPM', top: 69, height: 9, min: 0, max: 14000 },
  { key: 'drsOpen', name: 'DRS', top: 82, height: 4, min: 0, max: 1, step: true, area: true },
] as const;

export function TelemetryCharts() {
  const { selectedDrivers, selectedLap, setSelectedLap, toggleDriver } = useSessionStore();
  const setCursor = useCursorStore((s) => s.setCursor);
  const { data: results } = useResults();
  const { data: circuit } = useCircuit();
  const { data, isLoading, error } = useCompareTelemetry();
  const chartRef = useRef<ReactECharts>(null);

  const drivers = useMemo(() => Object.keys(data?.drivers ?? {}), [data]);

  const chartOptions = useMemo(() => {
    if (!data || drivers.length === 0) return null;

    const corners = (circuit?.corners ?? []).filter((c) => c.distance != null);
    const axisIdx = CHANNELS.map((_, i) => i);
    const cornerLines = (withLabels: boolean) => ({
      silent: true,
      symbol: 'none',
      lineStyle: { color: '#3a3a55', type: 'dashed', width: 1 },
      label: withLabels
        ? { show: true, position: 'end', color: '#9090a8', fontSize: 9, formatter: (p: { name: string }) => p.name }
        : { show: false },
      data: corners.map((c) => ({ name: `T${c.number}${c.letter ?? ''}`, xAxis: c.distance })),
    });

    const series = CHANNELS.flatMap((ch, gi) =>
      drivers.map((drv, di) => {
        const color = DRIVER_COLORS[di % DRIVER_COLORS.length];
        return {
          name: `${drv} ${ch.name}`,
          type: 'line',
          datasetId: drv,
          xAxisIndex: gi,
          yAxisIndex: gi,
          encode: { x: 'distance', y: ch.key },
          showSymbol: false,
          step: 'step' in ch ? 'end' : undefined,
          itemStyle: { color },
          lineStyle: { width: 1.5 },
          areaStyle: 'area' in ch ? { color, opacity: 0.12 } : undefined,
          // Corner markers once per row, labelled on the speed row only.
          markLine: di === 0 && corners.length ? cornerLines(gi === 0) : undefined,
        };
      })
    );

    return {
      animation: false,
      dataset: drivers.map((drv) => {
        const t = data.drivers[drv];
        return { id: drv, source: { ...t, drsOpen: t.drs.map((v) => (v >= 10 ? 1 : 0)) } };
      }),
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        // One distance header, then each channel's value (default repeats the header per row).
        formatter: (params: { axisValue: number; marker: string; seriesName: string; value: number[]; encode: { y: number[] } }[]) =>
          `${Math.round(params[0]?.axisValue ?? 0).toLocaleString()} m<br/>` +
          params.map((p) => `${p.marker}${p.seriesName} <b>${Math.round(p.value[p.encode.y[0]]).toLocaleString()}</b>`).join('<br/>'),
        backgroundColor: '#1c1c2e',
        borderColor: '#3a3a55',
        textStyle: { color: '#eaeaf0' },
      },
      legend: { show: false },
      grid: CHANNELS.map((ch) => ({ top: `${ch.top}%`, height: `${ch.height}%`, left: 56, right: 16 })),
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      dataZoom: [
        { type: 'inside', xAxisIndex: axisIdx, filterMode: 'none' },
        { type: 'slider', xAxisIndex: axisIdx, filterMode: 'none', bottom: 4, height: 14, borderColor: '#2a2a3e', textStyle: { color: '#606078' } },
      ],
      xAxis: CHANNELS.map((_, i) => ({
        type: 'value',
        gridIndex: i,
        min: 0,
        max: 'dataMax',
        show: i === CHANNELS.length - 1,
        name: i === CHANNELS.length - 1 ? 'Distance (m)' : undefined,
        nameTextStyle: { color: '#606078' },
        axisLabel: { color: '#606078' },
        splitLine: { show: false },
      })),
      yAxis: CHANNELS.map((ch, i) => ({
        type: 'value',
        gridIndex: i,
        name: ch.name,
        nameGap: 6,
        min: ch.min,
        max: ch.max,
        splitNumber: ch.height < 8 ? 1 : 3,
        ...AXIS,
        axisLabel: { ...AXIS.axisLabel, show: ch.height >= 8 },
      })),
      series,
    };
  }, [data, drivers, circuit]);

  // Map hover → move the chart crosshair. Subscribing (not selecting) avoids re-rendering
  // the chart on every mouse move.
  useEffect(() => {
    const first = drivers[0] ? data?.drivers[drivers[0]] : undefined;
    return useCursorStore.subscribe(({ cursor }, prev) => {
      const chart = chartRef.current?.getEchartsInstance();
      if (!chart || !first || cursor === prev.cursor) return;
      if (!cursor) chart.dispatchAction({ type: 'hideTip' });
      else if (cursor.source === 'map') {
        chart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: nearestIndex(first.distance, cursor.distance) });
      }
    });
  }, [data, drivers]);

  const lapLabel = selectedLap === 0 ? '' : String(selectedLap);

  return (
    <div className="telemetry-wrapper">
      <div className="telemetry-header">
        <span className="telemetry-title">Telemetry</span>
        <div className="telemetry-lap-selector">
          <span>Lap:</span>
          <input
            type="number"
            min={1}
            className="lap-input"
            placeholder="Best"
            value={lapLabel}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setSelectedLap(isNaN(val) || val < 1 ? 0 : val);
            }}
          />
          <button
            className={`lap-best-btn ${selectedLap === 0 ? 'active' : ''}`}
            onClick={() => setSelectedLap(0)}
          >
            Best
          </button>
        </div>
      </div>

      {results && results.drivers.length > 0 && (
        <div className="telemetry-driver-picker">
          {results.drivers.map((d) => {
            const isActive = selectedDrivers.includes(d.driver.abbreviation);
            const color = isActive
              ? DRIVER_COLORS[selectedDrivers.indexOf(d.driver.abbreviation)]
              : undefined;
            return (
              <button
                key={d.driver.abbreviation}
                className={`driver-chip${isActive ? ' active' : ''}`}
                style={isActive ? { borderColor: color, color } : {}}
                onClick={() => toggleDriver(d.driver.abbreviation)}
                title={d.driver.fullName}
              >
                <span
                  className="chip-dot"
                  style={{ backgroundColor: d.driver.teamColor
                    ? `#${d.driver.teamColor.replace('#', '')}`
                    : '#444' }}
                />
                {d.driver.abbreviation}
              </button>
            );
          })}
        </div>
      )}

      {selectedDrivers.length === 0 && (
        <div className="telemetry-empty">Select up to 3 drivers above to compare telemetry.</div>
      )}

      {selectedDrivers.length > 0 && isLoading && <Skeleton rows={12} />}
      {selectedDrivers.length > 0 && error && <ErrorState error={error} />}

      {selectedDrivers.length > 0 && !isLoading && chartOptions && (
        <div className="telemetry-container">
          <div className="telemetry-charts">
            <ReactECharts
              ref={chartRef}
              key={selectedDrivers.join(',')}
              option={chartOptions}
              notMerge
              style={{ height: '100%', width: '100%' }}
              theme="dark"
              opts={{ renderer: 'canvas' }}
              onEvents={{
                // Chart hover → shared cursor, so the track map shows where on the lap this is.
                updateAxisPointer: (e: { axesInfo?: { value: number }[] }) => {
                  const value = e.axesInfo?.[0]?.value;
                  if (typeof value === 'number') setCursor({ distance: value, source: 'chart' });
                },
                globalout: () => setCursor(null),
              }}
            />
          </div>
          <AnalysisTrackMap />
        </div>
      )}
    </div>
  );
}
