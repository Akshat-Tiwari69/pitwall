import { SessionSelector } from './SessionSelector';
import logoF1 from '../../assets/icons/logo-f1.svg';
import './Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <img src={logoF1} alt="F1" className="logo-f1-img" />
        <div className="logo-text">Intelligence</div>
      </div>
      <div className="header-center">
        <SessionSelector />
      </div>
      <div className="header-right">
        <div className="header-avatar">A</div>
      </div>
    </header>
  );
}
