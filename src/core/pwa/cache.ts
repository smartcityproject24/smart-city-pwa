/**
 * Утилиты для управления кэшем PWA API
 */

const API_CACHE_NAMES = {
    DASHBOARDS: 'api-dashboards',
    PLAYLISTS: 'api-playlists',
    FILES: 'api-files',
} as const;

/**
 * Очищает кэш файлов
 */
export async function clearFilesCache(): Promise<void> {
    if (typeof window === 'undefined' || !('caches' in window)) {
        return;
    }

    try {
        await caches.delete(API_CACHE_NAMES.FILES);
    } catch (error) {
        console.warn('[Cache] Failed to clear files cache:', error);
    }
}

/**
 * Очищает все API кэши (вызывается при logout)
 */
export async function clearAllApiCache(): Promise<void> {
    if (typeof window === 'undefined' || !('caches' in window)) {
        return;
    }

    try {
        const cacheNames = await caches.keys();
        const apiCaches = cacheNames.filter(name =>
            name === API_CACHE_NAMES.DASHBOARDS ||
            name === API_CACHE_NAMES.PLAYLISTS ||
            name === API_CACHE_NAMES.FILES
        );

        await Promise.all(apiCaches.map(name => caches.delete(name)));
    } catch (error) {
        console.warn('[Cache] Failed to clear API cache:', error);
    }
}

