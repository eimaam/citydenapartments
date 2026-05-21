import { Route, Routes } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { LandingPage } from './pages/LandingPage'
import { CityPage } from './pages/CityPage'
import { BookingPage } from './pages/BookingPage'

const App = () => {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/cities/:cityId" element={<CityPage />} />
        <Route path="/book" element={<BookingPage />} />
      </Routes>
    </MainLayout>
  )
}

export default App

