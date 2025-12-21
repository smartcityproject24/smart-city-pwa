import { apiRequest } from "../client";
import { API_CONFIG } from "../config";
import type { PlaylistContentsResponse } from "../types/playlist.types";

/**
 * Сервис для работы с плейлистами
 */
export const playlistService = {
    /**
     * Получает содержимое плейлиста
     * @param playlistUUID - UUID плейлиста
     * @returns Массив контента плейлиста
     */
    async getContents(playlistUUID: string): Promise<PlaylistContentsResponse> {
        const url = API_CONFIG.endpoints.playlists.getPlaylist(playlistUUID);
        return apiRequest<PlaylistContentsResponse>(url);
    },
};

