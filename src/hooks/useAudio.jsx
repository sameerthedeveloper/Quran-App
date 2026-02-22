import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'

const API_BASE = 'https://quranapi.pages.dev/api'
const AudioCtx = createContext(null)

export function AudioProvider({ children }) {
  const audioRef = useRef(null)
  const intervalRef = useRef(null)

  const [surahData, setSurahData] = useState(null)
  const [currentAyah, setCurrentAyah] = useState(1)
  const [reciterId, setReciterId] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [secondsListened, setSecondsListened] = useState(0)
  const [ayahTime, setAyahTime] = useState(0)
  const [ayahDuration, setAyahDuration] = useState(0)

  // Progressive data — grows as background fetch progresses
  const urlCacheRef = useRef({})   // { ayahNum: url }
  const durCacheRef = useRef({})   // { ayahNum: duration }
  const [urlsReady, setUrlsReady] = useState(0) // how many URLs fetched so far
  const [completedTime, setCompletedTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)

  const stateRef = useRef({})
  stateRef.current = {
    currentAyah,
    totalAyah: surahData?.totalAyah || 0,
    isLooping,
    completedTime,
    isPlaying,
  }

  const totalAyah = surahData?.totalAyah || 0
  const surahNo = surahData?.surahNo || 1
  const currentTime = completedTime + ayahTime
  const duration = totalDuration
  const ayahProgress = ayahDuration > 0 ? Math.max(0, Math.min(100, (ayahTime / ayahDuration) * 100)) : 0

  // Create audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'auto'
    }
  }, [])

  // Get URL for an ayah (from cache or fetch)
  const getAyahUrl = useCallback(async (ayahNum) => {
    if (urlCacheRef.current[ayahNum]) return urlCacheRef.current[ayahNum]

    try {
      const res = await fetch(`${API_BASE}/${surahNo}/${ayahNum}.json`)
      const data = await res.json()
      const rec = data.audio?.[String(reciterId)]
      const url = rec?.originalUrl || rec?.url || null
      if (url) urlCacheRef.current[ayahNum] = url
      return url
    } catch {
      return null
    }
  }, [surahNo, reciterId])

  // Load and play a specific ayah
  const loadAndPlay = useCallback(async (ayahNum, shouldPlay = false) => {
    const audio = audioRef.current
    if (!audio) return

    const url = await getAyahUrl(ayahNum)
    if (!url) return

    audio.src = url
    audio.load()

    if (shouldPlay) {
      const handler = () => {
        audio.play().then(() => setIsPlaying(true)).catch(() => {})
        audio.removeEventListener('canplay', handler)
      }
      audio.addEventListener('canplay', handler)
    }
  }, [getAyahUrl])

  // ── Background: progressively fetch all URLs + durations ──
  useEffect(() => {
    if (!surahData || totalAyah === 0) return
    let cancelled = false

    const fetchProgressively = async () => {
      // Fetch URLs in batches of 10 (parallel within batch, sequential between batches)
      const batchSize = 10
      let totalDur = 0

      for (let batch = 0; batch < Math.ceil(totalAyah / batchSize); batch++) {
        if (cancelled) break
        const start = batch * batchSize
        const end = Math.min(start + batchSize, totalAyah)

        const promises = []
        for (let i = start; i < end; i++) {
          const ayahNum = i + 1
          if (urlCacheRef.current[ayahNum]) {
            promises.push(Promise.resolve(null)) // already cached
            continue
          }
          promises.push(
            fetch(`${API_BASE}/${surahNo}/${ayahNum}.json`)
              .then(r => r.json())
              .then(data => {
                const rec = data.audio?.[String(reciterId)]
                const url = rec?.originalUrl || rec?.url || null
                if (url) urlCacheRef.current[ayahNum] = url
                return { ayahNum, url }
              })
              .catch(() => ({ ayahNum, url: null }))
          )
        }

        await Promise.all(promises)
        if (cancelled) break
        setUrlsReady(end)

        // If this is the first batch, allow playing
        if (batch === 0) setLoadingAudio(false)
      }

      if (cancelled) return

      // Now get durations (only need metadata, use single muted loader)
      const loader = new Audio()
      loader.preload = 'metadata'
      loader.muted = true
      loader.volume = 0

      for (let i = 1; i <= totalAyah; i++) {
        if (cancelled) break
        if (durCacheRef.current[i]) {
          totalDur += durCacheRef.current[i]
          continue
        }

        const url = urlCacheRef.current[i]
        if (!url) { durCacheRef.current[i] = 3; totalDur += 3; continue }

        const dur = await new Promise(resolve => {
          const t = setTimeout(() => resolve(3), 3000)
          loader.onloadedmetadata = () => { clearTimeout(t); resolve(loader.duration || 3) }
          loader.onerror = () => { clearTimeout(t); resolve(3) }
          loader.src = url
          loader.load()
        })
        durCacheRef.current[i] = dur
        totalDur += dur
      }

      // Clean up loader
      loader.onloadedmetadata = null
      loader.onerror = null
      loader.src = ''
      loader.removeAttribute('src')

      if (!cancelled) setTotalDuration(totalDur)
    }

    // Reset caches for new surah
    urlCacheRef.current = {}
    durCacheRef.current = {}
    setUrlsReady(0)
    setLoadingAudio(true)

    // Load the FIRST ayah immediately for instant playback
    getAyahUrl(currentAyah).then(url => {
      if (url && audioRef.current && !cancelled) {
        audioRef.current.src = url
        audioRef.current.load()
        setLoadingAudio(false)
      }
    })

    // Then fetch the rest in background
    fetchProgressively()

    return () => { cancelled = true }
  }, [surahData, totalAyah, surahNo, reciterId])

  // Preload next ayah via fetch (browser caches the audio data)
  const preloadNext = useCallback(async (nextAyahNum) => {
    const url = await getAyahUrl(nextAyahNum)
    if (url) fetch(url).catch(() => {})
  }, [getAyahUrl])

  // ── Audio event listeners ──
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onMeta = () => setAyahDuration(audio.duration)

    const onTime = () => {
      setAyahTime(audio.currentTime)
      // Preload next ayah 2 seconds before end
      const remaining = audio.duration - audio.currentTime
      if (remaining > 0 && remaining <= 2) {
        const s = stateRef.current
        if (s.currentAyah < s.totalAyah) preloadNext(s.currentAyah + 1)
      }
    }

    const onEnded = () => {
      const s = stateRef.current
      const nextNum = s.currentAyah + 1

      if (nextNum > s.totalAyah) {
        if (s.isLooping) {
          setCompletedTime(0)
          setCurrentAyah(1)
          setAyahTime(0)
          loadAndPlay(1, true)
        } else {
          setIsPlaying(false)
        }
        return
      }

      // Update completed time
      const ayahDur = durCacheRef.current[s.currentAyah] || audio.duration || 3
      setCompletedTime(s.completedTime + ayahDur)
      setCurrentAyah(nextNum)
      setAyahTime(0)
      loadAndPlay(nextNum, true)
    }

    const onError = () => setIsPlaying(false)

    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [preloadNext, loadAndPlay])

  // Track listening
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => setSecondsListened(p => p + 1), 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying])

  // Persist
  useEffect(() => {
    if (surahData) {
      localStorage.setItem(`quran-position-${surahNo}`, JSON.stringify({ ayah: currentAyah, reciterId }))
      localStorage.setItem('quran-last-listened', JSON.stringify({ surahNo, ayah: currentAyah, surahName: surahData.surahName }))
    }
  }, [currentAyah, reciterId, surahNo, surahData])

  // ── MediaSession ──
  useEffect(() => {
    if (!surahData || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${surahData.surahName} — Ayah ${currentAyah}/${totalAyah}`,
      artist: 'Quran App',
      album: surahData.surahNameTranslation || 'Quran',
    })
    navigator.mediaSession.setActionHandler('play', () => {
      const a = audioRef.current
      if (a && a.readyState >= 2) a.play().then(() => setIsPlaying(true)).catch(() => {})
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause(); setIsPlaying(false)
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => prevAyah())
    navigator.mediaSession.setActionHandler('nexttrack', () => nextAyah())

    if ('setPositionState' in navigator.mediaSession && totalDuration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: totalDuration,
          playbackRate: 1,
          position: Math.min(Math.max(0, currentTime), totalDuration),
        })
      } catch {}
    }
  }, [surahData, currentAyah, totalAyah, totalDuration, currentTime])

  // ── Public API ──
  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else if (audio.readyState >= 2) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {})
    } else if (audio.src && audio.src !== window.location.href) {
      const h = () => { audio.play().then(() => setIsPlaying(true)).catch(() => {}); audio.removeEventListener('canplay', h) }
      audio.addEventListener('canplay', h)
    }
  }, [isPlaying])

  const goToAyah = useCallback(async (ayahNum) => {
    if (ayahNum < 1 || ayahNum > totalAyah) return
    const wasPlaying = isPlaying
    audioRef.current?.pause()
    setIsPlaying(false)

    // Calc completed time from duration cache
    let acc = 0
    for (let i = 1; i < ayahNum; i++) acc += durCacheRef.current[i] || 3
    setCompletedTime(acc)
    setCurrentAyah(ayahNum)
    setAyahTime(0)

    await loadAndPlay(ayahNum, wasPlaying)
  }, [totalAyah, isPlaying, loadAndPlay])

  const nextAyah = useCallback(() => {
    if (currentAyah < totalAyah) goToAyah(currentAyah + 1)
    else if (isLooping) goToAyah(1)
  }, [currentAyah, totalAyah, isLooping, goToAyah])

  const prevAyah = useCallback(() => {
    if (currentAyah > 1) goToAyah(currentAyah - 1)
  }, [currentAyah, goToAyah])

  const seekTo = useCallback((globalTime) => {
    // Find which ayah this time falls into
    let acc = 0
    for (let i = 1; i <= totalAyah; i++) {
      const d = durCacheRef.current[i] || 3
      if (globalTime < acc + d) {
        goToAyah(i)
        return
      }
      acc += d
    }
  }, [totalAyah, goToAyah])

  const loadSurah = useCallback((data, startAyah = 1, startReciter = 1) => {
    if (surahData?.surahNo === data.surahNo && reciterId === startReciter) {
      if (startAyah !== currentAyah) goToAyah(startAyah)
      return
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    setIsPlaying(false)
    setSurahData(data)
    setCurrentAyah(startAyah)
    setReciterId(startReciter)
    setAyahTime(0)
    setAyahDuration(0)
    setCompletedTime(0)
    setTotalDuration(0)
    setSecondsListened(0)
    setUrlsReady(0)
  }, [surahData, currentAyah, reciterId, goToAyah])

  const value = {
    surahData, currentAyah, reciterId, isPlaying, duration, currentTime,
    isLooping, loadingAudio, totalAyah, secondsListened, surahNo,
    ayahProgress, ayahTime, ayahDuration,
    togglePlay, nextAyah, prevAyah, seekTo, goToAyah, loadSurah,
    setReciterId, setIsLooping,
  }

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>
}

export function useAudio() {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudio must be used within AudioProvider')
  return ctx
}
