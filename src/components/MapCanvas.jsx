import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet'

const pin = (cls) =>
  L.divIcon({ className: '', html: `<div class="${cls}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] })

const pickupIcon = pin('aero-pin-pickup')
const destIcon = pin('aero-pin-dest')

function FitRoute({ pickup, dest, routeCoords }) {
  const map = useMap()
  useEffect(() => {
    if (routeCoords?.length) {
      map.fitBounds(L.latLngBounds(routeCoords), { padding: [56, 56] })
    } else if (pickup) {
      map.setView([pickup.lat, pickup.lng], 15, { animate: true })
    }
  }, [map, pickup, routeCoords])
  return null
}

export default function MapCanvas({ pickup, dest, routeCoords }) {
  const center = pickup ? [pickup.lat, pickup.lng] : [12.9716, 77.5946] // Bengaluru fallback until GPS locks
  return (
    <div className="aero-map">
      <MapContainer center={center} zoom={14} zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
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
      </MapContainer>
    </div>
  )
}
