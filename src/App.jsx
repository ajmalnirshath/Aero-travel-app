import { Routes, Route, Navigate } from 'react-router-dom'
import BookingPage from './pages/BookingPage.jsx'
import TripPage from './pages/TripPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import PlacesPage from './pages/PlacesPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BookingPage />} />
      <Route path="/trip/:id" element={<TripPage />} />
      <Route path="/trips" element={<HistoryPage />} />
      <Route path="/places" element={<PlacesPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
