import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { AudioProvider } from './hooks/useAudio'
import BottomNav from './components/BottomNav'
import MiniPlayer from './components/MiniPlayer'
import SplashScreen from './components/SplashScreen'
import Auth from './pages/Auth'
import Home from './pages/Home'
import SurahList from './pages/SurahList'
import Player from './pages/Player'
import Feed from './pages/Feed'
import Profile from './pages/Profile'
import { Loader } from 'lucide-react'

function ProtectedRoute({ children }) {
  const { user, loading, isConfigured } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="animate-spin text-emerald-600" size={32} />
      </div>
    )
  }

  if (!isConfigured) return children
  if (!user) return <Navigate to="/auth" replace />
  return children
}

function AppLayout() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto relative w-full overflow-x-hidden">
      {showSplash && <SplashScreen />}
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quran"
          element={
            <ProtectedRoute>
              <SurahList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/player/:surahNo?"
          element={
            <ProtectedRoute>
              <Player />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <Feed />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <MiniPlayer />
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AudioProvider>
          <AppLayout />
        </AudioProvider>
      </AuthProvider>
    </Router>
  )
}
