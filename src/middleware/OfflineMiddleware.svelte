<script lang="ts">
    import { Offline } from "@core/offline";
    import type { Snippet } from "svelte";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();
</script>

<Offline>
    {@render children?.()}
</Offline>
