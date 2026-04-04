<script lang="ts">
    import { onMount, setContext } from "svelte";
    import { writable } from "svelte/store";
    import type { Snippet } from "svelte";
    import { getVideoFile } from "./opfs";
    import { runIntegrityCheck } from "./startup-integrity";
    import { startSyncScheduler } from "./sync-scheduler";
    import type { OfflineContext } from "./types";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();

    // ── State ────────────────────────────────────────────────────────────────

    const isOfflineReady = writable(false);

    // ── Context API ──────────────────────────────────────────────────────────

    const getVideoObjectUrl = async (id: string): Promise<string> => {
        const file = await getVideoFile(id);
        return URL.createObjectURL(file);
    };

    /**
     * Register a playlist for background sync.
     *
     * Starts a per-playlist sync scheduler and a BroadcastChannel listener.
     * Calls onUpdated() after each successful sync (cross-tab aware).
     * Returns a cleanup function.
     */
    function registerPlaylist(
        playlistUUID: string,
        onUpdated: () => void
    ): () => void {
        // Listen for sync completions (handles cross-tab updates too)
        const channel = new BroadcastChannel("offline-sync");
        const handler = (event: MessageEvent) => {
            if (
                event.data?.type === "playlist-updated" &&
                event.data.playlistUUID === playlistUUID
            ) {
                onUpdated();
            }
        };
        channel.addEventListener("message", handler);

        // Start background scheduler for this playlist
        const stopScheduler = startSyncScheduler({ playlistUUID });

        return () => {
            stopScheduler();
            channel.removeEventListener("message", handler);
            channel.close();
        };
    }

    setContext<OfflineContext>("offline", {
        isOfflineReady,
        getVideoObjectUrl,
        registerPlaylist,
    });

    // ── Mount ────────────────────────────────────────────────────────────────

    onMount(async () => {
        await runIntegrityCheck();
        isOfflineReady.set(true);
    });
</script>

{@render children?.()}
