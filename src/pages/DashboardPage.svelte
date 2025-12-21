<script lang="ts">
    import { BlockRenderer } from "@components/block-renderer";
    import type { Block } from "@core/types";

    let { blocks }: { blocks: Block[] } = $props();
</script>

<div class="dashboard">
    <BlockRenderer {blocks} />
</div>

<style lang="scss">
    .dashboard {
        position: relative;
        width: 100%;
        height: 100vh;
    }
</style>
