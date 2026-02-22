import { useNavigate } from 'react-router-dom'
import { Play, MapPin } from 'lucide-react'

export default function SurahCard({ surah, index }) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/player/${surah.surahNo}`)}
      className="w-full flex items-center gap-4 p-4 bg-surface-card rounded-2xl shadow-card hover:shadow-elevated transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] text-left group animate-fade-in"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      {/* Surah Number */}
      <div className="relative flex-shrink-0 w-11 h-11 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl rotate-45 opacity-10 group-hover:opacity-20 transition-opacity" />
        <span className="relative text-sm font-semibold text-primary">
          {surah.surahNo}
        </span>
      </div>

      {/* Surah Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground truncate">
            {surah.surahName}
          </h3>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted">{surah.surahNameTranslation}</span>
          <span className="text-muted">·</span>
          <span className="text-xs text-muted flex items-center gap-0.5">
            <MapPin size={10} />
            {surah.revelationPlace}
          </span>
          <span className="text-muted">·</span>
          <span className="text-xs text-muted">{surah.totalAyah} Ayahs</span>
        </div>
      </div>

      {/* Arabic Name */}
      <div className="flex-shrink-0 text-right">
        <p className="font-arabic text-lg text-primary-dark leading-tight">
          {surah.surahNameArabic}
        </p>
      </div>

      {/* Play hint */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Play size={16} className="text-primary" fill="currentColor" />
      </div>
    </button>
  )
}
