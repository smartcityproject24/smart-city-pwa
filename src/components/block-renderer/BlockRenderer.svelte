<script lang="ts">
    import { getContext } from "svelte";
    import type { Block } from "@core";
    import type { ComponentsContext } from "@core/types";
    import type { Component } from "svelte";

    interface Props {
        blocks: Block[];
    }

    let { blocks }: Props = $props();

    const components = getContext<ComponentsContext>("components");

    function getBlock(type: string | undefined): Component<any> | undefined {
        if (!type) return undefined;
        
        const component = components[type.toLowerCase()];

        if (!component) {
            console.warn("component for type not found. Type >>> ", type);
            return undefined;
        }

        return component;
    }
</script>

{#each blocks as block}
    {#if getBlock(block.type)}
        {@const BlockComponent = getBlock(block.type)}
        <BlockComponent {...block} />
    {/if}
{/each}