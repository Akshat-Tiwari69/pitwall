import { useQuery } from '@tanstack/react-query';
import { f1Service } from '../../services/api';
import { useSessionStore } from '../../stores/sessionStore';
import { ErrorState, Skeleton } from '../../components/PanelState';
import { Track3D } from './Track3D';
import './TrackMap.css';

export function TrackMap() {
  const { selectedYear, selectedEvent, selectedSessionType } = useSessionStore();

  const { data: trackPoints, isLoading, error } = useQuery({
    queryKey: ['track-outline', selectedYear, selectedEvent, selectedSessionType],
    queryFn: () => f1Service.getTrackOutline(selectedYear, selectedEvent!, selectedSessionType!),
    enabled: !!selectedEvent && !!selectedSessionType,
  });

  if (!selectedEvent || !selectedSessionType) {
    return <div className="track-map-placeholder">Select a session to view the track map.</div>;
  }
  if (isLoading) return <Skeleton rows={8} />;
  if (error) return <ErrorState error={error} />;
  if (!trackPoints || trackPoints.length === 0) {
    return <div className="track-map-placeholder">Track data unavailable.</div>;
  }

  return (
    <div className="track-map-container">
      <Track3D points={trackPoints} />
    </div>
  );
}
