// Transparent estimate model. Route distance is REAL (OSRM); fare & ETA are
// computed estimates, labelled as such in the UI.
export const VEHICLES = [
  { id: 'bike', name: 'Bike', note: 'Fastest in traffic · 1 rider', base: 15, perKm: 6.5, avgKmh: 24 },
  { id: 'auto', name: 'Auto', note: 'Door-to-door · up to 3', base: 25, perKm: 11, avgKmh: 20 },
  { id: 'car', name: 'Aero Car', note: 'Comfort · up to 4', base: 45, perKm: 16, avgKmh: 26 },
]

export function estimateFare(vehicleId, distanceKm) {
  const v = VEHICLES.find((x) => x.id === vehicleId)
  if (!v || !distanceKm) return null
  return Math.round((v.base + v.perKm * distanceKm) / 5) * 5
}

export function estimateEtaMin(vehicleId, distanceKm, drivingMin = null) {
  const v = VEHICLES.find((x) => x.id === vehicleId)
  if (!v || !distanceKm) return null
  // Car: trust OSRM's real driving duration when available.
  if (vehicleId === 'car' && drivingMin) return Math.max(2, Math.round(drivingMin))
  // Bike/auto: honest distance-based estimate (OSRM demo server routes for cars only).
  return Math.max(2, Math.round((distanceKm / v.avgKmh) * 60 + 2))
}

export const rupees = (n) => `₹${n}`
