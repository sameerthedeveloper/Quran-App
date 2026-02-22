import { useState, useMemo } from 'react'
import { useQuran } from '../hooks/useQuran'
import SurahCard from '../components/SurahCard'
import { Search, Loader, BookOpen, AlertCircle } from 'lucide-react'

export default function SurahList() {
  const { surahs, loading, error, refetch } = useQuran()
  const [search, setSearch] = useState('')

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

  return (
    <div className="flex-1 pb-24 animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={22} className="text-primary" />
          <h1 className="text-xl font-bold text-foreground">Holy Quran</h1>
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
