import { useQuery } from '@tanstack/react-query';
import { f1Service } from '../services/api';
import { useSessionStore } from '../stores/sessionStore';

// One place for the per-session queries so every panel shares the same cache entries.
function useSessionQuery<T>(name: string, fetch: (year: number, event: string, type: string) => Promise<T>) {
  const { selectedYear, selectedEvent, selectedSessionType } = useSessionStore();
  return useQuery({
    queryKey: [name, selectedYear, selectedEvent, selectedSessionType],
    queryFn: () => fetch(selectedYear, selectedEvent!, selectedSessionType!),
    enabled: !!selectedEvent && !!selectedSessionType,
  });
}

export const useResults = () => useSessionQuery('results', f1Service.getResults);
export const useLaps = () => useSessionQuery('laps', f1Service.getLaps);
export const useWeather = () => useSessionQuery('weather', f1Service.getWeather);
export const useRaceControl = () => useSessionQuery('race-control', f1Service.getRaceControl);
export const useCircuit = () => useSessionQuery('circuit', f1Service.getCircuit);

/** Selected drivers' telemetry for the selected lap (0 = each driver's fastest). */
export function useCompareTelemetry() {
  const { selectedYear, selectedEvent, selectedSessionType, selectedDrivers, selectedLap } = useSessionStore();
  return useQuery({
    queryKey: ['telemetry-compare', selectedYear, selectedEvent, selectedSessionType, selectedDrivers, selectedLap],
    queryFn: () => f1Service.getCompareTelemetry(
      selectedYear, selectedEvent!, selectedSessionType!, selectedDrivers, selectedLap
    ),
    enabled: !!selectedEvent && !!selectedSessionType && selectedDrivers.length > 0,
  });
}

/** Index of the sample nearest `value` in an ascending array (telemetry distance). */
export function nearestIndex(sorted: number[], value: number): number {
  let lo = 0, hi = sorted.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1; else hi = mid;
  }
  return lo > 0 && value - sorted[lo - 1] < sorted[lo] - value ? lo - 1 : lo;
}
