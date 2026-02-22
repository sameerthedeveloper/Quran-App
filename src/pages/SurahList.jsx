import { useState, useMemo, useEffect } from 'react'
import { useQuran } from '../hooks/useQuran'
import { useOffline } from '../hooks/useOffline'
import { useAudio } from '../hooks/useAudio'
import SurahCard from '../components/SurahCard'
import { Search, Loader, BookOpen, AlertCircle, Download, Check, X } from 'lucide-react'

export default function SurahList() {
  const { surahs, loading, error, refetch } = useQuran()
  const { reciterId } = useAudio()
  const { downloadingAll, downloadAllSurahs } = useOffline()
  const [search, setSearch] = useState('')
  const [allDownloaded, setAllDownloaded] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return surahs
    const q = search.toLowerCase()
    return surahs.filter(s =>
      s.surahName.toLowerCase().includes(q) ||
      s.surahNameTranslation.toLowerCase().includes(q) ||
      s.surahNameArabic.includes(search) ||
      String(s.surahNo).includes(q)
    )
  }, [surahs, search])

  // Optional: quickly check if we need to show "All Downloaded" (can be heavy, checking all 114, so we evaluate simple flags or just rely on the button action)
  
  return (
    <div className="flex-1 pb-24 animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <BookOpen size={22} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">Holy Quran</h1>
          </div>
          
          {/* Download All Button */}
          {!loading && !error && surahs.length > 0 && (
            <button
              onClick={() => {
                if (!downloadingAll) downloadAllSurahs(surahs, reciterId)
              }}
              disabled={!!downloadingAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                downloadingAll
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-surface-card border border-border text-foreground hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
              }`}
            >
              {downloadingAll ? (
                <>
                  <Loader size={14} className="animate-spin" />
                  <span>{Math.round((downloadingAll.current / downloadingAll.total) * 100)}%</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download All</span>
                </>
              )}
            </button>
          )}
        </div>
        <p className="text-sm text-muted">114 Surahs · Choose a Surah to listen</p>
      </div>

      {/* Search */}
      <div className="px-5 py-3 sticky top-0 z-10 bg-background/80 backdrop-blur-lg">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by name, number, or translation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-surface-card rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-card"
          />
        </div>
      </div>

      {/* List */}
      <div className="px-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="animate-spin text-primary mb-3" size={28} />
            <p className="text-sm text-muted">Loading Quran...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="text-danger mb-3" size={28} />
            <p className="text-sm text-foreground font-medium">Failed to load surahs</p>
            <p className="text-xs text-muted mt-1">{error}</p>
            <button
              onClick={refetch}
              className="mt-4 px-4 py-2 bg-primary text-white text-sm rounded-xl hover:bg-primary-dark transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="text-muted mb-3" size={28} />
            <p className="text-sm text-foreground font-medium">No surahs found</p>
            <p className="text-xs text-muted mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((surah, index) => (
              <SurahCard key={surah.surahNo} surah={surah} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
