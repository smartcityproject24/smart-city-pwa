<script lang="ts">
    import { getContext, onMount } from "svelte";
    import { derived, writable } from "svelte/store";
    import type { AuthContext, RouteStore, Options } from "@core/types";
    import type { Snippet } from "svelte";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();

    const { access } = getContext<AuthContext>("auth");
    const { currentRoute, navigate } = getContext<RouteStore>("routeStore");
    const options = getContext<Options>("options");

    const isReady = writable(false);

    onMount(() => {
        requestAnimationFrame(() => {
            isReady.set(true);
        });
    });

    const shouldRedirect = derived(
        [currentRoute, access, isReady],
        ([$currentRoute, $access, $isReady]) => {
            if (!$isReady || !$currentRoute) return null;

            const hasToken = !!$access;

            if (hasToken && $currentRoute.code === "login") {
                return options.defaultPage;
            }

            if ($currentRoute.auth && !hasToken) {
                return "login";
            }

            return null;
        },
    );

    $effect(() => {
        const redirect = $shouldRedirect;
        if (redirect) {
            navigate(redirect);
        }
    });
</script>

{@render children?.()}
