<script lang="ts">
    import { onMount } from "svelte";
    import { getContext } from "svelte";
    import { apiRequest } from "@api/client";
    import { API_CONFIG } from "@api/config";
    import type { ApiReadyContext } from "@core/types";
    import {
        headerTitleTranslate,
        tableHeadersTranslate,
        FlightStatus,
    } from "./constants";

    interface FlightData {
        Flight: string;
        Status: string;
        Airport: string;
        Regularity: string;
        "Actual date": string;
        "Actual time": string;
        "Sheduled date": string;
        "Sheduled time": string;
    }

    interface ArrivalsResponse {
        uuid: string;
        kg: FlightData[];
        ru: FlightData[];
        en: FlightData[];
        created: string;
        updated: string;
    }

    interface Props {
        onFinished?: () => void;
    }

    let { onFinished }: Props = $props();

    const { isReady } = getContext<ApiReadyContext>("api");

    let data = $state<ArrivalsResponse | null>(null);
    let loading = $state(true);
    let error = $state<string | null>(null);
    let currentSlideIndex = $state(0);
    let slides = $state<
        Array<{ language: string; langKey: string; items: FlightData[] }>
    >([]);
    let DURATION_SEC = $state(0);
    let currentTime = $state(new Date());

    // Split array into chunks of 10
    function chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    // Prepare slides from data
    function prepareSlides(response: ArrivalsResponse) {
        const allSlides: Array<{
            language: string;
            langKey: string;
            items: FlightData[];
        }> = [];

        // Process kg, ru, en arrays
        const languages = [
            { key: "kg" as const },
            { key: "ru" as const },
            { key: "en" as const },
        ];

        for (const lang of languages) {
            const items = response[
                lang.key as keyof ArrivalsResponse
            ] as FlightData[];
            if (Array.isArray(items) && items.length > 0) {
                const chunks = chunkArray(items, 10);
                const label = headerTitleTranslate[lang.key].arrival;
                for (const chunk of chunks) {
                    allSlides.push({
                        language: label,
                        langKey: lang.key,
                        items: chunk,
                    });
                }
            }
        }

        slides = allSlides;

        // Calculate total duration: (ru.length + kg.length + en.length) * 5
        const totalItems =
            (response.ru?.length || 0) +
            (response.kg?.length || 0) +
            (response.en?.length || 0);
        DURATION_SEC = totalItems * 5;
    }

    // Get column headers based on language
    function getColumnHeaders(langKey: string) {
        return (
            tableHeadersTranslate[
                langKey as keyof typeof tableHeadersTranslate
            ] || tableHeadersTranslate.en
        );
    }

    // Get status color based on FlightStatus
    function getStatusColor(status: string): string {
        if (!status) return "#fff";
        const cleanStatus = status.trim();
        const color = FlightStatus[cleanStatus];
        console.log(
            "color >>> ",
            cleanStatus,
            FlightStatus[status],
            FlightStatus["КЕЛИП КОНДУ"],
        );

        return color || "#fff";
    }

    // Format time as HH:MM:SS
    function formatTime(date: Date): string {
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const seconds = date.getSeconds().toString().padStart(2, "0");
        return `${hours}:${minutes}:${seconds}`;
    }

    async function fetchArrivals() {
        if (!$isReady) {
            return;
        }

        loading = true;
        error = null;

        try {
            const url = `${API_CONFIG.baseUrl}/smart-city/api/v1/flights-arrivals`;
            const response = await apiRequest<ArrivalsResponse>(url);
            data = response;
            prepareSlides(response);
        } catch (err) {
            error =
                err instanceof Error ? err.message : "Failed to fetch arrivals";
            console.error("Error fetching arrivals:", err);
        } finally {
            loading = false;
        }
    }

    let slideTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let finishTimeoutId: ReturnType<typeof setTimeout> | null = null;

    function startSlideshow() {
        // Clear any existing timeouts
        if (slideTimeoutId) clearTimeout(slideTimeoutId);
        if (finishTimeoutId) clearTimeout(finishTimeoutId);

        if (slides.length === 0) {
            finishTimeoutId = setTimeout(() => {
                onFinished?.();
            }, 5000); // Default 5 seconds if no data
            return;
        }

        const SLIDE_DURATION_MS = 5000; // Each table shown for 5 seconds

        function showNextSlide() {
            if (currentSlideIndex < slides.length - 1) {
                currentSlideIndex++;
                slideTimeoutId = setTimeout(showNextSlide, SLIDE_DURATION_MS);
            } else {
                // All slides shown, finish widget after last slide duration
                finishTimeoutId = setTimeout(() => {
                    onFinished?.();
                }, SLIDE_DURATION_MS);
            }
        }

        // Show first slide immediately, then advance every 5 seconds
        slideTimeoutId = setTimeout(showNextSlide, SLIDE_DURATION_MS);
    }

    // Start slideshow when data is loaded
    $effect(() => {
        if (!loading && slides.length > 0) {
            startSlideshow();
        }
    });

    onMount(() => {
        // Update current time every second
        const timeInterval = setInterval(() => {
            currentTime = new Date();
        }, 1000);

        // Wait for API to be ready
        const unsubscribe = isReady.subscribe((ready) => {
            if (ready) {
                fetchArrivals();
            }
        });

        return () => {
            clearInterval(timeInterval);
            unsubscribe();
            if (slideTimeoutId) clearTimeout(slideTimeoutId);
            if (finishTimeoutId) clearTimeout(finishTimeoutId);
        };
    });
