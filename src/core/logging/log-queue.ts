import { logService } from "@api/services/log.service";
import {
    getPendingLogs,
    markAsSent,
    type LogEntry,
} from "./log-storage";
import { isOnline } from "./network-monitor";
import { isApiClientReady } from "@api/client";
import { DashboardLogEventType, type CreateDashboardLogRequest } from "@api/types/log.types";

const BATCH_SIZE = 10;

const VALID_LOG_EVENT_TYPES = new Set<string>(Object.values(DashboardLogEventType));

const LEGACY_TYPE_MAP: Record<string, DashboardLogEventType> = {
    VIDEO_ERROR: DashboardLogEventType.VIDEO_ERROR,
};

/**
 * Normalizes log data to fix stale logEventType values stored in IndexedDB
 * from older versions of the app (e.g. "VIDEO_ERROR" → "ERROR").
 * Returns null if the log is invalid and should be discarded.
 */
function normalizeLegacyLogData(
    data: CreateDashboardLogRequest
): CreateDashboardLogRequest | null {
    const type = data.logEventType as string;

    if (VALID_LOG_EVENT_TYPES.has(type)) {
        return data;
    }

    if (type in LEGACY_TYPE_MAP) {
        return { ...data, logEventType: LEGACY_TYPE_MAP[type] };
    }

    return null;
}

/**
 * Проверяет, есть ли токен для отправки логов
 */
function hasToken(): boolean {
    if (!isApiClientReady()) {
        return false;
    }
    if (typeof window === "undefined") {
        return false;
    }
    const token = localStorage.getItem("access_token");
    return !!token && token.trim() !== "";
}

/**
 * Отправляет батч логов на бэкенд
 */
async function sendLogsBatch(
    logs: LogEntry[]
): Promise<{ success: number; failed: number }> {
    if (!isOnline()) {
        return { success: 0, failed: logs.length };
    }

    if (!hasToken()) {
        return { success: 0, failed: logs.length };
    }

    let success = 0;
    let failed = 0;

    for (const log of logs) {
        const normalizedData = normalizeLegacyLogData(log.data);

        if (!normalizedData) {
            console.warn(
                `[LogQueue] Discarding log ${log.id} with unknown logEventType: ${log.data.logEventType}`
            );
            await markAsSent(log.id);
            continue;
        }

        try {
            await logService.createLog(log.dashboardUUID, normalizedData);
            await markAsSent(log.id);
            success++;
        } catch (error) {
            console.error(
                `[LogQueue] Failed to send log ${log.id}:`,
                error
            );
            failed++;
        }
    }

    return { success, failed };
}

/**
 * Отправляет все неотправленные логи (независимо от dashboard)
 */
export async function sendPendingLogs(): Promise<{ success: number; failed: number }> {
    if (!isOnline()) {
        return { success: 0, failed: 0 };
    }

    const pendingLogs = await getPendingLogs();

    if (pendingLogs.length === 0) {
        return { success: 0, failed: 0 };
    }

    let totalSuccess = 0;
    let totalFailed = 0;

    for (let i = 0; i < pendingLogs.length; i += BATCH_SIZE) {
        const batch = pendingLogs.slice(i, i + BATCH_SIZE);
        const result = await sendLogsBatch(batch);
        totalSuccess += result.success;
        totalFailed += result.failed;
    }

    return { success: totalSuccess, failed: totalFailed };
}

/**
 * Отправляет все неотправленные логи для всех dashboard
 */
export async function sendAllPendingLogs(): Promise<{
    success: number;
    failed: number;
}> {
    if (!isOnline()) {
        return { success: 0, failed: 0 };
    }

    const { getPendingLogs } = await import("./log-storage");
    const pendingLogs = await getPendingLogs();

    if (pendingLogs.length === 0) {
        return { success: 0, failed: 0 };
    }

    const logsByDashboard = new Map<string, LogEntry[]>();
    for (const log of pendingLogs) {
        if (!logsByDashboard.has(log.dashboardUUID)) {
            logsByDashboard.set(log.dashboardUUID, []);
        }
        logsByDashboard.get(log.dashboardUUID)!.push(log);
    }

    let totalSuccess = 0;
    let totalFailed = 0;

    for (const [dashboardUUID, logs] of logsByDashboard) {
        for (let i = 0; i < logs.length; i += BATCH_SIZE) {
            const batch = logs.slice(i, i + BATCH_SIZE);
            const result = await sendLogsBatch(batch);
            totalSuccess += result.success;
            totalFailed += result.failed;
        }
    }

    return { success: totalSuccess, failed: totalFailed };
}

