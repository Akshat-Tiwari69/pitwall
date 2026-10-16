import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Skeleton } from '../PanelState';
import './DashboardLayout.css';

export function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="dashboard-layout">
      <Header />
      <div className="dashboard-body">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="dashboard-main">
          <Suspense fallback={<Skeleton rows={12} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
