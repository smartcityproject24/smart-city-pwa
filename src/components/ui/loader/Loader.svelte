<script lang="ts">
    import { getContext } from "svelte";
    import { fade } from "svelte/transition";
    import type { LanguageContext } from "@core";

    interface Props {
        text?: string;
        size?: number;
        fullscreen?: boolean;
    }

    let { 
        text = undefined,
        size = 50,
        fullscreen = false
    }: Props = $props();

    const { translate } = getContext<LanguageContext>("language");
</script>

<div class="loader" class:fullscreen={fullscreen} in:fade={{ duration: 300 }}>
    <div 
        class="loader-spinner" 
        style="width: {size}px; height: {size}px;"
    ></div>
    {#if text}
        <p class="loader-text">{$translate(text)}</p>
    {/if}
</div>

<style lang="scss">
    @use "styles/colors" as colors;
    @use "styles/typography" as typo;

    .loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .loader.fullscreen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: colors.$color-background-primary;
        z-index: 9999;
    }

    .loader-spinner {
        border: 4px solid colors.$color-border;
        border-top-color: colors.$color-primary;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin-bottom: 20px;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .loader-text {
        @include typo.base-text;
        color: colors.$color-text-secondary;
        margin: 0;
    }
</style>

