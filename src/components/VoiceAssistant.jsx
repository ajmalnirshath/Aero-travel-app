import { useEffect, useRef, useState } from 'react'
import { createRecognizer, recognitionSupported, speak } from '../lib/speech.js'

export const LANGS = [
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'te-IN', label: 'తెలుగు' },
  { code: 'ml-IN', label: 'മലയాളം' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ' },
]

const PROMPTS = {
  'ta-IN': 'சொல்லுங்கள், எங்கே போக வேண்டும்?',
  'en-IN': 'Say where you want to go.',
  'hi-IN': 'बोलिए, आप कहाँ जाना चाहते हैं?',
  'te-IN': 'చెప్పండి, మీరు ఎక్కడికి వెళ్ళాలి?',
  'ml-IN': 'പറയൂ, എവിടേക്ക് പോകണം?',
  'kn-IN': 'ಹೇಳಿ, ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು?',
}

/**
 * onTranscript(text) receives the FINAL spoken text.
 * The parent feeds it into the destination field's seedText so the
 * text appears in the box and autocomplete runs automatically.
 */
export default function VoiceAssistant({ lang, setLang, onTranscript }) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState(null)
  const recRef = useRef(null)
  const supported = recognitionSupported()

useEffect(() => () => recRef.current?.abort(), [])

const toggle = () => {
    if (listening) {
      recRef.current?.stop()
      return
    }
    setError(null)
    setInterim('')
    const rec = createRecognizer({
      lang,
      onInterim: setInterim,
      onFinal: (text) => {
        onTranscript?.(text)        // → fills the destination field
        setInterim('')
        speak(PROMPTS[lang] || PROMPTS['en-IN'], lang)
      },
      onEnd: () => { setListening(false); setInterim('') },
      onError: (err) => {
        setError(
          err === 'not-allowed'
            ? 'Microphone blocked. Click the lock icon in the address bar and allow the microphone.'
            : err === 'no-speech'
              ? 'Nothing was heard. Please tap the mic and speak again.'
              : 'Voice input stopped. Please try again.'
        )
      },
    })
    if (!rec) {
      setError('Voice input is not supported in this browser. Use Chrome or Edge.')
      return
    }
    recRef.current = rec
    rec.start()
    setListening(true)
    speak(PROMPTS[lang] || PROMPTS['en-IN'], lang)
  }

return (
    <div>
      <div className="voice-bar">
        <button
          type="button"
          className="mic-btn"
          aria-pressed={listening}
          aria-label={listening ? 'Stop listening' : 'Speak your destination'}
          onClick={toggle}
          disabled={!supported}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
          </svg>
        </button>
        <select
          className="lang-select"
          aria-label="Assistant language"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
        >
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </div>
      <p className="voice-status" aria-live="polite">
        {error && <strong>{error}</strong>}
        {!error && !listening && !interim &&
          'Tap the mic and say where you want to go. You will always confirm before booking.'}
        {!error && listening && !interim &&
          'Listening… speak clearly.'}
        {!error && listening && interim &&
          <span>“{interim}” — keep speaking…</span>}
        {!error && !listening && interim && ''}
      </p>
    </div>
  )
}