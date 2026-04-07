import { API_CONFIG } from "@api/config";

const PROBE_TIMEOUT_MS = 5_000;

/**
 * Issue a HEAD request to verify actual network connectivity.
 *
 * navigator.onLine is unreliable on Android kiosks: the device may report
 * online while connected to Wi-Fi with no actual traffic (captive portal,
 * routing issues). Any HTTP response — even 401, 403, 500 — means the
 * server is reachable. Only a network error or timeout means offline.
 */
export async function probeConnectivity(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

        const response = await fetch(url, {
            method: "HEAD",
            cache: "no-store",
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Any HTTP status means the server responded — we're online
        return response.status > 0;
    } catch {
        return false;
    }
}

/**
 * Probe the Smart City API base URL.
 * Falls back to navigator.onLine if the fetch itself errors unexpectedly.
 */
export async function isServerReachable(): Promise<boolean> {
    const probeUrl = `${API_CONFIG.baseUrl}/smart-city/api/v1/health`;
    return probeConnectivity(probeUrl);
}
