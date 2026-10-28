/**
 * AERO API — Express + Neon Postgres.
 * Booking lifecycle: live → arriving → in_progress → completed
 * Cancel allowed only from live/arriving. Free cancellation within 2 minutes.
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import { sql, initDb } from './db.js'

const app = express()
app.use(cors())
app.use(express.json())

const NEXT_STATUS = { live: 'arriving', arriving: 'in_progress', in_progress: 'completed' }
const CANCELLABLE = ['live', 'arriving']
const FREE_CANCEL_MS = 2 * 60 * 1000

/* ---------- Bookings ---------- */

app.post('/api/bookings', async (req, res) => {
  try {
    const { pickup, dest, vehicle, fare, distanceKm, etaMin } = req.body
    if (!pickup?.lat || !pickup?.lng || !dest?.lat || !dest?.lng || !vehicle) {
      return res.status(400).json({ error: 'pickup, dest and vehicle are required' })
    }
    const id = crypto.randomUUID()
    const [trip] = await sql`
      INSERT INTO bookings (id, vehicle, fare, distance_km, eta_min,
        pickup_label, pickup_addr, pickup_lat, pickup_lng,
        dest_label, dest_addr, dest_lat, dest_lng)
      VALUES (${id}, ${vehicle}, ${Math.round(fare)}, ${distanceKm}, ${etaMin},
        ${pickup.label}, ${pickup.address ?? ''}, ${pickup.lat}, ${pickup.lng},
        ${dest.label}, ${dest.address ?? ''}, ${dest.lat}, ${dest.lng})
      RETURNING *`
    res.status(201).json({ trip })
  } catch (e) {
    console.error('create booking:', e)
    res.status(500).json({ error: 'Could not save booking' })
  }
})

app.get('/api/bookings', async (_req, res) => {
  try {
    const trips = await sql`SELECT * FROM bookings ORDER BY created_at DESC LIMIT 100`
    res.json({ trips })
  } catch (e) {
    console.error('history:', e)
    res.status(500).json({ error: 'Could not load trips' })
  }
})

app.get('/api/bookings/:id', async (req, res) => {
  try {
    const [trip] = await sql`SELECT * FROM bookings WHERE id = ${req.params.id}`
    if (!trip) return res.status(404).json({ error: 'Trip not found' })
    res.json({ trip })
  } catch (e) {
    console.error('get trip:', e)
    res.status(500).json({ error: 'Could not load trip' })
  }
})

/* Advance one step in the lifecycle. Server enforces the order. */
app.post('/api/bookings/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    const [trip] = await sql`SELECT * FROM bookings WHERE id = ${req.params.id}`
    if (!trip) return res.status(404).json({ error: 'Trip not found' })
    if (NEXT_STATUS[trip.status] !== status) {
      return res.status(409).json({ error: `Cannot move from '${trip.status}' to '${status}'` })
    }
    const [updated] = await sql`
      UPDATE bookings SET status = ${status} WHERE id = ${trip.id} RETURNING *`
    res.json({ trip: updated })
  } catch (e) {
    console.error('status change:', e)
    res.status(500).json({ error: 'Could not update trip status' })
  }
})

app.post('/api/bookings/:id/cancel', async (req, res) => {
  try {
    const [trip] = await sql`SELECT * FROM bookings WHERE id = ${req.params.id}`
    if (!trip) return res.status(404).json({ error: 'Trip not found' })
    if (!CANCELLABLE.includes(trip.status)) {
      return res.status(409).json({ error: 'Trip can no longer be cancelled' })
    }
    const cancelled_free = Date.now() - new Date(trip.created_at).getTime() <= FREE_CANCEL_MS
    const [updated] = await sql`
      UPDATE bookings SET status = 'cancelled' WHERE id = ${trip.id} RETURNING *`
    res.json({ trip: updated, cancelled_free })
  } catch (e) {
    console.error('cancel:', e)
    res.status(500).json({ error: 'Could not cancel trip' })
  }
})

/* Kept for compatibility — completes directly (valid only from in_progress). */
app.post('/api/bookings/:id/complete', async (req, res) => {
  try {
    const [trip] = await sql`SELECT * FROM bookings WHERE id = ${req.params.id}`
    if (!trip) return res.status(404).json({ error: 'Trip not found' })
    if (NEXT_STATUS[trip.status] !== 'completed') {
      return res.status(409).json({ error: `Cannot complete from '${trip.status}'` })
    }
    const [updated] = await sql`
      UPDATE bookings SET status = 'completed' WHERE id = ${trip.id} RETURNING *`
    res.json({ trip: updated })
  } catch (e) {
    console.error('complete:', e)
    res.status(500).json({ error: 'Could not complete trip' })
  }
})

/* ---------- Saved places ---------- */

app.get('/api/places', async (_req, res) => {
  try {
    const places = await sql`SELECT * FROM saved_places ORDER BY created_at DESC`
    res.json({ places })
  } catch (e) {
    console.error('list places:', e)
    res.status(500).json({ error: 'Could not load saved places' })
  }
})

app.post('/api/places', async (req, res) => {
  try {
    const { label, address, lat, lng } = req.body
    if (!label || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'label, lat and lng are required' })
    }
    const id = crypto.randomUUID()
    const [place] = await sql`
      INSERT INTO saved_places (id, label, address, lat, lng)
      VALUES (${id}, ${label}, ${address ?? ''}, ${lat}, ${lng})
      RETURNING *`
    res.status(201).json({ place })
  } catch (e) {
    console.error('save place:', e)
    res.status(500).json({ error: 'Could not save place' })
  }
})

app.delete('/api/places/:id', async (req, res) => {
  try {
    const [place] = await sql`DELETE FROM saved_places WHERE id = ${req.params.id} RETURNING *`
    if (!place) return res.status(404).json({ error: 'Place not found' })
    res.json({ deleted: true })
  } catch (e) {
    console.error('delete place:', e)
    res.status(500).json({ error: 'Could not delete place' })
  }
})

/* ---------- Profile ---------- */

app.get('/api/profile', async (_req, res) => {
  try {
    const [profile] = await sql`SELECT * FROM profile WHERE id = 1`
    res.json({ profile })
  } catch (e) {
    console.error('get profile:', e)
    res.status(500).json({ error: 'Could not load profile' })
  }
})

app.put('/api/profile', async (req, res) => {
  try {
    const { name, phone, language, text_scale, contrast } = req.body
    const [profile] = await sql`
      UPDATE profile SET
        name       = COALESCE(${name ?? null}, name),
        phone      = COALESCE(${phone ?? null}, phone),
        language   = COALESCE(${language ?? null}, language),
        text_scale = COALESCE(${text_scale ?? null}, text_scale),
        contrast   = COALESCE(${contrast ?? null}, contrast)
      WHERE id = 1 RETURNING *`
    res.json({ profile })
  } catch (e) {
    console.error('update profile:', e)
    res.status(500).json({ error: 'Could not save profile' })
  }
})

/* ---------- Health + start ---------- */

app.get('/api/health', async (_req, res) => {
  try {
    await sql`SELECT 1`
    res.json({ ok: true, db: 'neon' })
  } catch {
    res.status(500).json({ ok: false })
  }
})

const PORT = process.env.PORT || 8787
initDb()
  .then(() => app.listen(PORT, () => console.log(`AERO API on :${PORT} (Neon Postgres) ✓`)))
  .catch((e) => {
    console.error('DB init failed:', e.message)
    process.exit(1)
  })