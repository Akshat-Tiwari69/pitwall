import { useEffect, useState } from 'react';
import './PanelState.css';

const SLOW_MS = 4000;

/** Shimmering placeholder rows shown while a panel's data loads. */
export function Skeleton({ rows = 6 }: { rows?: number }) {
  // A session's first load processes a lot of data; say so rather than look frozen.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="panel-state" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-row" style={{ width: `${92 - (i % 3) * 14}%` }} />
      ))}
      {slow && (
        <p className="panel-state-hint">
          Still loading. The first time a session opens, Pitwall reads and processes all its timing data, which can take a little while.
        </p>
      )}
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
