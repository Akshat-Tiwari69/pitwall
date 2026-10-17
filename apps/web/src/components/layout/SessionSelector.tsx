import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { f1Service } from '../../services/api';
import { useSessionStore } from '../../stores/sessionStore';
import './SessionSelector.css';

// Backend dates look like "2024-03-02 18:00:00+03:00"; the 'T' makes them ISO for every browser.
const isFuture = (date: string | undefined) => !!date && new Date(date.replace(' ', 'T')) > new Date();
const latestPast = <T extends { date: string }>(sessions: T[]) =>
  [...sessions].reverse().find((s) => !isFuture(s.date));

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

  // Newest first: 2018..now locally, or just the exported seasons in the online demo.
  const { data: years = [selectedYear] } = useQuery({ queryKey: ['years'], queryFn: f1Service.getYears });

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

  // Auto-select first event and its latest completed session when season data first loads
  useEffect(() => {
    if (!seasons || seasons.length === 0 || hasAutoSelected.current) return;
    const season = seasons[0];
    if (season.events.length === 0) return;

    hasAutoSelected.current = true;
    if (season.events.some((e) => e.name === selectedEvent)) return; // keep a shared link's event
    const firstEvent = season.events[0];
    setEvent(firstEvent.name);

    const session = latestPast(firstEvent.sessions);
    if (session) setSessionType(session.type);
  }, [seasons, selectedEvent, setEvent, setSessionType]);

  // When event changes and no session is selected, auto-select its latest completed session
  useEffect(() => {
    if (!selectedEvent || selectedSessionType) return;
    const session = latestPast(currentSessions);
    if (session) setSessionType(session.type);
  }, [selectedEvent, selectedSessionType, currentSessions, setSessionType]);

  if (isLoading) return <div className="session-selector-loading">Loading...</div>;
  if (error) return <div className="session-selector-error">{(error as Error).message}</div>;

  return (
    <div className="session-selector">
      <div className="selector-group">
        <select
          value={selectedYear}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="selector-select"
        >
          {years.map(y => (
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
            <option key={e.name} value={e.name} disabled={isFuture(e.sessions[0]?.date)}>
              {e.name} ({e.country})
            </option>
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
            <option key={s.type} value={s.type} disabled={isFuture(s.date)}>{s.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
