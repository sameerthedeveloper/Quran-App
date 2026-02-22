import { getAyahAudio, getReciterCode } from './audioSource'
import { ensureAyahDuration, getSurahTotalDuration } from './ensureDuration'

const AUDIO_CACHE_NAME = 'quran-audio-v1'
const APP_CACHE_NAME = 'quran-app-v1'

/**
 * Cache an audio file by URL
 */
export async function cacheAudio(url) {
    try {
        const cache = await caches.open(AUDIO_CACHE_NAME)
        const response = await fetch(url, { mode: 'cors' })
        if (response.ok) {
            await cache.put(url, response)
            return true
        }
        return false
    } catch (err) {
        console.error('Error caching audio:', err)
        return false
    }
}

/**
 * Get a cached audio response
 */
export async function getCachedAudio(url) {
    try {
        const cache = await caches.open(AUDIO_CACHE_NAME)
        const response = await cache.match(url)
        return response || null
    } catch (err) {
        console.error('Error getting cached audio:', err)
        return null
    }
}

/**
 * Check if an audio URL is cached
 */
export async function isAudioCached(url) {
    try {
        const cache = await caches.open(AUDIO_CACHE_NAME)
        const response = await cache.match(url)
        return !!response
    } catch {
        return false
    }
}

/**
 * Delete a cached audio file
 */
export async function deleteCachedAudio(url) {
    try {
        const cache = await caches.open(AUDIO_CACHE_NAME)
        return cache.delete(url)
    } catch (err) {
        console.error('Error deleting cached audio:', err)
        return false
    }
}

/**
 * Cache all ayahs for a surah (for offline playback)
 * @param {number} surahNo
 * @param {number} totalAyah
 * @param {number} reciterId - 1-5
 * @param {Function} onProgress - callback(cachedSeconds, totalSeconds)
 */
export async function cacheSurah(surahNo, totalAyah, reciterId = 1, onProgress = null) {
    let cachedSeconds = 0
    // Try to get actual duration if available, else fallback to ayah count scale
    let totalSeconds = await getSurahTotalDuration(reciterId, surahNo, totalAyah) || totalAyah

    for (let ayah = 1; ayah <= totalAyah; ayah++) {
        try {
            const reciterCode = getReciterCode(reciterId)
            const audioUrl = getAyahAudio(reciterCode, surahNo, ayah)
            await cacheAudio(audioUrl)

            const dur = await ensureAyahDuration(reciterId, surahNo, ayah)
            cachedSeconds += dur
        } catch (err) {
            console.error(`Error caching ayah ${ayah}:`, err)
        }
        if (onProgress) onProgress(cachedSeconds, totalSeconds)
    }

    // Also store metadata so we know this surah is downloaded
    try {
        const metaCache = await caches.open(APP_CACHE_NAME)
        const metaKey = `/meta/downloaded-surah-${surahNo}-${reciterId}`
        await metaCache.put(
            metaKey,
            new Response(JSON.stringify({ surahNo, reciterId, totalAyah, downloadedAt: Date.now() }))
        )
    } catch (err) {
        console.error('Error saving download metadata:', err)
    }

    return cached
}

/**
 * Check if a surah is fully downloaded
 */
export async function isSurahDownloaded(surahNo, reciterId = 1) {
    try {
        const metaCache = await caches.open(APP_CACHE_NAME)
        const metaKey = `/meta/downloaded-surah-${surahNo}-${reciterId}`
        const response = await metaCache.match(metaKey)
        return !!response
    } catch {
        return false
    }
}

/**
 * Delete all cached audio for a surah
 */
export async function deleteSurahCache(surahNo, reciterId = 1) {
    try {
        const metaCache = await caches.open(APP_CACHE_NAME)
        const metaKey = `/meta/downloaded-surah-${surahNo}-${reciterId}`
        await metaCache.delete(metaKey)
        return true
    } catch (err) {
        console.error('Error deleting surah cache:', err)
        return false
    }
}
