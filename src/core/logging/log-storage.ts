import { openDB, type IDBPDatabase } from "idb";
import type { CreateDashboardLogRequest } from "@api/types/log.types";

/**
 * Интерфейс для записи лога в IndexedDB
 */
export interface LogEntry {
    id: string;
    type: string;
    timestamp: string;
    dashboardUUID: string;
    data: CreateDashboardLogRequest;
    sent: boolean;
    retryCount: number;
    createdAt: number;
    sentAt?: number;
}

/**
 * Тип для создания лога (без id и служебных полей)
 */
export interface CreateLogEntry {
    type: string;
    timestamp: string;
    dashboardUUID: string;
    data: CreateDashboardLogRequest;
}

// Конфигурация БД (инициализируется через initLogStorage)
let dbConfig: {
    dbName: string;
    dbVersion: number;
    storeName: string;
} = {
    dbName: "smart-city-logs",
    dbVersion: 1,
    storeName: "logs",
};

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Инициализирует конфигурацию хранилища логов
 */
export function initLogStorage(config: {
    dbName: string;
    dbVersion: number;
    storeName: string;
}) {
    dbConfig = config;
    dbPromise = null;
}

/**
 * Инициализирует и возвращает экземпляр БД
 */
function getDB(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB(dbConfig.dbName, dbConfig.dbVersion, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(dbConfig.storeName)) {
                    const store = db.createObjectStore(dbConfig.storeName, {
                        keyPath: "id",
                    });
                    store.createIndex("sent", "sent");
                    store.createIndex("createdAt", "createdAt");
                    store.createIndex("timestamp", "timestamp");
                    store.createIndex("dashboardUUID", "dashboardUUID");
                }
            },
        });
    }
    return dbPromise;
}

/**
 * Сохраняет лог в IndexedDB
 */
export async function saveLog(log: CreateLogEntry): Promise<void> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
        console.warn("[LogStorage] IndexedDB not available");
        return;
    }

    try {
        const db = await getDB();
        const logEntry: LogEntry = {
            id: `${log.type}-${log.timestamp}-${Date.now()}-${Math.random()}`,
            type: log.type,
            timestamp: log.timestamp,
            dashboardUUID: log.dashboardUUID,
            data: log.data,
            sent: false,
            retryCount: 0,
            createdAt: Date.now(),
        };

        await db.put(dbConfig.storeName, logEntry);
    } catch (error) {
        console.error("[LogStorage] Failed to save log:", error);
        throw error;
    }
}

/**
 * Получает все неотправленные логи
 */
export async function getPendingLogs(): Promise<LogEntry[]> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
        return [];
    }

    try {
        const db = await getDB();
        const allLogs = await db.getAll(dbConfig.storeName);
        return allLogs.filter((log) => log.sent === false);
    } catch (error) {
        console.error("[LogStorage] Failed to get pending logs:", error);
        return [];
    }
}

/**
 * Получает неотправленные логи для конкретного dashboard
 */
export async function getPendingLogsByDashboard(
    dashboardUUID: string
): Promise<LogEntry[]> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
        return [];
    }

    try {
        const db = await getDB();
        const allLogs = await db.getAll(dbConfig.storeName);
        return allLogs.filter(
            (log) => log.sent === false && log.dashboardUUID === dashboardUUID
        );
    } catch (error) {
        console.error(
            "[LogStorage] Failed to get pending logs by dashboard:",
            error
        );
        return [];
    }
}

/**
 * Помечает лог как отправленный
 */
export async function markAsSent(logId: string): Promise<void> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
        return;
    }

    try {
        const db = await getDB();
        const log = await db.get(dbConfig.storeName, logId);
        if (log) {
            log.sent = true;
            log.sentAt = Date.now();
            await db.put(dbConfig.storeName, log);
        }
    } catch (error) {
        console.error("[LogStorage] Failed to mark log as sent:", error);
        throw error;
    }
}

/**
 * Увеличивает счетчик попыток отправки
 */
export async function incrementRetryCount(logId: string): Promise<void> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
        return;
    }

    try {
        const db = await getDB();
        const log = await db.get(dbConfig.storeName, logId);
        if (log) {
            log.retryCount += 1;
            await db.put(dbConfig.storeName, log);
        }
    } catch (error) {
        console.error(
            "[LogStorage] Failed to increment retry count:",
            error
        );
        throw error;
    }
}

/**
 * Удаляет все отправленные логи
 */
export async function deleteSentLogs(): Promise<number> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
        return 0;
    }

    try {
        const db = await getDB();
        const allLogs = await db.getAll(dbConfig.storeName);
        const sentLogs = allLogs.filter((log) => log.sent === true);
        let deletedCount = 0;

        for (const log of sentLogs) {
            await db.delete(dbConfig.storeName, log.id);
            deletedCount++;
        }

        return deletedCount;
    } catch (error) {
        console.error("[LogStorage] Failed to delete old logs:", error);
        return 0;
    }
}

/**
 * Получает количество неотправленных логов
 */
export async function getPendingLogsCount(): Promise<number> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
        return 0;
    }

    try {
        const db = await getDB();
        const allLogs = await db.getAll(dbConfig.storeName);
        return allLogs.filter((log) => log.sent === false).length;
    } catch (error) {
        console.error("[LogStorage] Failed to get pending logs count:", error);
        return 0;
    }
}

