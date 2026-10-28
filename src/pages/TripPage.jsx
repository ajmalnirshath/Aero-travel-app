import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import MapCanvas from '../components/MapCanvas.jsx'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../lib/api.js'
import { fetchRoute } from '../lib/geo.js'
import { rupees } from '../lib/fares.js'
import { speak } from '../lib/speech.js'

/**
 * Trip lifecycle screen.
 * Honest design: there is NO live driver network — the "advance" control
 * is a clearly labelled demo control so the full flow can be tested.
 * Voice announces every state change in the user's language.
 */

const STEPS = [
  { id: 'live', label: 'Confirmed' },
  { id: 'arriving', label: 'Driver arriving' },
  { id: 'in_progress', label: 'In trip' },
  { id: 'completed', label: 'Completed' },
]

const NEXT = { live: 'arriving', arriving: 'in_progress', in_progress: 'completed' }
const CANCELLABLE = ['live', 'arriving']

const VEHICLE_NAMES = { bike: 'Bike', auto: 'Auto', car: 'Aero Car' }

/** Spoken line per status. Tamil gets a real translation; others fall back to English. */
function statusLine(status, trip, lang) {
  const fare = rupees(trip.fare)
  const eta = trip.eta_min
  if (lang === 'ta-IN') {
    const lines = {
      live: `உங்கள் பயணம் உறுதி செய்யப்பட்டது. ${VEHICLE_NAMES[trip.vehicle] ?? trip.vehicle} வரும் நேரம் சுமார் ${eta} நிமிடம்.`,
      arriving: `ஓட்டுநர் வருகிறார். சுமார் ${eta} நிமிடத்தில் வந்துவிடுவார்.`,
      in_progress: 'உங்கள் பயணம் தொடங்கியது.',
      completed: `பயணம் முடிந்தது. கட்டணம் ${fare}.`,
      cancelled: 'பயணம் ரத்து செய்யப்பட்டது.',
    }
    return lines[status] ?? ''
  }
  const lines = {
    live: `Your ride is confirmed. The ${VEHICLE_NAMES[trip.vehicle] ?? trip.vehicle} will arrive in about ${eta} minutes.`,
    arriving: `The driver is arriving in about ${eta} minutes.`,
    in_progress: 'Your trip has started.',
    completed: `Trip complete. The fare is ${fare}.`,
    cancelled: 'Your ride has been cancelled.',
  }
  return lines[status] ?? ''
}

export default function TripPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { lang } = useApp()

const [trip, setTrip] = useState(null)
  const [route, setRoute] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

// Track the last status we announced, so re-renders don't repeat speech.
  const announced = useRef(null)

/* Load trip + its route for the map */
  useEffect(() => {
    let dead = false
    api.getBooking(id)
      .then(async (t) => {
        if (dead) return
        setTrip(t)
        try {
          const r = await fetchRoute(
            { lat: t.pickup_lat, lng: t.pickup_lng },
            { lat: t.dest_lat, lng: t.dest_lng }
          )
          if (!dead) setRoute(r)
        } catch { /* map still shows both markers without the line */ }
      })
      .catch((e) => !dead && setErr(e.message || 'Could not load trip'))
    return () => { dead = true }
  }, [id])

/* Announce each status once, in the user's language */
  useEffect(() => {
    if (!trip || announced.current === trip.status) return
    announced.current = trip.status
    if (lang) speak(statusLine(trip.status, trip, lang), lang)
  }, [trip, lang])

/* One-step advance (demo control). Server enforces the order. */
  const advance = async () => {
    if (!trip || busy) return
    const next = NEXT[trip.status]
    if (!next) return
    setBusy(true); setErr(null)
    try { setTrip(await api.setTripStatus(trip.id, next)) }
    catch (e) { setErr(e.message || 'Could not update status') }
    finally { setBusy(false) }
  }

const cancel = async () => {
    if (!trip || busy) return
    setBusy(true); setErr(null)
    try { setTrip(await api.cancelBooking(trip.id)) }
    catch (e) { setErr(e.message || 'Could not cancel') }
    finally { setBusy(false) }
  }

