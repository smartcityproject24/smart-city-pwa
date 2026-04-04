import { getSyncState, putSyncState } from "./offline-db";
import { isServerReachable } from "./connectivity";
import { runSync, type SyncResult } from "./sync-orchestrator";

export interface SchedulerOptions {
    playlistUUID: string;
    intervalMs?: number;
    /** Initial backoff delay after first failure. Default: 30 seconds */
    backoffInitialMs?: number;
    /** Maximum backoff delay. Default: 1 hour */
    backoffMaxMs?: number;
}

/**
 * Start the background sync scheduler for a single playlist.
 *
 * Uses setTimeout (not setInterval) so each sync completes before the next
 * one is scheduled. Implements exponential backoff on failures.
 *
 * Returns a cleanup function — call it in onDestroy to stop the scheduler.
 */
export function startSyncScheduler(options: SchedulerOptions): () => void {
    const {
        playlistUUID,
        intervalMs = 3 * 60 * 1000,    // 3 min
        backoffInitialMs = 30 * 1000,   // 30s
        backoffMaxMs = 3 * 60 * 60 * 1000,  // 3h
    } = options;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let isSyncing = false;

    const scheduleNext = (delayMs: number) => {
        if (stopped) return;
        timeoutId = setTimeout(() => doSync(), delayMs);
    };

    const doSync = async () => {
        if (stopped || isSyncing) return;
        isSyncing = true;

        try {
            const result: SyncResult = await runSync(playlistUUID);

            if (result.type === "failed") {
                const state = await getSyncState(playlistUUID);
                const delay = Math.min(
                    backoffInitialMs *
                        Math.pow(2, Math.max(0, state.retryCount - 1)),
                    backoffMaxMs
                );
                const nextRetryAt = Date.now() + delay;
                await putSyncState({ ...state, nextRetryAt });
                console.log(
                    `[Scheduler:${playlistUUID}] Sync failed, retrying in ${Math.round(delay / 1000)}s`
                );
                scheduleNext(delay);
            } else {
                scheduleNext(intervalMs);
            }
        } catch {
            scheduleNext(backoffInitialMs);
        } finally {
            isSyncing = false;
        }
    };

    const handleOnline = async () => {
        if (stopped || isSyncing) return;

        const reachable = await isServerReachable();
        if (!reachable) return;

        console.log(
            `[Scheduler:${playlistUUID}] Network restored — triggering early sync`
        );

        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        doSync();
    };

    window.addEventListener("online", handleOnline);

    const start = async () => {
        const state = await getSyncState(playlistUUID);
        const now = Date.now();

        if (state.nextRetryAt && state.nextRetryAt > now) {
            const remaining = state.nextRetryAt - now;
            console.log(
                `[Scheduler:${playlistUUID}] Resuming backoff, next sync in ${Math.round(remaining / 1000)}s`
            );
            scheduleNext(remaining);
        } else {
            doSync();
        }
    };

    start();

    return () => {
        stopped = true;
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        window.removeEventListener("online", handleOnline);
        console.log(`[Scheduler:${playlistUUID}] Stopped`);
    };
}
