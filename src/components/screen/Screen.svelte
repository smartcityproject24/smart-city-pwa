<script lang="ts">
    import { onDestroy, tick, untrack } from "svelte";
    import { get } from "svelte/store";
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
    import { widgetService } from "@api/services/widget.service";
    import type { ResolvedLibraryWidget } from "@api/types/widget.types";
    import {
        getLibraryWidgetUuidFromBlocks,
    } from "@components/widget/static-widget-codes";

    const LIB_VIDEO_TYPES = new Set(["mp4", "webm", "ogg", "mov", "m4v"]);
    const LIB_IMAGE_TYPES = new Set([
        "png",
        "jpg",
        "jpeg",
        "gif",
        "webp",
        "svg",
        "bmp",
    ]);

    const LIB_LOG = "[Screen:LibraryWidget]";

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
            /** инстанс виджета с конструктора, если пришёл на уровне экрана */
            widgetUUID?: string;
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

    /** Stagger edge clips vs main content — weak SOCs (e.g. Pentium N37xx) overload on 4 decoders at once */
    const EDGE_PLAY_DELAY_FIRST_MS = 220;
    const EDGE_PLAY_DELAY_SECOND_MS = 520;

    function playEdgeWhenVisible(el: HTMLVideoElement, delayMs: number): void {
        window.setTimeout(() => {
            if (get(opacity) === 0) return;
            void el.play().catch((err) => {
                if (err instanceof Error && err.name !== "AbortError") {
                    console.error("[Screen] Failed to play edge video:", err);
                }
            });
        }, delayMs);
    }

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

    let libraryPlaybackPhase = $state<"playlist" | "library">("playlist");
    let resolvedLibraryWidget = $state<ResolvedLibraryWidget | null>(null);
    let libraryWidgetBlobUrl = $state<string | null>(null);
    let isFetchingLibraryWidget = $state(false);
    let libraryWidgetVideoEl = $state<HTMLVideoElement | undefined>(undefined);

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

    const libraryWidgetUuid = $derived.by(() => {
        const fromBlocks = getLibraryWidgetUuidFromBlocks(blocks);
        if (fromBlocks) return fromBlocks;
        const w = payload?.widgetUUID;
        if (typeof w === "string" && w.trim().length >= 8) return w.trim();
        return null;
    });
    const libraryInterleaveActive = $derived(
        Boolean(
            libraryWidgetUuid &&
                !isDoubleScreen &&
                !isDoubleWithTwoPlaylists &&
                !petrolVideoFileUUID,
        ),
    );

    /** Сводка в консоль при смене условий (ищите префикс [Screen:LibraryWidget]) */
    $effect(() => {
        const wid = libraryWidgetUuid;
        const active = libraryInterleaveActive;
        const reasons: string[] = [];
        if (!wid) reasons.push("нет widgetUUID в blocks/payload");
        if (isDoubleScreen) reasons.push("isDoubleScreen (АЗС двойной)");
        if (isDoubleWithTwoPlaylists) reasons.push("isDoubleWithTwoPlaylists");
        if (petrolVideoFileUUID) reasons.push("есть PETROL_STATION_VIDEO");
        console.info(`${LIB_LOG} derived`, {
            screenUUID: uuid ?? null,
            libraryWidgetUuid: wid,
            libraryInterleaveActive: active,
            interleaveBlockedBy: active ? null : reasons,
            isReady: $isReady,
            playlistItems: playlistContents.length,
            phase: libraryPlaybackPhase,
            hasVisual: libraryWidgetHasVisual,
            fetching: isFetchingLibraryWidget,
        });
    });
    const libraryWidgetHasVisual = $derived(
        Boolean(
            resolvedLibraryWidget &&
                (resolvedLibraryWidget.html.length > 0 ||
                    (resolvedLibraryWidget.fileUUID &&
                        (LIB_VIDEO_TYPES.has(resolvedLibraryWidget.fileType) ||
                            LIB_IMAGE_TYPES.has(
                                resolvedLibraryWidget.fileType,
                            )))),
        ),
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

    function revokeLibraryWidgetBlob() {
        if (libraryWidgetBlobUrl) {
            console.info(`${LIB_LOG} revoke blob URL`);
            URL.revokeObjectURL(libraryWidgetBlobUrl);
            libraryWidgetBlobUrl = null;
        }
    }

    async function loadLibraryWidgetAsset(fileUUID: string): Promise<void> {
        console.info(`${LIB_LOG} media request`, {
            fileUUID,
            offline: isUsingOffline,
        });
        revokeLibraryWidgetBlob();
        try {
            let newUrl: string;
            if (isUsingOffline) {
                newUrl = await getVideoObjectUrl(fileUUID);
            } else {
                const blob = await fileService.getFileBlob(fileUUID);
                if (!(blob instanceof Blob)) {
                    console.warn(`${LIB_LOG} media: ответ не Blob`, { fileUUID });
                    return;
                }
                newUrl = URL.createObjectURL(blob);
            }
            libraryWidgetBlobUrl = newUrl;
            console.info(`${LIB_LOG} media OK`, {
                fileUUID,
                blobUrlPrefix: newUrl.slice(0, 32) + "…",
            });
        } catch (err) {
            console.warn(`${LIB_LOG} media FAILED`, { fileUUID, err });
        }
    }

    async function startLibrarySlideMedia(): Promise<void> {
        const r = resolvedLibraryWidget;
        if (!r) {
            console.warn(`${LIB_LOG} startLibrarySlideMedia: нет resolvedLibraryWidget`);
            return;
        }
        await tick();
        if (r.fileUUID && LIB_VIDEO_TYPES.has(r.fileType) && libraryWidgetBlobUrl) {
            const el = libraryWidgetVideoEl;
            if (el) {
                el.currentTime = 0;
                void el.play().catch((e) =>
                    console.warn(`${LIB_LOG} play() виджет-видео`, e),
                );
                console.info(`${LIB_LOG} старт видео фона виджета`);
            } else {
                console.warn(
                    `${LIB_LOG} нет ref на <video> виджета (ещё не смонтирован?)`,
                    { hasBlob: Boolean(libraryWidgetBlobUrl) },
                );
            }
        } else if (r.html.length > 0) {
            console.info(`${LIB_LOG} слайд: HTML overlay / только HTML`, {
                htmlChars: r.html.length,
                hasBlob: Boolean(libraryWidgetBlobUrl),
            });
        } else if (
            r.fileUUID &&
            LIB_IMAGE_TYPES.has(r.fileType) &&
            libraryWidgetBlobUrl
        ) {
            console.info(`${LIB_LOG} слайд: картинка`, { fileUUID: r.fileUUID });
        } else {
            console.warn(`${LIB_LOG} слайд: нечего показать (пустой payload?)`, {
                fileUUID: r.fileUUID,
                fileType: r.fileType,
                htmlChars: r.html.length,
            });
        }
    }

    async function finishLibrarySlideAndGoToPlaylist(): Promise<void> {
        console.info(`${LIB_LOG} конец слайда виджета → плейлист`);
        libraryWidgetVideoEl?.pause();
        if (playlistContents.length === 0) {
            if (libraryWidgetHasVisual) {
                libraryPlaybackPhase = "library";
                await tick();
                await startLibrarySlideMedia();
            } else {
                libraryPlaybackPhase = "playlist";
                console.warn(
                    `${LIB_LOG} solo: нет контента виджета — не зацикливаем пустой library`,
                );
            }
            return;
        }
        libraryPlaybackPhase = "playlist";
        currentVideoIndex = (currentVideoIndex + 1) % playlistContents.length;
        await loadVideoAtIndex(currentVideoIndex);
        await tick();
        videoElement?.play().catch(() => {});
        console.info(`${LIB_LOG} плейлист`, {
            index: currentVideoIndex,
            items: playlistContents.length,
        });
    }

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

        if (
            libraryInterleaveActive &&
            !isSecondVideo &&
            libraryPlaybackPhase === "playlist" &&
            !isPetrolVideoPlaying &&
            !isPetrolVideoPlayingLeft &&
            playlistContents.length > 0
        ) {
            const canShowWidgetSlide =
                libraryWidgetHasVisual || isFetchingLibraryWidget;
            if (!canShowWidgetSlide) {
                console.warn(
                    `${LIB_LOG} слот виджета пропущен: нет данных для показа (часто 403 на GET /widgets/… для роли дашборда — нужен доступ на бэке). Плейлист без паузы на чёрный экран.`,
                    {
                        currentVideoIndex,
                        hasResolved: Boolean(resolvedLibraryWidget),
                        hasVisual: libraryWidgetHasVisual,
                        fetching: isFetchingLibraryWidget,
                    },
                );
                // не переходим в library — ниже сработает обычное переключение ролика
            } else {
                console.info(`${LIB_LOG} ролик плейлиста закончился → фаза library`, {
                    currentVideoIndex,
                    hasResolved: Boolean(resolvedLibraryWidget),
                    hasVisual: libraryWidgetHasVisual,
                    fetching: isFetchingLibraryWidget,
                });
                videoElement?.pause();
                libraryPlaybackPhase = "library";
                await tick();
                await tick();
                await startLibrarySlideMedia();
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

        if (
            playlistContents.length === 0 &&
            !petrolVideoUrl &&
            !(libraryInterleaveActive && libraryWidgetHasVisual)
        ) {
            return;
        }

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

    $effect(() => {
        if (!libraryInterleaveActive) {
            console.info(`${LIB_LOG} fetch effect: interleave выкл — сброс состояния`);
            libraryPlaybackPhase = "playlist";
            resolvedLibraryWidget = null;
            revokeLibraryWidgetBlob();
            isFetchingLibraryWidget = false;
            return;
        }
        const wid = libraryWidgetUuid;
        if (!$isReady || !wid) {
            console.info(`${LIB_LOG} fetch effect: ждём API или нет UUID`, {
                isReady: $isReady,
                wid,
            });
            resolvedLibraryWidget = null;
            revokeLibraryWidgetBlob();
            return;
        }

        let cancelled = false;
        isFetchingLibraryWidget = true;
        console.info(`${LIB_LOG} fetch effect: старт загрузки виджета`, { wid });
        (async () => {
            try {
                const resolved = await widgetService.resolveForPlayback(wid);
                if (cancelled) {
                    console.info(`${LIB_LOG} fetch: отменено (размонт/смена UUID)`);
                    return;
                }
                resolvedLibraryWidget = resolved;
                if (resolved.fileUUID) {
                    await loadLibraryWidgetAsset(resolved.fileUUID);
                } else {
                    console.info(`${LIB_LOG} нет fileUUID у виджета — только HTML или пусто`);
                    revokeLibraryWidgetBlob();
                }
                console.info(`${LIB_LOG} fetch effect: готово`, {
                    hasVisual:
                        resolved.html.length > 0 ||
                        Boolean(resolved.fileUUID),
                });
            } catch (e) {
                console.error(`${LIB_LOG} виджет API ошибка`, e);
                if (e instanceof ApiError && e.code === 403) {
                    console.warn(
                        `${LIB_LOG} 403: токен дашборда не имеет права на /widgets/{uuid}. Разрешите GET /widgets/** для устройства или отдавайте данные виджета в ответе published solution.`,
                    );
                }
                if (!cancelled) {
                    resolvedLibraryWidget = null;
                    revokeLibraryWidgetBlob();
                }
            } finally {
                if (!cancelled) isFetchingLibraryWidget = false;
            }
        })();

        return () => {
            cancelled = true;
        };
    });

    $effect(() => {
        if (!libraryInterleaveActive || !resolvedLibraryWidget) return;
        if (!libraryWidgetHasVisual) return;
        if (playlistContents.length > 0) return;
        if (libraryPlaybackPhase !== "playlist") return;
        if (isFetchingLibraryWidget) return;
        console.info(`${LIB_LOG} solo: только виджет, без роликов плейлиста`);
        libraryPlaybackPhase = "library";
        void (async () => {
            await tick();
            await tick();
            await startLibrarySlideMedia();
        })();
    });

    $effect(() => {
        if (!libraryInterleaveActive) return;
        if (libraryPlaybackPhase !== "library") return;
        const r = resolvedLibraryWidget;
        if (!r) return;
        const hasVideoBg =
            Boolean(r.fileUUID) &&
            LIB_VIDEO_TYPES.has(r.fileType) &&
            Boolean(libraryWidgetBlobUrl);
        if (hasVideoBg) return;
        const ms = Math.max(1, r.durationSec) * 1000;
        console.info(`${LIB_LOG} таймер слайда (html/картинка)`, { ms });
        const id = window.setTimeout(() => {
            console.info(`${LIB_LOG} таймер слайда истёк`);
            void finishLibrarySlideAndGoToPlaylist();
        }, ms);
        return () => clearTimeout(id);
    });

    /** Если уже в library, а контента так и нет (403 и т.д.) — не оставляем чёрный экран */
    $effect(() => {
        if (!libraryInterleaveActive) return;
        if (libraryPlaybackPhase !== "library") return;
        if (libraryWidgetHasVisual || isFetchingLibraryWidget) return;
        if (playlistContents.length === 0) {
            libraryPlaybackPhase = "playlist";
            console.warn(
                `${LIB_LOG} recovery: library без контента, плейлист пуст — сброс фазы`,
            );
            return;
        }
        console.warn(
            `${LIB_LOG} recovery: фаза library без контента → возврат к плейлисту (тот же индекс)`,
        );
        libraryPlaybackPhase = "playlist";
        void tick();
        videoElement?.play().catch(() => {});
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
                playEdgeWhenVisible(edgeVideoElement, EDGE_PLAY_DELAY_FIRST_MS);
            }
            if (
                isDoubleScreen &&
                edgeVideoElement2 &&
                edgeVideoElement2.paused &&
                edgeVideoElement2.readyState >= 2
            ) {
                playEdgeWhenVisible(
                    edgeVideoElement2,
                    EDGE_PLAY_DELAY_SECOND_MS,
                );
            }
        }
    });

    const hasContent = $derived(
        playlistContents.length > 0 ||
            playlistContentsRight.length > 0 ||
            !!petrolVideoUrl ||
            (libraryInterleaveActive && libraryWidgetHasVisual),
    );
    const showLoader = $derived(
        (isLoadingPlaylist ||
            isLoadingPlaylistRight ||
            (libraryInterleaveActive &&
                isFetchingLibraryWidget &&
                !libraryWidgetHasVisual)) &&
            !hasContent,
    );

    onDestroy(() => {
        if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        if (currentBlobUrlRight) URL.revokeObjectURL(currentBlobUrlRight);
        if (petrolVideoUrl) URL.revokeObjectURL(petrolVideoUrl);
        revokeLibraryWidgetBlob();
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
                        muted
                        playsinline
                        preload="metadata"
                        loop
                        onloadeddata={(e) =>
                            playEdgeWhenVisible(
                                e.currentTarget,
                                EDGE_PLAY_DELAY_FIRST_MS,
                            )}
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
                        muted
                        playsinline
                        preload="metadata"
                        loop
                        onloadeddata={(e) =>
                            playEdgeWhenVisible(
                                e.currentTarget,
                                EDGE_PLAY_DELAY_SECOND_MS,
                            )}
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
                class:screen-video--behind-library={libraryInterleaveActive &&
                    libraryPlaybackPhase === "library" &&
                    libraryWidgetHasVisual}
                src={isPetrolVideoPlaying && petrolVideoUrl
                    ? petrolVideoUrl
                    : (currentBlobUrl ?? "")}
                autoplay
                muted
                playsinline
                preload="metadata"
                loop={!libraryInterleaveActive &&
                    !isPetrolVideoPlaying &&
                    playlistContents.length === 1 &&
                    !petrolVideoUrl}
                onended={() => handleVideoEnded(false)}
                onplay={() => handleVideoPlay(false)}
                onerror={handleVideoError}
            ></video>
            {#if libraryInterleaveActive && libraryPlaybackPhase === "library" && resolvedLibraryWidget}
                <div class="library-widget-layer">
                    {#if libraryWidgetBlobUrl && resolvedLibraryWidget.fileUUID && LIB_VIDEO_TYPES.has(resolvedLibraryWidget.fileType)}
                        <video
                            bind:this={libraryWidgetVideoEl}
                            class="library-bg"
                            src={libraryWidgetBlobUrl}
                            autoplay
                            muted
                            playsinline
                            preload="metadata"
                            onloadeddata={(e) =>
                                void e.currentTarget.play().catch(() => {})}
                            onended={() => void finishLibrarySlideAndGoToPlaylist()}
                        ></video>
                    {:else if libraryWidgetBlobUrl && resolvedLibraryWidget.fileUUID && LIB_IMAGE_TYPES.has(resolvedLibraryWidget.fileType)}
                        <img
                            class="library-bg"
                            src={libraryWidgetBlobUrl}
                            alt=""
                        />
                    {/if}
                    {#if resolvedLibraryWidget.html}
                        <iframe
                            title="library-widget-html"
                            class="library-html"
                            srcdoc={resolvedLibraryWidget.html}
                            sandbox="allow-scripts allow-same-origin"
                        ></iframe>
                    {/if}
                </div>
            {/if}
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

    .screen-video--behind-library {
        opacity: 0;
    }

    .library-widget-layer {
        position: absolute;
        inset: 0;
        z-index: 4;
        pointer-events: none;
    }

    .library-bg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: fill;
        pointer-events: none;
    }

    .library-html {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
        background: transparent;
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
