import { useState, useEffect, useCallback } from 'react'

const API_BASE = 'https://quranapi.pages.dev/api'

export function useQuran() {
    const [surahs, setSurahs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Fetch all surah list
    useEffect(() => {
        fetchSurahs()
    }, [])

    const fetchSurahs = async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch(`${API_BASE}/surah.json`)
            if (!res.ok) throw new Error('Failed to fetch surahs')
            const data = await res.json()
            // Add surah number (1-indexed based on position)
            const indexed = data.map((s, i) => ({ ...s, surahNo: i + 1 }))
            setSurahs(indexed)
        } catch (err) {
            console.error('Error fetching surahs:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Fetch a single chapter's full data (text + audio)
    const fetchChapter = useCallback(async (surahNo) => {
        try {
            const res = await fetch(`${API_BASE}/${surahNo}.json`)
            if (!res.ok) throw new Error(`Failed to fetch surah ${surahNo}`)
            const data = await res.json()
            return { ...data, surahNo }
        } catch (err) {
            console.error('Error fetching chapter:', err)
            throw err
        }
    }, [])

    // Fetch audio for a specific ayah
    const fetchAyahAudio = useCallback(async (surahNo, ayahNo) => {
        try {
            const res = await fetch(`${API_BASE}/audio/${surahNo}/${ayahNo}.json`)
            if (!res.ok) throw new Error(`Failed to fetch audio for ${surahNo}:${ayahNo}`)
            return res.json()
        } catch (err) {
            console.error('Error fetching ayah audio:', err)
            throw err
        }
    }, [])

    // Get audio URL for a specific reciter (1-5)
    const getAudioUrl = useCallback((audioData, reciterId = 1) => {
        const reciter = audioData?.[String(reciterId)]
        if (!reciter) return null
        // Prefer originalUrl for better quality
        return reciter.originalUrl || reciter.url
    }, [])

    return {
        surahs,
        loading,
        error,
        fetchChapter,
        fetchAyahAudio,
        getAudioUrl,
        refetch: fetchSurahs,
    }
}

export const RECITERS = [
    { id: 1, name: 'Mishary Rashid Al Afasy' },
    { id: 2, name: 'Abu Bakr Al Shatri' },
    { id: 3, name: 'Nasser Al Qatami' },
    { id: 4, name: 'Yasser Al Dosari' },
    { id: 5, name: 'Hani Ar Rifai' },
]
