<script lang="ts">
    import { onMount, getContext, setContext } from "svelte";
    import { writable } from "svelte/store";
    import type {
        AuthContext,
        UserContext,
        ApiReadyContext,
    } from "@core/types";
    import { initApiClient, isApiClientReady } from "@api/client";
    import type { Snippet } from "svelte";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();

    const { refresh, setTokens, clearTokens, getAccessToken } =
        getContext<AuthContext>("auth");
    const { clearUserData } = getContext<UserContext>("user");

    const isReady = writable(false);

    onMount(() => {
        initApiClient({
            getAccessToken: () => getAccessToken(),
            getRefreshToken: () => $refresh,
            setTokens: (
                accessToken: string,
                refreshToken: string,
                expiresSeconds?: number,
            ) => {
                setTokens(accessToken, refreshToken, expiresSeconds);
            },
            clearTokens,
            clearUserData,
        });

        $isReady = isApiClientReady();
    });

    setContext<ApiReadyContext>("api", { isReady });
</script>

{@render children?.()}
