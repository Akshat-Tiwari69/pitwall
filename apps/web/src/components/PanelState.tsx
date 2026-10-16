import './PanelState.css';

/** Shimmering placeholder rows shown while a panel's data loads. */
export function Skeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="panel-state" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-row" style={{ width: `${92 - (i % 3) * 14}%` }} />
      ))}
    </div>
  );
}

/** Shows the API's error message (see the axios interceptor in services/api.ts). */
export function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <div className="panel-state panel-state--error" role="alert">
      {message}
    </div>
  );
}