if (err && !trip) {
    return (
      <div className="aero-shell">
        <div className="trip-panel">
          <p className="msg error">{err}</p>
          <button type="button" className="cta" onClick={() => navigate('/')}>BACK TO BOOKING</button>
        </div>
      </div>
    )
  }
  if (!trip) {
    return <div className="aero-shell"><div className="trip-panel"><p className="msg">Loading your trip…</p></div></div>
  }

const stepIndex = STEPS.findIndex((s) => s.id === trip.status)
  const isCancelled = trip.status === 'cancelled'
  const isCompleted = trip.status === 'completed'
  const canAdvance = !!NEXT[trip.status] && !busy
  const canCancel = CANCELLABLE.includes(trip.status) && !busy

/* Free-cancel window: within 2 minutes of booking (server computes the truth;
     this is only for the label). */
  const secsSince = Date.now() - new Date(trip.created_at).getTime()
  const freeCancel = secsSince <= 2 * 60 * 1000

const pickup = { lat: trip.pickup_lat, lng: trip.pickup_lng, label: trip.pickup_label }
  const dest = { lat: trip.dest_lat, lng: trip.dest_lng, label: trip.dest_label }

return (
    <div className="aero-shell">
      <MapCanvas pickup={pickup} dest={dest} routeCoords={route?.coords} />

<div className="trip-panel">
        <p className="eyebrow">AERO TRIP</p>
        <p className="display">{VEHICLE_NAMES[trip.vehicle] ?? trip.vehicle} · {rupees(trip.fare)}</p>

{/* Status timeline */}
        {!isCancelled && (
          <ol className="trip-steps">
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                className={
                  'trip-step ' + (i < stepIndex ? 'done' : i === stepIndex ? 'now' : '')
                }
                aria-current={i === stepIndex ? 'step' : undefined}
              >
                <span className="trip-dot" aria-hidden="true" />
                <span>{s.label}</span>
                {i === 1 && <span className="trip-eta">{trip.eta_min} min</span>}
              </li>
            ))}
          </ol>
        )}

{isCancelled && (
          <p className="msg error">This trip was cancelled. It is saved in your history.</p>
        )}

{/* Route summary */}
        <p className="route-line">
          <span>{trip.pickup_label}</span>
          <span aria-hidden="true">→</span>
          <span>{trip.dest_label}</span>
        </p>
        <p className="route-line">
          <span className="num">{trip.distance_km} km</span>
          <span>·</span>
          <span className="num">{trip.eta_min} min est.</span>
        </p>

{err && <p className="msg error">{err}</p>}

{/* Receipt on completion */}
        {isCompleted && (
          <div className="trip-receipt">
            <p className="v-name">Fare receipt (estimate)</p>
            <div className="receipt-row"><span>Vehicle</span><span>{VEHICLE_NAMES[trip.vehicle] ?? trip.vehicle}</span></div>
            <div className="receipt-row"><span>Distance</span><span>{trip.distance_km} km</span></div>
            <div className="receipt-row"><span>Estimated time</span><span>{trip.eta_min} min</span></div>
            <div className="receipt-row total"><span>Total</span><span className="num">{rupees(trip.fare)}</span></div>
          </div>
        )}

{/* Actions */}
        {canAdvance && (
          <button type="button" className="cta" onClick={advance}>
            {trip.status === 'live' ? 'SIMULATE DRIVER ASSIGNED → ARRIVING'
              : trip.status === 'arriving' ? 'SIMULATE PICKUP → START TRIP'
              : 'COMPLETE TRIP'}
          </button>
        )}
        {canCancel && (
          <button type="button" className="cta is-ghost" onClick={cancel}>
            CANCEL RIDE{freeCancel ? ' · FREE' : ''}
          </button>
        )}

<p className="eyebrow">
          Demo control: AERO has no live driver network yet, so status moves one step
          per tap. Cancel is free within 2 minutes of booking.
        </p>

<Link to="/history" className="trip-history-link">View all trips</Link>
      </div>
    </div>
  )
}
