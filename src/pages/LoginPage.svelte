<script lang="ts">
    import { getContext } from "svelte";

    import { BlockRenderer } from "@components/block-renderer";
    import type { Block } from "@core/types";

    let { blocks }: { blocks: Block[] } = $props();
</script>

<div class="login">
    <BlockRenderer {blocks} />
</div>

<style lang="scss">
    .login {
        width: 100%;
        height: 100vh;
    }
</style>
