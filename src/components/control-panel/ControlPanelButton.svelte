<script lang="ts">
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { Menu } from "lucide-svelte";

    interface Props {
        isOpen: boolean;
        onToggle: () => void;
    }

    let { isOpen, onToggle }: Props = $props();

    const INACTIVITY_TIMEOUT = 5000;

    let showButton = $state(false);
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

    const resetInactivityTimer = () => {
        showButton = true;

        if (inactivityTimer) clearTimeout(inactivityTimer);

        inactivityTimer = setTimeout(() => {
            if (!isOpen) {
                showButton = false;
            }
        }, INACTIVITY_TIMEOUT);
    };

    const handleMouseMove = () => resetInactivityTimer();
    const handleTouchStart = () => resetInactivityTimer();

    onMount(() => {
        showButton = true;
        resetInactivityTimer();

        window.addEventListener("mousemove", handleMouseMove);
        
        window.addEventListener("touchstart", handleTouchStart, { passive: true });

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("touchstart", handleTouchStart);
            if (inactivityTimer)
                clearTimeout(inactivityTimer);
        };
    });

    $effect(() => {
        if (isOpen) {
            showButton = true;
            if (inactivityTimer) {
                clearTimeout(inactivityTimer);
            }
        } else {
            resetInactivityTimer();
        }
    });

    const handleClick = () => {
        onToggle();
        resetInactivityTimer();
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

