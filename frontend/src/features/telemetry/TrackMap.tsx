import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { f1Service } from '../../services/api';
import { useSessionStore } from '../../stores/sessionStore';
import { Track3D, type Car3D } from './Track3D';
import './TrackMap.css';

export function TrackMap() {
  const { selectedYear, selectedEvent, selectedSessionType } = useSessionStore();

  const { data: trackPoints, isLoading } = useQuery({
    queryKey: ['track-outline', selectedYear, selectedEvent, selectedSessionType],
    queryFn: () => f1Service.getTrackOutline(selectedYear, selectedEvent!, selectedSessionType!),
    enabled: !!selectedEvent && !!selectedSessionType,
  });

  const { data: results } = useQuery({
    queryKey: ['results', selectedYear, selectedEvent, selectedSessionType],
    queryFn: () => f1Service.getResults(selectedYear, selectedEvent!, selectedSessionType!),
    enabled: !!selectedEvent && !!selectedSessionType,
  });

  const cars = useMemo<Car3D[]>(() => {
    return (results?.drivers ?? [])
      .filter((d) => d.position != null)
      .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
      .map((d) => ({
        abbr: d.driver.abbreviation,
        color: d.driver.teamColor ? `#${d.driver.teamColor.replace('#', '')}` : '#888888',
      }));
  }, [results]);

  if (!selectedEvent || !selectedSessionType) {
    return <div className="track-map-placeholder">Select a session to view the track map.</div>;
  }
  if (isLoading) return <div className="track-map-placeholder">Loading track...</div>;
  if (!trackPoints || trackPoints.length === 0) {
    return <div className="track-map-placeholder">Track data unavailable.</div>;
  }

  return (
    <div className="track-map-container">
      <Track3D points={trackPoints} cars={cars} />
    </div>
  );
}
