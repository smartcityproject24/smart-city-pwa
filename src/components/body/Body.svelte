<script lang="ts">
    import { BlockRenderer } from "@components/block-renderer";
    import type { Block } from "@core";

    let { blocks }: { blocks: Block[] } = $props();
</script>

<div class="body">
    <BlockRenderer {blocks} />
</div>

<style lang="scss">
    .body {
        flex: 1;
        min-height: 0;
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>