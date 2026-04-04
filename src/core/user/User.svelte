<script lang="ts">
    import { setContext } from "svelte";
    import { writable, get } from "svelte/store";
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
        if (typeof window !== "undefined") {
            const currentDashId = get(dashboardUUID);
            if (currentDashId) {
                localStorage.removeItem(`dashboard_cache_${currentDashId}`);
            }
            localStorage.removeItem(USER_UUID_KEY);
            localStorage.removeItem(DASHBOARD_UUID_KEY);
        }
        userUUID.set("");
        dashboardUUID.set("");
    };

    setContext<UserContext>("user", {
        userUUID,
        dashboardUUID,
        setUserData,
        clearUserData,
    });
</script>

{@render children?.()}

