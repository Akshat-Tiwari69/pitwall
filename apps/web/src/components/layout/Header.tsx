import { SessionSelector } from './SessionSelector';
import { IS_DEMO } from '../../services/api';
import logo from '../../assets/icons/logo-pitwall.svg';
import './Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <img src={logo} alt="" className="logo-mark" />
        <div className="logo-text">Pitwall</div>
        {IS_DEMO && (
          <span className="demo-chip" title="Static snapshot of a few cached races; fastest laps only">
            Online demo
          </span>
        )}
      </div>
      <div className="header-center">
        <SessionSelector />
      </div>
    </header>
  );
}
