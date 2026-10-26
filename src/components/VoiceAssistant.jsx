import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { searchPlaces } from '../lib/geo.js'
import { speak, speechSupported } from '../lib/speech.js'

export const LANGS = [
  { code: 'en-IN', label: 'English' },
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'te-IN', label: 'తెలుగు' },
  { code: 'ml-IN', label: 'മലയാളം' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ' },
]

// Minimal per-language intent patterns. Simple by design — anything not
// understood triggers a spoken clarification, never a guess.
const INTENTS = {
  'en-IN': {
    go: /(?:take me|go|drive|book)\s+(?:to|for)\s+(.+)/i,
    confirm: /\b(confirm|yes|book it)\b/i,
    yes: 'Say: take me to <place>. For example, take me to Central Station.',
  },
  'ta-IN': {
    go: /(?:போகணும்|போகணும்னு|புக்\s*பண்ணு|ஏரோ)\s*(?:ப்)?\s*(.+)/i,
    confirm: /(ஆமா|சரி|புக்|கண்டிப்பா|ஒப்புக்கொள்கிறேன்)/i,
    yes: 'சொல்லுங்கள்: போகணும் <இடம்>. உதாரணம், போகணும் சென்ட்ரல் ஸ்டேஷன்.',
  },
  'hi-IN': {
    go: /(?:के लिए|को जाना|जाना है|बुक करो|चलो)\s*(?:मुझे\s+)?(.+)/i,
    confirm: /(हाँ|हां|बुक करो|पक्का|करो)/i,
    yes: 'कहिए: मुझे <जगह> जाना है। जैसे, मुझे सेंट्रल स्टेशन जाना है।',
  },
  'te-IN': {
    go: /(?:వెళ్ళాలి|బుక్ చేయండి|వెళ్ళాలనుకుంటున్నా|ఏరో)\s*(?:కి|కు)?\s*(.+)/i,
    confirm: /(అవును|సరే|బుక్|ఖచ్చితంగా)/i,
    yes: 'చెప్పండి: <చోటికి> వెళ్ళాలి. ఉదాహరణ, సెంట్రల్ స్టేషన్ వెళ్ళాలి.',
  },
  'ml-IN': {
    go: /(?:പോകണം|പോകണമെന്ന്|ബുക്ക്\s*ചെയ്യൂ|എയ്റോ)\s*(.+)/i,
    confirm: /(അതെ|ശരി|ബുക്ക്|ഉറപ്പാണ്)/i,
    yes: 'പറയൂ: <സ്ഥലത്തേക്ക്> പോകണം. ഉദാഹരണം, സെൻട്രൽ സ്റ്റേഷനിലേക്ക് പോകണം.',
  },
  'kn-IN': {
    go: /(?:ಹೋಗಬೇಕು|ಬುಕ್\s*ಮಾಡಿ|ಏರೊ)\s*(.+)/i,
    confirm: /(ಹೌದು|ಸರಿ|ಬುಕ್|ಖಚಿತವಾಗಿ)/i,
    yes: 'ಹೇಳಿ: <ಸ್ಥಳಕ್ಕೆ> ಹೋಗಬೇಕು. ಉದಾಹರಣೆ, ಸೆಂಟ್ರಲ್ ನಿಲ್ದಾಣಕ್ಕೆ ಹೋಗಬೇಕು.',
  },
}

/**
 * Real recognition (Web Speech API). Never auto-books: a spoken "confirm"
 * only fires onConfirm(), which itself requires a complete real route.
 */
export default function VoiceAssistant({ onDestination, onConfirm, confirmPrompt, canConfirm }) {
  const { lang, setLang } = useApp()
  const [listening, setListening] = useState(false)
  const [status, setStatus] = useState('')
  const recRef = useRef(null)
  const awaitingConfirmRef = useRef(false)

useEffect(() => () => recRef.current?.stop(), [])

const start = () => {
    if (!speechSupported()) {
      setStatus('Voice input is not supported in this browser. Chrome on Android or desktop works best.')
      return
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new Recognition()
    recRef.current = rec
    rec.lang = lang
    rec.interimResults = false
    rec.maxAlternatives = 1

rec.onstart = () => { setListening(true); setStatus('Listening…') }
    rec.onerror = (e) => {
      setListening(false)
      setStatus(
        e.error === 'not-allowed'
          ? 'Microphone permission was blocked. Allow it in browser settings and try again.'
          : 'I did not catch that. Please try again.'
      )
    }
    rec.onend = () => setListening(false)

rec.onresult = async (e) => {
      const said = e.results[0][0].transcript.trim()
      const intent = INTENTS[lang]
      // 1) Confirmation step — explicit, never assumed.
      if (awaitingConfirmRef.current && intent.confirm.test(said)) {
        awaitingConfirmRef.current = false
        setStatus('Confirmed. Booking your ride…')
        onConfirm()
        return
      }
      // 2) Destination step.
      const m = said.match(intent.go)
      if (!m || !m[1]) {
        speak(intent.yes, lang)
        setStatus(`I heard: “${said}”. ${INTENTS.en_IN_hint || ''}Please say where you want to go.`)
        return
      }
      const query = m[1].trim()
      setStatus(`Looking up “${query}”…`)
      try {
        const rows = await searchPlaces(query)
        if (!rows.length) {
          const msg = `I could not find ${query}. Please say the destination again.`
          speak(msg, lang)
          setStatus(msg)
          return
        }
        onDestination(rows[0])
        awaitingConfirmRef.current = true
        speak(confirmPrompt(rows[0]), lang)
        setStatus(`Destination: ${rows[0].label}. Say “confirm” when you are ready, or press the Book button.`)
      } catch {
        const msg = 'Place search is unavailable right now. Please type your destination.'
        speak(msg, lang)
        setStatus(msg)
      }
    }

rec.start()
  }

const supported = speechSupported()

return (
    <div className="voice-bar">
      <button
        type="button"
        className="mic-btn"
        aria-pressed={listening}
        aria-label={listening ? 'Stop listening' : 'Book by voice'}
        onClick={() => (listening ? recRef.current?.stop() : start())}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      </button>
      <select
        className="lang-select"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label="Assistant language"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
      <p className="voice-status" aria-live="polite">
        {status ||
          (supported
            ? 'Tap the mic and say where you want to go. You will always confirm before booking.'
            : 'Voice input needs Chrome (Android or desktop). You can still book by typing.')}
      </p>
    </div>
  )
}
