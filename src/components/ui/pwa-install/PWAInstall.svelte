<script lang="ts">
    import { onMount } from "svelte";
    import { getContext } from "svelte";
    import type { LanguageContext } from "@core";
    import type { PlatformDetectionContext } from "@core/pwa/types";
    import { Download } from "lucide-svelte";
    import AndroidKioskInstructions from "./AndroidKioskInstructions.svelte";
    import WindowsKioskInstructions from "./WindowsKioskInstructions.svelte";

    const { translate } = getContext<LanguageContext>("language");
    const { platform: platformType } = getContext<PlatformDetectionContext>("platform");

    let showInstructions = $state(false);
    let showAndroidInstructions = $state(false);
    let showWindowsInstructions = $state(false);
    let platform: "android" | "windows" | null = $state(null);

    onMount(() => {
        if (platformType === "android") {
            platform = "android";
        } else if (platformType === "windows") {
            platform = "windows";
        }
    });

    function handleClick() {
        if (platform === "android") {
            showInstructions = true;
            showAndroidInstructions = true;
        } else if (platform === "windows") {
            showInstructions = true;
            showWindowsInstructions = true;
        }
    }

    function handleDismiss() {
        showAndroidInstructions = false;
        showWindowsInstructions = false;
        showInstructions = false;
    }
</script>

{#if platform === "windows"}
    <button class="pwa-install-button" onclick={handleClick}>
        <Download size={20} />
        <span>{$translate("pwa_install_button")}</span>
    </button>
{/if}

<AndroidKioskInstructions
    {showAndroidInstructions}
    {showInstructions}
    onClose={handleDismiss}
/>

<WindowsKioskInstructions
    {showWindowsInstructions}
    {showInstructions}
    onClose={handleDismiss}
/>

<style lang="scss">
    @use "styles/colors" as colors;
    @use "styles/typography" as typo;

    .pwa-install-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: clamp(8px, 1vw, 12px);
        padding: clamp(10px, 1vw, 16px);
        background-color: colors.$color-install;
        color: colors.$color-text-inverse;
        border: none;
        border-radius: clamp(6px, 0.6vw, 8px);
        @include typo.button-text;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 300ms ease;
        width: 100%;

        &:hover {
            background-color: colors.$color-install-hover;
        }

        &:active {
            background-color: colors.$color-install-active;
        }

        :global(svg) {
            flex-shrink: 0;
        }
    }
</style>
