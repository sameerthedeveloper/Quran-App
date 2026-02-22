import { getAyahAudio } from './audioSource';

export async function extractAyahDuration(reciter, surah, ayah) {
    return new Promise((resolve) => {
        const url = getAyahAudio(reciter, surah, ayah);
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.muted = true;

        // Timeout fallback for network failure or bad files
        const timeout = setTimeout(() => {
            audio.onloadedmetadata = null;
            audio.onerror = null;
            resolve(3); // Default 3 second fallback
        }, 5000);

        audio.onloadedmetadata = () => {
            clearTimeout(timeout);
            resolve(audio.duration || 3);
        };

        audio.onerror = () => {
            clearTimeout(timeout);
            resolve(3);
        };

        audio.src = url;
        audio.load();
    });
}
