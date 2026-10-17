import { create } from 'zustand';

interface SessionState {
  selectedYear: number;
  selectedEvent: string | null;
  selectedSessionType: string | null;
  selectedDrivers: string[];
  selectedLap: number; // 0 = best lap (fastest), >0 = specific lap number
  focusedDriver: string | null; // drives the team-themed dashboard; null = standard view

  setYear: (year: number) => void;
  setEvent: (event: string) => void;
  setSessionType: (type: string) => void;
  setSelectedDrivers: (drivers: string[]) => void;
  toggleDriver: (driver: string) => void;
  setSelectedLap: (lap: number) => void;
  focusDriver: (driver: string) => void;
  clearFocus: () => void;
}

type UrlState = Pick<
  SessionState,
  'selectedYear' | 'selectedEvent' | 'selectedSessionType' | 'selectedDrivers' | 'selectedLap' | 'focusedDriver'
>;

// The URL is the source of truth on load, so any view can be reloaded or shared, e.g.
// /telemetry?year=2024&event=Bahrain+Grand+Prix&session=R&drivers=VER,LEC&lap=12
function readUrl(): UrlState {
  const q = new URLSearchParams(window.location.search);
  const lap = Number(q.get('lap'));
  const focus = q.get('focus');
  const drivers = (q.get('drivers') ?? '').split(',').filter(Boolean).slice(0, 3);
  return {
    selectedYear: Number(q.get('year')) || 2024,
    selectedEvent: q.get('event'),
    selectedSessionType: q.get('session'),
    selectedDrivers: drivers.length || !focus ? drivers : [focus],
    selectedLap: Number.isInteger(lap) && lap > 0 ? lap : 0,
    focusedDriver: focus,
  };
}

/** Query string for the current selection; the sidebar links carry it between pages. */
export function toQuery(s: UrlState): string {
  const q = new URLSearchParams({ year: String(s.selectedYear) });
  if (s.selectedEvent) q.set('event', s.selectedEvent);
  if (s.selectedSessionType) q.set('session', s.selectedSessionType);
  if (s.selectedDrivers.length) q.set('drivers', s.selectedDrivers.join(','));
  if (s.selectedLap) q.set('lap', String(s.selectedLap));
  if (s.focusedDriver) q.set('focus', s.focusedDriver);
  return q.toString().replace(/%2C/g, ','); // readable driver lists
}

export const useSessionStore = create<SessionState>((set) => ({
  ...readUrl(),

  setYear: (year) => set({
    selectedYear: year,
    selectedEvent: null,
    selectedSessionType: null,
    selectedDrivers: [],
    selectedLap: 0,
    focusedDriver: null,
  }),
  setEvent: (event) => set({
    selectedEvent: event,
    selectedSessionType: null,
    selectedDrivers: [],
    selectedLap: 0,
    focusedDriver: null,
  }),
  setSessionType: (type) => set({
    selectedSessionType: type,
    selectedDrivers: [],
    selectedLap: 0,
    focusedDriver: null,
  }),
  setSelectedDrivers: (drivers) => set({ selectedDrivers: drivers }),
  toggleDriver: (driver) => set((state) => {
    if (state.selectedDrivers.includes(driver)) {
      return { selectedDrivers: state.selectedDrivers.filter(d => d !== driver) };
    }
    // Max 3 drivers for comparison
    if (state.selectedDrivers.length >= 3) {
      return { selectedDrivers: [...state.selectedDrivers.slice(1), driver] };
    }
    return { selectedDrivers: [...state.selectedDrivers, driver] };
  }),
  setSelectedLap: (lap) => set({ selectedLap: lap }),
  // Focusing a driver replaces the dashboard with their team-themed view and
  // resets the telemetry comparison to that single driver.
  focusDriver: (driver) => set({ focusedDriver: driver, selectedDrivers: [driver] }),
  clearFocus: () => set({ focusedDriver: null }),
}));

// Mirror the selection into the URL. replaceState (not router navigation) so every click
// doesn't add a history entry; router's own history.state is kept so back/forward still work.
useSessionStore.subscribe((s) => {
  const query = toQuery(s);
  if (query !== window.location.search.slice(1)) {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${query}`);
  }
});
