import axios from 'axios';
import type { Season, SessionResults, LapData, TelemetryDataset, MultiDriverTelemetry, WeatherData, RaceControlMessage, CircuitInfo, TrackPoint } from '../types/f1';

// The online demo (GitHub Pages) has no API: it reads static JSON exported from cached
// sessions by apps/api/scripts/export_demo.py. See scripts/publish-demo.sh.
export const IS_DEMO = import.meta.env.VITE_STATIC_DATA === 'true';

const API_ORIGIN = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const FIRST_YEAR = 2018; // FastF1 timing data starts in 2018

export const api = axios.create({
  baseURL: IS_DEMO ? `${import.meta.env.BASE_URL}data` : `${API_ORIGIN}/api/v1`,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Convert snake_case keys to camelCase recursively so backend responses
// map directly to TypeScript interfaces without manual field mapping.
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function convertKeysToCamelCase(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, val]) => [
        toCamelCase(key),
        convertKeysToCamelCase(val),
      ])
    );
  }
  return obj;
}

api.interceptors.response.use(
  (response) => {
    response.data = convertKeysToCamelCase(response.data);
    return response;
  },
  // Surface the API's own message ("No event 'X' in 2024") instead of axios' generic one.
  (error) => {
    const detail = error.response?.data?.detail;
    if (IS_DEMO && error.response?.status === 404) {
      error.message = 'Not included in the online demo. Run Pitwall locally for every session.';
    } else if (typeof detail === 'string') error.message = detail;
    else if (!error.response) error.message = `Can't reach the API at ${API_ORIGIN}. Is it running?`;
    return Promise.reject(error);
  }
);

// Demo files are keyed by an event-name slug; must match slug() in export_demo.py.
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const sessionPath = (year: number, event: string, sessionType: string) =>
  `/sessions/${year}/${IS_DEMO ? slug(event) : event}/${sessionType}`;

async function get<T>(path: string): Promise<T> {
  const response = await api.get(IS_DEMO ? `${path}.json` : path);
  return response.data;
}

export const f1Service = {
  getYears: async (): Promise<number[]> => {
    if (IS_DEMO) return get<number[]>('/years');
    const current = new Date().getFullYear();
    return Array.from({ length: current - FIRST_YEAR + 1 }, (_, i) => current - i);
  },

  getSeasons: async (year: number = 2024): Promise<Season[]> => {
    if (IS_DEMO) return get<Season[]>(`/seasons/${year}`);
    const response = await api.get('/seasons', { params: { year } });
    return response.data;
  },

  getResults: (year: number, event: string, sessionType: string) =>
    get<SessionResults>(`${sessionPath(year, event, sessionType)}/results`),

  getLaps: (year: number, event: string, sessionType: string) =>
    get<LapData[]>(`${sessionPath(year, event, sessionType)}/laps`),

  // Pass lapNumber=0 to get the driver's fastest lap
  getTelemetry: (year: number, event: string, sessionType: string, driver: string, lapNumber: number) =>
    get<TelemetryDataset>(`${sessionPath(year, event, sessionType)}/telemetry/${driver}/${lapNumber}`),

  // Multi-driver compare — single backend request. lap=0 means each driver's fastest.
  getCompareTelemetry: async (year: number, event: string, sessionType: string, drivers: string[], lap: number): Promise<MultiDriverTelemetry> => {
    if (IS_DEMO) {
      // ponytail: demo ships fastest laps only (~80 kB per driver); every lap would be ~60 MB a race.
      if (lap !== 0) throw new Error("The online demo only has each driver's fastest lap. Run Pitwall locally for every lap.");
      const base = sessionPath(year, event, sessionType);
      const found = await Promise.all(
        drivers.map((d) => get<TelemetryDataset>(`${base}/telemetry/${d}`).then((t) => [d, t] as const, () => null))
      );
      return { drivers: Object.fromEntries(found.filter((f) => f !== null)) };
    }
    const response = await api.get(`${sessionPath(year, event, sessionType)}/telemetry/compare`, {
      params: { drivers: drivers.join(','), lap },
    });
    return response.data;
  },

  getWeather: (year: number, event: string, sessionType: string) =>
    get<WeatherData[]>(`${sessionPath(year, event, sessionType)}/weather`),

  getRaceControl: (year: number, event: string, sessionType: string) =>
    get<RaceControlMessage[]>(`${sessionPath(year, event, sessionType)}/race-control`),

  getCircuit: (year: number, event: string, sessionType: string) =>
    get<CircuitInfo>(`${sessionPath(year, event, sessionType)}/circuit`),

  getTrackOutline: (year: number, event: string, sessionType: string) =>
    get<TrackPoint[]>(`${sessionPath(year, event, sessionType)}/track-outline`),
};
