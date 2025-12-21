<script lang="ts">
    import { getContext, setContext } from "svelte";
    import { writable } from "svelte/store";
    import type { RouteStore } from "../routes/types";
    import type { PageContext, PageInfo } from "./types";
    import type { Snippet } from "svelte";
    import { isPageInfoEqual } from "./pageInfo";
    import {
        parseSchedule,
        sortScheduleSettings,
        isScheduleActive,
        getActiveSchedule,
    } from "./schedule";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();

    const { currentRoute, navigate } = getContext<RouteStore>("routeStore");
    const info = getContext<Record<string, PageInfo>>("info");

    const currentPage = writable<string | null>(null);
    const previousPage = writable<string | null>(null);
    const pageInfo = writable<PageInfo | null>(null);

    const goToPage = (page: string) => {
        $previousPage = $currentPage;
        navigate(page);
    };

    const goToPreviousPage = () => {
        if ($previousPage) {
            goToPage($previousPage);
        }
    };

    $effect(() => {
        if ($currentRoute) {
            const newPage = $currentRoute.page;
            pageInfo.set(null);
            currentPage.set(newPage);
            pageInfo.set(info[newPage]);
        } else {
            currentPage.set(null);
            pageInfo.set(null);
        }
    });

    setContext<PageContext>("page", {
        pageInfo,
        currentPage,
        previousPage,
        goToPage,
        goToPreviousPage,
        isPageInfoEqual,
        parseSchedule,
        sortScheduleSettings,
        isScheduleActive,
        getActiveSchedule,
    });
</script>

{@render children?.()}

