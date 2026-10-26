import { useEffect, useRef, useState } from 'react'
import { searchPlaces } from '../lib/geo.js'

/**
 * Real Nominatim autocomplete. Debounced 500ms (service limit ~1 req/sec),
 * stale requests aborted. Touch targets ≥48px.
 */
export default function LocationField({ id, label, placeholder, value, onPick, near, iconClass }) {
  const [text, setText] = useState('')
  const [results, setResults] = useState(null) // null = closed, [] = no matches
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

useEffect(() => {
    if (!text.trim() || text.trim().length < 3 || value?.label === text) {
      setResults(null)
      return
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setBusy(true)
      setError(null)
      try {
        const rows = await searchPlaces(text.trim(), near, ctrl.signal)
        setResults(rows)
      } catch (e) {
        if (e.name !== 'AbortError') setError('Search is unavailable. Please try again.')
        setResults(null)
      } finally {
        setBusy(false)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [text, near, value?.label])

return (
    <div className={`loc-field ${iconClass}`}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <span className="loc-track" aria-hidden="true" />
      <input
        id={id}
        className="loc-input"
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={value?.label ?? text}
        onChange={(e) => {
          if (value) onPick(null) // typing clears a previously picked point
          setText(e.target.value)
        }}
        aria-describedby={results ? `${id}-results` : undefined}
      />
      {value && (
        <button
          type="button"
          className="loc-clear"
          aria-label={`Clear ${label}`}
          onClick={() => { setText(''); onPick(null); setResults(null) }}
        >✕</button>
      )}
      {(results || busy || error) && (
        <div className="loc-results" id={`${id}-results`}>
          {busy && <p className="loc-status">Searching places…</p>}
          {!busy && error && <p className="loc-status">{error}</p>}
          {!busy && results?.length === 0 && <p className="loc-status">No matches found. Try a fuller name.</p>}
          {!busy && results?.map((r) => (
            <button
              key={`${r.lat},${r.lng}`}
              type="button"
              className="loc-result"
              onClick={() => { onPick(r); setResults(null); setText('') }}
            >
              <span className="r-main">{r.label}</span>
              <span className="r-sub">{r.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
