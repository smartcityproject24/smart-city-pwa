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

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncSkipReason =
    | "not_reachable"
    | "manifest_not_available"
    | "not_modified"
    | "no_playlist";

export type SyncResult =
    | { type: "skipped"; reason: SyncSkipReason }
    | { type: "completed"; newVersion: number; downloadedCount: number }
    | { type: "failed"; error: Error };

const SYNC_CHANNEL = "offline-sync";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toPlaylistItem(item: ManifestItem): PlaylistItem {
    return {
        id: item.uuid,
        order: item.order,
        durationSeconds: item.durationSeconds,
    };
}

async function downloadAndVerify(
    item: ManifestItem,
    existingRecord: VideoRecord | undefined
): Promise<void> {
    await putVideoRecord({
        id: item.uuid,
        filename: item.filename,
        sizeBytes: item.sizeBytes,
        checksumSHA256: item.checksumSha256,
        durationSeconds: item.durationSeconds,
        status: "downloading",
        ...(existingRecord?.downloadedAt
            ? { downloadedAt: existingRecord.downloadedAt }
            : {}),
    });

    // Stream download directly into OPFS as .tmp
    const response = await apiRequestRaw(item.url);
    if (!response.ok || !response.body) {
        throw new Error(
            `Download failed for ${item.uuid}: ${response.status} ${response.statusText}`
        );
    }
    await writeTmpFile(item.uuid, response.body);

    // Verify SHA-256 before committing
    const tmpFile = await getTmpFile(item.uuid);
    const computed = await computeSHA256FromFile(tmpFile);

    if (!verifyChecksum(computed, item.checksumSha256)) {
        await deleteTmpFile(item.uuid);
        await putVideoRecord({
            id: item.uuid,
            filename: item.filename,
            sizeBytes: item.sizeBytes,
            checksumSHA256: item.checksumSha256,
            durationSeconds: item.durationSeconds,
            status: "corrupt",
        });
        throw new Error(
            `Checksum mismatch for ${item.uuid}: got ${computed}, expected ${item.checksumSha256}`
        );
    }

    // Rename .tmp → .mp4 and mark ready
    await commitTmpToMp4(item.uuid);
    await putVideoRecord({
        id: item.uuid,
        filename: item.filename,
        sizeBytes: item.sizeBytes,
        checksumSHA256: item.checksumSha256,
        durationSeconds: item.durationSeconds,
        status: "ready",
        downloadedAt: Date.now(),
    });
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
            manifest = await fetchManifest(
                playlistUUID,
                currentState.lastVersion
            );
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
        const localReady = new Map(
            localRecords
                .filter((r) => r.status === "ready")
                .map((r) => [r.id, r])
        );
        const manifestIds = new Set(manifest.items.map((i) => i.uuid));

        const toDownload = manifest.items.filter((item) => {
            const local = localReady.get(item.uuid);
            return (
                !local ||
                !verifyChecksum(local.checksumSHA256, item.checksumSha256)
            );
        });

        // Only delete files that were in THIS playlist's previous active items.
        // Never touch files belonging to other playlists.
        const existingRecord = await getPlaylist(playlistUUID);
        const previousActiveIds = new Set(
            (existingRecord?.items ?? []).map((i) => i.id)
        );
        const toDelete = [...previousActiveIds].filter(
            (id) => !manifestIds.has(id)
        );

        console.log(
            `[Sync] Download: ${toDownload.length}, Delete: ${toDelete.length}`
        );

        // 4. Stage pending items in IDB (in-progress marker)
        await putPlaylist({
            playlistUUID,
            version: existingRecord?.version ?? 0,
            items: existingRecord?.items ?? [],
            pendingItems: manifest.items.map(toPlaylistItem),
            pendingVersion: manifest.version,
            pendingStatus: "in_progress",
        });

        // 5. Download new / changed files sequentially
        for (const item of toDownload) {
            console.log(`[Sync] Downloading ${item.filename} (${item.uuid})`);
            await downloadAndVerify(item, localReady.get(item.uuid));
        }

        // 6. Mark pending as ready_to_commit (crash recovery marker)
        await putPlaylist({
            playlistUUID,
            version: existingRecord?.version ?? 0,
            items: existingRecord?.items ?? [],
            pendingItems: manifest.items.map(toPlaylistItem),
            pendingVersion: manifest.version,
            pendingStatus: "ready_to_commit",
        });

        // 7. Atomic commit: pending items become active items
        await commitPending(playlistUUID);

        // 8. Signal player via BroadcastChannel
        const channel = new BroadcastChannel(SYNC_CHANNEL);
        channel.postMessage({
            type: "playlist-updated",
            playlistUUID,
            version: manifest.version,
        });
        channel.close();

        // 9. Delete orphan files no longer in the manifest
        for (const id of toDelete) {
            console.log(`[Sync] Removing obsolete file ${id}`);
            await putVideoRecord({
                ...localReady.get(id)!,
                status: "deleting",
            });
            await deleteVideoFile(id);
            await deleteVideoRecord(id);
        }

        // 10. Update sync state — success
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
            `[Sync] Completed. Version: ${manifest.version}, Downloaded: ${toDownload.length}`
        );
        return {
            type: "completed",
            newVersion: manifest.version,
            downloadedCount: toDownload.length,
        };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("[Sync] Sync failed:", err.message);

        const latestState = await getSyncState(playlistUUID);
        await putSyncState({
            ...latestState,
            status: "error",
            failureReason: err.message,
            retryCount: latestState.retryCount + 1,
            nextRetryAt: null, // scheduler will set this
        });

        return { type: "failed", error: err };
    }
}
