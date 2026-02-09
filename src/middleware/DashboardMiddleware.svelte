<script lang="ts">
    import { getContext } from "svelte";
    import type {
        UserContext,
        ApiReadyContext,
        PageContext,
        Block,
        BrightnessContext,
    } from "@core/types";
    import type { Snippet } from "svelte";
    import { dashboardService } from "@api/services/dashboard.service";
    import { ApiError } from "@api/types/errors";
    import { Loader } from "@components/ui/loader";
    import { Error } from "@components/ui/error";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();

    const { dashboardUUID } = getContext<UserContext>("user");
    const { isReady } = getContext<ApiReadyContext>("api");
    const { pageInfo, currentPage, isPageInfoEqual, sortScheduleSettings } =
        getContext<PageContext>("page");
    const { scheduleSettings } = getContext<BrightnessContext>("brightness");

    let isLoading = $state(false);
    let error = $state<ApiError | null>(null);
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchSolutions = async (isPolling = false) => {
        if (!$isReady || !$dashboardUUID || $dashboardUUID.trim() === "")
            return;

        if (!isPolling) isLoading = true;

        if (error) error = null;

        try {
            const data = await dashboardService.getSolutions($dashboardUUID);
            const settings = await dashboardService.getSettings($dashboardUUID);
            const currentPageInfo = $pageInfo;

            const settingsForSchedule =
                data.settings ??
                settings?.settings?.map((s) => ({
                    settingType: s.settingType,
                    settingName: s.settingName,
                    settingValue: s.settingValue,
                }));
            const sortedSettings = sortScheduleSettings(settingsForSchedule);
            scheduleSettings.set(sortedSettings || []);

            if (currentPageInfo && data?.solution) {
                const interfaceBlocks: Block[] = [
                    {
                        type: "interface",
                        blocks: [
                            {
                                type: "control_panel",
                            },
                            data.solution,
                        ],
                    },
                ];

                const newPageInfo = {
                    ...currentPageInfo,
                    dashboardUUID: data.dashboardUUID,
                    dashboardName: data.dashboardName,
                    dashboardType: data.dashboardType,
                    solutionName: data.solution?.name,
                    solutionWidth: data.solution?.width,
                    solutionHeight: data.solution?.height,
                    blocks: interfaceBlocks,
                };

                if (!isPageInfoEqual(currentPageInfo, newPageInfo)) {
                    pageInfo.set(newPageInfo);
                } else {
                    if (isPolling) return;
                }
            } else if (!currentPageInfo && data?.solution) {
                const interfaceBlocks: Block[] = [
                    {
                        type: "interface",
                        blocks: [
                            {
                                type: "control_panel",
                            },
                            data.solution,
                        ],
                    },
                ];

                pageInfo.set({
                    dashboardUUID: data.dashboardUUID,
                    dashboardName: data.dashboardName,
                    dashboardType: data.dashboardType,
                    solutionName: data.solution?.name,
                    solutionWidth: data.solution?.width,
                    solutionHeight: data.solution?.height,
                    blocks: interfaceBlocks,
                });
            } else if (!data?.solution && (settings?.settings?.length ||
                settings?.playlists?.length)) {
                const { settings: ss = [], playlists: pl = [], deviceName: dn,
                    deviceType: dt } = settings ?? {};

                const blocks = [
                    { type: "control_panel" as const },
                    ...ss.map(s => ({
                        type: "setting" as const,
                        blocks: [{ type: "setting" as const, name: s.settingName,
                            value: s.settingValue }],
                    })),
                    ...(pl.length ? pl.map(p => ({
                        type: "SCREEN" as const,
                        playlistUUID: p.playlistUUID,
                        name: p.playlistName,
                        payload: { settings: ss },
                    })) : ss.length ? [{ type: "SCREEN" as const,
                        payload: { settings: ss } }] : []),
                ];

                const newPageInfo = {
                    ...(currentPageInfo ?? {}),
                    dashboardUUID: data?.dashboardUUID ?? "",
                    dashboardName: data?.dashboardName ?? dn,
                    dashboardType: data?.dashboardType ?? dt,
                    blocks: [{ type: "interface" as const, blocks }],
                };

                if (!currentPageInfo ||
                    !isPageInfoEqual(currentPageInfo, newPageInfo)) {
                    pageInfo.set(newPageInfo);
                } else if (isPolling) return;
            } else if (data) {
                const interfaceBlocks: Block[] = [
                    {
                        type: "interface",
                        blocks: [
                            {
                                type: "control_panel",
                            },
                            {
                                type: "empty_solution",
                            },
                        ],
                    },
                ];
                scheduleSettings.set([]);
                pageInfo.set({
                    ...currentPageInfo,
                    dashboardUUID: data.dashboardUUID,
                    dashboardName: data.dashboardName,
                    dashboardType: data.dashboardType,
                    blocks: interfaceBlocks,
                });
            }
        } catch (err) {
            if (err instanceof ApiError) {
                error = err;
            } else {
                error = new ApiError({
                    code: 0,
                    message: "unknown_error",
                    error: "Unknown",
                    detailedMessages: [],
                });
            }
        } finally {
            if (!isPolling) {
                isLoading = false;
            }
        }
    };

    $effect(() => {
        if ($currentPage !== "dashboard") {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            return;
        }

        if (!$isReady || !$dashboardUUID || $dashboardUUID.trim() === "") {
            return;
        }

        fetchSolutions(false);

        intervalId = setInterval(() => {
            fetchSolutions(true);
        }, 60000);

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };
    });
</script>

{#if $currentPage === "dashboard" && error}
    <Error
        {error}
        fullscreen={true}
        onRetry={() => {
            error = null;
            fetchSolutions();
        }}
    />
{:else if $currentPage === "dashboard" && isLoading}
    <Loader text="loading_data" fullscreen={true} />
{:else}
    {@render children?.()}
{/if}
