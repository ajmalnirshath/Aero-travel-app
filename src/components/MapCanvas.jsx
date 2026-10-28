import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet'

const pin = (cls) =>
  L.divIcon({ className: '', html: `<div class="${cls}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] })

const pickupIcon = pin('aero-pin-pickup')
const destIcon = pin('aero-pin-dest')

function FitRoute({ pickup, routeCoords }) {
  const map = useMap()
  useEffect(() => {
    if (routeCoords?.length) {
      // On phones the bottom sheet covers ~45% of the map — keep the route above it
      const mobile = window.innerWidth < 1024
      map.fitBounds(L.latLngBounds(routeCoords), mobile
        ? { paddingTopLeft: [28, 28], paddingBottomRight: [28, Math.round(window.innerHeight * 0.46)] }
        : { padding: [56, 56] })
    } else if (pickup) {
      map.setView([pickup.lat, pickup.lng], 15, { animate: true })
    }
  }, [map, pickup, routeCoords])
  return null
}

// Real GPS recenter — uses the browser geolocation API, never a fake position
function GpsRecenter() {
  const map = useMap()
  const recenter = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => map.setView([coords.latitude, coords.longitude], 16, { animate: true }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
    )
  }
  return (
    <div className="map-ctl-wrap">
      <button type="button" className="gps-btn" aria-label="Centre map on my GPS location" onClick={recenter}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      </button>
    </div>
  )
}

export default function MapCanvas({ pickup, dest, routeCoords }) {
  const center = pickup ? [pickup.lat, pickup.lng] : [12.9716, 77.5946] // Bengaluru until GPS locks
  return (
    <div className="aero-map">
      <MapContainer center={center} zoom={14} zoomControl={false}>
      <TileLayer
  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
/>
        {routeCoords?.length > 1 && (
          <>
            <Polyline positions={routeCoords} pathOptions={{ color: '#FFFFFF', weight: 9, opacity: 0.9 }} />
            <Polyline positions={routeCoords} pathOptions={{ color: '#202820', weight: 4, opacity: 0.95 }} />
          </>
        )}
        {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} aria-label="Pickup location" />}
        {dest && <Marker position={[dest.lat, dest.lng]} icon={destIcon} aria-label="Destination" />}
        <FitRoute pickup={pickup} routeCoords={routeCoords} />
        <GpsRecenter />
      </MapContainer>
    </div>
  )
}