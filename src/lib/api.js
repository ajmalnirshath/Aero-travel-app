async function req(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 204) return null
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
  return body
}

export const api = {
  getProfile: () => req('/api/profile'),
  updateProfile: (data) => req('/api/profile', { method: 'PUT', body: JSON.stringify(data) }),
  listBookings: () => req('/api/bookings'),
  getBooking: (id) => req(`/api/bookings/${id}`),
  createBooking: (b) => req('/api/bookings', { method: 'POST', body: JSON.stringify(b) }),
  cancelBooking: (id) => req(`/api/bookings/${id}/cancel`, { method: 'POST' }),
  listPlaces: () => req('/api/places'),
  savePlace: (p) => req('/api/places', { method: 'POST', body: JSON.stringify(p) }),
  deletePlace: (id) => req(`/api/places/${id}`, { method: 'DELETE' }),
}
