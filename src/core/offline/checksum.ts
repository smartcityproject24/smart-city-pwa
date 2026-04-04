/**
 * SHA-256 verification for downloaded video files.
 *
 * crypto.subtle.digest() requires the full ArrayBuffer — not a streaming API.
 * We read the file in chunks via its ReadableStream, concatenate into a single
 * Uint8Array, then hash. Peak memory ≈ 2× file size (chunks array + combined).
 * For files up to ~300 MB this is acceptable on kiosk hardware (8 GB RAM).
 *
 * TODO: for files >300 MB, consider @noble/hashes for true incremental SHA-256.
 */
export async function computeSHA256FromFile(file: File): Promise<string> {
    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    const reader = file.stream().getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLength += value.byteLength;
    }

    // Concatenate all chunks into one buffer
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
    }

    const hashBuffer = await crypto.subtle.digest("SHA-256", combined);

    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Case-insensitive hex comparison.
 */
export function verifyChecksum(computed: string, expected: string): boolean {
    return computed.toLowerCase() === expected.toLowerCase();
}
