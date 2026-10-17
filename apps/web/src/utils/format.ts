/** Lap/sector time in seconds → "1:31.773" (or "33.781" under a minute); "—" when missing. */
export function formatTime(secs: number | null | undefined): string {
  if (secs == null) return '—';
  if (secs < 60) return secs.toFixed(3);
  const m = Math.floor(secs / 60);
  return `${m}:${(secs % 60).toFixed(3).padStart(6, '0')}`;
}
