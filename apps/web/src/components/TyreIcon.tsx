import tireSoft from '../assets/icons/tire-soft.svg';
import tireMedium from '../assets/icons/tire-medium.svg';
import tireHard from '../assets/icons/tire-hard.svg';
import tireIntermediate from '../assets/icons/tire-intermediate.svg';
import tireWet from '../assets/icons/tire-wet.svg';
import './TyreIcon.css';

const TYRE_ICONS: Record<string, string> = {
  soft: tireSoft,
  medium: tireMedium,
  hard: tireHard,
  intermediate: tireIntermediate,
  wet: tireWet,
};

export function TyreIcon({ compound, size = 20 }: { compound: string; size?: number }) {
  const src = TYRE_ICONS[compound.toLowerCase()];
  if (!src) {
    return (
      <span className="tyre-unknown" style={{ width: size - 2, height: size - 2 }} title={compound || 'Unknown'}>
        {compound.charAt(0).toUpperCase() || '?'}
      </span>
    );
  }
  return <img src={src} alt={compound} title={compound} className="tyre-img" style={{ width: size, height: size }} />;
}
