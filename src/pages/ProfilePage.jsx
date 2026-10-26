import { useEffect, useState } from 'react'
import BookingPanel from '../components/BookingPanel.jsx'
import { api } from '../lib/api.js'
import { LANGS } from '../components/VoiceAssistant.jsx'
import { useApp } from '../context/AppContext.jsx'

export default function ProfilePage() {
  const { lang, setLang } = useApp()
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

useEffect(() => {
    api.getProfile()
      .then((p) => {
        setProfile(p)
        setName(p.name)
        setPhone(p.phone)
      })
      .catch((e) => setError(e.message))
  }, [])

const save = async () => {
    setBusy(true)
    setSaved(false)
    setError(null)
    try {
      const p = await api.updateProfile({ name, phone, language: lang })
      setProfile(p)
      setSaved(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

return (
    <div className="aero-shell">
      <div className="aero-map" aria-hidden="true" />
      <BookingPanel>
        <h1 className="display">Your profile</h1>
        {error && <p className="msg error" role="alert">{error}</p>}
        {!profile && !error && <p className="msg">Loading profile…</p>}
        {profile && (
          <>
            <div className="form-field">
              <label htmlFor="p-name">Name</label>
              <input
                id="p-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setSaved(false) }}
              />
            </div>

<div className="form-field">
              <label htmlFor="p-phone">Phone</label>
              <input
                id="p-phone"
                type="tel"
                inputMode="tel"
                placeholder="For the driver to call you"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setSaved(false) }}
              />
            </div>

<div className="form-field">
              <label htmlFor="p-lang">Preferred assistant language</label>
              <select
                id="p-lang"
                value={lang}
                onChange={(e) => { setLang(e.target.value); setSaved(false) }}
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

<button
              type="button"
              className="cta"
              onClick={save}
              disabled={busy || !name.trim()}
            >
              {busy ? 'Saving…' : 'Save profile'}
            </button>

{saved && (
              <p className="msg" role="status">
                Saved. AERO will speak to you in your chosen language.
              </p>
            )}

<p className="voice-status">
              AERO keeps your data on this device's own server — nothing is sent to third parties
              except the map services needed to find your route.
            </p>
          </>
        )}
      </BookingPanel>
    </div>
  )
}
