<script lang="ts">
    import { setContext } from "svelte";
    import type { URLContext } from "./types";

    const baseURL =
        window.location.protocol +
        "//" +
        window.location.host +
        window.location.pathname;

    const generate = (key: string, value: string): URLSearchParams => {
        let searchParams = new URLSearchParams(window.location.search);

        if (value) {
            searchParams.set(key, value);
            return searchParams;
        }

        searchParams.delete(key);
        return searchParams;
    };

    const getValue = (key: string): string | null => {
        let searchParams = new URLSearchParams(window.location.search);
        if (searchParams.has(key)) return searchParams.get(key);
        return null;
    };

    const replaceState = (key: string, value: string): void => {
        let searchParams = generate(key, value);
        let newURL = baseURL + "?" + searchParams.toString();
        window.history.replaceState(null, "", newURL);
    };

    const pushState = (key: string, value: string): void => {
        let searchParams = generate(key, value);
        let newURL = baseURL + "?" + searchParams.toString();
        window.history.pushState(null, "", newURL);
    };

    const onPopState = (
        changeState: (value: string | null, isPop: boolean) => void,
    ) => {
        const handler = (_event: PopStateEvent) => {
            const value = getValue("page");
            changeState(value, true);
        };

        window.addEventListener("popstate", handler);

        return () => window.removeEventListener("popstate", handler);
    };

    setContext<URLContext>("url", {
        getValue,
        replaceState,
        pushState,
        onPopState,
    });
</script>

<slot />

