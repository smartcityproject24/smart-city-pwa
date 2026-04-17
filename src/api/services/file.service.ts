import { apiRequestRaw } from "../client";
import { API_CONFIG } from "../config";
import { ApiError } from "../types/errors";

const VIDEO_CACHE_NAME = "video-blobs";

/**
 * Сервис для работы с файлами
 */
export const fileService = {
    /**
     * Кеширует файл на диск (Cache API) без загрузки blob в JS-память.
     * Если файл уже в кеше — ничего не делает.
     */
    async precacheFile(fileUUID: string, useRedirect?: boolean): Promise<boolean> {
        const url = useRedirect
            ? API_CONFIG.endpoints.files.getFileRedirect(fileUUID)
            : API_CONFIG.endpoints.files.getFile(fileUUID);

        if ("caches" in window) {
            try {
                const cache = await caches.open(VIDEO_CACHE_NAME);
                const cached = await cache.match(url);
                if (cached) return true;
            } catch {}
        }

        try {
            const response = await apiRequestRaw(url);
            if (!response.ok) return false;

            if ("caches" in window) {
                try {
                    const cache = await caches.open(VIDEO_CACHE_NAME);
                    await cache.put(url, response);
                } catch {}
            }
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Получает blob файла через redirect
     * @param fileUUID - UUID файла
     * @returns Promise<Blob> - blob данных файла
     */
    async getFileBlob(fileUUID: string, useRedirect?: boolean): Promise<Blob> {
        const url = useRedirect
            ? API_CONFIG.endpoints.files.getFileRedirect(fileUUID)
            : API_CONFIG.endpoints.files.getFile(fileUUID);

        try {
            const response = await apiRequestRaw(url);

            if (!response.ok) {
                throw new ApiError({
                    code: response.status,
                    message: `Failed to fetch file: ${response.statusText}`,
                    error: response.status === 404 ? "NotFound" : "Internal",
                    detailedMessages: [],
                });
            }

            const responseToCache = response.clone();
            if ("caches" in window) {
                caches
                    .open(VIDEO_CACHE_NAME)
                    .then((cache) => cache.put(url, responseToCache))
                    .catch(() => {});
            }

            return await response.blob();
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            if ("caches" in window) {
                try {
                    const cache = await caches.open(VIDEO_CACHE_NAME);
                    const cached = await cache.match(url);
                    if (cached) {
                        return await cached.blob();
                    }
                } catch {}
            }

            console.error(`[fileService] Network error while fetching file ${fileUUID}:`, error);
            throw new ApiError({
                code: 0,
                message: `Network error while fetching file: ${error}`,
                error: "Network",
                detailedMessages: [],
            });
        }
    },
};

