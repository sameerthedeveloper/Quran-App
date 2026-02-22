import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuran } from '../hooks/useQuran'
import { useOffline } from '../hooks/useOffline'
import { useAuth } from '../hooks/useAuth'
import { useAudio } from '../hooks/useAudio'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { RECITERS } from '../hooks/useQuran'
import {
  ArrowLeft, Loader, Play, Pause, SkipBack, SkipForward,
  Download, Check, Repeat, Settings, ChevronDown, ChevronUp,
  BookOpen, Languages, Volume2
} from 'lucide-react'

// ── Persistent preference helpers ──
const PREFS_KEY = 'quran-player-prefs'
const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') } catch { return {} }
}
const savePrefs = (updates) => {
  const current = getPrefs()
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...updates }))
}

export default function Player() {
  const { surahNo } = useParams()
  const navigate = useNavigate()
  const { fetchChapter } = useQuran()
  const { downloading, checkDownloaded, downloadSurah } = useOffline()
  const { user, updateProfile, profile } = useAuth()
  const {
    loadSurah, surahData, currentAyah, reciterId, secondsListened,
    isPlaying, togglePlay, nextAyah, prevAyah, totalAyah,
    setReciterId, isLooping, setIsLooping, goToAyah,
    currentTime, duration, seekTo, loadingAudio, ayahProgress,
    ayahTime, ayahDuration,
  } = useAudio()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // ── Restored from localStorage ──
  const prefs = getPrefs()
  const [showTranslation, setShowTranslation] = useState(prefs.showTranslation !== false)
  const [collapsed, setCollapsed] = useState(prefs.collapsed === true)
  const [fontSize, setFontSize] = useState(prefs.fontSize || 'normal') // 'small', 'normal', 'large'

  const activeAyahRef = useRef(null)
  const scrollRef = useRef(null)
  const surahNum = parseInt(surahNo) || 1

  // ── Save prefs whenever they change ──
  useEffect(() => { savePrefs({ showTranslation }) }, [showTranslation])
  useEffect(() => { savePrefs({ collapsed }) }, [collapsed])
  useEffect(() => { savePrefs({ fontSize }) }, [fontSize])
  useEffect(() => { if (reciterId) savePrefs({ lastReciterId: reciterId }) }, [reciterId])
  useEffect(() => { if (isLooping !== undefined) savePrefs({ isLooping }) }, [isLooping])

  // ── Load surah + restore position ──
  useEffect(() => {
    const load = async () => {
      if (surahData?.surahNo === surahNum) return
      try {
        setLoading(true); setError(null)
        const data = await fetchChapter(surahNum)
        const saved = localStorage.getItem(`quran-position-${surahNum}`)
        const prefs = getPrefs()
        let startAyah = 1, startReciter = prefs.lastReciterId || 1
        if (saved) {
          const p = JSON.parse(saved)
          startAyah = p.ayah || 1
          startReciter = p.reciterId || startReciter
        }
        // Restore loop state
        if (prefs.isLooping !== undefined) setIsLooping(prefs.isLooping)
        loadSurah(data, startAyah, startReciter)
      } catch (err) { setError(err.message) }
      finally { setLoading(false) }
    }
    load()
  }, [surahNum])

  // ── Save detailed last-listened for Home resume ──
  useEffect(() => {
    if (surahData && currentAyah) {
      const data = {
        surahNo: surahData.surahNo,
        ayah: currentAyah,
        surahName: surahData.surahName,
        surahNameArabic: surahData.surahNameArabic,
        surahNameTranslation: surahData.surahNameTranslation,
        totalAyah,
        reciterId,
        timestamp: Date.now(),
      }
      localStorage.setItem('quran-last-listened', JSON.stringify(data))
    }
  }, [surahData, currentAyah, totalAyah, reciterId])

  useEffect(() => { checkDownloaded(surahNum, reciterId).then(setIsDownloaded) }, [surahNum, reciterId])

  // Auto-scroll to active ayah
  useEffect(() => {
    if (activeAyahRef.current) {
      activeAyahRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentAyah])

  // Listening log
  useEffect(() => {
    if (secondsListened > 0 && secondsListened % 30 === 0 && isSupabaseConfigured() && user) {
      supabase.from('listening_logs').insert({
        user_id: user.id, surah: surahData?.surahName || `Surah ${surahNum}`,
        ayah: currentAyah, seconds_listened: 30,
      }).then(() => {
        if (profile) updateProfile({ total_minutes: Math.floor((profile.total_minutes * 60 + 30) / 60) })
      })
    }
  }, [secondsListened])

  const handleDownload = async () => {
    if (!surahData || isDownloaded) return
    await downloadSurah(surahNum, surahData.totalAyah, reciterId)
    setIsDownloaded(true)
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  const surahPercent = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0

  const arabicSize = fontSize === 'small' ? 'text-base' : fontSize === 'large' ? 'text-2xl' : 'text-lg'
  const engSize = fontSize === 'small' ? 'text-[11px]' : fontSize === 'large' ? 'text-[15px]' : 'text-[13px]'

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center">
        <Loader className="animate-spin text-emerald-600 mb-3" size={28} />
        <p className="text-sm text-gray-500">Loading surah...</p>
      </div>
    </div>
  )

  if (error || !surahData) return (
    <div className="flex-1 flex items-center justify-center px-6 min-h-screen">
      <div className="text-center">
        <p className="text-gray-900 font-medium">Failed to load surah</p>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
        <button onClick={() => navigate('/quran')} className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl">Back to Quran</button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-gradient-to-b from-emerald-50 to-white">

      {/* ── Top Bar ── */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2 flex items-center justify-between bg-white/80 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}>
            <Settings size={17} />
          </button>
        </div>
      </div>

      {/* ── Settings Panel ── */}
      {showSettings && (
        <div className="flex-shrink-0 mx-4 mb-2 p-3 bg-white rounded-xl border border-emerald-100 shadow-sm space-y-3 animate-fade-in">
          {/* Reciter */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5">
              <Volume2 size={10} className="inline mr-1" /> Reciter
            </p>
            <div className="flex flex-wrap gap-1.5">
              {RECITERS.map(r => (
                <button key={r.id} onClick={() => setReciterId(r.id)}
                  className={`px-2.5 py-1 text-[11px] rounded-full transition-colors ${r.id === reciterId ? 'bg-emerald-600 text-white font-medium' : 'bg-gray-100 text-gray-600 hover:bg-emerald-50'}`}>
                  {r.name.split(' ').slice(-2).join(' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5">
              <BookOpen size={10} className="inline mr-1" /> Font Size
            </p>
            <div className="flex gap-1.5">
              {[{ id: 'small', label: 'Small' }, { id: 'normal', label: 'Normal' }, { id: 'large', label: 'Large' }].map(s => (
                <button key={s.id} onClick={() => setFontSize(s.id)}
                  className={`px-3 py-1 text-[11px] rounded-full transition-colors ${fontSize === s.id ? 'bg-emerald-600 text-white font-medium' : 'bg-gray-100 text-gray-600 hover:bg-emerald-50'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowTranslation(!showTranslation)}
              className={`px-3 py-1.5 text-[11px] rounded-full flex items-center gap-1 transition-colors ${showTranslation ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <Languages size={10} /> Translation {showTranslation ? 'On' : 'Off'}
            </button>
            <button onClick={() => setIsLooping(!isLooping)}
              className={`px-3 py-1.5 text-[11px] rounded-full flex items-center gap-1 transition-colors ${isLooping ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <Repeat size={10} /> Repeat {isLooping ? 'On' : 'Off'}
            </button>
            <button onClick={handleDownload} disabled={!!downloading || isDownloaded}
              className={`px-3 py-1.5 text-[11px] rounded-full flex items-center gap-1 transition-colors ${isDownloaded ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {downloading ? <Loader size={10} className="animate-spin" /> : isDownloaded ? <Check size={10} /> : <Download size={10} />}
              {isDownloaded ? 'Saved' : 'Offline'}
            </button>
          </div>
        </div>
      )}

      {/* ── Hero Card ── */}
      {!collapsed && (
        <div className="flex-shrink-0 px-4 pb-3 animate-fade-in">
          <div className="relative bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-3xl p-5 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
            <div className="relative flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <p className="font-arabic text-xl">{surahData.surahNameArabic}</p>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold">{surahData.surahName}</h1>
                <p className="text-emerald-200 text-xs mt-0.5">{surahData.surahNameTranslation}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full">{surahData.revelationPlace}</span>
                  <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full">{totalAyah} Ayahs</span>
                </div>
              </div>
            </div>
            <div className="relative mt-3">
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                <div className={`flex gap-0.5 ${isPlaying ? 'animate-pulse' : ''}`}>
                  <div className="w-0.5 h-3 bg-emerald-300 rounded-full" />
                  <div className="w-0.5 h-4 bg-emerald-200 rounded-full" />
                  <div className="w-0.5 h-2 bg-emerald-300 rounded-full" />
                  <div className="w-0.5 h-5 bg-emerald-200 rounded-full" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-emerald-100">{isPlaying ? 'Now playing' : 'Ready'} · Ayah {currentAyah}/{totalAyah}</p>
                  <p className="text-[10px] text-emerald-300 mt-0.5">{fmt(currentTime)} / {fmt(duration)}</p>
                </div>
                <button onClick={() => setCollapsed(true)} className="text-emerald-200 hover:text-white p-0.5"><ChevronUp size={14} /></button>
              </div>
              <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all duration-300" style={{ width: `${surahPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex-shrink-0 px-4 pb-2">
          <button onClick={() => setCollapsed(false)} className="w-full flex items-center gap-3 bg-emerald-700 rounded-2xl px-4 py-2.5 text-white">
            <p className="font-arabic text-sm">{surahData.surahNameArabic}</p>
            <p className="text-xs flex-1 text-emerald-200">Ayah {currentAyah} · {fmt(currentTime)}/{fmt(duration)}</p>
            <ChevronDown size={14} className="text-emerald-300" />
          </button>
        </div>
      )}

      {surahNum !== 1 && surahNum !== 9 && (
        <div className="flex-shrink-0 py-3 text-center">
          <p className="font-arabic text-lg text-emerald-800">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
        </div>
      )}

      {/* ── Ayah Reading Area ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden" style={{ paddingBottom: '160px' }}>
        <div className="px-3 py-1">
          {surahData.arabic1?.map((text, i) => {
            const num = i + 1
            const active = num === currentAyah

            return (
              <button
                key={num}
                ref={active ? activeAyahRef : null}
                onClick={() => goToAyah(num)}
                className={`w-full text-left px-3 py-3 rounded-xl mb-1.5 transition-all duration-200 border ${
                  active ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white/50 border-transparent hover:bg-white hover:border-gray-100'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-1 ${
                    active ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{num}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-arabic ${arabicSize} leading-[2] text-right ${active ? 'text-emerald-900' : 'text-gray-800'}`} dir="rtl">
                      {text}<span className="text-emerald-400 text-sm mx-1">﴿{num}﴾</span>
                    </p>
                    {showTranslation && surahData.english?.[i] && (
                      <p className={`${engSize} leading-relaxed mt-1.5 ${active ? 'text-emerald-700' : 'text-gray-500'}`}>{surahData.english[i]}</p>
                    )}
                  </div>
                </div>
                {active && (
                  <div className="mt-2 ml-9">
                    <div className="h-0.5 bg-emerald-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-200" style={{ width: `${ayahProgress}%` }} />
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Bottom Player Controls ── */}
      <div className="flex-shrink-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-2px_16px_rgba(0,0,0,0.05)]">
        {downloading && (
          <div className="px-4 pt-2">
            <div className="flex justify-between text-[10px] text-gray-500 mb-1"><span>Downloading...</span><span>{downloading.progress}/{downloading.total}</span></div>
            <div className="w-full h-1 bg-emerald-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(downloading.progress / downloading.total) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Surah progress slider */}
        <div className="px-4 pt-2.5">
          <input type="range" min={0} max={duration || 1} value={currentTime}
            onChange={(e) => seekTo(parseFloat(e.target.value))} step={0.5}
            className="w-full h-1 appearance-none bg-gray-200 rounded-full outline-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:bg-emerald-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md" />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 px-0.5">
            <span>{fmt(currentTime)}</span>
            <span className="text-emerald-500 font-medium">Ayah {currentAyah}/{totalAyah}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center gap-4 px-5 pb-3 pt-1">
          <button onClick={() => setIsLooping(!isLooping)}
            className={`p-2 rounded-full transition-colors ${isLooping ? 'text-emerald-600 bg-emerald-50' : 'text-gray-300 hover:text-gray-500'}`}>
            <Repeat size={16} />
          </button>

          <button onClick={prevAyah} disabled={currentAyah <= 1}
            className="p-2 text-gray-600 disabled:text-gray-300 hover:text-emerald-600 transition-colors">
            <SkipBack size={22} fill="currentColor" />
          </button>

          <button onClick={togglePlay} disabled={loadingAudio}
            className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-full shadow-lg active:scale-95 disabled:opacity-60 transition-transform">
            {loadingAudio
              ? <Loader size={22} className="animate-spin" />
              : isPlaying
                ? <Pause size={26} fill="currentColor" />
                : <Play size={26} fill="currentColor" className="ml-0.5" />
            }
          </button>

          <button onClick={nextAyah} disabled={currentAyah >= totalAyah && !isLooping}
            className="p-2 text-gray-600 disabled:text-gray-300 hover:text-emerald-600 transition-colors">
            <SkipForward size={22} fill="currentColor" />
          </button>

          <button onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-colors ${showSettings ? 'text-emerald-600 bg-emerald-50' : 'text-gray-300 hover:text-gray-500'}`}>
            <Settings size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
