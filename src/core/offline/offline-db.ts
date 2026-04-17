import { openDB, type IDBPDatabase } from "idb";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VideoStatus = "downloading" | "ready" | "corrupt" | "deleting";

export interface VideoRecord {
    id: string;
    filename: string;
    sizeBytes: number;
    /** Stored as-is from manifest.checksumSha256 */
    checksumSHA256: string;
    durationSeconds: number;
    status: VideoStatus;
    downloadedAt?: number;
    retryCount?: number;
}

export type PendingStatus = "in_progress" | "ready_to_commit";

export interface PlaylistItem {
    id: string;
    order: number;
    durationSeconds: number;
}

/**
 * One record per playlistUUID.
 * Staged updates are stored inline (pendingItems/pendingVersion/pendingStatus)
 * until committed atomically.
 */
export interface PlaylistRecord {
    playlistUUID: string;
    version: number;
    items: PlaylistItem[];
    /** New items being staged — undefined when no pending update */
    pendingItems?: PlaylistItem[];
    pendingVersion?: number;
    pendingStatus?: PendingStatus;
}

export type SyncStatus = "idle" | "syncing" | "error";

export interface SyncStateRecord {
    playlistUUID: string;
    status: SyncStatus;
    lastVersion: number | null;
    lastSyncAt: number | null;
    nextRetryAt: number | null;
    failureReason: string | null;
    retryCount: number;
}

// ─── DB init ──────────────────────────────────────────────────────────────────

const DB_NAME = "smart-city-offline";
const DB_VERSION = 2;

const STORE_VIDEOS = "videos";
const STORE_PLAYLISTS = "playlists";
const STORE_SYNC_STATE = "sync_state";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                if (oldVersion < 2) {
                    // v1 used keyPath:'key' for playlists and keyPath:'id' for sync_state —
                    // drop and recreate with new keyPaths.
                    if (db.objectStoreNames.contains(STORE_PLAYLISTS)) {
                        db.deleteObjectStore(STORE_PLAYLISTS);
                    }
                    if (db.objectStoreNames.contains(STORE_SYNC_STATE)) {
                        db.deleteObjectStore(STORE_SYNC_STATE);
                    }
                }

                if (!db.objectStoreNames.contains(STORE_VIDEOS)) {
                    const videosStore = db.createObjectStore(STORE_VIDEOS, {
                        keyPath: "id",
                    });
                    videosStore.createIndex("status", "status");
                }

                if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
                    db.createObjectStore(STORE_PLAYLISTS, {
                        keyPath: "playlistUUID",
                    });
                }

                if (!db.objectStoreNames.contains(STORE_SYNC_STATE)) {
                    db.createObjectStore(STORE_SYNC_STATE, {
                        keyPath: "playlistUUID",
                    });
                }
            },
        });
    }
    return dbPromise;
}

function isAvailable(): boolean {
    return typeof window !== "undefined" && "indexedDB" in window;
}

// ─── Videos store ─────────────────────────────────────────────────────────────

export async function getVideoRecord(id: string): Promise<VideoRecord | undefined> {
    if (!isAvailable()) return undefined;
    try {
        const db = await getDB();
        return db.get(STORE_VIDEOS, id);
    } catch (error) {
        console.error("[OfflineDB] getVideoRecord failed:", error);
        return undefined;
    }
}

export async function putVideoRecord(record: VideoRecord): Promise<void> {
    if (!isAvailable()) return;
    try {
        const db = await getDB();
        await db.put(STORE_VIDEOS, record);
    } catch (error) {
        console.error("[OfflineDB] putVideoRecord failed:", error);
        throw error;
    }
}

export async function getAllVideoRecords(): Promise<VideoRecord[]> {
    if (!isAvailable()) return [];
    try {
        const db = await getDB();
        return db.getAll(STORE_VIDEOS);
    } catch (error) {
        console.error("[OfflineDB] getAllVideoRecords failed:", error);
        return [];
    }
}

