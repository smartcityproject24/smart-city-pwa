<script lang="ts">
    import { getContext, setContext } from "svelte";
    import { writable } from "svelte/store";
    import type { PageInfo } from "../page/types";
    import type { Snippet } from "svelte";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();

    const infoData = getContext<Record<string, PageInfo>>("info");

    const infoStore = writable<Record<string, PageInfo>>(infoData);
    
    setContext("infoStore", infoStore);
</script>

{@render children?.()}

