import { API_CONFIG } from "@api/config";
import { apiRequestRaw } from "@api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ManifestItem {
    uuid: string;
    url: string;
    filename: string;
    sizeBytes: number;
    checksumSha256: string;
    durationSeconds: number;
    order: number;
}

export interface PlaylistManifest {
    version: number;
    items: ManifestItem[];
}

// ─── Error ────────────────────────────────────────────────────────────────────

/**
 * Thrown when the backend hasn't deployed the /manifest endpoint yet (404).
 * The sync orchestrator catches this and falls back silently.
 */
export class ManifestNotFoundError extends Error {
    constructor() {
        super("Manifest endpoint not found (404) — backend not yet deployed");
        this.name = "ManifestNotFoundError";
    }
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Fetch the playlist manifest.
 *
 * Returns:
 *   - PlaylistManifest — new data (version changed)
 *   - null             — version unchanged (local optimistic 304)
 *
 * Throws:
 *   - ManifestNotFoundError — 404, backend not deployed yet
 *   - Error                 — network or other server errors
 */
export async function fetchManifest(
    playlistUUID: string,
    currentVersion: number | null = null
): Promise<PlaylistManifest | null> {
    const url = API_CONFIG.endpoints.playlists.getManifest(playlistUUID);

    const response = await apiRequestRaw(url);

    if (response.status === 404) {
        throw new ManifestNotFoundError();
    }

    if (!response.ok) {
        throw new Error(
            `Manifest fetch failed: ${response.status} ${response.statusText}`
        );
    }

    const manifest = (await response.json()) as PlaylistManifest;

    // Local version check: if version hasn't changed, treat as not modified
    if (currentVersion !== null && manifest.version === currentVersion) {
        return null;
    }

    return manifest;
}
