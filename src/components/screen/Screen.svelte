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

    let {
        blocks = [],
        width = undefined,
        height = undefined,
        positionX = undefined,
        positionY = undefined,
        playlistUUID = undefined,
    }: {
        blocks?: Block[];
        width?: number;
        height?: number;
        positionX?: number;
        positionY?: number;
        playlistUUID?: string;
    } = $props();

    const { isReady } = getContext<ApiReadyContext>("api");
    const { opacity } = getContext<BrightnessContext>("brightness");
    const { dashboardUUID } = getContext<UserContext>("user");
    const { logger } = getContext<LoggingContext>("logging");

    let videoElement = $state<HTMLVideoElement | undefined>(undefined);
    let currentVideoIndex = $state(0);
    let playlistContents = $state<PlaylistContent[]>([]);
    let blobUrls = $state<string[]>([]);
    let isLoadingPlaylist = $state(false);
    let error = $state<ApiError | null>(null);
    let playlistCheckInterval: ReturnType<typeof setInterval> | null = null;

    // TODO: Рефакторинг и удаление debug консолей
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
        if (blobUrls.length === 0) {
            return;
        }

        currentVideoIndex = (currentVideoIndex + 1) % blobUrls.length;
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

    $effect(() => {
        if (!playlistUUID) {
            blobUrls.forEach((url) => URL.revokeObjectURL(url));
            blobUrls = [];
            playlistContents = [];
            return;
        }

        if (!$isReady) {
            return;
        }

        loadPlaylist(playlistUUID);
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
        if (!videoElement || blobUrls.length === 0) {
            return;
        }

        if ($opacity === 0) {
            if (!videoElement.paused) {
                videoElement.pause();
            }
        } else {
            if (videoElement.paused && videoElement.readyState >= 2) {
                videoElement.play().catch((err) => {
                    if (err.name !== "AbortError") {
                        console.error(
                            "[Screen] ❌ Failed to resume video:",
                            err,
                        );
                    }
                });
            }
        }
    });

    $effect(() => {
        if (
            !videoElement ||
            blobUrls.length === 0 ||
            currentVideoIndex >= blobUrls.length
        ) {
            return;
        }

        const targetUrl = blobUrls[currentVideoIndex];

        if (videoElement.src === targetUrl) {
            if (videoElement.paused && $opacity > 0) {
                videoElement.play().catch((err) => {
                    if (err.name !== "AbortError") {
                        console.error("[Screen] ❌ Failed to play video:", err);
                    }
                });
            }
            return;
        }

        videoElement.pause();
        videoElement.src = targetUrl;

        const handleCanPlay = () => {
            if (!videoElement) return;

            if ($opacity > 0) {
                videoElement
                    .play()
                    .then(() => {
                        // console.log(
                        //     `[Screen] ✅ Video playing, index: ${currentVideoIndex}`,
                        // );
                    })
                    .catch((err) => {
                        if (err.name !== "AbortError") {
                            console.error(
                                "[Screen] ❌ Failed to play video:",
                                err,
                            );
                        }
                    });
            }
        };

        const handlePlay = () => {
            if (!videoElement) return;

            if ($opacity === 0 || videoElement.currentTime > 0.5) return;

            if (
                playlistUUID &&
                playlistContents[currentVideoIndex] &&
                $dashboardUUID
            ) {
                const currentContent = playlistContents[currentVideoIndex];

                logger.logVideoStart($dashboardUUID, {
                    playlistUUID,
                    fileUUID: currentContent.fileUUID,
                    videoIndex: currentVideoIndex,
                });
            }
        };

        const handleError = (e: Event) => {
            if (!videoElement) return;

            if (
                playlistUUID &&
                playlistContents[currentVideoIndex] &&
                $dashboardUUID
            ) {
                const currentContent = playlistContents[currentVideoIndex];
                const error = videoElement.error;
                const errorMessage = error?.message || "Unknown video error";
                const errorCode = error?.code || "UNKNOWN";

                logger.logVideoError($dashboardUUID, {
                    playlistUUID,
                    fileUUID: currentContent.fileUUID,
                    error: errorMessage,
                    errorCode: errorCode.toString(),
                });
            }
        };

        const handleSeeked = () => {
            if (!videoElement) return;

            if ($opacity === 0) return;

            if (
                playlistUUID &&
                playlistContents[currentVideoIndex] &&
                $dashboardUUID
            ) {
                const currentContent = playlistContents[currentVideoIndex];

                logger.logVideoStart($dashboardUUID, {
                    playlistUUID,
                    fileUUID: currentContent.fileUUID,
                    videoIndex: currentVideoIndex,
                });
            }
        };

        videoElement.addEventListener("canplay", handleCanPlay, { once: true });
        videoElement.addEventListener("play", handlePlay);
        videoElement.addEventListener("error", handleError);
        videoElement.addEventListener("seeked", handleSeeked);

        videoElement.load();

        return () => {
            if (!videoElement) return;
            videoElement.removeEventListener("canplay", handleCanPlay);
            videoElement.removeEventListener("play", handlePlay);
            videoElement.removeEventListener("error", handleError);
        };
    });

    onDestroy(() => {
        blobUrls.forEach((url) => URL.revokeObjectURL(url));
        if (playlistCheckInterval) {
            clearInterval(playlistCheckInterval);
        }
    });
</script>

<div
    class="screen"
    style="width: {width}px; height: {height}px; top: {positionY}px; left: {positionX}px;"
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
    {:else if blobUrls.length > 0}
        {#key currentVideoIndex}
            <video
                bind:this={videoElement}
                class="screen-video"
                autoplay
                muted
                playsinline
                preload="auto"
                loop={blobUrls.length === 1}
                onended={handleVideoEnded}
                out:fade={{ duration: 500 }}
                in:fade={{ delay: 500, duration: 500 }}
            ></video>
        {/key}
    {:else}
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
