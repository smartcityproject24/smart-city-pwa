<script lang="ts">
    import { getContext, setContext, onMount } from "svelte";
    import { writable } from "svelte/store";
    import type { Route, Options } from "../types";
    import type { URLContext } from "../url/types";
    import type { RouteStore } from "./types";

    const routesData = getContext<Record<string, Route>>("routes");
    const options = getContext<Options>("options");
    const { getValue, pushState, onPopState } = getContext<URLContext>("url");

    const currentRoute = writable<Route | null>(null);

    const updateRoute = () => {
        let path = getValue("page");
        if (!path) {
            path = options.defaultPage;
            pushState("page", path);
        }

        const route = routesData[path];

        if (!route) {
            currentRoute.set(routesData["not_found"]);
            pushState("page", "not_found");
            console.warn("Route config not found >>> ", path);
            return;
        }

        currentRoute.set(route);
    };

    const navigate = (route: string) => {
        pushState("page", route);
        updateRoute();
    };

    onMount(() => {
        updateRoute();
        const unsubscribe = onPopState(() => updateRoute());
        return unsubscribe;
    });

    setContext<RouteStore>("routeStore", {
        currentRoute,
        navigate
    });
</script>

<slot />

