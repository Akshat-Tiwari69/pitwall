// Derives a themeable accent palette from a driver's team color so the team
// dashboard adapts to whichever driver is focused (Mercedes teal, Ferrari red, etc.).

export interface TeamTheme {
  primary: string;       // #RRGGBB
  soft: string;          // low-alpha fill
  glow: string;          // mid-alpha glow / border
  gradient: string;      // header / hero gradient
  rgb: string;           // "r, g, b" for custom alpha usage in CSS
}

function normalizeHex(color: string | undefined | null): string {
  if (!color) return '#8a8a9a';
  const c = color.trim();
  return c.startsWith('#') ? c : `#${c}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [138, 138, 154];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function deriveTeamTheme(teamColor: string | undefined | null): TeamTheme {
  const primary = normalizeHex(teamColor);
  const [r, g, b] = hexToRgb(primary);
  const rgb = `${r}, ${g}, ${b}`;
  return {
    primary,
    rgb,
    soft: `rgba(${rgb}, 0.10)`,
    glow: `rgba(${rgb}, 0.40)`,
    gradient: `linear-gradient(135deg, rgba(${rgb}, 0.22) 0%, rgba(${rgb}, 0.04) 45%, transparent 100%)`,
  };
}

// CSS custom properties consumed by the team dashboard + its panels.
export function teamThemeVars(theme: TeamTheme): React.CSSProperties {
  return {
    '--team-primary': theme.primary,
    '--team-soft': theme.soft,
    '--team-glow': theme.glow,
    '--team-gradient': theme.gradient,
    '--team-rgb': theme.rgb,
  } as React.CSSProperties;
}
