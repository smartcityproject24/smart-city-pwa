<script lang="ts">
    import { fade } from "svelte/transition";

    import { BlockRenderer } from "@components/block-renderer";
    import type { Block, BrightnessContext, AuthContext, UserContext } from "@core";
    import { onMount, getContext } from "svelte";
    import { Loader } from "@components/ui/loader";

    let {
        blocks = [],
        height = 0,
        width = 0,
    }: {
        blocks?: Block[];
        height?: number;
        width?: number;
    } = $props();

    const { opacity } = getContext<BrightnessContext>("brightness");
    const { clearTokens } = getContext<AuthContext>("auth");
    const { clearUserData } = getContext<UserContext>("user");

    let containerElement = $state<HTMLDivElement | undefined>(undefined);
    let solutionElement = $state<HTMLDivElement | undefined>(undefined);

    let scaleX = $state(1);
    let scaleY = $state(1);
    let containerWidth = $state(0);
    let containerHeight = $state(0);

    let showLogoutButton = $state(false);
    let logoutTimer: ReturnType<typeof setTimeout> | null = null;

    const isLoading = $derived(width > 0 && height > 0 && blocks.length === 0);

    $effect(() => {
        if (isLoading) {
            logoutTimer = setTimeout(() => {
                showLogoutButton = true;
            }, 20000);
        } else {
            if (logoutTimer) {
                clearTimeout(logoutTimer);
                logoutTimer = null;
            }
            showLogoutButton = false;
        }

        return () => {
            if (logoutTimer) {
                clearTimeout(logoutTimer);
                logoutTimer = null;
            }
        };
    });

    const handleLogout = async () => {
        await clearTokens();
        clearUserData();
    };

    const calculateScale = () => {
        if (
            !containerElement ||
            !solutionElement ||
            width === 0 ||
            height === 0
        ) {
            scaleX = 1;
            scaleY = 1;
            return;
        }

        const widthValue = containerElement.clientWidth;
        const heightValue = containerElement.clientHeight;

        if (widthValue === 0 || heightValue === 0) {
            scaleX = 1;
            scaleY = 1;
            containerWidth = 0;
            containerHeight = 0;
            return;
        }

        containerWidth = widthValue;
        containerHeight = heightValue;

        scaleX = containerWidth / width;
        scaleY = containerHeight / height;
    };

    onMount(() => setTimeout(() => calculateScale(), 0));

    $effect(() => {
        if (!containerElement || width === 0 || height === 0) return;

        calculateScale();

        const handleResize = () => calculateScale();
        window.addEventListener("resize", handleResize);

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined" && containerElement) {
            resizeObserver = new ResizeObserver(() => calculateScale());
            resizeObserver.observe(containerElement);
        }

        return () => {
            window.removeEventListener("resize", handleResize);
            if (resizeObserver) resizeObserver.disconnect();
        };
    });
</script>

<div class="solution-container" bind:this={containerElement}>
    {#if isLoading}
        <Loader />
        {#if showLogoutButton}
            <div class="logout-overlay" in:fade={{ duration: 300 }}>
                <button class="logout-btn" onclick={handleLogout}>
                    Выйти
                </button>
            </div>
        {/if}
    {:else}
        <div
            class="solution-wrapper"
            style="
                transform: scale({scaleX}, {scaleY});
                transform-origin: top left;
                filter: brightness({$opacity});
                opacity: {$opacity == 0 ? 0 : 1};
            "
            in:fade={{ duration: 300 }}
        >
            <div
                class="solution"
                bind:this={solutionElement}
                style="width: {width}px; height: {height}px;"
            >
                <BlockRenderer {blocks} />
            </div>
        </div>
    {/if}
</div>

<style lang="scss">
    @use "styles/colors" as colors;
    @use "styles/typography" as typo;

    .solution-container {
        width: 100%;
        height: 100%;
        position: relative;
    }

    .solution-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        transition:
            opacity 300ms ease,
            filter 300ms ease;
    }

    .solution {
        position: relative;
    }

    :global(.solution-container .loader) {
        width: 100%;
        height: 100%;
    }

    .logout-overlay {
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
    }

    .logout-btn {
        padding: 12px 32px;
        font-size: 16px;
        font-weight: 600;
        color: #fff;
        background: rgba(220, 53, 69, 0.9);
        border: none;
        border-radius: 8px;
        cursor: pointer;
        backdrop-filter: blur(4px);

        &:hover {
            background: rgba(200, 35, 51, 1);
        }
    }
</style>
