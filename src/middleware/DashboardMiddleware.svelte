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
            const currentPageInfo = $pageInfo;

            const sortedSettings = sortScheduleSettings(data.settings);
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
