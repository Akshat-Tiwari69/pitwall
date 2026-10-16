export interface Season {
  year: number;
  events: Event[];
}

export interface Event {
  round: number;
  name: string;
  country: string;
  location: string;
  date: string;
  sessions: SessionInfo[];
}

export interface SessionInfo {
  type: 'FP1' | 'FP2' | 'FP3' | 'Q' | 'S' | 'SQ' | 'R' | string;
  date: string;
  name: string;
}

export interface Driver {
  abbreviation: string;
  number: string;
  fullName: string;
  team: string;
  teamColor: string;
  headshotUrl?: string;
}

export interface LapData {
  lapNumber: number;
  driver: string;
  lapTime: number | null;
  sector1Time: number | null;
  sector2Time: number | null;
  sector3Time: number | null;
  compound: string;
  tyreLife: number;
  position: number;
  isPersonalBest: boolean;
  isAccurate: boolean;
  stint: number;
  speedTrap: number | null;
  pitOutTime?: number | null;
  pitInTime?: number | null;
}

export interface TelemetryPoint {
  distance: number;
  time: number;
  speed: number;
  throttle: number;
  brake: boolean;
  gear: number;
  rpm: number;
  drs: number;
  x: number;
  y: number;
}

export interface TelemetryDataset {
  distance: number[];
  time: number[];
  speed: number[];
  throttle: number[];
  brake: number[];
  gear: number[];
  rpm: number[];
  drs: number[];
  x: number[];
  y: number[];
}

export interface MultiDriverTelemetry {
  drivers: Record<string, TelemetryDataset>;
}

export interface WeatherData {
  time: number;
  airTemp: number;
  trackTemp: number;
  humidity: number;
  pressure: number;
  rainfall: boolean;
  windSpeed: number;
  windDirection: number;
}

export interface RaceControlMessage {
  time: number;
  lap?: number;
  category: string;
  message: string;
  flag?: string;
  scope?: string;
  sector?: number;
  driverNumber?: string;
}

export interface Corner {
  number: number;
  x: number;
  y: number;
  angle: number;
  letter?: string;
}

export interface CircuitInfo {
  corners: Corner[];
  rotation: number;
}

export interface TrackPoint {
  x: number;
  y: number;
}

export interface SessionResults {
  drivers: DriverResult[];
}

export interface DriverResult {
  position: number | null;
  gridPosition: number | null;
  driver: Driver;
  status: string;
  points: number;
  q1?: number;
  q2?: number;
  q3?: number;
  gap?: string;
}
