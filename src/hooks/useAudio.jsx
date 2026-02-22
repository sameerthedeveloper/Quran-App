import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'

import { getAyahAudio, getReciterCode } from '../utils/audioSource'
import { ensureAyahDuration } from '../utils/ensureDuration'
import { calculateSurahProgress, calculateSeekTarget } from '../utils/gaplessTiming'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AudioCtx = createContext(null)

/*
  Near-gapless per-ayah playback:
  - Two Audio elements: pool[0] and pool[1]
  - While pool[active] plays, pool[1-active] is fully loaded with the NEXT ayah
  - On ended: flip active index, call play() instantly (~2ms), start loading the one after
  - Event listeners are on BOTH elements — they check activeIdx to know if they're current
*/

export function AudioProvider({ children }) {
  const pool = useRef([new Audio(), new Audio()])
  const activeIdx = useRef(0) // which pool element is currently playing
  const intervalRef = useRef(null)
  const nextLoadedRef = useRef(0) // which ayah number is pre-loaded in the inactive slot

  const [surahData, setSurahData] = useState(null)
  const [currentAyah, setCurrentAyah] = useState(1)
  const [reciterId, setReciterId] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [secondsListened, setSecondsListened] = useState(0)
  const [ayahTime, setAyahTime] = useState(0)
  const [ayahDuration, setAyahDuration] = useState(0)

  const urlCacheRef = useRef({})
  const durCacheRef = useRef({})
  const [totalDuration, setTotalDuration] = useState(0)
  const [urlsReady, setUrlsReady] = useState(0)

  // Ref-based state for event handlers (avoids stale closures)
  const s = useRef({})
  s.current = {
    currentAyah, totalAyah: surahData?.totalAyah || 0,
    isLooping, isPlaying, reciterId,
    surahNo: surahData?.surahNo || 1,
  }

  const totalAyah = surahData?.totalAyah || 0
  const surahNo = surahData?.surahNo || 1
  
  const { elapsedSurahSeconds, totalSurahDuration, progress: surahProgress } = calculateSurahProgress(
    durCacheRef.current,
    currentAyah,
    ayahTime,
    totalAyah
  )

  const currentTime = elapsedSurahSeconds
  const duration = totalSurahDuration > 0 ? totalSurahDuration : totalDuration
  const ayahProgress = ayahDuration > 0 ? Math.max(0, Math.min(100, (ayahTime / ayahDuration) * 100)) : 0

  // Get active and inactive audio elements
  const getActive = () => pool.current[activeIdx.current]
  const getInactive = () => pool.current[1 - activeIdx.current]

  // ── Get/fetch ayah URL ──
  const getAyahUrl = useCallback(async (ayahNum) => {
    if (urlCacheRef.current[ayahNum]) return urlCacheRef.current[ayahNum]
    
    const reciterCode = getReciterCode(s.current.reciterId)
    const url = getAyahAudio(reciterCode, s.current.surahNo, ayahNum)
    
    urlCacheRef.current[ayahNum] = url
    return url
  }, [])

  // ── Pre-load next ayah into the inactive slot ──
  const preloadNext = useCallback(async (nextAyahNum) => {
    if (nextAyahNum <= 0 || nextAyahNum > s.current.totalAyah) return
    if (nextLoadedRef.current === nextAyahNum) return // already loaded

    const url = await getAyahUrl(nextAyahNum)
    if (!url) return

    const inactive = getInactive()
    inactive.src = url
    inactive.preload = 'auto'
    inactive.load()
    nextLoadedRef.current = nextAyahNum
  }, [getAyahUrl])

  // ── Load first ayah + background fetch all URLs ──
  useEffect(() => {
    if (!surahData || totalAyah === 0) return
    let cancelled = false

    const init = async () => {
      setLoadingAudio(true)
      urlCacheRef.current = {}
      durCacheRef.current = {}
      nextLoadedRef.current = 0

      // Load current ayah immediately
      const url = await getAyahUrl(currentAyah)
      if (cancelled) return
      if (url) {
        const active = getActive()
        active.src = url
        active.preload = 'auto'
        active.load()
      }
      setLoadingAudio(false)

      // Fetch all URLs in background (parallel batches of 15)
      const batch = 15
      for (let i = 0; i < Math.ceil(totalAyah / batch); i++) {
        if (cancelled) break
        const start = i * batch
        const end = Math.min(start + batch, totalAyah)
        await Promise.all(
          Array.from({ length: end - start }, (_, j) => getAyahUrl(start + j + 1))
        )
        setUrlsReady(end)
      }
      if (cancelled) return

      // Pre-load next ayah
      if (currentAyah < totalAyah) preloadNext(currentAyah + 1)

      // ── Timeline Caching (Local -> Supabase -> Native Probe) ──
      const timelineKey = `quran-timeline-${surahNo}-${reciterId}`
      const savedTimeline = localStorage.getItem(timelineKey)
      let hasFullTimeline = false
      let total = 0

      // 1. Try Local Storage
      if (savedTimeline) {
        try {
          const parsed = JSON.parse(savedTimeline)
          let allPresent = true
          for (let i = 1; i <= totalAyah; i++) {
            if (!parsed[i]) { allPresent = false; break }
            total += parsed[i]
          }
          if (allPresent) {
            durCacheRef.current = parsed
            hasFullTimeline = true
            if (!cancelled) setTotalDuration(total)
          }
        } catch (e) {}
      }

      // 2. Try Supabase
      if (!hasFullTimeline && isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('surah_timelines')
            .select('durations')
            .eq('surah_no', surahNo)
            .eq('reciter_id', reciterId)
            .maybeSingle()
            
          if (!error && data?.durations) {
            let allPresent = true
            total = 0
            for (let i = 1; i <= totalAyah; i++) {
              if (!data.durations[i]) { allPresent = false; break }
              total += data.durations[i]
            }
            if (allPresent) {
              durCacheRef.current = data.durations
              hasFullTimeline = true
              if (!cancelled) {
                setTotalDuration(total)
                localStorage.setItem(timelineKey, JSON.stringify(durCacheRef.current))
              }
            }
          }
        } catch (err) { console.error('Supabase timeline fetch failed:', err) }
      }

      // 3. Fallback to duration extractor (IndexedDB -> Audio metadata)
      if (!hasFullTimeline && !cancelled) {
        let total = 0
        const durations = {}

        // We can do this in parallel batches for performance
        const batchSize = 10
        for (let i = 0; i < Math.ceil(totalAyah / batchSize); i++) {
          if (cancelled) break
          const promises = []
          for (let j = 0; j < batchSize; j++) {
            const ayah = i * batchSize + j + 1
            if (ayah > totalAyah) break
            promises.push(
              ensureAyahDuration(reciterId, surahNo, ayah).then(d => {
                durations[ayah] = d
                total += d
              })
            )
          }
          await Promise.all(promises)
        }

        if (!cancelled) {
          durCacheRef.current = durations
          setTotalDuration(total)
          localStorage.setItem(timelineKey, JSON.stringify(durations))

          // Background upload to Supabase for other users
          if (isSupabaseConfigured()) {
            supabase
              .from('surah_timelines')
              .upsert({
                surah_no: surahNo,
                reciter_id: reciterId,
                durations
              })
              .catch(console.error)
          }
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [surahData, totalAyah, surahNo, reciterId])

  // ── Event listeners on BOTH pool elements ──
  useEffect(() => {
    const onTimeUpdate = (idx) => () => {
      if (activeIdx.current !== idx) return // not the active element
      const audio = pool.current[idx]
      setAyahTime(audio.currentTime)
      setAyahDuration(audio.duration || 0)

      // Pre-load next ayah when ≤2 seconds remain
      const remaining = audio.duration - audio.currentTime
      if (remaining > 0 && remaining <= 2) {
        const next = s.current.currentAyah + 1
        if (next <= s.current.totalAyah) preloadNext(next)
      }
    }

    const onEnded = (idx) => () => {
      if (activeIdx.current !== idx) return

      const st = s.current
      const nextNum = st.currentAyah + 1

      if (nextNum > st.totalAyah) {
        if (st.isLooping) {
          // Restart from ayah 1
          setCurrentAyah(1)
          setAyahTime(0)
          nextLoadedRef.current = 0
          getAyahUrl(1).then(url => {
            if (url) {
              const a = getActive()
              a.src = url
              a.load()
              const h = () => { a.play().catch(() => {}); setIsPlaying(true); a.removeEventListener('canplay', h) }
              a.addEventListener('canplay', h)
            }
          })
        } else {
          setIsPlaying(false)
        }
        return
      }

      // Move to next ayah
      setCurrentAyah(nextNum)
      setAyahTime(0)

      // ── THE KEY: if next ayah is pre-loaded in inactive slot, flip and play instantly ──
      if (nextLoadedRef.current === nextNum) {
        activeIdx.current = 1 - activeIdx.current
        const nextAudio = getActive()
        nextAudio.play().then(() => setIsPlaying(true)).catch(() => {})
        nextLoadedRef.current = 0

        // Start pre-loading the one AFTER that
        if (nextNum + 1 <= st.totalAyah) preloadNext(nextNum + 1)
      } else {
        // Fallback: load into current slot (will have a delay)
        getAyahUrl(nextNum).then(url => {
          if (url) {
            const a = getActive()
            a.src = url
            a.load()
            const h = () => { a.play().catch(() => {}); setIsPlaying(true); a.removeEventListener('canplay', h) }
            a.addEventListener('canplay', h)
          }
        })
      }
    }

    const onMeta = (idx) => () => {
      if (activeIdx.current === idx) setAyahDuration(pool.current[idx].duration)
    }

    const onError = (idx) => () => {
      if (activeIdx.current === idx) setIsPlaying(false)
    }

    // Attach to both
    const handlers = [0, 1].map(idx => ({
      time: onTimeUpdate(idx), ended: onEnded(idx), meta: onMeta(idx), error: onError(idx),
    }))

    pool.current.forEach((audio, idx) => {
      audio.addEventListener('timeupdate', handlers[idx].time)
      audio.addEventListener('ended', handlers[idx].ended)
      audio.addEventListener('loadedmetadata', handlers[idx].meta)
      audio.addEventListener('error', handlers[idx].error)
    })

    return () => {
      pool.current.forEach((audio, idx) => {
        audio.removeEventListener('timeupdate', handlers[idx].time)
        audio.removeEventListener('ended', handlers[idx].ended)
        audio.removeEventListener('loadedmetadata', handlers[idx].meta)
        audio.removeEventListener('error', handlers[idx].error)
      })
    }
  }, [preloadNext, getAyahUrl])

  // ── High Precision Gapless Crossover Loop ──
  // Replaces the native `ended` delay with a seamless 150ms early transition
  useEffect(() => {
    let loopId
    const checkGapless = () => {
      if (s.current.isPlaying) {
        const audio = getActive()
        const remaining = audio.duration - audio.currentTime
        const st = s.current
        const nextNum = st.currentAyah + 1

        // Switch 150ms early to cover browser/JS play() delay, only if next is preloaded
        if (remaining > 0 && remaining <= 0.150 && nextLoadedRef.current === nextNum) {
          // Pause current instantly to prevent native 'ended' from firing duplicate switch
          audio.pause()
          
          activeIdx.current = 1 - activeIdx.current
          const nextAudio = getActive()
          nextAudio.currentTime = 0
          nextAudio.play().then(() => setIsPlaying(true)).catch(() => {})
          nextLoadedRef.current = 0

          setCurrentAyah(nextNum)
          setAyahTime(0)

          if (nextNum + 1 <= st.totalAyah) preloadNext(nextNum + 1)
        }
      }
      loopId = requestAnimationFrame(checkGapless)
    }

    loopId = requestAnimationFrame(checkGapless)
    return () => cancelAnimationFrame(loopId)
  }, [preloadNext])



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
      localStorage.setItem('quran-last-listened', JSON.stringify({
        surahNo, ayah: currentAyah, surahName: surahData.surahName,
        surahNameArabic: surahData.surahNameArabic,
        surahNameTranslation: surahData.surahNameTranslation,
        totalAyah, reciterId, timestamp: Date.now(),
      }))
    }
  }, [currentAyah, reciterId, surahNo, surahData, totalAyah])

  // ── MediaSession ──
  useEffect(() => {
    if (!surahData || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${surahData.surahName} — Ayah ${currentAyah}/${totalAyah}`,
      artist: 'Quran App',
      album: surahData.surahNameTranslation || 'Quran',
    })
    navigator.mediaSession.setActionHandler('play', () => togglePlay())
    navigator.mediaSession.setActionHandler('pause', () => togglePlay())
    navigator.mediaSession.setActionHandler('previoustrack', () => prevAyah())
    navigator.mediaSession.setActionHandler('nexttrack', () => nextAyah())

    if ('setPositionState' in navigator.mediaSession && totalDuration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: totalDuration, playbackRate: 1,
          position: Math.min(Math.max(0, currentTime), totalDuration),
        })
      } catch {}
    }
  }, [surahData, currentAyah, totalAyah, totalDuration, currentTime])

  // ── Public API ──
  const togglePlay = useCallback(() => {
    const audio = getActive()
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

  const goToAyah = useCallback(async (ayahNum, startAyahTime = 0) => {
    if (ayahNum < 1 || ayahNum > totalAyah) return
    const wasPlaying = isPlaying
    getActive().pause()
    setIsPlaying(false)

    setCurrentAyah(ayahNum)
    setAyahTime(startAyahTime)
    nextLoadedRef.current = 0

    const url = await getAyahUrl(ayahNum)
    if (url) {
      const active = getActive()
      active.src = url
      active.load()
      
      const onLoaded = () => {
        if (startAyahTime > 0 && active.duration >= startAyahTime) {
          active.currentTime = startAyahTime
        }
        if (wasPlaying) {
          active.play().then(() => setIsPlaying(true)).catch(() => {})
        }
        active.removeEventListener('canplay', onLoaded)
      }
      active.addEventListener('canplay', onLoaded)
      
      // Pre-load next
      if (ayahNum < totalAyah) preloadNext(ayahNum + 1)
    }
  }, [totalAyah, isPlaying, getAyahUrl, preloadNext])

  const nextAyah = useCallback(() => {
    if (currentAyah < totalAyah) goToAyah(currentAyah + 1)
    else if (isLooping) goToAyah(1)
  }, [currentAyah, totalAyah, isLooping, goToAyah])

  const prevAyah = useCallback(() => {
    if (currentAyah > 1) goToAyah(currentAyah - 1)
  }, [currentAyah, goToAyah])

  const seekTo = useCallback((globalTime) => {
    // We get globalTime in seconds, but our slider gives values. 
    // We already have targetProgressPercent if needed, 
    // but the slider typically asks us to seek by progress %.
    // Let's assume globalTime is seconds, we calculate percent:
    const targetPercent = (globalTime / (duration || 1)) * 100
    const { targetAyah, ayahTime: targetAyahTime } = calculateSeekTarget(
      durCacheRef.current,
      targetPercent,
      totalAyah
    )
    
    // Jump to exactly that point in the calculated ayah
    goToAyah(targetAyah, targetAyahTime)
  }, [totalAyah, duration, goToAyah])

  const loadSurah = useCallback((data, startAyah = 1, startReciter = 1) => {
    if (surahData?.surahNo === data.surahNo && reciterId === startReciter) {
      if (startAyah !== currentAyah) goToAyah(startAyah)
      return
    }
    pool.current.forEach(a => { a.pause(); a.src = '' })
    activeIdx.current = 0
    nextLoadedRef.current = 0
    setIsPlaying(false)
    setSurahData(data)
    setCurrentAyah(startAyah)
    setReciterId(startReciter)
    setAyahTime(0); setAyahDuration(0)
    setTotalDuration(0)
    setSecondsListened(0); setUrlsReady(0)
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
