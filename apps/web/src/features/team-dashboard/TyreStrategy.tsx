import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { f1Service } from '../../services/api';
import { useSessionStore } from '../../stores/sessionStore';
import { ErrorState, Skeleton } from '../../components/PanelState';
import type { LapData } from '../../types/f1';

const COMPOUND_COLORS: Record<string, string> = {
  soft: '#e8002d',
  medium: '#ffd600',
  hard: '#e8e8e8',
  intermediate: '#39b54a',
  wet: '#0067ff',
};

export function TyreStrategy({ driver, color }: { driver: string; color: string }) {
  const { selectedYear, selectedEvent, selectedSessionType } = useSessionStore();

  const { data: laps, isLoading, error } = useQuery({
    queryKey: ['laps', selectedYear, selectedEvent, selectedSessionType],
    queryFn: () => f1Service.getLaps(selectedYear, selectedEvent!, selectedSessionType!),
    enabled: !!selectedEvent && !!selectedSessionType,
  });

  const option = useMemo(() => {
    if (!laps) return null;
    const driverLaps = laps
      .filter((l: LapData) => l.driver === driver && l.lapTime != null)
      .sort((a, b) => a.lapNumber - b.lapNumber);
    if (driverLaps.length === 0) return null;

    const points = driverLaps.map((l) => ({
      value: [l.lapNumber, l.lapTime],
      itemStyle: { color: COMPOUND_COLORS[(l.compound || '').toLowerCase()] ?? '#888' },
    }));

    return {
      grid: { top: 10, bottom: 22, left: 44, right: 8 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#14141f',
        borderColor: '#2a2a40',
        borderWidth: 1,
        textStyle: { color: '#eaeaf0', fontSize: 10 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const lap = p.value[0];
          const t = p.value[1] as number;
          const lapInfo = driverLaps.find((l) => l.lapNumber === lap);
          const mm = Math.floor(t / 60);
          const ss = (t % 60).toFixed(3).padStart(6, '0');
          return `Lap ${lap} · <b>${mm}:${ss}</b><br/><span style="color:#9090a8">${lapInfo?.compound ?? ''} · ${Math.round(lapInfo?.tyreLife ?? 0)} laps</span>`;
        },
      },
      xAxis: {
        type: 'value',
        name: 'LAP',
        nameTextStyle: { color: '#50506a', fontSize: 9 },
        axisLabel: { color: '#606078', fontSize: 9 },
        axisLine: { lineStyle: { color: '#2a2a40' } },
        splitLine: { show: false },
        min: 1,
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: {
          color: '#606078',
          fontSize: 9,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: (v: any) => {
            const mm = Math.floor(v / 60);
            const ss = Math.round(v % 60).toString().padStart(2, '0');
            return `${mm}:${ss}`;
          },
        },
        splitLine: { lineStyle: { color: '#1a1a2e' } },
      },
      series: [
        {
          type: 'line',
          data: points,
          showSymbol: true,
          symbolSize: 5,
          lineStyle: { width: 1.5, color },
        },
      ],
      animation: false,
    };
  }, [laps, driver, color]);

  if (isLoading) return <Skeleton rows={4} />;
  if (error) return <ErrorState error={error} />;
  if (!option) return <div className="td-panel-empty">No lap data for {driver}</div>;

  return (
    <ReactECharts
      key={driver}
      option={option}
      notMerge
      style={{ height: '100%', width: '100%' }}
      theme="dark"
      opts={{ renderer: 'canvas' }}
    />
  );
}
