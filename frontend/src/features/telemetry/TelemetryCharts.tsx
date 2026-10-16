import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { f1Service } from '../../services/api';
import { useSessionStore } from '../../stores/sessionStore';
import './TelemetryCharts.css';

const DRIVER_COLORS = ['#e10600', '#00e676', '#a855f7'];

export function TelemetryCharts() {
  const {
    selectedYear,
    selectedEvent,
    selectedSessionType,
    selectedDrivers,
    selectedLap,
    setSelectedLap,
    toggleDriver,
  } = useSessionStore();

  const sessionReady = !!selectedEvent && !!selectedSessionType && selectedDrivers.length > 0;

  const { data: results } = useQuery({
    queryKey: ['results', selectedYear, selectedEvent, selectedSessionType],
    queryFn: () => f1Service.getResults(selectedYear, selectedEvent!, selectedSessionType!),
    enabled: !!selectedEvent && !!selectedSessionType,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['telemetry-compare', selectedYear, selectedEvent, selectedSessionType, selectedDrivers, selectedLap],
    queryFn: () => f1Service.getCompareTelemetry(
      selectedYear, selectedEvent!, selectedSessionType!, selectedDrivers, selectedLap
    ),
    enabled: sessionReady,
  });

  const chartOptions = useMemo(() => {
    if (!data || Object.keys(data.drivers).length === 0) return null;

    const drivers = Object.keys(data.drivers);

    // One ECharts dataset per driver (column-oriented source)
    const datasets = drivers.map((drv) => ({
      id: drv,
      source: data.drivers[drv],
    }));

    const colors = DRIVER_COLORS;

    const speedSeries = drivers.map((drv, i) => ({
      name: `${drv} Speed`,
      type: 'line',
      datasetId: drv,
      xAxisIndex: 0,
      yAxisIndex: 0,
      encode: { x: 'distance', y: 'speed' },
      showSymbol: false,
      itemStyle: { color: colors[i % colors.length] },
      lineStyle: { width: 1.5 },
    }));

    const throttleSeries = drivers.map((drv, i) => ({
      name: `${drv} Throttle`,
      type: 'line',
      datasetId: drv,
      xAxisIndex: 1,
      yAxisIndex: 1,
      encode: { x: 'distance', y: 'throttle' },
      showSymbol: false,
      itemStyle: { color: colors[i % colors.length] },
      lineStyle: { width: 1.5 },
      areaStyle: { color: colors[i % colors.length], opacity: 0.12 },
    }));

    const brakeSeries = drivers.map((drv) => ({
      name: `${drv} Brake`,
      type: 'line',
      datasetId: drv,
      xAxisIndex: 2,
      yAxisIndex: 2,
      encode: { x: 'distance', y: 'brake' },
      showSymbol: false,
      itemStyle: { color: '#ff1744' },
      step: 'end',
      lineStyle: { width: 1.5 },
      areaStyle: { color: '#ff1744', opacity: 0.3 },
    }));

    const gearSeries = drivers.map((drv, i) => ({
      name: `${drv} Gear`,
      type: 'line',
      datasetId: drv,
      xAxisIndex: 3,
      yAxisIndex: 3,
      encode: { x: 'distance', y: 'gear' },
      showSymbol: false,
      itemStyle: { color: colors[i % colors.length] },
      step: 'end',
      lineStyle: { width: 1.5 },
    }));

    return {
      dataset: datasets,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: '#1c1c2e',
        borderColor: '#3a3a55',
        textStyle: { color: '#eaeaf0' },
      },
      grid: [
        { top: '4%',  height: '30%', left: '6%', right: '2%' },
        { top: '40%', height: '16%', left: '6%', right: '2%' },
        { top: '62%', height: '12%', left: '6%', right: '2%' },
        { top: '80%', height: '14%', left: '6%', right: '2%' },
      ],
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      xAxis: [
        { type: 'value', gridIndex: 0, show: false },
        { type: 'value', gridIndex: 1, show: false },
        { type: 'value', gridIndex: 2, show: false },
        {
          type: 'value', gridIndex: 3,
          name: 'Distance (m)',
          nameTextStyle: { color: '#606078' },
          axisLabel: { color: '#606078' },
        },
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, name: 'Speed',     min: 0, max: 360, nameTextStyle: { color: '#9090a8' }, axisLabel: { color: '#9090a8' }, splitLine: { lineStyle: { color: '#1e1e30' } } },
        { type: 'value', gridIndex: 1, name: 'Throttle %', min: 0, max: 100, nameTextStyle: { color: '#9090a8' }, axisLabel: { color: '#9090a8' }, splitLine: { lineStyle: { color: '#1e1e30' } } },
        { type: 'value', gridIndex: 2, name: 'Brake %',   min: 0, max: 100, nameTextStyle: { color: '#9090a8' }, axisLabel: { color: '#9090a8', show: false }, splitLine: { lineStyle: { color: '#1e1e30' } } },
        { type: 'value', gridIndex: 3, name: 'Gear',      min: 0, max: 9, splitNumber: 8, nameTextStyle: { color: '#9090a8' }, axisLabel: { color: '#9090a8' }, splitLine: { lineStyle: { color: '#1e1e30' } } },
      ],
      series: [...speedSeries, ...throttleSeries, ...brakeSeries, ...gearSeries],
    };
  }, [data]);

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

      {selectedDrivers.length > 0 && isLoading && (
        <div className="telemetry-loading">Loading telemetry data...</div>
      )}

      {selectedDrivers.length > 0 && !isLoading && chartOptions && (
        <div className="telemetry-container">
          <ReactECharts
            key={selectedDrivers.join(',')}
            option={chartOptions}
            notMerge
            style={{ height: '100%', width: '100%' }}
            theme="dark"
            opts={{ renderer: 'canvas' }}
          />
        </div>
      )}
    </div>
  );
}
