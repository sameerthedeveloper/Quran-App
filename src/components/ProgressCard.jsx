import { Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ProgressCard({ currentSurah, currentAyah, totalAyah, surahName }) {
  const navigate = useNavigate()
  const progress = totalAyah > 0 ? Math.round((currentAyah / totalAyah) * 100) : 0

  if (!surahName) {
    return (
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-6 text-white shadow-elevated animate-fade-in">
        <p className="text-emerald-100 text-sm">Start your Quran journey</p>
        <h3 className="text-xl font-semibold mt-1">Choose a Surah to begin</h3>
        <button
          onClick={() => navigate('/quran')}
          className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors backdrop-blur-sm"
        >
          <Play size={16} fill="currentColor" />
          Browse Quran
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-6 text-white shadow-elevated animate-fade-in">
      <p className="text-emerald-100 text-sm">Currently listening</p>
      <h3 className="text-xl font-semibold mt-1">{surahName}</h3>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-emerald-100 mb-1.5">
          <span>Ayah {currentAyah} of {totalAyah}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-300 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Continue button */}
      <button
        onClick={() => navigate(`/player/${currentSurah}`)}
        className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors backdrop-blur-sm"
      >
        <Play size={16} fill="currentColor" />
        Continue Listening
      </button>
    </div>
  )
}
