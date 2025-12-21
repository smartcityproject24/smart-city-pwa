<script lang="ts">
    import { setContext } from "svelte";
    import { writable, derived, get } from "svelte/store";
    import type { AuthContext } from "./types";
    import type { Snippet } from "svelte";
    import { clearAllApiCache } from "../pwa/cache";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();

    const ACCESS_KEY = "access_token";
    const REFRESH_KEY = "refresh_token";
    const EXPIRES_AT_KEY = "expires_at";

    const access = writable<string>(
        typeof window !== "undefined"
            ? localStorage.getItem(ACCESS_KEY) || ""
            : "",
    );
    const refresh = writable<string>(
        typeof window !== "undefined"
            ? localStorage.getItem(REFRESH_KEY) || ""
            : "",
    );
    const expiresAt = writable<number>(
        typeof window !== "undefined"
            ? Number(localStorage.getItem(EXPIRES_AT_KEY)) || 0
            : 0,
    );

    const isAuthenticated = derived(access, ($access) => !!$access);
    const isTokenExpired = derived(
        expiresAt,
        ($expiresAt) => $expiresAt > 0 && Date.now() > $expiresAt,
    );

    const setTokens = (
        accessToken: string,
        refreshToken: string,
        expiresSeconds?: number,
    ) => {
        access.set(accessToken);
        refresh.set(refreshToken);

        if (typeof window !== "undefined") {
            localStorage.setItem(ACCESS_KEY, accessToken);
            localStorage.setItem(REFRESH_KEY, refreshToken);
        }

        if (expiresSeconds) {
            const expires = Date.now() + expiresSeconds * 1000;
            expiresAt.set(expires);
            if (typeof window !== "undefined") {
                localStorage.setItem(EXPIRES_AT_KEY, String(expires));
            }
        } else {
            expiresAt.set(0);
            if (typeof window !== "undefined") {
                localStorage.removeItem(EXPIRES_AT_KEY);
            }
        }
    };

    const clearTokens = async () => {
        access.set("");
        refresh.set("");
        expiresAt.set(0);

        if (typeof window !== "undefined") {
            localStorage.removeItem(ACCESS_KEY);
            localStorage.removeItem(REFRESH_KEY);
            localStorage.removeItem(EXPIRES_AT_KEY);

            await clearAllApiCache();
        }
    };

    const getAccessToken = (): string => {
        return get(access);
    };

    setContext<AuthContext>("auth", {
        access,
        refresh,
        expiresAt,
        isAuthenticated,
        isTokenExpired,
        setTokens,
        clearTokens,
        getAccessToken,
    });
</script>

{@render children?.()}

