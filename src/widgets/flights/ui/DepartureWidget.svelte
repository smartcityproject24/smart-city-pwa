<script lang="ts">
    import { onMount } from "svelte";
    import { getContext } from "svelte";
    import { apiRequest } from "@api/client";
    import { API_CONFIG } from "@api/config";
    import type { ApiReadyContext } from "@core/types";
    import {
        headerTitleTranslate,
        tableHeadersTranslate,
    } from "../model/constants";
    import FlightTable from "./FlightTable.svelte";
    import type { FlightData } from "../model/flightUtils";
    import { formatTime } from "@/utils/date-time-conveter";

    interface DeparturesResponse {
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

    let loading = $state(true);
    let error = $state<string | null>(null);
    let currentSlideIndex = $state(0);
    let slides = $state<
        Array<{ language: string; langKey: string; items: FlightData[] }>
    >([]);
    let currentTime = $state(new Date());

    const ITEMS_PER_SLIDE = 24; // 2 tables × 12 flights per slide
    const FLIGHTS_PER_TABLE = 12;
    const SLIDE_DURATION_MS = 10000;

    // Split array into chunks of 10
    function chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    function prepareSlides(response: DeparturesResponse) {
        const allSlides: Array<{
            language: string;
            langKey: string;
            items: FlightData[];
        }> = [];

        const languages = [
            { key: "kg" as const },
            { key: "ru" as const },
            { key: "en" as const },
        ];

        for (const lang of languages) {
            const items = response[
                lang.key as keyof DeparturesResponse
            ] as FlightData[];
            if (Array.isArray(items) && items.length > 0) {
                const chunks = chunkArray(items, ITEMS_PER_SLIDE);
                const label = headerTitleTranslate[lang.key].departure;
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
    }

    function getColumnHeaders(langKey: string) {
        return (
            tableHeadersTranslate[
                langKey as keyof typeof tableHeadersTranslate
            ] || tableHeadersTranslate.en
        );
    }

    async function fetchDepartures() {
        if (!$isReady) {
            return;
        }

        loading = true;
        error = null;

        try {
            const url =
                `${API_CONFIG.baseUrl}/smart-city/api/v1/flights-departures`;
            const response = await apiRequest<DeparturesResponse>(url);
            prepareSlides(response);
        } catch (err) {
            error =
                err instanceof Error
                    ? err.message
                    : "Failed to fetch departures";
            console.error("Error fetching departures:", err);
        } finally {
            loading = false;
        }
    }

    let slideTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let finishTimeoutId: ReturnType<typeof setTimeout> | null = null;

    function startSlideshow() {
        if (slideTimeoutId) clearTimeout(slideTimeoutId);
        if (finishTimeoutId) clearTimeout(finishTimeoutId);

        if (slides.length === 0) {
            finishTimeoutId = setTimeout(() => {
                onFinished?.();
            }, 5000);
            return;
        }

        function showNextSlide() {
            if (currentSlideIndex < slides.length - 1) {
                currentSlideIndex++;
                slideTimeoutId = setTimeout(showNextSlide, SLIDE_DURATION_MS);
            } else {
                finishTimeoutId = setTimeout(() => {
                    onFinished?.();
                }, SLIDE_DURATION_MS);
            }
        }
        slideTimeoutId = setTimeout(showNextSlide, SLIDE_DURATION_MS);
    }

    $effect(() => {
        if (!loading && slides.length > 0) {
            startSlideshow();
        }
    });

    onMount(() => {
        const timeInterval = setInterval(() => {
            currentTime = new Date();
        }, 1000);

        // Wait for API to be ready
        const unsubscribe = isReady.subscribe((ready) => {
            if (ready) {
                fetchDepartures();
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

<div class="departure-widget">
    <div class="logo">
        <img src="/manas-logo.svg" alt="Arrival logo" />
    </div>
    {#if loading}
        <div class="loading">Loading departures...</div>
    {:else if error}
        <div class="error">Error: {error}</div>
    {:else if slides.length === 0}
        <div class="empty">No departure data available</div>
    {:else if slides[currentSlideIndex]}
        {@const currentSlide = slides[currentSlideIndex]}
        {@const headers = getColumnHeaders(currentSlide.langKey)}
        {@const totalTablePositions = slides.length * 2}
        {#key currentSlideIndex}
            <div class="slide">
                <div class="table-container">
                    <div class="tables-row">
                        <div class="table-cell">
                            <FlightTable
                                items={currentSlide.items.slice(0, FLIGHTS_PER_TABLE)}
                                headers={headers}
                                tableClass="departures-table"
                                title={currentSlide.language}
                                currentTime={formatTime(currentTime)}
                                slideCounter={`${currentSlideIndex * 2 + 1}/${totalTablePositions}`}
                            />
                        </div>
                        <div class="table-cell">
                            <FlightTable
                                items={currentSlide.items.slice(FLIGHTS_PER_TABLE, ITEMS_PER_SLIDE)}
                                headers={headers}
                                tableClass="departures-table"
                                title={currentSlide.language}
                                currentTime={formatTime(currentTime)}
                                slideCounter={`${currentSlideIndex * 2 + 2}/${totalTablePositions}`}
                            />
                        </div>
                    </div>
                </div>
            </div>
        {/key}
    {/if}
</div>

<style lang="scss">
    .departure-widget {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 120px;
        width: 100%;
        height: 100%;
        background: #0A1332;
        color: #fff;
        z-index: 9999;
        font-family: Roboto, sans-serif;
        line-height: 1;
    }
    .logo {
        background: #000209;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
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

    .table-container {
        width: 100%;
        flex: 1;
        overflow: auto;
        display: flex;
        align-items: flex-start;
    }

    .tables-row {
        display: flex;
        flex-direction: row;
        gap: 1rem;
        width: 100%;
        flex: 1;
        min-width: 0;
    }

    .table-cell {
        flex: 1;
        min-width: 0;
        overflow: auto;
    }
</style>
