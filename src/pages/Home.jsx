import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useQuran } from '../hooks/useQuran'
import { useOffline } from '../hooks/useOffline'
import ProgressCard from '../components/ProgressCard'
import { BookOpen, Clock, Flame, WifiOff, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const { profile } = useAuth()
  const { surahs } = useQuran()
  const { isOnline } = useOffline()
  const navigate = useNavigate()
  const [lastListened, setLastListened] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('quran-last-listened')
    if (saved) {
      try { setLastListened(JSON.parse(saved)) } catch {}
    }
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 5) return 'Peace be upon you'
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    if (hour < 21) return 'Good evening'
    return 'Peace be upon you'
  }

  const lastSurah = lastListened
    ? surahs.find(s => s.surahNo === lastListened.surahNo)
    : null

  return (
    <div className="flex-1 pb-24 animate-fade-in overflow-x-hidden">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        {!isOnline && (
          <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 px-3 py-2 rounded-xl mb-3">
            <WifiOff size={14} />
            You are offline — cached content available
          </div>
        )}
        <p className="text-sm text-gray-500">{getGreeting()}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
          {profile?.username || 'Welcome'} 🌙
        </h1>
      </div>

      {/* Progress Card */}
      <div className="px-4 mb-5">
        <ProgressCard
          currentSurah={lastListened?.surahNo}
          currentAyah={lastListened?.ayah || 1}
          totalAyah={lastSurah?.totalAyah || 0}
          surahName={lastSurah?.surahName}
        />
      </div>

      {/* Stats Cards — force 3 equal columns */}
      <div className="px-4 mb-5">
        <div className="flex gap-2 w-full">
          <div className="flex-1 min-w-0 bg-white rounded-2xl py-3 px-2 shadow-sm border border-emerald-50 text-center">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mx-auto mb-1.5">
              <Clock size={16} className="text-emerald-600" />
            </div>
            <p className="text-base font-bold text-gray-900">{profile?.total_minutes || 0}</p>
            <p className="text-[10px] text-gray-500">Minutes</p>
          </div>
          <div className="flex-1 min-w-0 bg-white rounded-2xl py-3 px-2 shadow-sm border border-emerald-50 text-center">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mx-auto mb-1.5">
              <BookOpen size={16} className="text-emerald-600" />
            </div>
            <p className="text-base font-bold text-gray-900">{profile?.completed_surahs || 0}</p>
            <p className="text-[10px] text-gray-500">Completed</p>
          </div>
          <div className="flex-1 min-w-0 bg-white rounded-2xl py-3 px-2 shadow-sm border border-emerald-50 text-center">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mx-auto mb-1.5">
              <Flame size={16} className="text-emerald-600" />
            </div>
            <p className="text-base font-bold text-gray-900">{profile?.streak || 0}</p>
            <p className="text-[10px] text-gray-500">Streak</p>
          </div>
        </div>
      </div>

      {/* Recently Listened */}
      {lastListened && lastSurah && (
        <div className="px-4 mb-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-2.5">Recently Listened</h2>
          <button
            onClick={() => navigate(`/player/${lastSurah.surahNo}`)}
            className="w-full flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-emerald-50 hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-arabic text-sm flex-shrink-0">
              {lastSurah.surahNameArabic?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm truncate">{lastSurah.surahName}</h3>
              <p className="text-xs text-gray-500 truncate">{lastSurah.surahNameTranslation} · Ayah {lastListened.ayah}</p>
            </div>
            <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
          </button>
        </div>
      )}

      {/* Quick Access */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-gray-900">Quick Access</h2>
          <button onClick={() => navigate('/quran')} className="text-xs text-emerald-600 font-medium">
            View All
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {surahs.slice(0, 8).map(surah => (
            <button
              key={surah.surahNo}
              onClick={() => navigate(`/player/${surah.surahNo}`)}
              className="flex-shrink-0 w-[88px] bg-white rounded-xl p-2.5 shadow-sm border border-emerald-50 hover:shadow-md transition-all text-center"
            >
              <p className="font-arabic text-sm text-emerald-700 mb-0.5 truncate">{surah.surahNameArabic}</p>
              <p className="text-[10px] font-medium text-gray-900 truncate">{surah.surahName}</p>
              <p className="text-[9px] text-gray-400">{surah.totalAyah} Ayahs</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
