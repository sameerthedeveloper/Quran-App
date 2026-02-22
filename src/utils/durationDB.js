const DB_NAME = 'quran-duration-db';
const STORE_NAME = 'durations';
const DB_VERSION = 1;

let dbPromise = null;

function initDB() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                return reject(new Error('IndexedDB not supported'));
            }
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    }
    return dbPromise;
}

export async function saveAyahDuration(reciter, surah, ayah, duration) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const id = `${reciter}:${surah}:${ayah}`;
            const request = store.put({ id, reciter, surah, ayah, duration });
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.warn('Failed to save to durationDB:', err);
        return false;
    }
}

export async function getAyahDuration(reciter, surah, ayah) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const id = `${reciter}:${surah}:${ayah}`;
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result ? request.result.duration : null);
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        return null;
    }
}
