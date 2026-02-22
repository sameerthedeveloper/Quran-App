import { useAudio } from '../hooks/useAudio'
import { useLocation, useNavigate } from 'react-router-dom'
import { Play, Pause, SkipForward } from 'lucide-react'

export default function MiniPlayer() {
  const {
    surahData, currentAyah, totalAyah, isPlaying, togglePlay, nextAyah,
    currentTime, duration,
  } = useAudio()
  const location = useLocation()
  const navigate = useNavigate()

  if (!surahData || location.pathname.startsWith('/player') || location.pathname === '/auth') {
    return null
  }

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  return (
    <div className="fixed left-0 right-0 z-40" style={{ bottom: '60px' }}>
      <div className="max-w-lg mx-auto px-3">
        <div className="bg-emerald-800 rounded-2xl shadow-lg overflow-hidden">
          {/* Full surah progress */}
          <div className="h-[3px] bg-emerald-900/50">
            <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5">
            {/* Tap to open full player */}
            <button onClick={() => navigate(`/player/${surahData.surahNo}`)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <div className="w-9 h-9 rounded-xl bg-emerald-700/80 flex items-center justify-center text-white flex-shrink-0">
                <span className="font-arabic text-sm">{surahData.surahNameArabic?.[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{surahData.surahName}</p>
                <p className="text-[10px] text-emerald-300">
                  Ayah {currentAyah}/{totalAyah} · {fmt(currentTime)} / {fmt(duration)}
                </p>
              </div>
            </button>

            {/* Controls */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button onClick={togglePlay}
                className="w-9 h-9 flex items-center justify-center text-white rounded-full hover:bg-emerald-700 transition-colors">
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </button>
              <button onClick={nextAyah}
                className="w-8 h-8 flex items-center justify-center text-emerald-300 rounded-full hover:bg-emerald-700 transition-colors">
                <SkipForward size={15} fill="currentColor" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
