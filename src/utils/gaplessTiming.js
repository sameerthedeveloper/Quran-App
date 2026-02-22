/**
 * Shared utility functions to maintain gapless playback timing,
 * accurate timeline progresses, and precision tracking.
 */

export function calculateSurahProgress(ayahsData, currentAyah, ayahTime, totalAyah) {
    let elapsed = 0;
    let total = 0;

    for (let i = 1; i <= totalAyah; i++) {
        const d = ayahsData[i] || 3; // Fallback
        total += d;
        if (i < currentAyah) {
            elapsed += d;
        } else if (i === currentAyah) {
            elapsed += Math.min(ayahTime, d); // ensure precise clamping
        }
    }

    return {
        elapsedSurahSeconds: elapsed,
        totalSurahDuration: total,
        progress: total > 0 ? Math.min(100, (elapsed / total) * 100) : 0
    };
}

export function calculateSeekTarget(ayahsData, targetProgressPercent, totalAyah) {
    let total = 0;
    for (let i = 1; i <= totalAyah; i++) total += (ayahsData[i] || 3);

    const targetTime = (targetProgressPercent / 100) * total;
    let accumulated = 0;

    for (let i = 1; i <= totalAyah; i++) {
        const d = ayahsData[i] || 3;
        if (accumulated + d >= targetTime || i === totalAyah) {
            return {
                targetAyah: i,
                ayahTime: Math.max(0, targetTime - accumulated)
            };
        }
        accumulated += d;
    }

    return { targetAyah: totalAyah, ayahTime: 0 };
}
