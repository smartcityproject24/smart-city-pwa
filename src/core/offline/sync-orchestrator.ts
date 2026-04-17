import { apiRequestRaw } from "@api/client";
import {
    getAllVideoRecords,
    putVideoRecord,
    deleteVideoRecord,
    getPlaylist,
    putPlaylist,
    getSyncState,
    putSyncState,
    commitPending,
    type VideoRecord,
    type PlaylistItem,
} from "./offline-db";
import {
    writeTmpFile,
    getTmpFile,
    commitTmpToMp4,
    deleteTmpFile,
    deleteVideoFile,
} from "./opfs";
import { computeSHA256FromFile, verifyChecksum } from "./checksum";
import { isServerReachable } from "./connectivity";
import {
    fetchManifest,
    ManifestNotFoundError,
    type ManifestItem,
} from "./manifest.service";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * A file that fails this many times in a row is skipped until the server
 * updates it (new checksum in the manifest). Prevents one broken file from
 * blocking the whole sync cycle indefinitely.
 */
const MAX_FILE_RETRIES = 3;

const SYNC_CHANNEL = "offline-sync";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncSkipReason =
    | "not_reachable"
    | "manifest_not_available"
    | "not_modified"
    | "no_playlist";

export type SyncResult =
    | { type: "skipped"; reason: SyncSkipReason }
    | { type: "completed"; newVersion: number; downloadedCount: number; skippedCount: number }
    | { type: "failed"; error: Error };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toPlaylistItem(item: ManifestItem): PlaylistItem {
    return {
        id: item.uuid,
        order: item.order,
        durationSeconds: item.durationSeconds,
    };
}

/**
 * Download a single file, verify SHA-256, and commit .tmp → .mp4.
 *
 * - On success: status = "ready", retryCount reset to 0.
 * - On failure: status = "corrupt", retryCount incremented. Always rethrows
 *   so the caller can decide to skip or abort.
 */
