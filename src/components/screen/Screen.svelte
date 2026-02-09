<script lang="ts">
    import { onDestroy } from "svelte";
    import { getContext } from "svelte";
    import { fade } from "svelte/transition";

    import { BlockRenderer } from "@components/block-renderer";
    import type { Block, BrightnessContext, UserContext } from "@core";
    import type { ApiReadyContext } from "@core/types";
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

    let videoElement = $state<HTMLVideoElement | undefined>(undefined);
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

    const handleVideoEnded = () => {
        if (blobUrls.length === 0 && !petrolVideoUrl) {
            return;
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

    const handleVideoPlay = () => {
        if (!videoElement || $opacity === 0 || videoElement.currentTime > 0.5) return;
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
        } else if (videoElement.paused && videoElement.readyState >= 2) {
            videoElement.play().catch((err) => {
                if (err.name !== "AbortError") {
                    console.error("[Screen] Failed to resume video:", err);
                }
            });
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
            onended={handleVideoEnded}
            onplay={handleVideoPlay}
            onerror={handleVideoError}
        ></video>
        {#if isPetrolVideoPlaying && screenSettings.length > 0}
            <GasStationWidget
                boardType={BoardTypesEnum.PETROL_STATION}
                settings={screenSettings}
            />
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
</style>
