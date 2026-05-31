import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'

import Landing          from './pages/Landing.jsx'
import Login            from './pages/Login.jsx'
import Register         from './pages/Register.jsx'
import Dashboard        from './pages/Dashboard.jsx'
import WelcomeModal     from './components/WelcomeModal.jsx'
import Greenhouses      from './pages/Greenhouses.jsx'
import GreenhouseDetail from './pages/GreenhouseDetail.jsx'
import PlantingPlanNew  from './pages/PlantingPlanNew.jsx'
import PlantingPlanDetail from './pages/PlantingPlanDetail.jsx'
import MarketPrices     from './pages/MarketPrices.jsx'
import AlertsPage       from './pages/AlertsPage.jsx'
import FarmerPlants     from './pages/FarmerPlants.jsx'
import AdminPanel      from './pages/AdminPanel.jsx'
import ForgotPassword  from './pages/ForgotPassword.jsx'

function ProtectedRoute({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children, allowAuthed = false }) {
  const { token } = useAuth()
  if (token && !allowAuthed) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Landing — accessible to everyone, logged-in users still see it */}
      <Route path="/" element={<PublicRoute allowAuthed><Landing /></PublicRoute>} />

      {/* Public auth pages */}
      <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/greenhouses" element={<ProtectedRoute><Greenhouses /></ProtectedRoute>} />
      <Route path="/greenhouses/:id" element={<ProtectedRoute><GreenhouseDetail /></ProtectedRoute>} />
      <Route path="/planting-plans/new" element={<ProtectedRoute><PlantingPlanNew /></ProtectedRoute>} />
      <Route path="/planting-plans/:id" element={<ProtectedRoute><PlantingPlanDetail /></ProtectedRoute>} />
      <Route path="/farmer-plants" element={<ProtectedRoute><FarmerPlants /></ProtectedRoute>} />
      <Route path="/market-prices" element={<ProtectedRoute><MarketPrices /></ProtectedRoute>} />
      <Route path="/alerts/:greenhouse_id" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
      <Route path="/admin"       element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
      <Route path="/admin_panel" element={<AdminPanel />} />

      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function AppWithModal() {
  const { token } = useAuth()
  return (
    <>
      <AppRoutes />
      {token && <WelcomeModal />}
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppWithModal />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