async function downloadAndVerify(
    item: ManifestItem,
    existingRecord: VideoRecord | undefined
): Promise<void> {
    const retryCount = existingRecord?.retryCount ?? 0;

    await putVideoRecord({
        id: item.uuid,
        filename: item.filename,
        sizeBytes: item.sizeBytes,
        checksumSHA256: item.checksumSha256,
        durationSeconds: item.durationSeconds,
        status: "downloading",
        retryCount,
        ...(existingRecord?.downloadedAt ? { downloadedAt: existingRecord.downloadedAt } : {}),
    });

    try {
        const response = await apiRequestRaw(item.url);
        if (!response.ok || !response.body) {
            throw new Error(
                `Download failed for ${item.uuid}: ${response.status} ${response.statusText}`
            );
        }
        await writeTmpFile(item.uuid, response.body);

        const tmpFile = await getTmpFile(item.uuid);
        const computed = await computeSHA256FromFile(tmpFile);

        if (!verifyChecksum(computed, item.checksumSha256)) {
            await deleteTmpFile(item.uuid);
            throw new Error(
                `Checksum mismatch for ${item.uuid}: got ${computed}, expected ${item.checksumSha256}`
            );
        }

        await commitTmpToMp4(item.uuid);
        await putVideoRecord({
            id: item.uuid,
            filename: item.filename,
            sizeBytes: item.sizeBytes,
            checksumSHA256: item.checksumSha256,
            durationSeconds: item.durationSeconds,
            status: "ready",
            retryCount: 0,
            downloadedAt: Date.now(),
        });
    } catch (err) {
        // Increment retryCount so persistently broken files eventually get skipped
        await putVideoRecord({
            id: item.uuid,
            filename: item.filename,
            sizeBytes: item.sizeBytes,
            checksumSHA256: item.checksumSha256,
            durationSeconds: item.durationSeconds,
            status: "corrupt",
            retryCount: retryCount + 1,
        });
        throw err;
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function runSync(playlistUUID: string): Promise<SyncResult> {
    if (!playlistUUID?.trim()) {
        return { type: "skipped", reason: "no_playlist" };
    }

    // 1. Connectivity probe
    const reachable = await isServerReachable();
    if (!reachable) {
        console.log("[Sync] Server not reachable — skipping");
        return { type: "skipped", reason: "not_reachable" };
    }

    const currentState = await getSyncState(playlistUUID);

    try {
        await putSyncState({ ...currentState, status: "syncing" });

        // 2. Fetch manifest (local version check → null if unchanged)
        let manifest;
        try {
            manifest = await fetchManifest(playlistUUID, currentState.lastVersion);
        } catch (err) {
            if (err instanceof ManifestNotFoundError) {
                console.log("[Sync] Manifest endpoint not available — skipping");
                await putSyncState({ ...currentState, status: "idle" });
                return { type: "skipped", reason: "manifest_not_available" };
            }
            throw err;
        }

        if (!manifest) {
            console.log("[Sync] Manifest unchanged — skipping");
            await putSyncState({ ...currentState, status: "idle" });
            return { type: "skipped", reason: "not_modified" };
        }

        console.log(
            `[Sync] New manifest version: ${manifest.version} (${manifest.items.length} items)`
        );

        // 3. Diff: compare manifest items with local ready records
        const localRecords = await getAllVideoRecords();
        const allLocalMap = new Map(localRecords.map(r => [r.id, r]));
        const localReady = new Map(
            localRecords.filter(r => r.status === "ready").map(r => [r.id, r])
        );
        const manifestIds = new Set(manifest.items.map(i => i.uuid));

        const toDownload = manifest.items.filter(item => {
            const local = localReady.get(item.uuid);
            return !local || !verifyChecksum(local.checksumSHA256, item.checksumSha256);
        });

        // Only delete files from THIS playlist's previous active items
        const existingRecord = await getPlaylist(playlistUUID);
        const previousActiveIds = new Set((existingRecord?.items ?? []).map(i => i.id));
        const toDelete = [...previousActiveIds].filter(id => !manifestIds.has(id));

        console.log(`[Sync] Download: ${toDownload.length}, Delete: ${toDelete.length}`);

        // 4. Stage pending playlist in IDB (crash recovery marker)
        await putPlaylist({
            playlistUUID,
            version: existingRecord?.version ?? 0,
            items: existingRecord?.items ?? [],
            pendingItems: manifest.items.map(toPlaylistItem),
            pendingVersion: manifest.version,
            pendingStatus: "in_progress",
        });

        // 5. Download files — per-file error handling, never abort the whole sync
        let downloadedCount = 0;
        const failedIds = new Set<string>();

        for (const item of toDownload) {
            const record = allLocalMap.get(item.uuid);
            const retries = record?.retryCount ?? 0;

            // Skip files that have repeatedly failed with the same checksum.
            // If the server fixes the file (new checksum), verifyChecksum below
            // will be false → file re-enters toDownload → retryCount resets on success.
            if (retries >= MAX_FILE_RETRIES) {
                const sameFile =
                    record && verifyChecksum(record.checksumSHA256, item.checksumSha256);
                if (sameFile) {
                    console.warn(
                        `[Sync] Skipping ${item.filename} — max retries (${retries}/${MAX_FILE_RETRIES}), same checksum`
                    );
                    failedIds.add(item.uuid);
                    continue;
                }
                // Server updated the file — reset counter and retry
                console.log(
                    `[Sync] ${item.filename} has new checksum — resetting retry count`
                );
                await putVideoRecord({ ...record!, retryCount: 0 });
            }

            try {
                console.log(`[Sync] Downloading ${item.filename} (${item.uuid})`);
                await downloadAndVerify(item, record);
                downloadedCount++;
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`[Sync] Failed to download ${item.filename}: ${msg}`);
                failedIds.add(item.uuid);
                // Continue with next file — one failure does not abort the sync
            }
        }

        if (failedIds.size > 0) {
            console.warn(
                `[Sync] ${failedIds.size} file(s) failed — will retry next sync`
            );
        }

        // 6. Build pending playlist from only ready items
        // Failed / skipped files are excluded — player won't see them
        const updatedRecords = await getAllVideoRecords();
        const updatedReadyIds = new Set(
            updatedRecords.filter(r => r.status === "ready").map(r => r.id)
        );
        const readyPendingItems = manifest.items
            .filter(item => updatedReadyIds.has(item.uuid))
            .map(toPlaylistItem);

        // 7. Mark as ready_to_commit
        await putPlaylist({
            playlistUUID,
            version: existingRecord?.version ?? 0,
            items: existingRecord?.items ?? [],
            pendingItems: readyPendingItems,
            pendingVersion: manifest.version,
            pendingStatus: "ready_to_commit",
        });

        // 8. Atomic commit: pending items become active
        await commitPending(playlistUUID);

        // 9. Signal player via BroadcastChannel
        const channel = new BroadcastChannel(SYNC_CHANNEL);
        channel.postMessage({
            type: "playlist-updated",
            playlistUUID,
            version: manifest.version,
        });
        channel.close();

        // 10. Delete obsolete files (use allLocalMap — handles corrupt/deleting records too)
        for (const id of toDelete) {
            console.log(`[Sync] Removing obsolete file ${id}`);
            const record = allLocalMap.get(id);
            if (record) {
                await putVideoRecord({ ...record, status: "deleting" });
            }
            await deleteVideoFile(id);
            await deleteVideoRecord(id);
        }

        // 11. Update sync state — success
        await putSyncState({
            playlistUUID,
            status: "idle",
            lastVersion: manifest.version,
            lastSyncAt: Date.now(),
            nextRetryAt: null,
            failureReason: null,
            retryCount: 0,
        });

        console.log(
            `[Sync] Completed. Version: ${manifest.version}, Downloaded: ${downloadedCount}, Skipped: ${failedIds.size}`
        );
        return {
            type: "completed",
            newVersion: manifest.version,
            downloadedCount,
            skippedCount: failedIds.size,
        };
    } catch (error) {
        // Only catastrophic failures reach here (manifest fetch, IDB error, etc.)
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("[Sync] Sync failed:", err.message);

        const latestState = await getSyncState(playlistUUID);
        await putSyncState({
            ...latestState,
            status: "error",
            failureReason: err.message,
            retryCount: latestState.retryCount + 1,
            nextRetryAt: null,
        });

        return { type: "failed", error: err };
    }
}
