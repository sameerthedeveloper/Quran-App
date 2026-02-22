import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Play, Pause, SkipBack, SkipForward, 
  Download, Check, Loader, Volume2, Repeat, ChevronDown
} from 'lucide-react'
import { RECITERS } from '../hooks/useQuran'
import { useAudio } from '../hooks/useAudio'

export default function AudioPlayer({
  isDownloaded,
  onDownload,
  downloading,
}) {
  const {
    surahData, currentAyah, reciterId, isPlaying, duration, currentTime,
    isLooping, loadingAudio, totalAyah,
    togglePlay, nextAyah, prevAyah, seekTo,
    setReciterId, setIsLooping,
  } = useAudio()

  const [showReciters, setShowReciters] = useState(false)

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleSeek = (e) => {
    seekTo(parseFloat(e.target.value))
  }

  if (!surahData) return null

  return (
    <div className="flex flex-col items-center w-full animate-slide-up overflow-hidden">
      {/* Surah Artwork */}
      <div className="relative w-44 h-44 mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-300 to-emerald-600 rounded-[2rem] rotate-3 opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-800 rounded-[2rem] flex flex-col items-center justify-center text-white shadow-lg">
          <p className="font-arabic text-3xl mb-1">{surahData.surahNameArabic}</p>
          <p className="text-[11px] text-emerald-100 mt-1">{surahData.surahNameTranslation}</p>
        </div>
      </div>

      {/* Surah Info */}
      <h2 className="text-xl font-bold text-gray-900">{surahData.surahName}</h2>
      <p className="text-sm text-gray-500 mt-1">
        Ayah {currentAyah} of {totalAyah} · {surahData.revelationPlace}
      </p>

      {/* Reciter selector */}
      <div className="relative mt-3 z-20">
        <button
          onClick={() => setShowReciters(!showReciters)}
          className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors"
        >
          <Volume2 size={12} />
          <span className="truncate max-w-[180px]">
            {RECITERS.find(r => r.id === reciterId)?.name || 'Select Reciter'}
          </span>
          <ChevronDown size={12} className={`transition-transform flex-shrink-0 ${showReciters ? 'rotate-180' : ''}`} />
        </button>
        {showReciters && (
          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-emerald-100 py-1 z-30 min-w-[220px]">
            {RECITERS.map(r => (
              <button
                key={r.id}
                onClick={() => { setReciterId(r.id); setShowReciters(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 transition-colors ${
                  r.id === reciterId ? 'text-emerald-700 font-medium bg-emerald-50' : 'text-gray-700'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Progress slider */}
      <div className="w-full mt-6 px-1">
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          step={0.1}
          className="w-full"
          aria-label="Ayah audio progress"
        />
        <div className="flex items-center justify-between text-xs text-gray-400 mt-1 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-4 w-full">
        <button
          onClick={() => setIsLooping(!isLooping)}
          className={`p-2 rounded-full transition-colors ${
            isLooping ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:text-gray-600'
          }`}
          aria-label="Toggle repeat"
        >
          <Repeat size={18} />
        </button>

        <button
          onClick={prevAyah}
          disabled={currentAyah <= 1}
          className="p-2 text-gray-700 disabled:text-gray-300 hover:text-emerald-600 transition-colors"
          aria-label="Previous ayah"
        >
          <SkipBack size={22} fill="currentColor" />
        </button>

        <button
          onClick={togglePlay}
          disabled={loadingAudio}
          className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-60"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {loadingAudio ? (
            <Loader size={22} className="animate-spin" />
          ) : isPlaying ? (
            <Pause size={24} fill="currentColor" />
          ) : (
            <Play size={24} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        <button
          onClick={nextAyah}
          disabled={currentAyah >= totalAyah && !isLooping}
          className="p-2 text-gray-700 disabled:text-gray-300 hover:text-emerald-600 transition-colors"
          aria-label="Next ayah"
        >
          <SkipForward size={22} fill="currentColor" />
        </button>

        <button
          onClick={onDownload}
          disabled={!!downloading}
          className={`p-2 rounded-full transition-colors ${
            isDownloaded ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:text-gray-600'
          }`}
          aria-label={isDownloaded ? 'Downloaded' : 'Download for offline'}
        >
          {downloading ? (
            <Loader size={18} className="animate-spin" />
          ) : isDownloaded ? (
            <Check size={18} />
          ) : (
            <Download size={18} />
          )}
        </button>
      </div>

      {/* Download progress */}
      {downloading && (
        <div className="w-full mt-3 px-2">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Downloading for offline...</span>
            <span>{downloading.progress}/{downloading.total}</span>
          </div>
          <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(downloading.progress / downloading.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Ayah text display */}
      {surahData.arabic1 && surahData.arabic1[currentAyah - 1] && (
        <div className="w-full mt-6 p-4 bg-white rounded-2xl shadow-sm border border-emerald-50">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">
              {currentAyah}
            </span>
            <span className="text-[11px] text-gray-400 font-medium">Ayah {currentAyah}</span>
          </div>
          <p className="font-arabic text-xl text-center leading-loose text-gray-900" dir="rtl">
            {surahData.arabic1[currentAyah - 1]}
          </p>
          {surahData.english && surahData.english[currentAyah - 1] && (
            <p className="text-sm text-gray-500 text-center mt-3 leading-relaxed">
              {surahData.english[currentAyah - 1]}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
