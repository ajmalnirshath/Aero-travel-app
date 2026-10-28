// Real browser speech recognition + synthesis (Web Speech API).
// Chrome/Edge on desktop and Android support recognition;
// Firefox currently does not — the UI detects and disables the mic honestly.

export const recognitionSupported = () =>
  typeof window !== 'undefined' &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition)

export const synthesisSupported = () =>
  typeof window !== 'undefined' && !!window.speechSynthesis

/**
 * Create a one-shot recognizer.
 * Returns { start, stop, abort } or null if unsupported.
 */
export function createRecognizer({ lang, onFinal, onInterim, onEnd, onError }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null

const rec = new SR()
  rec.lang = lang
  rec.interimResults = true   // live partial text while the user is still speaking
  rec.continuous = false      // stop automatically at end of sentence
  rec.maxAlternatives = 1

rec.onresult = (e) => {
    let final = ''
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript
      if (e.results[i].isFinal) final += t
      else interim += t
    }
    if (interim) onInterim?.(interim.trim())
    if (final.trim()) onFinal(final.trim())
  }
  rec.onerror = (e) => {
    if (e.error !== 'aborted') onError?.(e.error)
    onEnd?.()
  }
  rec.onend = onEnd

return {
    start: () => { try { rec.start() } catch { /* already started */ } },
    stop: () => rec.stop(),
    abort: () => rec.abort(),
  }
}

/** Speak a short prompt in the user's chosen language. */
export function speak(text, langCode) {
  if (!synthesisSupported()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = langCode
  u.rate = 0.95
  u.pitch = 1
  window.speechSynthesis.speak(u)
}
