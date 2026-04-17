/**
 * Данные для логирования входа
 */
export interface LoginLogData {
    dashboardCode: string;
    timestamp?: string;
}

/**
 * Данные для логирования начала видео
 */
export interface VideoStartLogData {
    playlistUUID: string;
    fileUUID: string;
    videoIndex?: number;
    timestamp?: string;
    screenUUID?: string;
}

/**
 * Данные для логирования ошибки видео
 */
export interface VideoErrorLogData {
    playlistUUID: string;
    fileUUID: string;
    error: string;
    errorCode?: number | string;
    timestamp?: string;
    screenUUID?: string;
}

/**
 * Контекст логирования для предоставления через Context API
 */
export type LoggingContext = {
    logger: {
        logLogin: (dashboardUUID: string, data: LoginLogData) => Promise<void>;
        logVideoStart: (
            dashboardUUID: string,
            data: VideoStartLogData,
        ) => Promise<void>;
        logVideoError: (
            dashboardUUID: string,
            data: VideoErrorLogData,
        ) => Promise<void>;
        logWidgetStart: (
            dashboardUUID: string,
            data: {
                widgetType: string;
                screenUUID?: string;
                timestamp?: string;
            },
        ) => Promise<void>;
        sendAllPendingLogs: () => Promise<{ success: number; failed: number }>;
        cleanupSentLogs: () => Promise<number>;
    };
};
