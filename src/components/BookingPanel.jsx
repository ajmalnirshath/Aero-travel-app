import { NavLink } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

export default function BookingPanel({ children }) {
  const { scale, bumpScale, contrast, setContrast } = useApp()
  return (
    <aside className="aero-panel">
      <div className="sheet-handle" aria-hidden="true" />
      <header className="panel-top">
        <span className="wordmark">AERO</span>
        <div className="a11y-controls" role="group" aria-label="Accessibility">
          <button type="button" className="a11y-btn" onClick={() => bumpScale(1)} aria-label="Make text bigger">A+</button>
          <button type="button" className="a11y-btn" onClick={() => bumpScale(-1)} aria-label="Make text smaller" disabled={scale === 'md'}>A−</button>
          <button
            type="button"
            className="a11y-btn"
            aria-pressed={contrast}
            onClick={() => setContrast(!contrast)}
          >High contrast</button>
        </div>
      </header>
      <nav className="panel-tabs" aria-label="Sections">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>Book</NavLink>
        <NavLink to="/trips" className={({ isActive }) => (isActive ? 'active' : '')}>Trips</NavLink>
        <NavLink to="/places" className={({ isActive }) => (isActive ? 'active' : '')}>Places</NavLink>
        <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : '')}>Profile</NavLink>
      </nav>
      {children}
    </aside>
  )
}
