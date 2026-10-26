import express from 'express'
import cors from 'cors'
import { db } from './db.js'

const app = express()
app.use(cors())
app.use(express.json())

const VEHICLES = new Set(['bike', 'auto', 'car'])
const STATUS = new Set(['requested', 'cancelled', 'completed'])

app.get('/api/profile', (req, res) => {
  res.json(db.prepare('SELECT * FROM profile WHERE id = 1').get())
})

app.put('/api/profile', (req, res) => {
  const { name, phone, language } = req.body ?? {}
  const langs = ['en-IN', 'ta-IN', 'hi-IN', 'te-IN', 'ml-IN', 'kn-IN']
  if (name !== undefined && (typeof name !== 'string' || !name.trim()))
    return res.status(400).json({ error: 'Invalid name' })
  if (phone !== undefined && (typeof phone !== 'string' || phone.length > 20))
    return res.status(400).json({ error: 'Invalid phone' })
  if (language !== undefined && !langs.includes(language))
    return res.status(400).json({ error: 'Unsupported language' })
  db.prepare(
    'UPDATE profile SET name = COALESCE(?, name), phone = COALESCE(?, phone), language = COALESCE(?, language) WHERE id = 1'
  ).run(
    name?.trim() ?? null,
    phone ?? null,
    language ?? null
  )
  res.json(db.prepare('SELECT * FROM profile WHERE id = 1').get())
})

app.get('/api/bookings', (req, res) => {
  res.json(db.prepare('SELECT * FROM bookings ORDER BY id DESC LIMIT 100').all())
})

app.get('/api/bookings/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Booking not found' })
  res.json(row)
})

app.post('/api/bookings', (req, res) => {
  const b = req.body ?? {}
  const num = (v) => typeof v === 'number' && Number.isFinite(v)
  const errors = []
  if (!VEHICLES.has(b.vehicle)) errors.push('vehicle must be bike | auto | car')
  for (const f of ['pickupLabel', 'destLabel'])
    if (typeof b[f] !== 'string' || !b[f].trim()) errors.push(`${f} required`)
  for (const f of ['pickupLat', 'pickupLng', 'destLat', 'destLng'])
    if (!num(b[f])) errors.push(`${f} must be a number`)
  if (!num(b.distanceKm) || b.distanceKm <= 0) errors.push('distanceKm must be positive')
  if (!Number.isInteger(b.durationMin) || b.durationMin <= 0) errors.push('durationMin must be a positive integer')
  if (!num(b.fare) || b.fare <= 0) errors.push('fare must be positive')
  if (errors.length) return res.status(400).json({ error: errors.join('; ') })

const info = db.prepare(`
    INSERT INTO bookings
      (vehicle, pickup_label, pickup_lat, pickup_lng, dest_label, dest_lat, dest_lng, distance_km, duration_min, fare, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested')
  `).run(
    b.vehicle, b.pickupLabel.trim(), b.pickupLat, b.pickupLng,
    b.destLabel.trim(), b.destLat, b.destLng,
    b.distanceKm, b.durationMin, b.fare
  )
  res.status(201).json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid))
})

app.post('/api/bookings/:id/cancel', (req, res) => {
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Booking not found' })
  if (row.status !== 'requested')
    return res.status(409).json({ error: 'Only requested trips can be cancelled' })
  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(req.params.id)
  res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id))
})

app.get('/api/places', (req, res) => {
  res.json(db.prepare('SELECT * FROM places ORDER BY id DESC').all())
})

app.post('/api/places', (req, res) => {
  const p = req.body ?? {}
  if (typeof p.label !== 'string' || !p.label.trim())
    return res.status(400).json({ error: 'label required' })
  const num = (v) => typeof v === 'number' && Number.isFinite(v)
  if (!num(p.lat) || !num(p.lng)) return res.status(400).json({ error: 'lat/lng required' })
  const info = db.prepare(
    'INSERT INTO places (label, address, lat, lng) VALUES (?, ?, ?, ?)'
  ).run(p.label.trim(), typeof p.address === 'string' ? p.address : null, p.lat, p.lng)
  res.status(201).json(db.prepare('SELECT * FROM places WHERE id = ?').get(info.lastInsertRowid))
})

app.delete('/api/places/:id', (req, res) => {
  const info = db.prepare('DELETE FROM places WHERE id = ?').run(req.params.id)
  if (!info.changes) return res.status(404).json({ error: 'Place not found' })
  res.status(204).end()
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 8787
app.listen(PORT, () => console.log(`AERO API on http://localhost:${PORT}`))
