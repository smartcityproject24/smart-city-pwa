<script lang="ts">
    import { getContext, onMount } from "svelte";
    import { derived, writable } from "svelte/store";
    import type {
        AuthContext,
        RouteStore,
        Options,
        UserContext,
        LoggingContext,
    } from "@core";
    import type { Snippet } from "svelte";
    import { authService } from "@api/services/auth.service";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();

    const { access, setTokens, clearTokens } = getContext<AuthContext>("auth");
    const { setUserData } = getContext<UserContext>("user");
    const { logger } = getContext<LoggingContext>("logging");
    const { currentRoute, navigate } = getContext<RouteStore>("routeStore");
    const options = getContext<Options>("options");

    const isReady = writable(false);

    onMount(async () => {
        const params = new URLSearchParams(window.location.search);
        const owner = params.get("owner");
        const boardId = params.get("board_id");

        if (owner && boardId) {
            await clearTokens();

            try {
                const data = await authService.loginWithPassword(
                    owner,
                    boardId,
                );
                setTokens(
                    data.accessToken,
                    data.refreshToken,
                    data.expiresSeconds,
                );

                if (data.userUUID && data.dashboardUUID) {
                    setUserData(data.userUUID, data.dashboardUUID);

                    try {
                        logger.logLogin(data.dashboardUUID, {
                            dashboardCode: owner,
                        });
                    } catch (error) {
                        console.error(
                            "[AuthMiddleware] Failed to log login:",
                            error,
                        );
                    }
                }
                const newUrl =
                    window.location.protocol +
                    "//" +
                    window.location.host +
                    window.location.pathname;
                window.history.replaceState({ path: newUrl }, "", newUrl);
            } catch (e) {
                console.error("[AuthMiddleware] URL Auth failed:", e);
            }
        }
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
