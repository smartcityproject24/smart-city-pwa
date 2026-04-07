<script lang="ts">
    import { getContext } from "svelte";
    import type {
        AuthContext,
        UserContext,
        ApiReadyContext,
        PageContext,
        PageInfo,
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

    const { clearTokens } = getContext<AuthContext>("auth");
    const { dashboardUUID, clearUserData } = getContext<UserContext>("user");
    const { isReady } = getContext<ApiReadyContext>("api");
    const { pageInfo, currentPage, isPageInfoEqual, sortScheduleSettings } =
        getContext<PageContext>("page");
    const { scheduleSettings } = getContext<BrightnessContext>("brightness");

    let isLoading = $state(false);
    let error = $state<ApiError | null>(null);
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let pollingFailStreak = $state(0);
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleLogout = async () => {
        await clearTokens();
        clearUserData();
    };

    // ─── localStorage кеш для offline-first ─────────────────────────────────
    const cacheKey = (uuid: string) => `dashboard_cache_${uuid}`;

    function saveToCache(uuid: string, pi: PageInfo, ss: Record<string, string>[]) {
        try {
            localStorage.setItem(cacheKey(uuid), JSON.stringify({ pageInfo: pi, scheduleSettings: ss }));
        } catch {
            // квота переполнена — игнорируем
        }
    }

    function restoreFromCache(uuid: string): boolean {
        try {
            const raw = localStorage.getItem(cacheKey(uuid));
            if (!raw) return false;
            const { pageInfo: pi, scheduleSettings: ss } = JSON.parse(raw);
            if (!pi?.blocks?.length) return false;
            console.log("[Dashboard] Восстановлено из localStorage");
            scheduleSettings.set(ss || []);
            pageInfo.set(pi);
            return true;
        } catch {
            return false;
        }
    }

    const fetchSolutions = async (isPolling = false) => {
        if (!$isReady || !$dashboardUUID || $dashboardUUID.trim() === "")
            return;

        if (!isPolling) isLoading = true;
        if (!isPolling) error = null;

        try {
            const data = await dashboardService.getSolutions($dashboardUUID);
            const settings = await dashboardService.getSettings($dashboardUUID);

            if (isPolling) pollingFailStreak = 0;

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
                    saveToCache($dashboardUUID, newPageInfo, sortedSettings || []);
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

                const newPageInfo2: PageInfo = {
                    dashboardUUID: data.dashboardUUID,
                    dashboardName: data.dashboardName,
                    dashboardType: data.dashboardType,
                    solutionName: data.solution?.name,
                    solutionWidth: data.solution?.width,
                    solutionHeight: data.solution?.height,
                    blocks: interfaceBlocks,
                };
                pageInfo.set(newPageInfo2);
                saveToCache($dashboardUUID, newPageInfo2, sortedSettings || []);
            } else if (!data?.solution && (settings?.settings?.length ||
                settings?.playlists?.length)) {
                const { settings: ss = [], playlists: pl = [], deviceName: dn,
                    deviceType: dt } = settings ?? {};

                const isDoubleWithTwoPlaylists =
                    dt === "PARTNER_NEFT_STATION_DOUBLE" && pl.length >= 2;

                const screenBlocks = (() => {
                    if (isDoubleWithTwoPlaylists) {
                        return [{
                            type: "SCREEN" as const,
                            payload: { settings: ss, playlists: pl },
                        }];
                    }
                    if (pl.length) {
                        return pl.map(p => ({
                            type: "SCREEN" as const,
                            playlistUUID: p.playlistUUID,
                            name: p.playlistName,
                            payload: { settings: ss },
                        }));
                    }
                    if (ss.length) {
                        return [{ type: "SCREEN" as const, payload: { settings: ss } }];
                    }
                    return [];
                })();

                const blocks = [
                    { type: "control_panel" as const },
                    ...ss.map(s => ({
                        type: "setting" as const,
                        blocks: [{ type: "setting" as const, name: s.settingName,
                            value: s.settingValue }],
                    })),
                    ...screenBlocks,
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
                    saveToCache($dashboardUUID, newPageInfo, sortedSettings || []);
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
                const emptyPageInfo: PageInfo = {
                    ...currentPageInfo,
                    dashboardUUID: data.dashboardUUID,
                    dashboardName: data.dashboardName,
                    dashboardType: data.dashboardType,
                    blocks: interfaceBlocks,
                };
                pageInfo.set(emptyPageInfo);
                saveToCache($dashboardUUID, emptyPageInfo, []);
            }
        } catch (err) {
            if (isPolling) {
                if (navigator.onLine && err instanceof ApiError && err.code >= 400 && err.code < 500) {
                    pollingFailStreak++;
                    if (pollingFailStreak >= 3) {
                        handleLogout();
                    }
                }
                return;
            }
            // Сетевая ошибка (нет соединения) — не показываем экран ошибки,
            // автоматически повторяем через 10 секунд
            const isNetworkError = !(err instanceof ApiError) || err.code === 0;
            if (isNetworkError) {
                console.warn("[Dashboard] Нет соединения, повтор через 10с...");
                retryTimeoutId = setTimeout(() => fetchSolutions(false), 10_000);
                return;
            }
            if (err instanceof ApiError) {
                error = err;
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

        // Немедленно восстанавливаем кешированный pageInfo, чтобы экран
        // отобразился пока идёт (или не идёт) сетевой запрос
        restoreFromCache($dashboardUUID);

        fetchSolutions(false);

        intervalId = setInterval(() => {
            fetchSolutions(true);
        }, 60000);

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            if (retryTimeoutId) {
                clearTimeout(retryTimeoutId);
                retryTimeoutId = null;
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
        onLogout={handleLogout}
    />
{:else if $currentPage === "dashboard" && isLoading && !$pageInfo}
    <Loader text="loading_data" fullscreen={true} />
{:else}
    {@render children?.()}
{/if}
