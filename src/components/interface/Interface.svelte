<script lang="ts">
    import { BlockRenderer } from "@components/block-renderer";
    import type { Block } from "@core";
    import { onMount } from "svelte";

    let {
        blocks = [],
        height = 0,
        width = 0,
    }: {
        blocks?: Block[];
        height?: number;
        width?: number;
    } = $props();

    let containerElement: HTMLDivElement;
    let interfaceElement: HTMLDivElement;
    
    let scaleX = $state(1);
    let scaleY = $state(1);
    let baseWidth = $state(0);
    let baseHeight = $state(0);

    const MIN_SCALE = 0;
    const MAX_SCALE = 10;

    const calculateScale = () => {
        if (!containerElement || !interfaceElement) {
            scaleX = 1;
            scaleY = 1;
            return;
        }
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (viewportWidth === 0 || viewportHeight === 0) {
            scaleX = 1;
            scaleY = 1;
            return;
        }

        if (width === 0 || height === 0) {
            if (baseWidth === 0 || baseHeight === 0) {
                baseWidth = 1380;
                baseHeight = 2800;
            }
        } else {
            baseWidth = width;
            baseHeight = height;
        }

        let calculatedScaleX = viewportWidth / baseWidth;
        let calculatedScaleY = viewportHeight / baseHeight;

        baseWidth = viewportWidth;
        baseHeight = viewportHeight;
        
        calculatedScaleX = Math.max(MIN_SCALE, Math.min(MAX_SCALE, calculatedScaleX));
        calculatedScaleY = Math.max(MIN_SCALE, Math.min(MAX_SCALE, calculatedScaleY));
        
        scaleX = calculatedScaleX;
        scaleY = calculatedScaleY;
    };

    onMount(() => setTimeout(() => calculateScale(), 0));

    $effect(() => {
        calculateScale();

        const handleResize = () => calculateScale();
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    });
</script>

<div class="interface-container" bind:this={containerElement}>
    <div
        class="interface-wrapper"
        style="
            transform: scale({scaleX}, {scaleY});
            transform-origin: 0 0;
            width: {baseWidth}px;
            height: {baseHeight}px;
        "
    >
        <div
            class="interface"
            bind:this={interfaceElement}
            style="width: {baseWidth}px; height: {baseHeight}px;
            transform: scale({scaleX}, {scaleY});
            transform-origin: 0 0;"
        >
            <BlockRenderer {blocks} />
        </div>
    </div>
</div>

<style lang="scss">
    .interface-container {
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
    }

    .interface-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        will-change: transform;
    }

    .interface {
        display: flex;
        flex-direction: column;
    }
</style>