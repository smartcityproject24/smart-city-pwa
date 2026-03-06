<script lang="ts">
    import { onDestroy, tick } from "svelte";
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
    let currentVideoIndexRight = $state(0);
    let playlistContentsRight = $state<PlaylistContent[]>([]);
    let blobUrlsRight = $state<string[]>([]);
    let petrolVideoUrl = $state<string | null>(null);
    let isPetrolVideoPlaying = $state(false);
    let isPetrolVideoPlayingLeft = $state(false);
    let isPetrolVideoPlayingRight = $state(false);
    let isLoadingPlaylist = $state(false);
    let isLoadingPlaylistRight = $state(false);
    let error = $state<ApiError | null>(null);
    let errorRight = $state<ApiError | null>(null);
    let playlistCheckInterval: ReturnType<typeof setInterval> | null = null;

    // Check if there are any widget blocks
    const hasWidgets = $derived(
        blocks.some((block) => String(block.type).toUpperCase() === "WIDGET"),
    );

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
            ? payloadPlaylists[0]?.playlistUUID
            : playlistUUID,
    );
    const rightPlaylistUUID = $derived(
        isDoubleWithTwoPlaylists
            ? payloadPlaylists[1]?.playlistUUID
            : undefined,
    );
    const isFullscreen = $derived(width == null || height == null);
    const screenStyle = $derived(
        isFullscreen
            ? "width: 100%; height: 100%; top: 0; left: 0;"
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

    const handleVideoEnded = (isSecondVideo = false) => {
        if (isDoubleWithTwoPlaylists) {
            if (isSecondVideo) {
                if (isPetrolVideoPlayingRight) {
                    isPetrolVideoPlayingRight = false;
                    currentVideoIndexRight = blobUrlsRight.length > 0
                        ? (currentVideoIndexRight + 1) % blobUrlsRight.length
                        : 0;
                    tick().then(() => videoElement2?.play().catch(() => {}));
                    return;
                }
                if (blobUrlsRight.length === 0) return;
                if (petrolVideoUrl) {
                    isPetrolVideoPlayingRight = true;
                } else {
                    currentVideoIndexRight = (currentVideoIndexRight + 1) % blobUrlsRight.length;
                }
                tick().then(() => videoElement2?.play().catch(() => {}));
            } else {
                if (isPetrolVideoPlayingLeft) {
                    isPetrolVideoPlayingLeft = false;
                    currentVideoIndex = blobUrls.length > 0
                        ? (currentVideoIndex + 1) % blobUrls.length
                        : 0;
                    tick().then(() => videoElement?.play().catch(() => {}));
                    return;
                }
                if (blobUrls.length === 0 && !petrolVideoUrl) return;
                if (petrolVideoUrl) {
                    isPetrolVideoPlayingLeft = true;
                } else {
                    currentVideoIndex = (currentVideoIndex + 1) % blobUrls.length;
                }
                tick().then(() => videoElement?.play().catch(() => {}));
            }
            return;
        }

        if (isPetrolVideoPlaying) {
            isPetrolVideoPlaying = false;
            currentVideoIndex = blobUrls.length > 0
                ? (currentVideoIndex + 1) % blobUrls.length
                : 0;
            tick().then(() => {
                videoElement?.play().catch(() => {});
                videoElement2?.play().catch(() => {});
            });
            return;
        }

        if (blobUrls.length === 0 && !petrolVideoUrl) return;

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
            currentVideoIndex = (currentVideoIndex + 1) % blobUrls.length;
        }
        tick().then(() => {
            videoElement?.play().catch(() => {});
            if (videoElement2) videoElement2.play().catch(() => {});
        });
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

    const loadPlaylistRight = async (uuid: string) => {
        if (!uuid || !$isReady) return;

        isLoadingPlaylistRight = true;
        errorRight = null;

        try {
            const contents = await playlistService.getContents(uuid);

            if (!contents || contents.length === 0) {
                blobUrlsRight.forEach((url) => URL.revokeObjectURL(url));
                blobUrlsRight = [];
                playlistContentsRight = [];
                currentVideoIndexRight = 0;
                if (videoElement2) {
                    videoElement2.pause();
                    videoElement2.removeAttribute("src");
                    videoElement2.load();
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

            blobUrlsRight.forEach((url) => URL.revokeObjectURL(url));

            const validContents: PlaylistContent[] = [];
            const validBlobUrls: string[] = [];

            blobs.forEach((blob, index) => {
                if (blob && blob instanceof Blob) {
                    validContents.push(contents[index]);
                    validBlobUrls.push(URL.createObjectURL(blob));
                }
            });

            if (validContents.length === 0) {
                blobUrlsRight = [];
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
            blobUrlsRight = validBlobUrls;
            currentVideoIndexRight = 0;
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
        if (isDoubleWithTwoPlaylists) {
            if (!leftPlaylistUUID && !rightPlaylistUUID) {
                blobUrls.forEach((url) => URL.revokeObjectURL(url));
                blobUrls = [];
                playlistContents = [];
                blobUrlsRight.forEach((url) => URL.revokeObjectURL(url));
                blobUrlsRight = [];
                playlistContentsRight = [];
                return;
            }
            if ($isReady && leftPlaylistUUID) loadPlaylist(leftPlaylistUUID);
            if ($isReady && rightPlaylistUUID)
                loadPlaylistRight(rightPlaylistUUID);
        } else {
            if (playlistUUID && $isReady) {
                loadPlaylist(playlistUUID);
            } else if (!playlistUUID) {
                blobUrls.forEach((url) => URL.revokeObjectURL(url));
                blobUrls = [];
                playlistContents = [];
            }
        }
    });

    $effect(() => {
        if (petrolVideoFileUUID && $isReady) {
            loadPetrolVideo(petrolVideoFileUUID);
        }
    });

    $effect(() => {
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
        blobUrls.length > 0 || blobUrlsRight.length > 0 || !!petrolVideoUrl,
    );
    const showLoader = $derived(
        (isLoadingPlaylist || isLoadingPlaylistRight) && !hasContent,
    );

    onDestroy(() => {
        blobUrls.forEach((url) => URL.revokeObjectURL(url));
        blobUrlsRight.forEach((url) => URL.revokeObjectURL(url));
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
                            : (blobUrls[currentVideoIndex] ?? "")}
                        autoplay
                        muted
                        playsinline
                        preload="auto"
                        loop={(isDoubleWithTwoPlaylists
                            ? !isPetrolVideoPlayingLeft
                            : !isPetrolVideoPlaying) &&
                            (isDoubleWithTwoPlaylists
                                ? blobUrls.length <= 1 && !petrolVideoUrl
                                : blobUrls.length === 1 && !petrolVideoUrl)}
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
                                  ? blobUrlsRight[currentVideoIndexRight]
                                  : blobUrls[currentVideoIndex]) ?? "")}
                        autoplay
                        muted
                        playsinline
                        preload="auto"
                        loop={(isDoubleWithTwoPlaylists
                            ? !isPetrolVideoPlayingRight
                            : !isPetrolVideoPlaying) &&
                            (isDoubleWithTwoPlaylists
                                ? blobUrlsRight.length <= 1 && !petrolVideoUrl
                                : blobUrls.length === 1 && !petrolVideoUrl)}
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
                    : blobUrls[currentVideoIndex]}
                autoplay
                muted
                playsinline
                preload="auto"
                loop={!isPetrolVideoPlaying &&
                    blobUrls.length === 1 &&
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
