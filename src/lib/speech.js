// Real speech synthesis via the browser. Voice availability depends on the
// device/browser — we always fall back to text on screen.
export function speak(text, lang = 'en-IN') {
  if (!('speechSynthesis' in window)) return false
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = 0.92 // slightly slower for elderly listeners
    const voices = window.speechSynthesis.getVoices()
    const match =
      voices.find((v) => v.lang === lang) ||
      voices.find((v) => v.lang?.startsWith(lang.slice(0, 2)))
    if (match) u.voice = match
    window.speechSynthesis.speak(u)
    return true
  } catch {
    return false
  }
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

export const speechSupported = () =>
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
