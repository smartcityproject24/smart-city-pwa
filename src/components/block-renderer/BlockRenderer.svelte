<script lang="ts">
    import { getContext } from "svelte";
    import type { Block } from "@core";
    import type { ComponentsContext } from "@core/types";
    import type { Component } from "svelte";
    import { Widget } from "@components/widget";
    import {
        getLibraryWidgetUuidFromBlocks,
        isStaticWidgetBlock,
    } from "@components/widget/static-widget-codes";

    interface Props {
        blocks: Block[];
    }

    let { blocks }: Props = $props();

    const components = getContext<ComponentsContext>("components");

    const isWidgetBlock = (b: Block) =>
        String(b.type).toUpperCase() === "WIDGET";

    const isSettingBlock = (b: Block) =>
        String(b.type).toLowerCase() === "setting";

    const widgetBlocks = $derived(
        blocks.filter(isWidgetBlock).filter(isStaticWidgetBlock),
    );
    const otherBlocks = $derived(blocks.filter((b) => !isWidgetBlock(b) && !isSettingBlock(b)));

    /** WIDGET с конструктора на одном уровне с SCREEN — в Screen не попадали из-за otherBlocks */
    const rootLibraryWidgetBlocks = $derived(
        blocks.filter(isWidgetBlock).filter((b) => !isStaticWidgetBlock(b)),
    );

    function blocksForScreen(screenBlock: Block): Block[] {
        const nested = screenBlock.blocks ?? [];
        if (getLibraryWidgetUuidFromBlocks(nested)) return nested;
        if (rootLibraryWidgetBlocks.length === 0) return nested;
        console.info("[BlockRenderer] SCREEN: добавлены библиотечные WIDGET-соседи", {
            screenUUID: screenBlock.uuid ?? null,
            mergedCount: rootLibraryWidgetBlocks.length,
        });
        return [...nested, ...rootLibraryWidgetBlocks];
    }

    function getBlock(type: string | undefined): Component<any> | undefined {
        if (!type) return undefined;
        
        const normalizedType = type.toLowerCase();
        const component = components[normalizedType];

        if (!component) {
            console.warn("component for type not found. Type >>> ", type);
            return undefined;
        }

        return component;
    }
</script>

{#if widgetBlocks.length > 0}
    <Widget blocks={widgetBlocks} />
{/if}
{#each otherBlocks as block}
    {#if getBlock(block.type)}
        {@const BlockComponent = getBlock(block.type)}
        {#if String(block.type).toUpperCase() === "SCREEN"}
            <BlockComponent {...block} blocks={blocksForScreen(block)} />
        {:else}
            <BlockComponent {...block} />
        {/if}
    {/if}
{/each}