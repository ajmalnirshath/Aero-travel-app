import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BookingPanel from '../components/BookingPanel.jsx'
import MapCanvas from '../components/MapCanvas.jsx'
import LocationField from '../components/LocationField.jsx'
import VoiceAssistant from '../components/VoiceAssistant.jsx'
import VehiclePicker from '../components/VehiclePicker.jsx'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../lib/api.js'
import { fetchRoute, reverseGeocode } from '../lib/geo.js'
import { estimateFares } from '../lib/fares.js'
import { speak } from '../lib/speech.js'

// IMPORTANT: these ids must match what estimateFares() returns in lib/fares.js
const VEHICLES = [
  { id: 'auto', name: 'Auto rickshaw', blurb: 'Best for short city hops' },
  { id: 'car',  name: 'Car',          blurb: 'Comfortable, door-to-door' },
  { id: 'bike', name: 'Bike',         blurb: 'Fastest through traffic' },
]

export default function BookingPage() {
  const navigate = useNavigate()
  const { lang, setLang } = useApp()

const [pickup, setPickup] = useState(null)
  const [dest, setDest] = useState(null)
  const [route, setRoute] = useState(null)
  const [routeBusy, setRouteBusy] = useState(false)
  const [routeError, setRouteError] = useState(null)
  const [vehicle, setVehicle] = useState('auto')
  const [bookingBusy, setBookingBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [voiceQuery, setVoiceQuery] = useState('')
  const [gpsMsg, setGpsMsg] = useState('Finding your GPS location…')

/* 1. Real GPS pickup on load — unchanged */
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsMsg('Location is not supported on this device. Search for your pickup point below.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const p = { lat: coords.latitude, lng: coords.longitude }
        try {
          const named = await reverseGeocode(p.lat, p.lng)
          setPickup({ ...p, label: named.label, address: named.address })
        } catch {
          setPickup({ ...p, label: 'Current GPS location', address: '' })
        }
        setGpsMsg(null)
      },
      () => setGpsMsg('Location is off. Allow location access, or search for your pickup point below.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }, [])

/* 2. Real route when both points exist — unchanged */
  useEffect(() => {
    if (!pickup || !dest) { setRoute(null); setRouteError(null); return }
    let dead = false
    setRouteBusy(true)
    setRouteError(null)
    fetchRoute(pickup, dest)
      .then((r) => { if (!dead) setRoute(r) })
      .catch((e) => { if (!dead) setRouteError(e.message || 'No road route found.') })
      .finally(() => { if (!dead) setRouteBusy(false) })
    return () => { dead = true }
  }, [pickup, dest])

const fares = route ? estimateFares(route.distanceKm) : null
  const selectedFare = fares?.find((f) => f.id === vehicle) || null

/* 3. Spoken fare + ETA — unchanged */
  useEffect(() => {
    if (route && selectedFare && lang) {
      speak(
        lang === 'ta-IN'
          ? `கார் தூரம் ${route.distanceKm} கிலோமீட்டர். கட்டணம் சுமார் ${selectedFare.fare} ரூபாய்.`
          : `Route is ${route.distanceKm} kilometres. The ${selectedFare.name.toLowerCase()} fare is about ${selectedFare.fare} rupees.`,
        lang
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route])

/* 4. Book — unchanged */
  const book = async () => {
    if (!pickup || !dest || !route || !selectedFare || bookingBusy) return
    setBookingBusy(true)
    setMsg(null)
    try {
      const trip = await api.createBooking({
        pickup, dest, vehicle,
        fare: selectedFare.fare,
        distanceKm: route.distanceKm,
        etaMin: selectedFare.etaMin,
      })
      navigate(`/trip/${trip.id}`)
    } catch (e) {
      setMsg(e?.message || 'Booking failed. Please try again.')
    } finally {
      setBookingBusy(false)
    }
  }

const canBook = !!(pickup && dest && route && selectedFare && !routeBusy)
  const ctaLabel = !dest
    ? 'SET DESTINATION'
    : routeBusy
      ? 'FINDING ROUTE…'
      : canBook
        ? `BOOK ${selectedFare.name.toUpperCase()} · ₹${selectedFare.fare}`
        : 'CHOOSE A DESTINATION'

/* NEW: map only exists once a destination is chosen */
  const showMap = !!(pickup && dest)

return (
    <div className={`aero-shell${showMap ? ' is-routing' : ' is-search'}`}>

{showMap && (
        <MapCanvas pickup={pickup} dest={dest} routeCoords={route?.coords} />
      )}

<BookingPanel tab="book">
        <p className="display">Where to?</p>

<div aria-live="polite">
          {gpsMsg && <p className="msg">{gpsMsg}</p>}
        </div>

<div className="loc-group">
          <LocationField
            id="pickup-search"
            label="Pickup — using GPS, or search"
            placeholder="Pickup — using GPS, or search"
            value={pickup}
            onPick={(p) => setPickup(p)}
            near={pickup}
          />
          <LocationField
            id="dest-search"
            label="Search destination"
            placeholder="Search destination"
            value={dest}
            onPick={setDest}
            near={pickup}
            iconClass="is-dest"
            seedText={voiceQuery}
          />
        </div>

{route && (
          <p className="route-line">
            <span className="num">{route.distanceKm} km</span>
            <span>·</span>
            <span className="num">{route.drivingMin} min</span>
            <span>by road</span>
          </p>
        )}
        {routeError && <p className="msg error">{routeError}</p>}

{/* NEW: all vehicles, always visible.
            Before the route exists → preview cards (selectable, no fares yet).
            Once fares are computed → your real VehiclePicker with live prices. */}
        {fares ? (
          <VehiclePicker options={fares} selected={vehicle} onSelect={setVehicle} />
        ) : (
          <div className="vehicle-preview" aria-label="Choose a vehicle type">
            {VEHICLES.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`vehicle-chip${vehicle === v.id ? ' is-active' : ''}`}
                onClick={() => setVehicle(v.id)}
              >
                <span className="vehicle-chip-name">{v.name}</span>
                <span className="vehicle-chip-blurb">{v.blurb}</span>
                <span className="vehicle-chip-fare">
                  {routeBusy ? 'Calculating fare…' : 'Fare appears once route is set'}
                </span>
              </button>
            ))}
          </div>
        )}

{msg && <p className="msg error">{msg}</p>}

<button type="button" className="cta" onClick={book} disabled={!canBook || bookingBusy}>
          {bookingBusy ? 'BOOKING…' : ctaLabel}
        </button>

<VoiceAssistant lang={lang} setLang={setLang} onTranscript={setVoiceQuery} />

<p className="eyebrow">
          Fare and time are estimates. AERO shows real routes from OpenStreetMap.
        </p>
      </BookingPanel>
    </div>
  )
}