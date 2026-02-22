import { useState, useEffect, useCallback, useRef } from 'react'
import { isSurahDownloaded, cacheSurah, deleteSurahCache } from '../utils/cacheManager'

export function useOffline() {
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const [downloading, setDownloading] = useState(null) // { surahNo, progress, total }
    const [downloadingAll, setDownloadingAll] = useState(null) // { current, total }
    const cancelRef = useRef(false)

    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            cancelRef.current = true
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

    const downloadAllSurahs = useCallback(async (surahs, reciterId = 1) => {
        cancelRef.current = false
        if (!isOnline) return

        let toDownload = []
        for (const surah of surahs) {
            const isDownloaded = await isSurahDownloaded(surah.surahNo, reciterId)
            if (!isDownloaded) toDownload.push(surah)
        }

        if (toDownload.length === 0) return

        setDownloadingAll({ current: 0, total: toDownload.length })

        for (let i = 0; i < toDownload.length; i++) {
            if (cancelRef.current) break
            const surah = toDownload[i]
            setDownloadingAll({ current: i + 1, total: toDownload.length })
            setDownloading({ surahNo: surah.surahNo, progress: 0, total: surah.totalAyah })

            await cacheSurah(surah.surahNo, surah.totalAyah, reciterId, (progress, total) => {
                if (!cancelRef.current) {
                    setDownloading({ surahNo: surah.surahNo, progress, total })
                }
            })
        }

        if (!cancelRef.current) {
            setDownloading(null)
            setDownloadingAll(null)
        }
    }, [isOnline])

    const removeSurah = useCallback(async (surahNo, reciterId = 1) => {
        return deleteSurahCache(surahNo, reciterId)
    }, [])

    return {
        isOnline,
        downloading,
        downloadingAll,
        checkDownloaded,
        downloadSurah,
        downloadAllSurahs,
        removeSurah,
    }
}
