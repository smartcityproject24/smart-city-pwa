<script lang="ts">
    import type { Block } from "@core";
    import type { Component } from "svelte";
    import { fade } from "svelte/transition";
    import DepartureWidget from "@/widgets/DepartureWidget.svelte";
    import ArrivalWidget from "@/widgets/ArrivalWidget.svelte";

    const WIDGET_MAP: Record<string, Component<any>> = {
        FLIGHTS_DEPARTURE: DepartureWidget,
        FLIGHTS_ARRIVAL: ArrivalWidget,
    };

    interface Props {
        code?: string;
        blocks?: Block[];
    }

    let { code, blocks }: Props = $props();

    type WidgetConfig = { code: string };

    const widgetConfigs = $derived(collectWidgetConfigs());

    function collectWidgetConfigs(): WidgetConfig[] {
        const configs: WidgetConfig[] = [];
        if (blocks?.length) {
            for (const b of blocks) {
                const c = b.code;
                if (typeof c === "string" && WIDGET_MAP[c]) configs.push({ code: c });
            }
        }
        if (configs.length === 0 && code && WIDGET_MAP[code]) {
            configs.push({ code });
        }
        return configs;
    }

    let currentIndex = $state(0);
    let cycle = $state(0);

    function goNext() {
        if (widgetConfigs.length <= 1) {
            cycle += 1;
            return;
        }
        currentIndex = (currentIndex + 1) % widgetConfigs.length;
        cycle += 1;
    }

    const currentConfig = $derived(widgetConfigs[currentIndex] ?? null);
    const CurrentComponent = $derived(
        currentConfig ? WIDGET_MAP[currentConfig.code] : null
    );
</script>

<div class="widget">
    {#if widgetConfigs.length === 0}
        <div class="widget-empty">No widgets configured</div>
    {:else if CurrentComponent && currentConfig}
        {#key cycle}
            <div
                class="widget-slide"
                out:fade={{ duration: 300 }}
                in:fade={{ duration: 300, delay: cycle === 0 ? 0 : 300 }}
            >
                <CurrentComponent onFinished={goNext} />
            </div>
        {/key}
    {/if}
</div>

<style lang="scss">
    .widget {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        min-height: 140px;
        overflow: hidden;
    }

    .widget-slide {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
    }

    .widget-empty {
        padding: 1rem;
        opacity: 0.7;
    }
</style>
