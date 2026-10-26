import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import BookingPanel from '../components/BookingPanel.jsx'
import { api } from '../lib/api.js'
import { rupees } from '../lib/fares.js'
import { useApp } from '../context/AppContext.jsx'
import { speak } from '../lib/speech.js'

const VEHICLE_NAME = { bike: 'Bike', auto: 'Auto', car: 'Aero Car' }

export default function TripPage() {
  const { id } = useParams()
  const { lang } = useApp()
  const [trip, setTrip] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

useEffect(() => {
    api.getBooking(id).then(setTrip).catch((e) => setError(e.message))
  }, [id])

const cancel = async () => {
    setBusy(true)
    try {
      setTrip(await api.cancelBooking(id))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

const details = trip
    ? `${VEHICLE_NAME[trip.vehicle]} booked from ${trip.pickup_label} to ${trip.dest_label}. ` +
      `${trip.distance_km} kilometres, about ${trip.duration_min} minutes. Fare ${rupees(Math.round(trip.fare))}.`
    : ''

return (
    <div className="aero-shell">
      <div className="aero-map" aria-hidden="true" />
      <BookingPanel>
        {error && <p className="msg error" role="alert">{error}</p>}
        {!trip && !error && <p className="msg">Loading your trip…</p>}
        {trip && (
          <>
            <div>
              <p className="eyebrow">Trip #{trip.id}</p>
              <h1 className="display">Your ride is saved</h1>
            </div>
            <p className="msg" role="status">
              Requested — this build has no driver network connected, so there is no live driver
              status. Your booking is stored and cancellable below.
            </p>
            <div className="list">
              <div className="list-row">
                <div>
                  <div className="l-route">{trip.pickup_label} → {trip.dest_label}</div>
                  <div className="l-meta">
                    {VEHICLE_NAME[trip.vehicle]} · {trip.distance_km} km · ~{trip.duration_min} min · {rupees(Math.round(trip.fare))}
                  </div>
                </div>
                <span className={`status-chip ${trip.status}`}>{trip.status}</span>
              </div>
            </div>
            <button type="button" className="ghost-btn" onClick={() => speak(details, lang)}>
              Read trip details aloud
            </button>
            {trip.status === 'requested' ? (
              <button type="button" className="cta" onClick={cancel} disabled={busy}>
                {busy ? 'Cancelling…' : 'Cancel trip'}
              </button>
            ) : (
              <Link to="/" className="cta" style={{ textDecoration: 'none' }}>Book another ride</Link>
            )}
            <p className="voice-status">
              <Link to="/trips">See all trips</Link> · <Link to="/">Back to booking</Link>
            </p>
          </>
        )}
      </BookingPanel>
    </div>
  )
}
