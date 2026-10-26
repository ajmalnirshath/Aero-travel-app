// Real services, no keys required. Usage limits (be a good citizen):
//  - Nominatim: ~1 request/sec. The UI debounces to 500ms + aborts stale calls.
//  - OSRM demo server: light development use only.
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const OSRM = 'https://router.project-osrm.org'

export async function searchPlaces(query, near = null, signal) {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: 1,
    limit: 6,
  })
  // Bias results toward the user's location (2° viewbox, not a hard filter)
  if (near) {
    const d = 1.2
    params.set('viewbox', `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`)
  }
  const res = await fetch(`${NOMINATIM}/search?${params}`, { signal })
  if (!res.ok) throw new Error('Place search is unavailable right now.')
  const rows = await res.json()
  return rows.map((r) => ({
    label: r.name || r.display_name.split(',')[0],
    address: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }))
}

export async function reverseGeocode(lat, lng, signal) {
  const params = new URLSearchParams({ lat, lon: lng, format: 'json', zoom: 17 })
  const res = await fetch(`${NOMINATIM}/reverse?${params}`, { signal })
  if (!res.ok) throw new Error('Could not name this location.')
  const r = await res.json()
  const label = r.name || (r.address && (r.address.road || r.address.suburb)) || r.display_name?.split(',')[0]
  return { label: label || 'Current location', address: r.display_name || '' }
}

export async function fetchRoute(from, to) {
  const url =
    `${OSRM}/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Routing service is unavailable right now.')
  const data = await res.json()
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No road route found between these points.')
  const r = data.routes[0]
  return {
    // GeoJSON is [lng, lat] — Leaflet wants [lat, lng]
    coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: +(r.distance / 1000).toFixed(1),
    drivingMin: Math.round(r.duration / 60),
  }
}
