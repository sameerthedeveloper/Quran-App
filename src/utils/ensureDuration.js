import { getAyahDuration, saveAyahDuration } from './durationDB';
import { extractAyahDuration } from './durationExtractor';
import { getReciterCode } from './audioSource';

export async function ensureAyahDuration(reciterId, surah, ayah) {
    const reciter = getReciterCode(reciterId);
    try {
        const cached = await getAyahDuration(reciter, surah, ayah);
        if (cached) return cached;

        // Not cached, extract it natively
        const duration = await extractAyahDuration(reciter, surah, ayah);
        await saveAyahDuration(reciter, surah, ayah, duration);
        return duration;
    } catch (err) {
        console.warn('Error ensuring duration, returning fallback:', err);
        return 3;
    }
}

export async function getSurahTotalDuration(reciterId, surah, totalAyah) {
    let total = 0;
    // Parallellize in small batches for speed without locking browser
    const batchSize = 10;
    for (let i = 0; i < Math.ceil(totalAyah / batchSize); i++) {
        const promises = [];
        for (let j = 0; j < batchSize; j++) {
            const ayah = i * batchSize + j + 1;
            if (ayah > totalAyah) break;
            promises.push(ensureAyahDuration(reciterId, surah, ayah));
        }
        const durations = await Promise.all(promises);
        total += durations.reduce((a, b) => a + b, 0);
    }
    return total;
}
