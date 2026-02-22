import { useState, useEffect, useCallback } from 'react'
import { isSurahDownloaded, cacheSurah, deleteSurahCache } from '../utils/cacheManager'

export function useOffline() {
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const [downloading, setDownloading] = useState(null) // { surahNo, progress, total }

    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const checkDownloaded = useCallback(async (surahNo, reciterId = 1) => {
        return isSurahDownloaded(surahNo, reciterId)
    }, [])

    const downloadSurah = useCallback(async (surahNo, totalAyah, reciterId = 1) => {
        setDownloading({ surahNo, progress: 0, total: totalAyah })

        const cached = await cacheSurah(surahNo, totalAyah, reciterId, (progress, total) => {
            setDownloading({ surahNo, progress, total })
        })

        setDownloading(null)
        return cached
    }, [])

    const removeSurah = useCallback(async (surahNo, reciterId = 1) => {
        return deleteSurahCache(surahNo, reciterId)
    }, [])

    return {
        isOnline,
        downloading,
        checkDownloaded,
        downloadSurah,
        removeSurah,
    }
}
