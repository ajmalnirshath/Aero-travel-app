import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BookingPanel from '../components/BookingPanel.jsx'
import MapCanvas from '../components/MapCanvas.jsx'
import LocationField from '../components/LocationField.jsx'
import VehiclePicker from '../components/VehiclePicker.jsx'
import VoiceAssistant from '../components/VoiceAssistant.jsx'
import { useApp } from '../context/AppContext.jsx'
import { fetchRoute, reverseGeocode } from '../lib/geo.js'
import { VEHICLES, estimateFare, estimateEtaMin, rupees } from '../lib/fares.js'
import { api } from '../lib/api.js'
import { speak } from '../lib/speech.js'

export default function BookingPage() {
  const { lang, pendingDest, setPendingDest } = useApp()
  const navigate = useNavigate()

const [pickup, setPickup] = useState(null)
  const [dest, setDest] = useState(null)
  const [route, setRoute] = useState(null)
  const [vehicle, setVehicle] = useState('auto')
  const [geoError, setGeoError] = useState(null)
  const [routeError, setRouteError] = useState(null)
  const [booking, setBooking] = useState(false)
  const [bookError, setBookError] = useState(null)

// Real GPS pickup (no faking — permission denial is shown honestly)
  useEffect(() => {
    if (!navigator.geolocation) return setGeoError('This browser does not support GPS.')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setPickup({ lat: coords.latitude, lng: coords.longitude, label: 'Locating…' })
        try {
          const { label, address } = await reverseGeocode(coords.latitude, coords.longitude)
          setPickup({ lat: coords.latitude, lng: coords.longitude, label, address })
        } catch {
          setPickup({ lat: coords.latitude, lng: coords.longitude, label: 'Current location' })
        }
      },
      (err) =>
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Location is off. Allow location access, or search for your pickup point below.'
            : 'Could not get your location. Please search for your pickup point below.'
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }, [])

// Saved Places → "Use" flows here
  useEffect(() => {
    if (pendingDest) {
      setDest(pendingDest)
      setPendingDest(null)
    }
  }, [pendingDest, setPendingDest])

// Real OSRM route whenever both points exist
  useEffect(() => {
    let cancelled = false
    if (!pickup?.lat || !dest?.lat) { setRoute(null); setRouteError(null); return }
    setRoute(null)
    setRouteError(null)
    fetchRoute(pickup, dest)
      .then((r) => !cancelled && setRoute(r))
      .catch((e) => !cancelled && setRouteError(e.message))
    return () => { cancelled = true }
  }, [pickup?.lat, pickup?.lng, dest?.lat, dest?.lng])

const fares = useMemo(() => {
    const out = {}
    for (const v of VEHICLES) out[v.id] = route ? estimateFare(v.id, route.distanceKm) : null
    return out
  }, [route])

const etas = useMemo(() => {
    const out = {}
    for (const v of VEHICLES)
      out[v.id] = route ? estimateEtaMin(v.id, route.distanceKm, route.drivingMin) : null
    return out
  }, [route])

const canBook = Boolean(pickup?.lat && dest?.lat && route && !booking)

const confirmBooking = async () => {
    if (!canBook) return
    setBooking(true)
    setBookError(null)
    try {
      const b = await api.createBooking({
        vehicle,
        pickupLabel: pickup.label,
        pickupLat: pickup.lat, pickupLng: pickup.lng,
        destLabel: dest.label,
        destLat: dest.lat, destLng: dest.lng,
        distanceKm: route.distanceKm,
        durationMin: etas[vehicle],
        fare: fares[vehicle],
      })
      navigate(`/trip/${b.id}`)
    } catch (e) {
      setBookError(e.message)
      setBooking(false)
    }
  }

// Spoken summary — used by the voice assistant before explicit confirmation
  const confirmPrompt = (place) =>
    `Trip to ${place.label}. The fare is about ${rupees(fares[vehicle] ?? estimateFare(vehicle, route?.distanceKm ?? 0))} ` +
    `and it takes about ${etas[vehicle] ?? 'a few'} minutes. Say confirm to book.`

const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

return (
    <div className="aero-shell">
      <MapCanvas pickup={pickup} dest={dest} routeCoords={route?.coords} />
      <BookingPanel>
        <div>
          <p className="eyebrow">{greeting}</p>
          <h1 className="display">Where to?</h1>
        </div>

<div className="loc-group">
          <LocationField
            id="pickup" label="Pickup point" placeholder="Pickup — using GPS, or search"
            value={pickup} onPick={setPickup} near={pickup || dest}
          />
          <LocationField
            id="dest" label="Where to?" placeholder="Search destination"
            value={dest} onPick={setDest} near={pickup} iconClass="is-dest"
          />
        </div>

{geoError && <p className="msg" role="status">{geoError}</p>}
        {routeError && <p className="msg error" role="alert">{routeError}</p>}

<VehiclePicker value={vehicle} onChange={setVehicle} distanceKm={route?.distanceKm} fares={fares} etas={etas} />

<p className="route-line" aria-live="polite">
          {route ? (
            <>
              <span><span className="num">{route.distanceKm}</span> km</span>
              <span aria-hidden="true">·</span>
              <span><span className="num">{etas[vehicle]}</span> min est.</span>
            </>
          ) : (
            'Fare appears once a route is found.'
          )}
        </p>

<VoiceAssistant
          onDestination={setDest}
          onConfirm={confirmBooking}
          confirmPrompt={confirmPrompt}
          canConfirm={canBook}
        />

{bookError && <p className="msg error" role="alert">{bookError}</p>}

<button type="button" className="cta" disabled={!canBook} onClick={confirmBooking}>
          {booking ? 'Booking…' : route ? `Book ${rupees(fares[vehicle])}` : 'Set destination'}
        </button>

<p className="voice-status">
          Fare and time are estimates. AERO shows real routes from OpenStreetMap.
        </p>
      </BookingPanel>
    </div>
  )
}
