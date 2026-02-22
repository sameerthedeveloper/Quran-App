export const DEFAULT_RECITER = 'Alafasy_128kbps'

const RECITER_MAP = {
    1: 'Alafasy_128kbps',
    2: 'Abdul_Basit_Murattal_192kbps',
    3: 'Husary_128kbps',
    4: 'Minshawy_Murattal_128kbps',
    5: 'Muhammad_Ayyoub_128kbps',
}

export function getReciterCode(id) {
    return RECITER_MAP[id] || DEFAULT_RECITER
}

export function getAyahAudio(reciter, surah, ayah) {
    const s = String(surah).padStart(3, '0')
    const a = String(ayah).padStart(3, '0')
    return `https://everyayah.com/data/${reciter}/${s}${a}.mp3`
}