export async function deleteVideoRecord(id: string): Promise<void> {
    if (!isAvailable()) return;
    try {
        const db = await getDB();
        await db.delete(STORE_VIDEOS, id);
    } catch (error) {
        console.error("[OfflineDB] deleteVideoRecord failed:", error);
        throw error;
    }
}

// ─── Playlists store ──────────────────────────────────────────────────────────

export async function getPlaylist(
    playlistUUID: string
): Promise<PlaylistRecord | undefined> {
    if (!isAvailable()) return undefined;
    try {
        const db = await getDB();
        return db.get(STORE_PLAYLISTS, playlistUUID);
    } catch (error) {
        console.error("[OfflineDB] getPlaylist failed:", error);
        return undefined;
    }
}

export async function getAllPlaylists(): Promise<PlaylistRecord[]> {
    if (!isAvailable()) return [];
    try {
        const db = await getDB();
        return db.getAll(STORE_PLAYLISTS);
    } catch (error) {
        console.error("[OfflineDB] getAllPlaylists failed:", error);
        return [];
    }
}

export async function putPlaylist(record: PlaylistRecord): Promise<void> {
    if (!isAvailable()) return;
    try {
        const db = await getDB();
        await db.put(STORE_PLAYLISTS, record);
    } catch (error) {
        console.error("[OfflineDB] putPlaylist failed:", error);
        throw error;
    }
}

// ─── Atomic commit ────────────────────────────────────────────────────────────

/**
 * Atomically promote the pending items to active in a single IDB transaction.
 * Called by sync-orchestrator and by startup-integrity (crash recovery).
 */
export async function commitPending(playlistUUID: string): Promise<void> {
    if (!isAvailable()) return;
    const db = await getDB();
    const tx = db.transaction(STORE_PLAYLISTS, "readwrite");
    const record = (await tx.store.get(playlistUUID)) as PlaylistRecord | undefined;

    if (!record || !record.pendingItems || record.pendingStatus !== "ready_to_commit") {
        await tx.done;
        return;
    }

    await tx.store.put({
        playlistUUID: record.playlistUUID,
        version: record.pendingVersion!,
        items: record.pendingItems,
    } satisfies PlaylistRecord);

    await tx.done;
}

// ─── Sync state store ─────────────────────────────────────────────────────────

function defaultSyncState(playlistUUID: string): SyncStateRecord {
    return {
        playlistUUID,
        status: "idle",
        lastVersion: null,
        lastSyncAt: null,
        nextRetryAt: null,
        failureReason: null,
        retryCount: 0,
    };
}

export async function getSyncState(
    playlistUUID: string
): Promise<SyncStateRecord> {
    if (!isAvailable()) return defaultSyncState(playlistUUID);
    try {
        const db = await getDB();
        const record = await db.get(STORE_SYNC_STATE, playlistUUID);
        return record ?? defaultSyncState(playlistUUID);
    } catch (error) {
        console.error("[OfflineDB] getSyncState failed:", error);
        return defaultSyncState(playlistUUID);
    }
}

export async function putSyncState(record: SyncStateRecord): Promise<void> {
    if (!isAvailable()) return;
    try {
        const db = await getDB();
        await db.put(STORE_SYNC_STATE, record);
    } catch (error) {
        console.error("[OfflineDB] putSyncState failed:", error);
        throw error;
    }
}

// ─── Full clear ───────────────────────────────────────────────────────────────

/** Удаляет все записи из всех сторов IDB (videos, playlists, sync_state). */
export async function clearAllOfflineDB(): Promise<void> {
    if (!isAvailable()) return;
    try {
        const db = await getDB();
        const tx = db.transaction(
            [STORE_VIDEOS, STORE_PLAYLISTS, STORE_SYNC_STATE],
            "readwrite"
        );
        await Promise.all([
            tx.objectStore(STORE_VIDEOS).clear(),
            tx.objectStore(STORE_PLAYLISTS).clear(),
            tx.objectStore(STORE_SYNC_STATE).clear(),
        ]);
        await tx.done;
        console.log("[OfflineDB] All stores cleared");
    } catch (error) {
        console.error("[OfflineDB] clearAllOfflineDB failed:", error);
    }
}
