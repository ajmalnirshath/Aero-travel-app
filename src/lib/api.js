/**
 * AERO API client. All calls go through the Vite proxy to :8787.
 * Every function unwraps the server envelope ({ trip } / { places } / …)
 * so pages get plain data.
 */

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')


async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) msg = body.error
    } catch { /* non-JSON error body */ }
    throw new Error(msg)
  }
  return res.json()
}

export const api = {
  /* Bookings / lifecycle */
  createBooking: (b) =>
    req('/bookings', { method: 'POST', body: JSON.stringify(b) }).then((r) => r.trip),

getBooking: (id) =>
    req(`/bookings/${id}`).then((r) => r.trip),

listBookings: () =>
    req('/bookings').then((r) => r.trips),

setTripStatus: (id, status) =>
    req(`/bookings/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) })
      .then((r) => r.trip),

cancelBooking: (id) =>
    req(`/bookings/${id}/cancel`, { method: 'POST' }).then((r) => r.trip),

completeBooking: (id) =>
    req(`/bookings/${id}/complete`, { method: 'POST' }).then((r) => r.trip),

/* Saved places */
  listPlaces: () =>
    req('/places').then((r) => r.places),

savePlace: (p) =>
    req('/places', { method: 'POST', body: JSON.stringify(p) }).then((r) => r.place),

deletePlace: (id) =>
    req(`/places/${id}`, { method: 'DELETE' }),

/* Profile */
  getProfile: () =>
    req('/profile').then((r) => r.profile),

updateProfile: (p) =>
    req('/profile', { method: 'PUT', body: JSON.stringify(p) }).then((r) => r.profile),
}