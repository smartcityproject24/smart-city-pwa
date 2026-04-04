<script lang="ts">
    import { onDestroy, tick, untrack } from "svelte";
    import { getContext } from "svelte";
    import type { OfflineContext } from "@core";
    import type { PlaylistItem, PlaylistRecord } from "@core/offline/offline-db";
    import { getPlaylist, getAllVideoRecords } from "@core/offline/offline-db";
    import { videoFileExists } from "@core/offline/opfs";

    import { BlockRenderer } from "@components/block-renderer";
    import type { AuthContext, Block, BrightnessContext, UserContext } from "@core";
    import type { ApiReadyContext, PageContext } from "@core/types";
    import type { LoggingContext } from "@core";
    import { playlistService } from "@api/services/playlist.service";
    import { fileService } from "@api/services/file.service";
    import type { PlaylistContent } from "@api/types/playlist.types";
    import { Loader } from "@components/ui/loader";
    import { Error as ErrorComponent } from "@components/ui/error";
    import { ApiError } from "@api/types/errors";
    import { clearFilesCache } from "@core/pwa/cache";
    import { SplashLogo } from "@components/ui";
    import { GasStationWidget, BoardTypesEnum } from "@/widgets/gas-station";
    import type { PlaylistsItem } from "@api/types/dashboard.types";

    let {
        blocks = [],
        width = undefined,
        height = undefined,
        positionX = undefined,
        positionY = undefined,
        playlistUUID = undefined,
        uuid = undefined,
        payload = undefined,
    }: {
        blocks?: Block[];
        width?: number;
        height?: number;
        positionX?: number;
        positionY?: number;
        playlistUUID?: string;
        uuid?: string;
        payload?: {
            settings?: {
                settingType: string;
                settingName: string;
                settingValue: string;
            }[];
            playlists?: PlaylistsItem[];
        };
    } = $props();

    const { isReady } = getContext<ApiReadyContext>("api");
    const { opacity } = getContext<BrightnessContext>("brightness");
    const { clearTokens } = getContext<AuthContext>("auth");
    const { dashboardUUID, clearUserData } = getContext<UserContext>("user");
    const { logger } = getContext<LoggingContext>("logging");
    const { pageInfo } = getContext<PageContext>("page");
    const { isOfflineReady, getVideoObjectUrl, registerPlaylist } =
        getContext<OfflineContext>("offline");

    // ── Offline adapter ────────────────────────────────────────────────────
    // Converts PlaylistItem[] (from OPFS/IDB) to PlaylistContent[].
    // item.id === fileUUID — all downstream logging and loading works unchanged.
    function itemsToContents(items: PlaylistItem[]): PlaylistContent[] {
        return [...items]
            .sort((a, b) => a.order - b.order)
            .map((item) => ({
                contentUUID: item.id,
                contentName: "",
                coverUUID: "",
                fileUUID: item.id,
                fileType: "VIDEO",
                contentType: "VIDEO",
                contentWidth: 0,
                contentHeight: 0,
                contentSize: 0,
                contentDuration: item.durationSeconds,
            }));
    }

    const handleLogout = async () => {
        await clearTokens();
        clearUserData();
    };

    let videoElement = $state<HTMLVideoElement | undefined>(undefined);
    let videoElement2 = $state<HTMLVideoElement | undefined>(undefined);
    let edgeVideoElement = $state<HTMLVideoElement | undefined>(undefined);
    let edgeVideoElement2 = $state<HTMLVideoElement | undefined>(undefined);
    let currentVideoIndex = $state(0);
    let playlistContents = $state<PlaylistContent[]>([]);
    let currentBlobUrl = $state<string | null>(null);
    let currentVideoIndexRight = $state(0);
    let playlistContentsRight = $state<PlaylistContent[]>([]);
    let currentBlobUrlRight = $state<string | null>(null);
    let petrolVideoUrl = $state<string | null>(null);
    let isPetrolVideoPlaying = $state(false);
    let isPetrolVideoPlayingLeft = $state(false);
    let isPetrolVideoPlayingRight = $state(false);
    let isLoadingPlaylist = $state(false);
    let isLoadingPlaylistRight = $state(false);
    let error = $state<ApiError | null>(null);
    let errorRight = $state<ApiError | null>(null);
    let playlistCheckInterval: ReturnType<typeof setInterval> | null = null;

    // Offline-path state
    let offlinePlaylistLeft = $state<PlaylistRecord | null>(null);
    let offlinePlaylistRight = $state<PlaylistRecord | null>(null);
    // Track which playlist version is loaded; number because manifest.version is number
    let loadedVersionLeft = $state<number | null>(null);
    let loadedVersionRight = $state<number | null>(null);
    let pendingPlaylistUpdateLeft = $state(false);
    let pendingPlaylistUpdateRight = $state(false);

    // Check if there are any widget blocks
    const hasWidgets = $derived(
        blocks.some((block) => String(block.type).toUpperCase() === "WIDGET"),
    );

    // true = use OPFS + IDB path; false = use legacy Cache API path
    const isUsingOffline = $derived($isOfflineReady && offlinePlaylistLeft !== null);

    const screenSettings = $derived(payload?.settings ?? []);
    const petrolVideoSetting = $derived(
        screenSettings.find((s) => s.settingType === "PETROL_STATION_VIDEO"),
    );
    const petrolVideoFileUUID = $derived(petrolVideoSetting?.settingValue);
    const dashboardType = $derived($pageInfo?.dashboardType);
    const isDoubleScreen = $derived(
        dashboardType === "PARTNER_NEFT_STATION_DOUBLE",
    );
    const payloadPlaylists = $derived(payload?.playlists ?? []);
    const isDoubleWithTwoPlaylists = $derived(
        isDoubleScreen && payloadPlaylists.length >= 2,
    );
    const leftPlaylistUUID = $derived(
        isDoubleWithTwoPlaylists
            ? payloadPlaylists[1]?.playlistUUID
            : playlistUUID,
    );
    const rightPlaylistUUID = $derived(
        isDoubleWithTwoPlaylists
            ? payloadPlaylists[0]?.playlistUUID
            : undefined,
    );
    const isFullscreen = $derived(width == null || height == null);
    const screenStyle = $derived(
        isFullscreen
            ? "width: 100%; height: 100vh; height: 100dvh; min-height: 100vh; min-height: 100dvh; top: 0; left: 0;"
            : `width: ${width}px; height: ${height}px; top: ${positionY ?? 0}px; left: ${positionX ?? 0}px;`,
    );

    const isPlaylistChanged = (
        oldContents: PlaylistContent[],
        newContents: PlaylistContent[],
    ): boolean => {
        if (oldContents.length !== newContents.length) return true;

        return oldContents.some((old, index) => {
            const newItem = newContents[index];
            return old.fileUUID !== newItem?.fileUUID;
        });
    };

    const loadVideoAtIndex = async (index: number, side: 'left' | 'right' = 'left'): Promise<void> => {
        const contents = side === 'left' ? playlistContents : playlistContentsRight;
        if (index < 0 || index >= contents.length) return;

        try {
            let newUrl: string;

            if (isUsingOffline) {
                // OPFS path: read directly from local file system (no network)
                newUrl = await getVideoObjectUrl(contents[index].fileUUID);
            } else {
                // Legacy path: Cache API / network
                const blob = await fileService.getFileBlob(contents[index].fileUUID);
                if (!(blob instanceof Blob)) return;
                newUrl = URL.createObjectURL(blob);
            }

            if (side === 'left') {
                const oldUrl = currentBlobUrl;
                currentBlobUrl = newUrl;
                if (oldUrl) URL.revokeObjectURL(oldUrl);
            } else {
                const oldUrl = currentBlobUrlRight;
                currentBlobUrlRight = newUrl;
                if (oldUrl) URL.revokeObjectURL(oldUrl);
            }
        } catch (err) {
            console.warn(`[Screen] Failed to load video at index ${index}:`, err);
        }
    };

    const handleVideoEnded = async (isSecondVideo = false) => {
        // Apply a pending offline playlist update after the current video ends
        // so playback is never interrupted mid-video
        if (!isSecondVideo && pendingPlaylistUpdateLeft) {
            pendingPlaylistUpdateLeft = false;
            const pl = offlinePlaylistLeft;
            if (pl && pl.version !== loadedVersionLeft) {
                playlistContents = itemsToContents(pl.items);
                currentVideoIndex = 0;
                loadedVersionLeft = pl.version;
                await loadVideoAtIndex(0, 'left');
                await tick();
                videoElement?.play().catch(() => {});
                return;
            }
        }
        if (isSecondVideo && isDoubleWithTwoPlaylists && pendingPlaylistUpdateRight) {
            pendingPlaylistUpdateRight = false;
            const pl = offlinePlaylistRight;
            if (pl && pl.version !== loadedVersionRight) {
                playlistContentsRight = itemsToContents(pl.items);
                currentVideoIndexRight = 0;
                loadedVersionRight = pl.version;
                await loadVideoAtIndex(0, 'right');
                await tick();
                videoElement2?.play().catch(() => {});
                return;
            }
        }

        if (isDoubleWithTwoPlaylists) {
            if (isSecondVideo) {
                if (isPetrolVideoPlayingRight) {
                    isPetrolVideoPlayingRight = false;
                    currentVideoIndexRight = playlistContentsRight.length > 0
                        ? (currentVideoIndexRight + 1) % playlistContentsRight.length
                        : 0;
                    await loadVideoAtIndex(currentVideoIndexRight, 'right');
                    await tick();
                    videoElement2?.play().catch(() => {});
                    return;
                }
                if (playlistContentsRight.length === 0) return;
                if (petrolVideoUrl) {
                    isPetrolVideoPlayingRight = true;
                } else {
                    currentVideoIndexRight = (currentVideoIndexRight + 1) % playlistContentsRight.length;
                    await loadVideoAtIndex(currentVideoIndexRight, 'right');
                }
                await tick();
                videoElement2?.play().catch(() => {});
            } else {
                if (isPetrolVideoPlayingLeft) {
                    isPetrolVideoPlayingLeft = false;
                    currentVideoIndex = playlistContents.length > 0
                        ? (currentVideoIndex + 1) % playlistContents.length
                        : 0;
                    await loadVideoAtIndex(currentVideoIndex);
                    await tick();
                    videoElement?.play().catch(() => {});
                    return;
                }
                if (playlistContents.length === 0 && !petrolVideoUrl) return;
                if (petrolVideoUrl) {
                    isPetrolVideoPlayingLeft = true;
                } else {
                    currentVideoIndex = (currentVideoIndex + 1) % playlistContents.length;
                    await loadVideoAtIndex(currentVideoIndex);
                }
                await tick();
                videoElement?.play().catch(() => {});
            }
            return;
        }

        if (isPetrolVideoPlaying) {
            isPetrolVideoPlaying = false;
            currentVideoIndex = playlistContents.length > 0
                ? (currentVideoIndex + 1) % playlistContents.length
                : 0;
            await loadVideoAtIndex(currentVideoIndex);
            await tick();
            videoElement?.play().catch(() => {});
            videoElement2?.play().catch(() => {});
            return;
        }

        if (playlistContents.length === 0 && !petrolVideoUrl) return;

        if (videoElement && videoElement2) {
            if (
                !isSecondVideo &&
                videoElement2.currentTime < videoElement2.duration - 0.1
            ) {
                videoElement2.currentTime = videoElement.currentTime;
            } else if (
                isSecondVideo &&
                videoElement.currentTime < videoElement.duration - 0.1
            ) {
                videoElement.currentTime = videoElement2.currentTime;
            }
        }

        if (petrolVideoUrl) {
            isPetrolVideoPlaying = true;
        } else {
            currentVideoIndex = (currentVideoIndex + 1) % playlistContents.length;
            await loadVideoAtIndex(currentVideoIndex);
        }
        await tick();
        videoElement?.play().catch(() => {});
        if (videoElement2) videoElement2.play().catch(() => {});
    };

    const handleVideoPlay = (isSecondVideo = false) => {
        const element = isSecondVideo ? videoElement2 : videoElement;
        if (!element || $opacity === 0 || element.currentTime > 0.5) return;

        if (
            !isDoubleWithTwoPlaylists &&
            isDoubleScreen &&
            videoElement &&
            videoElement2
        ) {
            if (!isSecondVideo && videoElement2.paused) {
                videoElement2.currentTime = videoElement.currentTime;
                videoElement2.play().catch(() => {});
            } else if (isSecondVideo && videoElement.paused) {
                videoElement.currentTime = videoElement2.currentTime;
                videoElement.play().catch(() => {});
            }
        }

        const showingPetrol = isDoubleWithTwoPlaylists
            ? isSecondVideo
                ? isPetrolVideoPlayingRight
                : isPetrolVideoPlayingLeft
            : isPetrolVideoPlaying;
        if (showingPetrol || !$dashboardUUID) return;

        if (
            isSecondVideo &&
            isDoubleWithTwoPlaylists &&
            rightPlaylistUUID &&
            playlistContentsRight[currentVideoIndexRight]
        ) {
            const currentContent =
                playlistContentsRight[currentVideoIndexRight];
            logger.logVideoStart($dashboardUUID, {
                playlistUUID: rightPlaylistUUID,
                fileUUID: currentContent.fileUUID,
                videoIndex: currentVideoIndexRight,
                screenUUID: uuid,
            });
        } else if (
            !isSecondVideo &&
            (leftPlaylistUUID ?? playlistUUID) &&
            playlistContents[currentVideoIndex]
        ) {
            const currentContent = playlistContents[currentVideoIndex];
            logger.logVideoStart($dashboardUUID, {
                playlistUUID: leftPlaylistUUID ?? playlistUUID ?? "",
                fileUUID: currentContent.fileUUID,
                videoIndex: currentVideoIndex,
                screenUUID: uuid,
            });
        }
    };

    const handleVideoError = () => {
        if (!videoElement) return;
        if (
            !isPetrolVideoPlaying &&
            (leftPlaylistUUID ?? playlistUUID) &&
            playlistContents[currentVideoIndex] &&
            $dashboardUUID
        ) {
            const currentContent = playlistContents[currentVideoIndex];
            const err = videoElement.error;
            logger.logVideoError($dashboardUUID, {
                playlistUUID: leftPlaylistUUID ?? playlistUUID ?? "",
                fileUUID: currentContent.fileUUID,
                error: err?.message || "Unknown video error",
                errorCode: err?.code?.toString() || "UNKNOWN",
                screenUUID: uuid,
            });
        }
    };

    const handleVideoErrorRight = () => {
        if (!videoElement2 || !isDoubleWithTwoPlaylists) return;
        if (
            !isPetrolVideoPlaying &&
            rightPlaylistUUID &&
            playlistContentsRight[currentVideoIndexRight] &&
            $dashboardUUID
        ) {
            const currentContent =
                playlistContentsRight[currentVideoIndexRight];
            const err = videoElement2.error;
            logger.logVideoError($dashboardUUID, {
                playlistUUID: rightPlaylistUUID,
                fileUUID: currentContent.fileUUID,
                error: err?.message || "Unknown video error",
                errorCode: err?.code?.toString() || "UNKNOWN",
                screenUUID: uuid,
            });
        }
    };

    const loadPlaylist = async (uuid: string) => {
        if (!uuid) {
            return;
        }

        if (!$isReady) {
            return;
        }

        isLoadingPlaylist = true;
        error = null;

        try {
            const contents = await playlistService.getContents(uuid);

            if (!contents || contents.length === 0) {
                if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
                playlistContents = [];
                currentVideoIndex = 0;
                if (videoElement) {
                    videoElement.pause();
                    videoElement.removeAttribute("src");
                    videoElement.load();
                }
                return;
            }

            // Pre-cache files to disk (Cache API) sequentially — minimal RAM usage
            const validContents: PlaylistContent[] = [];
            for (const content of contents) {
                const available = await fileService.precacheFile(content.fileUUID);
                if (available) {
                    validContents.push(content);
                } else if (!navigator.onLine) {
                    console.warn(`[Screen] File ${content.fileUUID} not available offline, not in cache`);
                }
            }

            // OPFS could have taken over during async precache work — don't overwrite
            if (isUsingOffline) return;

            if (validContents.length === 0) {
                if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
                playlistContents = [];
                currentVideoIndex = 0;
                if (videoElement) {
                    videoElement.pause();
                    videoElement.removeAttribute("src");
                    videoElement.load();
                }
                return;
            }

            playlistContents = validContents;
            currentVideoIndex = 0;

            // Load only first video blob into memory
            await loadVideoAtIndex(0);
        } catch (err) {
            if (err instanceof ApiError) {
                error = err;
            } else {
                error = new ApiError({
                    code: 0,
                    message:
                        err instanceof Error ? err.message : "unknown_error",
                    error: "Unknown",
                    detailedMessages: [],
                });
            }
        } finally {
            isLoadingPlaylist = false;
        }
    };

    const loadPlaylistRight = async (uuid: string) => {
        if (!uuid || !$isReady) return;

        isLoadingPlaylistRight = true;
        errorRight = null;

        try {
            const contents = await playlistService.getContents(uuid);

            if (!contents || contents.length === 0) {
                if (currentBlobUrlRight) { URL.revokeObjectURL(currentBlobUrlRight); currentBlobUrlRight = null; }
                playlistContentsRight = [];
                currentVideoIndexRight = 0;
                if (videoElement2) {
                    videoElement2.pause();
                    videoElement2.removeAttribute("src");
                    videoElement2.load();
                }
                return;
            }

            // Pre-cache files to disk (Cache API) sequentially — minimal RAM usage
            const validContents: PlaylistContent[] = [];
            for (const content of contents) {
                const available = await fileService.precacheFile(content.fileUUID);
                if (available) {
                    validContents.push(content);
                } else if (!navigator.onLine) {
                    console.warn(`[Screen] File ${content.fileUUID} not available offline, not in cache`);
                }
            }

            // OPFS could have taken over during async precache work — don't overwrite
            if (isUsingOffline) return;

            if (validContents.length === 0) {
                if (currentBlobUrlRight) { URL.revokeObjectURL(currentBlobUrlRight); currentBlobUrlRight = null; }
                playlistContentsRight = [];
                currentVideoIndexRight = 0;
                if (videoElement2) {
                    videoElement2.pause();
                    videoElement2.removeAttribute("src");
                    videoElement2.load();
                }
                return;
            }

            playlistContentsRight = validContents;
            currentVideoIndexRight = 0;

            // Load only first video blob into memory
            await loadVideoAtIndex(0, 'right');
        } catch (err) {
            if (err instanceof ApiError) {
                errorRight = err;
            } else {
                errorRight = new ApiError({
                    code: 0,
                    message:
                        err instanceof Error ? err.message : "unknown_error",
                    error: "Unknown",
                    detailedMessages: [],
                });
            }
        } finally {
            isLoadingPlaylistRight = false;
        }
    };

    const loadPetrolVideo = async (fileUUID: string) => {
        if (!fileUUID || !$isReady) return;
        try {
            const blob = await fileService
                .getFileBlob(fileUUID, true)
                .catch((err) => {
                    if (!navigator.onLine) {
                        console.warn(
                            `[Screen] Petrol video ${fileUUID} not available offline, not in cache`,
                        );
                    }
                    return err;
                });
            if (blob && blob instanceof Blob) {
                if (petrolVideoUrl) {
                    URL.revokeObjectURL(petrolVideoUrl);
                }
                petrolVideoUrl = URL.createObjectURL(blob);
            } else {
                console.warn(
                    `[Screen] Failed to load petrol video blob for ${fileUUID}`,
                );
            }
        } catch (err) {
            if (err instanceof ApiError) {
                console.error(
                    `[Screen] ApiError loading petrol video:`,
                    err.message,
                );
            } else {
                console.error("[Screen] Failed to load petrol video:", err);
            }
        }
    };

    $effect(() => {
        if (isUsingOffline) return; // offline path: activePlaylistLeft/Right effects handle loading

        if (isDoubleWithTwoPlaylists) {
            if (!leftPlaylistUUID && !rightPlaylistUUID) {
                untrack(() => {
                    if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
                    playlistContents = [];
                    if (currentBlobUrlRight) { URL.revokeObjectURL(currentBlobUrlRight); currentBlobUrlRight = null; }
                    playlistContentsRight = [];
                });
                return;
            }
            if ($isReady && leftPlaylistUUID) untrack(() => loadPlaylist(leftPlaylistUUID));
            if ($isReady && rightPlaylistUUID)
                untrack(() => loadPlaylistRight(rightPlaylistUUID));
        } else {
            if (playlistUUID && $isReady) {
                untrack(() => loadPlaylist(playlistUUID));
            } else if (!playlistUUID) {
                untrack(() => {
                    if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
                    playlistContents = [];
                });
            }
        }
    });

    $effect(() => {
        if (petrolVideoFileUUID && $isReady) {
            loadPetrolVideo(petrolVideoFileUUID);
        }
    });

    // ── Offline effects ───────────────────────────────────────────────────────
    // Register each playlist for background sync. When a new version arrives,
    // apply it immediately on first load or queue it as pending for after the
    // current video finishes.

    async function logOfflineReadiness(playlistUUID: string, side: 'left' | 'right') {
        const pl = await getPlaylist(playlistUUID);
        if (!pl || pl.items.length === 0) {
            console.warn(`[Offline:${side}] ❌ Плейлист ${playlistUUID} — нет данных в IDB, видео НЕ готово к оффлайн`);
            return;
        }

        const allVideos = await getAllVideoRecords();
        const videoMap = new Map(allVideos.map(v => [v.id, v]));

        let readyCount = 0;
        for (const item of pl.items) {
            const record = videoMap.get(item.id);
            const inOpfs = await videoFileExists(item.id);
            const status = record?.status ?? 'no_record';
            const ready = status === 'ready' && inOpfs;
            if (ready) readyCount++;
            console.log(
                `[Offline:${side}] ${ready ? '✅' : '❌'} ${item.id} | IDB: ${status} | OPFS: ${inOpfs ? 'есть' : 'нет'}`
            );
        }

        if (readyCount === pl.items.length) {
            console.log(`[Offline:${side}] ✅ Все ${readyCount}/${pl.items.length} видео готовы — работает БЕЗ интернета`);
        } else {
            console.warn(`[Offline:${side}] ⚠️ Готово ${readyCount}/${pl.items.length} видео — оффлайн НЕ полный`);
        }
    }

    function applyOfflinePlaylist(pl: PlaylistRecord, side: 'left' | 'right') {
        if (side === 'left') {
            if (pl.version === loadedVersionLeft) return;
            if (loadedVersionLeft === null && playlistContents.length > 0) {
                // Legacy path is actively playing — wait for current video to end
                // before switching to OPFS path, so playback is not interrupted
                pendingPlaylistUpdateLeft = true;
            } else if (loadedVersionLeft === null) {
                // Nothing is playing yet — apply immediately
                playlistContents = itemsToContents(pl.items);
                currentVideoIndex = 0;
                loadedVersionLeft = pl.version;
                loadVideoAtIndex(0, 'left').then(async () => {
                    await tick();
                    videoElement?.play().catch(() => {});
                });
            } else {
                // Already on offline path — queue update for after current video ends
                pendingPlaylistUpdateLeft = true;
            }
        } else {
            if (pl.version === loadedVersionRight) return;
            if (loadedVersionRight === null && playlistContentsRight.length > 0) {
                pendingPlaylistUpdateRight = true;
            } else if (loadedVersionRight === null) {
                playlistContentsRight = itemsToContents(pl.items);
                currentVideoIndexRight = 0;
                loadedVersionRight = pl.version;
                loadVideoAtIndex(0, 'right').then(async () => {
                    await tick();
                    videoElement2?.play().catch(() => {});
                });
            } else {
                pendingPlaylistUpdateRight = true;
            }
        }
    }

    $effect(() => {
        const uuid = leftPlaylistUUID;
        if (!uuid || !$isOfflineReady) return;

        // Load whatever is already in IDB immediately (only if has actual items)
        getPlaylist(uuid).then((pl) => {
            logOfflineReadiness(uuid, 'left');
            if (pl && pl.items.length > 0) {
                offlinePlaylistLeft = pl;
                untrack(() => applyOfflinePlaylist(pl, 'left'));
            }
        });

        // Register for future sync updates
        return registerPlaylist(uuid, () => {
            getPlaylist(uuid).then((pl) => {
                logOfflineReadiness(uuid, 'left');
                if (pl && pl.items.length > 0) {
                    offlinePlaylistLeft = pl;
                    applyOfflinePlaylist(pl, 'left');
                }
            });
        });
    });

    $effect(() => {
        const uuid = rightPlaylistUUID;
        if (!uuid || !$isOfflineReady || !isDoubleWithTwoPlaylists) return;

        getPlaylist(uuid).then((pl) => {
            logOfflineReadiness(uuid, 'right');
            if (pl && pl.items.length > 0) {
                offlinePlaylistRight = pl;
                untrack(() => applyOfflinePlaylist(pl, 'right'));
            }
        });

        return registerPlaylist(uuid, () => {
            getPlaylist(uuid).then((pl) => {
                logOfflineReadiness(uuid, 'right');
                if (pl && pl.items.length > 0) {
                    offlinePlaylistRight = pl;
                    applyOfflinePlaylist(pl, 'right');
                }
            });
        });
    });

    $effect(() => {
        if (isUsingOffline) return; // offline path: sync-scheduler handles updates

        const leftUuid = isDoubleWithTwoPlaylists
            ? leftPlaylistUUID
            : playlistUUID;
        if (!leftUuid || !$isReady) {
            if (playlistCheckInterval) {
                clearInterval(playlistCheckInterval);
                playlistCheckInterval = null;
            }
            return;
        }

        if ($opacity === 0) {
            if (playlistCheckInterval) {
                clearInterval(playlistCheckInterval);
                playlistCheckInterval = null;
            }
            return;
        }

        playlistCheckInterval = setInterval(async () => {
            if (!$isReady) return;

            try {
                if (isDoubleWithTwoPlaylists && leftPlaylistUUID) {
                    const newLeft =
                        await playlistService.getContents(leftPlaylistUUID);
                    if (isPlaylistChanged(playlistContents, newLeft)) {
                        if (navigator.onLine) await clearFilesCache();
                        await loadPlaylist(leftPlaylistUUID);
                    }
                }
                if (isDoubleWithTwoPlaylists && rightPlaylistUUID) {
                    const newRight =
                        await playlistService.getContents(rightPlaylistUUID);
                    if (isPlaylistChanged(playlistContentsRight, newRight)) {
                        if (navigator.onLine) await clearFilesCache();
                        await loadPlaylistRight(rightPlaylistUUID);
                    }
                }
                if (!isDoubleWithTwoPlaylists && playlistUUID) {
                    const newContents =
                        await playlistService.getContents(playlistUUID);
                    if (isPlaylistChanged(playlistContents, newContents)) {
                        if (navigator.onLine) await clearFilesCache();
                        await loadPlaylist(playlistUUID);
                    }
                }
            } catch (err) {}
        }, 60000);

        return () => {
            if (playlistCheckInterval) {
                clearInterval(playlistCheckInterval);
                playlistCheckInterval = null;
            }
        };
    });

    $effect(() => {
        if (!videoElement) return;
        if ($opacity === 0) {
            if (!videoElement.paused) videoElement.pause();
            if (videoElement2 && !videoElement2.paused) videoElement2.pause();
            if (edgeVideoElement && !edgeVideoElement.paused)
                edgeVideoElement.pause();
            if (edgeVideoElement2 && !edgeVideoElement2.paused)
                edgeVideoElement2.pause();
        } else {
            if (videoElement.paused && videoElement.readyState >= 2) {
                videoElement.play().catch((err) => {
                    if (err.name !== "AbortError") {
                        console.error("[Screen] Failed to resume video:", err);
                    }
                });
            }
            if (
                isDoubleScreen &&
                videoElement2 &&
                videoElement2.paused &&
                videoElement2.readyState >= 2
            ) {
                videoElement2.play().catch((err) => {
                    if (err.name !== "AbortError") {
                        console.error(
                            "[Screen] Failed to resume video 2:",
                            err,
                        );
                    }
                });
            }
            if (
                isDoubleScreen &&
                edgeVideoElement &&
                edgeVideoElement.paused &&
                edgeVideoElement.readyState >= 2
            ) {
                edgeVideoElement.play().catch((err) => {
                    if (err.name !== "AbortError") {
                        console.error(
                            "[Screen] Failed to resume edge video:",
                            err,
                        );
                    }
                });
            }
            if (
                isDoubleScreen &&
                edgeVideoElement2 &&
                edgeVideoElement2.paused &&
                edgeVideoElement2.readyState >= 2
            ) {
                edgeVideoElement2.play().catch((err) => {
                    if (err.name !== "AbortError") {
                        console.error(
                            "[Screen] Failed to resume edge video 2:",
                            err,
                        );
                    }
                });
            }
        }
    });

    const hasContent = $derived(
        playlistContents.length > 0 || playlistContentsRight.length > 0 || !!petrolVideoUrl,
    );
    const showLoader = $derived(
        (isLoadingPlaylist || isLoadingPlaylistRight) && !hasContent,
    );

    onDestroy(() => {
        if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        if (currentBlobUrlRight) URL.revokeObjectURL(currentBlobUrlRight);
        if (petrolVideoUrl) URL.revokeObjectURL(petrolVideoUrl);
        if (playlistCheckInterval) clearInterval(playlistCheckInterval);
    });
