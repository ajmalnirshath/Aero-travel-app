/**
 * Real fare + ETA estimation for AERO.
 * Rates modelled on Indian bike/auto/car pricing (₹, distance-based).
 * Transparent estimates — the booking screen labels them as such.
 *
 * Exports:
 *   estimateFares(distanceKm, drivingMin?) → [{ id, name, note, fare, etaMin }]
 *   rupees(n) → formatted ₹ string used by Trip/History/Places pages
 */

const RATES = {
  bike: {
    id: 'bike',
    name: 'Bike',
    note: 'Fastest in traffic · 1 rider',
    base: 15,
    perKm: 7,
    speedKmph: 32,
    arriveMin: 3,
    minFare: 25,
  },
  auto: {
    id: 'auto',
    name: 'Auto',
    note: 'Door-to-door · up to 3',
    base: 25,
    perKm: 12,
    speedKmph: 24,
    arriveMin: 4,
    minFare: 40,
  },
  car: {
    id: 'car',
    name: 'Aero Car',
    note: 'Comfort · up to 4',
    base: 55,
    perKm: 17,
    speedKmph: 22,
    arriveMin: 5,
    minFare: 80,
  },
}

/** Round to sensible Indian fare values (nearest ₹5). */
const round5 = (n) => Math.max(5, Math.round(n / 5) * 5)

/** Format a number as an Indian rupee string, e.g. 86 → "₹86". */
export const rupees = (n) => `₹${Math.round(Number(n) || 0)}`

/**
 * @param {number} distanceKm  route distance from OSRM
 * @param {number} [drivingMin] optional real driving time from OSRM
 * @returns {Array<{id: string, name: string, note: string, fare: number, etaMin: number}>}
 */
export function estimateFares(distanceKm, drivingMin) {
  const km = Number(distanceKm)
  if (!Number.isFinite(km) || km <= 0) return []

return Object.values(RATES).map((r) => {
    const fare = round5(Math.max(r.minFare, r.base + km * r.perKm))

const driveMin = Number.isFinite(drivingMin) && drivingMin > 0
      ? Math.max(drivingMin * (r.speedKmph <= 24 ? 0.85 : 1), (km / r.speedKmph) * 60)
      : Math.max(2, Math.round((km / r.speedKmph) * 60))

const etaMin = Math.max(1, Math.round(driveMin + r.arriveMin))

return { id: r.id, name: r.name, note: r.note, fare, etaMin }
  })
}