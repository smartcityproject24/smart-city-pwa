import { apiRequestRaw } from "../client";
import { API_CONFIG } from "../config";
import { ApiError } from "../types/errors";

/**
 * Сервис для работы с файлами
 */
export const fileService = {
    /**
     * Получает blob файла через redirect
     * @param fileUUID - UUID файла
     * @returns Promise<Blob> - blob данных файла
     */
    async getFileBlob(fileUUID: string): Promise<Blob> {
        const url = API_CONFIG.endpoints.files.getFile(fileUUID);

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

            const blob = await response.blob();
            return blob;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
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

