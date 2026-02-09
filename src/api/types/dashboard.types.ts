import type { Block } from "@core/types";

/**
 * Ответ от API для получения solutions dashboard
 */
export interface SolutionResponse {
    dashboardUUID: string;
    dashboardName: string;
    dashboardType: string;
    settings?: Record<string, string>[];
    solution: Block;
}

export interface SettingsItem {
    settingType: string;
    settingName: string;
    settingValue: string;
}

export interface PlaylistsItem {
    playlistUUID: string;
    playlistName: string;
    videos: {
        fileType: string;
        fileUUID: string;
        fullScreen: boolean;
    }[];
}

export interface SettingsResponse {
    deviceName: string;
    deviceType: string;
    settings: SettingsItem[];
    playlists: PlaylistsItem[];
    videos: unknown[];
    widgets: unknown[];
}
