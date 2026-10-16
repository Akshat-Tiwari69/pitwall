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

export const useSessionStore = create<SessionState>((set) => ({
  selectedYear: 2024,
  selectedEvent: null,
  selectedSessionType: null,
  selectedDrivers: [],
  selectedLap: 0,
  focusedDriver: null,

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
