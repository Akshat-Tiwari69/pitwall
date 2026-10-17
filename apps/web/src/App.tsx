import { lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardView } from './features/dashboard/DashboardView';

// Heavy routes (ECharts, Three.js) load on demand; DashboardLayout wraps them in Suspense.
const TelemetryCharts = lazy(() =>
  import('./features/telemetry/TelemetryCharts').then((m) => ({ default: m.TelemetryCharts }))
);
const TrackMap = lazy(() =>
  import('./features/telemetry/TrackMap').then((m) => ({ default: m.TrackMap }))
);
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<DashboardView />} />
            <Route path="telemetry" element={<TelemetryCharts />} />
            <Route path="track" element={<TrackMap />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
