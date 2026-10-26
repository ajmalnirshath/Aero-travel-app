import { VEHICLES, rupees } from '../lib/fares.js'

function VehicleIcon({ id }) {
  const common = { width: 30, height: 30, viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (id === 'bike')
    return (
      <svg {...common}>
        <circle cx="7.5" cy="24" r="4.5" />
        <circle cx="24.5" cy="24" r="4.5" />
        <path d="M7.5 24 12 13h5l3.5 7M12 13l4.5 11M24.5 24l-5-11M17 6h3l-2 7" />
      </svg>
    )
  if (id === 'auto')
    return (
      <svg {...common}>
        <circle cx="8" cy="24.5" r="3.5" />
        <circle cx="24" cy="24.5" r="3.5" />
        <path d="M4.5 24.5h24M8 24.5V16c0-.6.4-1 1-1h9.5c.4 0 .8.2.9.6l2.6 5.4M16.5 8.5V15M16.5 8.5h3.5c2 0 3.5 1.6 3.5 3.5v7" />
        <path d="M6 20.5h14" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M4 21.5h24M6.5 21.5l1.8-6.6c.4-1.5 1.8-2.4 3.3-2.4h9c1.5 0 2.9 1 3.3 2.4l1.6 6.6" />
      <circle cx="10" cy="24" r="2.5" />
      <circle cx="22" cy="24" r="2.5" />
      <path d="M10 12.5V10c0-1 .8-1.8 1.8-1.8h8.4c1 0 1.8.8 1.8 1.8v2.5M8 21.5v-1.5M24 21.5V20" />
    </svg>
  )
}

export default function VehiclePicker({ value, onChange, distanceKm, fares, etas }) {
  return (
    <div className="vehicle-list" role="group" aria-label="Choose vehicle">
      {VEHICLES.map((v) => (
        <button
          key={v.id}
          type="button"
          className="vehicle-row"
          aria-pressed={value === v.id}
          onClick={() => onChange(v.id)}
        >
          <span className="v-icon"><VehicleIcon id={v.id} /></span>
          <span>
            <span className="v-name">{v.name}</span>
            <span className="v-note" style={{ display: 'block' }}>{v.note}</span>
          </span>
          <span className="fare-line" aria-hidden="true">
            <span className="fare-dots" />
            <span className="num">{fares[v.id] ? rupees(fares[v.id]) : '—'}</span>
          </span>
          <span className="sr-only">
            {fares[v.id] ? `${rupees(fares[v.id])}, about ${etas[v.id]} minutes` : 'select a destination for the fare'}
          </span>
        </button>
      ))}
    </div>
  )
}
    