// Origin Private File System helpers
// Layout: opfs://videos/{id}.mp4  — ready file
//         opfs://videos/{id}.tmp  — in-progress download

const VIDEOS_DIR = "videos";

// ─── Directory handle ─────────────────────────────────────────────────────────

let _videosDir: FileSystemDirectoryHandle | null = null;

export async function getVideosDirectory(): Promise<FileSystemDirectoryHandle> {
    if (_videosDir) return _videosDir;

    const root = await navigator.storage.getDirectory();
    _videosDir = await root.getDirectoryHandle(VIDEOS_DIR, { create: true });
    return _videosDir;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Pipe a ReadableStream directly into OPFS as a .tmp file.
 * Memory usage is O(chunk), not O(file).
 * Uses pipeTo() to avoid TypeScript ArrayBufferLike vs ArrayBuffer issues.
 */
export async function writeTmpFile(
    id: string,
    stream: ReadableStream<Uint8Array>
): Promise<void> {
    const dir = await getVideosDirectory();
    const fileHandle = await dir.getFileHandle(`${id}.tmp`, { create: true });
    const writable = await fileHandle.createWritable({ keepExistingData: false });

    // pipeTo closes/aborts the writable on completion or error
    await stream.pipeTo(writable as unknown as WritableStream<Uint8Array>);
}

/**
 * Rename .tmp → .mp4 (atomic commit).
 * OPFS doesn't support rename directly — we copy then delete.
 */
export async function commitTmpToMp4(id: string): Promise<void> {
    const dir = await getVideosDirectory();

    const tmpHandle = await dir.getFileHandle(`${id}.tmp`);
    const tmpFile = await tmpHandle.getFile();

    const mp4Handle = await dir.getFileHandle(`${id}.mp4`, { create: true });
    const writable = await mp4Handle.createWritable({ keepExistingData: false });

    await tmpFile
        .stream()
        .pipeTo(writable as unknown as WritableStream<Uint8Array>);

    // Remove the tmp file after successful copy
    await dir.removeEntry(`${id}.tmp`);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTmpFile(id: string): Promise<void> {
    try {
        const dir = await getVideosDirectory();
        await dir.removeEntry(`${id}.tmp`);
    } catch {
        // File may already be gone — not an error
    }
}

export async function deleteVideoFile(id: string): Promise<void> {
    try {
        const dir = await getVideosDirectory();
        await dir.removeEntry(`${id}.mp4`);
    } catch {
        // File may already be gone — not an error
    }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function videoFileExists(id: string): Promise<boolean> {
    try {
        const dir = await getVideosDirectory();
        await dir.getFileHandle(`${id}.mp4`);
        return true;
    } catch {
        return false;
    }
}

export async function tmpFileExists(id: string): Promise<boolean> {
    try {
        const dir = await getVideosDirectory();
        await dir.getFileHandle(`${id}.tmp`);
        return true;
    } catch {
        return false;
    }
}

/**
 * Returns a File object for a ready .mp4.
 * Use URL.createObjectURL(file) to get a blob URL for <video>.
 */
export async function getVideoFile(id: string): Promise<File> {
    const dir = await getVideosDirectory();
    const handle = await dir.getFileHandle(`${id}.mp4`);
    return handle.getFile();
}

/**
 * Returns a File object for an in-progress .tmp (used for checksum verification).
 */
export async function getTmpFile(id: string): Promise<File> {
    const dir = await getVideosDirectory();
    const handle = await dir.getFileHandle(`${id}.tmp`);
    return handle.getFile();
}

// ─── List ─────────────────────────────────────────────────────────────────────

export interface OPFSEntry {
    name: string;  // full filename, e.g. "abc123.mp4"
    id: string;    // UUID part, e.g. "abc123"
    isTmp: boolean;
}

export async function listVideoFiles(): Promise<OPFSEntry[]> {
    try {
        const dir = await getVideosDirectory();
        const entries: OPFSEntry[] = [];

        for await (const [name] of (dir as any).entries()) {
            if (name.endsWith(".mp4")) {
                entries.push({ name, id: name.slice(0, -4), isTmp: false });
            } else if (name.endsWith(".tmp")) {
                entries.push({ name, id: name.slice(0, -4), isTmp: true });
            }
        }

        return entries;
    } catch (error) {
        console.error("[OPFS] listVideoFiles failed:", error);
        return [];
    }
}

// ─── Full clear ───────────────────────────────────────────────────────────────

/** Удаляет всю папку videos/ из OPFS (все .mp4 и .tmp файлы). */
export async function clearAllVideoFiles(): Promise<void> {
    try {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry(VIDEOS_DIR, { recursive: true });
        _videosDir = null; // сбросить кешированный handle
        console.log("[OPFS] videos/ directory cleared");
    } catch {
        // Директория уже отсутствует — не ошибка
    }
}

// ─── Storage estimate ─────────────────────────────────────────────────────────

export async function getStorageEstimate(): Promise<StorageEstimate> {
    if (!navigator.storage?.estimate) return {};
    return navigator.storage.estimate();
}
