import type { Readable } from "svelte/store";

export type OfflineContext = {
    /**
     * True once the startup integrity check has run.
     * Screen.svelte uses this to guard registerPlaylist calls.
     */
    isOfflineReady: Readable<boolean>;

    /**
     * Create an object URL for a video file stored in OPFS.
     * The caller is responsible for revoking via URL.revokeObjectURL().
     */
    getVideoObjectUrl: (id: string) => Promise<string>;

    /**
     * Register a playlist for background sync.
     *
     * - Starts a sync scheduler for the given playlistUUID.
     * - Calls onUpdated() after each successful sync (and on BroadcastChannel
     *   updates from other tabs).
     *
     * Returns a cleanup function — call it when the component unmounts or the
     * playlistUUID changes.
     */
    registerPlaylist: (
        playlistUUID: string,
        onUpdated: () => void
    ) => () => void;
};