</script>

<div class="arrival-widget">
    {#if loading}
        <div class="loading">Loading arrivals...</div>
    {:else if error}
        <div class="error">Error: {error}</div>
    {:else if slides.length === 0}
        <div class="empty">No arrival data available</div>
    {:else if slides[currentSlideIndex]}
        {@const currentSlide = slides[currentSlideIndex]}
        {@const headers = getColumnHeaders(currentSlide.langKey)}
        {#key currentSlideIndex}
            <div class="slide">
                <div class="header">
                    <h3 class="widget-title">{currentSlide.language}</h3>
                    <div class="current-time">{formatTime(currentTime)}</div>
                </div>
                <div class="table-container">
                    <table class="arrivals-table">
                        <thead>
                            <tr>
                                <th style="width: 15%;">{headers.Flight}</th>
                                <th style="width: 25%;">{headers.Airport}</th>
                                <th style="width: 15%;">{headers["Sheduled date"]}</th>
                                <th style="width: 15%;">{headers["Sheduled time"]}</th>
                                <th style="width: 15%;">{headers.Status}</th>
                                <th style="width: 15%;">{headers["Actual time"]}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each currentSlide.items as item}
                                <tr>
                                    <td
                                        style="color: {getStatusColor(
                                            item.Status || '',
                                        )}">{item.Flight}</td
                                    >
                                    <td
                                        style="color: {getStatusColor(
                                            item.Status || '',
                                        )}">{item.Airport}</td
                                    >
                                    <td
                                        style="color: {getStatusColor(
                                            item.Status || '',
                                        )}">{item["Sheduled date"]}</td
                                    >
                                    <td
                                        style="color: {getStatusColor(
                                            item.Status || '',
                                        )}">{item["Sheduled time"]}</td
                                    >
                                    <td
                                        style="color: {getStatusColor(
                                            item.Status || '',
                                        )}">{item.Status || "-"}</td
                                    >
                                    <td
                                        style="color: {getStatusColor(
                                            item.Status || '',
                                        )}">{item["Actual time"] || "-"}</td
                                    >
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
                <div class="footer">
                    <div class="slide-counter">
                        {currentSlideIndex + 1}/{slides.length}
                    </div>
                </div>
            </div>
        {/key}
    {/if}
</div>

<style lang="scss">
    .arrival-widget {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 120px;
        width: 100%;
        height: 100%;
        background: #0f1941;
        color: #fff;
        z-index: 9999;
        font-family: serif;
        line-height: 1;
    }

    .loading,
    .error,
    .empty {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        text-align: center;
        color: #fff;
    }

    .error {
        color: #ff4444;
    }

    .slide {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 1.5rem 0.5rem;
    }

    .widget-title {
        margin: 0;
        font-size: 2.5rem;
        font-weight: 600;
    }

    .current-time {
        font-size: 2.5rem;
        font-weight: 600;
        color: #fff;
        font-variant-numeric: tabular-nums;
    }

    .table-container {
        width: 100%;
        flex: 1;
        overflow: auto;
        display: flex;
        align-items: flex-start;
    }

    .arrivals-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 1rem;
        background: transparent;
        color: #fff;

        thead {
            background-color: transparent;
            top: 0;
            background: #fff;
            color: #0f1941;
        }

        th {
            text-align: left;
            font-weight: 600;
            font-size: 20px;
            word-break: break-word;
            padding: 8px 4px;
        }

        td {
            color: #fff;
            font-weight: 500;
            padding-bottom: 1rem;
        }

        tbody tr:nth-child(even) {
            background-color: #0f1628;
        }
    }

    .footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
    }

    .slide-counter {
        font-size: 1rem;
        color: #fff;
        opacity: 0.8;
    }
</style>
