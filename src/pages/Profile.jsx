import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { User, Clock, BookOpen, Flame, LogOut, Shield, Settings } from 'lucide-react'

export default function Profile() {
  const { user, profile, signOut, loading } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/auth')
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin text-primary">
          <Settings size={28} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 pb-24 animate-fade-in">
      {/* Profile Header */}
      <div className="px-5 pt-6 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white shadow-glow">
            <User size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{profile?.username || 'User'}</h1>
            <p className="text-sm text-muted">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mb-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Your Journey (Private)
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 bg-surface-card rounded-2xl shadow-card">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Clock size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Total Listening</p>
              <p className="text-xs text-muted">Time spent with the Quran</p>
            </div>
            <p className="text-lg font-bold text-primary">{profile?.total_minutes || 0}<span className="text-xs text-muted ml-1">min</span></p>
          </div>

          <div className="flex items-center gap-4 p-4 bg-surface-card rounded-2xl shadow-card">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <BookOpen size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Completed Surahs</p>
              <p className="text-xs text-muted">Surahs fully listened</p>
            </div>
            <p className="text-lg font-bold text-primary">{profile?.completed_surahs || 0}<span className="text-xs text-muted ml-1">/ 114</span></p>
          </div>

          <div className="flex items-center gap-4 p-4 bg-surface-card rounded-2xl shadow-card">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Flame size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Daily Streak</p>
              <p className="text-xs text-muted">Consecutive days listening</p>
            </div>
            <p className="text-lg font-bold text-primary">{profile?.streak || 0}<span className="text-xs text-muted ml-1">days</span></p>
          </div>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="px-5 mb-6">
        <div className="flex items-start gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
          <Shield size={18} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Your stats are private</p>
            <p className="text-xs text-muted mt-0.5">
              Only you can see your listening stats. We don't share, rank, or compare your journey with anyone.
            </p>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="px-5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-3 text-danger bg-red-50 rounded-2xl hover:bg-red-100 transition-colors text-sm font-medium"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
