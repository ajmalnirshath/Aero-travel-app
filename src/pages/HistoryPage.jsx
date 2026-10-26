import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BookingPanel from '../components/BookingPanel.jsx'
import { api } from '../lib/api.js'
import { rupees } from '../lib/fares.js'

export default function HistoryPage() {
  const [trips, setTrips] = useState(null)
  const [error, setError] = useState(null)

useEffect(() => {
    api.listBookings().then(setTrips).catch((e) => setError(e.message))
  }, [])

const cancel = async (id) => {
    try {
      await api.cancelBooking(id)
      setTrips(await api.listBookings())
    } catch (e) {
      setError(e.message)
    }
  }

return (
    <div className="aero-shell">
      <div className="aero-map" aria-hidden="true" />
      <BookingPanel>
        <h1 className="display">Your trips</h1>
        {error && <p className="msg error" role="alert">{error}</p>}
        {!trips && !error && <p className="msg">Loading trips…</p>}
        {trips && trips.length === 0 && (
          <div className="empty-state">
            <span className="display">No trips yet</span>
            Your bookings will appear here, newest first.
          </div>
        )}
        {trips && trips.length > 0 && (
          <div className="list">
            {trips.map((t) => (
              <div className="list-row" key={t.id}>
                <div>
                  <Link to={`/trip/${t.id}`} className="l-route">{t.pickup_label} → {t.dest_label}</Link>
                  <div className="l-meta">
                    {new Date(t.created_at + 'Z').toLocaleString()} · {t.distance_km} km · {rupees(Math.round(t.fare))}
                  </div>
                </div>
                {t.status === 'requested' ? (
                  <button type="button" className="ghost-btn" onClick={() => cancel(t.id)}>Cancel</button>
                ) : (
                  <span className={`status-chip ${t.status}`}>{t.status}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </BookingPanel>
    </div>
  )
}