</script>

<div class="screen" style={screenStyle}>
    {#if showLoader}
        <Loader />
    {:else if (error ?? errorRight) && !hasContent}
        <ErrorComponent
            error={error ?? errorRight!}
            onRetry={() => {
                error = null;
                errorRight = null;
                if (isDoubleWithTwoPlaylists) {
                    if (leftPlaylistUUID) loadPlaylist(leftPlaylistUUID);
                    if (rightPlaylistUUID) loadPlaylistRight(rightPlaylistUUID);
                } else if (playlistUUID) {
                    loadPlaylist(playlistUUID);
                }
            }}
            onLogout={handleLogout}
        />
    {:else if hasContent}
        {#if isDoubleScreen}
            <div class="double-screen-container">
                <div class="video-wrapper">
                    <video
                        bind:this={edgeVideoElement}
                        class="edge-video"
                        src="/petrol-station/pn_edge.mp4"
                        autoplay
                        muted
                        playsinline
                        preload="auto"
                        loop
                    ></video>
                    <video
                        bind:this={videoElement}
                        class="screen-video screen-video-left"
                        src={(isDoubleWithTwoPlaylists
                            ? isPetrolVideoPlayingLeft
                            : isPetrolVideoPlaying) && petrolVideoUrl
                            ? petrolVideoUrl
                            : (currentBlobUrl ?? "")}
                        autoplay
                        muted
                        playsinline
                        preload="metadata"
                        loop={(isDoubleWithTwoPlaylists
                            ? !isPetrolVideoPlayingLeft
                            : !isPetrolVideoPlaying) &&
                            (isDoubleWithTwoPlaylists
                                ? playlistContents.length <= 1 && !petrolVideoUrl
                                : playlistContents.length === 1 && !petrolVideoUrl)}
                        onended={() => handleVideoEnded(false)}
                        onplay={() => handleVideoPlay(false)}
                        onerror={handleVideoError}
                    ></video>
                    {#if (isDoubleWithTwoPlaylists ? isPetrolVideoPlayingLeft : isPetrolVideoPlaying) && screenSettings.length > 0}
                        <GasStationWidget
                            boardType={BoardTypesEnum.PARTNER_NEFT_STATION_DOUBLE}
                            settings={screenSettings}
                        />
                    {/if}
                </div>
                <div class="video-wrapper">
                    <video
                        bind:this={videoElement2}
                        class="screen-video screen-video-right"
                        src={(isDoubleWithTwoPlaylists
                            ? isPetrolVideoPlayingRight
                            : isPetrolVideoPlaying) && petrolVideoUrl
                            ? petrolVideoUrl
                            : ((isDoubleWithTwoPlaylists
                                  ? currentBlobUrlRight
                                  : currentBlobUrl) ?? "")}
                        autoplay
                        muted
                        playsinline
                        preload="metadata"
                        loop={(isDoubleWithTwoPlaylists
                            ? !isPetrolVideoPlayingRight
                            : !isPetrolVideoPlaying) &&
                            (isDoubleWithTwoPlaylists
                                ? playlistContentsRight.length <= 1 && !petrolVideoUrl
                                : playlistContents.length === 1 && !petrolVideoUrl)}
                        onended={() => handleVideoEnded(true)}
                        onplay={() => handleVideoPlay(true)}
                        onerror={isDoubleWithTwoPlaylists
                            ? handleVideoErrorRight
                            : handleVideoError}
                    ></video>
                    <video
                        bind:this={edgeVideoElement2}
                        class="edge-video"
                        src="/petrol-station/pn_edge.mp4"
                        autoplay
                        muted
                        playsinline
                        preload="auto"
                        loop
                    ></video>
                    {#if (isDoubleWithTwoPlaylists ? isPetrolVideoPlayingRight : isPetrolVideoPlaying) && screenSettings.length > 0}
                        <GasStationWidget
                            boardType={BoardTypesEnum.PARTNER_NEFT_STATION_DOUBLE}
                            settings={screenSettings}
                        />
                    {/if}
                </div>
            </div>
        {:else}
            <video
                bind:this={videoElement}
                class="screen-video"
                src={isPetrolVideoPlaying && petrolVideoUrl
                    ? petrolVideoUrl
                    : currentBlobUrl}
                autoplay
                muted
                playsinline
                preload="metadata"
                loop={!isPetrolVideoPlaying &&
                    playlistContents.length === 1 &&
                    !petrolVideoUrl}
                onended={() => handleVideoEnded(false)}
                onplay={() => handleVideoPlay(false)}
                onerror={handleVideoError}
            ></video>
            {#if isPetrolVideoPlaying && screenSettings.length > 0}
                <GasStationWidget
                    boardType={BoardTypesEnum.PETROL_STATION}
                    settings={screenSettings}
                />
            {/if}
        {/if}
    {:else if !hasWidgets}
        <SplashLogo />
    {/if}
    <div>
        <BlockRenderer {blocks} />
    </div>
</div>

<style lang="scss">
    .screen {
        position: absolute;
        min-height: 100vh;
        min-height: 100dvh;
    }

    .screen-video {
        height: 100%;
        width: 100%;
        object-fit: fill;
        pointer-events: none;
    }

    .double-screen-container {
        display: flex;
        width: 100%;
        height: 100%;
        position: relative;
    }

    .video-wrapper {
        position: relative;
        width: 50%;
        height: 100%;
        overflow: hidden;
        padding-left: 64px;
        box-sizing: border-box;
    }

    .screen-video-left {
        width: 100%;
        height: 100%;
    }

    .screen-video-right {
        width: 100%;
        height: 100%;
    }

    .edge-video {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 64px;
        max-width: 64px;
        object-fit: cover;
        pointer-events: none;
        z-index: 1;
        box-sizing: border-box;
    }
</style>
