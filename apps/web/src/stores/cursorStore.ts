import { create } from 'zustand';

/** Hover position shared by the telemetry charts and the analysis track map. */
export interface Cursor {
  distance: number; // metres into the lap
  source: 'map' | 'chart';
}

// Separate from the session store: it changes on every mouse move, and only the chart
// and the map care. Keeping it here stops every other panel re-rendering while hovering.
export const useCursorStore = create<{ cursor: Cursor | null; setCursor: (c: Cursor | null) => void }>((set) => ({
  cursor: null,
  setCursor: (cursor) => set({ cursor }),
}));
