import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardView } from './features/dashboard/DashboardView';
import { TelemetryCharts } from './features/telemetry/TelemetryCharts';
import { TrackMap } from './features/telemetry/TrackMap';
import './styles/globals.css';

function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
      {title} — coming soon
    </div>
  );
}

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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<DashboardView />} />
            <Route path="telemetry" element={<TelemetryCharts />} />
            <Route path="track" element={<TrackMap />} />
            <Route path="strategy" element={<ComingSoon title="Strategy" />} />
            <Route path="engineer" element={<ComingSoon title="AI Engineer" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
