import { createContext, useContext, useEffect, useState } from 'react'

const Ctx = createContext(null)

export function AppProvider({ children }) {
  const [scale, setScale] = useState(() => localStorage.getItem('aero:scale') || 'md')
  const [contrast, setContrast] = useState(() => localStorage.getItem('aero:contrast') === 'high')
  const [lang, setLang] = useState(() => localStorage.getItem('aero:lang') || 'en-IN')
  const [pendingDest, setPendingDest] = useState(null) // {label, lat, lng} set from Saved Places

useEffect(() => {
    document.documentElement.dataset.scale = scale
    localStorage.setItem('aero:scale', scale)
  }, [scale])
  useEffect(() => {
    document.documentElement.dataset.contrast = contrast ? 'high' : 'normal'
    localStorage.setItem('aero:contrast', contrast ? 'high' : 'normal')
  }, [contrast])
  useEffect(() => {
    localStorage.setItem('aero:lang', lang)
  }, [lang])

const bumpScale = (delta) =>
    setScale((s) => {
      const order = ['md', 'lg', 'xl']
      const i = order.indexOf(s)
      return order[Math.min(order.length - 1, Math.max(0, i + delta))]
    })

return (
    <Ctx.Provider value={{ scale, bumpScale, contrast, setContrast, lang, setLang, pendingDest, setPendingDest }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
