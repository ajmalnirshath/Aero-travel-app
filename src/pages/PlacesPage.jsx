import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BookingPanel from '../components/BookingPanel.jsx'
import LocationField from '../components/LocationField.jsx'
import { api } from '../lib/api.js'
import { useApp } from '../context/AppContext.jsx'

export default function PlacesPage() {
  const navigate = useNavigate()
  const { setPendingDest } = useApp()
  const [places, setPlaces] = useState(null)
  const [picked, setPicked] = useState(null) // a place selected from search, awaiting a name
  const [name, setName] = useState('')
  const [error, setError] = useState(null)

const load = () => api.listPlaces().then(setPlaces).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

const save = async () => {
    if (!picked || !name.trim()) return
    try {
      await api.savePlace({ label: name.trim(), address: picked.address, lat: picked.lat, lng: picked.lng })
      setName('')
      setPicked(null)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

const remove = async (id) => {
    try { await api.deletePlace(id); load() } catch (e) { setError(e.message) }
  }

const useAsDestination = (p) => {
    setPendingDest({ label: p.label, lat: p.lat, lng: p.lng })
    navigate('/')
  }

return (
    <div className="aero-shell">
      <div className="aero-map" aria-hidden="true" />
      <BookingPanel>
        <h1 className="display">Saved places</h1>
        <p className="voice-status">
          Save places you go often — like the clinic, temple, or a family member's home.
        </p>
        {error && <p className="msg error" role="alert">{error}</p>}

<div className="form-field">
          <label htmlFor="place-name">Name this place</label>
          <input
            id="place-name"
            type="text"
            placeholder="e.g. Doctor's clinic"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

<LocationField
          id="place-search"
          label="Search the address to save"
          placeholder="Search the address to save"
          value={picked}
          onPick={setPicked}
        />

<button
          type="button"
          className="cta"
          disabled={!picked || !name.trim()}
          onClick={save}
        >
          Save place
        </button>

{!places && !error && <p className="msg">Loading saved places…</p>}
        {places && places.length === 0 && (
          <div className="empty-state">
            <span className="display">Nothing saved yet</span>
            Search an address above, name it, and press Save.
          </div>
        )}
        {places && places.length > 0 && (
          <div className="list">
            {places.map((p) => (
              <div className="list-row" key={p.id}>
                <div>
                  <div className="l-route">{p.label}</div>
                  <div className="l-meta">{p.address}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flex: 'none' }}>
                  <button type="button" className="ghost-btn" onClick={() => useAsDestination(p)}>
                    Use
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => remove(p.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </BookingPanel>
    </div>
  )
}
