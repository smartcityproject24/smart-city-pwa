import {
    getAllVideoRecords,
    putVideoRecord,
    deleteVideoRecord,
    getAllPlaylists,
    commitPending,
} from "./offline-db";
import {
    listVideoFiles,
    deleteTmpFile,
    deleteVideoFile,
} from "./opfs";

/**
 * Startup integrity check — runs once on mount before the player starts.
 *
 * Repairs five crash/inconsistency scenarios:
 *
 * 1. Orphan .tmp files → download was interrupted → delete .tmp, mark IDB corrupt
 * 2. status=downloading with no .mp4 → download didn't finish → mark corrupt
 * 3. status=ready with no .mp4 → file disappeared from OPFS → mark corrupt
 * 4. .mp4 in OPFS with no IDB record → orphan from old session → delete file
 * 5. Playlist with pendingStatus=ready_to_commit → commit was started but
 *    didn't finish (crash between steps) → execute atomic commit
 */
export async function runIntegrityCheck(): Promise<void> {
    console.log("[Integrity] Starting integrity check...");

    try {
        const [opfsEntries, idbRecords] = await Promise.all([
            listVideoFiles(),
            getAllVideoRecords(),
        ]);

        const opfsMp4Ids = new Set(
            opfsEntries.filter((e) => !e.isTmp).map((e) => e.id)
        );
        const opfsTmpIds = new Set(
            opfsEntries.filter((e) => e.isTmp).map((e) => e.id)
        );
        const idbIds = new Set(idbRecords.map((r) => r.id));

        // ── Scenario 1: orphan .tmp files ──────────────────────────────────
        for (const tmpId of opfsTmpIds) {
            console.warn(`[Integrity] Found orphan .tmp: ${tmpId} — deleting`);
            await deleteTmpFile(tmpId);
            const record = idbRecords.find((r) => r.id === tmpId);
            if (record) {
                await putVideoRecord({ ...record, status: "corrupt" });
            }
        }

        // ── Scenarios 2 & 3: IDB records without matching .mp4 ────────────
        for (const record of idbRecords) {
            if (record.status === "corrupt" || record.status === "deleting") {
                continue;
            }
            if (!opfsMp4Ids.has(record.id)) {
                console.warn(
                    `[Integrity] IDB record ${record.id} (status=${record.status}) has no .mp4 — marking corrupt`
                );
                await putVideoRecord({ ...record, status: "corrupt" });
            }
        }

        // ── Scenario 4: .mp4 files in OPFS with no IDB record ─────────────
        for (const mp4Id of opfsMp4Ids) {
            if (!idbIds.has(mp4Id)) {
                console.warn(
                    `[Integrity] Orphan .mp4 in OPFS: ${mp4Id} — deleting`
                );
                await deleteVideoFile(mp4Id);
            }
        }

        // ── Scenario 5: playlists with pending ready_to_commit ────────────
        const playlists = await getAllPlaylists();
        for (const pl of playlists) {
            if (pl.pendingStatus === "ready_to_commit") {
                console.log(
                    `[Integrity] Playlist ${pl.playlistUUID} has pending ready_to_commit — committing`
                );
                await commitPending(pl.playlistUUID);
            }
        }

        console.log("[Integrity] Integrity check complete");
    } catch (error) {
        // Integrity check errors must not crash the app —
        // the player will still try to use whatever is in OPFS.
        console.error("[Integrity] Integrity check failed:", error);
    }
}
