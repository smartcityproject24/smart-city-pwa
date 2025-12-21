<script lang="ts">
    import { setContext } from "svelte";
    import { writable } from "svelte/store";
    import type { UserContext } from "./types";
    import type { Snippet } from "svelte";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();

    const USER_UUID_KEY = "user_uuid";
    const DASHBOARD_UUID_KEY = "dashboard_uuid";

    const userUUID = writable<string>(
        typeof window !== "undefined" ? localStorage.getItem(USER_UUID_KEY) || "" : ""
    );
    const dashboardUUID = writable<string>(
        typeof window !== "undefined" ? localStorage.getItem(DASHBOARD_UUID_KEY) || "" : ""
    );

    const setUserData = (userId: string, dashId: string) => {
        userUUID.set(userId);
        dashboardUUID.set(dashId);

        if (typeof window !== "undefined") {
            localStorage.setItem(USER_UUID_KEY, userId);
            localStorage.setItem(DASHBOARD_UUID_KEY, dashId);
        }
    };

    const clearUserData = () => {
        userUUID.set("");
        dashboardUUID.set("");

        if (typeof window !== "undefined") {
            localStorage.removeItem(USER_UUID_KEY);
            localStorage.removeItem(DASHBOARD_UUID_KEY);
        }
    };

    setContext<UserContext>("user", {
        userUUID,
        dashboardUUID,
        setUserData,
        clearUserData,
    });
</script>

{@render children?.()}

