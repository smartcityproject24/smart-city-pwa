<script lang="ts">
    import { getContext } from "svelte";
    import { fade } from "svelte/transition";
    import type { PageContext } from "@core";
    import type { PagesContext } from "@core/types";

    const { pageInfo, currentPage } = getContext<PageContext>("page");
    const pages = getContext<PagesContext>("pages");
</script>

{#if $currentPage && pages[$currentPage] && $pageInfo}
    {#key $currentPage}
        {@const PageComponent = pages[$currentPage]}
        <div
            class="page-wrapper"
            in:fade={{ duration: 300 }}
            out:fade={{ duration: 300 }}
        >
            <PageComponent blocks={$pageInfo.blocks} />
        </div>
    {/key}
{/if}

<style lang="scss">
    .page-wrapper {
        width: 100%;
        height: 100%;
    }
</style>
