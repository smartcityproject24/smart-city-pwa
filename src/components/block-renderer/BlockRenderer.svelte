<script lang="ts">
    import { getContext } from "svelte";
    import type { Block } from "@core";
    import type { ComponentsContext } from "@core/types";
    import type { Component } from "svelte";
    import { Widget } from "@components/widget";

    interface Props {
        blocks: Block[];
    }

    let { blocks }: Props = $props();

    const components = getContext<ComponentsContext>("components");

    const isWidgetBlock = (b: Block) =>
        String(b.type).toUpperCase() === "WIDGET";

    const isSettingBlock = (b: Block) =>
        String(b.type).toLowerCase() === "setting";

    const widgetBlocks = $derived(blocks.filter(isWidgetBlock));
    const otherBlocks = $derived(blocks.filter((b) => !isWidgetBlock(b) && !isSettingBlock(b)));

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
        <BlockComponent {...block} />
    {/if}
{/each}