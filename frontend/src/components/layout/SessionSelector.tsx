import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { f1Service } from '../../services/api';
import { useSessionStore } from '../../stores/sessionStore';
import './SessionSelector.css';

const AVAILABLE_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

export function SessionSelector() {
  const {
    selectedYear,
    selectedEvent,
    selectedSessionType,
    setYear,
    setEvent,
    setSessionType,
  } = useSessionStore();

  const hasAutoSelected = useRef(false);

  const { data: seasons, isLoading, error } = useQuery({
    queryKey: ['seasons', selectedYear],
    queryFn: () => f1Service.getSeasons(selectedYear),
  });

  const currentSeason = seasons?.[0];
  const currentEvents = currentSeason?.events ?? [];
  const currentEvent = currentEvents.find(e => e.name === selectedEvent);
  const currentSessions = useMemo(
    () => currentEvent?.sessions ?? [],
    [currentEvent]
  );

  // Reset auto-select flag when year changes so new year's events get auto-selected
  useEffect(() => {
    if (!seasons || seasons.length === 0) return;
    hasAutoSelected.current = false;
  }, [selectedYear, seasons]);

  // Auto-select first event and last session when season data first loads
  useEffect(() => {
    if (!seasons || seasons.length === 0 || hasAutoSelected.current) return;
    const season = seasons[0];
    if (season.events.length === 0) return;

    hasAutoSelected.current = true;
    const firstEvent = season.events[0];
    setEvent(firstEvent.name);

    if (firstEvent.sessions.length > 0) {
      setSessionType(firstEvent.sessions[firstEvent.sessions.length - 1].type);
    }
  }, [seasons, setEvent, setSessionType]);

  // When event changes and no session is selected, auto-select last session
  useEffect(() => {
    if (!selectedEvent || selectedSessionType || currentSessions.length === 0) return;
    setSessionType(currentSessions[currentSessions.length - 1].type);
  }, [selectedEvent, selectedSessionType, currentSessions, setSessionType]);

  if (isLoading) return <div className="session-selector-loading">Loading...</div>;
  if (error) return <div className="session-selector-error">Error loading schedule</div>;

  return (
    <div className="session-selector">
      <div className="selector-group">
        <select
          value={selectedYear}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="selector-select"
        >
          {AVAILABLE_YEARS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="selector-divider">/</div>
      <div className="selector-group">
        <select
          value={selectedEvent ?? ''}
          onChange={(e) => setEvent(e.target.value)}
          className="selector-select"
          disabled={currentEvents.length === 0}
        >
          {currentEvents.length === 0 && <option value="">Loading events...</option>}
          {currentEvents.map(e => (
            <option key={e.name} value={e.name}>{e.name} ({e.country})</option>
          ))}
        </select>
      </div>
      <div className="selector-divider">/</div>
      <div className="selector-group">
        <select
          value={selectedSessionType ?? ''}
          onChange={(e) => setSessionType(e.target.value)}
          className="selector-select"
          disabled={!selectedEvent || currentSessions.length === 0}
        >
          {currentSessions.length === 0 && <option value="">—</option>}
          {currentSessions.map(s => (
            <option key={s.type} value={s.type}>{s.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
