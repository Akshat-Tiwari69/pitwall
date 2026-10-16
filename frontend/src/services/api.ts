import axios from 'axios';
import type { Season, SessionResults, LapData, TelemetryDataset, MultiDriverTelemetry, WeatherData, RaceControlMessage, CircuitInfo, TrackPoint } from '../types/f1';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
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

api.interceptors.response.use((response) => {
  response.data = convertKeysToCamelCase(response.data);
  return response;
});

export const f1Service = {
  getSeasons: async (year: number = 2024): Promise<Season[]> => {
    const response = await api.get('/seasons', { params: { year } });
    return response.data;
  },

  getResults: async (year: number, event: string, sessionType: string): Promise<SessionResults> => {
    const response = await api.get(`/sessions/${year}/${event}/${sessionType}/results`);
    return response.data;
  },

  getLaps: async (year: number, event: string, sessionType: string): Promise<LapData[]> => {
    const response = await api.get(`/sessions/${year}/${event}/${sessionType}/laps`);
    return response.data;
  },

  // Pass lapNumber=0 to get the driver's fastest lap
  getTelemetry: async (year: number, event: string, sessionType: string, driver: string, lapNumber: number): Promise<TelemetryDataset> => {
    const response = await api.get(`/sessions/${year}/${event}/${sessionType}/telemetry/${driver}/${lapNumber}`);
    return response.data;
  },

  // Multi-driver compare — single backend request. lap=0 means each driver's fastest.
  getCompareTelemetry: async (year: number, event: string, sessionType: string, drivers: string[], lap: number): Promise<MultiDriverTelemetry> => {
    const response = await api.get(`/sessions/${year}/${event}/${sessionType}/telemetry/compare`, {
      params: { drivers: drivers.join(','), lap },
    });
    return response.data;
  },

  getWeather: async (year: number, event: string, sessionType: string): Promise<WeatherData[]> => {
    const response = await api.get(`/sessions/${year}/${event}/${sessionType}/weather`);
    return response.data;
  },

  getRaceControl: async (year: number, event: string, sessionType: string): Promise<RaceControlMessage[]> => {
    const response = await api.get(`/sessions/${year}/${event}/${sessionType}/race-control`);
    return response.data;
  },

  getCircuit: async (year: number, event: string, sessionType: string): Promise<CircuitInfo> => {
    const response = await api.get(`/sessions/${year}/${event}/${sessionType}/circuit`);
    return response.data;
  },

  getTrackOutline: async (year: number, event: string, sessionType: string): Promise<TrackPoint[]> => {
    const response = await api.get(`/sessions/${year}/${event}/${sessionType}/track-outline`);
    return response.data;
  },
};
