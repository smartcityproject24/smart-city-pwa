import { DashboardLogEventType } from "@api/types/log.types";
import { saveLog } from "./log-storage";
import { sendPendingLogs, sendAllPendingLogs } from "./log-queue";
import { isOnline, onNetworkChange } from "./network-monitor";
import { deleteSentLogs } from "./log-storage";
import type { LoginLogData, VideoStartLogData, VideoErrorLogData } from "./types";

// Конфигурация logger (инициализируется через initLogger)
let loggerConfig: {
    sentLogsCleanupAgeHours: number;
    sentLogsCleanupIntervalHours: number;
    logSendIntervalSeconds: number;
} = {
    sentLogsCleanupAgeHours: 6,
    sentLogsCleanupIntervalHours: 6,
    logSendIntervalSeconds: 30,
};

/**
 * Инициализирует конфигурацию logger
 */
export function initLogger(config: {
    sentLogsCleanupAgeHours: number;
    sentLogsCleanupIntervalHours: number;
    logSendIntervalSeconds: number;
}) {
    loggerConfig = config;
}

/**
 * Публичный API для логирования
 */
export const logger = {
    /**
     * Логирует вход в систему
     */
    async logLogin(
        dashboardUUID: string,
        data: LoginLogData
    ): Promise<void> {
        try {
            const timestamp = data.timestamp || new Date().toISOString();
            const logPayload = JSON.stringify({
                dashboardCode: data.dashboardCode,
                timestamp,
            });

            await saveLog({
                type: DashboardLogEventType.LOGIN,
                timestamp,
                dashboardUUID,
                data: {
                    logEventType: DashboardLogEventType.LOGIN,
                    logPayload,
                },
            });

            if (isOnline()) {
                await sendPendingLogs();
            }
        } catch (error) {
            console.error("[Logger] Failed to log login:", error);
        }
    },

    /**
     * Логирует начало показа видео
     */
    async logVideoStart(
        dashboardUUID: string,
        data: VideoStartLogData
    ): Promise<void> {
        try {
            const timestamp = data.timestamp || new Date().toISOString();
            const date = new Date(timestamp);
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, "0");
            const day = String(date.getUTCDate()).padStart(2, "0");
            const logContentShowDate = `${year}-${month}-${day}`;

            const logPayload = JSON.stringify({
                playlistUUID: data.playlistUUID,
                fileUUID: data.fileUUID,
                videoIndex: data.videoIndex,
                timestamp,
            });

            await saveLog({
                type: DashboardLogEventType.VIDEO_START,
                timestamp,
                dashboardUUID,
                data: {
                    logEventType: DashboardLogEventType.VIDEO_START,
                    contentUUID: null,
                    fileUUID: data.fileUUID,
                    logContentShowDate,
                    logPayload,
                },
            });

            if (isOnline()) {
                await sendPendingLogs();
            }
        } catch (error) {
            console.error("[Logger] Failed to log video start:", error);
        }
    },

    /**
     * Логирует ошибку воспроизведения видео
     */
    async logVideoError(
        dashboardUUID: string,
        data: VideoErrorLogData
    ): Promise<void> {
        try {
            const timestamp = data.timestamp || new Date().toISOString();
            const logPayload = JSON.stringify({
                playlistUUID: data.playlistUUID,
                fileUUID: data.fileUUID,
                error: data.error,
                errorCode: data.errorCode,
                timestamp,
            });

            await saveLog({
                type: DashboardLogEventType.VIDEO_ERROR,
                timestamp,
                dashboardUUID,
                data: {
                    logEventType: DashboardLogEventType.VIDEO_ERROR,
                    fileUUID: data.fileUUID,
                    logPayload,
                },
            });

            if (isOnline()) {
                await sendPendingLogs();
            }
        } catch (error) {
            console.error("[Logger] Failed to log video error:", error);
        }
    },

    /**
     * Отправляет все неотправленные логи для всех dashboard
     */
    async sendAllPendingLogs(): Promise<{
        success: number;
        failed: number;
    }> {
        return sendAllPendingLogs();
    },

    /**
     * Удаляет все отправленные логи
     */
    async cleanupSentLogs(): Promise<number> {
        return deleteSentLogs();
    },
};

/**
 * Инициализирует мониторинг сети и автоматическую отправку логов
 */
export function initLoggingAutoSend(): () => void {
    const unsubscribe = onNetworkChange(async (online) => {
        if (online) {
            try {
                await sendAllPendingLogs();
            } catch (error) {
                console.error(
                    "[Logger] Failed to send logs on network recovery:",
                    error
                );
            }
        }
    });

    const sendInterval = setInterval(async () => {
        if (isOnline()) {
            try {
                await sendAllPendingLogs();
            } catch (error) {
                console.error(
                    "[Logger] Failed to send logs periodically:",
                    error
                );
            }
        }
    }, loggerConfig.logSendIntervalSeconds * 1000);

    const cleanupInterval = setInterval(async () => {
        try {
            await logger.cleanupSentLogs();
        } catch (error) {
            console.error("[Logger] Failed to cleanup logs:", error);
        }
    }, loggerConfig.sentLogsCleanupIntervalHours * 60 * 60 * 1000);

    return () => {
        unsubscribe();
        clearInterval(sendInterval);
        clearInterval(cleanupInterval);
    };
}

