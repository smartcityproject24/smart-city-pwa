<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { fade } from "svelte/transition";
    import { Menu } from "lucide-svelte";
    import { isFullscreen, onFullscreenChange } from "@core/pwa";

    const isInFullscreenMode = (): boolean =>
        isFullscreen() ||
        (typeof window !== "undefined" &&
            window.matchMedia?.("(display-mode: fullscreen)")?.matches === true);

    interface Props {
        isOpen: boolean;
        onToggle: () => void;
    }

    let { isOpen, onToggle }: Props = $props();

    const INACTIVITY_TIMEOUT = 5000;
    const HOT_CORNER_SIZE = 120;
    const HOT_CORNER_HIDE_DELAY = 1500;

    let showButton = $state(false);
    let isFullscreenActive = $state(false);
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    let hotCornerHideTimer: ReturnType<typeof setTimeout> | null = null;

    const isInHotCorner = (clientX: number, clientY: number): boolean =>
        clientX >= window.innerWidth - HOT_CORNER_SIZE && clientY <= HOT_CORNER_SIZE;

    const resetInactivityTimer = () => {
        showButton = true;
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            if (!isOpen) showButton = false;
        }, INACTIVITY_TIMEOUT);
    };

    const scheduleHotCornerHide = () => {
        if (hotCornerHideTimer) clearTimeout(hotCornerHideTimer);
        hotCornerHideTimer = setTimeout(() => {
            if (!isOpen) showButton = false;
            hotCornerHideTimer = null;
        }, HOT_CORNER_HIDE_DELAY);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isFullscreenActive) {
            if (isInHotCorner(e.clientX, e.clientY)) {
                showButton = true;
                if (hotCornerHideTimer) {
                    clearTimeout(hotCornerHideTimer);
                    hotCornerHideTimer = null;
                }
            } else {
                scheduleHotCornerHide();
            }
        } else {
            resetInactivityTimer();
        }
    };

    const handleTouchStart = (e: TouchEvent) => {
        if (isFullscreenActive) {
            const t = e.touches[0] ?? e.changedTouches?.[0];
            if (t && isInHotCorner(t.clientX, t.clientY)) {
                showButton = true;
                if (hotCornerHideTimer) clearTimeout(hotCornerHideTimer);
                hotCornerHideTimer = setTimeout(() => {
                    if (!isOpen) showButton = false;
                    hotCornerHideTimer = null;
                }, HOT_CORNER_HIDE_DELAY);
            }
        } else {
            resetInactivityTimer();
        }
    };

    onMount(() => {
        isFullscreenActive = isInFullscreenMode();
        const unsubscribe = onFullscreenChange(() => {
            isFullscreenActive = isInFullscreenMode();
            if (!isFullscreenActive) {
                if (hotCornerHideTimer) {
                    clearTimeout(hotCornerHideTimer);
                    hotCornerHideTimer = null;
                }
                showButton = true;
                resetInactivityTimer();
            } else {
                showButton = false;
                if (inactivityTimer) clearTimeout(inactivityTimer);
                inactivityTimer = null;
            }
        });

        if (!isFullscreenActive) {
            showButton = true;
            resetInactivityTimer();
        }

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("touchstart", handleTouchStart, { passive: true });

        return () => {
            unsubscribe();
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("touchstart", handleTouchStart);
            if (inactivityTimer) clearTimeout(inactivityTimer);
            if (hotCornerHideTimer) clearTimeout(hotCornerHideTimer);
        };
    });

    $effect(() => {
        if (isOpen) {
            showButton = true;
            if (inactivityTimer) clearTimeout(inactivityTimer);
            if (hotCornerHideTimer) clearTimeout(hotCornerHideTimer);
        } else if (isFullscreenActive) {
            scheduleHotCornerHide();
        } else {
            untrack(() => resetInactivityTimer());
        }
    });

    const handleClick = () => {
        onToggle();
        if (isFullscreenActive) {
            if (hotCornerHideTimer) clearTimeout(hotCornerHideTimer);
            hotCornerHideTimer = setTimeout(() => {
                if (!isOpen) showButton = false;
                hotCornerHideTimer = null;
            }, HOT_CORNER_HIDE_DELAY);
        } else {
            resetInactivityTimer();
        }
    };
</script>

{#if !isOpen && showButton}
    <button
        in:fade={{ duration: 300 }}
        out:fade={{ duration: 300 }}
        class="toggle-button"
        onclick={handleClick}
        aria-label="Toggle control panel"
    >
        <Menu size={24} />
    </button>
{/if}

<style lang="scss">
    @use "styles/colors" as colors;
    
    .toggle-button {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: colors.$color-primary;
        color: colors.$color-text-inverse;
        font-size: 24px;
        border: none;
        cursor: pointer;
        box-shadow: 0 2px 8px colors.$color-shadow-md;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
            background-color: colors.$color-primary-hover;
            transform: scale(1.1);
        }
        
        &:active {
            background-color: colors.$color-primary-active;
        }
    }
</style>

