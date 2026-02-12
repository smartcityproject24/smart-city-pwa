<script lang="ts">
    import { onDestroy } from "svelte";
    import { getContext } from "svelte";
    import { fade } from "svelte/transition";

    import { BlockRenderer } from "@components/block-renderer";
    import type { Block, BrightnessContext, UserContext } from "@core";
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
        payload?: { settings?: { settingType: string; settingName: string; settingValue: string }[] };
    } = $props();

    const { isReady } = getContext<ApiReadyContext>("api");
    const { opacity } = getContext<BrightnessContext>("brightness");
    const { dashboardUUID } = getContext<UserContext>("user");
    const { logger } = getContext<LoggingContext>("logging");
    const { pageInfo } = getContext<PageContext>("page");

    let videoElement = $state<HTMLVideoElement | undefined>(undefined);
    let videoElement2 = $state<HTMLVideoElement | undefined>(undefined);
    let edgeVideoElement = $state<HTMLVideoElement | undefined>(undefined);
    let edgeVideoElement2 = $state<HTMLVideoElement | undefined>(undefined);
    let currentVideoIndex = $state(0);
    let playlistContents = $state<PlaylistContent[]>([]);
    let blobUrls = $state<string[]>([]);
    let petrolVideoUrl = $state<string | null>(null);
    let isPetrolVideoPlaying = $state(false);
    let isLoadingPlaylist = $state(false);
    let error = $state<ApiError | null>(null);
    let playlistCheckInterval: ReturnType<typeof setInterval> | null = null;

    // Check if there are any widget blocks
    const hasWidgets = $derived(
        blocks.some((block) => String(block.type).toUpperCase() === "WIDGET")
    );

    const screenSettings = $derived(payload?.settings ?? []);
    const petrolVideoSetting = $derived(
        screenSettings.find((s) => s.settingType === "PETROL_STATION_VIDEO")
    );
    const petrolVideoFileUUID = $derived(petrolVideoSetting?.settingValue);
    const dashboardType = $derived($pageInfo?.dashboardType);
    const isDoubleScreen = $derived(dashboardType === "PARTNER_NEFT_STATION_DOUBLE");
    const isFullscreen = $derived(width == null || height == null);
    const screenStyle = $derived(
        isFullscreen
            ? "width: 100%; height: 100%; top: 0; left: 0;"
            : `width: ${width}px; height: ${height}px; top: ${positionY ?? 0}px; left: ${positionX ?? 0}px;`
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

    const handleVideoEnded = (isSecondVideo = false) => {
        if (blobUrls.length === 0 && !petrolVideoUrl) {
            return;
        }

        // Для двойного экрана синхронизируем оба видео
        if (isDoubleScreen && videoElement && videoElement2) {
            if (!isSecondVideo) {
                // Если закончилось первое видео, синхронизируем второе
                if (videoElement2.currentTime < videoElement2.duration - 0.1) {
                    videoElement2.currentTime = videoElement.currentTime;
                }
            } else {
                // Если закончилось второе видео, синхронизируем первое
                if (videoElement.currentTime < videoElement.duration - 0.1) {
                    videoElement.currentTime = videoElement2.currentTime;
                }
            }
        }

        if (isPetrolVideoPlaying) {
            isPetrolVideoPlaying = false;
            currentVideoIndex = 0;
            return;
        }

        if (currentVideoIndex < blobUrls.length - 1) {
            currentVideoIndex++;
            return;
        }

        if (petrolVideoUrl) {
            isPetrolVideoPlaying = true;
        } else {
            currentVideoIndex = 0;
        }
    };

    const handleVideoPlay = (isSecondVideo = false) => {
        const element = isSecondVideo ? videoElement2 : videoElement;
        if (!element || $opacity === 0 || element.currentTime > 0.5) return;
        
        // Для двойного экрана синхронизируем оба видео при старте
        if (isDoubleScreen && videoElement && videoElement2) {
            if (!isSecondVideo && videoElement2.paused) {
                videoElement2.currentTime = videoElement.currentTime;
                videoElement2.play().catch(() => {});
            } else if (isSecondVideo && videoElement.paused) {
                videoElement.currentTime = videoElement2.currentTime;
                videoElement.play().catch(() => {});
            }
        }

        if (
            !isPetrolVideoPlaying &&
            playlistUUID &&
            playlistContents[currentVideoIndex] &&
            $dashboardUUID
        ) {
            const currentContent = playlistContents[currentVideoIndex];
            logger.logVideoStart($dashboardUUID, {
                playlistUUID,
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
            playlistUUID &&
            playlistContents[currentVideoIndex] &&
            $dashboardUUID
        ) {
            const currentContent = playlistContents[currentVideoIndex];
            const error = videoElement.error;
            logger.logVideoError($dashboardUUID, {
                playlistUUID,
                fileUUID: currentContent.fileUUID,
                error: error?.message || "Unknown video error",
                errorCode: error?.code?.toString() || "UNKNOWN",
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
                blobUrls.forEach((url) => URL.revokeObjectURL(url));
                blobUrls = [];
                playlistContents = [];
                currentVideoIndex = 0;
                if (videoElement) {
                    videoElement.pause();
                    videoElement.removeAttribute("src");
                    videoElement.load();
                }
                return;
            }

            const blobPromises = contents.map((content) =>
                fileService.getFileBlob(content.fileUUID).catch((err) => {
                    if (!navigator.onLine) {
                        console.warn(
                            `[Screen] File ${content.fileUUID} not available offline, not in cache`,
                        );
                    }
                    return err;
                }),
            );

            const blobs = await Promise.all(blobPromises);

            blobUrls.forEach((url) => URL.revokeObjectURL(url));

            const validContents: PlaylistContent[] = [];
            const validBlobUrls: string[] = [];

            blobs.forEach((blob, index) => {
                if (blob && blob instanceof Blob) {
                    validContents.push(contents[index]);
                    validBlobUrls.push(URL.createObjectURL(blob));
                }
            });

            if (validContents.length === 0) {
                blobUrls.forEach((url) => URL.revokeObjectURL(url));
                blobUrls = [];
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
            blobUrls = validBlobUrls;
            currentVideoIndex = 0;
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

            if (blobUrls.length === 0) {
            }
        } finally {
            isLoadingPlaylist = false;
        }
    };

    const loadPetrolVideo = async (fileUUID: string) => {
        if (!fileUUID || !$isReady) return;
        try {
            const blob = await fileService.getFileBlob(fileUUID, true).catch((err) => {
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
                console.warn(`[Screen] Failed to load petrol video blob for ${fileUUID}`);
            }
        } catch (err) {
            if (err instanceof ApiError) {
                console.error(`[Screen] ApiError loading petrol video:`, err.message);
            } else {
                console.error("[Screen] Failed to load petrol video:", err);
            }
        }
    };

    $effect(() => {
        if (playlistUUID && $isReady) {
            loadPlaylist(playlistUUID);
        } else if (!playlistUUID) {
            blobUrls.forEach((url) => URL.revokeObjectURL(url));
            blobUrls = [];
            playlistContents = [];
        }
    });

    $effect(() => {
        if (petrolVideoFileUUID && $isReady) {
            loadPetrolVideo(petrolVideoFileUUID);
        }
    });

    $effect(() => {
        if (!playlistUUID || !$isReady) {
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
            if (!$isReady) {
                return;
            }

            try {
                const newContents =
                    await playlistService.getContents(playlistUUID);

                if (isPlaylistChanged(playlistContents, newContents)) {
                    if (navigator.onLine) {
                        await clearFilesCache();
                        console.log(
                            "[Screen] 📋 Online: playlist updated, clearing old files cache...",
                        );
                    } else {
                        console.warn(
                            "[Screen] ⚠️ Offline: skipping cache clear, using cached files",
                        );
                    }
                    await loadPlaylist(playlistUUID);
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
            if (edgeVideoElement && !edgeVideoElement.paused) edgeVideoElement.pause();
            if (edgeVideoElement2 && !edgeVideoElement2.paused) edgeVideoElement2.pause();
        } else {
            if (videoElement.paused && videoElement.readyState >= 2) {
                videoElement.play().catch((err) => {
                    if (err.name !== "AbortError") {
                        console.error("[Screen] Failed to resume video:", err);
                    }
                });
            }
            if (isDoubleScreen && videoElement2 && videoElement2.paused && videoElement2.readyState >= 2) {
                videoElement2.play().catch((err) => {
                    if (err.name !== "AbortError") {
                        console.error("[Screen] Failed to resume video 2:", err);
                    }
                });
            }
            if (isDoubleScreen && edgeVideoElement && edgeVideoElement.paused && edgeVideoElement.readyState >= 2) {
                edgeVideoElement.play().catch((err) => {
                    if (err.name !== "AbortError") {
                        console.error("[Screen] Failed to resume edge video:", err);
                    }
                });
            }
            if (isDoubleScreen && edgeVideoElement2 && edgeVideoElement2.paused && edgeVideoElement2.readyState >= 2) {
                edgeVideoElement2.play().catch((err) => {
                    if (err.name !== "AbortError") {
                        console.error("[Screen] Failed to resume edge video 2:", err);
                    }
                });
            }
        }
    });


    onDestroy(() => {
        blobUrls.forEach((url) => URL.revokeObjectURL(url));
        if (petrolVideoUrl) URL.revokeObjectURL(petrolVideoUrl);
        if (playlistCheckInterval) clearInterval(playlistCheckInterval);
    });
</script>

<div
    class="screen"
    style={screenStyle}
>
    {#if isLoadingPlaylist && blobUrls.length === 0}
        <Loader />
    {:else if error && blobUrls.length === 0}
        <ErrorComponent
            {error}
            onRetry={() => {
                error = null;
                if (playlistUUID) {
                    loadPlaylist(playlistUUID);
                }
            }}
        />
    {:else if blobUrls.length > 0 || petrolVideoUrl}
        {#if isDoubleScreen}
            <div class="double-screen-container">
                <div class="video-wrapper">
                    <video
                        bind:this={videoElement}
                        class="screen-video screen-video-left"
                        src={isPetrolVideoPlaying && petrolVideoUrl
                            ? petrolVideoUrl
                            : blobUrls[currentVideoIndex]}
                        autoplay
                        muted
                        playsinline
                        preload="auto"
                        loop={(blobUrls.length === 1 && !petrolVideoUrl) || (isPetrolVideoPlaying && !petrolVideoUrl)}
                        onended={() => handleVideoEnded(false)}
                        onplay={() => handleVideoPlay(false)}
                        onerror={handleVideoError}
                    ></video>
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
                    {#if isPetrolVideoPlaying && screenSettings.length > 0}
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
                        src={isPetrolVideoPlaying && petrolVideoUrl
                            ? petrolVideoUrl
                            : blobUrls[currentVideoIndex]}
                        autoplay
                        muted
                        playsinline
                        preload="auto"
                        loop={(blobUrls.length === 1 && !petrolVideoUrl) || (isPetrolVideoPlaying && !petrolVideoUrl)}
                        onended={() => handleVideoEnded(true)}
                        onplay={() => handleVideoPlay(true)}
                        onerror={handleVideoError}
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
                    {#if isPetrolVideoPlaying && screenSettings.length > 0}
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
                    : blobUrls[currentVideoIndex]}
                autoplay
                muted
                playsinline
                preload="auto"
                loop={(blobUrls.length === 1 && !petrolVideoUrl) || (isPetrolVideoPlaying && !petrolVideoUrl)}
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
        right: 0;
        height: 100%;
        width: auto;
        object-fit: cover;
        pointer-events: none;
        z-index: 1;
    }
</style>
