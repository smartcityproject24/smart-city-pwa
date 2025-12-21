<script lang="ts">
    import { BlockRenderer } from "@components/block-renderer";
    import type { Block } from "@core";

    let { blocks }: { blocks: Block[] } = $props();
</script>

<div class="header">
    <BlockRenderer {blocks} />
</div>

<style lang="scss">
    .header {
        width: 100%;
        display: flex;
        justify-content: end;
        /* Адаптивный padding: от 16px на маленьких экранах до 40px на больших */
        padding: clamp(16px, 2vw, 40px);
    }
</style>
